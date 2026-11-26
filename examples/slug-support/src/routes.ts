import type { Router } from 'express';

import { z } from '@openpeepshq/common/zod';
import { config } from '@openpeepshq/core/config';
import { logger } from '@openpeepshq/core/log';
import { ensurePluginAuth } from '@openpeepshq/core/plugins';
import { findPostBySlug } from '@openpeepshq/core/posts';
import {
  canUseInstanceScoped,
  findProfileRoleKeys,
  generateSlug,
  handleForProfileId,
  isSlugTaken,
  isValidSlug,
  stripHandle,
} from './finders.js';
import { slugSupportConfigSchema } from './configSchema.js';

const log = logger('plugin:slug-support');

// The config namespace/name are the plugin's directory segments
// (`examples/slug-support`) — the loader registers the schema under the
// plugin key, so both sides must use the same split.
const CONFIG_NAMESPACE = 'examples';
const CONFIG_NAME = 'slug-support';

const getConfig = async () => {
  const pluginConfig = await config(CONFIG_NAMESPACE, CONFIG_NAME);
  return slugSupportConfigSchema().parse(pluginConfig);
};

type AuthedRequest = Parameters<Parameters<Router['get']>[1]>[0];
const callerId = (req: AuthedRequest) => req.pluginProfile?.id;

export const routes = async (router: Router): Promise<void> => {
  const auth = ensurePluginAuth();

  // GET /profile → { success, data: { handle, canInstance, instanceScopedRoles } }
  router.get('/profile', auth, async (req, res) => {
    try {
      const cfg = await getConfig();
      const id = callerId(req);
      const handle = await handleForProfileId(id);
      const roleKeys = id ? await findProfileRoleKeys(id) : [];
      const canInstance =
        cfg.enabled &&
        cfg.allowInstanceScoped &&
        cfg.instanceScopedRoles.some((role) => roleKeys.includes(role));
      res.json({
        success: true,
        data: {
          handle: handle ?? null,
          canInstance,
          instanceScopedRoles: cfg.instanceScopedRoles,
        },
      });
    } catch (e) {
      log.error(e, 'profile failed');
      res.status(500).json({ success: false, message: 'Internal error' });
    }
  });

  // GET /check?slug=...[&instanceScoped=true]
  // → { success, data: { available, slug, requiresPermission? } }
  router.get('/check', auth, async (req, res) => {
    try {
      const parsed = z
        .object({
          slug: z.string().min(1),
          instanceScoped: z
            .enum(['true', 'false'])
            .optional()
            .transform((v) => v === 'true'),
        })
        .parse(req.query);
      const instanceScoped = parsed.instanceScoped === true;
      const cfg = await getConfig();
      if (!cfg.enabled) {
        res.json({ success: true, data: { available: false, slug: null } });
        return;
      }
      const slug = parsed.slug;
      if (!isValidSlug(slug, cfg.maxSlugLength)) {
        res.json({ success: true, data: { available: false, slug: null } });
        return;
      }
      const id = callerId(req);
      const handle = instanceScoped ? undefined : await handleForProfileId(id);
      if (instanceScoped && !(await canUseInstanceScoped(id, cfg))) {
        res.json({
          success: true,
          data: { available: false, slug: null, requiresPermission: true },
        });
        return;
      }
      const taken = await isSlugTaken(slug, handle, instanceScoped);
      res.json({
        success: true,
        data: { available: !taken, slug: taken ? null : slug },
      });
    } catch (e) {
      log.error(e, 'check failed');
      res.status(500).json({ success: false, message: 'Internal error' });
    }
  });

  // POST /generate { title, instanceScoped? } → { success, data: { slug } }
  router.post('/generate', auth, async (req, res) => {
    try {
      const parsed = z
        .object({
          title: z.string().min(1),
          instanceScoped: z.boolean().optional(),
        })
        .parse(req.body ?? {});
      const instanceScoped = parsed.instanceScoped === true;
      const cfg = await getConfig();
      if (!cfg.enabled) {
        res.status(400).json({ success: false, message: 'Disabled' });
        return;
      }
      const id = callerId(req);
      if (instanceScoped && !(await canUseInstanceScoped(id, cfg))) {
        res.status(403).json({
          success: false,
          message: 'requiresPermission',
        });
        return;
      }
      const handle = instanceScoped ? undefined : await handleForProfileId(id);
      const slug = await generateSlug(
        parsed.title,
        cfg.maxSlugLength,
        handle,
        instanceScoped,
      );
      if (!slug) {
        res.status(409).json({ success: false, message: 'No slug available' });
        return;
      }
      res.json({ success: true, data: { slug } });
    } catch (e) {
      log.error(e, 'generate failed');
      res.status(500).json({ success: false, message: 'Internal error' });
    }
  });

  // GET /resolve?slug=...&profile=@handle | ?slug=...&instanceScoped=true
  // → { success, data: { postId } } | { success, data: null } (unresolved /
  //   unreadable / disabled slug) | { success: false, message } (scope
  //   conflict, 400)
  router.get('/resolve', auth, async (req, res) => {
    try {
      const parsed = z
        .object({
          slug: z.string().min(1),
          profile: z.string().optional(),
          instanceScoped: z
            .enum(['true', 'false'])
            .optional()
            .transform((v) => v === 'true'),
        })
        .parse(req.query);
      const instanceScoped = parsed.instanceScoped === true;
      if (instanceScoped && parsed.profile) {
        res.status(400).json({ success: false, message: 'scope conflict' });
        return;
      }
      if (!instanceScoped && !parsed.profile) {
        res.status(400).json({ success: false, message: 'scope required' });
        return;
      }
      const cfg = await getConfig();
      if (!cfg.enabled || !isValidSlug(parsed.slug, cfg.maxSlugLength)) {
        res.json({ success: true, data: null });
        return;
      }
      const post = await resolvePost(
        parsed.slug,
        parsed.profile,
        instanceScoped,
      );
      res.json({ success: true, data: post ? { postId: post.id } : null });
    } catch (e) {
      log.error(e, 'resolve failed');
      res.status(500).json({ success: false, message: 'Internal error' });
    }
  });
};

// The resolve route reuses the core slug finder directly so its scope
// resolution matches the SEO routes exactly.
const resolvePost = (
  slug: string,
  profile: string | undefined,
  instanceScoped: boolean,
) =>
  findPostBySlug(
    slug,
    instanceScoped ? undefined : profile ? stripHandle(profile) : undefined,
    instanceScoped,
  );
