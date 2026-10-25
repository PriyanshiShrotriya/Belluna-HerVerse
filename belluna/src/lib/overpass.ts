export type OverpassSearchKind = 'facilities' | 'pharmacies';

export async function fetchOverpass<T>(
  kind: OverpassSearchKind,
  coordinates: { lat: number; lon: number },
): Promise<T> {
  const response = await fetch('/api/overpass', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, ...coordinates }),
  });

  if (!response.ok) throw new Error('overpass');
  return await response.json() as T;
}
