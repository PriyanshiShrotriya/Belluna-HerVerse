interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  setHeader(name: string, value: string): this;
  status(code: number): this;
  json(body: unknown): this;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const REQUEST_TIMEOUT_MS = 8_000;
const CACHE_MS = 60_000;
const MAX_RESPONSE_BYTES = 2_000_000;

const cachedResponses = new Map<string, { expiresAt: number; elements: OverpassElement[] }>();
const pendingRequests = new Map<string, Promise<OverpassElement[]>>();

function queryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? undefined : value;
}

function coordinate(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidLatitude(value: number): boolean {
  return value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return value >= -180 && value <= 180;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseElement(value: unknown): OverpassElement | null {
  if (!isRecord(value)) return null;
  const { type, id, lat, lon, center, tags } = value;

  if (
    (type !== 'node' && type !== 'way' && type !== 'relation') ||
    typeof id !== 'number' ||
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !isRecord(tags) ||
    !Object.values(tags).every((tag) => typeof tag === 'string')
  ) {
    return null;
  }

  const validPoint = (pointLat: unknown, pointLon: unknown) =>
    typeof pointLat === 'number' &&
    Number.isFinite(pointLat) &&
    isValidLatitude(pointLat) &&
    typeof pointLon === 'number' &&
    Number.isFinite(pointLon) &&
    isValidLongitude(pointLon);

  if (validPoint(lat, lon)) {
    return { type, id, lat, lon, tags: tags as Record<string, string> };
  }

  if (isRecord(center) && validPoint(center.lat, center.lon)) {
    return {
      type,
      id,
      center: { lat: center.lat as number, lon: center.lon as number },
      tags: tags as Record<string, string>,
    };
  }

  return null;
}

async function fetchFacilities(
  lat: number,
  lon: number,
  kind: 'all' | 'pharmacy',
): Promise<OverpassElement[]> {
  const key = `${kind}:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cachedResponses.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.elements;

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const query = kind === 'pharmacy'
    ? `[out:json][timeout:15];(nwr["amenity"="pharmacy"](around:3000,${lat},${lon}););out center tags 20;`
    : `[out:json][timeout:15];(
      nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"](around:5000,${lat},${lon});
      nwr["healthcare"~"^(gynaecologist|midwife|maternity)$"](around:5000,${lat},${lon});
      nwr["healthcare:speciality"~"gynaecology|obstetrics"](around:5000,${lat},${lon});
    );out center tags 60;`;

  const request = (async () => {
    let response: Response;
    try {
      response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('timeout');
      }
      throw new Error('unavailable');
    }

    if (
      response.status === 429 ||
      response.status === 503 ||
      response.status === 504 ||
      response.status === 509
    ) {
      throw new Error('unavailable');
    }
    if (!response.ok) throw new Error('upstream');

    let body: string;
    try {
      body = await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('timeout');
      }
      throw new Error('unavailable');
    }
    if (body.length > MAX_RESPONSE_BYTES) throw new Error('upstream');

    let data: unknown;
    try {
      data = JSON.parse(body) as unknown;
    } catch {
      throw new Error('upstream');
    }

    if (!isRecord(data) || !Array.isArray(data.elements)) {
      throw new Error('upstream');
    }

    const elements = data.elements
      .slice(0, 500)
      .map(parseElement)
      .filter((element): element is OverpassElement => element !== null);

    cachedResponses.set(key, { elements, expiresAt: Date.now() + CACHE_MS });
    return elements;
  })();

  pendingRequests.set(key, request);
  try {
    return await request;
  } finally {
    pendingRequests.delete(key);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const lat = coordinate(queryValue(req.query?.lat));
  const lon = coordinate(queryValue(req.query?.lon));
  const kind = queryValue(req.query?.kind) ?? 'all';
  if (lat === null || lon === null || !isValidLatitude(lat) || !isValidLongitude(lon)) {
    return res.status(400).json({ error: 'Valid lat and lon coordinates are required.' });
  }
  if (kind !== 'all' && kind !== 'pharmacy') {
    return res.status(400).json({ error: 'kind must be all or pharmacy.' });
  }

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60');

  try {
    const elements = await fetchFacilities(lat, lon, kind);
    return res.status(200).json({ elements });
  } catch (error) {
    if (error instanceof Error && error.message === 'timeout') {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(504).json({
        error: 'Nearby care search timed out. Please try again in a moment.',
      });
    }

    if (error instanceof Error && error.message === 'upstream') {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({
        error: 'Nearby care data could not be read. Please try again later.',
      });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      error: 'Nearby care data is temporarily unavailable. Please try again later.',
    });
  }
}
