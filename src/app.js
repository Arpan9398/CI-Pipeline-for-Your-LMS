'use strict';

const express = require('express');
const { createStore } = require('./store');
const { createAuthRouter } = require('./routes/auth');
const { createCoursesRouter } = require('./routes/courses');
const { notFound, errorHandler } = require('./middleware/errors');

/**
 * Builds the Express app. Dependencies are injectable so tests get an isolated store
 * and a fixed signing key without touching real environment configuration.
 */
function createApp({
  store = createStore(),
  jwtSecret = process.env.JWT_SECRET,
  bcryptRounds = 10,
} = {}) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', createAuthRouter({ store, jwtSecret, bcryptRounds }));
  app.use('/api/courses', createCoursesRouter({ store, jwtSecret }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
