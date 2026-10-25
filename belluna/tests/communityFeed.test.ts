import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUserHandle: vi.fn(),
  getPostEngagement: vi.fn(),
  listMessages: vi.fn(),
  listRooms: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('../src/features/community/chatService', () => ({
  chatService: {
    currentUserHandle: mocks.currentUserHandle,
    getPostEngagement: mocks.getPostEngagement,
    listMessages: mocks.listMessages,
    listRooms: mocks.listRooms,
    sendMessage: mocks.sendMessage,
  },
}));

import {
  anonymousAlias,
  createCommunityPost,
  isCommunityTopic,
  loadCommunityFeed,
  mergePersistedPosts,
  roomForCommunityTopic,
  toCommunityFeedPost,
} from '../src/features/community/communityFeed';
import type { ChatMessage, ChatRoom } from '../src/features/community/chatService';

const rooms: ChatRoom[] = [
  {
    id: 'room-pcos-uuid',
    slug: 'pcos',
    titleEn: 'PCOS Support',
    titleHi: 'पीसीओएस सहायता',
    isActive: true,
  },
  {
    id: 'room-period-uuid',
    slug: 'menstrual-health',
    titleEn: 'Menstrual Health',
    titleHi: 'मासिक धर्म स्वास्थ्य',
    isActive: true,
  },
  {
    id: 'room-mental-uuid',
    slug: 'emotional-wellbeing',
    titleEn: 'Emotional Wellbeing',
    titleHi: 'भावनात्मक स्वास्थ्य',
    isActive: true,
  },
  {
    id: 'room-reproductive-uuid',
    slug: 'reproductive-health',
    titleEn: 'Reproductive Health',
    titleHi: 'प्रजनन स्वास्थ्य',
    isActive: true,
  },
  {
    id: 'room-nutrition-uuid',
    slug: 'nutrition',
    titleEn: 'Nutrition',
    titleHi: 'पोषण',
    isActive: true,
  },
  {
    id: 'room-general-uuid',
    slug: 'general',
    titleEn: 'General',
    titleHi: 'सामान्य',
    isActive: true,
  },
];

const message: ChatMessage = {
  id: 'message-1',
  roomId: 'room-pcos-uuid',
  authorHandle: 'belluna_private_handle',
  body: 'A persisted community message',
  createdAt: '2026-10-25T09:00:00.000Z',
};

describe('community feed persistence mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listRooms.mockResolvedValue(rooms);
    mocks.currentUserHandle.mockResolvedValue('belluna_private_handle');
    mocks.getPostEngagement.mockResolvedValue({});
    mocks.listMessages.mockImplementation(async (roomId: string) => [{
      ...message,
      id: `message-${roomId}`,
      roomId,
    }]);
  });

  it('loads persisted messages from each active room without sample posts', async () => {
    mocks.getPostEngagement.mockResolvedValue({
      [`message-${rooms[0].id}`]: {
        likeCount: 4,
        likedByMe: true,
        commentCount: 2,
      },
    });

    const feed = await loadCommunityFeed();

    expect(feed.rooms).toEqual(rooms);
    expect(mocks.listMessages).toHaveBeenCalledTimes(rooms.length);
    expect(mocks.listMessages).toHaveBeenCalledWith('room-pcos-uuid');
    expect(feed.posts).toHaveLength(rooms.length);
    expect(feed.posts[0]).toMatchObject({
      id: 'message-room-pcos-uuid',
      text: message.body,
      topic: 'PCOS',
      likes: 4,
      liked: true,
      commentCount: 2,
      isPersisted: true,
    });
    expect(mocks.getPostEngagement).toHaveBeenCalledWith(
      rooms.map((room) => `message-${room.id}`)
    );
  });

  it('keeps loaded rooms and posts available when engagement loading fails', async () => {
    mocks.getPostEngagement.mockRejectedValue(
      new Error('Could not load post likes and comment counts. Please try again.')
    );

    const feed = await loadCommunityFeed();

    expect(feed.rooms).toEqual(rooms);
    expect(feed.posts).toHaveLength(rooms.length);
    expect(feed.posts[0]).toMatchObject({
      topic: 'PCOS',
      isPersisted: true,
      likes: 0,
      commentCount: 0,
    });
    expect(feed.engagementError).toContain('Could not load post likes and comment counts.');
  });

  it('maps every UI topic explicitly and leaves unsupported topics unmapped', () => {
    expect(roomForCommunityTopic('PCOS', rooms)?.id).toBe('room-pcos-uuid');
    expect(roomForCommunityTopic('Period Health', rooms)?.id).toBe('room-period-uuid');
    expect(roomForCommunityTopic('Mental Health', rooms)?.id).toBe('room-mental-uuid');
    expect(roomForCommunityTopic('Nutrition', rooms)?.id).toBe('room-nutrition-uuid');
    expect(roomForCommunityTopic('General', rooms)?.id).toBe('room-general-uuid');
    expect(isCommunityTopic('All')).toBe(false);
    expect(isCommunityTopic('General')).toBe(true);
  });

  it('uses a stable anonymous alias without displaying the database handle', () => {
    const alias = anonymousAlias(message.authorHandle);
    const room = rooms[0];
    const post = toCommunityFeedPost(message, room, message.authorHandle);

    expect(alias).toMatch(/^Anonymous [A-Za-z]+ [a-z0-9]+$/);
    expect(anonymousAlias(message.authorHandle)).toBe(alias);
    expect(post.author).toBe(alias);
    expect(post.author).not.toContain(message.authorHandle);
    expect(post.isOwn).toBe(true);
  });

  it('keeps messages from unrepresented rooms labeled with their database room name', () => {
    const reproductiveRoom = rooms[3];
    const post = toCommunityFeedPost({
      ...message,
      roomId: reproductiveRoom.id,
    }, reproductiveRoom, message.authorHandle);

    expect(post.topic).toBe('Reproductive Health');
    expect(post.topic).not.toBe('General');
  });

  it('posts to the mapped database room and returns only the confirmed message', async () => {
    mocks.sendMessage.mockResolvedValue(message);

    const post = await createCommunityPost('PCOS', message.body, rooms);

    expect(mocks.sendMessage).toHaveBeenCalledWith('room-pcos-uuid', message.body);
    expect(post).toMatchObject({
      id: message.id,
      text: message.body,
      topic: 'PCOS',
      isPersisted: true,
    });
  });

  it.each([
    ['PCOS', 'room-pcos-uuid'],
    ['Period Health', 'room-period-uuid'],
    ['Mental Health', 'room-mental-uuid'],
    ['Nutrition', 'room-nutrition-uuid'],
    ['General', 'room-general-uuid'],
  ] as const)('posts %s to its matching database room', async (topic, roomId) => {
    mocks.sendMessage.mockImplementation(async (roomId: string, body: string) => ({
      ...message,
      id: `message-${roomId}`,
      roomId,
      body,
    }));

    const post = await createCommunityPost(topic, `${topic} topic`, rooms);

    expect(mocks.sendMessage).toHaveBeenCalledWith(roomId, `${topic} topic`);
    expect(post).toMatchObject({ topic, text: `${topic} topic`, isPersisted: true });
  });

  it('rejects topics without a corresponding active room and failed saves', async () => {
    await expect(createCommunityPost('Nutrition', message.body, []))
      .rejects.toThrow('Posts for "Nutrition" are not supported');
    expect(mocks.sendMessage).not.toHaveBeenCalled();

    mocks.sendMessage.mockRejectedValue(new Error('Message could not be sent.'));
    await expect(createCommunityPost('PCOS', message.body, rooms))
      .rejects.toThrow('Message could not be sent.');
  });

  it('deduplicates persisted rows when merging a newly confirmed message', () => {
    const post = toCommunityFeedPost(message, rooms[0], message.authorHandle);

    expect(mergePersistedPosts([post], [post])).toEqual([post]);
  });
});
