import assert from 'node:assert/strict';
import type { CommunityConfig } from '@openpeepshq/common/types';
import { renderSpaHtmlTemplate, spaHtmlContextFromConfig } from './spaHtml';

const baseConfig = {
  info: {
    name: 'Echo Community',
    tagLine: 'A place for echoes',
  },
  theme: {
    icon: '/img/icon.svg',
    light: {
      primaryHex: '#112233',
      logoSmall: '/img/logo-small.png',
    },
    dark: {
      primaryHex: '#112233',
      logoSmall: '/img/logo-small-white.png',
    },
  },
} as CommunityConfig;

const context = spaHtmlContextFromConfig(
  baseConfig,
  'https://echo.example',
  'https://echo.example/feeds/local',
);
assert.equal(context.name, 'Echo Community');
assert.equal(context.description, 'A place for echoes');
assert.equal(context.imageUrl, 'https://echo.example/img/logo-small.png');
assert.equal(context.themeColor, '#112233');
assert.equal(context.path, '/feeds/local');

const preferenceLogo = spaHtmlContextFromConfig(
  {
    ...baseConfig,
    theme: {
      ...baseConfig.theme,
      light: {
        primaryHex: '#112233',
        logoSmall: 'https://cdn.example/storage/allpeep/1/community-logo.png',
      },
    },
  } as CommunityConfig,
  'https://echo.example',
  'https://echo.example/posts/abc',
);
assert.equal(
  preferenceLogo.imageUrl,
  'https://cdn.example/storage/allpeep/1/community-logo.png',
);

const template = `<!doctype html><html><head>
<meta name="theme-color" content="{{themeColor}}" />
<title>{{name}}</title>
<meta name="description" content="{{description}}" />
<meta property="og:site_name" content="{{name}}" />
<meta property="og:title" content="{{name}}" />
<meta property="og:description" content="{{description}}" />
<meta property="og:url" content="{{pageUrl}}" />
{{#imageUrl}}
<meta property="og:image" content="{{imageUrl}}" />
{{/imageUrl}}
<meta name="twitter:title" content="{{name}}" />
{{#imageUrl}}
<meta name="twitter:image" content="{{imageUrl}}" />
{{/imageUrl}}
</head><body data-path="{{path}}"></body></html>`;

const out = renderSpaHtmlTemplate(template, context);
assert.match(out, /<title>Echo Community<\/title>/);
assert.doesNotMatch(out, /\{\{name\}\}/);
assert.match(out, /property="og:site_name" content="Echo Community"/);
assert.match(out, /property="og:title" content="Echo Community"/);
assert.match(out, /property="og:description" content="A place for echoes"/);
// Mustache escapes `/` as &#x2F; in attributes.
assert.match(
  out,
  /property="og:image" content="https:&#x2F;&#x2F;echo\.example&#x2F;img&#x2F;logo-small\.png"/,
);
assert.match(out, /name="twitter:title" content="Echo Community"/);
assert.match(out, /name="theme-color" content="#112233"/);
assert.match(out, /data-path="&#x2F;feeds&#x2F;local"/);

const escaped = renderSpaHtmlTemplate(
  '<html><head><title>{{name}}</title><meta content="{{description}}" /></head></html>',
  {
    name: 'A <B> & "C"',
    description: 'x < y',
    imageUrl: '',
    pageUrl: 'https://example.com/',
    themeColor: '#000',
    path: '/',
  },
);
assert.match(escaped, /content="x &lt; y"/);
assert.match(escaped, /<title>A &lt;B&gt; &amp; &quot;C&quot;<\/title>/);

const noImage = renderSpaHtmlTemplate(template, {
  ...context,
  imageUrl: '',
});
assert.doesNotMatch(noImage, /og:image/);

console.log('spaHtml.test.ts: ok');
