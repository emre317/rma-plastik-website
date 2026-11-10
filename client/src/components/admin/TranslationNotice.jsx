import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Languages, X } from 'lucide-react';

import { TRANSLATION_EVENT, request } from '../../services/http';
import { getAdminToken } from '../../services/adminAuth';

const POLL_MS = 4000;
const GIVE_UP_MS = 15 * 60 * 1000;

/*
  After a save, the server translates the Turkish texts into English and
  Arabic in the background (server/services/autoTranslate.js). This corner
  message follows that run: "hazırlanıyor" -> "eklendi" (or the reason it
  could not be done).
*/
export default function TranslationNotice() {
  const [jobs, setJobs] = useState([]);
  const timers = useRef({});

  useEffect(() => {
    function poll(jobId, started) {
      const token = getAdminToken();
      request(`/admin/translations/${encodeURIComponent(jobId)}`, { token })
        .then((response) => {
          const data = response.data || {};
          if (data.status === 'running' && Date.now() - started < GIVE_UP_MS) {
            timers.current[jobId] = setTimeout(() => poll(jobId, started), POLL_MS);
            return;
          }
          setJobs((list) => list.map((job) => (job.jobId === jobId ? { ...job, ...data, status: data.status === 'running' ? 'slow' : data.status } : job)));
          if (data.status === 'done') timers.current[jobId] = setTimeout(() => dismiss(jobId), 12000);
        })
        .catch(() => {
          // Not recorded yet (the first poll can be early) or offline: try a few more times
          if (Date.now() - started < 60000) timers.current[jobId] = setTimeout(() => poll(jobId, started), POLL_MS);
          else setJobs((list) => list.map((job) => (job.jobId === jobId ? { ...job, status: 'slow' } : job)));
        });
    }

    function onStart(event) {
      const { jobId, fields } = event.detail || {};
      if (!jobId) return;
      setJobs((list) => [{ jobId, fields, status: 'running' }, ...list.filter((job) => job.jobId !== jobId)].slice(0, 3));
      timers.current[jobId] = setTimeout(() => poll(jobId, Date.now()), 2500);
    }

    window.addEventListener(TRANSLATION_EVENT, onStart);
    const pending = timers.current;
    return () => {
      window.removeEventListener(TRANSLATION_EVENT, onStart);
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  function dismiss(jobId) {
    clearTimeout(timers.current[jobId]);
    setJobs((list) => list.filter((job) => job.jobId !== jobId));
  }

  if (!jobs.length) return null;

  return (
    <div className="trNotices" role="status" aria-live="polite">
      {jobs.map((job) => (
        <div key={job.jobId} className={`trNotice ${job.status}`}>
          <span className="trNoticeIcon" aria-hidden="true">
            {job.status === 'done' ? <CheckCircle2 /> : job.status === 'failed' ? <AlertTriangle /> : <Languages />}
          </span>
          <span className="trNoticeText">
            {job.status === 'running' && (
              <>
                <strong>İngilizce ve Arapça çeviri hazırlanıyor…</strong>
                <small>{job.fields} alan · sayfadan ayrılabilirsiniz, çeviri arka planda eklenir.</small>
              </>
            )}
            {job.status === 'done' && (
              <>
                <strong>Çeviriler eklendi</strong>
                <small>Sitede görünmesi için “Yayınla”ya basın. Açık sayfayı yenileyince EN / AR alanlarında görünür.</small>
              </>
            )}
            {job.status === 'failed' && (
              <>
                <strong>Otomatik çeviri yapılamadı</strong>
                <small>{job.error || 'Bilinmeyen hata.'} İçerik Türkçe olarak kaydedildi; tekrar kaydederek deneyebilir ya da EN / AR alanlarını elle doldurabilirsiniz.</small>
              </>
            )}
            {job.status === 'slow' && (
              <>
                <strong>Çeviri sürüyor</strong>
                <small>Bitince EN / AR alanlarına eklenecek; bir süre sonra sayfayı yenileyip kontrol edin.</small>
              </>
            )}
          </span>
          <button type="button" className="adIconButton" onClick={() => dismiss(job.jobId)} aria-label="Bildirimi kapat">
            <X aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
