export const renderMermaidBlocks = async (root: HTMLElement): Promise<void> => {
  const blocks = [
    ...root.querySelectorAll<HTMLElement>('code.language-mermaid'),
  ];
  if (blocks.length === 0) {
    return;
  }

  // mermaid 12 emits ES2024, which moves the web browser-support floor to
  // Safari 17.4+ (accepted with the 12.3.0 bump).
  const { default: mermaid } = await import('mermaid');
  // Only the document-level `data-theme` drives the theme here; a body-level
  // attribute (written by the theme provider) is intentionally not read.
  const dark =
    document.documentElement.getAttribute('data-theme')?.includes('Dark') ===
    true;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: dark ? 'dark' : 'neutral',
  });

  await Promise.all(
    blocks.map(async (block, index) => {
      const source = block.textContent ?? '';
      if (!source.trim()) {
        return;
      }
      const id = `doc-mermaid-${index}-${crypto.randomUUID()}`;
      try {
        const { svg } = await mermaid.render(id, source);
        if (!root.isConnected) {
          return;
        }
        const wrapper = document.createElement('div');
        wrapper.className = 'doc-mermaid';
        wrapper.innerHTML = svg;
        block.parentElement?.replaceWith(wrapper);
      } catch {
        // Keep the source fence visible if the diagram cannot be rendered.
      }
    }),
  );
};
