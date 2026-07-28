/**
 * controllers/contactController.js — Contact Controller
 * =======================================================
 * Renders the contact page.
 */

/**
 * GET /contact
 * Renders the contact page.
 */
export const getContact = async (req, res, next) => {
  try {
    res.render('pages/contact', {
      title:       'კონტაქტი — უჯარმა',
      description: 'დაგვიკავშირდით უჯარმის სოფლის ადმინისტრაციასთან. მისამართი, ტელეფონი და სამუშაო საათები.',
    });
  } catch (error) {
    next(error);
  }
};
