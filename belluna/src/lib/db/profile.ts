import type { Lang } from '../../i18n/t';

export type Profile = {
  id: string;
  handle: string;
  preferredLanguage: Lang;
  adultConfirmed: boolean;
  createdAt: string;
};

export interface ProfileRepo {
  get(userId: string): Promise<Profile>;
  confirmAdultStatus(userId: string): Promise<Profile>;
  updateLanguage(userId: string, language: Lang): Promise<Profile>;
}
