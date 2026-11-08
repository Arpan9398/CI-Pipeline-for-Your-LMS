'use strict';

function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Express recognises error handlers by their four-argument signature.
function errorHandler(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { notFound, errorHandler };
