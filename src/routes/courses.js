'use strict';

const express = require('express');
const { createAuthMiddleware } = require('../middleware/auth');
const { isNonEmptyString, parseId } = require('../utils/validation');

function createCoursesRouter({ store, jwtSecret }) {
  const router = express.Router();
  const { authenticate, requireRole } = createAuthMiddleware(jwtSecret);

  const toCourseView = (course) => ({
    ...course,
    enrolledCount: store.countEnrollments(course.id),
  });

  router.get('/', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.status(200).json(store.listCourses(query).map(toCourseView));
  });

  router.get('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Course id must be a positive integer' });
    }
    const course = store.findCourse(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    return res.status(200).json(toCourseView(course));
  });

  router.post('/', authenticate, requireRole('instructor'), (req, res) => {
    const { title, description } = req.body || {};
    if (!isNonEmptyString(title) || !isNonEmptyString(description)) {
      return res.status(400).json({ error: 'title and description are required' });
    }
    const course = store.addCourse({ title, description, instructorId: req.user.id });
    return res.status(201).json(toCourseView(course));
  });

  router.post('/:id/enroll', authenticate, requireRole('student'), (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Course id must be a positive integer' });
    }
    const course = store.findCourse(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (store.isEnrolled(req.user.id, course.id)) {
      return res.status(409).json({ error: 'Already enrolled in this course' });
    }
    store.enroll(req.user.id, course.id);
    return res.status(201).json({ courseId: course.id, userId: req.user.id });
  });

  return router;
}

module.exports = { createCoursesRouter };
