import api from '$api';
import type { RequestEvent } from '@sveltejs/kit';

export const GET = (event: RequestEvent) => api.handle(event);
export const DELETE = async (event: RequestEvent) => api.handle(event);
export const PATCH = async (event: RequestEvent) => api.handle(event);
