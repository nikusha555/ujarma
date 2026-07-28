/**
 * routes/index.js — Public Routes
 * ==================================
 * All publicly accessible pages of the Ujarma website.
 */

import { Router }                                           from 'express';
import { getHome }                                          from '../controllers/homeController.js';
import { getNews, getNewsArticle }                          from '../controllers/newsController.js';
import { getAttractions, getAttractionDetail }              from '../controllers/attractionsController.js';
import { getGallery }                                       from '../controllers/galleryController.js';
import { getAbout }                                         from '../controllers/aboutController.js';
import { getContact }                                       from '../controllers/contactController.js';

const router = Router();

// Homepage
router.get('/', getHome);

// News
router.get('/news',        getNews);
router.get('/news/:slug',  getNewsArticle);

// Attractions
router.get('/attractions',        getAttractions);
router.get('/attractions/:slug',  getAttractionDetail);

// Gallery
router.get('/gallery', getGallery);

// About
router.get('/about', getAbout);

// Contact
router.get('/contact', getContact);

export default router;
