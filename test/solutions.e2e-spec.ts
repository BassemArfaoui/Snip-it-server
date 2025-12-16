import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe.skip('Solutions (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let userId: number;
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

    // Create test user and get auth token
    const testUser = {
      username: 'solutionuser',
      email: 'solution@example.com',
      password: 'password123',
    };

    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testUser);

    authToken = signupResponse.body.data.accessToken;
    userId = signupResponse.body.data.user.id;

    // Create a test issue
    const issueResponse = await request(app.getHttpServer())
      .post('/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        content: 'Test issue for solutions with enough content',
        language: 'javascript',
      });

    issueId = issueResponse.body.data.id;
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.query('DELETE FROM solutions WHERE issue_id = $1', [issueId]);
      await dataSource.query('DELETE FROM issues WHERE id = $1', [issueId]);
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await app.close();
  });

  describe('POST /issues/:issueId/solutions', () => {
    it('should create a new solution', async () => {
      const createDto = {
        textContent: 'This is a solution to the issue',
        externalLink: 'https://github.com/example/solution',
      };

      const response = await request(app.getHttpServer())
        .post(`/issues/${issueId}/solutions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        data: expect.objectContaining({
          id: expect.any(Number),
          textContent: createDto.textContent,
          externalLink: createDto.externalLink,
          issueId: issueId,
          likesCount: 0,
          dislikesCount: 0,
          isAccepted: false,
        }),
        message: 'success',
      });

      solutionId = response.body.data.id;
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/issues/${issueId}/solutions`)
        .send({ textContent: 'Solution' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should require at least one field (textContent or externalLink)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/issues/${issueId}/solutions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.statusCode).toBe(400);
    });

    it('should fail for non-existent issue', async () => {
      const response = await request(app.getHttpServer())
        .post('/issues/999999/solutions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textContent: 'Solution for non-existent issue' })
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('not found'),
      });
    });
  });

  describe('GET /issues/:issueId/solutions', () => {
    it('should return all solutions for an issue', async () => {
      const response = await request(app.getHttpServer())
        .get(`/issues/${issueId}/solutions`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        message: 'success',
      });

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return empty array for issue with no solutions', async () => {
      // Create new issue without solutions
      const newIssueResponse = await request(app.getHttpServer())
        .post('/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Issue without solutions for testing',
          language: 'python',
        });

      const newIssueId = newIssueResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`/issues/${newIssueId}/solutions`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toEqual([]);

      // Cleanup
      await dataSource.query('DELETE FROM issues WHERE id = $1', [newIssueId]);
    });
  });

  describe('PATCH /solutions/:id', () => {
    it('should update own solution', async () => {
      const updateDto = {
        textContent: 'Updated solution content',
      };

      const response = await request(app.getHttpServer())
        .patch(`/solutions/${solutionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.data.textContent).toBe(updateDto.textContent);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/solutions/${solutionId}`)
        .send({ textContent: 'Updated' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /solutions/:id/accept', () => {
    it('should accept a solution (issue owner only)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/solutions/${solutionId}/accept`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data.isAccepted).toBe(true);

      // Verify issue is marked as resolved
      const issueResponse = await request(app.getHttpServer())
        .get(`/issues/${issueId}`)
        .expect(HttpStatus.OK);

      expect(issueResponse.body.data.is_resolved).toBe(true);
    });

    it('should fail if not issue owner', async () => {
      // Create another user
      const anotherUser = {
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'password123',
      };

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(anotherUser);

      const anotherToken = signupResponse.body.data.accessToken;
      const anotherUserId = signupResponse.body.data.user.id;

      const response = await request(app.getHttpServer())
        .patch(`/solutions/${solutionId}/accept`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        message: expect.any(String),
      });

      // Cleanup
      await dataSource.query('DELETE FROM users WHERE id = $1', [anotherUserId]);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/solutions/${solutionId}/accept`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /solutions/:id', () => {
    it('should delete own solution', async () => {
      // Create a new solution to delete
      const createResponse = await request(app.getHttpServer())
        .post(`/issues/${issueId}/solutions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textContent: 'Solution to be deleted' });

      const toDeleteId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`/solutions/${toDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/solutions/${solutionId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 for non-existent solution', async () => {
      const response = await request(app.getHttpServer())
        .delete('/solutions/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('not found'),
      });
    });
  });
});
