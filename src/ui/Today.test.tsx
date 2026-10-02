import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test-utils';
import { emptyState } from '../logic/state';
import type { AppState } from '../logic/types';

const T = '2026-10-02';

describe('Today screen', () => {
  it('a brand-new user sees an empty state and zeroed header', () => {
    renderApp();
    expect(screen.getByText(/add your first habit or task/i)).toBeInTheDocument();
    expect(screen.getByTestId('level')).toHaveTextContent('Level 1');
    expect(screen.getByTestId('streak')).toHaveTextContent('0');
    expect(screen.getByTestId('balance')).toHaveTextContent('0');
  });

  it('adds a task, completes it, and updates points and streak; un-checking removes them', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.type(screen.getByLabelText(/title/i), 'Write report');
    await user.selectOptions(screen.getByLabelText(/difficulty/i), 'hard');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    const box = screen.getByRole('checkbox', { name: /write report/i });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    expect(screen.getByTestId('balance')).toHaveTextContent('20');
    expect(screen.getByTestId('streak')).toHaveTextContent('1');

    await user.click(box);
    expect(screen.getByTestId('balance')).toHaveTextContent('0');
  });

  it('will not submit a blank or whitespace-only title', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
    await user.type(screen.getByLabelText(/title/i), '   ');
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });

  it('adds a weekday habit and requires at least one day', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.selectOptions(screen.getByLabelText(/type/i), 'habit');
    await user.type(screen.getByLabelText(/title/i), 'Run');
    await user.click(screen.getByLabelText(/every day/i)); // turn off "every day"
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) await user.click(screen.getByLabelText(day)); // clear defaults
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
    await user.click(screen.getByLabelText('Fri')); // today is Friday
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByRole('checkbox', { name: /run/i })).toBeInTheDocument();
  });

  it('shows a level-up celebration when a completion crosses a level threshold', async () => {
    const user = userEvent.setup();
    const initial: AppState = {
      ...emptyState(),
      tasks: [{ id: 't1', title: 'Big one', difficulty: 'hard' }],
      completions: [{ itemId: 'old', itemType: 'task', date: '2026-09-01', points: 40 }],
    };
    renderApp(initial);
    expect(screen.getByTestId('level')).toHaveTextContent('Level 1');
    await user.click(screen.getByRole('checkbox', { name: /big one/i }));
    expect(screen.getByTestId('level')).toHaveTextContent('Level 2');
    expect(await screen.findByText(/level up/i)).toBeInTheDocument();
  });

  it('warns when a running streak has nothing done today', () => {
    renderApp({ ...emptyState(), completions: [{ itemId: 'a', itemType: 'task', date: '2026-10-01', points: 10 }] });
    expect(screen.getByText(/streak is at risk/i)).toBeInTheDocument();
  });

  it('does not warn once something is done today', () => {
    renderApp({
      ...emptyState(),
      completions: [
        { itemId: 'a', itemType: 'task', date: '2026-10-01', points: 10 },
        { itemId: 'b', itemType: 'task', date: T, points: 10 },
      ],
    });
    expect(screen.queryByText(/streak is at risk/i)).not.toBeInTheDocument();
  });

  it('persists changes through the storage interface', async () => {
    const user = userEvent.setup();
    const { storage } = renderApp();
    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.type(screen.getByLabelText(/title/i), 'Saved task');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(storage.current().tasks.map((t) => t.title)).toEqual(['Saved task']);
  });
});
