import React, { useEffect } from 'react';

import { PLUGIN_ASSETS_PREFIX } from '@openpeeps/common';

import { useOpenpeeps } from '../../contexts/openpeeps';

export const buildPluginAssetUrl = (
  namespace: string,
  name: string,
  asset: string,
): string => `${PLUGIN_ASSETS_PREFIX}/${namespace}/${name}/${asset}`;

export const PluginLoader: React.FC = () => {
  const { client } = useOpenpeeps();

  useEffect(() => {
    let cancelled = false;
    const ownedScripts: HTMLScriptElement[] = [];

    client.plugins
      .manifest()
      .then((result) => {
        if ('error' in result || cancelled) {
          return;
        }

        for (const plugin of result.data) {
          for (const component of plugin.components) {
            const assetUrl = buildPluginAssetUrl(
              plugin.namespace,
              plugin.name,
              component.asset,
            );
            const existing = document.querySelector<HTMLScriptElement>(
              `script[src="${assetUrl}"]`,
            );
            if (existing) {
              continue;
            }
            const script = document.createElement('script');
            script.src = assetUrl;
            script.async = true;
            script.onerror = () => {
              const idx = ownedScripts.indexOf(script);
              if (idx !== -1) ownedScripts.splice(idx, 1);
              script.remove();
              console.error(
                `[openpeeps] Plugin script load failed: ${assetUrl}`,
              );
            };
            document.body.appendChild(script);
            ownedScripts.push(script);
          }
        }
      })
      .catch((err) => {
        // Plugin manifest is optional; do not block the app, but log so
        // plugin visibility issues are diagnosable in the browser console.
        console.error('[openpeeps] Plugin manifest load failed:', err);
      });

    return () => {
      cancelled = true;
      for (const script of ownedScripts) {
        script.remove();
      }
    };
  }, [client]);

  return null;
};
