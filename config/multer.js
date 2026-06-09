/**
 * config/multer.js — File Upload Configuration
 * ==============================================
 * Configures Multer for handling image uploads
 * in the admin panel (news, attractions, gallery).
 */

import multer from 'multer';
import path   from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Allowed MIME types for image uploads
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    // Generate a unique, sanitised filename
    const timestamp = Date.now();
    const ext       = path.extname(file.originalname).toLowerCase();
    const safeName  = `${timestamp}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

// File type validation filter
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Export a configured Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export default upload;
