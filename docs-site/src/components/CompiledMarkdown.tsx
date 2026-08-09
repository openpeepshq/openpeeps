import { useEffect, useRef, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

type Props = {
  html: string;
  className?: string;
};

/**
 * Renders compiled markdown and routes in-app links via React Router.
 * Links are version-absolute (e.g. /main/admin) so new tabs and raw .md work;
 * the basename is stripped before navigate().
 */
export const CompiledMarkdown = ({
  html,
  className,
}: Props): ReactElement => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

    const onClick = (event: Event) => {
      const mouse = event as MouseEvent;
      if (mouse.metaKey || mouse.ctrlKey || mouse.shiftKey || mouse.altKey) {
        return;
      }
      const target = mouse.target as HTMLElement | null;
      const anchor = target?.closest?.('a');
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || /^https?:/i.test(href)) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (!href.startsWith('/')) return;

      mouse.preventDefault();
      let path = href;
      if (base && (path === base || path.startsWith(`${base}/`))) {
        path = path.slice(base.length) || '/';
      }
      navigate(path);
    };

    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [navigate, html]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
