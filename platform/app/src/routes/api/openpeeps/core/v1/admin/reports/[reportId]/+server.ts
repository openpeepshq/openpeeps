import api from '$api';
import type { RequestEvent } from '@sveltejs/kit';

export const GET = (evt: RequestEvent) => api.handle(evt);