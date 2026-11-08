'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');
const { createStore } = require('../src/store');

// Test-only signing key: it exists purely to sign throwaway tokens inside the test process.
const TEST_JWT_SECRET = 'test-only-signing-key-not-used-anywhere-else';

function createTestApp() {
  // Low bcrypt cost keeps the suite fast; production default is 10.
  return createApp({ store: createStore(), jwtSecret: TEST_JWT_SECRET, bcryptRounds: 4 });
}

let counter = 0;

/** Registers a fresh user and returns { token, user }. */
async function registerAndLogin(app, role = 'student') {
  counter += 1;
  const credentials = {
    email: `${role}${counter}@example.com`,
    password: 'a-long-test-password',
  };

  await request(app)
    .post('/api/auth/register')
    .send({ name: `Test ${role} ${counter}`, role, ...credentials })
    .expect(201);

  const login = await request(app).post('/api/auth/login').send(credentials).expect(200);
  return { token: login.body.token, user: login.body.user };
}

module.exports = { TEST_JWT_SECRET, createTestApp, registerAndLogin };
