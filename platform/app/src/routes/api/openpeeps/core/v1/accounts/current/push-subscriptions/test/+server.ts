import api from "$api";
import type { RequestEvent } from "../$types";

export const POST = async (event: RequestEvent) => api.handle(event);