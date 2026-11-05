import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, CalendarClock, Video } from 'lucide-react';

import { getMeetingSummary } from '../../services/adminApi';
import { MEETINGS_CHANGED_EVENT, getAdminToken } from '../../services/adminAuth';
import { useAdminSession } from './AdminSession';
import { meetingShort, minutesUntil } from './meetingStatus';

const POLL_MS = 60 * 1000;
const SHOWN = 3;

/*
  Strip at the top of every panel page (sales and admin roles): the next
  confirmed meetings ("Bugün 14:00 · Akdeniz Gıda · Online") and how many
  requests wait for a decision. Hidden when there is nothing to show.
  A meeting starting within the hour pulses; an online one gets "Katıl".
*/
export default function MeetingBar() {
  const { can } = useAdminSession();
  const sales = can('sales');
  const { pathname } = useLocation();
  const [summary, setSummary] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!sales) return undefined;
    let cancelled = false;

    async function load() {
      const token = getAdminToken();
      if (!token) return;
      try {
        const response = await getMeetingSummary(token);
        if (!cancelled) setSummary(response.data || null);
      } catch {
        // The strip is a bonus: errors are not shown here
      }
    }

    load();
    const timer = setInterval(() => {
      load();
      setTick((value) => value + 1);
    }, POLL_MS);
    window.addEventListener(MEETINGS_CHANGED_EVENT, load);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener(MEETINGS_CHANGED_EVENT, load);
    };
  }, [sales, pathname]);

  if (!sales || !summary) return null;

  // Meetings that have not ended yet
  const upcoming = (summary.upcoming || []).filter((meeting) => minutesUntil(meeting.startAt) + (meeting.durationMinutes || 60) > 0);
  if (!upcoming.length && !summary.pending) return null;

  return (
    <div className="mtBar" role="region" aria-label="Toplantılar">
      {upcoming.slice(0, SHOWN).map((meeting) => {
        const minutes = minutesUntil(meeting.startAt);
        const live = minutes <= 0;
        const soon = minutes <= 60;
        const online = meeting.type === 'online';
        const Icon = online ? Video : Building2;

        return (
          <Link key={meeting._id} to={`/admin/meetings/${meeting._id}`} className={`mtBarItem ${soon ? 'soon' : ''}`} title={online ? 'Online toplantı' : 'Yüz yüze görüşme'}>
            <span className="mtBarIcon" aria-hidden="true"><Icon /></span>
            <span>
              <strong>{live ? 'Şu an' : soon ? `${minutes} dk sonra` : meetingShort(meeting.startAt)}</strong>
              {' · '}
              {meeting.company}
              {' '}
              <small>{online ? 'Online' : 'Yüz yüze'}{(meeting.staff || []).length ? ` · ${meeting.staff.map((person) => person.name.split(' ')[0]).join(', ')}` : ''}</small>
            </span>
            {online && meeting.joinUrl && minutes <= 15 && (
              <span
                role="link"
                tabIndex={0}
                className="mtBarJoin"
                onClick={(event) => { event.preventDefault(); window.open(meeting.joinUrl, '_blank', 'noopener'); }}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); window.open(meeting.joinUrl, '_blank', 'noopener'); } }}
              >
                Katıl
              </span>
            )}
          </Link>
        );
      })}

      {upcoming.length > SHOWN && (
        <Link to="/admin/meetings?view=upcoming" className="mtBarMore">+{upcoming.length - SHOWN} toplantı daha</Link>
      )}

      {summary.pending > 0 && (
        <Link to="/admin/meetings?view=pending" className="mtBarItem pending">
          <span className="mtBarIcon" aria-hidden="true"><CalendarClock /></span>
          <span><strong>{summary.pending}</strong> toplantı talebi onay bekliyor</span>
        </Link>
      )}
    </div>
  );
}
