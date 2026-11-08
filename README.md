# LMS CI Pipeline

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

> **Replace `OWNER/REPO`** in the badge URL above with your GitHub username/organisation and repository name
> (for example `jane/lms-ci-pipeline`). The badge shows "no status" until the workflow has run once on that repo.

A small Learning Management System (LMS) API with a complete continuous-integration pipeline:
**ESLint → Jest → Docker build**, run by GitHub Actions on every push and pull request.

## Tech stack

Node.js (≥ 20) · Express · JWT auth (`jsonwebtoken`, `bcryptjs`) · Jest + Supertest · ESLint 9 (flat config) · Docker · GitHub Actions

## Project structure

```
lms-ci-pipeline/
├── .github/workflows/ci.yml   # CI pipeline (lint, test, docker)
├── src/
│   ├── app.js                 # Express app factory
│   ├── server.js              # Process entry point
│   ├── store.js               # In-memory data store (demo only)
│   ├── routes/                # auth.js, courses.js
│   ├── middleware/            # JWT auth, error handling
│   └── utils/validation.js
├── tests/                     # Jest + Supertest tests
├── Dockerfile                 # Multi-stage, non-root image
├── eslint.config.js
├── .env.example
└── package.json
```

## Getting started

```bash
npm install                    # also creates package-lock.json - commit it
cp .env.example .env           # then put a random value in JWT_SECRET
```

Generate a secret and start the server:

```bash
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
npm start                      # http://localhost:3000
```

The server refuses to start without `JWT_SECRET`. Real secrets must never be committed; `.env` is git-ignored.

### Scripts

| Command                 | What it does                                     |
| ----------------------- | ------------------------------------------------ |
| `npm start`             | Run the API                                      |
| `npm run dev`           | Run with auto-restart on file changes            |
| `npm run lint`          | ESLint; fails on any error or warning            |
| `npm run lint:fix`      | Auto-fix what ESLint can                         |
| `npm test`              | Run the Jest suite                               |
| `npm run test:coverage` | Jest with a coverage report in `coverage/`       |
| `npm run docker:build`  | Build the Docker image as `lms-app`              |

## API

| Method | Path                       | Auth       | Description                                         |
| ------ | -------------------------- | ---------- | --------------------------------------------------- |
| GET    | `/health`                  | -          | Liveness check                                      |
| POST   | `/api/auth/register`       | -          | Body: `name`, `email`, `password` (≥ 8 chars), optional `role` (`student` or `instructor`) |
| POST   | `/api/auth/login`          | -          | Body: `email`, `password` → `{ token, user }`       |
| GET    | `/api/courses`             | -          | List courses; optional `?q=` text filter            |
| GET    | `/api/courses/:id`         | -          | Get one course                                      |
| POST   | `/api/courses`             | instructor | Body: `title`, `description`                        |
| POST   | `/api/courses/:id/enroll`  | student    | Enroll the current user                             |

Send the token as `Authorization: Bearer <token>`.

Example:

```bash
curl -X POST localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"correct-horse-battery"}'

curl -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct-horse-battery"}'
```

## Docker

```bash
docker build -t lms-app .
docker run --rm -p 3000:3000 -e JWT_SECRET="$(openssl rand -hex 32)" lms-app
curl http://localhost:3000/health
```

The image is multi-stage, installs production dependencies only, runs as the unprivileged `node` user, and includes a
`HEALTHCHECK`. The secret is supplied at runtime and is never baked into the image.

## The CI pipeline

Defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml). It triggers on **every push and every pull request**.

| Job          | Purpose                                                                                 |
| ------------ | --------------------------------------------------------------------------------------- |
| `lint`       | `npm run lint` (`eslint . --max-warnings 0`)                                            |
| `test`       | `npm run test:coverage` on Node 20 and 22; uploads the coverage report as an artifact   |
| `docker`     | Builds the image, then starts it and checks `/health`. Runs only after `lint` and `test` pass |

**Failure behaviour:** each step fails the job when its command exits non-zero, so lint errors/warnings or failing tests
turn the run red. Because `docker` declares `needs: [lint, test]`, a failure in either one stops the Docker build.
Nothing is pushed to any registry, and the workflow has read-only `contents` permission and uses no repository secrets.
The container smoke test generates a throwaway `JWT_SECRET` inside the job.

### Make failures block merges

A red check does not by itself prevent merging. In GitHub go to **Settings → Branches → Branch protection rules**,
enable **Require status checks to pass before merging**, and select `Lint`, `Test (Node 20)`, `Test (Node 22)` and
`Docker build`.

### Using the lockfile

The workflow and Dockerfile run `npm ci` when `package-lock.json` exists and fall back to `npm install` otherwise.
Run `npm install` once locally and commit the generated `package-lock.json` for reproducible builds. After that you can
also add `cache: npm` to the `actions/setup-node` steps to speed up CI.

## Publishing to GitHub

```bash
git init && git add . && git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/OWNER/REPO.git
git push -u origin main
```

Then open the **Actions** tab to see the first run, and fix the badge URL as described at the top.

## Limitations

- Data lives in memory and resets on restart; swap `src/store.js` for a real database before any real use.
- `register` lets callers choose the `instructor` role to keep the demo self-contained. A real system should restrict this.
- No rate limiting, refresh tokens, or password-reset flow.
