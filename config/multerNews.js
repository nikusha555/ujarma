/**
 * config/multerNews.js — Multer Upload Config for News Images
 * ============================================================
 * Saves files to uploads/news/ with a timestamped random filename.
 * Allowed types: JPEG, PNG, WebP.  Max size: 5 MB.
 *
 * Usage in a route:
 *   import uploadNews from '../config/multerNews.js';
 *   router.post('/news/create', uploadNews.single('image'), handler);
 *
 * Multer error codes:
 *   LIMIT_FILE_SIZE  → file exceeds 5 MB
 *   Any fileFilter error → wrong MIME type
 */

import multer from 'multer';
import path   from 'path';
import fs     from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const UPLOAD_DIR    = path.join(__dirname, '..', 'uploads', 'news');

// Ensure the news upload sub-directory exists at module load time
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('მხოლოდ JPG, PNG და WebP ფაილებია დასაშვები.'), false);
  }
};

const uploadNews = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export default uploadNews;
