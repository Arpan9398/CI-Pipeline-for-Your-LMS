'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createTestApp, registerAndLogin } = require('./helpers');

const newCourse = { title: 'Algorithms 101', description: 'Sorting, searching, and more.' };

describe('GET /api/courses', () => {
  test('lists the seeded courses', async () => {
    const res = await request(createTestApp()).get('/api/courses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toEqual(
      expect.objectContaining({ id: expect.any(Number), title: expect.any(String) }),
    );
  });

  test('filters by the q query parameter', async () => {
    const res = await request(createTestApp()).get('/api/courses').query({ q: 'jest' });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const course of res.body) {
      const text = `${course.title} ${course.description}`.toLowerCase();
      expect(text).toContain('jest');
    }
  });

  test('returns an empty list when nothing matches', async () => {
    const res = await request(createTestApp()).get('/api/courses').query({ q: 'zzz-no-match' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/courses/:id', () => {
  test('returns a single course', async () => {
    const res = await request(createTestApp()).get('/api/courses/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  test('returns 404 for a missing course', async () => {
    const res = await request(createTestApp()).get('/api/courses/9999');
    expect(res.status).toBe(404);
  });

  test('returns 400 for a non-numeric id', async () => {
    const res = await request(createTestApp()).get('/api/courses/abc');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/courses', () => {
  test('requires authentication', async () => {
    const res = await request(createTestApp()).post('/api/courses').send(newCourse);
    expect(res.status).toBe(401);
  });

  test('rejects an invalid token', async () => {
    const res = await request(createTestApp())
      .post('/api/courses')
      .set('Authorization', 'Bearer not.a.token')
      .send(newCourse);
    expect(res.status).toBe(401);
  });

  test('rejects a token signed with a different key', async () => {
    const forged = jwt.sign({ role: 'instructor' }, 'some-other-key', { subject: '1' });
    const res = await request(createTestApp())
      .post('/api/courses')
      .set('Authorization', `Bearer ${forged}`)
      .send(newCourse);
    expect(res.status).toBe(401);
  });

  test('forbids students', async () => {
    const app = createTestApp();
    const { token } = await registerAndLogin(app, 'student');
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send(newCourse);
    expect(res.status).toBe(403);
  });

  test('lets instructors create a course that is then retrievable', async () => {
    const app = createTestApp();
    const { token, user } = await registerAndLogin(app, 'instructor');

    const created = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send(newCourse);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ ...newCourse, instructorId: user.id });

    const fetched = await request(app).get(`/api/courses/${created.body.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.title).toBe(newCourse.title);
  });

  test('validates the payload', async () => {
    const app = createTestApp();
    const { token } = await registerAndLogin(app, 'instructor');
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/courses/:id/enroll', () => {
  test('requires authentication', async () => {
    const res = await request(createTestApp()).post('/api/courses/1/enroll');
    expect(res.status).toBe(401);
  });

  test('enrolls a student and updates the enrolled count', async () => {
    const app = createTestApp();
    const { token, user } = await registerAndLogin(app, 'student');

    const res = await request(app)
      .post('/api/courses/1/enroll')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ courseId: 1, userId: user.id });

    const course = await request(app).get('/api/courses/1');
    expect(course.body.enrolledCount).toBe(1);
  });

  test('rejects a duplicate enrollment', async () => {
    const app = createTestApp();
    const { token } = await registerAndLogin(app, 'student');
    const enroll = () =>
      request(app).post('/api/courses/1/enroll').set('Authorization', `Bearer ${token}`);

    await enroll().expect(201);
    const second = await enroll();
    expect(second.status).toBe(409);
  });

  test('returns 404 for a missing course', async () => {
    const app = createTestApp();
    const { token } = await registerAndLogin(app, 'student');
    const res = await request(app)
      .post('/api/courses/9999/enroll')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('forbids instructors from enrolling', async () => {
    const app = createTestApp();
    const { token } = await registerAndLogin(app, 'instructor');
    const res = await request(app)
      .post('/api/courses/1/enroll')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
