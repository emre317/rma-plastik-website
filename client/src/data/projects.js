import content from '@content';

import builtInProjects from './projects.builtin';

/*
  Custom molding reference projects. Projects managed in the admin panel come
  from the published content snapshot; otherwise the brochure list is used.
  Project: { image, i18n: { tr|en|ar: { client, title } } }
*/
const projects = Array.isArray(content.projects) && content.projects.length ? content.projects : builtInProjects;

/* Text in the site language, Turkish when that language is empty */
export function projectText(project, field, lang) {
  return project.i18n?.[lang]?.[field] || project.i18n?.tr?.[field] || '';
}

export default projects;
