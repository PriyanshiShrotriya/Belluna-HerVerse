import { useState } from 'react';
import { Heart, MessageCircle, Send, Users, ShieldCheck, PlusCircle, Pencil, Trash2, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/t';

type Comment = { id: string; author: string; text: string; time: string };
type Post = {
    id: string; author: string; avatar: string; text: string; time: string;
    topic: string; likes: number; liked: boolean; comments: Comment[]; showComments: boolean;
    isOwn?: boolean;
};

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

// ── Nickname chooser screen ───────────────────────────────────────────────
function NicknameChooser({ onEnter }: { onEnter: (name: string, avatar: string) => void }) {
    const { t } = useT();
    const [nick, setNick] = useState(randName());
    const [avatar, setAvatar] = useState(randAvatar());
    const [err, setErr] = useState('');

    function enter() {
        const trimmed = nick.trim();
        if (!trimmed || trimmed.length < 2) { setErr('At least 2 characters required.'); return; }
        onEnter(trimmed, avatar);
    }

    return (
        <div className="mx-auto max-w-md px-4 py-12 text-center sm:py-16">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-soft to-blush text-4xl shadow-sm">💜</div>
            <h1 className="text-2xl font-bold mb-1">{t('circle.choose.title')}</h1>
            <p className="text-sm text-ink/60 mb-8">{t('circle.choose.sub')}</p>

            {/* Avatar picker */}
            <div className="flex flex-wrap justify-center gap-2 mb-5">
                {AVATARS.map(a => (
                    <button key={a} onClick={() => setAvatar(a)}
                        className={`text-2xl rounded-full p-2 transition-all ${avatar === a ? 'bg-primary/15 ring-2 ring-primary scale-110' : 'hover:bg-soft'}`}>
                        {a}
                    </button>
                ))}
            </div>

            {/* Name input */}
            <div className="card mb-4 text-left">
                <label className="text-sm font-medium text-ink/70 block mb-1">Your nickname</label>
                <input
                    value={nick}
                    onChange={e => { setNick(e.target.value); setErr(''); }}
                    placeholder={t('circle.choose.placeholder')}
                    maxLength={30}
                    className="input"
                />
                {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
                <p className="text-xs text-ink/40 mt-1">This will be visible to others in the Circle.</p>
            </div>

            <button onClick={enter} className="btn-primary w-full text-base py-3">
                {avatar} {t('circle.choose.enter')}
            </button>
        </div>
    );
}

export function Community() {
    const { t } = useT();
    const [myName, setMyName] = useState<string | null>(null);
    const [myAvatar, setMyAvatar] = useState<string>('🌷');
    const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
    const [topicFilter, setTopicFilter] = useState('All');
    const [newText, setNewText] = useState('');
    const [newTopic, setNewTopic] = useState('General');
    const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
    const [editId, setEditId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    // If no nickname yet, show the chooser
    if (!myName) {
        return <NicknameChooser onEnter={(name, avatar) => { setMyName(name); setMyAvatar(avatar); }} />;
    }

    const filtered = topicFilter === 'All' ? posts : posts.filter(p => p.topic === topicFilter);

    function addPost() {
        if (!newText.trim()) return;
        const p: Post = {
            id: Date.now().toString(), author: myName!, avatar: myAvatar,
            text: newText.trim(), time: 'just now', topic: newTopic,
            likes: 0, liked: false, comments: [], showComments: false, isOwn: true,
        };
        setPosts([p, ...posts]);
        setNewText('');
    }

    function deletePost(id: string) {
        setPosts(posts.filter(p => p.id !== id));
    }

    function startEdit(p: Post) {
        setEditId(p.id);
        setEditText(p.text);
    }

    function saveEdit(id: string) {
        if (!editText.trim()) return;
        setPosts(posts.map(p => p.id === id ? { ...p, text: editText.trim() } : p));
        setEditId(null);
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
        const comment: Comment = { id: Date.now().toString(), author: myName!, text, time: 'just now' };
        setPosts(posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p));
        setCommentDrafts({ ...commentDrafts, [postId]: '' });
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-10">
            {/* Header */}
            <div className="mb-5 rounded-[2rem] bg-gradient-to-br from-[#f2ecff] via-[#fff8fc] to-[#fcecf4] p-5 sm:p-7">
                <div className="mb-3 flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-primary shadow-sm"><Users size={21} /></span>
                    <p className="text-xs font-semibold uppercase tracking-[.15em] text-primary/70">A softer space to share</p>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t('circle.title')}</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-ink/65">Connect with people who understand. Share at your pace, with a nickname that feels right.</p>
            </div>
            <div className="mb-5 flex items-start gap-2 rounded-2xl border border-primary/10 bg-white/80 p-3 text-sm text-primary">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                <span>{t('circle.body')} {t('circle.my.post')}: <strong>{myAvatar} {myName}</strong></span>
            </div>
            <p className="text-xs text-ink/50 mb-4">⚠️ Peers are not medical professionals. For medical emergencies, use <Link to="/sos" className="text-primary underline">Period SOS</Link>.</p>

            {/* New post */}
            <div className="card mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{myAvatar}</span>
                    <span className="text-sm font-medium text-primary">{myName}</span>
                    <span className="text-xs text-ink/40 ml-auto">Posting as you</span>
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
                {TOPICS.map(tpc => (
                    <button key={tpc} onClick={() => setTopicFilter(tpc)}
                        className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${topicFilter === tpc ? 'bg-primary text-white' : 'bg-soft text-primary hover:bg-lavender/30'}`}>
                        {tpc}
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
                    <div key={p.id} className="card transition-shadow hover:shadow-md">
                        {/* Author + time */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{p.avatar}</span>
                            <div>
                                <p className="text-sm font-semibold">{p.author} {p.isOwn && <span className="ml-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">{t('circle.my.post')}</span>}</p>
                                <p className="text-xs text-ink/40">{p.time}</p>
                            </div>
                            <span className="ml-auto rounded-full bg-soft px-2 py-0.5 text-xs text-primary">{p.topic}</span>
                        </div>

                        {/* Post text — editable if own */}
                        {editId === p.id ? (
                            <div className="mb-3">
                                <textarea rows={3} value={editText} onChange={e => setEditText(e.target.value)}
                                    className="input py-2 resize-none mb-2" maxLength={280} />
                                <div className="flex gap-2">
                                    <button onClick={() => saveEdit(p.id)} className="btn-primary px-3 min-h-0 h-9">
                                        <Check size={14} /> {t('circle.edit.save')}
                                    </button>
                                    <button onClick={() => setEditId(null)} className="btn-ghost px-3 min-h-0 h-9">
                                        <X size={14} /> {t('circle.edit.cancel')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm leading-relaxed mb-3">{p.text}</p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3 text-sm flex-wrap">
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
                            {/* Edit / Delete — only own posts */}
                            {p.isOwn && editId !== p.id && (
                                <>
                                    <button onClick={() => startEdit(p)}
                                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-ink/50 hover:text-primary hover:bg-soft transition-all">
                                        <Pencil size={14} /> {t('circle.edit')}
                                    </button>
                                    <button onClick={() => deletePost(p.id)}
                                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-ink/50 hover:text-red-500 hover:bg-red-50 transition-all">
                                        <Trash2 size={14} /> {t('circle.delete')}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Comments */}
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
                                        placeholder="Reply…" className="input text-sm h-10" maxLength={200}
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
