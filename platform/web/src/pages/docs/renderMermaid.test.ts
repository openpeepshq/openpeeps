/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  // The "dark theme" and "body-level attribute" cases mutate the shared
  // documentElement/body `data-theme`; reset them between cases so tests do
  // not leak global DOM state into one another. (The docs-site suite has no
  // such hook because that renderer ignores the attribute entirely.)
  document.documentElement.removeAttribute('data-theme');
  document.body?.removeAttribute('data-theme');
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

  it('initializes with the neutral theme when no data-theme attribute is set', async () => {
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

  it('initializes with the dark theme when the theme attribute is Dark', async () => {
    document.documentElement.setAttribute('data-theme', 'Dark');
    const root = document.createElement('div');
    document.body.appendChild(root);
    addBlock(root, 'graph TD\n  A --> B');
    render.mockResolvedValue({ svg: '<svg></svg>', diagramType: 'flowchart' });

    await renderMermaidBlocks(root);

    expect(initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'dark',
    });
    root.remove();
  });

  it('ignores a body-level data-theme attribute', async () => {
    // OpenpeepsThemeProvider writes `data-theme` on the body; only the
    // document-level attribute is read, so a body value must not flip the theme.
    document.body.setAttribute('data-theme', 'OpenpeepsDark');
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
