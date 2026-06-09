/**
 * controllers/homeController.js — Homepage Controller
 * =====================================================
 * Fetches all homepage sections in parallel and
 * renders the main landing page.
 */

import News        from '../models/News.js';
import Attraction  from '../models/Attraction.js';
import GalleryItem from '../models/GalleryItem.js';

/**
 * GET /
 * Renders the homepage with previews of latest content.
 */
export const getHome = async (req, res, next) => {
  try {
    // Parallel fetches — each resolves to [] if DB is unavailable
    const [latestNews, featuredAttractions, recentGallery] = await Promise.all([
      News.findLatest(3).catch(() => []),
      Attraction.findFeatured(3).catch(() => []),
      GalleryItem.findRecent(8).catch(() => []),
    ]);

    res.render('pages/home', {
      title:       'უჯარმა — ოფიციალური საინფორმაციო პორტალი',
      description: 'უჯარმის სოფლის ოფიციალური ვებსაიტი. გაიცანით სიახლეები, ღირსშესანიშნაობები, ისტორია და ადმინისტრაციული ინფორმაცია.',
      ogImage:     '/images/og-home.jpg',
      latestNews,
      featuredAttractions,
      recentGallery,
    });
  } catch (error) {
    next(error);
  }
};
