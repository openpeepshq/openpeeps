import { Ban } from 'lucide-react';

export interface ErrorComponentProps {
  componentKey: string;
  registry: Map<string, unknown>;
  showError?: boolean;
}

export function ErrorComponent({
  componentKey,
  showError = true,
}: ErrorComponentProps) {
  if (!showError) return null;
  return (
    <div className="border-error bg-error/10 text-error flex w-full items-start gap-3 rounded border p-4">
      <div>
        <Ban />
      </div>
      <div>
        <h3 className="text-lg font-bold">Component not found</h3>
        <p className="w-full text-wrap">
          Component "{componentKey}" not found in registry
        </p>
      </div>
    </div>
  );
}
