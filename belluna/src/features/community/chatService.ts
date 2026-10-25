import { supabase } from '../../lib/supabase';

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

  async sendMessage(roomId: string, body: string): Promise<void> {
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

    const { error } = await supabase
      .from('chat_messages')
      .insert({ room_id: roomId, body: normalizedBody });

    if (error) throw new Error('Message could not be sent. Check the message and try again.');
  },
};
