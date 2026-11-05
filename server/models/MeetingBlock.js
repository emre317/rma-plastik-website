import mongoose from 'mongoose';

/*
  Time closed for meeting requests, set in the panel (holiday, trade fair,
  plant maintenance…): the website shows those slots as taken.
*/
const meetingBlockSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    note: { type: String, trim: true, default: '', maxlength: 160 },
    createdBy: { type: String, trim: true, default: '', maxlength: 120 },
    // Removed by MongoDB a month after it ends
    expireAt: { type: Date, default: null },
  },
  { timestamps: true }
);

meetingBlockSchema.pre('validate', function setExpiry() {
  if (this.end) this.expireAt = new Date(new Date(this.end).getTime() + 30 * 86400000);
});

meetingBlockSchema.index({ end: 1, start: 1 });
meetingBlockSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('MeetingBlock', meetingBlockSchema);
