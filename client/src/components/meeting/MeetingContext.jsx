import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { track } from '../../analytics/track';

const MeetingContext = createContext({ open: false, type: '', openMeeting: () => {}, closeMeeting: () => {} });

/*
  "Toplantı Talep Et" dialog state.
    openMeeting()           opens the dialog at the first step
    openMeeting('online')   opens it with the meeting type already chosen
*/
export function MeetingProvider({ children }) {
  const [state, setState] = useState({ open: false, type: '', key: 0 });

  const openMeeting = useCallback((type = '') => {
    setState((current) => ({ open: true, type: typeof type === 'string' ? type : '', key: current.key + 1 }));
    track('meeting_form_open', { meeting_type: typeof type === 'string' && type ? type : '(none)' });
  }, []);

  const closeMeeting = useCallback(() => setState((current) => ({ ...current, open: false })), []);

  const value = useMemo(() => ({ ...state, openMeeting, closeMeeting }), [state, openMeeting, closeMeeting]);

  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
}

export const useMeeting = () => useContext(MeetingContext);
