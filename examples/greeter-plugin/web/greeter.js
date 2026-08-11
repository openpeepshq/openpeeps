(() => {
  'use strict';

  const registerComponent = (window.__OPENPEEPS_PLUGINS__ || {})
    .registerComponent;

  const GreeterHeader = () => {
    return React.createElement(
      'div',
      {
        style: {
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          color: '#2563eb',
          border: '1px dashed #2563eb',
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
