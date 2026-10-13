import mongoose from 'mongoose';

/*
  Activity log of the admin panel (İşlem Geçmişi): who did what, when.
  Written by services/audit.js; entries are removed after two years.
*/
const auditLogSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },

    // Copy of the user at that moment (the account may be renamed or deleted later)
    user: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      role: { type: String, default: '' },
    },

    // sales | content | users | settings | auth
    area: { type: String, default: '' },

    action: { type: String, required: true, maxlength: 120 },

    // quote, lead, family, post, project, gallery, faq, market, video, texts, settings, user, site, session
    targetType: { type: String, default: '' },
    targetId: { type: String, default: '' },
    targetLabel: { type: String, default: '', maxlength: 200 },

    details: { type: String, default: '', maxlength: 500 },

    ip: { type: String, default: '' },
  },
  { versionKey: false }
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ 'user.id': 1, at: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, at: -1 });
auditLogSchema.index({ at: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 3600 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
