## Database environments

- Local development uses PostgreSQL in Docker by default.
- Dev uses `.env` and connects to the `transapp` database defined in `DATABASE_URL`.
- Tests use `.env.test` and connect to the `transapp_test` database.
- The Docker container exposes PostgreSQL on host port `5434` to avoid collisions with other local Postgres instances.
- The container creates both local databases:
  - `transapp`
  - `transapp_test`
- Docker commands:
  - Start DB: `npm run db:up`
  - Stop DB: `npm run db:down`
  - Follow DB logs: `npm run db:logs`
- Local connection strings:
  - Dev: `postgresql://postgres:123456@localhost:5434/transapp`
  - Test: `postgresql://postgres:123456@localhost:5434/transapp_test`
- Seed data:
  - Dev: `npm run db:seed:dev`
  - Test: `npm run db:seed:test`
  - Default (current env): `npm run db:seed`
- To verify which database the backend is using in non-production, call `GET /api/v1/health/db`. The response shows `NODE_ENV`, the database name, row counts, and sample company slugs.
- After seeding dev, `GET /api/v1/c/demo/public` should return the demo tenant info for login at `/c/demo/login`.

## After Prisma schema changes

- Start PostgreSQL first with `npm run db:up`.
- `npx prisma migrate dev`
- `npx prisma generate`
- restart backend

## Database migrations

- Run `npx prisma migrate dev --name password_reset_tokens`.
- Then run `npx prisma generate` (if needed).
- Ensure `DATABASE_URL` is set correctly before running migrations.
