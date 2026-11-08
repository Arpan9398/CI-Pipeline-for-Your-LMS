'use strict';

/**
 * In-memory data store. Intentionally simple so the project stays focused on CI.
 * Replace with a real database for anything beyond a demo.
 */
function createStore() {
  const users = [];
  const courses = [];
  const enrollments = [];
  let nextUserId = 1;
  let nextCourseId = 1;

  function addUser({ name, email, passwordHash, role }) {
    const user = { id: nextUserId++, name, email: email.toLowerCase(), passwordHash, role };
    users.push(user);
    return user;
  }

  function findUserByEmail(email) {
    const normalized = String(email).toLowerCase();
    return users.find((user) => user.email === normalized) || null;
  }

  function findUserById(id) {
    return users.find((user) => user.id === id) || null;
  }

  function addCourse({ title, description, instructorId = null }) {
    const course = {
      id: nextCourseId++,
      title: title.trim(),
      description: description.trim(),
      instructorId,
    };
    courses.push(course);
    return course;
  }

  function listCourses(query) {
    if (!query) {
      return [...courses];
    }
    const needle = String(query).toLowerCase();
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(needle) ||
        course.description.toLowerCase().includes(needle),
    );
  }

  function findCourse(id) {
    return courses.find((course) => course.id === id) || null;
  }

  function isEnrolled(userId, courseId) {
    return enrollments.some((e) => e.userId === userId && e.courseId === courseId);
  }

  function enroll(userId, courseId) {
    const enrollment = { userId, courseId };
    enrollments.push(enrollment);
    return enrollment;
  }

  function countEnrollments(courseId) {
    return enrollments.filter((e) => e.courseId === courseId).length;
  }

  // Sample catalogue so the API is useful immediately after start-up.
  addCourse({
    title: 'Introduction to Node.js',
    description: 'Learn the fundamentals of server-side JavaScript.',
  });
  addCourse({
    title: 'Testing with Jest',
    description: 'Write reliable unit and API tests for JavaScript projects.',
  });

  return {
    addUser,
    findUserByEmail,
    findUserById,
    addCourse,
    listCourses,
    findCourse,
    isEnrolled,
    enroll,
    countEnrollments,
  };
}

module.exports = { createStore };
