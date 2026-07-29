/**
 * controllers/newsController.js — News Controller
 * =================================================
 * Handles news listing and single-article views.
 */

import News from '../models/News.js';

/**
 * Resolve the public URL for a news article image.
 * Multer stores files in uploads/news/ — the filename only is persisted in DB.
 * @param {string|null} filename
 */
const newsImageUrl = (filename) =>
  filename ? `/uploads/news/${filename}` : null;

/**
 * GET /news
 * Renders the paginated news listing page.
 */
export const getNews = async (req, res, next) => {
  try {
    const articles = await News.findAll(20).catch(() => []);

    res.render('pages/news', {
      title:        'სიახლეები — უჯარმა',
      titleKey:     'news.pageTitle',
      description:  'უჯარმის სოფლის ადმინისტრაციის უახლესი განცხადებები, გადაწყვეთა და სიახლეები.',
      articles,
      newsImageUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /news/:slug
 * Renders a single news article with related articles in the sidebar.
 */
export const getNewsArticle = async (req, res, next) => {
  try {
    const article = await News.findBySlug(req.params.slug);

    if (!article) {
      const error  = new Error('Article not found');
      error.status = 404;
      return next(error);
    }

    // Fetch latest articles for sidebar (exclude current)
    const allLatest     = await News.findLatest(4).catch(() => []);
    const relatedArticles = allLatest.filter((a) => a.slug !== article.slug).slice(0, 3);

    const imageFilename = article.featured_image || article.image;
    const imageUrl      = newsImageUrl(imageFilename);

    res.render('pages/news-article', {
      title:          `${article.title} — უჯარმა`,
      description:    article.summary || article.excerpt || article.title,
      ogImage:        imageUrl || '/images/og-default.jpg',
      article,
      imageUrl,
      relatedArticles,
      newsImageUrl,
    });
  } catch (error) {
    next(error);
  }
};
