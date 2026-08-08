import { describe, expect, it } from 'vitest';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createOpenpeepsMcpServer } from './createServer.js';
import { createOpenpeepsMcpHttpHandler } from './http.js';
import {
  COMMUNITY_TOOL_NAMES,
  OPS_TOOL_NAMES,
  toolNamesForProfile,
} from './types.js';

const listTools = async (profile: 'community' | 'ops') => {
  const handler = createMcpHandler(() =>
    createOpenpeepsMcpServer({
      profile,
      token: 'test-token',
      baseUrl: 'http://127.0.0.1:5173',
    }),
  );

  const response = await handler.fetch(
    new Request('http://127.0.0.1/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      }),
    }),
    {
      authInfo: {
        token: 'test-token',
        clientId: 'test',
        scopes: [],
      },
    },
  );

  const text = await response.text();
  const dataLine = text.split('\n').find((line) => line.startsWith('data: '));
  const payload = dataLine
    ? JSON.parse(dataLine.slice('data: '.length))
    : JSON.parse(text);

  const names = (payload.result?.tools ?? []).map(
    (tool: { name: string }) => tool.name,
  ) as string[];
  await handler.close();
  return names.sort();
};

describe('toolNamesForProfile', () => {
  it('keeps community and ops catalogs disjoint for admin tools', () => {
    const community = new Set(toolNamesForProfile('community'));
    for (const name of OPS_TOOL_NAMES) {
      expect(community.has(name)).toBe(false);
    }
  });
});

describe('createOpenpeepsMcpServer', () => {
  it('registers community tools only on the community profile', async () => {
    const names = await listTools('community');
    expect(names).toEqual([...COMMUNITY_TOOL_NAMES].sort());
    expect(names.some((n) => n.startsWith('admin_'))).toBe(false);
  });

  it('registers ops tools only on the ops profile', async () => {
    const names = await listTools('ops');
    expect(names).toEqual([...OPS_TOOL_NAMES].sort());
    expect(names).toContain('admin_delete_group');
  });
});

describe('createOpenpeepsMcpHttpHandler', () => {
  it('fails when auth token is missing', async () => {
    const handler = createOpenpeepsMcpHttpHandler({
      profile: 'community',
      baseUrl: 'http://127.0.0.1:5173',
    });

    const response = await handler.fetch(
      new Request('http://127.0.0.1/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        }),
      }),
    );

    // Factory throws without authInfo; handler surfaces an error response.
    expect(response.ok).toBe(false);
    await handler.close();
  });
});
