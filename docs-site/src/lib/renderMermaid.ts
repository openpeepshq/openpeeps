export const renderMermaidBlocks = async (root: HTMLElement): Promise<void> => {
  const blocks = [
    ...root.querySelectorAll<HTMLElement>('code.language-mermaid'),
  ];
  if (blocks.length === 0) {
    return;
  }

  // mermaid 12 emits ES2024, which moves the browser-support floor to
  // Safari 17.4+ (accepted with the 12.3.0 bump).
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
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
