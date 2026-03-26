import api from '$api';
import type { RequestEvent } from '@sveltejs/kit';

export const PUT = (evt: RequestEvent) => api.handle(evt);
