# AGENTS

## Purpose
Operational rules for AI/code agents working on this repository.

## Stack Summary
- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- ORM: Prisma
- Database: SQLite or PostgreSQL (from DATABASE_URL)
- Process manager target: systemd (Vultr Ubuntu)

## Deploy Standard (Vultr)
Use `scripts/deploy-vultr.sh` as the default production deploy path.

### Required deploy model
1. Immutable releases in `/var/www/hobbyzamora/releases/<timestamp>`.
2. `current` symlink switch for atomic activation.
3. Shared env file at `/var/www/hobbyzamora/shared/.env`.
4. Service restart through systemd.
5. Health check on `/api/health`.
6. Automatic rollback if health check fails.

## Safety Rules
1. Never run destructive git commands (`reset --hard`, force checkout) in server paths.
2. Never deploy on top of a mutable working tree.
3. Never log secrets from `.env`.
4. Never skip migrations in production deploy.
5. Never continue deploy if required env vars are missing.

## Mandatory Checks
Before deploy:
1. `REPO_URL` is provided.
2. Shared `.env` exists.
3. systemd service exists and is enabled.
4. `DATABASE_URL` is valid.

After deploy:
1. `systemctl status hobbyzamora-api` is healthy.
2. `/api/health` returns 200.
3. Critical API flows respond (auth/products/orders).

## Runtime Expectations
- API default port is 3001.
- Reverse proxy (Nginx/Caddy) should route public traffic and forward `/api` to backend.
- Frontend static files are expected to be served by the web server, not Express.

## Agent Change Policy
- Prefer minimal, reversible edits.
- Keep compatibility with existing npm scripts.
- Add deployment improvements without breaking local development.
- If uncertain about infra details, default to Vultr Ubuntu conventions (systemd + reverse proxy).
