import rateLimit from 'express-rate-limit';

function limitMessage(message) {
  return {
    success: false,
    message,
  };
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: limitMessage(
    'Too many login attempts. Please try again later.'
  ),
});

export const quoteSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage(
    'Too many requests. Please try again later or contact us by email.'
  ),
});
