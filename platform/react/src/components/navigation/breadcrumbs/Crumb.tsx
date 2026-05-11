import type { Crumb as CrumbType } from '../../../stores';

export interface CrumbItemProps {
  crumb: CrumbType;
}

export function CrumbItem({ crumb }: CrumbItemProps) {
  return (
    <li className="op-crumb">
      {crumb.link ? (
        <a className="op-anchor" href={crumb.link}>
          {crumb.text}
        </a>
      ) : (
        crumb.text
      )}
    </li>
  );
}
