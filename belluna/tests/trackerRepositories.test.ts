import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  },
}));

import { cycleRepo, symptomRepo } from '../src/features/tracker/trackerRepositories';

function queryReturning(result: { data: unknown; error: null }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    upsert: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockResolvedValue(result);
  query.upsert.mockResolvedValue(result);
  mocks.from.mockReturnValue(query);
  return query;
}

describe('authenticated tracker repositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'synthetic-user-a' } },
      error: null,
    });
  });

  it('rejects another user ID before issuing a database query', async () => {
    await expect(cycleRepo.list('synthetic-user-b')).rejects.toThrow('account changed');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('filters cycle reads by the verified authenticated user', async () => {
    const query = queryReturning({ data: [], error: null });
    await expect(cycleRepo.list('synthetic-user-a')).resolves.toEqual([]);
    expect(mocks.from).toHaveBeenCalledWith('cycle_entries');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'synthetic-user-a');
  });

  it('does not confirm an edit with a different record sharing its start date', async () => {
    const requestedId = 'requested-cycle';
    const startDate = '2026-02-01';
    const existingQuery = queryReturning({
      data: [{
        id: requestedId,
        start_date: startDate,
        end_date: null,
        notes: null,
      }],
      error: null,
    });
    const updateQuery = {
      update: vi.fn(),
      eq: vi.fn(),
    };
    updateQuery.update.mockReturnValue(updateQuery);
    updateQuery.eq
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(Promise.resolve({ error: null }));
    const refreshedQuery = queryReturning({
      data: [{
        id: 'different-cycle',
        start_date: startDate,
        end_date: null,
        notes: null,
      }],
      error: null,
    });
    mocks.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(refreshedQuery);

    await expect(cycleRepo.save('synthetic-user-a', {
      id: requestedId,
      startDate,
      endDate: null,
      notes: '',
    })).rejects.toThrow('Saved period could not be confirmed.');
    expect(updateQuery.eq).toHaveBeenNthCalledWith(1, 'id', requestedId);
    expect(updateQuery.eq).toHaveBeenNthCalledWith(2, 'user_id', 'synthetic-user-a');
  });

  it('derives symptom write ownership from the verified session', async () => {
    const query = queryReturning({ data: null, error: null });
    await symptomRepo.upsert('synthetic-user-a', {
      date: '2026-02-01',
      code: 'cramps',
      severity: 4,
    });
    expect(mocks.from).toHaveBeenCalledWith('symptom_entries');
    expect(query.upsert).toHaveBeenCalledWith(
      {
        user_id: 'synthetic-user-a',
        log_date: '2026-02-01',
        symptom_code: 'cramps',
        severity: 4,
      },
      { onConflict: 'user_id,log_date,symptom_code' }
    );
  });

  it('stops if the authenticated user changes while data is loading', async () => {
    const query = queryReturning({ data: [], error: null });
    mocks.getUser
      .mockResolvedValueOnce({ data: { user: { id: 'synthetic-user-a' } }, error: null })
      .mockResolvedValueOnce({ data: { user: { id: 'synthetic-user-b' } }, error: null });
    await expect(cycleRepo.list('synthetic-user-a')).rejects.toThrow('account changed');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'synthetic-user-a');
  });
});
