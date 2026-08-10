/**
 * config/multerNewsMedia.js — Multer Upload Config for News Media
 * ===================================================================
 * Handles the "მედია" (Media) section of the News create/edit forms:
 * multiple images AND video, selected together from one file input
 * (`<input type="file" name="media" multiple>`) and uploaded together
 * on the same form submit — no separate async upload endpoint.
 *
 * Saves to the EXISTING uploads/news/ folder (same as the legacy
 * single-image field) using the same timestamp+random filename
 * scheme, so no new static-serving route is needed.
 *
 * Two different size ceilings apply to the SAME field because images
 * and video have very different realistic sizes. Multer only supports
 * one `limits.fileSize` per Multer instance, so that ceiling is set to
 * the larger (video) limit here, and the smaller per-type image limit
 * is enforced in the controller after upload (see MAX_IMAGE_SIZE /
 * MAX_VIDEO_SIZE below — both exported so the controller and this
 * file never disagree on the numbers).
 *
 * No reverse proxy (nginx, etc.) was found in this project — it runs
 * as a plain `node app.js` process — so there is no known upstream
 * limit to respect beyond what's configured here. The video ceiling
 * (40 MB) is a deliberately conservative default for a single-server,
 * local-disk deployment with no streaming/CDN infrastructure; raise
 * MAX_VIDEO_SIZE below if the hosting environment can safely take more.
 */

import multer from 'multer';
import path   from 'path';
import fs     from 'fs';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'news');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

export const MAX_IMAGE_SIZE = 5  * 1024 * 1024;  // 5 MB  — matches the existing single-image limit
export const MAX_VIDEO_SIZE = 40 * 1024 * 1024;  // 40 MB — conservative default, see note above

export const MAX_FILES_PER_UPLOAD = 12;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) || ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('ფაილის ფორმატი არ არის მხარდაჭერილი.'), false);
  }
};

const uploadNewsMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE,          // per-file ceiling; stricter image limit re-checked in the controller
    files:    MAX_FILES_PER_UPLOAD,
  },
});

/** True for any of the accepted image MIME types. */
export const isImageMime = (mimetype) => ALLOWED_IMAGE_TYPES.includes(mimetype);

/** True for any of the accepted video MIME types. */
export const isVideoMime = (mimetype) => ALLOWED_VIDEO_TYPES.includes(mimetype);

export default uploadNewsMedia;
