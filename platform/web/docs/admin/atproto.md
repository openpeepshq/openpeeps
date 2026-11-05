# AT Protocol handles and DNS

OpenPeeps can project public notes onto the AT Protocol so a public
relay (for example `bsky.network`) can crawl this community. Members
keep using OpenPeeps. The official Bluesky app is **not** a supported
login client for this server.

Foreign AppViews resolve `@alice.community.example` **without** calling
our `resolveHandle`. They look up either:

1. DNS TXT `_atproto.alice.community.example` → `did=did:web:…`
2. or HTTPS `https://alice.community.example/.well-known/atproto-did`

The DID document and `/xrpc` stay on the apex
(`https://community.example`). Only handle resolution needs extra DNS.

Set **Administration → Configuration → Core → AT Protocol**:

- `active`: true
- `handleDomain`: the public DNS name (`community.example`)
- Restart the API after changing `active` so `/xrpc` mounts

Then pick **one** of the two DNS setups below.

<div style="height:20px"></div>

## Preferred for self-hosting — per-handle TXT

This avoids Traefik wildcard hosts and extra certificates. AppView
never has to open `https://alice.community.example`.

In the same AT Protocol settings, enable **Publish per-handle DNS TXT**
and choose the DNS provider Lego would use:

| Provider     | Token                                                |
| ------------ | ---------------------------------------------------- |
| Cloudflare   | `CF_DNS_API_TOKEN` (Zone.DNS Edit on `handleDomain`) |
| Hetzner      | `HETZNER_API_KEY` (DNS API)                          |
| DigitalOcean | `DO_AUTH_TOKEN`                                      |

OpenPeeps upserts `_atproto.{label}.{handleDomain}` with
`did={did}` when a local AT identity is minted, on API/worker start
(existing members), and through the `atproto-handle-dns` queue. The
apex `A/AAAA` record you already have is enough.

Confirm with:

```
dig TXT _atproto.alice.community.example +short
```

It should print `"did=did:web:community.example:atproto:users:alice"`.

You do **not** need `*.community.example` in Traefik for this path.

<div style="height:20px"></div>

## Alternative — wildcard host (HTTPS well-known)

Use this when you cannot give the community a DNS API token. Add a
single wildcard record pointing at the same address as the apex:

| Type   | Name | Target                       |
| ------ | ---- | ---------------------------- |
| A/AAAA | `@`  | your existing community host |
| A/AAAA | `*`  | the same host                |

Traefik must match handle hosts as well as the apex:

```
traefik.http.routers.openpeeps.rule=Host(`community.example`) || HostRegexp(`^[a-z0-9-]+\\.community\\.example$`)
```

### TLS for the wildcard path

Let’s Encrypt will not issue `*.community.example` over HTTP-01.

**Wildcard certificate (DNS-01).** Configure Traefik’s resolver with a
DNS challenge (Lego + your DNS provider) and issue one cert for
`community.example` and `*.community.example`.

**On-demand certificate per handle (HTTP-01).** Traefik requests a
cert the first time a handle host is seen. That first handshake often
fails. When TXT publishing is **off**, OpenPeeps warms
`https://{label}.{handleDomain}/.well-known/atproto-did` after minting
a handle. Do not use this for a mass backfill — use a wildcard cert
instead. `localhost` skips warmup.

<div style="height:20px"></div>

## After DNS works

1. Apex DID document:
   `https://{handleDomain}/atproto/users/{label}/did.json`
2. Handle resolution — TXT **or** well-known HTTPS, matching the setup
   you chose
3. Call `com.atproto.sync.requestCrawl` (authenticated AT session)
   against your relay (`relayUrl`, default `https://bsky.network`)

Do not subscribe this instance to the full `bsky.network` firehose.
Inbound AT content is allowlisted (`allowedPdsHosts`) and off by
default (`ingestEnabled`).

<div style="height:20px"></div>

## Checklist

| Setup           | What you do                                                                |
| --------------- | -------------------------------------------------------------------------- |
| TXT (self-host) | API token in Core → AT Protocol → handle DNS; worker publishes records     |
| Wildcard host   | `*.{handleDomain}` A/AAAA + Traefik HostRegexp + wildcard or on-demand TLS |
| Both            | `atproto.active`, `handleDomain`, then `requestCrawl`                      |

The official Bluesky client logging into this PDS is out of scope.
