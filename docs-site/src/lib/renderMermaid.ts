export const renderMermaidBlocks = async (root: HTMLElement): Promise<void> => {
  const blocks = [
    ...root.querySelectorAll<HTMLElement>('code.language-mermaid'),
  ];
  if (blocks.length === 0) {
    return;
  }

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
