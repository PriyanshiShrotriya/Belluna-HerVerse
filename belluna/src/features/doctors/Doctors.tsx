import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Phone, Search, ShoppingBag, Heart, Cross, Filter } from 'lucide-react';
import { useT } from '../../i18n/t';
import { Loading, ErrorBox, Empty } from '../../components/States';
import { getCurrentLocation, searchLocation } from '../../lib/location';

type FacilityType = 'hospital' | 'clinic' | 'doctors' | 'pharmacy' | 'gynaecologist';
type Facility = {
  id: string;
  name: string;
  type: FacilityType;
  lat: number;
  lon: number;
  phone?: string;
  dist: number;
};
type Pt = { lat: number; lon: number };

type FilterTab = 'all' | 'healthcare' | 'pharmacy' | 'gynaecologist';

const cache = new Map<string, Promise<Facility[]>>();

const COLORS: Record<FacilityType, string> = {
  hospital: '#6D3AAE',
  clinic: '#6D3AAE',
  doctors: '#6D3AAE',
  pharmacy: '#E11D48',
  gynaecologist: '#0D9488',
};

const LABEL: Record<FacilityType, string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  doctors: 'Doctor',
  pharmacy: 'Pharmacy / Medical Shop',
  gynaecologist: 'Gynaecologist',
};

const km = (a: Pt, b: Pt) => {
  const r = Math.PI / 180;
  const dx = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const dy = (b.lat - a.lat) * r;
  return Math.sqrt(dx * dx + dy * dy) * 6371;
};

const GYNO_KEYWORDS = ['gynae', 'gyne', 'gynaec', 'obstetric', 'maternity', 'women', 'mahila', 'prasuti'];

function isGyno(tags: Record<string, string> = {}) {
  const speciality = (tags['healthcare:speciality'] || tags['speciality'] || '').toLowerCase();
  const name = (tags['name'] || '').toLowerCase();
  if (speciality.includes('gynaecology') || speciality.includes('obstetrics')) return true;
  return GYNO_KEYWORDS.some((k) => name.includes(k));
}

async function fetchFacilities(p: Pt): Promise<Facility[]> {
  const key = `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const request = (async () => {
    const params = new URLSearchParams({ lat: String(p.lat), lon: String(p.lon) });
    const response = await fetch(`/api/nearby-care?${params}`);
    const result = await response.json().catch(() => null) as {
      error?: string;
      elements?: {
        type: string;
        id: number;
        lat?: number;
        lon?: number;
        center?: Pt;
        tags?: Record<string, string>;
      }[];
    };

    if (!response.ok) {
      throw new Error(result?.error || 'Nearby care data is temporarily unavailable.');
    }
    const elements = result?.elements;
    if (!Array.isArray(elements)) {
      throw new Error('Nearby care data could not be read. Please try again later.');
    }

    const seen = new Set<string>();
    return elements.flatMap((e): Facility[] => {
      const lat = e.lat ?? e.center?.lat;
      const lon = e.lon ?? e.center?.lon;
      if (lat == null || lon == null) return [];
      const tags = e.tags ?? {};
      const amenity = tags['amenity'];
      const healthcare = tags['healthcare'];

      let type: FacilityType | null = null;

      if (amenity === 'pharmacy') {
        type = 'pharmacy';
      } else if (
        healthcare === 'gynaecologist' ||
        healthcare === 'midwife' ||
        healthcare === 'maternity' ||
        isGyno(tags)
      ) {
        type = 'gynaecologist';
      } else if (amenity === 'hospital' && isGyno(tags)) {
        type = 'gynaecologist';
      } else if (amenity === 'hospital' || amenity === 'clinic' || amenity === 'doctors') {
        type = amenity as FacilityType;
      } else {
        return [];
      }

      const uid = `${e.type}${e.id}`;
      if (seen.has(uid)) return [];
      seen.add(uid);

      return [{
        id: uid,
        name: tags['name'] ?? '',
        type,
        lat,
        lon,
        phone: tags['phone'] ?? tags['contact:phone'],
        dist: km(p, { lat, lon }),
      }];
    }).sort((a, b) => a.dist - b.dist);
  })();

  cache.set(key, request);
  try {
    return await request;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'all', label: 'All', icon: Filter, color: 'text-ink' },
  { key: 'healthcare', label: 'Hospitals & Clinics', icon: Cross, color: 'text-[#6D3AAE]' },
  { key: 'pharmacy', label: 'Pharmacies', icon: ShoppingBag, color: 'text-[#E11D48]' },
  { key: 'gynaecologist', label: 'Gynecologists', icon: Heart, color: 'text-[#0D9488]' },
];

function matchesFilter(f: Facility, tab: FilterTab) {
  if (tab === 'all') return true;
  if (tab === 'healthcare') return f.type === 'hospital' || f.type === 'clinic' || f.type === 'doctors';
  return f.type === tab;
}

export default function Doctors() {
  const { t } = useT();
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<{ facility: Facility; marker: L.CircleMarker }[]>([]);

  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [list, setList] = useState<Facility[]>([]);
  const [msg, setMsg] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    if (!mapEl.current || map.current) return;
    map.current = L.map(mapEl.current).setView([22.5, 79], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // Update marker visibility when filter tab changes
  useEffect(() => {
    markers.current.forEach(({ facility, marker }) => {
      const visible = matchesFilter(facility, activeTab);
      if (visible) {
        marker.setStyle({ opacity: 1, fillOpacity: 0.75 });
      } else {
        marker.setStyle({ opacity: 0.12, fillOpacity: 0.06 });
      }
    });
  }, [activeTab]);

  async function search(p: Pt) {
    setState('loading'); setMsg('');
    try {
      const f = await fetchFacilities(p);
      setList(f);
      setState('done');
      layer.current?.clearLayers();
      markers.current = [];

      // User location pin
      L.circleMarker([p.lat, p.lon], {
        radius: 9, color: '#1e293b', fillColor: '#1e293b', fillOpacity: 0.9, weight: 2,
      }).bindPopup(`📍 ${t('dr.searchCenter')}`).addTo(layer.current!);

      // Facility markers
      f.forEach((x) => {
        const color = COLORS[x.type];
        const m = L.circleMarker([x.lat, x.lon], {
          radius: 8, color, fillColor: color, fillOpacity: 0.75, weight: 1.5,
        }).bindPopup(`<strong>${x.name || 'Unnamed'}</strong><br/><span style="color:${color}">${LABEL[x.type]}</span>`);
        m.addTo(layer.current!);
        markers.current.push({ facility: x, marker: m });
      });

      map.current?.setView([p.lat, p.lon], 14);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : t('dr.fail'));
      setState('error');
    }
  }

  async function locate() {
    setState('loading');
    setMsg('');
    try {
      await search(await getCurrentLocation());
    } catch {
      setState('idle');
      setMsg(t('dr.denied'));
    }
  }

  async function searchByLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = locationQuery.trim();
    if (!query) {
      setMsg(t('dr.locationRequired'));
      return;
    }

    setState('loading');
    setMsg('');
    try {
      const location = await searchLocation(query);
      if (!location) {
        setState('idle');
        setMsg(t('dr.locationNotFound'));
        return;
      }
      await search(location);
    } catch {
      setState('idle');
      setMsg(t('dr.locationFail'));
    }
  }

  const visibleList = list.filter((f) => matchesFilter(f, activeTab));

  const counts: Record<FilterTab, number> = {
    all: list.length,
    healthcare: list.filter((f) => f.type === 'hospital' || f.type === 'clinic' || f.type === 'doctors').length,
    pharmacy: list.filter((f) => f.type === 'pharmacy').length,
    gynaecologist: list.filter((f) => f.type === 'gynaecologist').length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#f1eaff] via-[#fff9fc] to-[#eef5ff] p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-primary shadow-sm"><Heart size={21} /></span>
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-primary/70">Care, closer to you</p>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t('dr.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{t('dr.sub')}</p>
      </div>

      {/* Search controls */}
      <div className="card mb-5 grid gap-5 border-lavender/20 bg-white/90 p-4 sm:p-6 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Use your location</p>
          <p className="mt-2 text-sm leading-6 text-ink/65">{t('dr.consent')}</p>
          <button className="btn-primary mt-3" onClick={locate} disabled={state === 'loading'}>
            <MapPin size={18} /> {t('dr.use')}
          </button>
        </div>
        <form onSubmit={searchByLocation}>
          <label htmlFor="care-location" className="mb-1 block text-sm font-medium">{t('dr.location')}</label>
          <div className="flex gap-2">
            <input
              id="care-location"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              className="input min-w-0"
              placeholder={t('dr.locationPlaceholder')}
              autoComplete="postal-code"
            />
            <button className="btn-ghost flex shrink-0 items-center gap-1" type="submit" disabled={state === 'loading'}>
              <Search size={16} /> {t('dr.search')}
            </button>
          </div>
        </form>
      </div>

      {msg && state !== 'error' && <p role="status" className="mb-3 text-sm text-ink/80">{msg}</p>}

      {/* Map */}
      <div ref={mapEl} className="h-80 overflow-hidden rounded-3xl border border-soft shadow-card md:h-[420px]"
        role="region" aria-label={t('dr.title')} />
      <p className="mt-1 text-xs text-ink/50">Map data © OpenStreetMap contributors</p>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-ink/70">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#6D3AAE' }} />
          Hospitals &amp; Clinics
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#E11D48' }} />
          Pharmacies / Medicine Shops
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#0D9488' }} />
          Gynecologists
        </span>
      </div>

      {/* Filter Tabs */}
      {state === 'done' && (
        <div className="mt-6 flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all border ${activeTab === tab.key
                  ? 'bg-primary text-white border-primary shadow'
                  : 'border-soft bg-white text-ink/70 hover:bg-soft'
                }`}
            >
              <tab.icon size={14} />
              {tab.label}
              <span className={`ml-1 rounded-full px-1.5 py-0 text-xs ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-soft text-ink/50'}`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="mt-5 space-y-3" aria-live="polite">
        {state === 'loading' && <Loading text={t('dr.searching')} />}
        {state === 'error' && <><ErrorBox text={msg || t('dr.fail')} /><Empty text={t('dr.nofallback')} /></>}
        {state === 'done' && visibleList.length === 0 && <Empty text={t('dr.none')} />}

        {state === 'done' && visibleList.map((f) => {
          const color = COLORS[f.type];
          return (
            <div key={f.id} className="card flex flex-wrap items-center justify-between gap-3 transition-all hover:border-lavender/70 hover:shadow-md">
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <div>
                  <p className="font-semibold text-ink">{f.name || t('dr.unnamed')}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ background: color }}
                    >
                      {LABEL[f.type]}
                    </span>
                    <span className="text-sm text-ink/60">{f.dist.toFixed(1)} km away</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  className="btn-ghost"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lon}`}
                >
                  <Navigation size={16} /> Directions
                </a>
                {f.phone && (
                  <a className="btn-primary" href={`tel:${f.phone.replace(/[^+\d]/g, '')}`}>
                    <Phone size={16} /> {t('dr.call')}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
