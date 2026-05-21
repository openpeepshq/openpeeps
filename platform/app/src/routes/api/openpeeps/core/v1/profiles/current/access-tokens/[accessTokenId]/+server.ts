import type { RequestEvent } from '@sveltejs/kit';
import api from '$api';

export const DELETE = (event: RequestEvent) => api.handle(event);
