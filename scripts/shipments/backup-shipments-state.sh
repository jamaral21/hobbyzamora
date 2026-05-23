#!/usr/bin/env bash
set -euo pipefail

resolve_default_db_path() {
  local url="${DATABASE_URL:-}"

  if [[ -z "$url" && -f ".env" ]]; then
    url="$(grep -m1 '^DATABASE_URL=' .env | cut -d'=' -f2- | tr -d '"')"
  fi

  if [[ "$url" == file:* ]]; then
    local rel_path="${url#file:}"
    rel_path="${rel_path#./}"

    if [[ -f "$rel_path" ]]; then
      echo "$rel_path"
      return 0
    fi

    if [[ -f "server/prisma/$rel_path" ]]; then
      echo "server/prisma/$rel_path"
      return 0
    fi
  fi

  if [[ -f "dev.db" ]]; then
    echo "dev.db"
    return 0
  fi

  if [[ -f "server/prisma/dev.db" ]]; then
    echo "server/prisma/dev.db"
    return 0
  fi

  return 1
}

DB_PATH="${1:-$(resolve_default_db_path)}"
OUT_DIR="${2:-server/prisma/backups/shipments}"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Error: no existe la base en $DB_PATH" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

STAMP="$(date +%Y-%m-%d-%H%M%S)"
DB_BACKUP="$OUT_DIR/dev.shipments.snapshot.$STAMP.db"
SQL_DUMP="$OUT_DIR/shipments.snapshot.$STAMP.sql"
META_FILE="$OUT_DIR/shipments.snapshot.$STAMP.meta.txt"

TABLES=(
  shipments_purchases
  shipments_invoices
  shipments_invoice_items
  shipments_boxes
  shipments_box_products
  shipments_chile_stock
  shipments_web_orders
  shipments_web_order_products
  shipments_local_purchases
  shipments_sales
  shipments_gav_chile
  shipments_config
  shipments_gav_month_control
)

# Respaldo consistente de la base SQLite completa.
sqlite3 "$DB_PATH" ".backup '$DB_BACKUP'"

# Dump de esquema + datos solo de tablas Shipments.
{
  echo "PRAGMA foreign_keys=OFF;"
  echo "BEGIN TRANSACTION;"
  sqlite3 "$DB_PATH" ".dump ${TABLES[*]}" | grep -vE '^(PRAGMA|BEGIN TRANSACTION;|COMMIT;)$' || true
  echo "COMMIT;"
  echo "PRAGMA foreign_keys=ON;"
} > "$SQL_DUMP"

{
  echo "timestamp=$STAMP"
  echo "source_db=$DB_PATH"
  echo "db_backup=$DB_BACKUP"
  echo "sql_dump=$SQL_DUMP"
  echo "tables=${TABLES[*]}"
} > "$META_FILE"

echo "Backup Shipments generado:" 
echo "- $DB_BACKUP"
echo "- $SQL_DUMP"
echo "- $META_FILE"
