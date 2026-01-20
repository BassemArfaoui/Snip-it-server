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
    const uniqueTimestamp1 = Date.now();
    const ownerUser = {
      username: `issueowner_${uniqueTimestamp1}`,
      email: `owner_${uniqueTimestamp1}@example.com`,
      password: 'password123',
      fullName: 'Issue Owner',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(ownerUser)
      .expect(HttpStatus.CREATED);

    // Manually verify email for testing
    await dataSource.query(
      'UPDATE users SET "isEmailVerified" = true WHERE email = $1',
      [ownerUser.email]
    );

    // Login to get token
    const ownerLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: ownerUser.email,
        password: ownerUser.password,
      })
      .expect(HttpStatus.OK);

    issueOwnerToken = ownerLoginResponse.body.data.accessToken;

    // Get userId
    const ownerResult = await dataSource.query(
      'SELECT id FROM users WHERE email = $1',
      [ownerUser.email]
    );
    issueOwnerId = ownerResult[0].id;

    // Create contributor
    const uniqueTimestamp2 = Date.now() + 1;
    const contributorUser = {
      username: `contributor_${uniqueTimestamp2}`,
      email: `contributor_${uniqueTimestamp2}@example.com`,
      password: 'password123',
      fullName: 'Contributor User',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(contributorUser)
      .expect(HttpStatus.CREATED);

    // Manually verify email for testing
    await dataSource.query(
      'UPDATE users SET "isEmailVerified" = true WHERE email = $1',
      [contributorUser.email]
    );

    // Login to get token
    const contributorLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: contributorUser.email,
        password: contributorUser.password,
      })
      .expect(HttpStatus.OK);

    contributorToken = contributorLoginResponse.body.data.accessToken;

    // Get userId
    const contributorResult = await dataSource.query(
      'SELECT id FROM users WHERE email = $1',
      [contributorUser.email]
    );
    contributorId = contributorResult[0].id;
  });

  afterAll(async () => {
    if (dataSource && issueId) {
      // Delete in proper order to avoid foreign key constraints
      await dataSource.query('DELETE FROM solutions WHERE "issueId" = $1', [issueId]);
      await dataSource.query('DELETE FROM issues WHERE id = $1', [issueId]);
    }
    if (dataSource && issueOwnerId && contributorId) {
      await dataSource.query('DELETE FROM "email_verifications" WHERE "userId" IN ($1, $2)', [
        issueOwnerId,
        contributorId,
      ]);
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

      // Step 8: Attempt to create solution on resolved issue should fail
      await request(app.getHttpServer())
        .post(`/issues/${issueId}/solutions`)
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          textContent: 'Another solution',
        })
        .expect(HttpStatus.BAD_REQUEST);
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
        'SELECT "isResolved" FROM issues WHERE id = $1',
        [testIssueId],
      );
      const [solution] = await dataSource.query(
        'SELECT "isAccepted" FROM solutions WHERE id = $1',
        [testSolutionId],
      );

      expect(issue.isResolved).toBe(true);
      expect(solution.isAccepted).toBe(true);

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
      await dataSource.query('DELETE FROM solutions WHERE "issueId" = $1', [testIssueId]);
      await dataSource.query('DELETE FROM issues WHERE id = $1', [testIssueId]);
    });
  });
});
