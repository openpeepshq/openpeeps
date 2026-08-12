import type { ReactElement, ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

export const ShowcaseSection = ({
  title,
  description,
  children,
}: Props): ReactElement => (
  <section className="border-border bg-card mb-8 rounded-lg border p-4 shadow-sm md:p-6">
    <header className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      ) : null}
    </header>
    <div className="min-w-0">{children}</div>
  </section>
);
