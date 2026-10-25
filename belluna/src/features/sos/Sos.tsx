import { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import { Phone, MapPin, AlertCircle, ChevronRight, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/t';
import { getCurrentLocation, searchLocation } from '../../lib/location';
import { fetchOverpass } from '../../lib/overpass';

type SosPanel = null | 'unexpected' | 'pad' | 'cramps' | 'urgent';

type PharmacyResult = { id: string; name: string; lat: number; lon: number; dist: number };


const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const r = Math.PI / 180;
  const dx = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const dy = (b.lat - a.lat) * r;
  return Math.sqrt(dx * dx + dy * dy) * 6371;
};

async function fetchPharmacies(p: { lat: number; lon: number }): Promise<PharmacyResult[]> {
  const j = await fetchOverpass<{
    elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
  }>('pharmacies', p);
  return j.elements.flatMap((e): PharmacyResult[] => {
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (lat == null || lon == null) return [];
    return [{ id: `${e.type}${e.id}`, name: e.tags?.name ?? '', lat, lon, dist: km(p, { lat, lon }) }];
  }).sort((a, b) => a.dist - b.dist).slice(0, 10);
}

function TipCard({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white/70 backdrop-blur-sm border border-purple-100 px-4 py-3 shadow-sm">
      <span className="text-xl shrink-0">{emoji}</span>
      <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}

function WarningItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
      <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
      <span className="text-sm text-red-700">{text}</span>
    </li>
  );
}

function PadFinderPanel() {
  const { t } = useT();
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [list, setList] = useState<PharmacyResult[]>([]);
  const [msg, setMsg] = useState('');
  const [locationQuery, setLocationQuery] = useState('');

  useEffect(() => {
    if (!mapEl.current || map.current) return;
    map.current = L.map(mapEl.current).setView([22.5, 79], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  async function search(p: { lat: number; lon: number }) {
    setState('loading');
    setMsg('');
    try {
      const results = await fetchPharmacies(p);
      setList(results); setState('done');
      layer.current?.clearLayers();
      L.circleMarker([p.lat, p.lon], { radius: 9, color: '#6D3AAE', fillOpacity: 0.9 })
        .bindPopup(`📍 ${t('sos.pad.searchCenter')}`).addTo(layer.current!);
      results.forEach(x => {
        L.circleMarker([x.lat, x.lon], { radius: 7, color: '#E11D48', fillColor: '#E11D48', fillOpacity: 0.7 })
          .bindPopup(`<strong>${x.name || 'Pharmacy'}</strong><br/>${x.dist.toFixed(1)} km`).addTo(layer.current!);
      });
      map.current?.setView([p.lat, p.lon], 14);
    } catch {
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
      setMsg(t('sos.pad.denied'));
    }
  }

  async function searchByLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = locationQuery.trim();
    if (!query) {
      setMsg(t('sos.pad.locationRequired'));
      return;
    }

    setState('loading');
    setMsg('');
    try {
      const location = await searchLocation(query);
      if (!location) {
        setState('idle');
        setMsg(t('sos.pad.locationNotFound'));
        return;
      }
      await search(location);
    } catch {
      setState('idle');
      setMsg(t('sos.pad.locationFail'));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t('sos.pad.sub')}</p>
      <button onClick={locate} disabled={state === 'loading'}
        className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow hover:bg-primary/90 transition-all disabled:opacity-60">
        <MapPin size={16} /> {state === 'loading' ? t('sos.pad.searching') : t('sos.pad.locate')}
      </button>
      <form onSubmit={searchByLocation} className="flex gap-2">
        <label htmlFor="pharmacy-location" className="sr-only">{t('sos.pad.location')}</label>
        <input
          id="pharmacy-location"
          value={locationQuery}
          onChange={(e) => setLocationQuery(e.target.value)}
          className="input min-w-0 flex-1"
          placeholder={t('sos.pad.locationPlaceholder')}
          autoComplete="postal-code"
        />
        <button type="submit" disabled={state === 'loading'}
          className="flex shrink-0 items-center gap-2 rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-primary hover:bg-purple-50 transition-all disabled:opacity-60">
          <MapPin size={16} /> {t('sos.pad.search')}
        </button>
      </form>
      {msg && <p className="text-sm text-slate-500">{msg}</p>}
      {state === 'error' && <p role="alert" className="text-sm text-red-600">{t('sos.pad.fail')}</p>}
      <div ref={mapEl} className="h-56 rounded-2xl border border-purple-100 shadow-sm" />
      {state === 'done' && list.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">{t('sos.pad.none')}</p>
      )}
      {state === 'done' && list.length > 0 && (
        <div className="space-y-2">
          {list.map(f => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 border border-purple-100 px-4 py-3">
              <div>
                <p className="font-semibold text-sm">{f.name || 'Pharmacy'}</p>
                <p className="text-xs text-slate-500">{f.dist.toFixed(1)} km away</p>
              </div>
              <a href={`https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lon}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-xl bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/20 transition-all">
                <Navigation size={13} /> {t('sos.pad.directions')}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CARDS: { key: SosPanel; emoji: string; color: string; bg: string; border: string }[] = [
  { key: 'unexpected', emoji: '😮', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  { key: 'pad', emoji: '🛒', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  { key: 'cramps', emoji: '🌡️', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'urgent', emoji: '🚨', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
];

export default function Sos() {
  const { t } = useT();
  const [panel, setPanel] = useState<SosPanel>(null);

  if (panel === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f0ff] via-[#fff9fc] to-[#fceef4] px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-lg">
          {/* Header */}
          <div className="mb-8 rounded-[2rem] border border-white/80 bg-white/75 p-6 text-center shadow-card backdrop-blur sm:p-8">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-[#bd78ad] shadow-lg shadow-purple-200">
              <span className="text-3xl">🌸</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">{t('sos.title')}</h1>
            <p className="mt-2 text-sm leading-6 text-ink/60">{t('sos.pick')}</p>
          </div>

          {/* 4 main cards */}
          <div className="grid gap-4">
            {CARDS.map(c => (
              <button key={c.key} onClick={() => setPanel(c.key)}
                className={`group flex items-center gap-4 rounded-3xl ${c.bg} border ${c.border} px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}>
                <span className="text-3xl shrink-0">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-base ${c.color}`}>{t(`sos.c.${c.key}` as 'sos.c.unexpected')}</p>
                  <p className="text-sm text-slate-500 mt-0.5 leading-snug">{t(`sos.c.${c.key}.d` as 'sos.c.unexpected.d')}</p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
              </button>
            ))}
          </div>

          {/* Emergency call */}
          <a href="tel:112"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-red-500 to-rose-500 px-5 py-4 font-bold text-white shadow-lg shadow-red-200 hover:shadow-xl transition-all hover:-translate-y-0.5">
            <Phone size={20} /> {t('sos.call')}
          </a>

          {/* Disclaimer */}
          <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed px-2">
            ⚠️ {t('sos.disclaimer')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <button onClick={() => setPanel(null)}
          className="mb-6 flex items-center gap-1 rounded-xl bg-white/70 border border-purple-100 px-3 py-2 text-sm text-purple-600 font-medium shadow-sm hover:bg-white transition-all">
          ← {t('common.back')}
        </button>

        {/* Unexpected Period */}
        {panel === 'unexpected' && (
          <div>
            <div className="mb-6">
              <span className="text-4xl">😮</span>
              <h2 className="mt-2 text-2xl font-bold text-slate-800">{t('sos.unexpected.title')}</h2>
            </div>
            <div className="space-y-3">
              <TipCard emoji="🧻" text={t('sos.unexpected.tip1')} />
              <TipCard emoji="🏪" text={t('sos.unexpected.tip2')} />
              <TipCard emoji="🚿" text={t('sos.unexpected.tip3')} />
              <TipCard emoji="🤝" text={t('sos.unexpected.tip4')} />
              <TipCard emoji="📅" text={t('sos.unexpected.tip5')} />
            </div>
            <Link to="/tracker"
              className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow hover:bg-primary/90 transition-all">
              Open Tracker
            </Link>
          </div>
        )}

        {/* Need a Pad */}
        {panel === 'pad' && (
          <div>
            <div className="mb-6">
              <span className="text-4xl">🛒</span>
              <h2 className="mt-2 text-2xl font-bold text-slate-800">{t('sos.pad.title')}</h2>
            </div>
            <PadFinderPanel />
          </div>
        )}

        {/* Cramps & Pain */}
        {panel === 'cramps' && (
          <div>
            <div className="mb-6">
              <span className="text-4xl">🌡️</span>
              <h2 className="mt-2 text-2xl font-bold text-slate-800">{t('sos.cramps.title')}</h2>
            </div>
            <div className="space-y-3">
              <TipCard emoji="🔥" text={t('sos.cramps.tip1')} />
              <TipCard emoji="💊" text={t('sos.cramps.tip2')} />
              <TipCard emoji="🍵" text={t('sos.cramps.tip3')} />
              <TipCard emoji="🧘" text={t('sos.cramps.tip4')} />
              <TipCard emoji="🛏️" text={t('sos.cramps.tip5')} />
            </div>
            <Link to="/doctors"
              className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-primary bg-white px-5 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-primary/5 transition-all">
              <MapPin size={16} /> Find a doctor
            </Link>
          </div>
        )}

        {/* Urgent Help */}
        {panel === 'urgent' && (
          <div>
            <div className="mb-6">
              <span className="text-4xl">🚨</span>
              <h2 className="mt-2 text-2xl font-bold text-slate-800">{t('sos.urgent.title')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('sos.urgent.intro')}</p>
            </div>
            <ul className="space-y-2.5">
              {(['s1', 's2', 's3', 's4', 's5', 's6'] as const).map(s => (
                <WarningItem key={s} text={t(`sos.urgent.${s}` as 'sos.urgent.s1')} />
              ))}
            </ul>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a href="tel:112"
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 px-5 py-3 font-bold text-white shadow-lg shadow-red-200 hover:shadow-xl transition-all">
                <Phone size={18} /> {t('sos.urgent.call')}
              </a>
              <Link to="/doctors"
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-3 font-semibold text-red-700 hover:bg-red-100 transition-all">
                <MapPin size={18} /> {t('sos.urgent.find')}
              </Link>
            </div>
          </div>
        )}

        {/* Disclaimer at bottom of panels */}
        <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed px-2">
          ⚠️ {t('sos.disclaimer')}
        </p>
      </div>
    </div>
  );
}
