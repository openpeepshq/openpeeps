import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { marked } from 'marked';
import {
  MARKDOWN_HTML_ALLOWED_TAGS,
  MARKDOWN_HTML_ALLOWED_ATTRS,
  MARKDOWN_HTML_FORBIDDEN_TAGS,
  MARKDOWN_HTML_FORBIDDEN_ATTRS,
  sanitizeMarkdownHtml,
} from '@openpeepshq/common/lib';
import { compileMarkdownToHtml } from './compileMarkdown';

// Parity test (item 7 of the review on PR #2316): the browser path sanitizes
// with DOMPurify and the Node/email path sanitizes with the DOM-free
// `sanitizeMarkdownHtml`. `compileMarkdown.test.ts` pins the DOM-free branch
// only, so this file pins BOTH branches against the same expectations — every
// vector here is asserted to be stripped by *both*, and bare `<` is asserted
// to render as text on *both*. A regression in either branch (e.g. an
// entity-encoded `javascript:` that only one branch catches, or a bare `<`
// that truncates the document) fails here.
//
// The DOMPurify instance is built against a jsdom window with the exact
// allowlist config `compileMarkdownToHtml` passes, so this mirrors the real
// browser branch rather than a hand-rolled one.
const dom = new JSDOM('<!DOCTYPE html><body></body>');
const purify = createDOMPurify(dom.window);

const sanitizeBrowser = (html: string): string =>
  purify.sanitize(html, {
    ALLOWED_TAGS: [...MARKDOWN_HTML_ALLOWED_TAGS],
    ALLOWED_ATTR: [...MARKDOWN_HTML_ALLOWED_ATTRS],
    FORBID_TAGS: [...MARKDOWN_HTML_FORBIDDEN_TAGS],
    FORBID_ATTR: [...MARKDOWN_HTML_FORBIDDEN_ATTRS],
  });

// [input, dangerous substring that must be absent from BOTH outputs,
//  benign substring that must be present in BOTH outputs]
const vectors: [string, string, string][] = [
  ['<a href="javascript:alert(1)">x</a>', 'javascript:', 'x'],
  ['<a href="&#106;avascript:alert(1)">x</a>', 'alert(1)', 'x'],
  ['<a href="jav&#x09;ascript:alert(2)">x</a>', 'alert(2)', 'x'],
  ['<a href="JaVaScRiPt:alert(1)">x</a>', 'alert(1)', 'x'],
  ['<a href="vbscript:alert(1)">x</a>', 'alert(1)', 'x'],
  [
    '<a href="data:text/html,<script>alert(1)</script>">x</a>',
    'data:text/html',
    'x',
  ],
  [
    '<a href="data:image/svg+xml,<svg onload=alert(1)>">x</a>',
    'data:image/svg',
    'x',
  ],
  ['<a href="data:image/png;base64,AAAB">x</a>', 'href="data:', 'x'],
  ['<img src="x" onerror="alert(2)">y', 'onerror', 'y'],
  ['<div>3 < 5 inside</div>', '3 <', '5 inside'],
];

describe('browser (DOMPurify) vs DOM-free sanitizer parity', () => {
  for (const [input, dangerous, benign] of vectors) {
    it(`both branches strip: ${input}`, () => {
      const browser = sanitizeBrowser(input);
      const domfree = sanitizeMarkdownHtml(input);
      expect(browser, 'browser kept dangerous content').not.toContain(
        dangerous,
      );
      expect(domfree, 'dom-free kept dangerous content').not.toContain(
        dangerous,
      );
      expect(browser, 'browser lost benign content').toContain(benign);
      expect(domfree, 'dom-free lost benign content').toContain(benign);
    });
  }

  it('both branches render a bare < as text (no truncation)', () => {
    const input = '<div>Column 2 has 3 < 5 inside</div>';
    const browser = sanitizeBrowser(input);
    const domfree = sanitizeMarkdownHtml(input);
    // DOMPurify emits &lt; for the stray <; the DOM-free branch must match.
    expect(browser).toContain('&lt;');
    expect(domfree).toContain('&lt;');
    // and neither drops the tail of the document.
    expect(browser).toContain('inside');
    expect(domfree).toContain('inside');
  });

  it('both branches keep an image data: URI on img src', () => {
    const input = '<img src="data:image/png;base64,AAAB">';
    expect(sanitizeBrowser(input)).toContain(
      'src="data:image/png;base64,AAAB"',
    );
    expect(sanitizeMarkdownHtml(input)).toContain(
      'src="data:image/png;base64,AAAB"',
    );
  });
});

// Review round-3 item 4: the vectors above are raw HTML fed straight to both
// sanitizers. The email branch's real input is `marked` output, and the
// class-1 re-serialization hole only manifests on the exact shape the
// compiler emits (marked passes raw inline HTML through verbatim). These
// vectors run through `marked` first, on BOTH branches, and additionally
// assert that no attribute *value* in the DOM-free output contains a raw `"`
// (the property a re-serialization bug violates, rather than a single
// dangerous-substring probe).
describe('parity through the real marked pipeline', () => {
  const throughMarked = (md: string): string =>
    marked.parse(md, { async: false }) as string;

  // [markdown source, substring that must be absent from both outputs]
  const markedVectors: [string, string][] = [
    ['x <a href="javascript&colon;alert(1)">link</a> y', 'alert(1)'],
    ['x <a href="jav&Tab;ascript:alert(2)">link</a> y', 'alert(2)'],
    [
      'x <a title=\'a" href="javascript:alert(3)\'>link</a> y',
      'href="javascript:',
    ],
    ['x <a href="&#106avascript:alert(4)">link</a> y', 'alert(4)'],
    ['x <script>alert(5)</script> y', 'alert(5)'],
    // The `"` after the URI: a live `src="data:text/html…"` attribute would
    // end with a raw quote, while an escaped (inert) value has `&quot;`.
    // (The browser branch drops the smuggled attributes outright; the
    // DOM-free branch keeps the value as escaped text — both inert.)
    [
      'x <img title=\'q" src="data:text/html,<script>alert(6)</script>\'> y',
      'data:text/html"',
    ],
  ];

  for (const [md, dangerous] of markedVectors) {
    it(`both branches strip (through marked): ${md}`, () => {
      const html = throughMarked(md);
      const browser = sanitizeBrowser(html);
      const domfree = sanitizeMarkdownHtml(html);
      expect(browser, 'browser kept dangerous content').not.toContain(
        dangerous,
      );
      expect(domfree, 'dom-free kept dangerous content').not.toContain(
        dangerous,
      );
      // and the benign text on either side of the payload survives
      expect(browser).toContain('x');
      expect(browser).toContain('y');
      expect(domfree).toContain('x');
      expect(domfree).toContain('y');
    });
  }

  it('no DOM-free attribute value contains a raw double quote', () => {
    // Catches any future re-serialization hole regardless of the vector:
    // a raw `"` inside a double-quoted attribute value would reparse as a
    // forged second attribute.
    const shapes = [
      'x <a title=\'a" href="javascript:alert(1)\'>link</a> y',
      'x <div class=\'c" onerror="alert(2)\'>y</div> z',
      'x <img src="https://ok.example/i.png" alt="a & b"> y',
    ];
    for (const md of shapes) {
      const out = sanitizeMarkdownHtml(throughMarked(md));
      for (const m of out.matchAll(/\s[a-zA-Z][a-zA-Z0-9]*="([^"]*)"/g)) {
        expect(m[1], `raw quote in value of: ${out}`).not.toContain('"');
      }
    }
  });

  it('compileMarkdownToHtml (email branch) keeps the tail after an unclosed disallowed tag', () => {
    // Review round-3 item 5, pinned through the full pipeline: an unclosed
    // <form> loses its tag but not the document tail (DOMPurify behavior).
    expect(compileMarkdownToHtml('x <form>unclosed y')).toContain('unclosed y');
    // An unclosed <script> is raw-text: in a real parser its body runs to
    // end of input, so everything after the tag (including the trailing
    // </p> marked adds) is its body and is dropped — no payload, no tail.
    const out = compileMarkdownToHtml('x <script>dropped');
    expect(out).not.toContain('dropped');
    expect(out).toContain('x');
    expect(out).not.toContain('</p>');
  });
});

// Review round-4 items 2,3,4,5: pin the per-attribute data: URI policy on the
// remaining media `src` tags, the double-quoted re-serialization mirror, the
// SCHEME_NORMALIZE_RE C0-control edge (NUL/vtab/FF), the unclosed-comment
// truncation, and the style-attribute passthrough policy — each asserted
// identical on BOTH branches so a future policy change in either is a
// deliberate, visible act.
describe('round-4 parity pins (DOM-free vs DOMPurify identical output)', () => {
  // [input, expected output that BOTH branches must produce]
  const bothBranches = (input: string, expected: string) => {
    expect(sanitizeBrowser(input), 'browser').toBe(expected);
    expect(sanitizeMarkdownHtml(input), 'dom-free').toBe(expected);
  };

  it('keeps a double-quoted value containing single quotes verbatim (mirror of the single-quoted pin)', () => {
    // Item 2. The single-quoted pin uses a value containing `"` (must be
    // &quot;-escaped); this is the other serialization family — a
    // double-quoted attribute whose value contains single quotes only. No
    // `"` in the value, so both branches keep it verbatim; it cannot forge a
    // live second attribute.
    bothBranches(
      "<a title=\"x' href='javascript:alert(2)'\">safe</a>",
      "<a title=\"x' href='javascript:alert(2)'\">safe</a>",
    );
  });

  it('applies the data: URI policy per tag, matching DOMPurify (item 3)', () => {
    // DOMPurify's `data:` special case is tag-based (`DEFAULT_DATA_URI_TAGS`
    // = audio/video/img/source/image/track), NOT a `data:image/*` prefix test:
    // it keeps ANY `data:` payload on a media `src` (a browser cannot execute
    // one there) and drops `data:` on `href` and on a non-media `src` such as
    // `iframe`. The DOM-free branch mirrors that tag-based rule exactly.
    // Clean payloads: both branches keep them identically.
    bothBranches(
      '<video src="data:text/html,abc"></video>',
      '<video src="data:text/html,abc"></video>',
    );
    bothBranches(
      '<source src="data:text/html,x">',
      '<source src="data:text/html,x">',
    );
    // A `<script>` payload inside a media-`src` data: URI: DOMPurify drops the
    // attribute (its DOM-clone walk trips on the raw `</>` in the payload); the
    // DOM-free path keeps it, re-escaped. Neither yields an executable script
    // (a media tag does not run a data: script), so assert the payload is inert
    // on BOTH rather than claiming byte-parity for this exotic input.
    expect(
      sanitizeBrowser(
        '<video src="data:text/html,<script>alert(1)</script>"></video>',
      ),
    ).toBe('<video></video>');
    expect(
      sanitizeMarkdownHtml(
        '<video src="data:text/html,<script>alert(1)</script>"></video>',
      ),
    ).not.toMatch(/<script>alert\(1\)<\/script>/);
    // A non-media `src` (iframe) drops the `data:` URI on BOTH branches.
    bothBranches(
      '<iframe src="data:text/html,<script>x</script>"></iframe>',
      '<iframe></iframe>',
    );
    // `href` never carries a `data:` URI, on either branch.
    bothBranches('<a href="data:text/html,x">t</a>', '<a>t</a>');
  });

  it('drops C0-control-obfuscated javascript: hrefs (vtab, FF), keeps NUL inert (item 4)', () => {
    // &#xB; (vtab) and &#12; (FF) decode to C0 controls that the scheme
    // normalizer strips, exposing javascript: -> both branches drop the href.
    bothBranches('<a href="jav&#xB;ascript:alert(1)">x</a>', '<a>x</a>');
    bothBranches('<a href="jav&#12;ascript:alert(2)">x</a>', '<a>x</a>');
    // &#0; (NUL) is excluded from the single-pass decode, so it is not decoded
    // into a live scheme. DOMPurify emits a U+FFFD for it; the DOM-free path
    // re-escapes the reference. Either way the value is inert text (a live
    // javascript: scheme would be absent from the output), so the payload is
    // dead on both branches — asserted via the executable-scheme probe rather
    // than an exact-string equality the two decoders don't share.
    const nulBrowser = sanitizeBrowser(
      '<a href="jav&#0;ascript:alert(1)">x</a>',
    );
    const nulDomfree = sanitizeMarkdownHtml(
      '<a href="jav&#0;ascript:alert(1)">x</a>',
    );
    expect(nulBrowser).not.toContain('javascript:');
    expect(nulDomfree).not.toContain('javascript:');
    expect(nulBrowser).toContain('x');
    expect(nulDomfree).toContain('x');
  });

  it('drops an unclosed comment to end of input (item 4, documented approximation)', () => {
    // Both branches treat an unclosed comment as running to end of input and
    // drop the (ordinary-text) tail. Pinned to the full output, like the
    // unclosed-tag pins.
    bothBranches('x <!-- unclosed comment y', 'x ');
  });

  it('carries the style attribute value through untouched (item 5, policy pin)', () => {
    // The round-1 style policy: `class` is guarded by the on* filter and
    // `style` values are carried through untouched (no URI/inline-style
    // re-parsing). Pin it so a future change to either branch that starts
    // inspecting style values is a deliberate, visible act.
    bothBranches(
      '<div style="background:url(javascript:alert(1))">x</div>',
      '<div style="background:url(javascript:alert(1))">x</div>',
    );
  });
});

// Review round 7 (items 1, 2, 3): the DOM-free URI guard now replicates
// DOMPurify's DEFAULT URI policy (the `IS_ALLOWED_URI` allowlist + the
// tag-based `data:`-on-media special case), so both branches admit exactly the
// same schemes and drop the same dangerous ones. Previously the email branch
// only special-cased javascript:/vbscript:/data:, which let file:/blob:/about:
// /protocol-handler schemes through. One `it` per scheme, asserting the
// browser result and the (now-identical) email result.
describe('round-7: default URI scheme policy parity (both branches)', () => {
  const bothBranches = (input: string, expected: string) => {
    expect(sanitizeBrowser(input), 'browser').toBe(expected);
    expect(sanitizeMarkdownHtml(input), 'dom-free').toBe(expected);
  };

  // Schemes DOMPurify admits (IS_ALLOWED_URI) — kept identically by both.
  it.each([
    ['https://ok.example/a', '<a href="https://ok.example/a">x</a>'],
    ['http://ok.example/a', '<a href="http://ok.example/a">x</a>'],
    ['ftp://f.example/x', '<a href="ftp://f.example/x">x</a>'],
    ['mailto:me@x.com', '<a href="mailto:me@x.com">x</a>'],
    ['tel:+123', '<a href="tel:+123">x</a>'],
    ['callto:+1', '<a href="callto:+1">x</a>'],
    ['sms:+1', '<a href="sms:+1">x</a>'],
    ['cid:msg1', '<a href="cid:msg1">x</a>'],
    ['xmpp:u@x', '<a href="xmpp:u@x">x</a>'],
    ['matrix:room', '<a href="matrix:room">x</a>'],
    ['#anchor', '<a href="#anchor">x</a>'],
    ['relative/path', '<a href="relative/path">x</a>'],
  ])('admits an allowed scheme: %s', (href, expected) =>
    bothBranches(`<a href="${href}">x</a>`, expected),
  );

  // Schemes DOMPurify's default policy rejects — dropped identically by both.
  it.each([
    ['javascript:alert(1)'],
    ['vbscript:alert(1)'],
    ['file:///etc/passwd'],
    ['blob:https://x/y'],
    ['about:blank'],
    ['ms-msdt:'],
    ['search-ms:'],
    ['chrome://settings'],
  ])('drops a disallowed href scheme: %s', (href) =>
    bothBranches(`<a href="${href}">x</a>`, '<a>x</a>'),
  );

  // item 2: `data:` on `iframe src` is dropped (iframe is not a data-URI tag);
  // `data:` on a media `src` (img) is kept — including the script-capable
  // `image/svg+xml` MIME, which DOMPurify special-cases for img (an `<img>`
  // cannot execute an SVG's script) but drops on iframe. Test per branch: the
  // raw `<` in the SVG payload is attribute-escaped on the DOM-free path but
  // the data: URI itself survives on both.
  it('drops data: on iframe src, keeps data: (incl. svg+xml) on img src', () => {
    bothBranches(
      '<iframe src="data:image/svg+xml,<svg onload=x>"></iframe>',
      '<iframe></iframe>',
    );
    // img keeps the svg+xml data: URI on both branches (only the raw `<` is
    // escaped on the DOM-free path; the payload stays inert — img does not run it).
    expect(
      sanitizeBrowser('<img src="data:image/svg+xml,<svg onload=x>" alt="a">'),
    ).toContain('src="data:image/svg+xml');
    expect(
      sanitizeMarkdownHtml(
        '<img src="data:image/svg+xml,<svg onload=x>" alt="a">',
      ),
    ).toContain('src="data:image/svg+xml');
    bothBranches(
      '<img src="data:image/png;base64,AAAB" alt="a">',
      '<img src="data:image/png;base64,AAAB" alt="a">',
    );
    // `href` never carries a data: URI.
    bothBranches('<a href="data:image/png;base64,AAAB">x</a>', '<a>x</a>');
  });

  // item 3: structural (non-URI) output differences are ACCEPTED and
  // documented, not claimed as parity. DOMPurify is a real tokenizer; the
  // DOM-free path is a quote-aware scan. These pins record the exact current
  // divergence so a future reader does not re-derive the (false) "identical
  // output" claim from the round-4 `bothBranches` pins.
  it('documents the accepted structural divergence (unquoted attr with a space)', () => {
    const input = '<iframe src=data:image/svg+xml,<svg onload=x>>';
    // DOMPurify parses the tag and drops the malformed attribute; the DOM-free
    // path keeps the value re-serialized as attribute + orphan text. Neither
    // output carries a live data: URI (both neutralize the payload), so the
    // divergence is benign and pinned only as a non-parity note.
    expect(sanitizeBrowser(input)).toBe('<iframe>></iframe>');
    expect(sanitizeMarkdownHtml(input)).toBe('<iframe>>');
    expect(sanitizeBrowser(input)).not.toContain('data:');
    expect(sanitizeMarkdownHtml(input)).not.toContain('data:');
  });

  // round-7 item 4 (41615): the new `class` support was asserted for the
  // DOM-free branch and the RN fallback, but not the browser path. Pin that
  // `class` survives DOMPurify (the one attribute this issue is about), and
  // that the two-column layout the report needs keeps its classes.
  it('keeps class attributes on the browser path', () => {
    const input =
      '<div class="flex gap-4"><div class="col">L</div><div class="col bg-primary">R</div></div>';
    const browser = sanitizeBrowser(input);
    expect(browser).toContain('class="flex gap-4"');
    expect(browser).toMatch(/class="col[^"]*"/);
    expect(browser).toContain('class="col bg-primary"');
    // and the DOM-free branch keeps the same classes (the issue's button).
    const domfree = sanitizeMarkdownHtml(input);
    expect(domfree).toContain('class="flex gap-4"');
    expect(domfree).toContain('class="col bg-primary"');
  });
});
