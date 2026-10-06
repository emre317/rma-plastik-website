import { useCallback, useEffect, useState } from 'react';

import useAdminApi from '../../hooks/useAdminApi';
import { getPublishStatus, startPublish } from '../../services/adminContentApi';

function formatTime(value) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/*
  Shows whether saved content is live and rebuilds the public site on demand.
  Polls while a build is running.
*/
export default function PublishPanel() {
  const call = useAdminApi();

  const [state, setState] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { data } = await call(getPublishStatus);
      setState(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [call]);

  useEffect(() => {
    refresh();

    // Content pages save in the background; re-check now and then
    const timer = setInterval(refresh, state?.status === 'running' ? 2500 : 20000);

    return () => clearInterval(timer);
  }, [refresh, state?.status]);

  async function publish() {
    try {
      setError('');
      await call(startPublish);
      setState((current) => ({ ...current, status: 'running' }));
    } catch (err) {
      setError(err.message);
    }
  }

  const running = state?.status === 'running';
  const pending =
    state?.contentChangedAt &&
    (!state.publishedAt || new Date(state.contentChangedAt) > new Date(state.publishedAt));

  return (
    <div className={`publishPanel ${pending ? 'pending' : ''}`}>
      <span className="publishPanelLabel">
        {running
          ? 'Site güncelleniyor…'
          : pending
            ? 'Yayınlanmamış değişiklikler var'
            : 'Site güncel'}
      </span>

      <small>Son yayın: {formatTime(state?.publishedAt)}</small>

      {state?.status === 'failed' && (
        <small className="publishPanelError">Son yayın başarısız oldu. Sunucu kaydına bakın.</small>
      )}

      {error && <small className="publishPanelError">{error}</small>}

      <button type="button" onClick={publish} disabled={running}>
        {running ? 'Yayınlanıyor…' : 'Yayınla'}
      </button>
    </div>
  );
}
