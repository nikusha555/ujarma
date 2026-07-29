/**
 * controllers/aboutController.js — About Page Controller
 */

/**
 * GET /about
 * Renders the About Ujarma page.
 */
export const getAbout = async (req, res, next) => {
  try {
    res.render('pages/about', {
      title:       'უჯარმის შესახებ — ოფიციალური საინფორმაციო პორტალი',
      titleKey:    'about.pageTitle',
      description: 'გაიგეთ უჯარმის მდიდარი ისტორიის, კულტურისა და მემკვიდრეობის შესახებ კახეთის რეგიონში.',
    });
  } catch (error) {
    next(error);
  }
};
