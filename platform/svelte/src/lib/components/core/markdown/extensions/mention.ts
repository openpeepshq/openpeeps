import { type MentionWithProfile, handleRegexBase } from '@openpeeps/common/types';
import type { TokenizerAndRendererExtension } from 'marked';

export default (mentions: MentionWithProfile[]) =>
	({
		name: 'mention',
		level: 'inline', // Is this a block-level or inline-level tokenizer?
		start: (src: string) => src.match(/@/)?.index, // Hint to Marked.js to stop and check for a match
		tokenizer: (src: string) => {
			const rule = new RegExp(`^@(${handleRegexBase})`); // Regex for the complete token, anchor to string start
			const match = rule.exec(src);
			if (match) {
				const mention = mentions.find((m) => m.text === match[0]);
				const handle = mention?.profile.handle ?? match[1];
				const displayName = mention?.profile.displayName;

				return {
					type: 'mention',
					raw: match[0],
					handle,
					displayName
				};
			}
		}
	}) as TokenizerAndRendererExtension;
