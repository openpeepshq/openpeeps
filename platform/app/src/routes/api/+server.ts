import api from '$api';
import { json, type RequestEvent } from '@sveltejs/kit';

export const GET = async (evt: RequestEvent) => json(await api.openapi(evt));
