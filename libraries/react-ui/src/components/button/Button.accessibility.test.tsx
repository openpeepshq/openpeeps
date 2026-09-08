/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { accessibleNameFrom } from './AccessibleButtonLabel';
import { Pencil } from 'lucide-react';

describe('accessibleNameFrom', () => {
  it('prefers aria-label over title', () => {
    expect(accessibleNameFrom('Reply', 'Other')).toBe('Reply');
    expect(accessibleNameFrom(undefined, 'Close')).toBe('Close');
    expect(accessibleNameFrom('  ', '')).toBeUndefined();
  });
});

describe('Button accessible name', () => {
  it('exposes the action word to Narrator and Read Mode for icon-only controls', () => {
    render(
      <Button title="Reply" action={() => undefined}>
        <Pencil data-testid="icon" />
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Reply' });
    expect(button.textContent).toContain('Reply');
  });

  it('does not duplicate Read Mode text when the label is already visible', () => {
    render(
      <Button title="Save" action={() => undefined}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.textContent).toBe('Save');
  });
});

describe('IconButton', () => {
  it('uses title as the action word', () => {
    render(<IconButton icon={Pencil} title="Edit" action={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
  });
});
