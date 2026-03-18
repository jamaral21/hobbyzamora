#!/usr/bin/env bash
set -Eeuo pipefail

# Bulletproof deploy script for Vultr (Ubuntu + systemd)
# Usage example:
# REPO_URL=git@github.com:jamaral21/hobbyzamora.git BRANCH=main \
# SERVICE_NAME=hobbyzamora-api BASE_DIR=/var/www/hobbyzamora \
# ./scripts/deploy-vultr.sh

APP_NAME="${APP_NAME:-hobbyzamora}"
BASE_DIR="${BASE_DIR:-/var/www/${APP_NAME}}"
RELEASES_DIR="${RELEASES_DIR:-${BASE_DIR}/releases}"
SHARED_DIR="${SHARED_DIR:-${BASE_DIR}/shared}"
CURRENT_LINK="${CURRENT_LINK:-${BASE_DIR}/current}"
BACKUPS_DIR="${BACKUPS_DIR:-${BASE_DIR}/backups}"
LOCK_FILE="${LOCK_FILE:-/tmp/${APP_NAME}.deploy.lock}"

REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-${APP_NAME}-api}"
PORT="${PORT:-3001}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}/api/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-25}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-2}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

PRISMA_SCHEMA="server/prisma/schema.prisma"

log() {
  printf '[deploy] %s\n' "$*"
}

error() {
  printf '[deploy][ERROR] %s\n' "$*" >&2
}

fail() {
  error "$*"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

create_dirs() {
  mkdir -p "${RELEASES_DIR}" "${SHARED_DIR}" "${BACKUPS_DIR}"
}

acquire_lock() {
  exec 200>"${LOCK_FILE}"
  if ! flock -n 200; then
    fail "Another deploy is currently running. Lock file: ${LOCK_FILE}"
  fi
}

ensure_required_files() {
  [ -n "${REPO_URL}" ] || fail "REPO_URL is required"
  [ -f "${SHARED_DIR}/.env" ] || fail "Missing ${SHARED_DIR}/.env"
}

read_env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "${SHARED_DIR}/.env" | head -n1 | tr -d '"'
}

backup_database() {
  local database_url
  database_url="$(read_env_value DATABASE_URL || true)"

  if [ -z "${database_url}" ]; then
    log "DATABASE_URL not found in shared .env. Skipping database backup."
    return
  fi

  local ts
  ts="$(date +%Y%m%d_%H%M%S)"

  if printf '%s' "${database_url}" | grep -q '^file:'; then
    local sqlite_path
    sqlite_path="${database_url#file:}"

    if printf '%s' "${sqlite_path}" | grep -q '^\./'; then
      sqlite_path="${CURRENT_LINK}/${sqlite_path#./}"
    fi

    if [ -f "${sqlite_path}" ]; then
      cp "${sqlite_path}" "${BACKUPS_DIR}/sqlite_${ts}.db"
      log "SQLite backup created at ${BACKUPS_DIR}/sqlite_${ts}.db"
    else
      log "SQLite file not found (${sqlite_path}). Skipping SQLite backup."
    fi
    return
  fi

  if printf '%s' "${database_url}" | grep -q '^postgres'; then
    require_cmd pg_dump
    local backup_file
    backup_file="${BACKUPS_DIR}/postgres_${ts}.sql"
    pg_dump "${database_url}" > "${backup_file}"
    log "PostgreSQL backup created at ${backup_file}"
    return
  fi

  log "Unsupported DATABASE_URL scheme. Skipping database backup."
}

health_check() {
  local i
  for i in $(seq 1 "${HEALTH_RETRIES}"); do
    if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
      log "Health check passed on attempt ${i}"
      return 0
    fi
    sleep "${HEALTH_SLEEP_SECONDS}"
  done
  return 1
}

cleanup_old_releases() {
  # Keep only N latest release folders
  ls -1dt "${RELEASES_DIR}"/* 2>/dev/null | tail -n "+$((KEEP_RELEASES + 1))" | xargs -r rm -rf
}

rollback() {
  local previous_release="$1"

  if [ -n "${previous_release}" ] && [ -d "${previous_release}" ]; then
    log "Rolling back to previous release: ${previous_release}"
    ln -sfn "${previous_release}" "${CURRENT_LINK}"
    sudo systemctl restart "${SERVICE_NAME}" || true
  else
    error "No previous release found to rollback"
  fi
}

main() {
  require_cmd git
  require_cmd npm
  require_cmd node
  require_cmd curl
  require_cmd systemctl
  require_cmd flock

  acquire_lock
  create_dirs
  ensure_required_files

  local release_id
  local release_dir
  local previous_release

  release_id="$(date +%Y%m%d_%H%M%S)"
  release_dir="${RELEASES_DIR}/${release_id}"
  previous_release="$(readlink -f "${CURRENT_LINK}" || true)"

  log "Starting deploy release ${release_id}"

  backup_database

  log "Cloning repository ${BRANCH}"
  git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" "${release_dir}"

  log "Linking shared .env"
  ln -sfn "${SHARED_DIR}/.env" "${release_dir}/.env"

  log "Installing dependencies with npm ci"
  (
    cd "${release_dir}"
    npm ci
  )

  log "Generating Prisma client"
  (
    cd "${release_dir}"
    npm run db:generate
  )

  log "Running Prisma migrations (deploy)"
  (
    cd "${release_dir}"
    npx prisma migrate deploy --schema "${PRISMA_SCHEMA}"
  )

  log "Building frontend and backend"
  (
    cd "${release_dir}"
    npm run build
  )

  # Prune dev dependencies after build to reduce runtime footprint
  log "Pruning dev dependencies"
  (
    cd "${release_dir}"
    npm prune --omit=dev
  )

  log "Switching current symlink"
  ln -sfn "${release_dir}" "${CURRENT_LINK}"

  log "Restarting systemd service: ${SERVICE_NAME}"
  sudo systemctl restart "${SERVICE_NAME}"

  log "Checking service health: ${HEALTH_URL}"
  if ! health_check; then
    error "Health check failed after deploy"
    rollback "${previous_release}"
    fail "Deploy failed and rollback was triggered"
  fi

  cleanup_old_releases
  log "Deploy succeeded. Active release: ${release_id}"
}

main "$@"
