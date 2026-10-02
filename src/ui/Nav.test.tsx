import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp } from '../test-utils';
import { TABS } from './Nav';

describe('Nav', () => {
  it('shows a decorative icon before every tab label without changing the tab names', () => {
    renderApp();
    const nav = screen.getByRole('navigation', { name: /main/i });
    for (const tab of TABS) {
      const button = screen.getByRole('button', { name: tab.label });
      const icon = button.firstElementChild as HTMLElement;
      expect(icon).toHaveClass('nav-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon.textContent).not.toBe('');
      expect(button.lastElementChild).toHaveTextContent(tab.label);
    }
    expect(nav.querySelectorAll('.nav-icon')).toHaveLength(TABS.length);
  });

  it('gives every tab a different icon', () => {
    expect(new Set(TABS.map((t) => t.icon)).size).toBe(TABS.length);
  });
});
