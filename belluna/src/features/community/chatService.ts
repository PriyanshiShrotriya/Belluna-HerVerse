import { supabase } from '../../lib/supabase';
import { anonymousAlias } from './anonymousIdentity';

export type ChatRoom = {
  id: string;
  slug: string;
  titleEn: string;
  titleHi: string;
  isActive: boolean;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  authorHandle: string;
  body: string;
  createdAt: string;
};

export type ChatComment = {
  id: string;
  postId: string;
  author: string;
  body: string;
  createdAt: string;
};

export type PostEngagement = {
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

export type CommunityReportReason =
  | 'harassment'
  | 'spam'
  | 'unsafe_advice'
  | 'personal_info'
  | 'other';

export type ModerationReport = {
  id: string;
  contentType: 'post' | 'comment';
  targetId: string;
  postId: string;
  content: string;
  context: string | null;
  reason: CommunityReportReason;
  createdAt: string;
  isHidden: boolean;
};

export type HiddenCommunityContent = {
  contentType: 'post' | 'comment';
  targetId: string;
  postId: string;
  content: string;
  context: string | null;
};

type PostEngagementRow = {
  post_id: string;
  like_count: number | string;
  liked_by_me: boolean;
  comment_count: number | string;
};

type ModerationReportRow = {
  report_id: string;
  content_type: 'post' | 'comment';
  target_id: string;
  post_id: string;
  content: string;
  context: string | null;
  reason: CommunityReportReason;
  created_at: string;
  is_hidden: boolean;
};

type HiddenCommunityContentRow = {
  content_type: 'post' | 'comment';
  target_id: string;
  post_id: string;
  content: string;
  context: string | null;
};

const MESSAGE_LIMIT = 50;

async function requireAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error('Could not verify your sign-in. Please try again.');
  if (!data.user) throw new Error('Sign in to access chat.');
  return data.user.id;
}

async function verifyCurrentUser(expectedUserId: string): Promise<void> {
  const userId = await requireAuthenticatedUserId();
  if (userId !== expectedUserId) {
    throw new Error('Your signed-in account changed. Please retry the chat action.');
  }
}

export const chatService = {
  async currentUserHandle(): Promise<string> {
    const userId = await requireAuthenticatedUserId();
    const { data, error } = await supabase
      .from('profiles')
      .select('handle')
      .eq('id', userId)
      .single();

    if (error || !data) throw new Error('Could not verify your chat profile. Please try again.');
    await verifyCurrentUser(userId);
    return data.handle;
  },

  async listRooms(): Promise<ChatRoom[]> {
    const userId = await requireAuthenticatedUserId();
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('id, slug, title_en, title_hi, is_active')
      .eq('is_active', true)
      .order('slug', { ascending: true });

    if (error) throw new Error('Could not load chat rooms. Please try again.');
    await verifyCurrentUser(userId);
    return (data ?? []).map((room) => ({
      id: room.id,
      slug: room.slug,
      titleEn: room.title_en,
      titleHi: room.title_hi,
      isActive: room.is_active,
    }));
  },

  async listMessages(roomId: string): Promise<ChatMessage[]> {
    if (!roomId.trim()) throw new Error('Choose a chat room first.');

    const userId = await requireAuthenticatedUserId();
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, room_id, author_handle, body, created_at')
      .eq('room_id', roomId)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_LIMIT);

    if (error) throw new Error('Could not load messages. Please try again.');
    await verifyCurrentUser(userId);
    return (data ?? []).map((message) => ({
      id: message.id,
      roomId: message.room_id,
      authorHandle: message.author_handle,
      body: message.body,
      createdAt: message.created_at,
    }));
  },

  async getPostEngagement(postIds: string[]): Promise<Record<string, PostEngagement>> {
    if (postIds.length === 0) return {};
    const userId = await requireAuthenticatedUserId();
    const { data, error } = await supabase.rpc('get_community_post_engagement', {
      requested_post_ids: [...new Set(postIds)],
    });

    if (error) throw new Error('Could not load post likes and comment counts. Please try again.');
    await verifyCurrentUser(userId);
    return Object.fromEntries(((data ?? []) as PostEngagementRow[]).map((row) => [row.post_id, {
      likeCount: Number(row.like_count),
      likedByMe: row.liked_by_me,
      commentCount: Number(row.comment_count),
    }]));
  },

  async likePost(postId: string): Promise<PostEngagement> {
    if (!postId.trim()) throw new Error('Choose a post first.');
    const userId = await requireAuthenticatedUserId();
    const { error } = await supabase
      .from('chat_message_likes')
      .insert({ post_id: postId });

    if (error && error.code !== '23505') {
      throw new Error('Could not like this post. Please try again.');
    }
    await verifyCurrentUser(userId);
    const summary = (await this.getPostEngagement([postId]))[postId];
    if (!summary?.likedByMe) {
      throw new Error(error
        ? 'Your like could not be confirmed. Please try again.'
        : 'Your like was not saved. Please try again.');
    }
    return summary;
  },

  async unlikePost(postId: string): Promise<PostEngagement> {
    if (!postId.trim()) throw new Error('Choose a post first.');
    const userId = await requireAuthenticatedUserId();
    const { error } = await supabase
      .from('chat_message_likes')
      .delete()
      .eq('post_id', postId);

    if (error) throw new Error('Could not remove your like. Please try again.');
    await verifyCurrentUser(userId);
    const summary = (await this.getPostEngagement([postId]))[postId];
    if (!summary || summary.likedByMe) {
      throw new Error('Your like removal could not be confirmed. Please try again.');
    }
    return summary;
  },

  async listPostComments(postId: string): Promise<ChatComment[]> {
    if (!postId.trim()) throw new Error('Choose a post first.');
    const userId = await requireAuthenticatedUserId();
    const { data, error } = await supabase
      .from('chat_message_comments')
      .select('id, post_id, author_handle, body, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw new Error('Could not load comments. Please try again.');
    await verifyCurrentUser(userId);
    return (data ?? []).map((comment) => ({
      id: comment.id,
      postId: comment.post_id,
      author: anonymousAlias(comment.author_handle),
      body: comment.body,
      createdAt: comment.created_at,
    }));
  },

  async createComment(postId: string, body: string): Promise<ChatComment> {
    const normalizedBody = body.trim();
    if (!postId.trim()) throw new Error('Choose a post first.');
    if (!normalizedBody) throw new Error('Enter a comment before sending.');
    if (normalizedBody.length > 200) throw new Error('Comments must be 200 characters or fewer.');

    const userId = await requireAuthenticatedUserId();
    const { data: comment, error } = await supabase
      .from('chat_message_comments')
      .insert({ post_id: postId, body: normalizedBody })
      .select('id, post_id, author_handle, body, created_at')
      .single();

    if (error) throw new Error('Comment could not be saved. Please try again.');
    if (!comment) throw new Error('Comment could not be confirmed. Please try again.');
    await verifyCurrentUser(userId);
    return {
      id: comment.id,
      postId: comment.post_id,
      author: anonymousAlias(comment.author_handle),
      body: comment.body,
      createdAt: comment.created_at,
    };
  },

  async reportContent(
    contentType: 'post' | 'comment',
    targetId: string,
    reason: CommunityReportReason
  ): Promise<void> {
    if (!targetId.trim()) throw new Error('Choose content to report.');
    const validReasons: CommunityReportReason[] = [
      'harassment',
      'spam',
      'unsafe_advice',
      'personal_info',
      'other',
    ];
    if (!validReasons.includes(reason)) throw new Error('Choose a report reason.');

    const userId = await requireAuthenticatedUserId();
    const table = contentType === 'post' ? 'chat_reports' : 'chat_comment_reports';
    const targetColumn = contentType === 'post' ? 'message_id' : 'comment_id';
    const { error } = await supabase
      .from(table)
      .insert({ [targetColumn]: targetId, reason });

    if (error?.code === '23505') throw new Error('You have already reported this content.');
    if (error) throw new Error('Your report could not be submitted. Please try again.');
    await verifyCurrentUser(userId);
  },

  async isModerator(): Promise<boolean> {
    const userId = await requireAuthenticatedUserId();
    const { data, error } = await supabase.rpc('is_moderator');
    if (error) throw new Error('Could not verify moderator permissions.');
    await verifyCurrentUser(userId);
    return data === true;
  },

  async listModerationReports(): Promise<ModerationReport[]> {
    const userId = await requireAuthenticatedUserId();
    const { data, error } = await supabase.rpc('list_community_moderation_reports');
    if (error) throw new Error('Could not load moderation reports.');
    await verifyCurrentUser(userId);
    return ((data ?? []) as ModerationReportRow[]).map((row) => ({
      id: row.report_id,
      contentType: row.content_type,
      targetId: row.target_id,
      postId: row.post_id,
      content: row.content,
      context: row.context,
      reason: row.reason,
      createdAt: row.created_at,
      isHidden: row.is_hidden,
    }));
  },

  async listHiddenCommunityContent(): Promise<HiddenCommunityContent[]> {
    const userId = await requireAuthenticatedUserId();
    const { data, error } = await supabase.rpc('list_hidden_community_content');
    if (error) throw new Error('Could not load hidden community content.');
    await verifyCurrentUser(userId);
    return ((data ?? []) as HiddenCommunityContentRow[]).map((row) => ({
      contentType: row.content_type,
      targetId: row.target_id,
      postId: row.post_id,
      content: row.content,
      context: row.context,
    }));
  },

  async setCommunityContentVisibility(
    contentType: HiddenCommunityContent['contentType'],
    targetId: string,
    hidden: boolean
  ): Promise<void> {
    if (!targetId.trim()) throw new Error('Choose content to moderate.');
    const userId = await requireAuthenticatedUserId();
    const { error } = await supabase.rpc('set_community_content_visibility', {
      requested_content_type: contentType,
      requested_target_id: targetId,
      requested_hidden: hidden,
    });
    if (error) throw new Error('Could not update content visibility.');
    await verifyCurrentUser(userId);
  },

  async reviewModerationReport(
    report: Pick<ModerationReport, 'id' | 'contentType'>,
    resolution: 'resolved' | 'dismissed',
    hidden: boolean
  ): Promise<void> {
    const userId = await requireAuthenticatedUserId();
    const { error } = await supabase.rpc('review_community_report', {
      requested_content_type: report.contentType,
      requested_report_id: report.id,
      requested_resolution: resolution,
      requested_hidden: hidden,
    });
    if (error) throw new Error('Could not apply this moderation action.');
    await verifyCurrentUser(userId);
  },

  async sendMessage(roomId: string, body: string): Promise<ChatMessage> {
    const normalizedBody = body.trim();
    if (!roomId.trim()) throw new Error('Choose a chat room first.');
    if (!normalizedBody) throw new Error('Enter a message before sending.');
    if (normalizedBody.length > 500) throw new Error('Messages must be 500 characters or fewer.');

    const userId = await requireAuthenticatedUserId();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('adult_confirmed')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Could not verify your chat eligibility. Please try again.');
    }
    if (!profile.adult_confirmed) {
      throw new Error('Confirm that you are 18 or older before posting in chat.');
    }

    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('id', roomId)
      .eq('is_active', true)
      .maybeSingle();

    if (roomError) throw new Error('Could not verify the chat room. Please try again.');
    if (!room) throw new Error('This chat room is unavailable or inactive.');

    await verifyCurrentUser(userId);

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({ room_id: roomId, body: normalizedBody })
      .select('id, room_id, author_handle, body, created_at')
      .single();

    if (error) throw new Error('Message could not be sent. Check the message and try again.');
    if (!message) throw new Error('Message could not be confirmed. Please try again.');
    return {
      id: message.id,
      roomId: message.room_id,
      authorHandle: message.author_handle,
      body: message.body,
      createdAt: message.created_at,
    };
  },
};
