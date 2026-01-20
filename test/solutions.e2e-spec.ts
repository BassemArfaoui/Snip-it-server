import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Solutions (e2e)', () => {
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
    const uniqueTimestamp = Date.now();
    const testUser = {
      username: `solutionuser_${uniqueTimestamp}`,
      email: `solution_${uniqueTimestamp}@example.com`,
      password: 'password123',
      fullName: 'Solution User',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(HttpStatus.CREATED);

    // Manually verify email for testing
    await dataSource.query(
      'UPDATE users SET "isEmailVerified" = true WHERE email = $1',
      [testUser.email]
    );

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: testUser.email,
        password: testUser.password,
      })
      .expect(HttpStatus.OK);

    authToken = loginResponse.body.data.accessToken;

    // Get userId
    const userResult = await dataSource.query(
      'SELECT id FROM users WHERE email = $1',
      [testUser.email]
    );
    userId = userResult[0].id;

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
    if (dataSource && issueId) {
      await dataSource.query('DELETE FROM solutions WHERE "issueId" = $1', [issueId]);
      await dataSource.query('DELETE FROM issues WHERE id = $1', [issueId]);
    }
    if (dataSource && userId) {
      await dataSource.query('DELETE FROM "email_verifications" WHERE "userId" = $1', [userId]);
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
      const uniqueTimestamp2 = Date.now() + 100;
      const anotherUser = {
        username: `anotheruser_${uniqueTimestamp2}`,
        email: `another_${uniqueTimestamp2}@example.com`,
        password: 'password123',
        fullName: 'Another User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(anotherUser)
        .expect(HttpStatus.CREATED);

      // Verify email
      await dataSource.query(
        'UPDATE users SET "isEmailVerified" = true WHERE email = $1',
        [anotherUser.email]
      );

      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: anotherUser.email,
          password: anotherUser.password,
        })
        .expect(HttpStatus.OK);

      const anotherToken = loginResponse.body.data.accessToken;

      // Get userId
      const anotherUserResult = await dataSource.query(
        'SELECT id FROM users WHERE email = $1',
        [anotherUser.email]
      );
      const anotherUserId = anotherUserResult[0].id;

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
      await dataSource.query('DELETE FROM "email_verifications" WHERE "userId" = $1', [anotherUserId]);
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
      // Create a new issue since the previous one is resolved
      const newIssueResponse = await request(app.getHttpServer())
        .post('/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'New issue for delete test with enough content',
          language: 'python',
        });

      const newIssueId = newIssueResponse.body.data.id;

      // Create a solution to delete
      const createResponse = await request(app.getHttpServer())
        .post(`/issues/${newIssueId}/solutions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textContent: 'Solution to be deleted' })
        .expect(HttpStatus.CREATED);

      const toDeleteId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`/solutions/${toDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);

      // Cleanup - delete remaining solutions then the issue
      await dataSource.query('DELETE FROM solutions WHERE "issueId" = $1', [newIssueId]);
      await dataSource.query('DELETE FROM issues WHERE id = $1', [newIssueId]);
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
