import { useState, useRef } from 'react';
import { Heart, MessageCircle, Send, Users, ShieldCheck, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

type Comment = { id: string; author: string; text: string; time: string };
type Post = { id: string; author: string; avatar: string; text: string; time: string; topic: string; likes: number; liked: boolean; comments: Comment[]; showComments: boolean };

const ADJECTIVES = ['Purple', 'Silver', 'Golden', 'Quiet', 'Brave', 'Gentle', 'Cosmic', 'Bright', 'Calm', 'Wise', 'Soft', 'Strong', 'Kind', 'Free', 'Bold'];
const NOUNS = ['Moon', 'River', 'Star', 'Bloom', 'Wave', 'Light', 'Rose', 'Bird', 'Cloud', 'Storm', 'Leaf', 'Pearl', 'Flame', 'Dream', 'Voice'];
const AVATARS = ['🌷', '🌙', '⭐', '🌸', '🦋', '🌊', '🌺', '🍃', '✨', '🌻', '💜', '🌹', '🕊️', '🌈', '🫧'];
const TOPICS = ['All', 'PCOS', 'Period Health', 'Mental Health', 'Nutrition', 'General'];

function randName() { return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] + NOUNS[Math.floor(Math.random() * NOUNS.length)]; }
function randAvatar() { return AVATARS[Math.floor(Math.random() * AVATARS.length)]; }
function timeAgo(ms: number) {
    const diff = Date.now() - ms;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}

const SEED_POSTS: Post[] = [
    { id: 's1', author: 'PurpleMoon', avatar: '🌙', text: 'Finally got diagnosed with PCOS after 3 years of irregular periods. Feeling so relieved to have answers. Has anyone else gone through this? Would love to connect 💜', time: timeAgo(Date.now() - 2 * 3600000), topic: 'PCOS', likes: 14, liked: false, comments: [{ id: 'c1', author: 'BraveLeaf', text: 'Yes! Same experience here. The diagnosis was a huge relief for me too. You are not alone 💪', time: '1h ago' }, { id: 'c2', author: 'QuietRiver', text: 'Welcome to the PCOS club 😄 What treatment did they suggest?', time: '45m ago' }], showComments: false },
    { id: 's2', author: 'CalmBloom', avatar: '🌸', text: 'Quick tip that helped me: heating pad + ibuprofen taken 2 hours BEFORE cramps usually start. Changed my life during periods. Hope this helps someone 🌸', time: timeAgo(Date.now() - 5 * 3600000), topic: 'Period Health', likes: 31, liked: false, comments: [{ id: 'c3', author: 'GentleWave', text: 'YES the timing makes all the difference! I take mine the night before my period starts.', time: '3h ago' }], showComments: false },
    { id: 's3', author: 'BraveVoice', avatar: '🦋', text: 'Does anyone else feel like their anxiety gets so much worse the week before their period? I\'ve been tracking and it\'s very consistent. Apparently it\'s called PMDD. Learning about it now.', time: timeAgo(Date.now() - 10 * 3600000), topic: 'Mental Health', likes: 22, liked: false, comments: [], showComments: false },
    { id: 's4', author: 'GoldenStar', avatar: '⭐', text: 'Iron levels went from critically low to normal in 3 months with iron tablets + eating pomegranate and spinach daily. Sharing because no one told me how big a deal low iron is for women. Energy is so much better!', time: timeAgo(Date.now() - 24 * 3600000), topic: 'Nutrition', likes: 45, liked: false, comments: [{ id: 'c4', author: 'SoftRose', text: 'which iron supplement did you take?', time: '20h ago' }], showComments: false },
];

export function Community() {
    const myName = useRef(randName());
    const myAvatar = useRef(randAvatar());
    const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
    const [topicFilter, setTopicFilter] = useState('All');
    const [newText, setNewText] = useState('');
    const [newTopic, setNewTopic] = useState('General');
    const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

    const filtered = topicFilter === 'All' ? posts : posts.filter(p => p.topic === topicFilter);

    function addPost() {
        if (!newText.trim()) return;
        const p: Post = { id: Date.now().toString(), author: myName.current, avatar: myAvatar.current, text: newText.trim(), time: 'just now', topic: newTopic, likes: 0, liked: false, comments: [], showComments: false };
        setPosts([p, ...posts]);
        setNewText('');
    }

    function toggleLike(id: string) {
        setPosts(posts.map(p => p.id === id ? { ...p, likes: p.liked ? p.likes - 1 : p.likes + 1, liked: !p.liked } : p));
    }

    function toggleComments(id: string) {
        setPosts(posts.map(p => p.id === id ? { ...p, showComments: !p.showComments } : p));
    }

    function addComment(postId: string) {
        const text = commentDrafts[postId]?.trim();
        if (!text) return;
        const comment: Comment = { id: Date.now().toString(), author: myName.current, text, time: 'just now' };
        setPosts(posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p));
        setCommentDrafts({ ...commentDrafts, [postId]: '' });
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <Users className="text-primary" size={28} />
                <h1 className="text-2xl font-semibold">Belluna Circle</h1>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-lavender/20 p-3 mb-5 text-sm text-primary">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                <span>100% anonymous peer support. Your identity: <strong>{myAvatar.current} {myName.current}</strong> (auto-assigned, visible only this session). No DMs, no images, no real names.</span>
            </div>
            <p className="text-xs text-ink/50 mb-4">⚠️ Peers are not medical professionals. For medical emergencies, use <Link to="/sos" className="text-primary underline">Period SOS</Link>.</p>

            {/* New post */}
            <div className="card mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{myAvatar.current}</span>
                    <span className="text-sm font-medium text-primary">{myName.current}</span>
                    <span className="text-xs text-ink/40 ml-auto">Posting anonymously</span>
                </div>
                <textarea rows={3} value={newText} onChange={e => setNewText(e.target.value)} maxLength={280}
                    placeholder="Share something with the Circle… (anonymous)" className="input py-2 resize-none mb-3" />
                <div className="flex items-center gap-3">
                    <select value={newTopic} onChange={e => setNewTopic(e.target.value)} className="input w-auto text-sm">
                        {TOPICS.filter(t => t !== 'All').map(t => <option key={t}>{t}</option>)}
                    </select>
                    <span className="text-xs text-ink/40 ml-auto">{280 - newText.length} left</span>
                    <button onClick={addPost} disabled={!newText.trim()} className="btn-primary">
                        <PlusCircle size={16} />Post
                    </button>
                </div>
            </div>

            {/* Topic filter */}
            <div className="flex flex-wrap gap-2 mb-5">
                {TOPICS.map(t => (
                    <button key={t} onClick={() => setTopicFilter(t)}
                        className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${topicFilter === t ? 'bg-primary text-white' : 'bg-soft text-primary hover:bg-lavender/30'}`}>
                        {t}
                    </button>
                ))}
            </div>

            {/* Feed */}
            <div className="space-y-4">
                {filtered.length === 0 && (
                    <div className="card text-center py-10 text-ink/50">
                        <Users size={36} className="mx-auto mb-3 text-lavender" />
                        <p>No posts in this topic yet. Be the first!</p>
                    </div>
                )}
                {filtered.map(p => (
                    <div key={p.id} className="card">
                        {/* Author + time */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{p.avatar}</span>
                            <div>
                                <p className="text-sm font-semibold">{p.author}</p>
                                <p className="text-xs text-ink/40">{p.time}</p>
                            </div>
                            <span className="ml-auto rounded-full bg-soft px-2 py-0.5 text-xs text-primary">{p.topic}</span>
                        </div>

                        {/* Post text */}
                        <p className="text-sm leading-relaxed mb-4">{p.text}</p>

                        {/* Actions */}
                        <div className="flex items-center gap-4 text-sm">
                            <button onClick={() => toggleLike(p.id)}
                                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-all ${p.liked ? 'text-[#B42318] font-semibold' : 'text-ink/60 hover:text-primary hover:bg-soft'}`}>
                                <Heart size={16} fill={p.liked ? '#B42318' : 'none'} />
                                {p.likes > 0 && p.likes}
                            </button>
                            <button onClick={() => toggleComments(p.id)}
                                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-ink/60 hover:text-primary hover:bg-soft transition-all">
                                <MessageCircle size={16} />
                                {p.comments.length > 0 && p.comments.length}
                                <span>{p.showComments ? 'Hide' : 'Comment'}</span>
                            </button>
                        </div>

                        {/* Comments section */}
                        {p.showComments && (
                            <div className="mt-4 border-t border-soft pt-4 space-y-3">
                                {p.comments.map(c => (
                                    <div key={c.id} className="flex gap-2 text-sm">
                                        <span className="text-ink/40 font-medium shrink-0">{c.author}:</span>
                                        <span className="text-ink/80">{c.text}</span>
                                        <span className="ml-auto text-xs text-ink/30 shrink-0">{c.time}</span>
                                    </div>
                                ))}
                                {p.comments.length === 0 && <p className="text-xs text-ink/40">No comments yet. Be the first!</p>}
                                <div className="flex gap-2 mt-3">
                                    <input value={commentDrafts[p.id] ?? ''} onChange={e => setCommentDrafts({ ...commentDrafts, [p.id]: e.target.value })}
                                        placeholder="Reply anonymously…" className="input text-sm h-10" maxLength={200}
                                        onKeyDown={e => e.key === 'Enter' && addComment(p.id)} />
                                    <button onClick={() => addComment(p.id)} className="btn-primary px-3 min-h-0 h-10"><Send size={14} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export { Community as default };
