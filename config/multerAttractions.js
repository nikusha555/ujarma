/**
 * config/multerAttractions.js — Multer for attraction images
 * Saves to uploads/attractions/  |  5 MB  |  JPEG / PNG / WebP
 */
import multer from 'multer';
import path   from 'path';
import fs     from 'fs';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'attractions');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadAttractions = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('მხოლოდ JPG, PNG და WebP ფაილებია დასაშვები.'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default uploadAttractions;
