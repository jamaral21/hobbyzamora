#!/usr/bin/env bash
set -euo pipefail

# Restore ONLY the images field for a single product SKU from a source SQLite DB
# into the production SQLite DB used by the app.
#
# Usage:
#   ./scripts/restore-images-only.sh /path/to/source.db SKU
#
# Example:
#   ./scripts/restore-images-only.sh /var/www/hobbyzamora/shared/prod-good.db BCX-014

SOURCE_DB="${1:-}"
SKU="${2:-}"
TARGET_DB="${TARGET_DB:-/var/www/hobbyzamora/shared/prod.db}"

if [[ -z "$SOURCE_DB" || -z "$SKU" ]]; then
  echo "Uso: $0 /ruta/al/source.db SKU"
  exit 1
fi

if [[ ! -f "$SOURCE_DB" ]]; then
  echo "No existe SOURCE_DB: $SOURCE_DB"
  exit 1
fi

if [[ ! -f "$TARGET_DB" ]]; then
  echo "No existe TARGET_DB: $TARGET_DB"
  exit 1
fi

# Basic SKU validation to avoid SQL injection in interpolated query.
if [[ ! "$SKU" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "SKU invalido: $SKU"
  exit 1
fi

BACKUP="${TARGET_DB}.backup-before-images-$(date +%Y%m%d-%H%M%S)"
cp "$TARGET_DB" "$BACKUP"
echo "Backup creado: $BACKUP"

echo "Antes:"
sqlite3 "$TARGET_DB" "SELECT sku, images FROM products WHERE sku='$SKU';"

sqlite3 "$TARGET_DB" <<SQL
ATTACH '$SOURCE_DB' AS src;

BEGIN IMMEDIATE;

UPDATE products
SET images = (
  SELECT s.images
  FROM src.products s
  WHERE s.sku = '$SKU'
  LIMIT 1
)
WHERE sku = '$SKU'
  AND EXISTS (
    SELECT 1 FROM src.products s WHERE s.sku = '$SKU'
  );

SELECT changes() AS filas_actualizadas;

COMMIT;
DETACH src;
SQL

echo "Despues:"
sqlite3 "$TARGET_DB" "SELECT sku, images FROM products WHERE sku='$SKU';"

echo "OK: solo se actualizo el campo images para SKU=$SKU"
