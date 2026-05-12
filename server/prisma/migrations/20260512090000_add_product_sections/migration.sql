CREATE TABLE "product_sections" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "parentCategory" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "product_sections_parentCategory_name_key" ON "product_sections"("parentCategory", "name");
CREATE UNIQUE INDEX "product_sections_parentCategory_slug_key" ON "product_sections"("parentCategory", "slug");
