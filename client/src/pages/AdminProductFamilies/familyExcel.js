import tr from '../../i18n/locales/tr';
import { COLUMN_KEYS } from '../../data/productTables.builtin';

/*
  Excel export / import of the product tables (admin panel).
  One sheet "Modeller": Aile kimliği | Aile adı | Ürün kodu | Hacim (lt) | Çap (cm) | …
  Libraries are loaded only when the buttons are used.
*/

const FAMILY_ID = 'Aile Kimliği';
const FAMILY_TITLE = 'Aile adı (TR)';
const CODE = tr.productTables.columns.code;

const label = (key) => tr.productTables.columns[key] || key;

const normalise = (text) => String(text ?? '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');

// Header text -> field (accepts the Turkish labels and the internal keys)
const HEADER_FIELDS = new Map([
  [normalise(FAMILY_ID), 'familyId'],
  ['familyid', 'familyId'],
  [normalise(FAMILY_TITLE), 'familyTitle'],
  [normalise('Aile Adı'), 'familyTitle'],
  [normalise(CODE), 'code'],
  ['code', 'code'],
  ...COLUMN_KEYS.flatMap((key) => [[normalise(label(key)), key], [key.toLowerCase(), key]]),
]);

const cellValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  return String(value).trim();
};

export async function exportFamilies(families) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');

  const bold = (value) => ({ value, fontWeight: 'bold', backgroundColor: '#E2E7F2' });

  const header = [FAMILY_ID, FAMILY_TITLE, CODE, ...COLUMN_KEYS.map(label)].map(bold);

  const rows = families.flatMap((family) =>
    family.rows.map((row) => [
      family.familyId,
      family.i18n?.tr?.title || '',
      row.code,
      ...COLUMN_KEYS.map((key) => {
        const value = row.values?.[key];
        return value === undefined || value === '' ? null : value;
      }),
    ])
  );

  const help = [
    [bold('Ürün tabloları – Excel ile güncelleme')],
    ['1. "Modeller" sayfasındaki satırları düzenleyin, yeni satır ekleyin veya silin.'],
    ['2. Her satırda "Aile kimliği" ve "Ürün kodu" dolu olmalıdır. Aile kimliği paneldeki kimlikle aynı olmalıdır (ör. vertical-tanks).'],
    ['3. Yeni bir aile için yeni bir kimlik ve "Aile adı (TR)" yazın; içe aktarınca yeni aile oluşturulur.'],
    ['4. Bir ailenin tablosunda yalnızca en az bir modelde dolu olan sütunlar gösterilir.'],
    ['5. Sayılar (1000, 48) sıralama ve filtrelerde kullanılır; "40-60", "35 x 35", 3/4" yazıldığı gibi gösterilir.'],
    ['6. Dosyada olmayan aileler değişmez. Bir ailenin bütün satırlarını silerseniz o aile boş kalır (panelden silebilirsiniz).'],
    ['7. Panelde "Excel’den içe aktar" ile dosyayı seçin, önizlemeyi kontrol edip "Uygula"ya basın, sonra "Yayınla".'],
  ];

  const date = new Date().toISOString().slice(0, 10);

  await writeExcelFile([
    {
      sheet: 'Modeller',
      data: [header, ...rows],
      columns: [{ width: 22 }, { width: 30 }, { width: 14 }, ...COLUMN_KEYS.map(() => ({ width: 14 }))],
      stickyRowsCount: 1,
    },
    { sheet: 'Nasıl Kullanılır', data: help, columns: [{ width: 120 }] },
  ]).toFile(`rma-urun-tablolari-${date}.xlsx`);

  return rows.length;
}

/* Reads the file and returns { plan, errors } – nothing is saved yet */
export async function readFamiliesFile(file, families) {
  const { default: readExcelFile } = await import('read-excel-file/browser');

  const sheets = await readExcelFile(file);
  const sheet = sheets.find((item) => normalise(item.sheet) === 'modeller') || sheets[0];
  const [headerRow = [], ...dataRows] = sheet?.data || [];

  const fields = headerRow.map((cell) => HEADER_FIELDS.get(normalise(cell)) || null);
  const errors = [];

  if (!fields.includes('familyId') || !fields.includes('code')) {
    return { plan: [], errors: [`İlk satırda "${FAMILY_ID}" ve "${CODE}" sütunları bulunamadı. Panelden indirilen dosyayı kullanın.`] };
  }

  const groups = new Map();

  dataRows.forEach((cells, index) => {
    const record = {};
    fields.forEach((field, column) => {
      if (field) record[field] = cellValue(cells[column]);
    });

    if (!record.code && !record.familyId) return; // empty line

    if (!record.familyId || !record.code) {
      errors.push(`${index + 2}. satır: aile kimliği veya ürün kodu boş, atlandı.`);
      return;
    }

    const familyId = String(record.familyId).toLowerCase();

    if (!/^[a-z0-9-]{2,80}$/.test(familyId)) {
      errors.push(`${index + 2}. satır: "${record.familyId}" geçerli bir aile kimliği değil, atlandı.`);
      return;
    }

    if (!groups.has(familyId)) groups.set(familyId, { title: '', rows: [] });
    const group = groups.get(familyId);
    if (record.familyTitle && !group.title) group.title = String(record.familyTitle);

    group.rows.push({
      code: String(record.code),
      values: Object.fromEntries(COLUMN_KEYS.filter((key) => record[key] !== undefined && record[key] !== '').map((key) => [key, record[key]])),
    });
  });

  const plan = [...groups.entries()].map(([familyId, group]) => {
    const existing = families.find((family) => family.familyId === familyId);
    const imagesByCode = new Map((existing?.rows || []).map((row) => [row.code, row.image]));

    const rows = group.rows.map((row) => ({ ...row, image: imagesByCode.get(row.code) || '' }));
    // Keep the family's own column order; columns new in the file are appended
    const filled = COLUMN_KEYS.filter((key) => rows.some((row) => row.values[key] !== undefined));
    const columns = [
      ...(existing?.columns || []).filter((key) => filled.includes(key)),
      ...filled.filter((key) => !(existing?.columns || []).includes(key)),
    ];

    const before = new Set((existing?.rows || []).map((row) => row.code));
    const after = new Set(rows.map((row) => row.code));
    const changed = (existing?.rows || []).filter((row) => {
      const next = rows.find((item) => item.code === row.code);
      return next && JSON.stringify(Object.entries(next.values).map(([k, v]) => [k, String(v)]).sort()) !==
        JSON.stringify(Object.entries(row.values || {}).map(([k, v]) => [k, String(v)]).sort());
    }).length;

    if (!existing && !group.title) {
      errors.push(`"${familyId}" panelde yok ve "${FAMILY_TITLE}" boş; bu aile atlanacak.`);
    }

    const duplicates = rows.length - after.size;
    if (duplicates > 0) {
      errors.push(`"${familyId}": ${duplicates} tekrar eden ürün kodu var (sitede ayrı adresle gösterilir).`);
    }

    const sameOrder = (existing?.rows || []).map((row) => row.code).join('|') === rows.map((row) => row.code).join('|');
    const sameColumns = (existing?.columns || []).join('|') === columns.join('|');

    return {
      familyId,
      existing,
      unchanged: Boolean(existing) && sameOrder && sameColumns && changed === 0,
      title: existing?.i18n?.tr?.title || group.title,
      skip: !existing && !group.title,
      rows,
      columns,
      stats: {
        before: existing?.rows.length || 0,
        after: rows.length,
        added: [...after].filter((code) => !before.has(code)).length,
        removed: [...before].filter((code) => !after.has(code)).length,
        changed,
      },
    };
  });

  return { plan, errors };
}
