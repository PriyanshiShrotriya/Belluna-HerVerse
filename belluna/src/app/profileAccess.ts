import type { Profile } from '../lib/db/profile';

export type ProfileAccessState =
  | 'loading-auth'
  | 'signed-out'
  | 'loading-profile'
  | 'profile-error'
  | 'confirmation-required'
  | 'allowed';

export function getProfileAccessState(input: {
  authLoading: boolean;
  userId: string | null;
  profile: Profile | null;
  profileLoading: boolean;
  profileError: string;
}): ProfileAccessState {
  if (input.authLoading) return 'loading-auth';
  if (!input.userId) return 'signed-out';
  if (input.profileLoading) return 'loading-profile';
  if (input.profileError) return 'profile-error';
  if (!input.profile || input.profile.id !== input.userId) return 'loading-profile';
  return input.profile.adultConfirmed ? 'allowed' : 'confirmation-required';
}
