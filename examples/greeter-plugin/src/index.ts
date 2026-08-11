import type { Router } from 'express';
import { z } from 'zod';
import { config } from '@openpeepshq/core/config';
import { logger } from '@openpeepshq/core/log';
import type { PluginManifest } from '@openpeepshq/common';

const log = logger('plugin:greeter');

const greeterConfigSchema = () =>
  z.object({
    greeting: z.string().default('Hello from the Greeter plugin!'),
  });

const getGreeterConfig = async () => {
  // Config is registered under the plugin's directory namespace/name.
  const pluginConfig = await config('examples', 'greeter-plugin');
  return greeterConfigSchema().parse(pluginConfig);
};

export const interceptors = async () => ({
  postCreated: async () => {
    const { greeting } = await getGreeterConfig();
    log.info(`postCreated intercepted, greeting: ${greeting}`);
  },
});

export const routes = async (router: Router) => {
  router.get('/hello', async (_req, res) => {
    const { greeting } = await getGreeterConfig();
    res.json({ message: greeting });
  });
};

export const configSchema = {
  schema: greeterConfigSchema,
  defaults: {
    greeting: 'Hello from the Greeter plugin!',
  },
};

export const manifest: PluginManifest = {
  components: [
    {
      slot: 'plugins.header',
      asset: 'web/greeter.js',
      componentKey: 'examples/greeter-plugin/header',
    },
  ],
};
