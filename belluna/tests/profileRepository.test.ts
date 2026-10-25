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

import { profileRepo } from '../src/features/auth/profileRepository';

function profileQuery(result: { data: unknown; error: null }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.single.mockResolvedValue(result);
  mocks.from.mockReturnValue(query);
  return query;
}

const profile = {
  id: 'synthetic-user-a',
  handle: 'quiet-moon',
  preferred_language: 'hi',
  adult_confirmed: false,
  created_at: '2026-10-24T00:00:00Z',
};

describe('authenticated profile repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'synthetic-user-a' } },
      error: null,
    });
  });

  it('reads only the verified current user profile', async () => {
    const query = profileQuery({ data: profile, error: null });
    await expect(profileRepo.get('synthetic-user-a')).resolves.toEqual({
      id: 'synthetic-user-a',
      handle: 'quiet-moon',
      preferredLanguage: 'hi',
      adultConfirmed: false,
      createdAt: '2026-10-24T00:00:00Z',
    });
    expect(mocks.from).toHaveBeenCalledWith('profiles');
    expect(query.eq).toHaveBeenCalledWith('id', 'synthetic-user-a');
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
  });

  it('updates only the language for the verified user', async () => {
    const query = profileQuery({ data: { ...profile, preferred_language: 'en' }, error: null });
    const result = await profileRepo.updateLanguage('synthetic-user-a', 'en');
    expect(result.preferredLanguage).toBe('en');
    expect(query.update).toHaveBeenCalledWith({ preferred_language: 'en' });
    expect(query.eq).toHaveBeenCalledWith('id', 'synthetic-user-a');
  });

  it('confirms age through the caller-bound RPC and refreshes the profile', async () => {
    const confirmedProfile = { ...profile, adult_confirmed: true };
    const query = profileQuery({ data: confirmedProfile, error: null });
    mocks.rpc.mockResolvedValue({ error: null });

    await expect(profileRepo.confirmAdultStatus('synthetic-user-a')).resolves.toMatchObject({
      id: 'synthetic-user-a',
      adultConfirmed: true,
    });
    expect(mocks.rpc).toHaveBeenCalledWith('confirm_adult_status');
    expect(mocks.from).toHaveBeenCalledWith('profiles');
    expect(query.update).not.toHaveBeenCalled();
  });

  it('does not load or confirm a profile when the confirmation RPC fails', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'network unavailable' } });

    await expect(profileRepo.confirmAdultStatus('synthetic-user-a'))
      .rejects.toThrow('network unavailable');
    expect(mocks.rpc).toHaveBeenCalledWith('confirm_adult_status');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('does not claim confirmation if the refreshed profile is still unconfirmed', async () => {
    profileQuery({ data: profile, error: null });
    mocks.rpc.mockResolvedValue({ error: null });

    await expect(profileRepo.confirmAdultStatus('synthetic-user-a'))
      .rejects.toThrow('could not be verified');
  });

  it('rejects a profile request when the session belongs to another user', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'synthetic-user-b' } },
      error: null,
    });
    await expect(profileRepo.get('synthetic-user-a')).rejects.toThrow('account changed');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('does not report an update as successful if no profile row was returned', async () => {
    profileQuery({ data: null, error: null });
    await expect(profileRepo.updateLanguage('synthetic-user-a', 'en'))
      .rejects.toThrow('language could not be confirmed');
  });
});
