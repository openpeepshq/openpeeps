import type { Router } from 'express';
import { z } from 'zod';
import { config } from '@openpeepshq/core/config';
import { logger } from '@openpeepshq/core/log';
import type { PluginManifest } from '@openpeepshq/common';

const log = logger('plugin:greeting');

const greetingConfigSchema = () =>
  z.object({
    greeting: z.string().default('Hello from the Greeting plugin!'),
  });

const getGreetingConfig = async () => {
  // Config is registered under the plugin's directory namespace/name.
  const pluginConfig = await config('openpeeps', 'greeting');
  return greetingConfigSchema().parse(pluginConfig);
};

export const interceptors = async () => ({
  postCreated: async () => {
    const { greeting } = await getGreetingConfig();
    log.info(`postCreated intercepted, greeting: ${greeting}`);
  },
});

export const routes = async (router: Router) => {
  router.get('/hello', async (_req, res) => {
    const { greeting } = await getGreetingConfig();
    res.json({ message: greeting });
  });
};

export const configSchema = {
  schema: greetingConfigSchema,
  defaults: {
    greeting: 'Hello from the Greeting plugin!',
  },
};

export const manifest: PluginManifest = {
  components: [
    {
      slot: 'plugins.header',
      asset: 'web/greeting.js',
      componentKey: 'openpeeps/greeting/header',
    },
  ],
};
