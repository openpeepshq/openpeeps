/**
 * MCP react/unreact reaction-input contract (issue #80 review round 4).
 *
 * Pins the tool surface against the client: `react` without a reaction sends
 * the default plain like, a curated emoji is forwarded verbatim, and
 * `unreact` only forwards `?reaction=` when a reaction is supplied (a
 * bodyless retract keeps the server's legacy 👍 fallback). The client is
 * stubbed — the real endpoint semantics are guarded in the client and server
 * suites; here we only check what the MCP tools pass down.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createOpenpeepsMcpServer } from '../createServer.js';

const POST_ID = '3f2c1a5e-6b4d-4e8a-9c7b-1d2e3f4a5b6c';

const posts = vi.hoisted(() => ({
  react: vi.fn(),
  retractReaction: vi.fn(),
}));

vi.mock('@openpeepshq/client', () => ({
  openpeepsClient: () => ({ posts }),
}));

const callTool = async (name: string, arguments_: Record<string, unknown>) => {
  const handler = createMcpHandler(() =>
    createOpenpeepsMcpServer({
      profile: 'community',
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
        method: 'tools/call',
        params: { name, arguments: arguments_ },
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
  await handler.close();
  return payload.result as {
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
};

describe('mcp react/unreact tools', () => {
  beforeEach(() => {
    posts.react.mockReset();
    posts.retractReaction.mockReset();
  });

  it('react without a reaction sends the default plain like', async () => {
    posts.react.mockResolvedValue({ data: { success: true } });
    await callTool('react', { id: POST_ID });

    expect(posts.react).toHaveBeenCalledTimes(1);
    expect(posts.react).toHaveBeenCalledWith(
      { reaction: '👍' },
      { pathParameters: { id: POST_ID } },
    );
  });

  it('react forwards a curated emoji verbatim', async () => {
    posts.react.mockResolvedValue({ data: { success: true } });
    await callTool('react', { id: POST_ID, reaction: '❤️' });

    expect(posts.react).toHaveBeenCalledTimes(1);
    expect(posts.react).toHaveBeenCalledWith(
      { reaction: '❤️' },
      { pathParameters: { id: POST_ID } },
    );
  });

  it('unreact without a reaction sends no reaction query parameter', async () => {
    posts.retractReaction.mockResolvedValue({ data: { success: true } });
    await callTool('unreact', { id: POST_ID });

    expect(posts.retractReaction).toHaveBeenCalledTimes(1);
    expect(posts.retractReaction).toHaveBeenCalledWith({
      pathParameters: { id: POST_ID },
      queryParameters: undefined,
    });
  });

  it('unreact passes ?reaction= only when a reaction is supplied', async () => {
    posts.retractReaction.mockResolvedValue({ data: { success: true } });
    await callTool('unreact', { id: POST_ID, reaction: '❤️' });

    expect(posts.retractReaction).toHaveBeenCalledTimes(1);
    expect(posts.retractReaction).toHaveBeenCalledWith({
      pathParameters: { id: POST_ID },
      queryParameters: { reaction: '❤️' },
    });
  });
});
