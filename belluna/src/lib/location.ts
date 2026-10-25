export type Coordinates = { lat: number; lon: number };

let previousSearchAt = 0;
let searchQueue = Promise.resolve();

export async function searchLocation(query: string): Promise<Coordinates | null> {
  const previousSearch = searchQueue;
  let releaseSearch: () => void = () => {};
  searchQueue = new Promise<void>((resolve) => { releaseSearch = resolve; });

  await previousSearch;
  const delay = Math.max(0, 1000 - (Date.now() - previousSearchAt));
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  previousSearchAt = Date.now();

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'in',
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Location search failed');

    const results = await response.json() as { lat: string; lon: string }[];
    const result = results[0];
    if (!result) return null;

    const lat = Number(result.lat);
    const lon = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error('Location search returned invalid coordinates');
    }
    return { lat, lon };
  } finally {
    releaseSearch();
  }
}

export function getCurrentLocation(): Promise<Coordinates> {
  if (!navigator.geolocation) return Promise.reject(new Error('Geolocation is unavailable'));

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
      reject,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  });
}
