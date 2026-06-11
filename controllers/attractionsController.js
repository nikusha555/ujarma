/**
 * controllers/attractionsController.js
 */

import Attraction from '../models/Attraction.js';

const attrImgUrl = (f) => f ? `/uploads/attractions/${f}` : null;

export const getAttractions = async (req, res, next) => {
  try {
    const { category } = req.query;
    const [attractions, categories] = await Promise.all([
      Attraction.findAll().catch(() => []),
      Attraction.getCategories().catch(() => []),
    ]);
    const filtered = category
      ? attractions.filter((a) => a.category === category)
      : attractions;

    res.render('pages/attractions', {
      title:          'ღირსშესანიშნაობები — უჯარმა',
      description:    'აიკვლეთ უჯარმის ისტორიული ძეგლები, ფასეული სილარზე და კულტურული მემკვიდრეობა.',
      attractions:    filtered,
      allAttractions: attractions,
      categories,
      activeCategory: category || null,
      attrImgUrl,
    });
  } catch (error) { next(error); }
};

export const getAttractionDetail = async (req, res, next) => {
  try {
    const attraction = await Attraction.findBySlug(req.params.slug);
    if (!attraction) {
      const error = new Error('ვერ მოიძებნა'); error.status = 404; return next(error);
    }
    const related = await Attraction.findRelated(attraction.category, attraction.id, 3).catch(() => []);
    const imageUrl = attrImgUrl(attraction.image);

    res.render('pages/attraction-detail', {
      title:       `${attraction.name} — უჯარმა`,
      description: attraction.description,
      ogImage:     imageUrl || '/images/og-default.jpg',
      attraction,
      imageUrl,
      related,
      attrImgUrl,
    });
  } catch (error) { next(error); }
};
