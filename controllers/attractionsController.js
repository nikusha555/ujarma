/**
 * controllers/attractionsController.js — Attractions Controller
 * ==============================================================
 * Handles the attractions listing and detail views.
 */

import Attraction from '../models/Attraction.js';

/**
 * GET /attractions
 * Renders all published attractions.
 */
export const getAttractions = async (req, res, next) => {
  try {
    const attractions = await Attraction.findAll().catch(() => []);

    res.render('pages/attractions', {
      title:       'ღირსშესანიშნაობები — უჯარმა',
      description: 'აიკვლეთ უჯარმის ისტორიული ძეგლები, ფასეული სილარზე და უჯარმის კულტურული მემკვიდრეობა.',
      attractions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /attractions/:slug
 * Renders a single attraction detail page.
 */
export const getAttractionDetail = async (req, res, next) => {
  try {
    const attraction = await Attraction.findBySlug(req.params.slug);

    if (!attraction) {
      const error  = new Error('Attraction not found');
      error.status = 404;
      return next(error);
    }

    res.render('pages/attraction-detail', {
      title:       `${attraction.name} — უჯარმა`,
      description: attraction.description,
      ogImage:     attraction.image || '/images/og-default.jpg',
      attraction,
    });
  } catch (error) {
    next(error);
  }
};
