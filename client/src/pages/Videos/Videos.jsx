import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import Arrow from '../../components/i18n/Arrow';
import { YoutubeIcon } from '../../components/icons/SocialIcons';
import YouTubeEmbed, { youtubeThumbnail, youtubeThumbnailPublic } from '../../components/content/YouTubeEmbed';
import company from '../../data/company';
import { groupById } from '../../data/productPortfolio';
import videos, { videoText } from '../../data/videos';

const ALL = '';

/*
  Videos page: a large player with the chosen video's title and text, the
  playlist beside it (filtered by product group when videos are linked to
  groups in the panel) and the YouTube channel band.
*/
export default function Videos() {
  const { t } = useTranslation();
  const { lang } = useParams();
  const stageRef = useRef(null);

  const [filter, setFilter] = useState(ALL);
  const [currentId, setCurrentId] = useState(videos[0]?.youtubeId || '');
  // The player starts by itself only after the visitor picked a video
  const [picked, setPicked] = useState(false);

  // Product groups used by the videos, in the order they first appear
  const groups = useMemo(() => {
    const ids = [...new Set(videos.flatMap((video) => (Array.isArray(video.groups) ? video.groups : [])))];
    return ids.filter((id) => groupById(id));
  }, []);

  const groupLabel = (id) => t(`productExplorer.items.${id}.label`, { defaultValue: '' }) || id;
  const list = filter ? videos.filter((video) => video.groups?.includes(filter)) : videos;
  const current = videos.find((video) => video.youtubeId === currentId) || videos[0];

  const title = (video) => videoText(video, lang, 'title');
  const description = (video) => videoText(video, lang, 'description');
  const date = (video) =>
    video.uploadDate ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : lang, { dateStyle: 'medium' }).format(new Date(video.uploadDate)) : '';

  function choose(video) {
    setCurrentId(video.youtubeId);
    setPicked(true);
    // Phones: the player is above the list
    if (stageRef.current && stageRef.current.getBoundingClientRect().top < 0) {
      stageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // VideoObject needs an upload date; videos without one are still listed
  const videoLd = videos
    .filter((video) => video.uploadDate)
    .map((video) => ({
      '@type': 'VideoObject',
      name: title(video),
      description: description(video) || title(video),
      thumbnailUrl: youtubeThumbnailPublic(video.youtubeId),
      uploadDate: new Date(video.uploadDate).toISOString(),
      embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeId}`,
      contentUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    }));

  return (
    <main className="internalPage videosPage">
      <Seo
        title={t('meta.titles.videos')}
        description={t('meta.descriptions.videos')}
        breadcrumbs={[{ name: t('meta.titles.videos'), path: '/videos' }]}
        jsonLd={videoLd}
      />

      <PageHeader
        compact
        crumbs={[{ label: t('meta.titles.videos') }]}
        eyebrow={t('videos.eyebrow')}
        title={t('videos.title')}
        accent={t('videos.titleAccent')}
        lead={t('videos.text')}
        actions={(
          <a href={company.social.youtube} className="button ghost" target="_blank" rel="noreferrer">
            <span>{t('videos.channel')}</span>
            <YoutubeIcon aria-hidden="true" className="buttonIcon" />
          </a>
        )}
      />

      <section className="videosSection">
        <div className="container">
          {!current ? (
            <div className="blogEmpty">
              <p>{t('videos.empty')}</p>
            </div>
          ) : (
            <>
              {groups.length > 0 && (
                <div className="vdFilters" role="group" aria-label={t('videos.playlist')}>
                  {[ALL, ...groups].map((id) => (
                    <button
                      key={id || 'all'}
                      type="button"
                      className={filter === id ? 'active' : ''}
                      aria-pressed={filter === id}
                      onClick={() => setFilter(id)}
                    >
                      {id ? groupLabel(id) : t('videos.filterAll')}
                    </button>
                  ))}
                </div>
              )}

              <div className={`vdLayout ${videos.length > 1 ? '' : 'single'}`}>
                <article className="vdFeatured" ref={stageRef}>
                  <YouTubeEmbed key={current.youtubeId} id={current.youtubeId} title={title(current)} autoPlay={picked} className="vdPlayer" />

                  <div className="vdInfo">
                    {(current.groups?.length > 0 || date(current)) && (
                      <div className="vdMeta">
                        {current.groups?.filter((id) => groupById(id)).map((id) => <span key={id} className="vdTag">{groupLabel(id)}</span>)}
                        {date(current) && <time dateTime={new Date(current.uploadDate).toISOString()}>{date(current)}</time>}
                      </div>
                    )}
                    <h2>{title(current)}</h2>
                    {description(current) && <p>{description(current)}</p>}
                  </div>
                </article>

                {videos.length > 1 && (
                  <aside className="vdPlaylist" aria-label={t('videos.playlist')}>
                    <div className="vdPlaylistHead">
                      <strong>{t('videos.playlist')}</strong>
                      <span>{t('videos.count', { count: list.length })}</span>
                    </div>

                    <ol>
                      {list.map((video) => {
                        const active = video.youtubeId === current.youtubeId;
                        return (
                          <li key={video.youtubeId}>
                            <button type="button" className={active ? 'active' : ''} aria-current={active ? 'true' : undefined} onClick={() => choose(video)}>
                              <span className="vdThumb">
                                <img src={youtubeThumbnail(video.youtubeId, 'mqdefault')} alt="" loading="lazy" decoding="async" />
                                <PlayCircle aria-hidden="true" />
                              </span>
                              <span className="vdItemText">
                                {active && <small>{t('videos.nowPlaying')}</small>}
                                <strong>{title(video)}</strong>
                                {date(video) && <small className="vdItemDate">{date(video)}</small>}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </aside>
                )}
              </div>
            </>
          )}

          <div className="vdChannel">
            <span className="vdChannelIcon" aria-hidden="true"><YoutubeIcon /></span>
            <div>
              <strong>{t('videos.channel')}</strong>
              <p>{t('videos.channelText')}</p>
            </div>
            <a href={company.social.youtube} className="button primary" target="_blank" rel="noreferrer">
              <span>{t('videos.subscribe')}</span>
              <Arrow className="buttonArrow" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
