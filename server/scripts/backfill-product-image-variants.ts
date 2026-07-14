import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const resolveUploadsBaseDir = () => {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }

  const sharedUploads = '/var/www/hobbyzamora/shared/uploads';
  if (fs.existsSync(sharedUploads)) {
    return sharedUploads;
  }

  return path.resolve(process.cwd(), 'uploads');
};

const uploadsBaseDir = resolveUploadsBaseDir();
const productUploadsDir = path.join(uploadsBaseDir, 'products');
const productVariantsDir = path.join(productUploadsDir, 'variants');

const variants = [
  { key: 'thumb', width: 400, quality: 74 },
  { key: 'card', width: 800, quality: 78 },
  { key: 'detail', width: 1200, quality: 82 },
] as const;

function variantFilename(filename: string, key: string) {
  const parsed = path.parse(filename);
  return `${parsed.name}__${key}.webp`;
}

async function run() {
  if (!fs.existsSync(productUploadsDir)) {
    console.log('[backfill] uploads/products no existe, nada que hacer');
    return;
  }

  fs.mkdirSync(productVariantsDir, { recursive: true });

  const entries = fs.readdirSync(productUploadsDir);
  const files = entries.filter((name) => {
    if (name === 'variants') return false;
    const ext = path.extname(name).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
  });

  let generated = 0;
  let failed = 0;

  for (const filename of files) {
    const source = path.join(productUploadsDir, filename);
    for (const variant of variants) {
      const outPath = path.join(productVariantsDir, variantFilename(filename, variant.key));
      if (fs.existsSync(outPath)) continue;

      try {
        await sharp(source)
          .rotate()
          .resize({
            width: variant.width,
            height: variant.width,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: variant.quality })
          .toFile(outPath);
        generated++;
      } catch (error) {
        failed++;
        console.error('[backfill] error:', { filename, variant: variant.key, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  console.log('[backfill] completed', { files: files.length, generated, failed, variantsDir: productVariantsDir });
}

run().catch((error) => {
  console.error('[backfill] fatal:', error);
  process.exit(1);
});
