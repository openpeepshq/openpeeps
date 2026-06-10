import { json } from '@sveltejs/kit';

/** Liveness/readiness probe for load balancers and CI integration tests. */
export const GET = () => json({ status: 'ok' });
