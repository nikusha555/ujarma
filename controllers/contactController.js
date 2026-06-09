/**
 * controllers/contactController.js — Contact Controller
 * =======================================================
 * Handles the contact form display and submission.
 */

/**
 * GET /contact
 * Renders the contact page.
 */
export const getContact = async (req, res, next) => {
  try {
    res.render('pages/contact', {
      title:       'კონტაქტი — უჯარმა',
      description: 'დაგვიკავშირდით უჯარმის სოფლის ადმინისტრაციასთან. მისამართი, ტელეფონი, სამუშაო საათები და საკონტაქტო ფორმი.',
      success:     req.query.success === 'true',
      error:       null,
      formData:    {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /contact
 * Processes contact form submission.
 * TODO: Integrate email delivery (e.g. Nodemailer) or store in DB.
 */
export const postContact = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    // Basic server-side validation
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).render('pages/contact', {
        title:    'კონტაქტი — უჯარმა',
        description: 'დაგვიკავშირდით უჯარმის სოფლის ადმინისტრაციასთან.',
        success:  false,
        error:    'გთხოვთ შეავსეთ ყველა სავალდებულო ველი.',
        formData: { name, email, subject, message },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).render('pages/contact', {
        title:    'კონტაქტი — უჯარმა',
        description: 'დაგვიკავშირდით უჯარმის სოფლის ადმინისტრაციასთან.',
        success:  false,
        error:    'გთხოვთ შეიყვანეთ სწორი ელ.ფოსტის მისამართი.',
        formData: { name, email, subject, message },
      });
    }

    // TODO: Send email or save submission to database
    console.log('[Contact Form]', { name, email, subject: subject || '(no subject)' });

    res.redirect('/contact?success=true');
  } catch (error) {
    next(error);
  }
};
