import { describe, it, expect } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderApp } from '../test-utils';
import { emptyState } from '../logic/state';

describe('AppProvider cross-tab sync', () => {
  it('shows data saved by another tab instead of overwriting it', () => {
    const { storage } = renderApp();
    expect(screen.queryByText('From the other tab')).not.toBeInTheDocument();

    act(() =>
      storage.otherTabSaves({
        ...emptyState(),
        tasks: [{ id: 'x', title: 'From the other tab', difficulty: 'easy' }],
      }),
    );

    expect(screen.getByRole('checkbox', { name: /from the other tab/i })).toBeInTheDocument();
    expect(storage.current().tasks.map((t) => t.title)).toEqual(['From the other tab']);
  });
});
