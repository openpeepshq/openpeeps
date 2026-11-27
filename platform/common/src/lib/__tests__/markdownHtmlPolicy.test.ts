import { describe, expect, it } from 'vitest';
import {
  MARKDOWN_HTML_ALLOWED_ATTRS,
  MARKDOWN_HTML_ALLOWED_TAGS,
  MARKDOWN_HTML_BLOCK_TAGS,
  MARKDOWN_HTML_FORBIDDEN_ATTRS,
  MARKDOWN_HTML_FORBIDDEN_TAGS,
} from '../markdownHtmlPolicy';

// Direct unit tests for the policy leaf itself (review round 7 item 3).
// `markdownHtmlPolicy.ts` is the single source of truth the web (DOMPurify),
// Node/email (DOM-free sanitizer) and RN (plain-text fallback) renderers all
// import. Its content was previously pinned only indirectly through the
// consumer (`markdownHelpers.test.ts`), so a future edit that desyncs the two
// tables INSIDE this leaf would not fail until a consumer test happened to
// exercise it. These invariants fail loudly on the leaf itself.
describe('markdownHtmlPolicy (the shared policy leaf)', () => {
  it('every block tag is also an allowed tag', () => {
    // RN derives its block set from MARKDOWN_HTML_BLOCK_TAGS; a block tag that
    // is not allowed would make RN treat an allowed tag as a line-break
    // container. Pin the subset invariant.
    for (const tag of MARKDOWN_HTML_BLOCK_TAGS) {
      expect(MARKDOWN_HTML_ALLOWED_TAGS, `${tag} must be allowed`).toContain(
        tag,
      );
    }
  });

  it('block tags contain only structural containers, no inline wrappers', () => {
    // `span` is allowed but is an inline wrapper: RN must NOT turn it into a
    // line break (round-2 review item 3). Pin it out of the block set.
    expect(MARKDOWN_HTML_BLOCK_TAGS).not.toContain('span');
    expect(MARKDOWN_HTML_BLOCK_TAGS).not.toContain('a');
  });

  it('the new layout attributes are present', () => {
    for (const attr of ['class', 'colspan', 'rowspan']) {
      expect(MARKDOWN_HTML_ALLOWED_ATTRS, `${attr} must be allowed`).toContain(
        attr,
      );
    }
  });

  it('no event-handler (on*) attribute is in the allowed set', () => {
    // A regression that allowlists an `on*` handler would silently re-open XSS
    // on every renderer that reads this list. Pin it at the leaf.
    for (const attr of MARKDOWN_HTML_ALLOWED_ATTRS) {
      expect(
        attr.toLowerCase(),
        `on* handler ${attr} must not be allowed`,
      ).not.toMatch(/^on[a-z]+$/);
    }
  });

  it('the forbidden tags are a subset of the tags the allowlist omits', () => {
    for (const tag of MARKDOWN_HTML_FORBIDDEN_TAGS) {
      expect(
        MARKDOWN_HTML_ALLOWED_TAGS,
        `${tag} must not be allowed`,
      ).not.toContain(tag);
    }
  });

  it('forbidden attrs are also absent from the allowed attrs', () => {
    for (const attr of MARKDOWN_HTML_FORBIDDEN_ATTRS) {
      expect(
        MARKDOWN_HTML_ALLOWED_ATTRS,
        `${attr} must not be allowed`,
      ).not.toContain(attr);
    }
  });

  it('allows the tag/attribute set the issue required (layout + class)', () => {
    // The report's two-column layout and button classes depend on these
    // surviving the pipeline. Pin the headline invariants on the leaf.
    for (const tag of ['div', 'span', 'table', 'figure']) {
      expect(MARKDOWN_HTML_ALLOWED_TAGS, `${tag} must be allowed`).toContain(
        tag,
      );
    }
    expect(MARKDOWN_HTML_ALLOWED_ATTRS).toContain('class');
    expect(MARKDOWN_HTML_ALLOWED_ATTRS).toContain('style');
  });
});
