import api from '$api';
import type { RequestEvent } from '@sveltejs/kit';

export const DELETE = (evt: RequestEvent) => api.handle(evt);
