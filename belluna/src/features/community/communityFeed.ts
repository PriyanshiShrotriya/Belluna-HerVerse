import { chatService, type ChatMessage, type ChatRoom, type PostEngagement } from './chatService';
import { anonymousAlias } from './anonymousIdentity';
export { anonymousAlias } from './anonymousIdentity';

export type CommunityTopic =
    | 'PCOS'
    | 'Period Health'
    | 'Mental Health'
    | 'Nutrition'
    | 'General';

export type CommunityFeedPost = {
    id: string;
    author: string;
    avatar: string;
    text: string;
    time: string;
    topic: string;
    likes: number;
    liked: boolean;
    commentCount: number;
    comments: { id: string; author: string; text: string; time: string }[];
    commentsLoaded?: boolean;
    commentsLoading?: boolean;
    showComments: boolean;
    isOwn?: boolean;
    isPersisted?: boolean;
};

export const TOPIC_ROOM_SLUGS: Record<CommunityTopic, string | null> = {
    PCOS: 'pcos',
    'Period Health': 'menstrual-health',
    'Mental Health': 'emotional-wellbeing',
    Nutrition: 'nutrition',
    General: 'general',
};

export function isCommunityTopic(value: string): value is CommunityTopic {
    return Object.prototype.hasOwnProperty.call(TOPIC_ROOM_SLUGS, value);
}

const ROOM_TOPICS: Record<string, string> = {
    pcos: 'PCOS',
    'menstrual-health': 'Period Health',
    'emotional-wellbeing': 'Mental Health',
    nutrition: 'Nutrition',
    general: 'General',
};

function relativeTime(createdAt: string): string {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    if (elapsed < 60_000) return 'just now';
    if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
    if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
    return `${Math.floor(elapsed / 86_400_000)}d ago`;
}

export function toCommunityFeedPost(
    message: ChatMessage,
    room: ChatRoom,
    currentUserHandle: string
): CommunityFeedPost {
    return {
        id: message.id,
        author: anonymousAlias(message.authorHandle),
        avatar: '🌙',
        text: message.body,
        time: relativeTime(message.createdAt),
        topic: ROOM_TOPICS[room.slug] ?? room.titleEn,
        likes: 0,
        liked: false,
        commentCount: 0,
        comments: [],
        commentsLoaded: false,
        commentsLoading: false,
        showComments: false,
        isOwn: message.authorHandle === currentUserHandle,
        isPersisted: true,
    };
}

export function mergePersistedPosts(
    current: CommunityFeedPost[],
    persisted: CommunityFeedPost[]
): CommunityFeedPost[] {
    const ids = new Set(persisted.map((post) => post.id));
    return [
        ...persisted,
        ...current.filter((post) => post.isPersisted && !ids.has(post.id)),
    ];
}

export async function loadCommunityFeed(): Promise<{
    rooms: ChatRoom[];
    posts: CommunityFeedPost[];
    engagementError?: string;
}> {
    const rooms = await chatService.listRooms();
    const currentUserHandle = await chatService.currentUserHandle();
    const roomMessages = await Promise.all(
        rooms.map(async (room) => ({
            room,
            messages: await chatService.listMessages(room.id),
        }))
    );
    const messages = roomMessages.flatMap(({ room, messages: roomRows }) =>
        roomRows.map((message) => ({ room, message }))
    );
    let engagement: Record<string, PostEngagement> = {};
    let engagementError: string | undefined;
    try {
        engagement = await chatService.getPostEngagement(messages.map(({ message }) => message.id));
    } catch (error) {
        engagementError = error instanceof Error
            ? error.message
            : 'Could not load post likes and comment counts.';
    }
    return {
        rooms,
        engagementError,
        posts: messages.map(({ room, message }) => {
            const post = toCommunityFeedPost(message, room, currentUserHandle);
            const summary = engagement[message.id];
            return summary
                ? { ...post, likes: summary.likeCount, liked: summary.likedByMe, commentCount: summary.commentCount }
                : post;
        }),
    };
}

export function roomForCommunityTopic(
    topic: CommunityTopic,
    rooms: ChatRoom[]
): ChatRoom | undefined {
    const slug = TOPIC_ROOM_SLUGS[topic];
    return slug ? rooms.find((room) => room.slug === slug) : undefined;
}

export async function createCommunityPost(
    topic: CommunityTopic,
    body: string,
    rooms: ChatRoom[]
): Promise<CommunityFeedPost> {
    const room = roomForCommunityTopic(topic, rooms);
    if (!room) {
        throw new Error(`Posts for "${topic}" are not supported by the available community rooms.`);
    }
    const message = await chatService.sendMessage(room.id, body);
    return toCommunityFeedPost(message, room, message.authorHandle);
}
