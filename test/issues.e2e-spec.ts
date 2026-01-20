import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Issues (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let userId: number;
  let createdIssueId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same configuration as main.ts
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

    // Create a test user and get auth token
    const uniqueTimestamp = Date.now();
    const testUser = {
      username: `testuser_${uniqueTimestamp}`,
      email: `test_${uniqueTimestamp}@example.com`,
      password: 'password123',
      fullName: 'Test User',
    };

    // Register the user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(HttpStatus.CREATED);

    // Manually verify email in database for testing purposes
    await dataSource.query(
      'UPDATE users SET "isEmailVerified" = true WHERE email = $1',
      [testUser.email]
    );

    // Login to get the auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: testUser.email,
        password: testUser.password,
      })
      .expect(HttpStatus.OK);

    authToken = loginResponse.body.data.accessToken;
    
    // Get userId from database
    const userResult = await dataSource.query(
      'SELECT id FROM users WHERE email = $1',
      [testUser.email]
    );
    userId = userResult[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (dataSource) {
      await dataSource.query('DELETE FROM issues WHERE "userId" = $1', [userId]);
      await dataSource.query('DELETE FROM "email_verifications" WHERE "userId" = $1', [userId]);
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await app.close();
  });

  describe('POST /issues', () => {
    it('should create a new issue', async () => {
      const createDto = {
        content: 'This is a test issue with enough content to pass validation',
        language: 'javascript',
      };

      const response = await request(app.getHttpServer())
        .post('/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        data: expect.objectContaining({
          id: expect.any(Number),
          content: createDto.content,
          language: createDto.language,
        }),
        message: 'success',
      });

      createdIssueId = response.body.data.id;
    });

    it('should fail without authentication', async () => {
      const createDto = {
        content: 'Test issue content',
        language: 'python',
      };

      const response = await request(app.getHttpServer())
        .post('/issues')
        .send(createDto)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: expect.any(String),
        message: expect.any(String),
      });
    });

    it('should validate content length', async () => {
      const createDto = {
        content: 'short',
        language: 'python',
      };

      const response = await request(app.getHttpServer())
        .post('/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: expect.any(String),
        message: expect.any(Array),
      });
    });
  });

  describe('GET /issues', () => {
    it('should return all issues with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/issues')
        .query({ page: 1, limit: 10 })
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        message: 'success',
      });
    });

    it('should filter by language', async () => {
      const response = await request(app.getHttpServer())
        .get('/issues')
        .query({ language: 'javascript' })
        .expect(HttpStatus.OK);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by resolved status', async () => {
      const response = await request(app.getHttpServer())
        .get('/issues')
        .query({ is_resolved: 'false' })
        .expect(HttpStatus.OK);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /issues/:id', () => {
    it('should return a specific issue', async () => {
      const response = await request(app.getHttpServer())
        .get(`/issues/${createdIssueId}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        data: expect.objectContaining({
          id: createdIssueId,
          content: expect.any(String),
        }),
        message: 'success',
      });
    });

    it('should return 404 for non-existent issue', async () => {
      const response = await request(app.getHttpServer())
        .get('/issues/999999')
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: expect.any(String),
        message: expect.stringContaining('not found'),
      });
    });
  });

  describe('PATCH /issues/:id', () => {
    it('should update own issue', async () => {
      const updateDto = {
        content: 'Updated issue content with sufficient length for validation',
      };

      const response = await request(app.getHttpServer())
        .patch(`/issues/${createdIssueId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.data.content).toBe(updateDto.content);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/issues/${createdIssueId}`)
        .send({ content: 'Updated content' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /issues/:id', () => {
    it('should delete own issue', async () => {
      await request(app.getHttpServer())
        .delete(`/issues/${createdIssueId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });

    it('should return 404 for already deleted issue', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/issues/${createdIssueId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('not found'),
      });
    });
  });
});
