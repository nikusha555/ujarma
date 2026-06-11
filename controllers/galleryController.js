/**
 * controllers/galleryController.js
 */

import GalleryItem from '../models/GalleryItem.js';

const galleryImgUrl = (f) => f ? `/uploads/gallery/${f}` : null;

export const getGallery = async (req, res, next) => {
  try {
    const { category: categorySlug } = req.query;
    const [items, categories] = await Promise.all([
      GalleryItem.findAll(categorySlug || null).catch(() => []),
      GalleryItem.getCategories().catch(() => []),
    ]);

    res.render('pages/gallery', {
      title:          'გალერეა — უჯარმა',
      description:    'გადიხეთ ფოტოსურათები, რომლებიც ასახავს უჯარმის სოფლის ბუნებრივ სილარზესა და თემთა ცხოვრებას.',
      items,
      categories,
      activeCategory: categorySlug || null,
      galleryImgUrl,
    });
  } catch (error) { next(error); }
};
