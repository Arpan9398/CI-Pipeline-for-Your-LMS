'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { TEST_JWT_SECRET, createTestApp } = require('./helpers');

describe('app basics', () => {
  test('GET /health returns ok', async () => {
    const res = await request(createTestApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('unknown routes return 404 JSON', async () => {
    const res = await request(createTestApp()).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  test('malformed JSON returns 400', async () => {
    const res = await request(createTestApp())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
  });

  test('createApp refuses to start without a JWT secret', () => {
    expect(() => createApp({ jwtSecret: '' })).toThrow('JWT_SECRET is required');
  });
});

describe('POST /api/auth/register', () => {
  const valid = { name: 'Ada', email: 'ada@example.com', password: 'correct-horse-battery' };

  test('creates a user without leaking the password hash', async () => {
    const res = await request(createTestApp()).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Ada', email: 'ada@example.com', role: 'student' });
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.password).toBeUndefined();
  });

  test('rejects a duplicate email (case-insensitive)', async () => {
    const app = createTestApp();
    await request(app).post('/api/auth/register').send(valid).expect(201);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, email: 'ADA@example.com' });
    expect(res.status).toBe(409);
  });

  test.each([
    ['missing name', { ...valid, name: '' }],
    ['invalid email', { ...valid, email: 'not-an-email' }],
    ['short password', { ...valid, password: 'short' }],
    ['unknown role', { ...valid, role: 'admin' }],
  ])('returns 400 for %s', async (_label, body) => {
    const res = await request(createTestApp()).post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  const credentials = { email: 'grace@example.com', password: 'correct-horse-battery' };

  async function appWithUser() {
    const app = createTestApp();
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Grace', ...credentials })
      .expect(201);
    return app;
  }

  test('returns a verifiable JWT for valid credentials', async () => {
    const app = await appWithUser();
    const res = await request(app).post('/api/auth/login').send(credentials);

    expect(res.status).toBe(200);
    const payload = jwt.verify(res.body.token, TEST_JWT_SECRET);
    expect(payload.role).toBe('student');
    expect(payload.sub).toBe(String(res.body.user.id));
  });

  test('rejects a wrong password', async () => {
    const app = await appWithUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ ...credentials, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test('rejects an unknown user with the same error as a wrong password', async () => {
    const app = await appWithUser();
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever-password' });
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ ...credentials, password: 'wrong-password' });

    expect(unknown.status).toBe(401);
    expect(unknown.body.error).toBe(wrong.body.error);
  });

  test('returns 400 when fields are missing', async () => {
    const res = await request(createTestApp()).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});
