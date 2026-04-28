import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Theme settings are client-side only (localStorage)
	// No server-side data needed for now
	return {};
};