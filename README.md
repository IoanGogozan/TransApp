## Database environments

- Dev uses `.env` and connects to the `transapp` database defined in `DATABASE_URL`.
- Tests use `.env.test` and connect to the `transapp_test` database.
- Seed data:
  - Dev: `npm run db:seed:dev`
  - Test: `npm run db:seed:test`
  - Default (current env): `npm run db:seed`
- To verify which database the backend is using in non-production, call `GET /api/v1/health/db`. The response shows `NODE_ENV`, the database name, row counts, and sample company slugs.
- After seeding dev, `GET /api/v1/c/demo/public` should return the demo tenant info for login at `/c/demo/login`.

## After Prisma schema changes

- `npx prisma migrate dev`
- `npx prisma generate`
- restart backend
