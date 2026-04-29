import { json } from '@sveltejs/kit';
import { registry } from '$lib/adapters/registry';
import { getServiceConfigs } from '$lib/server/services';
import { jackettAdapter, getJackettIndexers, getJackettIndexerStats, toggleJackettIndexers } from '$lib/adapters/jackett';
import type { RequestHandler } from './$types';

// GET /api/services/indexers?service=jackett|sonarr|radarr
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user?.isAdmin) return json({ error: 'Admin required' }, { status: 403 });

	const serviceType = url.searchParams.get('service');
	if (!serviceType) return json({ error: 'Missing service parameter' }, { status: 400 });

	const configs = getServiceConfigs();
	const config = configs.find((c) => c.type === serviceType && c.enabled);
	if (!config) return json({ error: `No enabled ${serviceType} service found` }, { status: 404 });

	try {
		switch (serviceType) {
			case 'jackett': {
				const indexers = await getJackettIndexers(config);
				const stats = await getJackettIndexerStats(config);
				return json({ indexers, stats });
			}
			case 'sonarr': {
				const adapter = registry.get('sonarr');
				const indexers = await adapter?.getIndexers(config);
				return json({ indexers: indexers ?? [] });
			}
			case 'radarr': {
				const adapter = registry.get('radarr');
				const indexers = await adapter?.getIndexers(config);
				return json({ indexers: indexers ?? [] });
			}
			default:
				return json({ error: 'Unsupported service' }, { status: 400 });
		}
	} catch (e) {
		console.error('[API] indexers GET error', e);
		return json({ error: 'Failed to fetch indexers' }, { status: 500 });
	}
};

// POST /api/services/indexers - Bulk update indexers
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user?.isAdmin) return json({ error: 'Admin required' }, { status: 403 });

	try {
		const body = await request.json();
		const { service, indexerIds, enabled } = body;

		if (!service || !indexerIds) {
			return json({ error: 'Missing required fields: service, indexerIds' }, { status: 400 });
		}

		const configs = getServiceConfigs();
		const config = configs.find((c) => c.type === service && c.enabled);
		if (!config) return json({ error: `No enabled ${service} service found` }, { status: 404 });

		switch (service) {
			case 'jackett': {
				if (enabled === undefined) {
					return json({ error: 'Missing enabled field' }, { status: 400 });
				}
				const result = await toggleJackettIndexers(config, indexerIds, enabled);
				return json(result);
			}
			case 'sonarr': {
				const adapter = registry.get('sonarr');
				if (!adapter?.bulkUpdateIndexers) {
					return json({ error: 'Bulk update not supported' }, { status: 400 });
				}
				const result = await adapter.bulkUpdateIndexers(config, indexerIds, { enable: enabled });
				return json(result);
			}
			case 'radarr': {
				const adapter = registry.get('radarr');
				if (!adapter?.bulkUpdateIndexers) {
					return json({ error: 'Bulk update not supported' }, { status: 400 });
				}
				const result = await adapter.bulkUpdateIndexers(config, indexerIds, { enable: enabled });
				return json(result);
			}
			default:
				return json({ error: 'Unsupported service' }, { status: 400 });
		}
	} catch (e) {
		console.error('[API] indexers POST error', e);
		return json({ error: 'Failed to update indexers' }, { status: 500 });
	}
};