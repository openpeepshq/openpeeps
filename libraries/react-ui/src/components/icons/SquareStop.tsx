import * as React from 'react';

export interface SquareStopProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  absoluteStrokeWidth?: boolean;
}

/**
 * "SquareStop" SVG icon from Lucide (added in v0.528.0). Ported for
 * lucide-react versions that do not yet include it.
 */
export function SquareStop({
  size = 24,
  absoluteStrokeWidth,
  className,
  strokeWidth = 2,
  ...props
}: SquareStopProps) {
  const computedStrokeWidth = absoluteStrokeWidth
    ? (Number(strokeWidth) * 24) / Number(size)
    : strokeWidth;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={computedStrokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        className
          ? `lucide lucide-square-stop ${className}`
          : 'lucide lucide-square-stop'
      }
      aria-hidden="true"
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}
