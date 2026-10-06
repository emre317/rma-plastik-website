import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import Arrow from '../../components/i18n/Arrow';
import { YoutubeIcon } from '../../components/icons/SocialIcons';
import YouTubeEmbed, { youtubeThumbnail } from '../../components/content/YouTubeEmbed';
import company from '../../data/company';
import videos, { videoText } from '../../data/videos';

export default function Videos() {
  const { t } = useTranslation();
  const { lang } = useParams();

  // VideoObject needs an upload date; videos without one are still listed
  const videoLd = videos
    .filter((video) => video.uploadDate)
    .map((video) => ({
      '@type': 'VideoObject',
      name: videoText(video, lang, 'title'),
      description: videoText(video, lang, 'description') || videoText(video, lang, 'title'),
      thumbnailUrl: youtubeThumbnail(video.youtubeId),
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
          {videos.length === 0 ? (
            <div className="blogEmpty">
              <p>{t('videos.empty')}</p>
            </div>
          ) : (
            <div className="videosGrid">
              {videos.map((video) => (
                <article key={video.youtubeId} className="videoCard">
                  <YouTubeEmbed id={video.youtubeId} title={videoText(video, lang, 'title')} />
                  <div className="videoCardBody">
                    <h2>{videoText(video, lang, 'title')}</h2>
                    {videoText(video, lang, 'description') && <p>{videoText(video, lang, 'description')}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}

          <a className="videosChannel" href={company.social.youtube} target="_blank" rel="noreferrer">
            <YoutubeIcon aria-hidden="true" />
            <span>
              <strong>{t('videos.channel')}</strong>
              <small>{company.handles.youtube}</small>
            </span>
            <Arrow />
          </a>
        </div>
      </section>
    </main>
  );
}
