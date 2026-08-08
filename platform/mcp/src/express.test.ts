import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import { installMcpEndpoints } from './express.js';

describe('installMcpEndpoints', () => {
  it('skips mounting when OPENPEEPS_MCP=0', () => {
    const previous = process.env.OPENPEEPS_MCP;
    process.env.OPENPEEPS_MCP = '0';
    try {
      const app = express();
      const spy = vi.spyOn(app, 'all');
      expect(installMcpEndpoints(app)).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.OPENPEEPS_MCP;
      else process.env.OPENPEEPS_MCP = previous;
    }
  });

  it('mounts community and ops routes by default', () => {
    const previous = process.env.OPENPEEPS_MCP;
    delete process.env.OPENPEEPS_MCP;
    try {
      const app = express();
      const spy = vi.spyOn(app, 'all');
      expect(installMcpEndpoints(app)).toBe(true);
      const paths = spy.mock.calls.map((call) => call[0]);
      expect(paths).toContain('/mcp/community');
      expect(paths).toContain('/mcp/ops');
    } finally {
      if (previous === undefined) delete process.env.OPENPEEPS_MCP;
      else process.env.OPENPEEPS_MCP = previous;
    }
  });
});
