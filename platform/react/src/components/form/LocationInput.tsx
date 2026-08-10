import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Button, Input, Label, LoadingIcon, cn } from '@openpeepshq/react-ui';
import type { GeocodingResult, Location } from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';

export interface LocationInputProps {
  title?: string;
  description?: string;
  value?: Location;
  onChange: (location: Location) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Override the geocoder. Defaults to the openpeeps geocode endpoint. */
  geocode?: (query: string) => Promise<GeocodingResult[]>;
  /** Debounce in ms for the geocode lookup. Defaults to 1500. */
  debounceMs?: number;
}

/**
 * Controlled port of @openpeepshq/svelte/components/form/LocationInput.svelte. A
 * text input wired to a debounced geocoder that captures coordinates from the
 * selected suggestion.
 */
export function LocationInput({
  title = '',
  description = '',
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  geocode,
  debounceMs = 1500,
}: LocationInputProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const [name, setName] = useState(value?.text ?? '');
  const [suggestions, setSuggestions] = useState<GeocodingResult[] | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setName(value?.text ?? '');
  }, [value?.text]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const runGeocode = async (query: string): Promise<GeocodingResult[]> => {
    if (geocode) return geocode(query);
    const result = await openpeepsApi.useGeocode(query);
    return Array.isArray(result)
      ? result
      : ((result as { data?: GeocodingResult[] }).data ?? []);
  };

  const onSelection = (sel: Partial<GeocodingResult> & { name: string }) => {
    onChange({ text: sel.name, coordinates: sel.center });
    setName(sel.name);
    setSuggestions(null);
  };

  const onTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.currentTarget.value;
    setName(text);
    onChange({ text });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setSuggestions(null);
      setPending(false);
      return;
    }
    setPending(true);
    debounceRef.current = setTimeout(() => {
      void runGeocode(text.trim()).then((r) => {
        setSuggestions(r);
        setPending(false);
      });
    }, debounceMs);
  };

  return (
    <Label title={title} description={description} classes="relative">
      <div
        className={cn(
          'op-input-group grid grid-cols-[auto_1fr_auto] rounded-full',
        )}
      >
        <div className="op-input-group-shim">
          <MapPin className="size-4" />
        </div>
        <Input
          value={name}
          type="text"
          placeholder={placeholder ?? title}
          disabled={disabled}
          readOnly={readOnly}
          onChange={onTextChange}
        />
      </div>
      {(pending || suggestions) && (
        <div className="op-card absolute bottom-16 flex w-full flex-col items-start gap-3 p-2 text-sm">
          {pending ? (
            <div className="flex w-full flex-col items-center justify-center gap-2 p-4">
              <span>{t('location.lookup', { name })}</span>
              <LoadingIcon />
            </div>
          ) : (
            <>
              <Button
                className="border-surface-300 hover:bg-muted w-full rounded border p-2 text-left"
                action={() => onSelection({ name })}
              >
                {name}
              </Button>
              {suggestions?.map((res, idx) => (
                <Button
                  key={idx}
                  className="border-surface-300 hover:bg-muted w-full rounded border p-2 text-left"
                  action={() => onSelection(res)}
                >
                  {res.name}
                </Button>
              ))}
            </>
          )}
        </div>
      )}
    </Label>
  );
}
