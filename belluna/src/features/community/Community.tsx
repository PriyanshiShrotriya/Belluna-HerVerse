import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Send, Users, ShieldCheck, PlusCircle, Pencil, Trash2, Check, X, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/t';
import { chatService } from './chatService';
import type {
    ChatRoom,
    CommunityReportReason,
    HiddenCommunityContent,
    ModerationReport,
} from './chatService';
import {
    createCommunityPost,
    isCommunityTopic,
    loadCommunityFeed,
    mergePersistedPosts,
    roomForCommunityTopic,
    type CommunityFeedPost as Post,
    type CommunityTopic,
} from './communityFeed';

const ADJECTIVES = ['Purple', 'Silver', 'Golden', 'Quiet', 'Brave', 'Gentle', 'Cosmic', 'Bright', 'Calm', 'Wise', 'Soft', 'Strong', 'Kind', 'Free', 'Bold'];
const NOUNS = ['Moon', 'River', 'Star', 'Bloom', 'Wave', 'Light', 'Rose', 'Bird', 'Cloud', 'Storm', 'Leaf', 'Pearl', 'Flame', 'Dream', 'Voice'];
const AVATARS = ['🌷', '🌙', '⭐', '🌸', '🦋', '🌊', '🌺', '🍃', '✨', '🌻', '💜', '🌹', '🕊️', '🌈', '🫧'];
const TOPICS = ['All', 'PCOS', 'Period Health', 'Mental Health', 'Nutrition', 'General'] as const;

function randName() { return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] + NOUNS[Math.floor(Math.random() * NOUNS.length)]; }
function randAvatar() { return AVATARS[Math.floor(Math.random() * AVATARS.length)]; }

function isCommunityReportReason(value: string): value is CommunityReportReason {
    return ['harassment', 'spam', 'unsafe_advice', 'personal_info', 'other'].includes(value);
}

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
    const [posts, setPosts] = useState<Post[]>([]);
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [persistenceLoading, setPersistenceLoading] = useState(true);
    const [feedError, setFeedError] = useState('');
    const [persistenceError, setPersistenceError] = useState('');
    const [persistenceSuccess, setPersistenceSuccess] = useState('');
    const [reportingTarget, setReportingTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);
    const [reportReason, setReportReason] = useState<CommunityReportReason>('harassment');
    const [isModerator, setIsModerator] = useState(false);
    const [moderationLoading, setModerationLoading] = useState(false);
    const [moderationError, setModerationError] = useState('');
    const [moderationReports, setModerationReports] = useState<ModerationReport[]>([]);
    const [hiddenContent, setHiddenContent] = useState<HiddenCommunityContent[]>([]);
    const [sending, setSending] = useState(false);
    const sendLock = useRef(false);
    const likeLocks = useRef(new Set<string>());
    const commentLocks = useRef(new Set<string>());
    const reportLocks = useRef(new Set<string>());
    const moderationLock = useRef(false);
    const [topicFilter, setTopicFilter] = useState('All');
    const [newText, setNewText] = useState('');
    const [newTopic, setNewTopic] = useState<CommunityTopic>('General');
    const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
    const [editId, setEditId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function loadPersistedPosts() {
            setPersistenceLoading(true);
            setFeedError('');
            try {
                const loaded = await loadCommunityFeed();
                if (cancelled) return;
                setRooms(loaded.rooms);
                setPosts(loaded.posts);
            } catch (error) {
                if (!cancelled) {
                    setFeedError(error instanceof Error ? error.message : 'Could not load community posts.');
                }
            } finally {
                if (!cancelled) setPersistenceLoading(false);
            }
        }
        void loadPersistedPosts();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function loadModeratorInbox() {
            try {
                const moderator = await chatService.isModerator();
                if (cancelled) return;
                setIsModerator(moderator);
                if (!moderator) return;

                setModerationLoading(true);
                const [reports, hiddenItems] = await Promise.all([
                    chatService.listModerationReports(),
                    chatService.listHiddenCommunityContent(),
                ]);
                if (!cancelled) {
                    setModerationReports(reports);
                    setHiddenContent(hiddenItems);
                }
            } catch (error) {
                if (!cancelled) {
                    setModerationError(error instanceof Error
                        ? error.message
                        : 'Could not load moderator access.');
                }
            } finally {
                if (!cancelled) setModerationLoading(false);
            }
        }
        void loadModeratorInbox();
        return () => { cancelled = true; };
    }, []);

    // If no nickname yet, show the chooser
    if (!myName) {
        return <NicknameChooser onEnter={(name, avatar) => { setMyName(name); setMyAvatar(avatar); }} />;
    }

    const filtered = topicFilter === 'All' ? posts : posts.filter(p => p.topic === topicFilter);

    async function addPost() {
        const body = newText.trim();
        if (!body || sendLock.current) return;
        const room = roomForCommunityTopic(newTopic, rooms);
        if (!room) {
            setPersistenceError(`Posts for "${newTopic}" are not supported by the available community rooms.`);
            return;
        }
        sendLock.current = true;
        setSending(true);
        setPersistenceError('');
        setPersistenceSuccess('');
        try {
            const savedPost = await createCommunityPost(newTopic, body, rooms);
            setPosts((current) => mergePersistedPosts(current, [savedPost]));
            setNewText('');
            setPersistenceSuccess('Post saved.');
            try {
                const loaded = await loadCommunityFeed();
                setRooms(loaded.rooms);
                setPosts(loaded.posts);
                setFeedError('');
            } catch (error) {
                setPersistenceError(error instanceof Error
                    ? `Post saved, but the feed could not be refreshed: ${error.message}`
                    : 'Post saved, but the feed could not be refreshed.');
            }
        } catch (error) {
            setPersistenceError(error instanceof Error ? error.message : 'Could not save this post.');
        } finally {
            sendLock.current = false;
            setSending(false);
        }
    }

    function deletePost(id: string) {
        if (posts.find((post) => post.id === id)?.isPersisted) {
            setPersistenceError('Saved chat messages cannot be deleted with the current database policy.');
            return;
        }
        setPosts(posts.filter(p => p.id !== id));
    }

    function startEdit(p: Post) {
        setEditId(p.id);
        setEditText(p.text);
    }

    function saveEdit(id: string) {
        if (posts.find((post) => post.id === id)?.isPersisted) {
            setPersistenceError('Saved chat messages cannot be edited with the current database policy.');
            return;
        }
        if (!editText.trim()) return;
        setPosts(posts.map(p => p.id === id ? { ...p, text: editText.trim() } : p));
        setEditId(null);
    }

    async function toggleLike(id: string) {
        const post = posts.find((item) => item.id === id);
        if (!post?.isPersisted) {
            setPersistenceError('Likes can only be changed on saved community posts.');
            return;
        }
        if (likeLocks.current.has(id)) return;
        likeLocks.current.add(id);
        try {
            const engagement = post.liked
                ? await chatService.unlikePost(id)
                : await chatService.likePost(id);
            setPosts((current) => current.map((item) => item.id === id
                ? { ...item, likes: engagement.likeCount, liked: engagement.likedByMe }
                : item));
            setPersistenceError('');
        } catch (error) {
            setPersistenceError(error instanceof Error ? error.message : 'Could not update this like.');
        } finally {
            likeLocks.current.delete(id);
        }
    }

    async function toggleComments(id: string) {
        const post = posts.find((item) => item.id === id);
        if (!post) return;
        setPosts((current) => current.map((item) => item.id === id
            ? { ...item, showComments: !item.showComments }
            : item));
        if (!post.isPersisted || post.commentsLoaded || post.showComments || commentLocks.current.has(id)) return;

        commentLocks.current.add(id);
        setPosts((current) => current.map((item) => item.id === id
            ? { ...item, commentsLoading: true }
            : item));
        try {
            const loadedComments = await chatService.listPostComments(id);
            setPosts((current) => current.map((item) => item.id === id
                ? {
                    ...item,
                    comments: loadedComments.map((comment) => ({
                        id: comment.id,
                        author: comment.author,
                        text: comment.body,
                        time: new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })
                            .format(new Date(comment.createdAt)),
                    })),
                    commentCount: loadedComments.length,
                    commentsLoaded: true,
                    commentsLoading: false,
                }
                : item));
            setPersistenceError('');
        } catch (error) {
            setPosts((current) => current.map((item) => item.id === id
                ? { ...item, commentsLoading: false }
                : item));
            setPersistenceError(error instanceof Error ? error.message : 'Could not load comments.');
        } finally {
            commentLocks.current.delete(id);
        }
    }

    async function addComment(postId: string) {
        const post = posts.find((item) => item.id === postId);
        if (!post?.isPersisted) {
            setPersistenceError('Comments can only be added to saved community posts.');
            return;
        }
        if (!post.commentsLoaded) {
            setPersistenceError('Load this post\'s comments before adding a comment.');
            return;
        }
        const text = commentDrafts[postId]?.trim();
        if (!text || commentLocks.current.has(postId)) return;
        commentLocks.current.add(postId);
        try {
            const comment = await chatService.createComment(postId, text);
            setPosts((current) => current.map((item) => item.id === postId
                ? {
                    ...item,
                    comments: item.comments.some((existing) => existing.id === comment.id)
                        ? item.comments
                        : [...item.comments, {
                            id: comment.id,
                            author: comment.author,
                            text: comment.body,
                            time: new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })
                                .format(new Date(comment.createdAt)),
                        }],
                    commentCount: item.commentCount + (item.comments.some((existing) => existing.id === comment.id) ? 0 : 1),
                    commentsLoaded: true,
                }
                : item));
            setCommentDrafts((current) => ({ ...current, [postId]: '' }));
            setPersistenceError('');
        } catch (error) {
            setPersistenceError(error instanceof Error ? error.message : 'Could not save this comment.');
        } finally {
            commentLocks.current.delete(postId);
        }
    }

    async function submitReport(contentType: 'post' | 'comment', targetId: string) {
        const lockKey = `${contentType}:${targetId}`;
        if (reportLocks.current.has(lockKey)) return;
        reportLocks.current.add(lockKey);
        setPersistenceError('');
        setPersistenceSuccess('');
        try {
            await chatService.reportContent(contentType, targetId, reportReason);
            setReportingTarget(null);
            setPersistenceSuccess('Report submitted for moderator review.');
        } catch (error) {
            setPersistenceError(error instanceof Error ? error.message : 'Your report could not be submitted.');
        } finally {
            reportLocks.current.delete(lockKey);
        }
    }

    async function moderateReport(
        report: ModerationReport,
        resolution: 'resolved' | 'dismissed',
        hidden: boolean
    ) {
        if (moderationLock.current) return;
        moderationLock.current = true;
        setModerationError('');
        try {
            await chatService.reviewModerationReport(report, resolution, hidden);
            setModerationReports((current) => current.filter((item) => item.id !== report.id
                || item.contentType !== report.contentType));
            try {
                const hiddenItems = await chatService.listHiddenCommunityContent();
                setHiddenContent(hiddenItems);
                const loaded = await loadCommunityFeed();
                setRooms(loaded.rooms);
                setPosts((current) => loaded.posts.map((post) => {
                    const existing = current.find((item) => item.id === post.id);
                    return existing
                        ? { ...post, comments: existing.comments, commentsLoaded: existing.commentsLoaded,
                            commentsLoading: false, showComments: existing.showComments }
                        : post;
                }));
                if (report.contentType === 'comment') {
                    const loadedComments = await chatService.listPostComments(report.postId);
                    setPosts((current) => current.map((post) => post.id === report.postId
                        ? {
                            ...post,
                            comments: loadedComments.map((comment) => ({
                                id: comment.id,
                                author: comment.author,
                                text: comment.body,
                                time: new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })
                                    .format(new Date(comment.createdAt)),
                            })),
                            commentCount: loadedComments.length,
                            commentsLoaded: true,
                        }
                        : post));
                }
            } catch (error) {
                setModerationError(error instanceof Error
                    ? `Moderation action saved, but content could not be refreshed: ${error.message}`
                    : 'Moderation action saved, but content could not be refreshed.');
            }
        } catch (error) {
            setModerationError(error instanceof Error ? error.message : 'Could not apply this moderation action.');
        } finally {
            moderationLock.current = false;
        }
    }

    async function restoreHiddenContent(content: HiddenCommunityContent) {
        if (moderationLock.current) return;
        moderationLock.current = true;
        setModerationError('');
        try {
            await chatService.setCommunityContentVisibility(content.contentType, content.targetId, false);
            setHiddenContent((current) => current.filter((item) =>
                item.contentType !== content.contentType || item.targetId !== content.targetId));
            const [hiddenItems, loaded] = await Promise.all([
                chatService.listHiddenCommunityContent(),
                loadCommunityFeed(),
            ]);
            setHiddenContent(hiddenItems);
            setRooms(loaded.rooms);
            setPosts((current) => loaded.posts.map((post) => {
                const existing = current.find((item) => item.id === post.id);
                return existing
                    ? { ...post, comments: existing.comments, commentsLoaded: existing.commentsLoaded,
                        commentsLoading: false, showComments: existing.showComments }
                    : post;
            }));
        } catch (error) {
            setModerationError(error instanceof Error
                ? error.message
                : 'Could not restore this content.');
        } finally {
            moderationLock.current = false;
        }
    }

    function reportControl(contentType: 'post' | 'comment', targetId: string) {
        const active = reportingTarget?.type === contentType && reportingTarget.id === targetId;
        return (
            <span className="inline-flex items-center gap-1">
                <button
                    type="button"
                    aria-label={`Report ${contentType}`}
                    onClick={() => {
                        setPersistenceError('');
                        setReportingTarget(active ? null : { type: contentType, id: targetId });
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ink/40 hover:bg-soft hover:text-primary"
                >
                    <Flag size={13} /> Report
                </button>
                {active && (
                    <span className="inline-flex items-center gap-1">
                        <select
                            aria-label="Report reason"
                            value={reportReason}
                            onChange={(event) => {
                                if (isCommunityReportReason(event.target.value)) {
                                    setReportReason(event.target.value);
                                }
                            }}
                            className="input h-8 w-auto py-0 text-xs"
                        >
                            <option value="harassment">Harassment</option>
                            <option value="spam">Spam</option>
                            <option value="unsafe_advice">Unsafe advice</option>
                            <option value="personal_info">Personal information</option>
                            <option value="other">Other</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => void submitReport(contentType, targetId)}
                            disabled={reportLocks.current.has(`${contentType}:${targetId}`)}
                            className="btn-primary h-8 min-h-0 px-2 text-xs"
                        >
                            Send
                        </button>
                    </span>
                )}
            </span>
        );
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
                    <select value={newTopic} onChange={e => {
                        if (isCommunityTopic(e.target.value)) setNewTopic(e.target.value);
                    }} className="input w-auto text-sm">
                        {TOPICS.filter(t => t !== 'All').map(t => <option key={t}>{t}</option>)}
                    </select>
                    <span className="text-xs text-ink/40 ml-auto">{280 - newText.length} left</span>
                    <button onClick={() => void addPost()} disabled={!newText.trim() || sending || persistenceLoading} className="btn-primary">
                        <PlusCircle size={16} />{sending ? 'Saving…' : 'Post'}
                    </button>
                </div>
                {persistenceLoading && <p role="status" className="mt-3 text-xs text-ink/50">Loading saved posts…</p>}
                {persistenceError && <p role="alert" className="mt-3 text-sm text-red-700">{persistenceError}</p>}
                {persistenceSuccess && <p role="status" className="mt-3 text-sm text-green-700">{persistenceSuccess}</p>}
                {!persistenceLoading && !roomForCommunityTopic(newTopic, rooms) && (
                    <p className="mt-3 text-xs text-ink/50">
                        {newTopic} does not have a matching community room, so posts in this topic cannot be saved.
                    </p>
                )}
            </div>

            {isModerator && (
                <section className="card mb-6" aria-label="Community moderation reports">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-ink">Moderator reports</h2>
                        {moderationLoading && <span className="text-xs text-ink/50" role="status">Loading…</span>}
                    </div>
                    {moderationError && <p className="mb-3 text-sm text-red-700" role="alert">{moderationError}</p>}
                    {!moderationLoading && moderationReports.length === 0 && (
                        <p className="text-sm text-ink/50">No open reports.</p>
                    )}
                    <div className="space-y-3">
                        {moderationReports.map((report) => (
                            <article key={`${report.contentType}:${report.id}`} className="rounded-xl border border-soft p-3">
                                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink/50">
                                    <span className="font-semibold text-primary">{report.contentType} report</span>
                                    <span>{report.reason.replace(/_/g, ' ')}</span>
                                    <time className="ml-auto">{new Date(report.createdAt).toLocaleString()}</time>
                                </div>
                                {report.context && (
                                    <p className="mb-2 text-xs text-ink/50">On post: {report.context}</p>
                                )}
                                <p className="mb-3 whitespace-pre-wrap text-sm text-ink">{report.content}</p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void moderateReport(report, 'resolved', !report.isHidden)}
                                        className="btn-primary h-8 min-h-0 px-3 text-xs"
                                    >
                                        {report.isHidden ? 'Restore & resolve' : 'Hide & resolve'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void moderateReport(report, 'dismissed', report.isHidden)}
                                        className="btn-ghost h-8 min-h-0 px-3 text-xs"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                    <div className="mt-5 border-t border-soft pt-4">
                        <h3 className="mb-3 text-sm font-semibold text-ink">Hidden content</h3>
                        {!moderationLoading && hiddenContent.length === 0 && (
                            <p className="text-sm text-ink/50">No hidden content.</p>
                        )}
                        <div className="space-y-3">
                            {hiddenContent.map((item) => (
                                <article
                                    key={`hidden:${item.contentType}:${item.targetId}`}
                                    className="rounded-xl border border-soft p-3"
                                >
                                    <p className="mb-2 text-xs font-semibold text-primary">
                                        Hidden {item.contentType}
                                    </p>
                                    {item.context && (
                                        <p className="mb-2 text-xs text-ink/50">On post: {item.context}</p>
                                    )}
                                    <p className="mb-3 whitespace-pre-wrap text-sm text-ink">{item.content}</p>
                                    <button
                                        type="button"
                                        onClick={() => void restoreHiddenContent(item)}
                                        disabled={moderationLock.current}
                                        className="btn-primary h-8 min-h-0 px-3 text-xs"
                                    >
                                        Restore
                                    </button>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            )}

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
                {!persistenceLoading && !feedError && filtered.length === 0 && (
                    <div className="card text-center py-10 text-ink/50">
                        <Users size={36} className="mx-auto mb-3 text-lavender" />
                        <p>No posts in this topic yet. Be the first!</p>
                    </div>
                )}
                {persistenceLoading && (
                    <div className="card text-center py-10 text-ink/50" role="status">
                        Loading community posts…
                    </div>
                )}
                {feedError && (
                    <div className="card text-center py-10 text-red-700" role="alert">
                        {feedError}
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
                            <button onClick={() => void toggleLike(p.id)}
                                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-all ${p.liked ? 'text-[#B42318] font-semibold' : 'text-ink/60 hover:text-primary hover:bg-soft'}`}>
                                <Heart size={16} fill={p.liked ? '#B42318' : 'none'} />
                                {p.likes > 0 && p.likes}
                            </button>
                            <button onClick={() => void toggleComments(p.id)}
                                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-ink/60 hover:text-primary hover:bg-soft transition-all">
                                <MessageCircle size={16} />
                                {p.commentCount > 0 && p.commentCount}
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
                            {p.isPersisted && reportControl('post', p.id)}
                        </div>

                        {/* Comments */}
                        {p.showComments && (
                            <div className="mt-4 border-t border-soft pt-4 space-y-3">
                                {p.commentsLoading && <p className="text-xs text-ink/40" role="status">Loading comments…</p>}
                                {p.comments.map(c => (
                                    <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                                        <span className="text-ink/40 font-medium shrink-0">{c.author}:</span>
                                        <span className="text-ink/80">{c.text}</span>
                                        <span className="ml-auto text-xs text-ink/30 shrink-0">{c.time}</span>
                                        {reportControl('comment', c.id)}
                                    </div>
                                ))}
                                {!p.commentsLoading && p.comments.length === 0 && <p className="text-xs text-ink/40">No comments yet. Be the first!</p>}
                                <div className="flex gap-2 mt-3">
                                    <input value={commentDrafts[p.id] ?? ''} onChange={e => setCommentDrafts({ ...commentDrafts, [p.id]: e.target.value })}
                                        placeholder="Reply…" className="input text-sm h-10" maxLength={200}
                                        onKeyDown={e => e.key === 'Enter' && void addComment(p.id)} />
                                    <button onClick={() => void addComment(p.id)} disabled={!commentDrafts[p.id]?.trim() || !p.commentsLoaded || p.commentsLoading || commentLocks.current.has(p.id)} className="btn-primary px-3 min-h-0 h-10"><Send size={14} /></button>
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
