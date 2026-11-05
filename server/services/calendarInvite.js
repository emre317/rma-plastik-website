/*
  iCalendar (RFC 5545) invitation for a meeting, attached to the e-mails so
  Outlook, Gmail, Apple Mail and Teams put it in the calendar (with "Accept"
  buttons). The same UID with a higher SEQUENCE updates the entry; METHOD
  CANCEL removes it. Times are written in UTC, every calendar shows them in
  its own time zone.
*/

const CRLF = '\r\n';

const stamp = (value) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Parameter values (CN="…") cannot hold quotes or line breaks
const param = (value) => String(value ?? '').replace(/["\r\n]/g, '').slice(0, 120);

/* Lines longer than 75 octets continue on the next line after a space (UTF-8 safe) */
export function foldLine(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;

  const parts = [];
  let current = '';
  let size = 0;
  let limit = 75;

  for (const char of line) {
    const length = Buffer.byteLength(char, 'utf8');
    if (size + length > limit) {
      parts.push(current);
      current = '';
      size = 0;
      // Continuation lines start with a space, which counts
      limit = 74;
    }
    current += char;
    size += length;
  }
  parts.push(current);

  return parts.join(`${CRLF} `);
}

export const meetingUid = (id) => `meeting-${id}@rmaplastik.com`;

/*
  method: 'REQUEST' (new or changed) | 'CANCEL'
  organizer / attendees: { name, email }
*/
export function buildInvite({
  method = 'REQUEST',
  uid,
  sequence = 0,
  start,
  durationMinutes = 60,
  summary,
  description = '',
  location = '',
  url = '',
  organizer,
  attendees = [],
  now = new Date(),
}) {
  const end = new Date(new Date(start).getTime() + durationMinutes * 60000);
  const cancelled = method === 'CANCEL';

  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//RMA Plastik//Meeting Requests//TR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    `METHOD:${cancelled ? 'CANCEL' : 'REQUEST'}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    description ? `DESCRIPTION:${escapeText(description)}` : '',
    location ? `LOCATION:${escapeText(location)}` : '',
    url ? `URL:${url.replace(/[\r\n]/g, '')}` : '',
    `STATUS:${cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    organizer?.email ? `ORGANIZER;CN="${param(organizer.name)}":mailto:${organizer.email}` : '',
    ...attendees
      .filter((person) => person?.email)
      .map((person) => `ATTENDEE;CN="${param(person.name || person.email)}";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${person.email}`),
    ...(cancelled
      ? []
      : ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'TRIGGER:-PT30M', 'END:VALARM']),
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.map(foldLine).join(CRLF) + CRLF;
}
