/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import mermaid from 'mermaid';
import { renderMermaidBlocks } from './renderMermaid';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

const initialize = vi.mocked(mermaid.initialize);
const render = vi.mocked(mermaid.render);

const addBlock = (root: HTMLElement, source: string): void => {
  // A ```mermaid fence renders as <pre><code class="language-mermaid">.
  // renderMermaidBlocks replaces the <pre> (code.parentElement) with the svg.
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.className = 'language-mermaid';
  code.textContent = source;
  pre.appendChild(code);
  root.appendChild(pre);
};

// No `afterEach` `data-theme` reset hook here (the web suite has one): this
// renderer ignores the attribute entirely, so the tests never leak global
// DOM state into one another — each case that sets `data-theme` removes it
// again at the end of the test.
beforeEach(() => {
  vi.clearAllMocks();
});

describe('renderMermaidBlocks', () => {
  it('does nothing when the root has no mermaid blocks', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const code = document.createElement('code');
    code.className = 'language-js';
    root.appendChild(code);

    await renderMermaidBlocks(root);

    expect(initialize).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    root.remove();
  });

  it('initializes with the neutral theme and no layout/look override', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    addBlock(root, 'graph TD\n  A --> B');
    render.mockResolvedValue({ svg: '<svg></svg>', diagramType: 'flowchart' });

    await renderMermaidBlocks(root);

    // layout/look are intentionally omitted: mermaid 12's ELK + neo defaults
    // are accepted, so the initialize options stay exactly these three.
    expect(initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'neutral',
    });
    root.remove();
  });

  it('initializes neutral even when a document-level data-theme attribute is set', async () => {
    // The web renderer reads the document-level data-theme attribute; this
    // one does not. Pin the divergence so a copy-paste of the web logic is
    // caught here.
    document.documentElement.setAttribute('data-theme', 'Dark');
    const root = document.createElement('div');
    document.body.appendChild(root);
    addBlock(root, 'graph TD\n  A --> B');
    render.mockResolvedValue({ svg: '<svg></svg>', diagramType: 'flowchart' });

    await renderMermaidBlocks(root);

    expect(initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'neutral',
    });
    document.documentElement.removeAttribute('data-theme');
    root.remove();
  });

  it('replaces a renderable block with a doc-mermaid wrapper', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    addBlock(root, 'graph TD\n  A --> B');
    render.mockResolvedValue({
      svg: '<svg id="diagram"></svg>',
      diagramType: 'flowchart',
    });

    await renderMermaidBlocks(root);

    expect(render).toHaveBeenCalledTimes(1);
    expect(root.querySelector('code.language-mermaid')).toBeNull();
    const wrapper = root.querySelector('.doc-mermaid');
    expect(wrapper).not.toBeNull();
    expect(wrapper!.innerHTML).toContain('<svg');
    root.remove();
  });

  it('keeps the source fence visible when a diagram fails to render', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const source = 'graph TD\n  this is not valid mermaid %%';
    addBlock(root, source);
    render.mockRejectedValue(new Error('parse error'));

    await renderMermaidBlocks(root);

    expect(root.querySelector('.doc-mermaid')).toBeNull();
    const code = root.querySelector('code.language-mermaid');
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe(source);
    root.remove();
  });

  it('skips blocks whose source is empty', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    addBlock(root, '   ');

    await renderMermaidBlocks(root);

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(render).not.toHaveBeenCalled();
    root.remove();
  });
});
