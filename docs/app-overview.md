# TransApp - Project Overview

## Purpose
TransApp is a multi-tenant web application for transport/logistics companies. It helps drivers and administrators manage:
- daily vehicle check-ins and checklists
- timesheets and work activities
- defect/deviation reporting with photo attachments
- routes, customers, vehicles, and documents
- billing and subscriptions

The app provides separate experiences for drivers and admins, backed by a unified API.

## Tech stack
Backend:
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT authentication
- Zod input validation
- File uploads with Multer
- Logging with Pino / pino-http
- Background jobs with node-cron
- Email via Nodemailer
- Payments/subscriptions via Stripe (Vipps integration also present in repo)

Frontend:
- React 18
- Vite
- TypeScript
- React Router
- Tailwind CSS (used alongside existing CSS)

## High-level structure
- `src/` - backend (controllers, services, repositories, middleware, routes)
- `frontend/` - React client app
- `prisma/` - database schema and migrations
- `docs/` - documentation (data model, project map)
- `test/` - tests (Vitest + Supertest)

## Core features
Driver:
- vehicle checklist (with deviations)
- daily timesheets (driving, other work, break, availability)
- vehicle check-in (valid only for current Oslo day)
- defect reporting + attachments
- personal documents

Admin:
- defects list and management
- timesheet admin (filters, reporting)
- manage customers, routes, vehicles, users
- documents and billing

## Multi-tenancy
Tenants are identified by `companySlug` and enforced by backend middleware. Typical routes:
- Frontend: `/c/:companySlug/...`
- API: `/api/v1/...` (company context resolved server-side)

## Useful scripts (root)
- `npm run dev` - backend + frontend (concurrently)
- `npm run dev:backend` - backend with nodemon
- `npm run dev:frontend` - frontend via Vite
- `npm run build` - build frontend
- `npm run test` - test suite
- `npm run db:seed:dev` - seed dev database

## Database
Schema lives in `prisma/schema.prisma` with migrations under `prisma/migrations/`.
For details, see `docs/data-model.md`.

## API and architecture
- Controllers handle request/response
- Services contain business logic
- Repositories encapsulate DB access
- Middleware handles auth, rate limiting, and company context

## UI/UX
- Separate admin and driver pages
- React layout components for navigation and routing
- Token-based auth in frontend utilities

## Repo references
- `docs/project-map.md` - repository map
- `docs/data-model.md` - data model
- `README.md` - DB and migration notes
