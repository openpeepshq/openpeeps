import api from '$api';
import type { RequestEvent } from '@sveltejs/kit';

export const DELETE = async (event: RequestEvent) => api.handle(event);
