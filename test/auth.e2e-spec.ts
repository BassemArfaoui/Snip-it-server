import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ValidationMessages } from '../src/common/validations/dto-validaton-messages';

describe('AuthController (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/auth/register (POST)', () => {
        const validUser = {
            email: 'e2e-test@example.com',
            password: 'password123',
            username: 'e2etestuser',
            fullName: 'E2E Test User',
        };

        it('should register a user with valid data', () => {

            const uniqueUser = {
                ...validUser,
                email: `e2e-${Date.now()}@example.com`,
                username: `e2e-${Date.now()}`,
            };

            return request(app.getHttpServer())
                .post('/auth/register')
                .send(uniqueUser)
                .expect(201);
        });

        it('should fail if email is missing', () => {
            const { email, ...invalidUser } = validUser;
            return request(app.getHttpServer())
                .post('/auth/register')
                .send(invalidUser)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain(ValidationMessages.required('email'));
                });
        });

        it('should fail if email is invalid', () => {
            const invalidUser = { ...validUser, email: 'invalid-email' };
            return request(app.getHttpServer())
                .post('/auth/register')
                .send(invalidUser)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain(ValidationMessages.type('email', 'email'));
                });
        });

        it('should fail if password is missing', () => {
            const { password, ...invalidUser } = validUser;
            return request(app.getHttpServer())
                .post('/auth/register')
                .send(invalidUser)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain(ValidationMessages.required('password'));
                });
        });

        it('should fail if password is too short', () => {
            const invalidUser = { ...validUser, password: 'short' }; // 5 chars
            return request(app.getHttpServer())
                .post('/auth/register')
                .send(invalidUser)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain(ValidationMessages.length('password', 'min', 8));
                });
        });

        it('should fail if username is missing', () => {
            const { username, ...invalidUser } = validUser;
            return request(app.getHttpServer())
                .post('/auth/register')
                .send(invalidUser)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain(ValidationMessages.required('username'));
                });
        });

        it('should fail if username is too short', () => {
            const invalidUser = { ...validUser, username: 'ab' };
            return request(app.getHttpServer())
                .post('/auth/register')
                .send(invalidUser)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain(ValidationMessages.length('username', 'min', 3));
                });
        });

        it('should fail if fullName is missing', () => {
            const { fullName, ...invalidUser } = validUser;
            return request(app.getHttpServer())
                .post('/auth/register')
                .send(invalidUser)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain(ValidationMessages.required('fullName'));
                });
        });

        it('should fail if fullName is too short', () => {
            const invalidUser = { ...validUser, fullName: 'ab' };
            return request(app.getHttpServer())
                .post('/auth/register')
                .send(invalidUser)
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain(ValidationMessages.length('fullName', 'min', 3));
                });
        });
    });
});
