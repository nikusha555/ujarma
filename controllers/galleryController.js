/**
 * controllers/galleryController.js
 */

import GalleryItem from '../models/GalleryItem.js';

const galleryImgUrl = (f) => f ? `/uploads/gallery/${f}` : null;

export const getGallery = async (req, res, next) => {
  try {
    const items = await GalleryItem.findAll().catch(() => []);

    res.render('pages/gallery', {
      title:       'გალერეა — უჯარმა',
      description: 'გადიხეთ ფოტოსურათები, რომლებიც ასახავს უჯარმის სოფლის ბუნებრივ სილარზესა და თემთა ცხოვრებას.',
      items,
      galleryImgUrl,
    });
  } catch (error) { next(error); }
};
