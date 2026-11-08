'use strict';

const { createApp } = require('./app');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required. See .env.example.');
  process.exit(1);
}

const port = Number.parseInt(process.env.PORT, 10) || 3000;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`LMS API listening on port ${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
