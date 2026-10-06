import mongoose from 'mongoose';

import QuoteRequest, {
  QUOTE_LANGUAGES,
  QUOTE_STATUSES,
} from '../models/QuoteRequest.js';
import { sendQuoteNotification } from '../services/quoteEmail.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OPTIONAL_FIELD_LIMITS = {
  phone: 40,
  country: 80,
  product: 150,
  capacity: 80,
  application: 200,
};

function cleanString(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

function parsePositiveInt(value, fallback) {
  const number = Number.parseInt(value, 10);

  return Number.isFinite(number) && number > 0
    ? number
    : fallback;
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function notFound(res) {
  return res.status(404).json({
    success: false,
    message: 'Quote request not found.',
  });
}

export async function createQuoteRequest(req, res) {
  try {
    const body = req.body || {};

    const company = cleanString(body.company);
    const name = cleanString(body.name);
    const email = cleanString(body.email).toLowerCase();
    const message = cleanString(body.message);

    if (!company || !name || !email || !message) {
      return res.status(400).json({
        success: false,
        message:
          'Please complete all required fields.',
      });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid email address.',
      });
    }

    const optional = {};

    for (const [field, maxLength] of Object.entries(
      OPTIONAL_FIELD_LIMITS
    )) {
      const value = cleanString(body[field]);

      if (value.length > maxLength) {
        return res.status(400).json({
          success: false,
          message: `${field} must be at most ${maxLength} characters.`,
        });
      }

      optional[field] = value;
    }

    let quantity = null;

    if (
      body.quantity !== undefined &&
      body.quantity !== null &&
      body.quantity !== ''
    ) {
      quantity = Number(body.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Quantity must be a whole number greater than zero.',
        });
      }
    }

    // Unknown values are ignored rather than rejected
    const language = QUOTE_LANGUAGES.includes(body.language)
      ? body.language
      : '';

    const quoteRequest =
      await QuoteRequest.create({
        company,
        name,
        email,
        ...optional,
        quantity,
        message,
        language,
      });

    // Email the sales team; a mail failure must not fail the request
    sendQuoteNotification(quoteRequest).catch((error) => {
      console.error('Quote notification email error:', error);
    });

    return res.status(201).json({
      success: true,

      message:
        'Quote request received successfully.',

      requestId: quoteRequest._id,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message:
          'Please check the submitted information.',
      });
    }

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
      search,
    } = req.query;

    const filter = {};

    if (typeof status === 'string' && status) {
      if (!QUOTE_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status.',
        });
      }

      filter.status = status;
    }

    const searchTerm = cleanString(search).slice(0, 100);

    if (searchTerm) {
      const pattern = new RegExp(
        escapeRegex(searchTerm),
        'i'
      );

      filter.$or = [
        'company',
        'name',
        'email',
        'product',
        'country',
      ].map((field) => ({
        [field]: pattern,
      }));
    }

    const currentPage = parsePositiveInt(
      req.query.page,
      1
    );

    const pageLimit = Math.min(
      parsePositiveInt(req.query.limit, 20),
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
        pages: Math.max(
          Math.ceil(total / pageLimit),
          1
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
    if (!isValidId(req.params.id)) {
      return notFound(res);
    }

    const quote =
      await QuoteRequest.findById(
        req.params.id
      );

    if (!quote) {
      return notFound(res);
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
    console.error(
      'Get quote error:',
      error
    );

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
    } = req.body || {};

    if (
      !QUOTE_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status.',
      });
    }

    if (!isValidId(req.params.id)) {
      return notFound(res);
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
      return notFound(res);
    }

    return res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error(
      'Update quote status error:',
      error
    );

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
    const [
      results,
      unread,
      total,
    ] = await Promise.all([
      QuoteRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      QuoteRequest.countDocuments({
        isRead: false,
      }),

      QuoteRequest.countDocuments(),
    ]);

    const stats = {
      total,
      unread,
    };

    QUOTE_STATUSES.forEach((status) => {
      stats[status] = 0;
    });

    results.forEach((item) => {
      if (QUOTE_STATUSES.includes(item._id)) {
        stats[item._id] = item.count;
      }
    });

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error(
      'Get quote stats error:',
      error
    );

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
    console.error(
      'Unread count error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unread count could not be loaded.',
    });
  }
}
