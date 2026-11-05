import { config } from '../config';
import { handleTxtName, handleTxtRecord } from './crawl';
import { isPublicHandleDomain } from './identity';

export type HandleDnsProvider = 'cloudflare' | 'hetzner' | 'digitalocean';

export type HandleTxtTarget = {
  atHandle: string;
  did: string;
};

const json = async (response: Response) => {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`DNS API ${response.status}: ${body.slice(0, 400)}`);
  }
  return body ? (JSON.parse(body) as Record<string, unknown>) : {};
};

const relativeName = (fqdn: string, zone: string) => {
  const suffix = `.${zone}`;
  if (fqdn === zone) return '@';
  if (fqdn.endsWith(suffix)) return fqdn.slice(0, -suffix.length);
  return fqdn;
};

const zoneCandidates = (domain: string) => {
  const labels = domain.split('.').filter(Boolean);
  return labels.slice(0, -1).map((_, index) => labels.slice(index).join('.'));
};

const upsertCloudflare = async (
  token: string,
  zone: string,
  name: string,
  content: string,
) => {
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
  let zoneId: string | undefined;
  for (const candidate of zoneCandidates(zone)) {
    const listed = await json(
      await fetch(
        `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(candidate)}`,
        { headers },
      ),
    );
    const result = listed.result as { id?: string }[] | undefined;
    zoneId = result?.[0]?.id;
    if (zoneId) break;
  }
  if (!zoneId) throw new Error(`No Cloudflare zone for ${zone}`);
  const existing = await json(
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=TXT&name=${encodeURIComponent(name)}`,
      { headers },
    ),
  );
  const record = (existing.result as { id?: string }[] | undefined)?.[0];
  const payload = JSON.stringify({
    type: 'TXT',
    name,
    content,
    ttl: 60,
  });
  if (record?.id) {
    await json(
      await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`,
        { method: 'PATCH', headers, body: payload },
      ),
    );
    return;
  }
  await json(
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
      { method: 'POST', headers, body: payload },
    ),
  );
};

const upsertHetzner = async (
  token: string,
  zone: string,
  fqdn: string,
  content: string,
) => {
  const headers = {
    'Auth-API-Token': token,
    'content-type': 'application/json',
  };
  const listed = await json(
    await fetch('https://dns.hetzner.com/api/v1/zones', { headers }),
  );
  const zones = listed.zones as { id?: string; name?: string }[] | undefined;
  const match = zoneCandidates(zone).find((name) =>
    zones?.some((item) => item.name === name),
  );
  const zoneId = zones?.find((item) => item.name === match)?.id;
  if (!zoneId || !match) throw new Error(`No Hetzner zone for ${zone}`);
  const name = relativeName(fqdn, match);
  const records = await json(
    await fetch(
      `https://dns.hetzner.com/api/v1/records?zone_id=${encodeURIComponent(zoneId)}`,
      { headers },
    ),
  );
  const record = (
    records.records as
      | { id?: string; name?: string; type?: string }[]
      | undefined
  )?.find((item) => item.type === 'TXT' && item.name === name);
  const payload = JSON.stringify({
    zone_id: zoneId,
    type: 'TXT',
    name,
    value: content,
    ttl: 60,
  });
  if (record?.id) {
    await json(
      await fetch(`https://dns.hetzner.com/api/v1/records/${record.id}`, {
        method: 'PUT',
        headers,
        body: payload,
      }),
    );
    return;
  }
  await json(
    await fetch('https://dns.hetzner.com/api/v1/records', {
      method: 'POST',
      headers,
      body: payload,
    }),
  );
};

const upsertDigitalOcean = async (
  token: string,
  zone: string,
  fqdn: string,
  content: string,
) => {
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
  let domain = '';
  for (const candidate of zoneCandidates(zone)) {
    const response = await fetch(
      `https://api.digitalocean.com/v2/domains/${encodeURIComponent(candidate)}`,
      { headers },
    );
    if (response.ok) {
      domain = candidate;
      break;
    }
  }
  if (!domain) throw new Error(`No DigitalOcean domain for ${zone}`);
  const name = relativeName(fqdn, domain);
  const listed = await json(
    await fetch(
      `https://api.digitalocean.com/v2/domains/${encodeURIComponent(domain)}/records?type=TXT&name=${encodeURIComponent(name)}`,
      { headers },
    ),
  );
  const record = (listed.domain_records as { id?: number }[] | undefined)?.[0];
  const payload = JSON.stringify({
    type: 'TXT',
    name,
    data: content,
    ttl: 60,
  });
  if (record?.id != null) {
    await json(
      await fetch(
        `https://api.digitalocean.com/v2/domains/${encodeURIComponent(domain)}/records/${record.id}`,
        { method: 'PUT', headers, body: payload },
      ),
    );
    return;
  }
  await json(
    await fetch(
      `https://api.digitalocean.com/v2/domains/${encodeURIComponent(domain)}/records`,
      { method: 'POST', headers, body: payload },
    ),
  );
};

export const handleDnsConfigured = async () => {
  const cfg = await config();
  const dns = cfg.atproto.handleDns;
  return Boolean(
    cfg.atproto.active &&
      dns?.enabled &&
      dns.apiToken &&
      isPublicHandleDomain(cfg.atproto.handleDomain),
  );
};

export const publishHandleTxt = async (target: HandleTxtTarget) => {
  const cfg = await config();
  if (!(await handleDnsConfigured())) return null;
  const dns = cfg.atproto.handleDns;
  const token = dns.apiToken;
  if (!token) return null;
  const name = handleTxtName(target.atHandle);
  const content = handleTxtRecord(target.did);
  const zone = cfg.atproto.handleDomain;
  if (dns.provider === 'hetzner') {
    await upsertHetzner(token, zone, name, content);
  } else if (dns.provider === 'digitalocean') {
    await upsertDigitalOcean(token, zone, name, content);
  } else {
    await upsertCloudflare(token, zone, name, content);
  }
  return { name, content, provider: dns.provider };
};
