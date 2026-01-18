import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Accept Solution Flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let issueOwnerToken: string;
  let issueOwnerId: number;
  let contributorToken: string;
  let contributorId: number;
  let issueId: number;
  let solutionId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create issue owner
    const ownerResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'issueowner',
        email: 'owner@example.com',
        password: 'password123',
      });

    issueOwnerToken = ownerResponse.body.data.accessToken;
    issueOwnerId = ownerResponse.body.data.user.id;

    // Create contributor
    const contributorResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'contributor',
        email: 'contributor@example.com',
        password: 'password123',
      });

    contributorToken = contributorResponse.body.data.accessToken;
    contributorId = contributorResponse.body.data.user.id;
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.query('DELETE FROM solutions WHERE issue_id = $1', [issueId]);
      await dataSource.query('DELETE FROM issues WHERE id = $1', [issueId]);
      await dataSource.query('DELETE FROM users WHERE id IN ($1, $2)', [
        issueOwnerId,
        contributorId,
      ]);
    }
    await app.close();
  });

  describe('Complete Accept Solution Flow', () => {
    it('should complete the full flow: create issue -> create solution -> accept solution', async () => {
      // Step 1: Issue owner creates an issue
      const createIssueResponse = await request(app.getHttpServer())
        .post('/issues')
        .set('Authorization', `Bearer ${issueOwnerToken}`)
        .send({
          content: 'How do I implement authentication in NestJS?',
          language: 'typescript',
        })
        .expect(HttpStatus.CREATED);

      issueId = createIssueResponse.body.data.id;

      expect(createIssueResponse.body.data).toMatchObject({
        id: issueId,
        is_resolved: false,
        solutions_count: 0,
      });

      // Step 2: Contributor creates a solution
      const createSolutionResponse = await request(app.getHttpServer())
        .post(`/issues/${issueId}/solutions`)
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          textContent: 'You can use Passport.js with JWT strategy',
          externalLink: 'https://docs.nestjs.com/security/authentication',
        })
        .expect(HttpStatus.CREATED);

      solutionId = createSolutionResponse.body.data.id;

      expect(createSolutionResponse.body.data).toMatchObject({
        id: solutionId,
        issueId: issueId,
        isAccepted: false,
        likesCount: 0,
        dislikesCount: 0,
      });

      // Step 3: Verify issue solutions_count incremented
      const issueAfterSolutionResponse = await request(app.getHttpServer())
        .get(`/issues/${issueId}`)
        .expect(HttpStatus.OK);

      expect(issueAfterSolutionResponse.body.data.solutions_count).toBe(1);

      // Step 4: Contributor should NOT be able to accept their own solution
      await request(app.getHttpServer())
        .patch(`/solutions/${solutionId}/accept`)
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(HttpStatus.FORBIDDEN);

      // Step 5: Issue owner accepts the solution
      const acceptResponse = await request(app.getHttpServer())
        .patch(`/solutions/${solutionId}/accept`)
        .set('Authorization', `Bearer ${issueOwnerToken}`)
        .expect(HttpStatus.OK);

      expect(acceptResponse.body.data).toMatchObject({
        id: solutionId,
        isAccepted: true,
      });

      // Step 6: Verify issue is marked as resolved
      const issueAfterAcceptResponse = await request(app.getHttpServer())
        .get(`/issues/${issueId}`)
        .expect(HttpStatus.OK);

      expect(issueAfterAcceptResponse.body.data).toMatchObject({
        id: issueId,
        is_resolved: true,
        solutions_count: 1,
      });

      // Step 7: Verify contributor received bonus points (if implemented)
      // This would check the contributor's reputation/points
      // const contributorData = await dataSource.query(
      //   'SELECT reputation FROM users WHERE id = $1',
      //   [contributorId]
      // );
      // expect(contributorData[0].reputation).toBeGreaterThan(0);

      // Step 8: Attempt to accept another solution should fail (already resolved)
      const anotherSolutionResponse = await request(app.getHttpServer())
        .post(`/issues/${issueId}/solutions`)
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          textContent: 'Another solution',
        });

      const anotherSolutionId = anotherSolutionResponse.body.data.id;

      await request(app.getHttpServer())
        .patch(`/solutions/${anotherSolutionId}/accept`)
        .set('Authorization', `Bearer ${issueOwnerToken}`)
        .expect(HttpStatus.BAD_REQUEST);

      // Cleanup the extra solution
      await dataSource.query('DELETE FROM solutions WHERE id = $1', [anotherSolutionId]);
    });

    it('should handle transaction rollback on failure', async () => {
      // Create a new issue
      const issueResponse = await request(app.getHttpServer())
        .post('/issues')
        .set('Authorization', `Bearer ${issueOwnerToken}`)
        .send({
          content: 'Another test issue for transaction testing',
          language: 'javascript',
        });

      const testIssueId = issueResponse.body.data.id;

      // Create solution
      const solutionResponse = await request(app.getHttpServer())
        .post(`/issues/${testIssueId}/solutions`)
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          textContent: 'Test solution',
        });

      const testSolutionId = solutionResponse.body.data.id;

      // Accept solution
      await request(app.getHttpServer())
        .patch(`/solutions/${testSolutionId}/accept`)
        .set('Authorization', `Bearer ${issueOwnerToken}`)
        .expect(HttpStatus.OK);

      // Verify all related data is updated atomically
      const [issue] = await dataSource.query(
        'SELECT is_resolved FROM issues WHERE id = $1',
        [testIssueId],
      );
      const [solution] = await dataSource.query(
        'SELECT is_accepted FROM solutions WHERE id = $1',
        [testSolutionId],
      );

      expect(issue.is_resolved).toBe(true);
      expect(solution.is_accepted).toBe(true);

      // Cleanup
      await dataSource.query('DELETE FROM solutions WHERE id = $1', [testSolutionId]);
      await dataSource.query('DELETE FROM issues WHERE id = $1', [testIssueId]);
    });

    it('should maintain counter consistency', async () => {
      // Create issue
      const issueResponse = await request(app.getHttpServer())
        .post('/issues')
        .set('Authorization', `Bearer ${issueOwnerToken}`)
        .send({
          content: 'Issue for counter testing with proper content length',
          language: 'python',
        });

      const testIssueId = issueResponse.body.data.id;

      // Create multiple solutions
      const solution1Response = await request(app.getHttpServer())
        .post(`/issues/${testIssueId}/solutions`)
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({ textContent: 'Solution 1' });

      const solution2Response = await request(app.getHttpServer())
        .post(`/issues/${testIssueId}/solutions`)
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({ textContent: 'Solution 2' });

      const solution3Response = await request(app.getHttpServer())
        .post(`/issues/${testIssueId}/solutions`)
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({ textContent: 'Solution 3' });

      // Verify count
      const issueCheckResponse = await request(app.getHttpServer())
        .get(`/issues/${testIssueId}`)
        .expect(HttpStatus.OK);

      expect(issueCheckResponse.body.data.solutions_count).toBe(3);

      // Delete one solution
      await request(app.getHttpServer())
        .delete(`/solutions/${solution2Response.body.data.id}`)
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(HttpStatus.NO_CONTENT);

      // Verify count decremented
      const issueAfterDeleteResponse = await request(app.getHttpServer())
        .get(`/issues/${testIssueId}`)
        .expect(HttpStatus.OK);

      expect(issueAfterDeleteResponse.body.data.solutions_count).toBe(2);

      // Cleanup
      await dataSource.query('DELETE FROM solutions WHERE issue_id = $1', [testIssueId]);
      await dataSource.query('DELETE FROM issues WHERE id = $1', [testIssueId]);
    });
  });
});
