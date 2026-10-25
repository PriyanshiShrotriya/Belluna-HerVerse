
import { XMLParser } from 'fast-xml-parser';

interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  setHeader(name: string, value: string): this;
  status(code: number): this;
  json(body: unknown): this;
}

interface Article {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  publishedAt: string | null;
  url: string;
  imageUrl: string | null;
}

interface Feed {
  url: string;
  category: string;
  relevantOnly?: boolean;
}

const FEEDS: Feed[] = [
  {
    url: 'https://medlineplus.gov/feeds/topics/womenshealth.xml',
    category: 'Women’s Health',
  },
  {
    url: 'https://medlineplus.gov/feeds/topics/polycysticovarysyndrome.xml',
    category: 'PCOS',
  },
  {
    url: 'https://medlineplus.gov/feeds/topics/menstruation.xml',
    category: 'Menstrual Health',
  },
  {
    url: 'https://medlineplus.gov/feeds/topics/pregnancy.xml',
    category: 'Reproductive Health',
  },
  {
    url: 'https://medlineplus.gov/groupfeeds/new.xml',
    category: 'Women’s Health',
    relevantOnly: true,
  },
];

const ALLOWED_HOSTS = new Set([
  'medlineplus.gov',
  'www.medlineplus.gov',
  'fda.gov',
  'www.fda.gov',
  'womenshealth.gov',
  'www.womenshealth.gov',
  'cdc.gov',
  'www.cdc.gov',
  'who.int',
  'www.who.int',
  'nhs.uk',
  'www.nhs.uk',
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

const CACHE_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 7000;

let cachedArticles: Article[] = [];
let cacheExpiresAt = 0;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';

  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryFor(text: string, fallback: string): string {
  const value = text.toLowerCase();

  if (/pcos|polycystic ovary/.test(value)) return 'PCOS';

  if (/period|menstruat|menstrual|endometriosis/.test(value)) {
    return 'Menstrual Health';
  }

  if (
    /pregnan|fertility|reproductive|ovarian|cervical|contraception/.test(value)
  ) {
    return 'Reproductive Health';
  }

  if (/thyroid|hypothyroid|hyperthyroid/.test(value)) return 'Thyroid';

  if (/nutrition|diet|iron deficiency|vitamin/.test(value)) {
    return 'Nutrition';
  }

  if (/anxiety|depression|mental health|stress/.test(value)) {
    return 'Mental Health';
  }

  if (/breast cancer|breast health/.test(value)) return 'Breast Health';

  return fallback;
}

function isWomenHealthRelated(text: string): boolean {
  return /\b(women|woman|female|girls|girl|breast|cervical|ovarian|uterine|uterus|vaginal|menstrual|menstruation|periods?|pcos|polycystic|endometriosis|pregnancy|pregnant|fertility|menopause|contraception|reproductive health|maternal|postpartum|mammogram|mammography)\b/i.test(
    text,
  );
}

function parseDate(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;

  const timestamp = Date.parse(text);

  if (Number.isNaN(timestamp)) return null;

  return new Date(timestamp).toISOString();
}

function validatedUrl(value: unknown): URL | null {
  const text = cleanText(value);

  try {
    const url = new URL(text);

    if (
      url.protocol !== 'https:' ||
      !ALLOWED_HOSTS.has(url.hostname.toLowerCase()) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

async function fetchFeed(feed: Feed): Promise<Article[]> {
  const response = await fetch(feed.url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Feed returned HTTP ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const items = asArray<Record<string, unknown>>(
    parsed?.rss?.channel?.item,
  );

  return items.flatMap((item) => {
    const title = cleanText(item.title);
    const summary = cleanText(item.description);
    const url = validatedUrl(item.link);

    if (!title || !url) return [];

    const searchableText = `${title} ${summary}`;

    if (feed.relevantOnly && !isWomenHealthRelated(searchableText)) {
      return [];
    }

    return [
      {
        id: url.href,
        title,
        summary: summary.slice(0, 400),
        category: categoryFor(searchableText, feed.category),
        source: url.hostname.replace(/^www\./, ''),
        publishedAt: parseDate(item.pubDate),
        url: url.href,
        imageUrl: null,
      },
    ];
  });
}

async function getArticles(): Promise<Article[]> {
  if (Date.now() < cacheExpiresAt) {
    return cachedArticles;
  }

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  const successfulFeeds = results.filter(
    (result): result is PromiseFulfilledResult<Article[]> =>
      result.status === 'fulfilled',
  );

  // Keep the last good cache if every source is unavailable.
  if (successfulFeeds.length === 0) {
    if (cachedArticles.length > 0) return cachedArticles;
    throw new Error('All news feeds are unavailable');
  }

  const unique = new Map<string, Article>();

  for (const result of successfulFeeds) {
    for (const article of result.value) {
      unique.set(article.url, article);
    }
  }

  const articles = [...unique.values()].sort((a, b) => {
    if (!a.publishedAt && !b.publishedAt) {
      return a.title.localeCompare(b.title);
    }

    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;

    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });

  // Don't erase previously useful results if a refresh returns no articles.
  if (articles.length > 0 || cachedArticles.length === 0) {
    cachedArticles = articles;
  }

  cacheExpiresAt = Date.now() + CACHE_MS;
  return cachedArticles;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const categoryValue = req.query?.category;
  const category = Array.isArray(categoryValue)
    ? categoryValue[0]
    : categoryValue ?? 'All';

  const pageValue = req.query?.page;
  const limitValue = req.query?.limit;

  const page = Number(pageValue ?? 1);
  const limit = Number(limitValue ?? 10);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 30
  ) {
    return res.status(400).json({
      error: 'page must be a positive integer; limit must be between 1 and 30',
    });
  }

  try {
    const allArticles = await getArticles();

    const filtered =
      category.toLowerCase() === 'all'
        ? allArticles
        : allArticles.filter(
            (article) =>
              article.category.toLowerCase() === category.toLowerCase(),
          );

    const start = (page - 1) * limit;

    return res.status(200).json({
      articles: filtered.slice(start, start + limit),
      page,
      limit,
      hasMore: start + limit < filtered.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      error: 'News is temporarily unavailable. Please try again.',
      articles: [],
      page,
      limit,
      hasMore: false,
    });
  }
}
