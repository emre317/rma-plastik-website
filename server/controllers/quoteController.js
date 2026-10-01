import QuoteRequest from '../models/QuoteRequest.js';

export async function createQuoteRequest(req, res) {
  try {
    const {
      company,
      name,
      email,
      phone,
      country,
      product,
      capacity,
      quantity,
      application,
      message,
    } = req.body;

    if (
      !company?.trim() ||
      !name?.trim() ||
      !email?.trim() ||
      !message?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please complete all required fields.',
      });
    }

    const quoteRequest =
      await QuoteRequest.create({
        company: company.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || '',
        country: country?.trim() || '',
        product: product?.trim() || '',
        capacity: capacity?.trim() || '',

        quantity: quantity
          ? Number(quantity)
          : null,

        application:
          application?.trim() || '',

        message: message.trim(),
      });

    return res.status(201).json({
      success: true,

      message:
        'Quote request received successfully.',

      requestId: quoteRequest._id,
    });
  } catch (error) {
    console.error(
      'Create quote error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Quote request could not be submitted.',
    });
  }
}

export async function getQuoteRequests(
  req,
  res
) {
  try {
    const {
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const currentPage =
      Math.max(Number(page), 1);

    const pageLimit =
      Math.min(
        Math.max(Number(limit), 1),
        100
      );

    const skip =
      (currentPage - 1) * pageLimit;

    const [
      quotes,
      total,
    ] = await Promise.all([
      QuoteRequest.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(pageLimit),

      QuoteRequest.countDocuments(
        filter
      ),
    ]);

    return res.json({
      success: true,

      data: quotes,

      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        pages:
          Math.ceil(
            total / pageLimit
          ),
      },
    });
  } catch (error) {
    console.error(
      'Get quotes error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Quote requests could not be loaded.',
    });
  }
}


export async function getQuoteRequestById(
  req,
  res
) {
  try {
    const quote =
      await QuoteRequest.findById(
        req.params.id
      );

    if (!quote) {
      return res.status(404).json({
        success: false,
        message:
          'Quote request not found.',
      });
    }

    if (!quote.isRead) {
      quote.isRead = true;
      await quote.save();
    }

    return res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Quote request could not be loaded.',
    });
  }
}


export async function updateQuoteStatus(
  req,
  res
) {
  try {
    const {
      status,
    } = req.body;

    const allowedStatuses = [
      'new',
      'reviewing',
      'contacted',
      'quoted',
      'closed',
    ];

    if (
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status.',
      });
    }

    const quote =
      await QuoteRequest.findByIdAndUpdate(
        req.params.id,

        {
          status,
        },

        {
          new: true,
          runValidators: true,
        }
      );

    if (!quote) {
      return res.status(404).json({
        success: false,
        message:
          'Quote request not found.',
      });
    }

    return res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Status could not be updated.',
    });
  }
}


export async function getQuoteStats(
  req,
  res
) {
  try {
    const results =
      await QuoteRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const unread =
      await QuoteRequest.countDocuments({
        isRead: false,
      });

    const total =
      await QuoteRequest.countDocuments();

    const stats = {
      total,
      unread,

      new: 0,
      reviewing: 0,
      contacted: 0,
      quoted: 0,
      closed: 0,
    };

    results.forEach((item) => {
      stats[item._id] =
        item.count;
    });

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Statistics could not be loaded.',
    });
  }
}

export async function getUnreadQuoteCount(req, res) {
  try {
    const unread = await QuoteRequest.countDocuments({
      isRead: false,
    });

    return res.json({
      success: true,
      data: {
        unread,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unread count could not be loaded.',
    });
  }
}