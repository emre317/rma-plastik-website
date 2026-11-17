import content from '@content';

/* Published YouTube videos from the content snapshot */
const videos = Array.isArray(content.videos) ? content.videos : [];

/* Title/description in the active language, falling back to Turkish */
export const videoText = (video, lang, field) => video.i18n?.[lang]?.[field] || video.i18n?.tr?.[field] || '';

/* Videos linked to a product group in the panel (shown on its model pages) */
export const videosForGroup = (groupId) =>
  groupId ? videos.filter((video) => Array.isArray(video.groups) && video.groups.includes(groupId)) : [];

export default videos;
