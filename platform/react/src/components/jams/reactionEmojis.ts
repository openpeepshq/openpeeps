export * from '../../lib/reactionEmojis';

let emojiPickerDatabase:
  | import('emoji-picker-element/database').default
  | undefined;

export async function syncEmojiPickerSkinTone(skinTone: number): Promise<void> {
  const { default: Database } = await import('emoji-picker-element/database');
  if (!emojiPickerDatabase) {
    emojiPickerDatabase = new Database();
  }
  await emojiPickerDatabase.setPreferredSkinTone(skinTone);
}

export function hideEmojiPickerSkinToneSelector(picker: HTMLElement): void {
  const root = picker.shadowRoot;
  if (!root || root.querySelector('[data-hide-skintone]')) {
    return;
  }
  const style = document.createElement('style');
  style.setAttribute('data-hide-skintone', '');
  style.textContent = '.skintone-button-wrapper { display: none !important; }';
  root.appendChild(style);
}
