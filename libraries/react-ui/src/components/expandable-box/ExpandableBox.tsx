import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface ExpandableBoxProps {
  title: React.ReactNode;
  children: React.ReactNode;
  initialOpen?: boolean;
}

export function ExpandableBox({ title, children, initialOpen = false }: ExpandableBoxProps) {
  const [open, setOpen] = React.useState(initialOpen);
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        className="w-4"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? <ChevronDown /> : <ChevronRight />}
      </button>
      <div className="flex-grow">
        <div>{title}</div>
        {open && <div>{children}</div>}
      </div>
    </div>
  );
}
