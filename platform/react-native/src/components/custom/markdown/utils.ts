import { stringToTokens } from 'react-native-markdown-display';

type Token = ReturnType<typeof stringToTokens>[number];

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
