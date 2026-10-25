import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

import { chatService } from '../src/features/community/chatService';

const userId = 'synthetic-user-a';
const roomId = 'room-uuid-a';

function authenticatedUser() {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

describe('community chat service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticatedUser();
  });

  it('loads per-post engagement without returning any user identifiers', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        post_id: 'post-1',
        like_count: 3,
        liked_by_me: true,
        comment_count: 2,
      }],
      error: null,
    });

    await expect(chatService.getPostEngagement(['post-1', 'post-1'])).resolves.toEqual({
      'post-1': { likeCount: 3, likedByMe: true, commentCount: 2 },
    });
    expect(mocks.rpc).toHaveBeenCalledWith('get_community_post_engagement', {
      requested_post_ids: ['post-1'],
    });
  });

  it('surfaces engagement summary failures', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'RPC unavailable' } });

    await expect(chatService.getPostEngagement(['post-1']))
      .rejects.toThrow('Could not load post likes and comment counts.');
  });

  it('confirms a like after insert and handles a duplicate without creating another', async () => {
    const likeQuery = { insert: vi.fn() };
    likeQuery.insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } });
    mocks.from.mockReturnValue(likeQuery);
    mocks.rpc.mockResolvedValue({
      data: [{
        post_id: 'post-1',
        like_count: 1,
        liked_by_me: true,
        comment_count: 0,
      }],
      error: null,
    });

    await expect(chatService.likePost('post-1')).resolves.toEqual({
      likeCount: 1,
      likedByMe: true,
      commentCount: 0,
    });
    expect(likeQuery.insert).toHaveBeenCalledWith({ post_id: 'post-1' });
    expect(likeQuery.insert.mock.calls[0][0]).not.toHaveProperty('user_id');
    expect(likeQuery.insert.mock.calls[0][0]).not.toHaveProperty('author_id');
  });

  it('treats a like ownership violation as a failed operation', async () => {
    const likeQuery = { insert: vi.fn() };
    likeQuery.insert.mockResolvedValue({ error: { code: '42501', message: 'row-level security' } });
    mocks.from.mockReturnValue(likeQuery);

    await expect(chatService.likePost('post-1')).rejects.toThrow('Could not like this post.');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('reports a like as unconfirmed when its engagement refresh fails', async () => {
    const likeQuery = { insert: vi.fn().mockResolvedValue({ error: null }) };
    mocks.from.mockReturnValue(likeQuery);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'RPC unavailable' } });

    await expect(chatService.likePost('post-1'))
      .rejects.toThrow('Could not load post likes and comment counts.');
    expect(likeQuery.insert).toHaveBeenCalledWith({ post_id: 'post-1' });
    expect(mocks.rpc).toHaveBeenCalledWith('get_community_post_engagement', {
      requested_post_ids: ['post-1'],
    });
  });

  it("confirms unliking only after the database reports the user's like removed", async () => {
    const query = {
      delete: vi.fn(),
      eq: vi.fn(),
    };
    query.delete.mockReturnValue(query);
    query.eq.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue(query);
    mocks.rpc.mockResolvedValue({
      data: [{
        post_id: 'post-1',
        like_count: 0,
        liked_by_me: false,
        comment_count: 0,
      }],
      error: null,
    });

    await expect(chatService.unlikePost('post-1')).resolves.toEqual({
      likeCount: 0,
      likedByMe: false,
      commentCount: 0,
    });
    expect(query.eq).toHaveBeenCalledWith('post_id', 'post-1');
  });

  it('loads comments using aliases rather than exposing author handles', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue({
      data: [{
        id: 'comment-1',
        post_id: 'post-1',
        author_handle: 'belluna_private_handle',
        body: 'A comment',
        created_at: '2026-10-25T09:00:00.000Z',
      }],
      error: null,
    });
    mocks.from.mockReturnValue(query);

    const comments = await chatService.listPostComments('post-1');
    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({
      id: 'comment-1',
      postId: 'post-1',
      body: 'A comment',
    });
    expect(comments[0].author).toMatch(/^Anonymous /);
    expect(comments[0].author).not.toContain('belluna_private_handle');
  });

  it('surfaces a failed comments load so the feed does not treat it as empty', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });
    mocks.from.mockReturnValue(query);

    await expect(chatService.listPostComments('post-1'))
      .rejects.toThrow('Could not load comments.');
    expect(mocks.from).toHaveBeenCalledWith('chat_message_comments');
  });

  it('rejects empty comments without making a database request', async () => {
    await expect(chatService.createComment('post-1', '   '))
      .rejects.toThrow('Enter a comment before sending.');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('creates comments using server-derived ownership and returns confirmed rows', async () => {
    const inserted = {
      id: 'comment-2',
      post_id: 'post-1',
      author_handle: 'belluna_private_handle',
      body: 'Saved comment',
      created_at: '2026-10-25T09:01:00.000Z',
    };
    const query = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };
    query.insert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockResolvedValue({ data: inserted, error: null });
    mocks.from.mockReturnValue(query);

    const comment = await chatService.createComment('post-1', ' Saved comment ');
    expect(comment).toMatchObject({
      id: 'comment-2',
      postId: 'post-1',
      body: 'Saved comment',
    });
    expect(comment.author).toMatch(/^Anonymous /);
    expect(query.insert).toHaveBeenCalledWith({ post_id: 'post-1', body: 'Saved comment' });
    expect(query.insert.mock.calls[0][0]).not.toHaveProperty('author_id');
    expect(query.insert.mock.calls[0][0]).not.toHaveProperty('author_handle');
  });

  it('does not report a failed comment insert as saved', async () => {
    const query = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };
    query.insert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'row-level security denied ownership' },
    });
    mocks.from.mockReturnValue(query);

    await expect(chatService.createComment('post-1', 'A comment'))
      .rejects.toThrow('Comment could not be saved.');
  });

  it('creates post and comment reports without accepting a reporter identity', async () => {
    const postReportInsert = vi.fn().mockResolvedValue({ error: null });
    const commentReportInsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from
      .mockReturnValueOnce({ insert: postReportInsert })
      .mockReturnValueOnce({ insert: commentReportInsert });

    await expect(chatService.reportContent('post', 'post-1', 'spam')).resolves.toBeUndefined();
    await expect(chatService.reportContent('comment', 'comment-1', 'harassment')).resolves.toBeUndefined();

    expect(mocks.from).toHaveBeenNthCalledWith(1, 'chat_reports');
    expect(postReportInsert).toHaveBeenCalledWith({ message_id: 'post-1', reason: 'spam' });
    expect(mocks.from).toHaveBeenNthCalledWith(2, 'chat_comment_reports');
    expect(commentReportInsert).toHaveBeenCalledWith({
      comment_id: 'comment-1',
      reason: 'harassment',
    });
    expect(postReportInsert.mock.calls[0][0]).not.toHaveProperty('reporter_id');
    expect(commentReportInsert.mock.calls[0][0]).not.toHaveProperty('reporter_id');
  });

  it('prevents duplicate reports from being presented as successful', async () => {
    const insert = vi.fn().mockResolvedValue({
      error: { code: '23505', message: 'unique constraint' },
    });
    mocks.from.mockReturnValue({ insert });

    await expect(chatService.reportContent('post', 'post-1', 'spam'))
      .rejects.toThrow('You have already reported this content.');
  });

  it('surfaces RLS failures when submitting a report', async () => {
    const insert = vi.fn().mockResolvedValue({
      error: { code: '42501', message: 'row-level security' },
    });
    mocks.from.mockReturnValue({ insert });

    await expect(chatService.reportContent('comment', 'comment-1', 'other'))
      .rejects.toThrow('Your report could not be submitted.');
  });

  it('does not attempt report inserts without an authenticated session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(chatService.reportContent('post', 'post-1', 'spam'))
      .rejects.toThrow('Sign in to access chat.');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('loads the moderator report inbox without mapping reporter identities', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        report_id: 'report-1',
        content_type: 'comment',
        target_id: 'comment-1',
        post_id: 'post-1',
        content: 'Flagged comment',
        context: 'Parent post',
        reason: 'spam',
        created_at: '2026-10-25T09:00:00.000Z',
        is_hidden: false,
        reporter_id: 'private-user-id',
      }],
      error: null,
    });

    await expect(chatService.listModerationReports()).resolves.toEqual([{
      id: 'report-1',
      contentType: 'comment',
      targetId: 'comment-1',
      postId: 'post-1',
      content: 'Flagged comment',
      context: 'Parent post',
      reason: 'spam',
      createdAt: '2026-10-25T09:00:00.000Z',
      isHidden: false,
    }]);
    expect(mocks.rpc).toHaveBeenCalledWith('list_community_moderation_reports');
  });

  it('rejects unauthorized access to the moderator inbox', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Moderator access required' },
    });

    await expect(chatService.listModerationReports())
      .rejects.toThrow('Could not load moderation reports.');
  });

  it('uses the server-side moderator operation and surfaces permission failures', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Moderator access required' },
    });

    await expect(chatService.reviewModerationReport({
      id: 'report-1',
      contentType: 'post',
    }, 'resolved', true)).rejects.toThrow('Could not apply this moderation action.');
    expect(mocks.rpc).toHaveBeenCalledWith('review_community_report', {
      requested_content_type: 'post',
      requested_report_id: 'report-1',
      requested_resolution: 'resolved',
      requested_hidden: true,
    });
  });

  it('confirms hide/restore decisions only after the moderator RPC succeeds', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    await expect(chatService.reviewModerationReport({
      id: 'report-2',
      contentType: 'comment',
    }, 'resolved', false)).resolves.toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith('review_community_report', {
      requested_content_type: 'comment',
      requested_report_id: 'report-2',
      requested_resolution: 'resolved',
      requested_hidden: false,
    });
  });

  it('preserves the current hidden state when dismissing a report', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    await expect(chatService.reviewModerationReport({
      id: 'report-3',
      contentType: 'post',
    }, 'dismissed', true)).resolves.toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith('review_community_report', {
      requested_content_type: 'post',
      requested_report_id: 'report-3',
      requested_resolution: 'dismissed',
      requested_hidden: true,
    });
  });

  it('loads moderator hidden content without requiring an open report', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          content_type: 'post',
          target_id: 'hidden-post',
          post_id: 'hidden-post',
          content: 'Auto-hidden post',
          context: null,
        },
        {
          content_type: 'comment',
          target_id: 'hidden-comment',
          post_id: 'parent-post',
          content: 'Hidden comment',
          context: 'Parent post',
        },
      ],
      error: null,
    });

    await expect(chatService.listHiddenCommunityContent()).resolves.toEqual([
      {
        contentType: 'post',
        targetId: 'hidden-post',
        postId: 'hidden-post',
        content: 'Auto-hidden post',
        context: null,
      },
      {
        contentType: 'comment',
        targetId: 'hidden-comment',
        postId: 'parent-post',
        content: 'Hidden comment',
        context: 'Parent post',
      },
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith('list_hidden_community_content');
  });

  it('restores posts and comments through moderator RPC without an open report id', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    await expect(chatService.setCommunityContentVisibility('post', 'post-1', false))
      .resolves.toBeUndefined();
    await expect(chatService.setCommunityContentVisibility('comment', 'comment-1', false))
      .resolves.toBeUndefined();

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'set_community_content_visibility', {
      requested_content_type: 'post',
      requested_target_id: 'post-1',
      requested_hidden: false,
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'set_community_content_visibility', {
      requested_content_type: 'comment',
      requested_target_id: 'comment-1',
      requested_hidden: false,
    });
  });

  it('rejects unauthorized hidden-content reads and restore attempts', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Moderator access required' },
    });

    await expect(chatService.listHiddenCommunityContent())
      .rejects.toThrow('Could not load hidden community content.');
    await expect(chatService.setCommunityContentVisibility('post', 'post-1', false))
      .rejects.toThrow('Could not update content visibility.');
  });

  it('confirms moderator status using the authenticated database function', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });

    await expect(chatService.isModerator()).resolves.toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith('is_moderator');
  });

  it('loads only the authenticated profile handle for anonymous ownership checks', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue({
      data: { handle: 'belluna_abcd1234' },
      error: null,
    });
    mocks.from.mockReturnValue(query);

    await expect(chatService.currentUserHandle()).resolves.toBe('belluna_abcd1234');
    expect(mocks.from).toHaveBeenCalledWith('profiles');
    expect(query.select).toHaveBeenCalledWith('handle');
    expect(query.eq).toHaveBeenCalledWith('id', userId);
  });

  it('loads active rooms and returns their database IDs', async () => {
    const rooms = [{
      id: roomId,
      slug: 'pcos',
      title_en: 'PCOS Support',
      title_hi: 'पीसीओएस सहायता',
      is_active: true,
    }];
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue({ data: rooms, error: null });
    mocks.from.mockReturnValue(query);

    await expect(chatService.listRooms()).resolves.toEqual([{
      id: roomId,
      slug: 'pcos',
      titleEn: 'PCOS Support',
      titleHi: 'पीसीओएस सहायता',
      isActive: true,
    }]);
    expect(mocks.from).toHaveBeenCalledWith('chat_rooms');
    expect(query.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('loads only visible messages for the selected room', async () => {
    const messages = [{
      id: 'message-1',
      room_id: roomId,
      author_handle: 'belluna_abcd1234',
      body: 'Hello',
      created_at: '2026-10-25T09:00:00.000Z',
    }];
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: messages, error: null });
    mocks.from.mockReturnValue(query);

    await expect(chatService.listMessages(roomId)).resolves.toEqual([{
      id: 'message-1',
      roomId,
      authorHandle: 'belluna_abcd1234',
      body: 'Hello',
      createdAt: '2026-10-25T09:00:00.000Z',
    }]);
    expect(mocks.from).toHaveBeenCalledWith('chat_messages');
    expect(query.eq).toHaveBeenCalledWith('room_id', roomId);
    expect(query.eq).toHaveBeenCalledWith('hidden', false);
  });

  it('sends a message using the selected database room ID', async () => {
    const profileQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };
    profileQuery.select.mockReturnValue(profileQuery);
    profileQuery.eq.mockReturnValue(profileQuery);
    profileQuery.single.mockResolvedValue({
      data: { adult_confirmed: true },
      error: null,
    });

    const roomQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    roomQuery.select.mockReturnValue(roomQuery);
    roomQuery.eq.mockReturnValue(roomQuery);
    roomQuery.maybeSingle.mockResolvedValue({
      data: { id: roomId },
      error: null,
    });

    const insertedMessage = {
      id: 'message-2',
      room_id: roomId,
      author_handle: 'belluna_abcd1234',
      body: 'Hello',
      created_at: '2026-10-25T09:00:00.000Z',
    };
    const messageQuery = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };
    messageQuery.insert.mockReturnValue(messageQuery);
    messageQuery.select.mockReturnValue(messageQuery);
    messageQuery.single.mockResolvedValue({ data: insertedMessage, error: null });
    mocks.from
      .mockReturnValueOnce(profileQuery)
      .mockReturnValueOnce(roomQuery)
      .mockReturnValueOnce(messageQuery);

    await expect(chatService.sendMessage(roomId, '  Hello  ')).resolves.toEqual({
      id: 'message-2',
      roomId,
      authorHandle: 'belluna_abcd1234',
      body: 'Hello',
      createdAt: '2026-10-25T09:00:00.000Z',
    });
    expect(mocks.from).toHaveBeenNthCalledWith(3, 'chat_messages');
    expect(messageQuery.insert).toHaveBeenCalledWith({ room_id: roomId, body: 'Hello' });
    expect(messageQuery.select).toHaveBeenCalledWith('id, room_id, author_handle, body, created_at');
  });

  it('rejects failed message inserts', async () => {
    const profileQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };
    profileQuery.select.mockReturnValue(profileQuery);
    profileQuery.eq.mockReturnValue(profileQuery);
    profileQuery.single.mockResolvedValue({
      data: { adult_confirmed: true },
      error: null,
    });

    const roomQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    roomQuery.select.mockReturnValue(roomQuery);
    roomQuery.eq.mockReturnValue(roomQuery);
    roomQuery.maybeSingle.mockResolvedValue({
      data: { id: roomId },
      error: null,
    });

    const messageQuery = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };
    messageQuery.insert.mockReturnValue(messageQuery);
    messageQuery.select.mockReturnValue(messageQuery);
    messageQuery.single.mockResolvedValue({ data: null, error: { message: 'write denied' } });
    mocks.from
      .mockReturnValueOnce(profileQuery)
      .mockReturnValueOnce(roomQuery)
      .mockReturnValueOnce(messageQuery);

    await expect(chatService.sendMessage(roomId, 'Hello'))
      .rejects.toThrow('Message could not be sent.');
    expect(messageQuery.insert).toHaveBeenCalledWith({ room_id: roomId, body: 'Hello' });
  });
});
