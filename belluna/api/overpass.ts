import { z } from 'zod';

interface VercelRequest {
  method?: string;
  body?: unknown;
}

interface VercelResponse {
  setHeader(name: string, value: string): this;
  status(code: number): this;
  json(body: unknown): this;
}

const requestSchema = z.object({
  kind: z.enum(['facilities', 'pharmacies']),
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
}).strict();

const overpassTimeoutMs = 30_000;

function queryFor(kind: 'facilities' | 'pharmacies', lat: number, lon: number): string {
  if (kind === 'pharmacies') {
    return `[out:json][timeout:15];(nwr["amenity"="pharmacy"](around:3000,${lat},${lon}););out center tags 20;`;
  }

  return `[out:json][timeout:25];(
    nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"](around:5000,${lat},${lon});
    nwr["healthcare"~"^(gynaecologist|midwife|maternity)$"](around:5000,${lat},${lon});
    nwr["healthcare:speciality"~"gynaecology|obstetrics"](around:5000,${lat},${lon});
  );out center tags 60;`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body: unknown;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) as unknown : req.body;
  } catch {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }

  const request = requestSchema.safeParse(body);
  if (!request.success) {
    return res.status(400).json({ error: 'Invalid Overpass request' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), overpassTimeoutMs);

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(queryFor(request.data.kind, request.data.lat, request.data.lon))}`,
      signal: controller.signal,
    });

    if (!response.ok) {
      return res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 429
          ? 'Overpass rate limit reached'
          : 'Overpass request failed',
      });
    }

    const payload = await response.json() as unknown;
    return res.status(200).json(payload);
  } catch {
    return res.status(502).json({ error: 'Overpass request failed' });
  } finally {
    clearTimeout(timeout);
  }
}
