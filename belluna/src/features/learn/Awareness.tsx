import { useState } from 'react';
import { Youtube, ExternalLink, BookOpen } from 'lucide-react';

type Video = {
    id: string;
    title: string;
    channel: string;
    topic: string;
    description: string;
    thumb: string; // YouTube thumbnail URL
    url: string;
};

const VIDEOS: Video[] = [
    {
        id: 'v1',
        title: 'PCOS Explained: Symptoms, Causes & Treatment',
        channel: 'Doctors\' Circle World\'s Largest Health Platform',
        topic: 'PCOS',
        description: 'Comprehensive overview of Polycystic Ovary Syndrome — what it is, symptoms to watch for, and how it\'s managed.',
        thumb: 'https://img.youtube.com/vi/5Bx5GW4KDZo/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=5Bx5GW4KDZo',
    },
    {
        id: 'v2',
        title: 'Period Pain: Why It Happens & How to Manage It',
        channel: 'Health & Wellness',
        topic: 'Menstrual Health',
        description: 'Learn what causes dysmenorrhea (period cramps), home remedies, and when to see a doctor.',
        thumb: 'https://img.youtube.com/vi/p_8THPy_fPM/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=p_8THPy_fPM',
    },
    {
        id: 'v3',
        title: 'Menstrual Hygiene — What Every Woman Should Know',
        channel: 'WHO / Health Education',
        topic: 'Menstrual Hygiene',
        description: 'Safe hygiene practices during menstruation, types of products, and common myths debunked.',
        thumb: 'https://img.youtube.com/vi/GQQKnMsAZ1I/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=GQQKnMsAZ1I',
    },
    {
        id: 'v4',
        title: 'Iron Deficiency Anaemia in Women — Signs & Fixes',
        channel: 'Medical Centric',
        topic: 'Nutrition',
        description: 'Why women are more prone to iron deficiency, signs to recognize it, and dietary + supplement options.',
        thumb: 'https://img.youtube.com/vi/MsYqXH1FXIE/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=MsYqXH1FXIE',
    },
    {
        id: 'v5',
        title: 'Understanding Your Menstrual Cycle',
        channel: 'Planned Parenthood',
        topic: 'Menstrual Health',
        description: 'A clear, visual explanation of the 4 phases of your cycle and what happens to your body each week.',
        thumb: 'https://img.youtube.com/vi/Vz6a_gBEy8g/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=Vz6a_gBEy8g',
    },
    {
        id: 'v6',
        title: 'PCOS Diet & Lifestyle Changes That Actually Help',
        channel: 'Nourish by WebMD',
        topic: 'PCOS',
        description: 'Evidence-based diet and exercise tips that can help manage PCOS symptoms naturally.',
        thumb: 'https://img.youtube.com/vi/vkbH_fj5lEA/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=vkbH_fj5lEA',
    },
    {
        id: 'v7',
        title: 'Mental Health & Your Hormones: The Connection',
        channel: 'TED-Ed',
        topic: 'Mental Health',
        description: 'How hormonal fluctuations through the cycle affect mood, anxiety, and emotional wellbeing.',
        thumb: 'https://img.youtube.com/vi/c6GtT_2GQTQ/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=c6GtT_2GQTQ',
    },
    {
        id: 'v8',
        title: 'Endometriosis: Signs You Shouldn\'t Ignore',
        channel: 'Kenhub',
        topic: 'Reproductive Health',
        description: 'What endometriosis is and why it\'s often misdiagnosed — important warning signs explained.',
        thumb: 'https://img.youtube.com/vi/AP4TGCaVZCs/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=AP4TGCaVZCs',
    },
    {
        id: 'v9',
        title: 'Thyroid Problems in Women — Causes & Symptoms',
        channel: 'Doctors\' Circle',
        topic: 'Thyroid',
        description: 'Why thyroid disorders are more common in women, how they affect periods and fertility, and treatment options.',
        thumb: 'https://img.youtube.com/vi/RrRMtF4XSHE/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=RrRMtF4XSHE',
    },
    {
        id: 'v10',
        title: 'Vaginal Health 101 — Myths vs Facts',
        channel: 'Health & She',
        topic: 'Vaginal Health',
        description: 'Common myths about vaginal health busted, normal vs abnormal discharge, and hygiene tips.',
        thumb: 'https://img.youtube.com/vi/PDHNIaFrHyQ/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=PDHNIaFrHyQ',
    },
];

const TOPICS = ['All', ...Array.from(new Set(VIDEOS.map(v => v.topic)))];

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
    const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

    const filtered = topic === 'All' ? VIDEOS : VIDEOS.filter(v => v.topic === topic);

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            <div className="flex items-center gap-3 mb-2">
                <BookOpen className="text-primary" size={28} />
                <h1 className="text-2xl font-semibold">Health Awareness</h1>
            </div>
            <p className="text-ink/70 mb-6">Curated videos from trusted health sources. Click any card to watch on YouTube.</p>

            {/* Topic filter */}
            <div className="flex flex-wrap gap-2 mb-6">
                {TOPICS.map(t => (
                    <button key={t} onClick={() => setTopic(t)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${topic === t ? 'bg-primary text-white' : 'bg-soft text-primary hover:bg-lavender/30'}`}>
                        {t}
                    </button>
                ))}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(v => (
                    <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                        className="card group hover:border-primary hover:shadow-lg transition-all cursor-pointer p-0 overflow-hidden flex flex-col">
                        {/* Thumbnail */}
                        <div className="relative bg-gray-100 overflow-hidden">
                            {!imgErrors.has(v.id) ? (
                                <img src={v.thumb} alt={v.title}
                                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={() => setImgErrors(prev => new Set([...prev, v.id]))} />
                            ) : (
                                <div className="w-full h-44 flex items-center justify-center bg-lavender/20">
                                    <Youtube size={40} className="text-primary/40" />
                                </div>
                            )}
                            {/* Play overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                <div className="bg-white rounded-full p-3 shadow-lg">
                                    <Youtube size={24} className="text-[#FF0000]" />
                                </div>
                            </div>
                        </div>
                        {/* Content */}
                        <div className="p-4 flex flex-col flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOPIC_COLORS[v.topic] ?? 'bg-soft text-primary'}`}>
                                    {v.topic}
                                </span>
                            </div>
                            <h2 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors mb-1 flex-1">
                                {v.title}
                            </h2>
                            <p className="text-xs text-ink/60 mb-3 line-clamp-2">{v.description}</p>
                            <div className="flex items-center justify-between text-xs text-ink/50">
                                <span className="flex items-center gap-1"><Youtube size={12} className="text-[#FF0000]" />{v.channel}</span>
                                <ExternalLink size={12} />
                            </div>
                        </div>
                    </a>
                ))}
            </div>

            <p className="mt-8 text-xs text-ink/40 text-center">
                Videos are from YouTube. Belluna links to public educational content only. Not affiliated with any channel.
            </p>
        </div>
    );
}
