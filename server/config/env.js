/*
  Start-up check of the environment. Errors stop the API (it would not work
  safely), warnings are printed. `npm run check-env` prints the same report
  without starting anything.
*/

const isProduction = () => process.env.NODE_ENV === 'production';

const origins = () => (process.env.CLIENT_URL || '').split(',').map((item) => item.trim()).filter(Boolean);

export function publishMode() {
  const mode = (process.env.PUBLISH_MODE || '').toLowerCase();
  if (mode === 'github' || mode === 'local' || mode === 'off') return mode;
  // Production on shared hosting never builds on the server
  return isProduction() ? 'github' : 'local';
}

export function checkEnvironment() {
  const errors = [];
  const warnings = [];
  const env = process.env;

  ['MONGODB_URI', 'JWT_SECRET'].forEach((key) => {
    if (!env[key]) errors.push(`${key} is not set.`);
  });

  if (isProduction()) {
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production.');
    }

    if (/change-me/i.test(env.JWT_SECRET || '')) {
      errors.push('JWT_SECRET still has the example value.');
    }

    if (!origins().length) {
      errors.push('CLIENT_URL is not set (site address used for CORS and e-mail links).');
    } else {
      if (origins().some((origin) => /localhost|127\.0\.0\.1/.test(origin))) {
        warnings.push('CLIENT_URL contains a localhost address.');
      }
      if (!origins()[0].startsWith('https://')) {
        warnings.push(`The first CLIENT_URL (${origins()[0]}) is used in e-mail links and should start with https://.`);
      }
    }

    if (env.MONGODB_URI && /127\.0\.0\.1|localhost/.test(env.MONGODB_URI)) {
      warnings.push('MONGODB_URI points at a local database.');
    }

    if (!env.TRUST_PROXY) {
      warnings.push('TRUST_PROXY is not set; behind LiteSpeed/Passenger set TRUST_PROXY=1 so rate limits see real client IPs.');
    }

    if (!env.CONTENT_API_TOKEN) {
      errors.push('CONTENT_API_TOKEN is not set (the site build reads the content snapshot with it).');
    }

    if (publishMode() === 'github') {
      ['PUBLISH_GITHUB_TOKEN', 'PUBLISH_GITHUB_REPOSITORY', 'PUBLISH_CALLBACK_TOKEN'].forEach((key) => {
        if (!env[key]) warnings.push(`${key} is not set; the admin "Yayınla" button cannot start a build.`);
      });
    }

    if (!env.UPLOAD_DIR) {
      warnings.push('UPLOAD_DIR is not set; uploads go to server/uploads inside the application folder.');
    }

    if (!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)) {
      warnings.push('SMTP is not configured; quote, password reset and invitation e-mails are not sent.');
    }
  }

  ['CONTENT_API_TOKEN', 'PUBLISH_CALLBACK_TOKEN'].forEach((key) => {
    if (env[key] && env[key].length < 24) errors.push(`${key} must be at least 24 characters.`);
  });

  return { errors, warnings };
}
