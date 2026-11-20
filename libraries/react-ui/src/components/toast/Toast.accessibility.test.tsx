/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast accessibility role', () => {
  it('announces a success toast as a status live region', () => {
    const { container } = render(<Toast variant="success">Saved</Toast>);
    const region = container.querySelector('[role="status"]');
    expect(region).not.toBeNull();
    expect(region?.textContent).toContain('Saved');
  });

  it('announces an error toast as an alert live region', () => {
    const { container } = render(<Toast variant="error">Could not save</Toast>);
    const region = container.querySelector('[role="alert"]');
    expect(region).not.toBeNull();
    expect(region?.textContent).toContain('Could not save');
  });

  it('exposes the dismiss control as a button', () => {
    const { container } = render(<Toast variant="success">Saved</Toast>);
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(
      buttons.some((b) => b.getAttribute('aria-label') === 'Dismiss'),
    ).toBe(true);
  });
});
