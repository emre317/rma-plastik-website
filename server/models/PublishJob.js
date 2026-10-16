import mongoose from 'mongoose';

/*
  One "Yayınla" run of the public site. Kept in the database so the admin
  panel shows the state after a server restart, and so a build and the
  deployment that follows it are tracked separately.

  status: queued -> building -> deploying -> success
                         \-> failed (build or deployment)
*/
export const ACTIVE_STATUSES = ['queued', 'building', 'deploying'];

const stepSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['pending', 'running', 'success', 'failed', 'skipped'], default: 'pending' },
    at: { type: Date, default: null },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    stage: { type: String, maxlength: 40 },
    message: { type: String, maxlength: 300 },
  },
  { _id: false }
);

const publishJobSchema = new mongoose.Schema(
  {
    publishId: { type: String, required: true, unique: true, maxlength: 60 },
    mode: { type: String, enum: ['github', 'local'], required: true },
    trigger: { type: String, enum: ['admin', 'push', 'manual'], default: 'admin' },
    status: { type: String, enum: [...ACTIVE_STATUSES, 'success', 'failed'], default: 'queued', index: true },
    requestedBy: {
      id: { type: String, default: '' },
      name: { type: String, default: '', maxlength: 120 },
      email: { type: String, default: '', maxlength: 254 },
    },
    requestedAt: { type: Date, default: Date.now },
    // When the build read the content snapshot: content saved after it is not part of this release
    snapshotAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    build: { type: stepSchema, default: () => ({}) },
    deploy: { type: stepSchema, default: () => ({}) },
    runId: { type: String, default: '' },
    runUrl: { type: String, default: '', maxlength: 300 },
    commit: { type: String, default: '', maxlength: 60 },
    lastPolledAt: { type: Date, default: null },
    error: { type: String, default: '', maxlength: 500 },
    log: { type: String, default: '', maxlength: 8000 },
    events: { type: [eventSchema], default: [] },
  },
  // Stage reports and status checks may save the same job at once: last write wins
  { timestamps: true, versionKey: false }
);

publishJobSchema.index({ requestedAt: -1 });

export default mongoose.model('PublishJob', publishJobSchema);
