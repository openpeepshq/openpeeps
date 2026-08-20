(() => {
  'use strict';

  const registerComponent = (window.__OPENPEEPS_PLUGINS__ || {})
    .registerComponent;

  // Prefer the host's resolved theme colors so the widget follows the
  // community theme instead of a hardcoded palette. Falls back to a fixed
  // blue if the host hasn't published `window.__OPENPEEPS_THEME__` (older
  // host versions) or a token is missing. See docs/PLUGINS.md, "Theming".
  const theme = window.__OPENPEEPS_THEME__ || {};
  const primary = theme.primary || 'rgb(37, 99, 235)';
  const tintedBackground = `color-mix(in srgb, ${primary} 10%, transparent)`;

  const GreeterHeader = () => {
    return React.createElement(
      'div',
      {
        style: {
          backgroundColor: tintedBackground,
          color: primary,
          border: `1px dashed ${primary}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          textAlign: 'center',
        },
      },
      'Hello from the Greeter plugin frontend component!',
    );
  };

  if (typeof registerComponent === 'function') {
    registerComponent(
      'plugins.header',
      'examples/greeter-plugin/header',
      GreeterHeader,
    );
  }
})();
