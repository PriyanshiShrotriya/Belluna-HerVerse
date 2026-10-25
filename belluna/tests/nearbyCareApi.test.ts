import { afterEach, describe, expect, it, vi } from 'vitest';
import nearbyCareHandler from '../api/nearby-care';

function createResponse() {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  let body: unknown;

  const response = {
    setHeader(name: string, value: string) {
      headers[name] = value;
      return response;
    },
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(value: unknown) {
      body = value;
      return response;
    },
  };

  return {
    response,
    result: () => ({ statusCode, headers, body }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('nearby-care API', () => {
  it('validates coordinates and does not call Overpass for invalid input', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { response, result } = createResponse();

    await nearbyCareHandler({ method: 'GET', query: { lat: '91', lon: '77' } }, response);

    expect(result().statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns validated facilities from the server-side Overpass response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        elements: [
          { type: 'node', id: 123, lat: 28.6, lon: 77.2, tags: { amenity: 'clinic', name: 'Care Center' } },
          { type: 'node', id: -1, lat: 28.6, lon: 77.2, tags: { amenity: 'hospital' } },
          { type: 'node', id: 456, lat: 91, lon: 77.2, tags: { amenity: 'hospital' } },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { response, result } = createResponse();

    await nearbyCareHandler({ method: 'GET', query: { lat: '28.6', lon: '77.2' } }, response);

    expect(result().statusCode).toBe(200);
    expect(result().body).toEqual({
      elements: [
        { type: 'node', id: 123, lat: 28.6, lon: 77.2, tags: { amenity: 'clinic', name: 'Care Center' } },
      ],
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('https://overpass-api.de/api/interpreter');

    const secondResponse = createResponse();
    await nearbyCareHandler(
      { method: 'GET', query: { lat: '28.6', lon: '77.2' } },
      secondResponse.response,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(secondResponse.result().statusCode).toBe(200);
  });

  it('returns a friendly timeout response', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
    vi.stubGlobal('fetch', fetchMock);
    const { response, result } = createResponse();

    await nearbyCareHandler({ method: 'GET', query: { lat: '13.12', lon: '80.12' } }, response);

    expect(result().statusCode).toBe(504);
    expect(result().body).toEqual({
      error: 'Nearby care search timed out. Please try again in a moment.',
    });
  });

  it('handles Overpass rate limits as temporary unavailability', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    vi.stubGlobal('fetch', fetchMock);
    const { response, result } = createResponse();

    await nearbyCareHandler({ method: 'GET', query: { lat: '14.12', lon: '81.12' } }, response);

    expect(result().statusCode).toBe(503);
    expect(result().body).toEqual({
      error: 'Nearby care data is temporarily unavailable. Please try again later.',
    });
  });
});
