import type { CycleEntry, NewCycleEntry, SymptomDefinition, SymptomEntry } from '../../features/tracker/trackerData';
import type { HealthLog } from '../../features/tracker/dailyLogUtils';
export type { Profile, ProfileRepo } from './profile';

export type DateRange = { from: string; to: string };

export interface CycleRepo {
  list(userId: string, range?: DateRange): Promise<CycleEntry[]>;
  save(userId: string, input: NewCycleEntry): Promise<CycleEntry>;
  remove(userId: string, id: string): Promise<void>;
}

export interface DailyLogRepo {
  list(userId: string, range?: DateRange): Promise<Record<string, HealthLog>>;
  save(userId: string, date: string, log: HealthLog): Promise<void>;
  remove(userId: string, date: string): Promise<void>;
}

export interface SymptomRepo {
  catalog(userId: string): Promise<SymptomDefinition[]>;
  list(userId: string, range?: DateRange): Promise<SymptomEntry[]>;
  upsert(userId: string, input: Omit<SymptomEntry, 'id'>): Promise<void>;
  remove(userId: string, id: string): Promise<void>;
}
