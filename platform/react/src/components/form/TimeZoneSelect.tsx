import { ianaTimeZones } from '@openpeepshq/common/lib';

export interface TimeZoneSelectProps {
  id?: string;
  value: string;
  onChange: (timeZone: string) => void;
  optionLabel?: (timeZone: string) => string;
}

export function TimeZoneSelect({
  id,
  value,
  onChange,
  optionLabel,
}: TimeZoneSelectProps) {
  const zones = ianaTimeZones();
  const options = value && !zones.includes(value) ? [value, ...zones] : zones;

  return (
    <select
      id={id}
      className="bg-background w-full rounded-md border px-3 py-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((tz) => (
        <option key={tz} value={tz}>
          {optionLabel ? optionLabel(tz) : tz}
        </option>
      ))}
    </select>
  );
}
