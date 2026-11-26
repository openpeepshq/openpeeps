import { useState } from 'react';
import type { PluginStoreListing } from '@openpeepshq/common';
import { Button, LoadingSpinner } from '@openpeepshq/react-ui';
import { useT, useOpenpeeps } from '../../index';

const price = ({ priceCents, currency }: PluginStoreListing) =>
  `${(priceCents / 100).toFixed(2)} ${currency.toUpperCase()}`;

export const PluginStore = ({
  installedKeys,
  onInstalled,
}: {
  installedKeys: Set<string>;
  onInstalled: () => void;
}) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const catalogQuery = openpeepsApi.admin.usePluginStoreCatalog();
  const installPlugin = openpeepsApi.admin.installPluginAction();
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const catalog = catalogQuery.data;
  if (catalogQuery.isLoading) return <LoadingSpinner />;
  if (catalogQuery.isError) {
    return (
      <p className="text-error text-sm">
        {t('admin.plugins.store.error', {
          defaultValue: 'Could not load the plugin store.',
        })}
      </p>
    );
  }
  // No pinned store URL: the store does not exist for this instance.
  if (!catalog?.enabled) return null;

  const install = async (listing: PluginStoreListing) => {
    if (!listing.latest) return;
    setInstalling(listing.id);
    setError(null);
    try {
      await installPlugin({
        type: 'store',
        listing: listing.id,
        version: listing.latest.version,
      });
      onInstalled();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <p className="text-sm font-semibold">
          {t('admin.plugins.store.title', { defaultValue: 'Plugin store' })}
        </p>
        <p className="text-muted-foreground text-xs">
          {t('admin.plugins.store.description', {
            defaultValue:
              'Signed plugins from the store this instance is pinned to. Installed plugins stay disabled until you enable them.',
          })}
        </p>
      </div>
      {!catalog.installable ? (
        <p className="text-muted-foreground text-xs">
          {t('admin.plugins.store.keyMissing', {
            defaultValue:
              'Installing from the store is turned off until the operator sets PLUGIN_STORE_PUBLIC_KEY.',
          })}
        </p>
      ) : null}
      {error ? <p className="text-error text-xs">{error}</p> : null}
      {catalog.listings.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t('admin.plugins.store.empty', {
            defaultValue: 'The store has no published plugins yet.',
          })}
        </p>
      ) : (
        catalog.listings.map((listing) => (
          <div
            key={listing.id}
            className="flex items-start justify-between gap-3 border-t pt-3"
          >
            <div className="min-w-0">
              <p className="font-semibold">
                {listing.title}
                <span className="text-muted-foreground ml-2 text-sm">
                  {listing.latest?.version}
                </span>
              </p>
              <p className="text-muted-foreground text-xs">{listing.id}</p>
              {listing.description ? (
                <p className="text-muted-foreground mt-1 text-sm">
                  {listing.description}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="text-muted-foreground text-xs font-semibold">
                {listing.priceCents > 0
                  ? price(listing)
                  : t('admin.plugins.store.free', { defaultValue: 'Free' })}
              </span>
              {installedKeys.has(listing.id) ? (
                <span className="text-muted-foreground text-xs">
                  {t('admin.plugins.store.installed', {
                    defaultValue: 'Installed',
                  })}
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!catalog.installable || installing !== null}
                  onClick={() => void install(listing)}
                >
                  {installing === listing.id
                    ? t('admin.plugins.installing', {
                        defaultValue: 'Installing...',
                      })
                    : t('admin.plugins.installConfirm', {
                        defaultValue: 'Install',
                      })}
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
