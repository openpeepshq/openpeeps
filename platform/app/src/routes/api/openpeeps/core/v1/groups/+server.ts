import api from '$api';
import type { RequestEvent } from '@sveltejs/kit';

export const POST = (evt: RequestEvent) => api.handle(evt);
export const GET = (evt: RequestEvent) => api.handle(evt);
