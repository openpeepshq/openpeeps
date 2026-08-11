import { useEffect, useState, type ReactElement } from 'react';
import type { VersionEntry, VersionsFile } from '@/types';

type Props = {
  currentId: string;
};

export const VersionSwitcher = ({ currentId }: Props): ReactElement | null => {
  const [versions, setVersions] = useState<VersionEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/versions.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: VersionsFile | null) => {
        if (!cancelled && data?.versions) setVersions(data.versions);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (versions.length <= 1) return null;

  const onChange = (id: string) => {
    const next = versions.find((v) => v.id === id);
    if (!next) return;
    const page = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    // Strip current version prefix from path
    const stripped = page.replace(new RegExp(`^/${currentId}(?=/|$)`), '') || '/';
    const target = `${next.path.replace(/\/$/, '')}${stripped === '/' ? '/' : stripped}`;
    window.location.assign(target);
  };

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground sr-only">Version</span>
      <select
        className="border-border bg-surface text-foreground rounded-md border px-2 py-1"
        value={currentId}
        aria-label="Documentation version"
        onChange={(e) => onChange(e.target.value)}
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  );
};
