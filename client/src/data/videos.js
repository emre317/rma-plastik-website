import content from '@content';

/* Published YouTube videos from the content snapshot */
const videos = Array.isArray(content.videos) ? content.videos : [];

/* Title/description in the active language, falling back to Turkish */
export const videoText = (video, lang, field) => video.i18n?.[lang]?.[field] || video.i18n?.tr?.[field] || '';

export default videos;
