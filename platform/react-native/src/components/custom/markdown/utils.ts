import { stringToTokens } from 'react-native-markdown-display';

type Token = ReturnType<typeof stringToTokens>[number];

export const isInternalLink = (href: string, origin: string): boolean => {
    if (!href || href.includes('goto:/')) {
        return !!href;
    }
    if (href.startsWith('/') && !href.startsWith('//')) {
        return true;
    }
    try {
        return new URL(href).origin === origin;
    } catch {
        return false;
    }
};

export const toGotoUrl = (url: string, origin: string): string => {
    if (url.includes('goto:/')) {
        return url;
    }
    if (url.startsWith('/') && !url.startsWith('//')) {
        return `goto:${url}`;
    }
    try {
        const urlObj = new URL(url);
        if (urlObj.origin === origin) {
            return `goto:${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
        }
    } catch {
        // fall through
    }
    return url;
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

export const isEmail = (url: string) => {
    return /^mailto:|^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url);
};
