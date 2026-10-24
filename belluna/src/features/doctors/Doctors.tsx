import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Phone } from 'lucide-react';
import { useT } from '../../i18n/t';
import { Loading, ErrorBox, Empty } from '../../components/States';

type Facility = { id: string; name: string; type: 'hospital' | 'clinic' | 'doctors'; lat: number; lon: number; phone?: string; dist: number };
type Pt = { lat: number; lon: number };
// City centres are public coordinates, used only as a manual-location fallback.
const CITIES: Record<string, Pt> = { Delhi: { lat: 28.6139, lon: 77.209 }, Mumbai: { lat: 19.076, lon: 72.8777 }, Bengaluru: { lat: 12.9716, lon: 77.5946 }, Kolkata: { lat: 22.5726, lon: 88.3639 }, Chennai: { lat: 13.0827, lon: 80.2707 } };
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const cache = new Map<string, Facility[]>(); // in-memory only; location is never persisted

const km = (a: Pt, b: Pt) => { const r = Math.PI / 180, dx = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r), dy = (b.lat - a.lat) * r; return Math.sqrt(dx * dx + dy * dy) * 6371; };

async function fetchFacilities(p: Pt): Promise<Facility[]> {
  const key = `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;
  const hit = cache.get(key); if (hit) return hit;
  const q = `[out:json][timeout:20];(nwr["amenity"~"^(hospital|clinic|doctors)$"](around:5000,${p.lat},${p.lon}););out center tags 40;`;
  const r = await fetch(OVERPASS, { method: 'POST', body: 'data=' + encodeURIComponent(q) });
  if (!r.ok) throw new Error('overpass');
  const j = (await r.json()) as { elements: { type: string; id: number; lat?: number; lon?: number; center?: Pt; tags?: Record<string, string> }[] };
  const out = j.elements.flatMap((e): Facility[] => {
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon, ty = e.tags?.amenity;
    if (lat == null || lon == null || (ty !== 'hospital' && ty !== 'clinic' && ty !== 'doctors')) return [];
    return [{ id: `${e.type}${e.id}`, name: e.tags?.name ?? '', type: ty, lat, lon, phone: e.tags?.phone ?? e.tags?.['contact:phone'], dist: km(p, { lat, lon }) }];
  }).sort((a, b) => a.dist - b.dist);
  cache.set(key, out); return out;
}

export default function Doctors() {
  const { t } = useT();
  const mapEl = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null), layer = useRef<L.LayerGroup | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [list, setList] = useState<Facility[]>([]);
  const [msg, setMsg] = useState('');
  const [city, setCity] = useState('Delhi');

  useEffect(() => {
    if (!mapEl.current || map.current) return;
    map.current = L.map(mapEl.current).setView([22.5, 79], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  async function search(p: Pt) {
    setState('loading'); setMsg('');
    try {
      const f = await fetchFacilities(p);
      setList(f); setState('done');
      layer.current?.clearLayers();
      L.circleMarker([p.lat, p.lon], { radius: 8, color: '#6D3AAE', fillOpacity: 0.9 }).addTo(layer.current!);
      f.forEach((x) => L.circleMarker([x.lat, x.lon], { radius: 7, color: '#A78BFA', fillColor: '#6D3AAE', fillOpacity: 0.6 }).bindPopup(x.name || t('dr.unnamed')).addTo(layer.current!));
      map.current?.setView([p.lat, p.lon], 13);
    } catch { setState('error'); }
  }
  const locate = () => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition((g) => search({ lat: g.coords.latitude, lon: g.coords.longitude }), () => setMsg(t('dr.denied')), { timeout: 10000 })
    : setMsg(t('dr.denied'));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t('dr.title')}</h1>
      <p className="mt-1 text-ink/75">{t('dr.sub')}</p>
      <div className="card mt-5 grid gap-4 md:grid-cols-2">
        <div><p className="text-sm text-ink/80">{t('dr.consent')}</p><button className="btn-primary mt-3" onClick={locate}><MapPin size={18} />{t('dr.use')}</button></div>
        <div><label htmlFor="city" className="mb-1 block text-sm font-medium">{t('dr.city')}</label>
          <div className="flex gap-2"><select id="city" value={city} onChange={(e) => setCity(e.target.value)} className="input">{Object.keys(CITIES).map((c) => <option key={c}>{c}</option>)}</select>
            <button className="btn-ghost" onClick={() => search(CITIES[city])}>{t('dr.search')}</button></div></div>
      </div>
      {msg && <p role="status" className="mt-3 text-sm text-ink/80">{msg}</p>}
      <div ref={mapEl} className="mt-5 h-72 rounded-2xl border border-soft md:h-96" role="region" aria-label={t('dr.title')} />
      <p className="mt-1 text-xs text-ink/60">{t('dr.attr')}</p>
      <div className="mt-5 space-y-3" aria-live="polite">
        {state === 'loading' && <Loading text={t('dr.searching')} />}
        {state === 'error' && <><ErrorBox text={t('dr.fail')} /><Empty text={t('dr.nofallback')} /></>}
        {state === 'done' && list.length === 0 && <Empty text={t('dr.none')} />}
        {state === 'done' && list.map((f) => (
          <div key={f.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-semibold">{f.name || t('dr.unnamed')}</p><p className="text-sm text-ink/70">{t(`dr.type.${f.type}` as 'dr.type.clinic')} · {f.dist.toFixed(1)} {t('dr.km')}</p></div>
            <div className="flex gap-2">
              <a className="btn-ghost" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/directions?to=${f.lat}%2C${f.lon}`}><Navigation size={16} />{t('dr.directions')}</a>
              {f.phone && <a className="btn-primary" href={`tel:${f.phone.replace(/[^+\d]/g, '')}`}><Phone size={16} />{t('dr.call')}</a>}
            </div>
          </div>))}
      </div>
    </div>
  );
}
