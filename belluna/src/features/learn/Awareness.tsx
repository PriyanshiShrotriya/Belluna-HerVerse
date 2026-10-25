import { useState } from 'react';
import {
    ArrowUpRight,
    BookOpen,
    CalendarDays,
    ExternalLink,
    Leaf,
    Newspaper,
    Play,
    Youtube,
} from 'lucide-react';

type Video = {
    id: string;
    title: string;
    channel: string;
    topic: string;
    description: string;
    thumb: string; // YouTube thumbnail URL
    url: string;
};

type HealthUpdate = {
    id: string;
    title: string;
    topic: string;
    summary: string;
    source: string;
    url: string;
    image: string;
};

const VIDEOS: Video[] = [
    {
        id: 'v1',
        title: 'PCOS Explained: Symptoms, Causes & Treatment',
        channel: 'Doctors\' Circle World\'s Largest Health Platform',
        topic: 'PCOS',
        description: 'Comprehensive overview of Polycystic Ovary Syndrome — what it is, symptoms to watch for, and how it\'s managed.',
        thumb: 'https://img.youtube.com/vi/5Bx5GW4KDZo/hqdefault.jpg',
        url: 'https://youtu.be/gPJDz4kXY7E?si=VFFwjpg4PzrLBEcP',
    },
    {
        id: 'v2',
        title: 'Period Pain: Why It Happens & How to Manage It',
        channel: 'Health & Wellness',
        topic: 'Menstrual Health',
        description: 'Learn what causes dysmenorrhea (period cramps), home remedies, and when to see a doctor.',
        thumb: 'https://img.youtube.com/vi/p_8THPy_fPM/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=P9ddmRiKM_g',
    },
    {
        id: 'v3',
        title: 'Menstrual Hygiene — What Every Woman Should Know',
        channel: 'WHO / Health Education',
        topic: 'Menstrual Hygiene',
        description: 'Safe hygiene practices during menstruation, types of products, and common myths debunked.',
        thumb: 'https://img.youtube.com/vi/GQQKnMsAZ1I/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=q3_XHews0Js&utm_source=chatgpt.com',
    },
    {
        id: 'v4',
        title: 'Iron Deficiency Anaemia in Women — Signs & Fixes',
        channel: 'Medical Centric',
        topic: 'Nutrition',
        description: 'Why women are more prone to iron deficiency, signs to recognize it, and dietary + supplement options.',
        thumb: 'https://img.youtube.com/vi/MsYqXH1FXIE/hqdefault.jpg',
        url: 'https://www.youtube.com/results?search_query=NHS+iron+deficiency+anaemia',
    },
    {
        id: 'v5',
        title: 'Understanding Your Menstrual Cycle',
        channel: 'Planned Parenthood',
        topic: 'Menstrual Health',
        description: 'A clear, visual explanation of the 4 phases of your cycle and what happens to your body each week.',
        thumb: 'https://img.youtube.com/vi/Vz6a_gBEy8g/hqdefault.jpg',
        url: 'https://www.eshre.eu/Home/IRHEC/IRHEC_Resources/Menstrual-cycle-and-periods?',
    },
    {
        id: 'v6',
        title: 'PCOS Diet & Lifestyle Changes That Actually Help',
        channel: 'Nourish by WebMD',
        topic: 'PCOS',
        description: 'Evidence-based diet and exercise tips that can help manage PCOS symptoms naturally.',
        thumb: 'https://img.youtube.com/vi/vkbH_fj5lEA/hqdefault.jpg',
        url: 'https://www.pcosindia.org/patient-awareness-videos.php?',
    },
    {
        id: 'v7',
        title: 'Mental Health & Your Hormones: The Connection',
        channel: 'TED-Ed',
        topic: 'Mental Health',
        description: 'How hormonal fluctuations through the cycle affect mood, anxiety, and emotional wellbeing.',
        thumb: 'https://img.youtube.com/vi/c6GtT_2GQTQ/hqdefault.jpg',
        url: "https://www.youtube.com/results?search_query=NHS+women's+hormones+mental+health",
    },
    {
        id: 'v8',
        title: 'Endometriosis: Signs You Shouldn\'t Ignore',
        channel: 'Kenhub',
        topic: 'Reproductive Health',
        description: 'What endometriosis is and why it\'s often misdiagnosed — important warning signs explained.',
        thumb: 'https://img.youtube.com/vi/AP4TGCaVZCs/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=ABi1ncHorBY',
    },
    {
        id: 'v9',
        title: 'Thyroid Problems in Women — Causes & Symptoms',
        channel: 'Doctors\' Circle',
        topic: 'Thyroid',
        description: 'Why thyroid disorders are more common in women, how they affect periods and fertility, and treatment options.',
        thumb: 'https://img.youtube.com/vi/RrRMtF4XSHE/hqdefault.jpg',
        url: 'https://www.youtube.com/results?search_query=NHS+thyroid+problems+women',
    },
    {
        id: 'v10',
        title: 'Vaginal Health 101 — Myths vs Facts',
        channel: 'Health & She',
        topic: 'Vaginal Health',
        description: 'Common myths about vaginal health busted, normal vs abnormal discharge, and hygiene tips.',
        thumb: 'https://img.youtube.com/vi/PDHNIaFrHyQ/hqdefault.jpg',
        url: 'https://askawayhealth.org/youtube-hub/',
    },
];

const HEALTH_UPDATES: HealthUpdate[] = [
    {
        id: 'menstrual-health',
        title: 'Menstrual health is an essential part of overall health',
        topic: 'Menstrual Health',
        summary: 'Explore why access to accurate information, products and supportive care matters throughout life.',
        source: 'World Health Organization',
        url: 'https://www.who.int/health-topics/menstrual-health',
        image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=480&q=80',
    },
    {
        id: 'pcos',
        title: 'Understanding polycystic ovary syndrome',
        topic: 'PCOS',
        summary: 'A trusted overview of PCOS, common signs and the different ways care can be tailored.',
        source: 'NICHD',
        url: 'https://www.nichd.nih.gov/health/topics/pcos',
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=480&q=80',
    },
    {
        id: 'cervical-health',
        title: 'Cervical cancer prevention and HPV vaccination',
        topic: 'Reproductive Health',
        summary: 'Learn about prevention, screening and the role of HPV vaccination in cervical cancer care.',
        source: 'World Health Organization',
        url: 'https://www.who.int/news-room/fact-sheets/detail/cervical-cancer',
        image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=480&q=80',
    },
    {
        id: 'nutrition',
        title: 'Iron deficiency anaemia: symptoms and support',
        topic: 'Nutrition',
        summary: 'A practical guide to common symptoms, testing and treatment options to discuss with a clinician.',
        source: 'NHS',
        url: 'https://www.nhs.uk/conditions/iron-deficiency-anaemia/',
        image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=480&q=80',
    },
    {
        id: 'mental-wellbeing',
        title: 'Mental health support is part of women’s health',
        topic: 'Mental Health',
        summary: 'An introduction to mental wellbeing and finding support when you need it.',
        source: 'Office on Women’s Health',
        url: 'https://womenshealth.gov/mental-health',
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=480&q=80',
    },
    {
        id: 'thyroid',
        title: 'Thyroid disease: signs, diagnosis and treatment',
        topic: 'Thyroid',
        summary: 'Learn how thyroid conditions are assessed and what to ask your healthcare professional.',
        source: 'Office on Women’s Health',
        url: 'https://womenshealth.gov/a-z-topics/thyroid-disease',
        image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=480&q=80',
    },
];

const TOPICS = [
    'All',
    'PCOS',
    'Menstrual Health',
    'Reproductive Health',
    'Nutrition',
    'Mental Health',
    'Thyroid',
    'Menstrual Hygiene',
    'Vaginal Health',
];

const TOPIC_COLORS: Record<string, string> = {
    PCOS: 'bg-purple-100 text-purple-700',
    'Menstrual Health': 'bg-pink-100 text-pink-700',
    'Menstrual Hygiene': 'bg-rose-100 text-rose-700',
    Nutrition: 'bg-green-100 text-green-700',
    'Mental Health': 'bg-blue-100 text-blue-700',
    'Reproductive Health': 'bg-fuchsia-100 text-fuchsia-700',
    Thyroid: 'bg-orange-100 text-orange-700',
    'Vaginal Health': 'bg-teal-100 text-teal-700',
};

export default function Awareness() {
    const [topic, setTopic] = useState('All');
    const [section, setSection] = useState<'news' | 'videos'>('news');
    const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

    const filteredVideos = topic === 'All' ? VIDEOS : VIDEOS.filter(v => v.topic === topic);
    const filteredUpdates = topic === 'All'
        ? HEALTH_UPDATES
        : HEALTH_UPDATES.filter(item => item.topic === topic);

    return (
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
            <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-r from-[#f4efff] via-[#fff9fc] to-[#f8eff9] shadow-card">
                <div aria-hidden="true" className="absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full bg-blush/70 blur-3xl" />
                <div aria-hidden="true" className="absolute -bottom-28 left-1/3 -z-10 h-64 w-64 rounded-full bg-lavender/20 blur-3xl" />
                <div className="grid items-center gap-4 px-5 py-6 sm:px-8 md:grid-cols-[200px_minmax(0,1fr)_180px] md:gap-8 md:px-10 md:py-7">
                    <div aria-hidden="true" className="mx-auto w-full max-w-[190px]">
                        <svg viewBox="0 0 240 190" role="presentation" className="h-auto w-full drop-shadow-sm">
                            <circle cx="116" cy="95" r="82" fill="#eee6fb" />
                            <path d="M35 155c9-24 23-38 48-44h76c24 7 39 21 47 44v16H35z" fill="#9c82ce" />
                            <path d="M77 76c0-33 20-54 48-54 29 0 48 23 48 55 0 31-18 50-47 50S77 108 77 76z" fill="#342b52" />
                            <path d="M91 76c0-24 13-39 34-39 21 0 35 15 35 39 0 27-13 43-35 43-20 0-34-16-34-43z" fill="#f1c7b7" />
                            <path d="M79 78c-4-36 13-61 45-65 25-3 45 13 52 39-10-7-21-14-33-21-8 17-29 28-61 32z" fill="#342b52" />
                            <path d="M157 78c-2 9-7 16-14 20" fill="none" stroke="#c98783" strokeWidth="2" strokeLinecap="round" />
                            <path d="M104 79h7m19 0h7" stroke="#493b5c" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M114 97c6 4 12 4 18 0" fill="none" stroke="#b8747b" strokeWidth="2" strokeLinecap="round" />
                            <path d="M37 145c-8-25-17-39-31-48m198 43c8-26 17-41 31-51" fill="none" stroke="#8d79bc" strokeWidth="3" strokeLinecap="round" />
                            <path d="M19 103c-14 0-17-12-7-17 9-5 15 5 7 17zm15 25c-13-4-14-16-3-19 10-3 13 8 3 19zm183-27c14-1 17-13 7-18-9-5-15 6-7 18zm-15 27c13-4 14-16 3-19-10-3-13 8-3 19z" fill="#b7a5dc" />
                            <path d="M60 153c-6-14-12-21-22-28m149 29c5-14 12-21 22-28" fill="none" stroke="#9a87c8" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="57" cy="121" r="5" fill="#e9a8c8" /><circle cx="195" cy="119" r="5" fill="#e9a8c8" />
                        </svg>
                    </div>

                    <div className="text-center md:text-left">
                        <div className="mb-2 flex items-center justify-center gap-2 text-primary md:justify-start">
                            <BookOpen size={23} strokeWidth={2.3} />
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Health Awareness</h1>
                        </div>
                        <p className="mx-auto max-w-xl text-sm leading-6 text-ink/65 sm:text-base md:mx-0">
                            Trusted information for every stage of your health journey.
                        </p>
                        <div className="mt-5 inline-flex rounded-full border border-white/80 bg-white/75 p-1 shadow-sm" role="tablist" aria-label="Awareness content">
                            <button type="button" role="tab" aria-selected={section === 'news'} onClick={() => setSection('news')}
                                className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-all ${section === 'news' ? 'bg-primary text-white shadow-sm' : 'text-ink/65 hover:text-primary'}`}>
                                <Newspaper size={15} /> Latest News
                            </button>
                            <button type="button" role="tab" aria-selected={section === 'videos'} onClick={() => setSection('videos')}
                                className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-all ${section === 'videos' ? 'bg-primary text-white shadow-sm' : 'text-ink/65 hover:text-primary'}`}>
                                <Play size={15} /> Videos
                            </button>
                        </div>
                    </div>

                    <div className="hidden text-right md:block" aria-hidden="true">
                        <p className="font-head text-2xl italic leading-tight text-primary/70">Better<br />information,<br />brighter futures</p>
                        <Leaf className="ml-auto mt-2 text-primary/50" size={22} />
                    </div>
                </div>
            </section>

            <section className="mt-5" aria-label="Filter by health topic">
                <p className="mb-2 text-xs font-semibold text-ink/50">Browse by topic</p>
                <div className="awareness-topic-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                    {TOPICS.map(item => (
                        <button key={item} type="button" onClick={() => setTopic(item)} aria-pressed={topic === item}
                            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-all ${topic === item ? 'border-primary bg-primary text-white shadow-sm' : 'border-soft bg-white/70 text-ink/65 hover:border-lavender hover:bg-soft/60 hover:text-primary'}`}>
                            {item}
                        </button>
                    ))}
                </div>
            </section>

            {section === 'news' ? (
                <>
                    <div className="mb-3 mt-5 flex items-end justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-ink sm:text-xl">Latest News</h2>
                            <p className="mt-1 text-xs text-ink/55">Health explainers and guidance from trusted organizations.</p>
                        </div>
                        <span className="hidden items-center gap-1 text-xs text-ink/45 sm:inline-flex"><CalendarDays size={14} /> Curated reading</span>
                    </div>
                    {filteredUpdates.length ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {filteredUpdates.map(item => (
                                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                                    className="group flex min-h-36 gap-3 overflow-hidden rounded-2xl border border-soft/80 bg-white/85 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-lavender/70 hover:shadow-md sm:gap-4 sm:p-4">
                                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-soft to-blush sm:h-32 sm:w-32">
                                        {!imgErrors.has(item.id) ? (
                                            <img src={item.image} alt="" loading="lazy"
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                onError={() => setImgErrors(prev => new Set([...prev, item.id]))} />
                                        ) : (
                                            <div className="grid h-full place-items-center text-primary/50"><BookOpen size={28} /></div>
                                        )}
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col py-0.5">
                                        <span className={`mb-1.5 w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${TOPIC_COLORS[item.topic] ?? 'bg-soft text-primary'}`}>{item.topic}</span>
                                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-primary sm:text-[15px]">{item.title}</h3>
                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/55">{item.summary}</p>
                                        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                                            <span className="truncate text-[10px] font-medium text-ink/50">{item.source}</span>
                                            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-primary">Read article <ArrowUpRight size={12} /></span>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-lavender/40 bg-white/70 px-4 py-10 text-center">
                            <Newspaper className="mx-auto mb-2 text-lavender" size={28} />
                            <p className="text-sm font-medium text-ink">No news in this topic yet</p>
                            <button type="button" onClick={() => setTopic('All')} className="mt-2 text-xs font-semibold text-primary hover:underline">Show all updates</button>
                        </div>
                    )}
                    <p className="mt-4 text-center text-[11px] leading-5 text-ink/45">
                        Articles link to public health resources. Content is for education and is not a substitute for personal medical advice.
                    </p>
                </>
            ) : (
                <>
                    <div className="mb-3 mt-5">
                        <h2 className="text-lg font-semibold text-ink sm:text-xl">Videos</h2>
                        <p className="mt-1 text-xs text-ink/55">Watch educational videos from health organizations and educators.</p>
                    </div>
                    {filteredVideos.length ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredVideos.map(v => (
                                <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                                    className="card group flex cursor-pointer flex-col overflow-hidden p-0 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                                    <div className="relative overflow-hidden bg-gradient-to-br from-soft to-blush">
                                        {!imgErrors.has(v.id) ? (
                                            <img src={v.thumb} alt={v.title} loading="lazy"
                                                className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                onError={() => setImgErrors(prev => new Set([...prev, v.id]))} />
                                        ) : (
                                            <div className="grid h-44 place-items-center"><Youtube size={40} className="text-primary/40" /></div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                                            <span className="grid h-12 w-12 scale-90 place-items-center rounded-full bg-white text-primary opacity-0 shadow-lg transition-all group-hover:scale-100 group-hover:opacity-100"><Play size={20} fill="currentColor" /></span>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col p-4">
                                        <span className={`mb-2 w-fit rounded-full px-2 py-0.5 text-xs font-medium ${TOPIC_COLORS[v.topic] ?? 'bg-soft text-primary'}`}>{v.topic}</span>
                                        <h3 className="mb-1 flex-1 text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-primary">{v.title}</h3>
                                        <p className="mb-3 line-clamp-2 text-xs leading-5 text-ink/60">{v.description}</p>
                                        <div className="flex items-center justify-between gap-2 border-t border-soft/70 pt-3 text-xs text-ink/50">
                                            <span className="flex min-w-0 items-center gap-1.5"><Youtube size={13} className="shrink-0 text-[#FF0000]" /><span className="truncate">{v.channel}</span></span>
                                            <ExternalLink size={13} className="shrink-0" />
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-lavender/40 bg-white/70 px-4 py-10 text-center">
                            <Youtube className="mx-auto mb-2 text-lavender" size={30} />
                            <p className="text-sm font-medium text-ink">No videos in this topic yet</p>
                            <button type="button" onClick={() => setTopic('All')} className="mt-2 text-xs font-semibold text-primary hover:underline">Show all videos</button>
                        </div>
                    )}
                    <p className="mt-6 text-center text-xs text-ink/40">
                        Videos are hosted on YouTube. Belluna links to public educational content and is not affiliated with any channel.
                    </p>
                </>
            )}
        </div>
    );
}
