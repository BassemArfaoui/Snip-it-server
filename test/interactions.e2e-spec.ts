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
      title: `Post for interactions ${suffix}`,
      description: `Desc ${suffix}`,
      snippetContent: `console.log('interactions ${suffix}')`,
      snippetLanguage: 'ts',
    })
    .expect(201);

  const postId = res.body.id as number;
  expect(postId).toBeDefined();
  return postId;
}

async function getPost(app: INestApplication, token: string, postId: number) {
  const res = await request(app.getHttpServer())
    .get(`/posts/${postId}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body;
}

describe('InteractionsController (e2e)', () => {
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
    it('POST /interactions requires auth', async () => {
      await request(app.getHttpServer())
        .post('/interactions')
        .send({ targetType: 'POST', targetId: 1, type: 'HEART' })
        .expect(401);
    });

    it('PATCH /interactions/:id requires auth', async () => {
      await request(app.getHttpServer()).patch('/interactions/1').send({ type: 'FIRE' }).expect(401);
    });

    it('DELETE /interactions/:id requires auth', async () => {
      await request(app.getHttpServer()).delete('/interactions/1').expect(401);
    });
  });

  describe('Validation scenarios', () => {
    it('POST /interactions rejects invalid enums and invalid targetId', async () => {
      const s = uniqueSuffix();
      const user = await registerAndVerify(app, {
        email: `interactions-v-${s}@example.com`,
        password: 'password123',
        username: `interactions_v_${s}`,
        fullName: `Interactions V ${s}`,
      });

      await request(app.getHttpServer())
        .post('/interactions')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ targetType: 'BAD', targetId: 1, type: 'HEART' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/interactions')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ targetType: 'POST', targetId: 1, type: 'BAD' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/interactions')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ targetType: 'POST', targetId: 0, type: 'HEART' })
        .expect(400);
    });

    it('PATCH /interactions/:id rejects invalid type but accepts empty body', async () => {
      const s = uniqueSuffix();
      const user = await registerAndVerify(app, {
        email: `interactions-v2-${s}@example.com`,
        password: 'password123',
        username: `interactions_v2_${s}`,
        fullName: `Interactions V2 ${s}`,
      });

      const postId = await createPost(app, user.accessToken, s);

      const created = await request(app.getHttpServer())
        .post('/interactions')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ targetType: 'POST', targetId: postId, type: 'HEART' })
        .expect(201);

      const interactionId = created.body.id as number;
      expect(interactionId).toBeDefined();

      // empty body should be fine (type is optional)
      const unchanged = await request(app.getHttpServer())
        .patch(`/interactions/${interactionId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({})
        .expect(200);

      expect(unchanged.body.id).toBe(interactionId);
      expect(unchanged.body.type).toBe('HEART');

      await request(app.getHttpServer())
        .patch(`/interactions/${interactionId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ type: 'BAD' })
        .expect(400);
    });
  });

  describe('Upsert + different interaction types + ownership + effects on post summary', () => {
    it('covers create(upsert), patch, delete, forbidden, and not found', async () => {
      const s1 = uniqueSuffix();
      const s2 = uniqueSuffix();

      const userA = await registerAndVerify(app, {
        email: `interactions-a-${s1}@example.com`,
        password: 'password123',
        username: `interactions_a_${s1}`,
        fullName: `Interactions A ${s1}`,
      });

      const userB = await registerAndVerify(app, {
        email: `interactions-b-${s2}@example.com`,
        password: 'password123',
        username: `interactions_b_${s2}`,
        fullName: `Interactions B ${s2}`,
      });

      const postId = await createPost(app, userB.accessToken, s2);

      const aCreateHeart = await request(app.getHttpServer())
        .post('/interactions')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ targetType: 'POST', targetId: postId, type: 'HEART' })
        .expect(201);

      const aInteractionId = aCreateHeart.body.id as number;
      expect(aInteractionId).toBeDefined();
      expect(aCreateHeart.body.type).toBe('HEART');

      // Same user, same target: create becomes update (upsert)
      const aCreateFire = await request(app.getHttpServer())
        .post('/interactions')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ targetType: 'POST', targetId: postId, type: 'FIRE' })
        .expect(201);

      expect(aCreateFire.body.id).toBe(aInteractionId);
      expect(aCreateFire.body.type).toBe('FIRE');

      // Another user reacts with a different type
      const bCreateFunny = await request(app.getHttpServer())
        .post('/interactions')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ targetType: 'POST', targetId: postId, type: 'FUNNY' })
        .expect(201);

      const bInteractionId = bCreateFunny.body.id as number;
      expect(bInteractionId).toBeDefined();

      // Verify aggregation from different viewers
      const postAsA1 = await getPost(app, userA.accessToken, postId);
      expect(postAsA1.interactions.FIRE).toBe(1);
      expect(postAsA1.interactions.HEART).toBe(0);
      expect(postAsA1.interactions.FUNNY).toBe(1);
      expect(postAsA1.interactions.total).toBe(2);
      expect(postAsA1.interactions.didInteract).toBe(true);
      expect(postAsA1.interactions.myType).toBe('FIRE');

      const postAsB1 = await getPost(app, userB.accessToken, postId);
      expect(postAsB1.interactions.total).toBe(2);
      expect(postAsB1.interactions.didInteract).toBe(true);
      expect(postAsB1.interactions.myType).toBe('FUNNY');

      // Owner-only patch/delete
      await request(app.getHttpServer())
        .patch(`/interactions/${bInteractionId}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ type: 'INCORRECT' })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/interactions/${bInteractionId}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(403);

      // User B updates their type
      await request(app.getHttpServer())
        .patch(`/interactions/${bInteractionId}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ type: 'INCORRECT' })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(bInteractionId);
          expect(res.body.type).toBe('INCORRECT');
        });

      const postAsA2 = await getPost(app, userA.accessToken, postId);
      expect(postAsA2.interactions.FUNNY).toBe(0);
      expect(postAsA2.interactions.INCORRECT).toBe(1);
      expect(postAsA2.interactions.total).toBe(2);

      // User A deletes their reaction
      await request(app.getHttpServer())
        .delete(`/interactions/${aInteractionId}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      const postAsA3 = await getPost(app, userA.accessToken, postId);
      expect(postAsA3.interactions.total).toBe(1);
      expect(postAsA3.interactions.didInteract).toBe(false);
      expect(postAsA3.interactions.myType).toBeNull();

      const postAsB3 = await getPost(app, userB.accessToken, postId);
      expect(postAsB3.interactions.total).toBe(1);
      expect(postAsB3.interactions.didInteract).toBe(true);
      expect(postAsB3.interactions.myType).toBe('INCORRECT');

      // Delete not found
      await request(app.getHttpServer())
        .delete('/interactions/999999')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);

      // Patch not found
      await request(app.getHttpServer())
        .patch('/interactions/999999')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ type: 'HELPFUL' })
        .expect(404);
    });
  });
});
