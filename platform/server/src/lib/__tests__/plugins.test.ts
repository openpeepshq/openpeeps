import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { PLUGIN_ASSETS_PREFIX } from '@openpeepshq/common';
import { pluginAssetsMiddleware } from '../plugins';

let registeredPlugins: Array<{
  key: string;
  namespace: string;
  name: string;
  status: 'loaded' | 'failed';
}> = [];

vi.mock('@openpeepshq/core/plugins', () => ({
  getPlugins: () => registeredPlugins,
  getPluginModule: () => undefined,
}));

const makeRequest = (
  app: express.Express,
  url: string,
): Promise<{ status: number; body: string }> => {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo;
      const request = http.get(
        `http://127.0.0.1:${address.port}${url}`,
        (response) => {
          let body = '';
          response.on('data', (chunk) => {
            body += chunk.toString();
          });
          response.on('end', () => {
            server.close(() =>
              resolve({ status: response.statusCode ?? 0, body }),
            );
          });
        },
      );
      request.on('error', (err) => {
        server.close(() => reject(err));
      });
    });
    server.on('error', reject);
  });
};

describe('pluginAssetsMiddleware', () => {
  let tempDir: string;
  let pluginsPath: string;
  let app: express.Express;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opeeps-plugin-test-'));
    pluginsPath = path.join(tempDir, 'plugins');
    app = express();
    app.use(PLUGIN_ASSETS_PREFIX, pluginAssetsMiddleware(pluginsPath));

    registeredPlugins = [
      {
        key: 'openpeeps/greeting',
        namespace: 'openpeeps',
        name: 'greeting',
        status: 'loaded',
      },
    ];
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    registeredPlugins = [];
  });

  const createAsset = (relativePath: string, content: string) => {
    const assetPath = path.join(
      pluginsPath,
      'openpeeps',
      'greeting',
      relativePath,
    );
    fs.mkdirSync(path.dirname(assetPath), { recursive: true });
    fs.writeFileSync(assetPath, content);
  };

  it('serves a valid web asset', async () => {
    createAsset('web/widget.js', 'console.log("widget")');
    const response = await makeRequest(
      app,
      '/plugin-assets/openpeeps/greeting/web/widget.js',
    );
    expect(response.status).toBe(200);
    expect(response.body).toBe('console.log("widget")');
  });

  it('serves assets with cache-busting query strings', async () => {
    createAsset('web/widget.js', 'console.log("widget")');
    const response = await makeRequest(
      app,
      '/plugin-assets/openpeeps/greeting/web/widget.js?v=123',
    );
    expect(response.status).toBe(200);
    expect(response.body).toBe('console.log("widget")');
  });

  it('rejects traversal attempts using web/../dist', async () => {
    createAsset('dist/index.js', 'backend');
    const response = await makeRequest(
      app,
      '/plugin-assets/openpeeps/greeting/web/../dist/index.js',
    );
    expect(response.status).toBe(403);
  });

  it('rejects non-web asset paths', async () => {
    createAsset('dist/index.js', 'backend');
    const response = await makeRequest(
      app,
      '/plugin-assets/openpeeps/greeting/dist/index.js',
    );
    expect(response.status).toBe(403);
  });

  it('returns 404 when the requested asset file does not exist', async () => {
    const response = await makeRequest(
      app,
      '/plugin-assets/openpeeps/greeting/web/missing.js',
    );
    expect(response.status).toBe(404);
  });

  it('returns 404 for unregistered plugins', async () => {
    createAsset('web/widget.js', 'console.log("widget")');
    const response = await makeRequest(
      app,
      '/plugin-assets/other/plugin/web/widget.js',
    );
    expect(response.status).toBe(404);
  });

  it('rejects invalid namespace characters', async () => {
    createAsset('web/widget.js', 'console.log("widget")');
    const response = await makeRequest(
      app,
      '/plugin-assets/..%2Fetc/greeting/web/widget.js',
    );
    expect(response.status).toBe(403);
  });

  it('returns 404 for plugins that failed to load', async () => {
    createAsset('web/widget.js', 'console.log("widget")');
    registeredPlugins = [
      {
        key: 'openpeeps/greeting',
        namespace: 'openpeeps',
        name: 'greeting',
        status: 'failed',
      },
    ];
    const response = await makeRequest(
      app,
      '/plugin-assets/openpeeps/greeting/web/widget.js',
    );
    expect(response.status).toBe(404);
  });
});
