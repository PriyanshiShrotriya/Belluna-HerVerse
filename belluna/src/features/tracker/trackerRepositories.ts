import { supabase } from '../../lib/supabase';
import type { CycleRepo, SymptomRepo } from '../../lib/db/tracker';
import {
  validateCycleEntry,
  validateSymptomEntry,
} from './trackerData';

async function verifiedUserId(expectedUserId: string): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Please sign in to access your health records.');
  if (data.user.id !== expectedUserId) {
    throw new Error('The signed-in account changed. Please reload your health records.');
  }
  return data.user.id;
}

function throwDatabaseError(error: { code?: string; message: string }): never {
  if (error.code === '23505') throw new Error('A period with this start date already exists.');
  throw new Error(error.message);
}

export const cycleRepo: CycleRepo = {
  async list(userId, range) {
    const ownerId = await verifiedUserId(userId);
    let query = supabase
      .from('cycle_entries')
      .select('id, start_date, end_date, notes')
      .eq('user_id', ownerId)
      .order('start_date', { ascending: false });
    if (range) {
      query = query.gte('start_date', range.from).lte('start_date', range.to);
    }
    const { data, error } = await query;
    if (error) throwDatabaseError(error);
    await verifiedUserId(ownerId);
    return (data ?? []).map((row) => ({
      id: row.id,
      startDate: row.start_date,
      endDate: row.end_date,
      notes: row.notes,
    }));
  },

  async save(userId, input) {
    const ownerId = await verifiedUserId(userId);
    const existing = await this.list(ownerId);
    validateCycleEntry(input, existing);
    const values = {
      user_id: ownerId,
      start_date: input.startDate,
      end_date: input.endDate || null,
      notes: input.notes.trim() || null,
    };
    const result = input.id
      ? await supabase.from('cycle_entries').update(values).eq('id', input.id).eq('user_id', ownerId)
      : await supabase.from('cycle_entries').insert(values);
    if (result.error) throwDatabaseError(result.error);
    const saved = await cycleRepo.list(ownerId);
    const entry = saved.find((cycle) => (
      input.id ? cycle.id === input.id : cycle.startDate === input.startDate
    ));
    if (!entry) throw new Error('Saved period could not be confirmed.');
    return entry;
  },

  async remove(userId, id) {
    const ownerId = await verifiedUserId(userId);
    const { error } = await supabase
      .from('cycle_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', ownerId);
    if (error) throwDatabaseError(error);
    await verifiedUserId(ownerId);
  },
};

export const symptomRepo: SymptomRepo = {
  async catalog(userId) {
    const ownerId = await verifiedUserId(userId);
    const { data, error } = await supabase
      .from('symptom_catalog')
      .select('code, category, label_en, label_hi')
      .order('category')
      .order('label_en');
    if (error) throwDatabaseError(error);
    await verifiedUserId(ownerId);
    return (data ?? []).map((row) => ({
      code: row.code,
      category: row.category,
      labelEn: row.label_en,
      labelHi: row.label_hi,
    }));
  },

  async list(userId, range) {
    const ownerId = await verifiedUserId(userId);
    let query = supabase
      .from('symptom_entries')
      .select('id, log_date, symptom_code, severity')
      .eq('user_id', ownerId)
      .order('log_date', { ascending: false });
    if (range) {
      query = query.gte('log_date', range.from).lte('log_date', range.to);
    }
    const { data, error } = await query;
    if (error) throwDatabaseError(error);
    await verifiedUserId(ownerId);
    return (data ?? []).map((row) => ({
      id: row.id,
      date: row.log_date,
      code: row.symptom_code,
      severity: row.severity,
    }));
  },

  async upsert(userId, input) {
    const ownerId = await verifiedUserId(userId);
    validateSymptomEntry(input.date, input.code, input.severity);
    const { error } = await supabase.from('symptom_entries').upsert(
      {
        user_id: ownerId,
        log_date: input.date,
        symptom_code: input.code,
        severity: input.severity,
      },
      { onConflict: 'user_id,log_date,symptom_code' }
    );
    if (error) throwDatabaseError(error);
    await verifiedUserId(ownerId);
  },

  async remove(userId, id) {
    const ownerId = await verifiedUserId(userId);
    const { error } = await supabase
      .from('symptom_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', ownerId);
    if (error) throwDatabaseError(error);
    await verifiedUserId(ownerId);
  },
};
