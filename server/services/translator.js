import Anthropic from '@anthropic-ai/sdk';

/*
  Turkish -> English / Arabic translation of panel content with Claude
  (Anthropic API). Used by services/autoTranslate.js after a save.

    ANTHROPIC_API_KEY   the API key (console.anthropic.com); without it
                        nothing is translated and saves work as before
    AUTO_TRANSLATE      false turns automatic translation off

  Texts go in batches of about BATCH_CHARS characters; the answer is JSON
  checked against a schema (structured outputs).
*/

export const TRANSLATION_MODEL = 'claude-opus-5-5';
export const TARGET_LANGUAGES = ['en', 'ar'];

const BATCH_CHARS = 12000;

export const isTranslationEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AUTO_TRANSLATE !== 'false';

let client = null;
const getClient = () => {
  if (!client) client = new Anthropic({ timeout: 10 * 60 * 1000, maxRetries: 2 });
  return client;
};

const SYSTEM = `You translate website and catalogue content for RMA Plastik, a Turkish manufacturer of rotationally moulded polyethylene (LLDPE/HDPE) products in Mersin: water and chemical storage tanks, silo tanks, AdBlue tanks, brine tanks, textile carts, planters, road barriers and custom moulded parts.

Translate each item from Turkish into:
- en: clear, professional international business English (B2B, industrial buyers).
- ar: Modern Standard Arabic for B2B buyers in the Gulf and the Middle East.

Rules:
- Translate only. Never add, remove or change facts, numbers, dimensions, capacities, units, certifications, prices or claims.
- Keep unchanged: brand and company names (RMA Plastik), product and model codes (e.g. RD 1000, TT-500), material names (LLDPE, HDPE, PE), units and numbers, URLs, e-mail addresses, phone numbers.
- Keep the formatting exactly: Markdown (headings, lists, bold, links and image syntax with the same URLs), line breaks, HTML tags and {{placeholders}}.
- Use the industry's usual terms (e.g. "rotational moulding", "storage tank", "UV-stabilised").
- Short labels stay short. Respect each item's maxLength (characters) when one is given.
- If an item is already not Turkish (a code, a name, a number), return it unchanged.
Return every item id exactly once.`;

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          en: { type: 'string' },
          ar: { type: 'string' },
        },
        required: ['id', 'en', 'ar'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

/* [{ id, text, maxLength }] -> batches of about BATCH_CHARS characters */
function batches(items) {
  const list = [];
  let current = [];
  let size = 0;

  for (const item of items) {
    if (current.length && size + item.text.length > BATCH_CHARS) {
      list.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.text.length;
  }
  if (current.length) list.push(current);
  return list;
}

async function translateBatch(items) {
  const payload = items.map((item) => ({ id: item.id, ...(item.maxLength ? { maxLength: item.maxLength } : {}), tr: item.text }));

  const stream = getClient().beta.messages.stream({
    model: TRANSLATION_MODEL,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    // A declined request is re-run on a fallback model chosen by the API
    fallbacks: 'default',
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: `Translate these items:\n${JSON.stringify({ items: payload })}` }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === 'refusal') {
    throw new Error('Çeviri modeli bu metni çevirmeyi reddetti.');
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('Çeviri yanıtı yarıda kesildi (metin çok uzun).');
  }

  const text = message.content.filter((block) => block.type === 'text').map((block) => block.text).join('');
  const parsed = JSON.parse(text);
  return Array.isArray(parsed?.items) ? parsed.items : [];
}

/*
  items: [{ id, text, maxLength? }] (Turkish)
  -> Map(id -> { en, ar }); items missing from an answer are left out.
*/
export async function translateItems(items) {
  const result = new Map();
  const wanted = items.filter((item) => typeof item.text === 'string' && item.text.trim());
  if (!wanted.length) return result;

  for (const batch of batches(wanted)) {
    const answers = await translateBatch(batch);
    const known = new Set(batch.map((item) => item.id));
    for (const answer of answers) {
      if (!known.has(answer?.id)) continue;
      result.set(answer.id, { en: String(answer.en ?? ''), ar: String(answer.ar ?? '') });
    }
  }

  return result;
}

/* Short, safe text for the panel (no key or request details) */
export function translationErrorText(error) {
  if (error instanceof Anthropic.AuthenticationError) return 'Çeviri servisi anahtarı (ANTHROPIC_API_KEY) geçersiz.';
  if (error instanceof Anthropic.RateLimitError) return 'Çeviri servisi şu an yoğun; biraz sonra tekrar kaydedin.';
  if (error instanceof Anthropic.APIError) return `Çeviri servisi hatası (${error.status ?? 'bağlantı'}).`;
  if (error instanceof SyntaxError) return 'Çeviri yanıtı okunamadı.';
  return String(error?.message || 'Çeviri yapılamadı.').slice(0, 200);
}
