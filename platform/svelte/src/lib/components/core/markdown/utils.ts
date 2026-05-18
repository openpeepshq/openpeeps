import type { Links, TokensList, Token } from 'marked';

export const isExternalLink = (href: string, origin: string): boolean => {
	if (!href || /^(mailto:|tel:|#)/.test(href)) {
		return false;
	}
	if (href.startsWith('/') && !href.startsWith('//')) {
		return false;
	}
	try {
		return new URL(href, origin).origin !== origin;
	} catch {
		return !href.startsWith('/');
	}
};

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
