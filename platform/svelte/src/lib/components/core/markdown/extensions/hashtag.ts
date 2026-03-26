import type { TokenizerAndRendererExtension } from 'marked';
import { hashtagRegexBase } from '@openpeeps/common/types';


export default () =>
	({
		name: 'hashtag',
		level: 'inline',
		start: (src: string) =>
			src.match(new RegExp(hashtagRegexBase, 'i'))?.index,
		tokenizer: (src: string) => {
			const rule = new RegExp(`^${hashtagRegexBase}`, 'i');
			const match = rule.exec(src);
			if (match) {
				return {
					type: 'hashtag',
					raw: match[0],
					tag: match[1]
				};
			}
		}
	}) as TokenizerAndRendererExtension;
