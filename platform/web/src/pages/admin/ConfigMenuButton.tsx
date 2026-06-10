import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useT } from '@openpeeps/react';

export interface ConfigMenuButtonProps {
  translationPrefix: string;
  action: string;
}

export function ConfigMenuButton({
  translationPrefix,
  action,
}: ConfigMenuButtonProps) {
  const t = useT();
  return (
    <Link
      to={action}
      className="hover:bg-surface-100 flex w-full items-center justify-between px-4 py-3 text-start"
    >
      <div>
        <div className="font-medium">{t(`${translationPrefix}.title`)}</div>
        <div className="text-surface-500 text-xs">
          {t(`${translationPrefix}.description`)}
        </div>
      </div>
      <span aria-hidden="true">
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
