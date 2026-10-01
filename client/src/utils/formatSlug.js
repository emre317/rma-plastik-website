/* "rotational-moulding" -> "Rotational Moulding" */
export default function formatSlug(slug = '') {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
