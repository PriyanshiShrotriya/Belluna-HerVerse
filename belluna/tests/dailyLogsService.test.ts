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

import { getDailyLogs, saveDailyLog } from '../src/features/tracker/dailyLogsService';

function makeQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    upsert: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lte.mockReturnValue(query);
  query.order.mockResolvedValue(result);
  query.upsert.mockResolvedValue(result);
  mocks.from.mockReturnValue(query);
  return query;
}

describe('daily log repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'synthetic-user-a' } },
      error: null,
    });
  });

  it('loads only the authenticated user’s logs and maps database rows', async () => {
    const query = makeQuery({
      data: [{
        log_date: '2026-02-01',
        flow: 2,
        pain: 7,
        mood: 'good',
        notes: null,
      }],
      error: null,
    });

    await expect(getDailyLogs('synthetic-user-a')).resolves.toEqual({
      '2026-02-01': { flow: 2, pain: 7, mood: 3, notes: '' },
    });
    expect(query.eq).toHaveBeenCalledWith('user_id', 'synthetic-user-a');
  });

  it('writes to the verified owner and surfaces database errors', async () => {
    const failure = { message: 'write denied' };
    const query = makeQuery({ data: null, error: failure });

    await expect(saveDailyLog('synthetic-user-a', '2026-02-01', {
      flow: 1,
      pain: 4,
      mood: 2,
      notes: '',
    })).rejects.toEqual(failure);
    expect(query.upsert).toHaveBeenCalledWith(
      {
        user_id: 'synthetic-user-a',
        log_date: '2026-02-01',
        flow: 1,
        pain: 4,
        mood: 'okay',
        notes: null,
      },
      { onConflict: 'user_id,log_date' }
    );
  });

  it('rejects a stale account ID before querying', async () => {
    await expect(getDailyLogs('synthetic-user-b')).rejects.toThrow('account changed');
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
