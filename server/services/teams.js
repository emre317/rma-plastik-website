/*
  Microsoft Teams meetings through Microsoft Graph (optional).

  When MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET and
  TEAMS_ORGANIZER are set, confirming an online meeting creates a calendar
  event with a Teams link in the organizer's Microsoft 365 mailbox, with the
  customer, the guests and the RMA staff as attendees. Microsoft then sends
  the calendar invitations itself, so the meeting appears in everyone's
  calendar. Changing the time updates the same event; cancelling cancels it.

  Azure app registration (Entra ID): application permission
  Calendars.ReadWrite (admin consent). Limit it to the organizer mailbox with
  an Exchange application access policy / RBAC for applications.
  Without these settings the panel asks for a Teams link to be pasted in.
*/

const GRAPH = 'https://graph.microsoft.com/v1.0';

let cachedToken = null;

export function isTeamsConfigured() {
  return Boolean(
    process.env.MS_GRAPH_TENANT_ID &&
    process.env.MS_GRAPH_CLIENT_ID &&
    process.env.MS_GRAPH_CLIENT_SECRET &&
    process.env.TEAMS_ORGANIZER
  );
}

export const teamsOrganizer = () => String(process.env.TEAMS_ORGANIZER || '').trim().toLowerCase();

async function accessToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 60000) return cachedToken.value;

  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(process.env.MS_GRAPH_TENANT_ID)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MS_GRAPH_CLIENT_ID,
      client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(`Microsoft oturumu açılamadı (${data.error || response.status}).`);
  }

  cachedToken = { value: data.access_token, expires: Date.now() + (Number(data.expires_in) || 3000) * 1000 };
  return cachedToken.value;
}

async function graph(path, { method = 'GET', body } = {}) {
  const token = await accessToken();
  const response = await fetch(`${GRAPH}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  if (response.status === 204 || response.status === 202) return {};

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Microsoft Teams: ${data.error?.message || `HTTP ${response.status}`}`.slice(0, 280));
  }
  return data;
}

// Graph wants "2026-11-10T11:00:00" with a time zone; UTC avoids Windows zone names
const utc = (date) => ({ dateTime: new Date(date).toISOString().slice(0, 19), timeZone: 'UTC' });

/*
  Creates (or, with eventId, updates) the Teams meeting.
  Returns { eventId, joinUrl, organizer }.
*/
export async function saveTeamsMeeting({ eventId = '', subject, bodyHtml, start, durationMinutes, attendees }) {
  const organizer = teamsOrganizer();
  const end = new Date(new Date(start).getTime() + durationMinutes * 60000);

  const event = {
    subject,
    body: { contentType: 'HTML', content: bodyHtml },
    start: utc(start),
    end: utc(end),
    attendees: attendees
      .filter((person) => person?.email && person.email.toLowerCase() !== organizer)
      .map((person) => ({ emailAddress: { address: person.email, name: person.name || person.email }, type: 'required' })),
    allowNewTimeProposals: false,
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
  };

  const path = `/users/${encodeURIComponent(organizer)}/events`;
  const saved = eventId
    ? await graph(`${path}/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: event })
    : await graph(path, { method: 'POST', body: event });

  // The link can take a moment to appear on a brand-new event
  let joinUrl = saved.onlineMeeting?.joinUrl || '';
  if (!joinUrl && saved.id) {
    const again = await graph(`${path}/${encodeURIComponent(saved.id)}?$select=onlineMeeting`);
    joinUrl = again.onlineMeeting?.joinUrl || '';
  }

  return { eventId: saved.id || eventId, joinUrl, organizer };
}

export async function cancelTeamsMeeting(eventId, comment = '') {
  if (!eventId) return;
  const organizer = teamsOrganizer();
  await graph(`/users/${encodeURIComponent(organizer)}/events/${encodeURIComponent(eventId)}/cancel`, {
    method: 'POST',
    body: { comment: String(comment).slice(0, 500) },
  });
}
