'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isNonEmptyString, isValidEmail } = require('../utils/validation');

const ALLOWED_ROLES = ['student', 'instructor'];
const MIN_PASSWORD_LENGTH = 8;

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function createAuthRouter({ store, jwtSecret, bcryptRounds = 10, tokenTtl = '1h' }) {
  const router = express.Router();

  router.post('/register', async (req, res, next) => {
    try {
      const { name, email, password, role = 'student' } = req.body || {};

      if (!isNonEmptyString(name)) {
        return res.status(400).json({ error: 'name is required' });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'A valid email is required' });
      }
      if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        return res
          .status(400)
          .json({ error: `password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      }
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: `role must be one of: ${ALLOWED_ROLES.join(', ')}` });
      }

      const passwordHash = await bcrypt.hash(password, bcryptRounds);

      // Check + insert happen synchronously after the await, so duplicates cannot slip through.
      if (store.findUserByEmail(email)) {
        return res.status(409).json({ error: 'Email is already registered' });
      }

      const user = store.addUser({ name: name.trim(), email, passwordHash, role });
      return res.status(201).json(toPublicUser(user));
    } catch (error) {
      return next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body || {};

      if (!isNonEmptyString(email) || typeof password !== 'string' || password.length === 0) {
        return res.status(400).json({ error: 'email and password are required' });
      }

      const user = store.findUserByEmail(email);
      const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

      if (!user || !passwordMatches) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ role: user.role }, jwtSecret, {
        subject: String(user.id),
        expiresIn: tokenTtl,
        algorithm: 'HS256',
      });

      return res.status(200).json({ token, user: toPublicUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createAuthRouter };
