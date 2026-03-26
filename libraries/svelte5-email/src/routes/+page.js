import { redirect } from '@sveltejs/kit';

export const prerender = true;

/** @type {import('@sveltejs/kit').PageLoad} */
export async function load() {
  redirect(307, `/docs`);
}
