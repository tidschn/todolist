import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test-utils';
import { emptyState } from '../logic/state';
import type { AppState } from '../logic/types';

const initial = (): AppState => ({
  ...emptyState(),
  habits: [{ id: 'h1', title: 'Read', difficulty: 'easy', schedule: { kind: 'weekdays', days: [1, 3] } }],
  tasks: [
    { id: 't1', title: 'Email landlord', difficulty: 'medium' },
    { id: 't2', title: 'File taxes', difficulty: 'hard' },
  ],
  completions: [{ itemId: 't2', itemType: 'task', date: '2026-10-01', points: 20 }],
});

afterEach(() => vi.restoreAllMocks());

async function openManage() {
  const user = userEvent.setup();
  const utils = renderApp(initial());
  await user.click(screen.getByRole('button', { name: /habits & tasks/i }));
  return { user, ...utils };
}

describe('Habits & Tasks screen', () => {
  it('lists habits with their schedule, open tasks, and completed tasks separately', async () => {
    await openManage();
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText(/mon, wed/i)).toBeInTheDocument();
    expect(screen.getByText('Email landlord')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /completed tasks/i })).toBeInTheDocument();
    expect(screen.getByText('File taxes')).toBeInTheDocument();
  });

  it('edits a habit title', async () => {
    const { user, storage } = await openManage();
    await user.click(screen.getByRole('button', { name: /edit read/i }));
    const title = screen.getByLabelText(/title/i);
    await user.clear(title);
    await user.type(title, 'Read 20 pages');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByText('Read 20 pages')).toBeInTheDocument();
    expect(storage.current().habits[0].title).toBe('Read 20 pages');
  });

  it('deletes a task after confirmation but keeps its earned points', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user, storage } = await openManage();
    await user.click(screen.getByRole('button', { name: /delete file taxes/i }));
    expect(screen.queryByText('File taxes')).not.toBeInTheDocument();
    expect(storage.current().completions).toHaveLength(1);
    expect(screen.getByTestId('balance')).toHaveTextContent('20');
  });

  it('does nothing when the delete confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { user } = await openManage();
    await user.click(screen.getByRole('button', { name: /delete email landlord/i }));
    expect(screen.getByText('Email landlord')).toBeInTheDocument();
  });
});
