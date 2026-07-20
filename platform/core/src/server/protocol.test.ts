import { describe, expect, it } from 'vitest';
import { protocolForServerHost } from './index';

describe('protocolForServerHost', () => {
  it('uses SERVER_PROTOCOL when set', () => {
    expect(protocolForServerHost('example.com', 'http')).toBe('http');
    expect(protocolForServerHost('localhost:8080', 'https')).toBe('https');
  });

  it('uses http for loopback hosts', () => {
    expect(protocolForServerHost('localhost:5174')).toBe('http');
    expect(protocolForServerHost('127.0.0.1:8080')).toBe('http');
    expect(protocolForServerHost('[::1]:8080')).toBe('http');
  });

  it('uses http for docker/CI service hostnames', () => {
    expect(protocolForServerHost('web:8080')).toBe('http');
    expect(protocolForServerHost('oauth')).toBe('http');
  });

  it('uses https for public hostnames', () => {
    expect(protocolForServerHost('community.example.com')).toBe('https');
    expect(protocolForServerHost('community.example.com:443')).toBe('https');
  });
});
