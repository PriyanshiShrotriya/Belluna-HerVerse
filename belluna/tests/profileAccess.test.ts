import { describe, expect, it } from 'vitest';
import { getProfileAccessState } from '../src/app/profileAccess';

const confirmedProfile = {
  id: 'user-a',
  handle: 'anonymous-handle',
  preferredLanguage: 'en' as const,
  adultConfirmed: true,
  createdAt: '2026-10-25T00:00:00.000Z',
};

describe('adult profile access gate', () => {
  it('keeps protected content loading until the current profile is verified', () => {
    expect(getProfileAccessState({
      authLoading: false,
      userId: 'user-a',
      profile: null,
      profileLoading: true,
      profileError: '',
    })).toBe('loading-profile');
  });

  it('requires explicit confirmation for an unconfirmed profile', () => {
    expect(getProfileAccessState({
      authLoading: false,
      userId: 'user-a',
      profile: { ...confirmedProfile, adultConfirmed: false },
      profileLoading: false,
      profileError: '',
    })).toBe('confirmation-required');
  });

  it('allows a confirmed user to proceed', () => {
    expect(getProfileAccessState({
      authLoading: false,
      userId: 'user-a',
      profile: confirmedProfile,
      profileLoading: false,
      profileError: '',
    })).toBe('allowed');
  });

  it('does not reuse the prior user profile after account switching or sign-out', () => {
    expect(getProfileAccessState({
      authLoading: false,
      userId: 'user-b',
      profile: confirmedProfile,
      profileLoading: false,
      profileError: '',
    })).toBe('loading-profile');
    expect(getProfileAccessState({
      authLoading: false,
      userId: null,
      profile: confirmedProfile,
      profileLoading: false,
      profileError: '',
    })).toBe('signed-out');
  });

  it('blocks protected content when profile loading fails', () => {
    expect(getProfileAccessState({
      authLoading: false,
      userId: 'user-a',
      profile: null,
      profileLoading: false,
      profileError: 'profile unavailable',
    })).toBe('profile-error');
  });
});
