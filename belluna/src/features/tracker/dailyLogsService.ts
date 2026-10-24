
import { supabase } from '../../lib/supabase';
import type { DailyLogRepo } from '../../lib/db/tracker';
import { isoDateSchema } from './trackerData';
import {
  fromDatabase,
  toDatabaseFields,
  validateDailyLog,
  type DailyLogRow,
  type HealthLog,
} from './dailyLogUtils';

export type { HealthLog } from './dailyLogUtils';

async function requireUserId(expectedUserId: string): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) {
    throw new Error('Please log in to access your health logs.');
  }
  if (data.user.id !== expectedUserId) {
    throw new Error('The signed-in account changed. Please reload your health logs.');
  }

  return data.user.id;
}

export async function getDailyLogs(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Record<string, HealthLog>> {
  await requireUserId(userId);

  let query = supabase
    .from('daily_logs')
    .select('log_date, flow, pain, mood, notes')
    .eq('user_id', userId)
    .order('log_date', { ascending: true });

  if (startDate) query = query.gte('log_date', startDate);
  if (endDate) query = query.lte('log_date', endDate);

  const { data, error } = await query;
  if (error) throw error;
  await requireUserId(userId);

  const logs: Record<string, HealthLog> = {};

  for (const row of (data ?? []) as DailyLogRow[]) {
    logs[row.log_date] = fromDatabase(row);
  }

  return logs;
}

export async function saveDailyLog(
  userId: string,
  date: string,
  log: HealthLog
): Promise<void> {
  await requireUserId(userId);

  validateDailyLog(date, log);

  const { error } = await supabase
    .from('daily_logs')
    .upsert(
      {
        user_id: userId,
        log_date: date,
        ...toDatabaseFields(log),
      },
      { onConflict: 'user_id,log_date' }
    );

  if (error) throw error;
    await requireUserId(userId);
}

export async function deleteDailyLog(userId: string, date: string): Promise<void> {
    await requireUserId(userId);

  if (!isoDateSchema.safeParse(date).success) {
    throw new Error('Invalid calendar date.');
  }

  const { error } = await supabase
    .from('daily_logs')
    .delete()
    .eq('user_id', userId)
    .eq('log_date', date);

  if (error) throw error;
  await requireUserId(userId);
}

export const dailyLogRepo: DailyLogRepo = {
  list: (userId, range) => getDailyLogs(userId, range?.from, range?.to),
  save: saveDailyLog,
  remove: deleteDailyLog,
};
