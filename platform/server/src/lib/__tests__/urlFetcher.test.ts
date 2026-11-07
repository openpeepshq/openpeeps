import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractPageMetadata } from '../handlers/urlFetcher';

const docFromHtml = (html: string) => new JSDOM(html).window.document;

describe('extractPageMetadata', () => {
  it('prefers og:title over the raw <title> (Instagram shows only the site name)', () => {
    const doc = docFromHtml(`
      <html>
        <head>
          <title>Instagram</title>
          <meta property="og:title" content="Jane Doe on Instagram: &quot;hello world&quot;" />
          <meta property="og:description" content="10 likes - j.doe on May 22, 2025" />
          <meta property="og:image" content="https://cdn.example/cover.jpg" />
        </head>
        <body></body>
      </html>
    `);
    expect(extractPageMetadata(doc)).toEqual({
      title: 'Jane Doe on Instagram: "hello world"',
      description: '10 likes - j.doe on May 22, 2025',
      image: 'https://cdn.example/cover.jpg',
    });
  });

  it('falls back to <title> and name=description when og:* tags are missing', () => {
    const doc = docFromHtml(`
      <html>
        <head>
          <title>My Blog Post</title>
          <meta name="description" content="A plain description" />
        </head>
        <body></body>
      </html>
    `);
    expect(extractPageMetadata(doc)).toEqual({
      title: 'My Blog Post',
      description: 'A plain description',
      image: undefined,
    });
  });

  it('returns undefined fields for pages without any metadata', () => {
    const doc = docFromHtml('<html><head></head><body><p>hi</p></body></html>');
    expect(extractPageMetadata(doc)).toEqual({
      title: undefined,
      description: undefined,
      image: undefined,
    });
  });
});
