import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const router = Router();

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

const customsUploadsDir = path.join(resolveUploadsBaseDir(), 'customs');

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(customsUploadsDir, { recursive: true });
      cb(null, customsUploadsDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExt = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif']);
    const allowedMime = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]);
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExt.has(ext) && allowedMime.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('Formato no permitido. Usa PDF o imágenes JPG/PNG/WEBP/GIF.'));
  },
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Archivo requerido (campo "file").' });
    return;
  }

  const fileUrl = `/uploads/customs/${req.file.filename}`;
  res.status(201).json({ url: fileUrl });
});

export default router;
