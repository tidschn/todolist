import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test-utils';
import { emptyState } from '../logic/state';

const withPoints = (points: number) => ({
  ...emptyState(),
  completions: [{ itemId: 'a', itemType: 'task' as const, date: '2026-10-01', points }],
});

async function openRewards(points: number) {
  const user = userEvent.setup();
  const utils = renderApp(withPoints(points));
  await user.click(screen.getByRole('button', { name: /^rewards$/i }));
  return { user, ...utils };
}

async function addReward(user: ReturnType<typeof userEvent.setup>, name: string, cost: string) {
  await user.type(screen.getByLabelText(/reward name/i), name);
  await user.type(screen.getByLabelText(/cost/i), cost);
  await user.click(screen.getByRole('button', { name: /add reward/i }));
}

describe('Rewards screen', () => {
  it('the add button stays disabled for a blank name or a non-positive cost', async () => {
    const { user } = await openRewards(30);
    const add = screen.getByRole('button', { name: /add reward/i });
    expect(add).toBeDisabled();
    await user.type(screen.getByLabelText(/reward name/i), 'Coffee');
    expect(add).toBeDisabled();
    await user.type(screen.getByLabelText(/cost/i), '0');
    expect(add).toBeDisabled();
  });

  it('redeem is disabled when the balance is too low', async () => {
    const { user } = await openRewards(10);
    await addReward(user, 'Gaming hour', '25');
    expect(screen.getByRole('button', { name: /redeem gaming hour/i })).toBeDisabled();
  });

  it('redeeming spends the balance, logs history, and keeps the level', async () => {
    const { user } = await openRewards(30);
    await addReward(user, 'Coffee', '15');
    await user.click(screen.getByRole('button', { name: /redeem coffee/i }));
    expect(screen.getByTestId('balance')).toHaveTextContent('15');
    expect(screen.getByTestId('level')).toHaveTextContent('Level 1');
    expect(screen.getByRole('heading', { name: /history/i })).toBeInTheDocument();
    expect(screen.getAllByText(/coffee/i).length).toBeGreaterThan(1); // shop row + history row
  });
});
