import api from '$api';
import type { RequestEvent } from '@sveltejs/kit';

export const fallback = (evt: RequestEvent) => api.handle(evt);
