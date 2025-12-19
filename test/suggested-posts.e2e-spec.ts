import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { User } from '../src/modules/users/entities/user.entity';
import { SuggestedPost } from '../src/modules/suggested-posts/entities/suggested-post.entity';

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

describe('SuggestedPostsController (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let suggestedRepo: Repository<SuggestedPost>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userRepo = moduleFixture.get(getRepositoryToken(User));
    suggestedRepo = moduleFixture.get(getRepositoryToken(SuggestedPost));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /suggested-posts requires auth', async () => {
    await request(app.getHttpServer()).get('/suggested-posts').expect(401);
  });

  it('returns empty list for a new user', async () => {
    const s = uniqueSuffix();
    const { accessToken } = await registerAndVerify(app, {
      email: `suggested-e2e-${s}@example.com`,
      password: 'password123',
      username: `suggested_e2e_${s}`,
      fullName: `Suggested E2E ${s}`,
    });

    const res = await request(app.getHttpServer())
      .get('/suggested-posts?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.meta).toBeDefined();
  });

  it('covers pagination, interactions enrichment, and filtering deleted posts', async () => {
    const s1 = uniqueSuffix();
    const s2 = uniqueSuffix();

    // User A will receive suggestions
    const a = await registerAndVerify(app, {
      email: `suggested-a-${s1}@example.com`,
      password: 'password123',
      username: `suggested_a_${s1}`,
      fullName: `Suggested A ${s1}`,
    });

    // User B will author the posts
    const b = await registerAndVerify(app, {
      email: `suggested-b-${s2}@example.com`,
      password: 'password123',
      username: `suggested_b_${s2}`,
      fullName: `Suggested B ${s2}`,
    });

    const userA = await userRepo.findOne({ where: { email: a.email } });
    const userB = await userRepo.findOne({ where: { email: b.email } });
    expect(userA?.id).toBeDefined();
    expect(userB?.id).toBeDefined();

    // Create two posts by user B
    const post1Res = await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({
        title: `Suggested Post 1 ${s1}`,
        description: `Desc 1 ${s1}`,
        snippetContent: `console.log('sp1 ${s1}')`,
        snippetLanguage: 'ts',
      })
      .expect(201);

    const post2Res = await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({
        title: `Suggested Post 2 ${s2}`,
        description: `Desc 2 ${s2}`,
        snippetContent: `console.log('sp2 ${s2}')`,
        snippetLanguage: 'ts',
      })
      .expect(201);

    const post1Id = post1Res.body.id as number;
    const post2Id = post2Res.body.id as number;
    expect(post1Id).toBeDefined();
    expect(post2Id).toBeDefined();

    // Insert suggestions for user A (repo only; no API for this)
    await suggestedRepo.save(
      suggestedRepo.create({
        user: { id: userA!.id } as any,
        post: { id: post1Id } as any,
        score: 0.9,
        reason: 'e2e',
      }),
    );

    // create the second suggestion after the first so it sorts first (createdAt DESC)
    await suggestedRepo.save(
      suggestedRepo.create({
        user: { id: userA!.id } as any,
        post: { id: post2Id } as any,
        score: 0.8,
        reason: 'e2e',
      }),
    );

    // Pagination: limit=1 returns one item
    const page1 = await request(app.getHttpServer())
      .get('/suggested-posts?page=1&limit=1')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);

    expect(page1.body.meta).toBeDefined();
    expect(page1.body.data.length).toBe(1);
    expect(page1.body.data[0].post).toBeDefined();

    const page2 = await request(app.getHttpServer())
      .get('/suggested-posts?page=2&limit=1')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);

    expect(page2.body.data.length).toBe(1);

    // Interactions enrichment should exist on each returned post
    for (const item of [...page1.body.data, ...page2.body.data]) {
      expect(item.post.interactions).toBeDefined();
      expect(item.post.interactions.total).toBeDefined();
      expect(item.post.interactions.didInteract).toBeDefined();
      expect(item.post.interactions.myType).toBeDefined();
    }

    // Pick post1 item from a full fetch and assert initial counts
    const allBefore = await request(app.getHttpServer())
      .get('/suggested-posts?page=1&limit=10')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);

    const item1Before = allBefore.body.data.find((x: any) => x.post?.id === post1Id);
    expect(item1Before).toBeDefined();
    expect(item1Before.post.interactions.total).toBe(0);
    expect(item1Before.post.interactions.didInteract).toBe(false);
    expect(item1Before.post.interactions.myType).toBeNull();

    // User A reacts HEART to post1
    await request(app.getHttpServer())
      .post('/interactions')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ targetType: 'POST', targetId: post1Id, type: 'HEART' })
      .expect(201);

    // User B reacts FIRE to post1 (counts should include both)
    await request(app.getHttpServer())
      .post('/interactions')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({ targetType: 'POST', targetId: post1Id, type: 'FIRE' })
      .expect(201);

    const allAfter = await request(app.getHttpServer())
      .get('/suggested-posts?page=1&limit=10')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);

    const item1After = allAfter.body.data.find((x: any) => x.post?.id === post1Id);
    expect(item1After).toBeDefined();
    expect(item1After.post.interactions.HEART).toBe(1);
    expect(item1After.post.interactions.FIRE).toBe(1);
    expect(item1After.post.interactions.total).toBe(2);
    expect(item1After.post.interactions.didInteract).toBe(true);
    expect(item1After.post.interactions.myType).toBe('HEART');

    // Delete post2 (as owner) and ensure it is filtered from suggestions
    await request(app.getHttpServer())
      .delete(`/posts/${post2Id}`)
      .set('Authorization', `Bearer ${b.accessToken}`)
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get('/suggested-posts?page=1&limit=10')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);

    const hasPost2 = afterDelete.body.data.some((x: any) => x.post?.id === post2Id);
    expect(hasPost2).toBe(false);

    const stillHasPost1 = afterDelete.body.data.some((x: any) => x.post?.id === post1Id);
    expect(stillHasPost1).toBe(true);
  });
});
