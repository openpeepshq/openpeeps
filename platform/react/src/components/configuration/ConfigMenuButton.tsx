import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useT } from '../../i18n';

export interface ConfigMenuButtonProps {
  translationPrefix: string;
  action: string;
  testId?: string;
}

/**
 * Row in a settings / configuration menu: title, description and a chevron.
 * Shared by the admin configuration screens and the user settings index.
 */
export function ConfigMenuButton({
  translationPrefix,
  action,
  testId,
}: ConfigMenuButtonProps) {
  const t = useT();
  return (
    <Link
      to={action}
      data-testid={testId}
      className="hover:bg-surface flex w-full items-center justify-between px-4 py-3 text-start"
    >
      <div>
        <div className="font-medium">{t(`${translationPrefix}.title`)}</div>
        <div className="text-muted-foreground text-xs">
          {t(`${translationPrefix}.description`)}
        </div>
      </div>
      <span aria-hidden="true">
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
