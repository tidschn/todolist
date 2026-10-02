import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test-utils';
import { emptyState } from '../logic/state';
import { exportState } from '../storage/serialization';
import type { AppState, Completion } from '../logic/types';

const T = '2026-10-02';
const c = (date: string, points: number, id = `i-${date}-${points}`): Completion => ({ itemId: id, itemType: 'task', date, points });

afterEach(() => vi.restoreAllMocks());

async function openProgress(initial: AppState = emptyState()) {
  const user = userEvent.setup();
  const utils = renderApp(initial);
  await user.click(screen.getByRole('button', { name: /^progress$/i }));
  return { user, ...utils };
}

describe('Progress screen', () => {
  it('a brand-new user sees an empty heatmap, zero stats and only locked badges', async () => {
    await openProgress();
    expect(screen.getByText(/0 completions in the last year/i)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /completion heatmap/i })).toBeInTheDocument();
    expect(screen.getAllByText(/locked/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/earned/i)).not.toBeInTheDocument();
  });

  it('shows per-day detail for a tapped heatmap cell', async () => {
    const { user } = await openProgress({ ...emptyState(), completions: [c(T, 10), c(T, 20)] });
    expect(screen.getByText(/2 completions in the last year/i)).toBeInTheDocument();
    expect(screen.getByText(/tap a day for details/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /30 points, 2 items/i }));
    expect(screen.getByText(/30 points, 2 items/i)).toBeInTheDocument(); // the detail line (cell labels are aria-labels)
  });

  it('marks a freeze day', async () => {
    await openProgress({
      ...emptyState(),
      completions: [c('2026-09-28', 5), c('2026-09-29', 5), c('2026-10-01', 5), c(T, 5)],
    });
    expect(screen.getByRole('button', { name: /streak freeze used/i })).toBeInTheDocument();
  });

  it('shows unlocked badges as earned', async () => {
    await openProgress({ ...emptyState(), completions: [c(T, 10)], badges: ['first-step'] });
    expect(screen.getByText('First Step')).toBeInTheDocument();
    expect(screen.getByText(/earned/i)).toBeInTheDocument();
  });

  it('rejects a malformed import file and leaves existing data untouched', async () => {
    const initial: AppState = { ...emptyState(), completions: [c(T, 10)] };
    const { user, storage } = await openProgress(initial);
    const confirm = vi.spyOn(window, 'confirm');
    const file = new File(['{"hello": "world"}'], 'bad.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText(/import/i), file);
    expect(await screen.findByText(/not a valid gamified todo export/i)).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    expect(storage.current().completions).toHaveLength(1);
  });

  it('rejects non-JSON text the same way', async () => {
    const { user, storage } = await openProgress({ ...emptyState(), completions: [c(T, 10)] });
    await user.upload(screen.getByLabelText(/import/i), new File(['nope {'], 'x.json', { type: 'application/json' }));
    expect(await screen.findByText(/not valid json/i)).toBeInTheDocument();
    expect(storage.current().completions).toHaveLength(1);
  });

  it('imports a valid export after confirmation', async () => {
    const incoming: AppState = { ...emptyState(), completions: [c('2026-10-01', 5), c(T, 5), c('2026-09-30', 5)] };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user, storage } = await openProgress();
    await user.upload(
      screen.getByLabelText(/import/i),
      new File([exportState(incoming)], 'good.json', { type: 'application/json' }),
    );
    expect(await screen.findByText(/import complete/i)).toBeInTheDocument();
    expect(storage.current().completions).toHaveLength(3);
    expect(screen.getByText(/3 completions in the last year/i)).toBeInTheDocument();
  });

  it('keeps existing data when the user declines the import confirmation', async () => {
    const incoming: AppState = { ...emptyState(), completions: [c(T, 5)] };
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { user, storage } = await openProgress({ ...emptyState(), completions: [c(T, 10), c('2026-10-01', 10)] });
    await user.upload(
      screen.getByLabelText(/import/i),
      new File([exportState(incoming)], 'good.json', { type: 'application/json' }),
    );
    expect(storage.current().completions).toHaveLength(2);
  });
});
