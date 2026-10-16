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

const STEP_LABELS = {
  pending: 'Bekliyor',
  running: 'Sürüyor',
  success: 'Tamam',
  failed: 'Hata',
  skipped: 'Yapılmadı',
};

const RUNNING_LABELS = {
  queued: 'Sırada…',
  building: 'Site derleniyor…',
  deploying: 'Sunucuya yükleniyor…',
};

/*
  Shows whether saved content is live and publishes it on demand (the build
  runs on GitHub Actions in production). The state comes from the server, so
  it survives a page reload or a server restart. Polls while a publish runs.
*/
export default function PublishPanel() {
  const call = useAdminApi();

  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await call(getPublishStatus);
      setState(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [call]);

  const running = state?.status === 'running';

  useEffect(() => {
    refresh();

    // Content pages save in the background; re-check now and then
    const timer = setInterval(refresh, running ? 5000 : 30000);

    return () => clearInterval(timer);
  }, [refresh, running]);

  async function publish() {
    try {
      setError('');
      setStarting(true);
      await call(startPublish);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
      refresh();
    }
  }

  const job = state?.job;
  const pending =
    state?.contentChangedAt &&
    (!state.publishedAt || new Date(state.contentChangedAt) > new Date(state.publishedAt));
  const failed = job?.status === 'failed';
  const lastEvent = job?.events?.[job.events.length - 1];

  return (
    <div className={`publishPanel ${pending ? 'pending' : ''} ${running ? 'running' : ''} ${failed ? 'failed' : ''}`}>
      <span className="publishPanelLabel">
        <i className="publishDot" aria-hidden="true" />
        {running
          ? RUNNING_LABELS[job?.status] || 'Site güncelleniyor…'
          : pending
            ? 'Yayınlanmamış değişiklikler var'
            : 'Site Güncel'}
      </span>

      <small>Son yayın: {formatTime(state?.publishedAt)}</small>

      {running && (
        <small className="publishPanelSteps" aria-live="polite">
          Derleme: {STEP_LABELS[job.build]} · Yükleme: {STEP_LABELS[job.deploy]}
          {lastEvent?.message ? <><br />{lastEvent.message}</> : null}
        </small>
      )}

      {pending && !running && <small className="publishPanelHint">Kaydettiğiniz değişiklikler yayınlanınca sitede görünür.</small>}

      {failed && (
        <>
          <small className="publishPanelError">
            {job.build === 'success'
              ? 'Site derlendi ama sunucuya yüklenemedi; eski site yayında.'
              : 'Son yayın başarısız oldu; eski site yayında.'}
            {/* The reason, unless it only repeats the sentence above */}
            {job.error && !/eski site yayında/i.test(job.error) ? ` ${job.error}` : ''}
          </small>

          {(job.log || job.events?.length > 0 || job.runUrl) && (
            <details className="publishPanelLog">
              <summary>Ayrıntıları Göster</summary>
              {job.events?.length > 0 && (
                <ol className="publishPanelEvents">
                  {job.events.slice(-8).map((event, index) => (
                    <li key={`${event.at}-${index}`}><time>{formatTime(event.at)}</time> {event.message}</li>
                  ))}
                </ol>
              )}
              {job.log && <pre>{job.log.slice(-2500)}</pre>}
              {job.runUrl && (
                <a href={job.runUrl} target="_blank" rel="noopener noreferrer">GitHub Actions kaydını aç</a>
              )}
            </details>
          )}
        </>
      )}

      {error && <small className="publishPanelError">{error}</small>}

      {state?.mode === 'off' ? (
        <small className="publishPanelHint">Yayınlama bu sunucuda kapalı.</small>
      ) : (
        <button type="button" onClick={publish} disabled={running || starting} title={pending ? undefined : 'Siteyi yeniden yayınla'}>
          {running || starting ? 'Yayınlanıyor…' : pending ? 'Değişiklikleri Yayınla' : 'Yayınla'}
        </button>
      )}

      {running && job?.runUrl && (
        <a className="publishPanelRun" href={job.runUrl} target="_blank" rel="noopener noreferrer">İlerlemeyi GitHub'da gör</a>
      )}
    </div>
  );
}
