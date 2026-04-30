import { json } from '@sveltejs/kit';
import { registry } from '$lib/adapters/registry';
import { getServiceConfig } from '$lib/server/services';
import { getUserCredentialForService } from '$lib/server/auth';
import { withCache } from '$lib/server/cache';
import type { RequestHandler } from './$types';

// GET /api/media?serviceId=xxx&sourceId=yyy
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const serviceId = url.searchParams.get('serviceId');
	const sourceId = url.searchParams.get('sourceId');

	if (!serviceId || !sourceId) {
		return json({ error: 'Missing serviceId or sourceId' }, { status: 400 });
	}

	const config = getServiceConfig(serviceId);
	if (!config) return json({ error: 'Service not found' }, { status: 404 });

	const adapter = registry.get(config.type);
	if (!adapter?.getItem) {
		return json({ error: 'Adapter does not support item fetch' }, { status: 501 });
	}

	const userId = locals.user?.id;
	const userCred = userId && adapter.userLinkable
		? getUserCredentialForService(userId, serviceId) ?? undefined
		: undefined;

	try {
		// Cache item detail for 60s — same item fetched by detail page and cards
		const item = await withCache(`media:${serviceId}:${sourceId}`, 60_000, () =>
			adapter.getItem!(config, sourceId!, userCred)
		);
		if (!item) return json({ error: 'Item not found' }, { status: 404 });
		return json(item);
	} catch (e) {
		console.error('[API] media GET error', e);
		return json({ error: 'Failed to fetch item' }, { status: 500 });
	}
};

// POST /api/media/manage — Add/search/interactive search for Sonarr/Radarr
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = await request.json();
	const { serviceId, action, payload, mediaId } = body;
	if (!serviceId || !action) return json({ error: 'Missing serviceId or action' }, { status: 400 });

	const config = getServiceConfig(serviceId);
	if (!config) return json({ error: 'Service not found' }, { status: 404 });
	const adapter = registry.get(config.type);
	if (!adapter) return json({ error: 'Adapter not found' }, { status: 404 });

	try {
		let result;
		if (action === 'add') {
			if (!adapter.addMedia) return json({ error: 'Not supported' }, { status: 400 });
			result = await adapter.addMedia(config, payload);
		} else if (action === 'search') {
			if (!adapter.searchMedia) return json({ error: 'Not supported' }, { status: 400 });
			result = await adapter.searchMedia(config, mediaId);
		} else if (action === 'interactiveSearch') {
			if (!adapter.interactiveSearch) return json({ error: 'Not supported' }, { status: 400 });
			result = await adapter.interactiveSearch(config, mediaId);
		} else {
			return json({ error: 'Unknown action' }, { status: 400 });
		}
		return json({ ok: true, result });
	} catch (e) {
		console.error('[API] media POST error', e);
		return json({ error: 'Failed to perform action' }, { status: 500 });
	}
};
