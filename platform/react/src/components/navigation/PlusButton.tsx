import { Plus } from 'lucide-react';
import { Button } from '@openpeeps/react-ui';
import { usePlusButton } from '../../stores';

export function PlusButton() {
  const plusButton = usePlusButton();
  if (!plusButton || Array.isArray(plusButton)) return null;
  const Icon = plusButton.icon ?? Plus;

  return (
    <div className="sticky bottom-1 flex w-full justify-end sm:bottom-4">
      <Button
        compact
        title={plusButton.title ?? ''}
        variant="variant-filled-primary"
        action={plusButton.action}
        className="z-10 mr-4 size-16 rounded-full sm:mb-4"
        data-testid="posts-new-post-button"
      >
        <Icon size={24} />
      </Button>
    </div>
  );
}
