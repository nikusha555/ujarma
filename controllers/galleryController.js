/**
 * controllers/galleryController.js — Gallery Controller
 * =======================================================
 * Handles gallery listing with optional category filter.
 */

import GalleryItem from '../models/GalleryItem.js';

/**
 * GET /gallery
 * Renders the gallery with optional ?category= query param.
 */
export const getGallery = async (req, res, next) => {
  try {
    const { category } = req.query;

    const [items, categories] = await Promise.all([
      GalleryItem.findAll(category || null).catch(() => []),
      GalleryItem.getCategories().catch(() => []),
    ]);

    res.render('pages/gallery', {
      title:          'გალერეა — უჯარმა',
      description:    'გადიხეთ ფოტოსურათები, რომლებიც ასახავს უჯარმის სოფლის ბუნებრივ სილარზესა და თემთა ცხოვრებას.',
      items,
      categories,
      activeCategory: category || null,
    });
  } catch (error) {
    next(error);
  }
};
