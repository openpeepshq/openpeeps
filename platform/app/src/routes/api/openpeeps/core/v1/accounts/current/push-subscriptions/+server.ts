import type { RequestEvent } from '@sveltejs/kit';
import api from '$api';

export const POST = async (event: RequestEvent) => api.handle(event);
export const GET = async (event: RequestEvent) => api.handle(event);
