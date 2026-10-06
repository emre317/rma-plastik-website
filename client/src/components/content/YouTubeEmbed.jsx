import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { track } from '../../analytics/track';

export const youtubeThumbnail = (id, size = 'hqdefault') => `https://i.ytimg.com/vi/${id}/${size}.jpg`;

/*
  Lightweight YouTube player: only a thumbnail is loaded with the page;
  the real player (youtube-nocookie.com) is created when the visitor clicks.
  Keeps pages fast and avoids YouTube cookies until a video is played.
*/
export default function YouTubeEmbed({ id, title, className = '' }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);

  if (!id) {
    return null;
  }

  function play() {
    setPlaying(true);
    track('video_play', { video_id: id, video_title: title || id });
  }

  return (
    <div className={`youtubeEmbed ${className}`}>
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title || 'YouTube'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={play} aria-label={`${t('videos.play')}: ${title || ''}`}>
          <img src={youtubeThumbnail(id)} alt="" loading="lazy" decoding="async" />
          <span className="youtubeEmbedPlay" aria-hidden="true">
            <svg viewBox="0 0 68 48"><path d="M66.5 7.7a8.6 8.6 0 0 0-6-6C55.2.3 34 .3 34 .3s-21.2 0-26.5 1.4a8.6 8.6 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.6 8.6 0 0 0 6 6C12.8 47.7 34 47.7 34 47.7s21.2 0 26.5-1.4a8.6 8.6 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3Z" fill="currentColor"/><path d="m27 34 18-10-18-10z" fill="#fff"/></svg>
          </span>
        </button>
      )}
    </div>
  );
}
