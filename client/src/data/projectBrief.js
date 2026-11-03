/*
  Choices of the custom project brief (/custom-molding/project).
  Keys are stored with the quote request; site texts are in project.* of the
  locale files, the Turkish labels below are for the sales team (admin panel,
  e-mail, Excel). No imports: the server reads this file too.
*/

export const PROJECT_TYPES = ['tank', 'housing', 'logistics', 'floating', 'outdoor', 'vehicle', 'other'];

export const PROJECT_STAGES = ['new', 'existing', 'convert'];

export const PROJECT_MATERIALS = ['lldpe', 'hdpe', 'advice'];

export const PROJECT_COLOURS = ['standard', 'custom', 'any'];

export const PROJECT_CONDITIONS = ['outdoor', 'food', 'chemical', 'heat', 'impact', 'sealed', 'buoyancy'];

export const PROJECT_FEATURES = ['inserts', 'outlets', 'logo', 'lid', 'assembly'];

export const PROJECT_VOLUMES = ['1-50', '50-250', '250-1000', '1000-5000', '5000+', 'unknown'];

export const PROJECT_TIMELINES = ['asap', '1-3m', '3-6m', '6m+', 'research'];

// Files: drawings, 3D models, photos (checked by extension and content on the server)
export const PROJECT_FILE_TYPES = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'step', 'stp', 'iges', 'igs', 'stl', 'dxf', 'dwg', 'zip'];
export const PROJECT_MAX_FILES = 5;
export const PROJECT_MAX_FILE_MB = 10;

export const PROJECT_LABELS = {
  type: {
    tank: 'Tank / hazne',
    housing: 'Makine gövdesi / muhafaza',
    logistics: 'Taşıma ve lojistik ekipmanı',
    floating: 'Yüzer ürün',
    outdoor: 'Kent mobilyası / peyzaj',
    vehicle: 'Araç / makine parçası',
    other: 'Diğer',
  },
  stage: {
    new: 'Yeni ürün geliştirme',
    existing: 'Mevcut ürünün üretimi / tedarikçi değişimi',
    convert: 'Başka malzemeden plastiğe geçiş',
  },
  material: {
    lldpe: 'LLDPE',
    hdpe: 'HDPE',
    advice: 'Öneri bekliyor',
  },
  colour: {
    standard: 'Standart renk',
    custom: 'Özel renk',
    any: 'Fark etmez',
  },
  conditions: {
    outdoor: 'Dış ortam / UV',
    food: 'Gıda ile temas',
    chemical: 'Kimyasal ile temas',
    heat: 'Yüksek sıcaklık',
    impact: 'Darbe / yük dayanımı',
    sealed: 'Sızdırmazlık',
    buoyancy: 'Yüzerlik',
  },
  features: {
    inserts: 'Metal insert / dişli bağlantı',
    outlets: 'Vana / rakor çıkışı',
    logo: 'Logo / kabartma yazı',
    lid: 'Kapak / menteşe',
    assembly: 'Montaj / parça birleştirme',
  },
  volume: {
    '1-50': '1 – 50 adet/yıl',
    '50-250': '50 – 250 adet/yıl',
    '250-1000': '250 – 1.000 adet/yıl',
    '1000-5000': '1.000 – 5.000 adet/yıl',
    '5000+': '5.000+ adet/yıl',
    unknown: 'Henüz belli değil',
  },
  timeline: {
    asap: 'En kısa sürede',
    '1-3m': '1 – 3 ay',
    '3-6m': '3 – 6 ay',
    '6m+': '6 aydan sonra',
    research: 'Araştırma aşamasında',
  },
};

const label = (group, key) => PROJECT_LABELS[group]?.[key] || '';
const join = (group, keys) => (Array.isArray(keys) ? keys.map((key) => label(group, key)).filter(Boolean).join(', ') : '');

/* "1200 × 800 × 600 mm" from whatever sizes were given */
export function projectSize(project) {
  const sizes = [project?.length, project?.width, project?.height].filter((value) => Number(value) > 0);
  return sizes.length ? `${sizes.join(' × ')} mm` : '';
}

/*
  The brief as [label, value] rows in Turkish, for the admin panel,
  the sales e-mail and the Excel export. Empty answers are left out.
*/
export function projectRows(project) {
  if (!project) return [];

  return [
    ['Proje Adı', project.title],
    ['Ürün Tipi', label('type', project.type)],
    ['Proje Aşaması', label('stage', project.stage)],
    ['Ölçüler (U × G × Y)', projectSize(project)],
    ['Hacim', project.volume ? `${project.volume} L` : ''],
    ['Hedef Ağırlık', project.weight ? `${project.weight} kg` : ''],
    ['Et Kalınlığı', project.wall ? `${project.wall} mm` : ''],
    ['Malzeme', label('material', project.material)],
    ['Üretim Yöntemi', project.method],
    ['Renk', [label('colour', project.colour), project.colourNote].filter(Boolean).join(' – ')],
    ['Kullanım Koşulları', join('conditions', project.conditions)],
    ['Ek Özellikler', join('features', project.features)],
    ['Yıllık Adet', label('volume', project.annualVolume)],
    ['Prototip / Numune', project.needsPrototype ? 'İstiyor' : ''],
    ['Hedef Takvim', label('timeline', project.timeline)],
    ['Gizlilik Sözleşmesi (NDA)', project.nda ? 'Talep ediyor' : ''],
  ].filter(([, value]) => value !== '' && value !== null && value !== undefined);
}
