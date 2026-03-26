import { json } from '@sveltejs/kit';

export const GET = async () =>
  json({ healthy: true }, { headers: { 'Cache-Control': 'no-cache' } });
