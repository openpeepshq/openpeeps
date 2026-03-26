import type { Links, TokensList, Token } from 'marked';

export const extractLinks = (token: Token): string[] => {
	if (token.type === 'link') {
		return [token.href];
	}
	if ('tokens' in token && token.tokens) {
		return token.tokens.flatMap(extractLinks);
	}
	return [];
};

export const emptyTokensList = (() => {
	const tokensList: [] & { links?: Links } = [];
	tokensList.links = {};
	return tokensList as TokensList;
})();
