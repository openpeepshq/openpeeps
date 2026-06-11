import type { Express } from 'express';
import { config } from '@openpeeps/core/config';

const LIVEKIT_CLIENT_VERSION = '2.19.2';

const renderJamEgressPage = (
  eventId: string,
  serviceToken: string,
  livekitUrl: string,
) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Jam recording</title>
  <style>
    html, body { margin: 0; background: #000; height: 100%; }
    #grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 4px;
      height: 100%;
      width: 100%;
    }
    video { width: 100%; height: 100%; object-fit: cover; background: #111; }
    #status { color: #fff; font: 14px system-ui, sans-serif; padding: 8px; }
  </style>
</head>
<body>
  <div id="status">Connecting…</div>
  <div id="grid"></div>
  <script type="module">
    import { Room, RoomEvent, Track } from 'https://cdn.jsdelivr.net/npm/livekit-client@${LIVEKIT_CLIENT_VERSION}/+esm';

    const eventId = ${JSON.stringify(eventId)};
    const serviceToken = ${JSON.stringify(serviceToken)};
    const livekitUrl = ${JSON.stringify(livekitUrl)};
    const statusEl = document.getElementById('status');
    const grid = document.getElementById('grid');
    let signaled = false;

    const signalStart = () => {
      if (signaled) return;
      signaled = true;
      statusEl.textContent = 'Recording';
      console.log('START_RECORDING');
    };

    try {
      const tokenRes = await fetch('/api/openpeeps/core/v1/jams/' + eventId + '/token', {
        headers: { Authorization: 'Bearer ' + serviceToken },
      });
      const tokenJson = await tokenRes.json();
      const jamToken = tokenJson.token ?? tokenJson.data?.token;
      const serverUrl = tokenJson.livekitUrl ?? tokenJson.data?.livekitUrl ?? livekitUrl;
      if (!jamToken) {
        statusEl.textContent = 'Failed to get jam token';
        throw new Error('jam token missing');
      }

      const room = new Room();
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Video) return;
        const el = track.attach();
        statusEl.remove();
        const cell = document.createElement('div');
        cell.appendChild(el);
        grid.appendChild(cell);
        signalStart();
      });
      room.on(RoomEvent.Connected, () => {
        setTimeout(signalStart, 1500);
      });

      await room.connect(serverUrl, jamToken);
    } catch (err) {
      statusEl.textContent = String(err);
      console.error(err);
    }
  </script>
</body>
</html>`;

export const installJamEgressPage = (app: Express) => {
  app.get('/egress/jams/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const token = req.query.token;
    if (typeof token !== 'string' || !token) {
      res.status(400).send('token query parameter required');
      return;
    }

    const { jams } = await config();
    if (!jams.livekit.url) {
      res.status(503).send('LiveKit not configured');
      return;
    }

    res
      .type('html')
      .send(renderJamEgressPage(eventId, token, jams.livekit.url));
  });
};
