/**
 * Pins the RN safety contract for `PluginSlot`: it renders nothing (and never
 * throws) when no plugin registry provider is mounted, and also renders
 * nothing for an unregistered slot even inside a provider. The React Native
 * app never mounts `PluginRegistryProvider`, and several RN screens (feeds,
 * plugins, admin) embed `PluginSlot` for live slot names — so this is what
 * keeps those pages safe on every platform.
 *
 * The real component is imported from `@openpeepshq/react` source (the same
 * source the RN app consumes via the `react-native` condition), so the
 * `useContext` default path is exercised for real; only the i18n leaf is
 * mocked, since it drags in ESM-only deps the Jest node env cannot parse.
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Only the i18n leaf is mocked (its barrel drags in ESM-only deps the Jest
// node env cannot parse); the real slot component is loaded below.
jest.mock('../../../../react/src/i18n', () => ({
  useT: () => (key: string) => key,
}));

// The real slot component, not the package barrel (which pulls native/ESM deps).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  PluginSlot,
} = require('../../../../react/src/components/registry/PluginSlot');

describe('PluginSlot without a provider (RN)', () => {
  it('renders nothing instead of throwing when the registry is unmounted', () => {
    let tree: ReactTestRenderer.ReactTestRendererJSON | null = null;
    ReactTestRenderer.act(() => {
      const renderer = ReactTestRenderer.create(
        React.createElement(PluginSlot, {
          name: 'plugins.header',
          props: { className: 'p-4' },
        })
      );
      tree = renderer.toJSON();
    });
    expect(tree).toBeNull();
  });

  it('renders nothing for an unregistered slot even inside a provider', () => {
    // Belt-and-braces: with a provider mounted but no component registered
    // for the slot, the slot must still emit no DOM (the RN app's real state).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      PluginRegistryProvider,
    } = require('../../../../react/src/components/registry/PluginRegistryProvider');
    let tree: ReactTestRenderer.ReactTestRendererJSON | null = null;
    ReactTestRenderer.act(() => {
      const renderer = ReactTestRenderer.create(
        React.createElement(
          PluginRegistryProvider,
          null,
          React.createElement(PluginSlot, {
            name: 'plugins.header',
            props: { className: 'mb-6' },
          })
        )
      );
      tree = renderer.toJSON();
    });
    expect(tree).toBeNull();
  });
});
