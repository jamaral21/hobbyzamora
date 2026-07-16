BEGIN TRANSACTION;

UPDATE products
SET category = 'Figuras'
WHERE category = 'Figuarts';

UPDATE products
SET category = 'Dragon Ball CCG - Japón'
WHERE category = 'Dragon Ball  CCG - Japón';

UPDATE product_sections
SET parentCategory = 'Figuras',
    updatedAt = CURRENT_TIMESTAMP
WHERE parentCategory = 'Figuarts';

UPDATE product_sections
SET name = 'Dragon Ball CCG - Japón',
    slug = 'dragon-ball-ccg-japon',
    updatedAt = CURRENT_TIMESTAMP
WHERE name = 'Dragon Ball  CCG - Japón';

UPDATE product_sections
SET parentCategory = 'TCG Varios',
    updatedAt = CURRENT_TIMESTAMP
WHERE name IN ('Dragon Ball CCG - Japón', 'One Piece CCG - Japón')
  AND parentCategory = 'Pokémon TCG';

COMMIT;