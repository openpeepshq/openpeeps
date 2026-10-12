import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useT } from '../../i18n';

export interface ConfigMenuButtonProps {
  translationPrefix: string;
  /** URL path for navigation (web). */
  action?: string;
  /** Click handler — renders a button instead of a Link when provided. */
  onPress?: () => void;
  testId?: string;
  titleFallback?: string;
  descriptionFallback?: string;
}

/**
 * Row in a settings / configuration menu: title, description and a chevron.
 * Shared by the admin configuration screens and the user settings index.
 */
export function ConfigMenuButton({
  translationPrefix,
  action,
  onPress,
  testId,
  titleFallback,
  descriptionFallback,
}: ConfigMenuButtonProps) {
  const t = useT();
  const content = (
    <>
      <div>
        <div className="font-medium">
          {t(
            `${translationPrefix}.title`,
            titleFallback ? { defaultValue: titleFallback } : {},
          )}
        </div>
        <div className="text-muted-foreground text-xs">
          {t(
            `${translationPrefix}.description`,
            descriptionFallback ? { defaultValue: descriptionFallback } : {},
          )}
        </div>
      </div>
      <span aria-hidden="true">
        <ChevronRight className="h-4 w-4" />
      </span>
    </>
  );

  if (onPress) {
    return (
      <button
        data-testid={testId}
        onClick={onPress}
        className="hover:bg-surface flex w-full items-center justify-between px-4 py-3 text-start"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={action ?? ''}
      data-testid={testId}
      className="hover:bg-surface flex w-full items-center justify-between px-4 py-3 text-start"
    >
      {content}
    </Link>
  );
}
