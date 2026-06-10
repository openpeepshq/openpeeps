import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  LoadingIcon,
  cn,
  deepGet,
  deepSet,
  pathToString,
  useFormContext,
  useFormMessages,
} from '@openpeeps/react-ui';
import type { GeocodingResult, Location } from '@openpeeps/common';
import { useT } from '../../i18n';

export interface LocationInputProps {
  title?: string;
  description?: string;
  path: (number | string)[];
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Forwarded to the geocoder. Pass an async fn that returns suggestions. */
  geocode: (query: string) => Promise<GeocodingResult[]>;
  /** Debounce in ms for the geocode lookup. Defaults to 1500. */
  debounceMs?: number;
}

/**
 * React port of @openpeeps/svelte/components/form/LocationInput.svelte. Wires
 * a Form-context input to a debounced geocoder + suggestion popover.
 */
export function LocationInput({
  title = '',
  description = '',
  path,
  placeholder,
  disabled = false,
  readOnly = false,
  geocode,
  debounceMs = 1500,
}: LocationInputProps) {
  const { data, validate } = useFormContext();
  const messages = useFormMessages();
  const t = useT();
  const [dirty, setDirty] = useState(false);

  const initialName = (deepGet(data, path) as Location | undefined)?.text ?? '';
  const [name, setName] = useState(initialName);
  const [suggestions, setSuggestions] = useState<GeocodingResult[] | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const onSelection = (sel: Partial<GeocodingResult> & { name: string }) => {
    setDirty(true);
    deepSet(data as object, path, {
      text: sel.name,
      coordinates: sel.center,
    } as Location);
    setName(sel.name);
    setSuggestions(null);
    void validate();
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.currentTarget.value;
    setName(text);
    setDirty(true);
    deepSet(data as object, path, { text });
    void validate();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) {
      setSuggestions(null);
      setPending(false);
      return;
    }
    setPending(true);
    debounceRef.current = setTimeout(() => {
      void geocode(text.trim()).then((r) => {
        setSuggestions(r);
        setPending(false);
      });
    }, debounceMs);
  };

  return (
    <Label
      title={title}
      description={description}
      messages={dirty ? messages[pathToString(path)] : []}
      classes="relative"
    >
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
          onChange={onChange}
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
