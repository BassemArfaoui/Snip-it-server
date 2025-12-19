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
}): Promise<{ accessToken: string; email: string }> {
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

  const accessToken = verify.body?.tokens?.accessToken as string | undefined;
  expect(accessToken).toBeDefined();
  return { accessToken: accessToken!, email: user.email };
}

async function createPost(app: INestApplication, token: string, suffix: string): Promise<number> {
  const res = await request(app.getHttpServer())
    .post('/posts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: `Post for comments ${suffix}`,
      description: `Desc ${suffix}`,
      snippetContent: `console.log('comments ${suffix}')`,
      snippetLanguage: 'ts',
    })
    .expect(201);

  const postId = res.body.id as number;
  expect(postId).toBeDefined();
  return postId;
}

describe('CommentsController (e2e)', () => {
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
    it('POST /comments/posts/:postId requires auth', async () => {
      await request(app.getHttpServer())
        .post('/comments/posts/1')
        .send({ content: 'x' })
        .expect(401);
    });

    it('PATCH /comments/:id requires auth', async () => {
      await request(app.getHttpServer()).patch('/comments/1').send({ content: 'x' }).expect(401);
    });

    it('DELETE /comments/:id requires auth', async () => {
      await request(app.getHttpServer()).delete('/comments/1').expect(401);
    });

    it('GET /comments/posts/:postId is public (404 if post missing)', async () => {
      await request(app.getHttpServer()).get('/comments/posts/999999?page=1&limit=10').expect(404);
    });
  });

  describe('Create + list + pagination + ordering', () => {
    it('creates comments and lists them paginated in DESC order', async () => {
      const s = uniqueSuffix();
      const author = await registerAndVerify(app, {
        email: `comments-author-${s}@example.com`,
        password: 'password123',
        username: `comments_author_${s}`,
        fullName: `Comments Author ${s}`,
      });

      const postId = await createPost(app, author.accessToken, s);

      const c1 = await request(app.getHttpServer())
        .post(`/comments/posts/${postId}`)
        .set('Authorization', `Bearer ${author.accessToken}`)
        .send({ content: `first ${s}` })
        .expect(201);

      // ensure createdAt differs so ordering is stable
      await new Promise((r) => setTimeout(r, 25));

      const c2 = await request(app.getHttpServer())
        .post(`/comments/posts/${postId}`)
        .set('Authorization', `Bearer ${author.accessToken}`)
        .send({ content: `second ${s}` })
        .expect(201);

      const commentId1 = c1.body.id as number;
      const commentId2 = c2.body.id as number;
      expect(commentId1).toBeDefined();
      expect(commentId2).toBeDefined();

      const page1 = await request(app.getHttpServer())
        .get(`/comments/posts/${postId}?page=1&limit=1`)
        .expect(200);

      expect(Array.isArray(page1.body.data)).toBe(true);
      expect(page1.body.data.length).toBe(1);
      expect(page1.body.meta).toBeDefined();
      expect(page1.body.data[0].id).toBe(commentId2);
      expect(page1.body.data[0].user).toBeDefined();

      const page2 = await request(app.getHttpServer())
        .get(`/comments/posts/${postId}?page=2&limit=1`)
        .expect(200);

      expect(page2.body.data.length).toBe(1);
      expect(page2.body.data[0].id).toBe(commentId1);

      const all = await request(app.getHttpServer())
        .get(`/comments/posts/${postId}?page=1&limit=10`)
        .expect(200);

      expect(all.body.data.length).toBeGreaterThanOrEqual(2);
      const ids = all.body.data.map((x: any) => x.id);
      expect(ids.indexOf(commentId2)).toBeLessThan(ids.indexOf(commentId1));
    });
  });

  describe('Validation + not found scenarios', () => {
    it('POST /comments/posts/:postId fails validation (missing content)', async () => {
      const s = uniqueSuffix();
      const user = await registerAndVerify(app, {
        email: `comments-v-${s}@example.com`,
        password: 'password123',
        username: `comments_v_${s}`,
        fullName: `Comments V ${s}`,
      });

      const postId = await createPost(app, user.accessToken, s);

      await request(app.getHttpServer())
        .post(`/comments/posts/${postId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({})
        .expect(400);
    });

    it('POST /comments/posts/:postId returns 404 for missing post', async () => {
      const s = uniqueSuffix();
      const user = await registerAndVerify(app, {
        email: `comments-nf-${s}@example.com`,
        password: 'password123',
        username: `comments_nf_${s}`,
        fullName: `Comments NF ${s}`,
      });

      await request(app.getHttpServer())
        .post('/comments/posts/999999')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ content: 'hello' })
        .expect(404);
    });

    it('PATCH /comments/:id returns 404 for missing comment', async () => {
      const s = uniqueSuffix();
      const user = await registerAndVerify(app, {
        email: `comments-nf2-${s}@example.com`,
        password: 'password123',
        username: `comments_nf2_${s}`,
        fullName: `Comments NF2 ${s}`,
      });

      await request(app.getHttpServer())
        .patch('/comments/999999')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ content: 'x' })
        .expect(404);
    });

    it('DELETE /comments/:id returns 404 for missing comment', async () => {
      const s = uniqueSuffix();
      const user = await registerAndVerify(app, {
        email: `comments-nf3-${s}@example.com`,
        password: 'password123',
        username: `comments_nf3_${s}`,
        fullName: `Comments NF3 ${s}`,
      });

      await request(app.getHttpServer())
        .delete('/comments/999999')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('PATCH /comments/:id fails validation for empty content', async () => {
      const s = uniqueSuffix();
      const user = await registerAndVerify(app, {
        email: `comments-empty-${s}@example.com`,
        password: 'password123',
        username: `comments_empty_${s}`,
        fullName: `Comments Empty ${s}`,
      });

      const postId = await createPost(app, user.accessToken, s);
      const created = await request(app.getHttpServer())
        .post(`/comments/posts/${postId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ content: `hello ${s}` })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/comments/${created.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ content: '' })
        .expect(400);
    });
  });

  describe('Ownership + delete behavior', () => {
    it('prevents non-owner update/delete and hides deleted comments from list', async () => {
      const s1 = uniqueSuffix();
      const s2 = uniqueSuffix();

      const owner = await registerAndVerify(app, {
        email: `comments-owner-${s1}@example.com`,
        password: 'password123',
        username: `comments_owner_${s1}`,
        fullName: `Comments Owner ${s1}`,
      });

      const other = await registerAndVerify(app, {
        email: `comments-other-${s2}@example.com`,
        password: 'password123',
        username: `comments_other_${s2}`,
        fullName: `Comments Other ${s2}`,
      });

      const postId = await createPost(app, owner.accessToken, s1);

      const created = await request(app.getHttpServer())
        .post(`/comments/posts/${postId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ content: `owned ${s1}` })
        .expect(201);

      const commentId = created.body.id as number;
      expect(commentId).toBeDefined();

      await request(app.getHttpServer())
        .patch(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ content: 'hijack' })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .expect(403);

      // owner can update
      const updated = await request(app.getHttpServer())
        .patch(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ content: `updated ${s1}` })
        .expect(200);

      expect(updated.body.id).toBe(commentId);
      expect(updated.body.content).toBe(`updated ${s1}`);

      // owner can delete
      await request(app.getHttpServer())
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // delete/update after deletion -> 404
      await request(app.getHttpServer())
        .patch(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ content: 'after delete' })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(404);

      // list should not include deleted comment
      const listed = await request(app.getHttpServer())
        .get(`/comments/posts/${postId}?page=1&limit=10`)
        .expect(200);

      const has = listed.body.data.some((x: any) => x.id === commentId);
      expect(has).toBe(false);
    });
  });
});
