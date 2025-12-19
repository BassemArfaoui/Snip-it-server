import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractOtpFromLogs(logs: string[], email: string): string {
  for (const line of logs) {
    const match = line.match(/\[Email Verification\] Sending OTP (\d{6}) to (.+)$/);
    if (match && match[2] === email) {
      return match[1];
    }
  }

  throw new Error(`OTP not found in logs for ${email}`);
}

async function registerAndVerify(app: INestApplication, user: {
  email: string;
  password: string;
  username: string;
  fullName: string;
}): Promise<string> {
  const logs: string[] = [];
  const spy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
    logs.push(args.map(String).join(' '));
  });

  try {
    await request(app.getHttpServer()).post('/auth/register').send(user).expect(201);
  } finally {
    spy.mockRestore();
  }

  const otp = extractOtpFromLogs(logs, user.email);
  const verify = await request(app.getHttpServer())
    .post('/auth/verify-email')
    .send({ email: user.email, otp })
    .expect(201);

  const token = verify.body?.tokens?.accessToken as string | undefined;
  expect(token).toBeDefined();
  return token!;
}

describe('PostsController (e2e)', () => {
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

  describe('Auth protection', () => {
    it('GET /posts requires auth', async () => {
      await request(app.getHttpServer()).get('/posts').expect(401);
    });

    it('GET /posts/:id requires auth', async () => {
      await request(app.getHttpServer()).get('/posts/1').expect(401);
    });

    it('POST /posts requires auth', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .send({
          title: 't',
          description: 'd',
          snippetContent: 'c',
          snippetLanguage: 'ts',
        })
        .expect(401);
    });

    it('PATCH /posts/:id requires auth', async () => {
      await request(app.getHttpServer()).patch('/posts/1').send({ title: 'x' }).expect(401);
    });

    it('DELETE /posts/:id requires auth', async () => {
      await request(app.getHttpServer()).delete('/posts/1').expect(401);
    });

    it('GET /posts/share/:id is public (404 for missing post)', async () => {
      await request(app.getHttpServer()).get('/posts/share/999999').expect(404);
    });
  });

  describe('POST /posts (validation + create)', () => {
    it('fails validation when required fields are missing', async () => {
      const s = uniqueSuffix();
      const token = await registerAndVerify(app, {
        email: `posts-e2e-${s}@example.com`,
        password: 'password123',
        username: `posts_e2e_${s}`,
        fullName: `Posts E2E ${s}`,
      });

      await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Only title' })
        .expect(400);
    });

    it('fails validation for invalid githubLink', async () => {
      const s = uniqueSuffix();
      const token = await registerAndVerify(app, {
        email: `posts-e2e-${s}@example.com`,
        password: 'password123',
        username: `posts_e2e_${s}`,
        fullName: `Posts E2E ${s}`,
      });

      await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: `Post title ${s}`,
          description: `Post description ${s}`,
          snippetContent: `console.log('hello ${s}')`,
          snippetLanguage: 'ts',
          githubLink: 'not-a-url',
        })
        .expect(400);
    });
  });

  describe('Happy path + interactions + share + ownership', () => {
    it('covers list/get/share/update/delete with multiple scenarios', async () => {
      const s1 = uniqueSuffix();
      const user1 = {
        email: `posts-e2e-${s1}@example.com`,
        password: 'password123',
        username: `posts_e2e_${s1}`,
        fullName: `Posts E2E ${s1}`,
      };

      const token1 = await registerAndVerify(app, user1);

      // create post
      const createPost = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: `Post title ${s1}`,
          description: `Post description ${s1}`,
          snippetContent: `console.log('hello ${s1}')`,
          snippetLanguage: 'ts',
          snippetTitle: `Snippet ${s1}`,
          githubLink: 'https://example.com/repo',
        })
        .expect(201);

      const postId = createPost.body.id as number;
      expect(postId).toBeDefined();

      // list (pagination params accepted)
      const listBefore = await request(app.getHttpServer())
        .get('/posts?page=1&limit=10')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(Array.isArray(listBefore.body.data)).toBe(true);
      expect(listBefore.body.meta).toBeDefined();

      const listedBefore = listBefore.body.data.find((p: any) => p.id === postId);
      expect(listedBefore).toBeDefined();
      expect(listedBefore.interactions).toBeDefined();
      expect(listedBefore.interactions.total).toBe(0);
      expect(listedBefore.interactions.didInteract).toBe(false);
      expect(listedBefore.interactions.myType).toBeNull();

      // get by id includes interactions summary
      const getBefore = await request(app.getHttpServer())
        .get(`/posts/${postId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);
      expect(getBefore.body.id).toBe(postId);
      expect(getBefore.body.interactions.total).toBe(0);
      expect(getBefore.body.interactions.didInteract).toBe(false);
      expect(getBefore.body.interactions.myType).toBeNull();

      // update by owner
      const updatedTitle = `Updated title ${s1}`;
      const updated = await request(app.getHttpServer())
        .patch(`/posts/${postId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: updatedTitle,
          snippetContent: `console.log('updated ${s1}')`,
          githubLink: 'https://example.com/updated',
        })
        .expect(200);
      expect(updated.body.id).toBe(postId);
      expect(updated.body.title).toBe(updatedTitle);
      expect(updated.body.snippet).toBeDefined();
      expect(updated.body.snippet.content).toContain('updated');
      expect(updated.body.githubLink).toBe('https://example.com/updated');

      // update validation (bad githubLink)
      await request(app.getHttpServer())
        .patch(`/posts/${postId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ githubLink: 'bad-url' })
        .expect(400);

      // create interaction and assert aggregation
      const interaction = await request(app.getHttpServer())
        .post('/interactions')
        .set('Authorization', `Bearer ${token1}`)
        .send({ targetType: 'POST', targetId: postId, type: 'HEART' })
        .expect(201);
      expect(interaction.body.id).toBeDefined();

      const getAfter = await request(app.getHttpServer())
        .get(`/posts/${postId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);
      expect(getAfter.body.interactions.HEART).toBe(1);
      expect(getAfter.body.interactions.total).toBe(1);
      expect(getAfter.body.interactions.didInteract).toBe(true);
      expect(getAfter.body.interactions.myType).toBe('HEART');

      // share is public and should not include user-state
      const share = await request(app.getHttpServer()).get(`/posts/share/${postId}`).expect(200);
      expect(share.body.id).toBe(postId);
      expect(share.body.interactions.HEART).toBe(1);
      expect(share.body.interactions.total).toBe(1);
      expect(share.body.interactions.didInteract).toBe(false);
      expect(share.body.interactions.myType).toBeNull();

      // other user forbidden on update/delete
      const s2 = uniqueSuffix();
      const token2 = await registerAndVerify(app, {
        email: `posts-e2e-${s2}@example.com`,
        password: 'password123',
        username: `posts_e2e_${s2}`,
        fullName: `Posts E2E ${s2}`,
      });

      await request(app.getHttpServer())
        .patch(`/posts/${postId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ title: 'hijack' })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/posts/${postId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      // delete by owner
      await request(app.getHttpServer())
        .delete(`/posts/${postId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // not found after delete (protected and share)
      await request(app.getHttpServer())
        .get(`/posts/${postId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);
      await request(app.getHttpServer()).get(`/posts/share/${postId}`).expect(404);

      // update after delete should be not found
      await request(app.getHttpServer())
        .patch(`/posts/${postId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'after delete' })
        .expect(404);
    });
  });

  describe('Not found scenarios', () => {
    it('GET /posts/:id returns 404 for missing post', async () => {
      const s = uniqueSuffix();
      const token = await registerAndVerify(app, {
        email: `posts-e2e-${s}@example.com`,
        password: 'password123',
        username: `posts_e2e_${s}`,
        fullName: `Posts E2E ${s}`,
      });

      await request(app.getHttpServer())
        .get('/posts/999999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('PATCH /posts/:id returns 404 for missing post', async () => {
      const s = uniqueSuffix();
      const token = await registerAndVerify(app, {
        email: `posts-e2e-${s}@example.com`,
        password: 'password123',
        username: `posts_e2e_${s}`,
        fullName: `Posts E2E ${s}`,
      });

      await request(app.getHttpServer())
        .patch('/posts/999999')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'nope' })
        .expect(404);
    });

    it('DELETE /posts/:id returns 404 for missing post', async () => {
      const s = uniqueSuffix();
      const token = await registerAndVerify(app, {
        email: `posts-e2e-${s}@example.com`,
        password: 'password123',
        username: `posts_e2e_${s}`,
        fullName: `Posts E2E ${s}`,
      });

      await request(app.getHttpServer())
        .delete('/posts/999999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
