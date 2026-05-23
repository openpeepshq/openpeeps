import { JAM_EMOJIS } from './constants';

export interface JamReactionMenuProps {
  onSelect: (emoji: string) => void | Promise<void>;
}

export function JamReactionMenu({ onSelect }: JamReactionMenuProps) {
  return (
    <div className="bg-surface-200 rounded-2xl p-2 md:w-max">
      <div className="flex flex-wrap items-center gap-x-1 md:flex-nowrap">
        {JAM_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            title={emoji}
            className="shrink-0 p-2 text-lg"
            onClick={() => void onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
