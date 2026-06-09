/**
 * controllers/newsController.js — News Controller
 * =================================================
 * Handles news listing and single-article views.
 */

import News from '../models/News.js';

/**
 * GET /news
 * Renders the paginated news listing page.
 */
export const getNews = async (req, res, next) => {
  try {
    const articles = await News.findAll(20).catch(() => []);

    res.render('pages/news', {
      title:       'სიახლეები — უჯარმა',
      description: 'უჯარმის სოფლის ადმინისტრაციის უახლესი განცხადებები, გადაწყვეთა და სიახლეები.',
      articles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /news/:slug
 * Renders a single news article.
 */
export const getNewsArticle = async (req, res, next) => {
  try {
    const article = await News.findBySlug(req.params.slug);

    if (!article) {
      const error  = new Error('Article not found');
      error.status = 404;
      return next(error);
    }

    res.render('pages/news-article', {
      title:       `${article.title} — უჯარმა`,
      description: article.excerpt || article.title,
      ogImage:     article.image   || '/images/og-default.jpg',
      article,
    });
  } catch (error) {
    next(error);
  }
};
