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

date_predicate_for_column() {
  local column="$1"
  cat <<SQL
(
  ($column IS NOT NULL AND typeof($column) IN ('integer', 'real') AND datetime($column / 1000, 'unixepoch') >= datetime('$SINCE_DATE'))
  OR
  ($column IS NOT NULL AND typeof($column) = 'text' AND datetime($column) >= datetime('$SINCE_DATE'))
)
SQL
}

DB_PATH="${1:-$(resolve_default_db_path)}"
SINCE_DATE="${2:-$(date +%Y-%m-%d)}"
OUT_DIR="${3:-server/prisma/backups/shipments/diff}"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Error: no existe la base en $DB_PATH" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

STAMP="$(date +%Y-%m-%d-%H%M%S)"
OUT_FILE="$OUT_DIR/shipments.changes.since-${SINCE_DATE}.$STAMP.sql"
TMP_INSERTS="$(mktemp)"
trap 'rm -f "$TMP_INSERTS"' EXIT

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

has_column() {
  local table="$1"
  local column="$2"
  sqlite3 "$DB_PATH" "PRAGMA table_info($table);" | awk -F'|' -v col="$column" '$2 == col { found = 1 } END { exit(found ? 0 : 1) }'
}

for table in "${TABLES[@]}"; do
  where_clause="$(date_predicate_for_column createdAt)"

  if has_column "$table" "updatedAt"; then
    where_clause="$(date_predicate_for_column createdAt) OR $(date_predicate_for_column updatedAt)"
  fi

  # Exporta filas nuevas o actualizadas desde la fecha indicada.
  sqlite3 "$DB_PATH" <<SQL >> "$TMP_INSERTS"
.mode insert $table
SELECT * FROM $table
WHERE $where_clause
ORDER BY id;
SQL
done

{
  echo "-- Shipments changes exported from $DB_PATH"
  echo "-- Since date: $SINCE_DATE"
  echo "-- Generated at: $(date -Is)"
  echo "PRAGMA foreign_keys=OFF;"
  echo "BEGIN TRANSACTION;"

  # Convierte INSERT a INSERT OR REPLACE para facilitar aplicación idempotente en producción.
  if [[ -s "$TMP_INSERTS" ]]; then
    sed 's/^INSERT INTO /INSERT OR REPLACE INTO /' "$TMP_INSERTS"
  fi

  echo "COMMIT;"
  echo "PRAGMA foreign_keys=ON;"
} > "$OUT_FILE"

echo "SQL de cambios Shipments generado:"
echo "- $OUT_FILE"