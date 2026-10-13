import { stringToTokens } from 'react-native-markdown-display';
import { toGotoUrl } from '@openpeepshq/common/lib';

type Token = ReturnType<typeof stringToTokens>[number];

export { toGotoUrl };

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
