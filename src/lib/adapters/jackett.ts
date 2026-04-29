import type { ServiceAdapter } from './base';
import type { ServiceConfig, ServiceHealth } from './types';
import { withCache } from '../server/cache';

async function jackettFetch(config: ServiceConfig, path: string, params?: Record<string, string>) {
	// Jackett API v2.0 - note: path should start with / for root indexers
	const basePath = path === '/' || path === '' ? '' : path;
	const url = new URL(`${config.url}/api/v2.0/indexers${basePath}`);
	url.searchParams.set('apikey', config.apiKey ?? '');
	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}
	const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
	if (!res.ok) throw new Error(`Jackett ${path} → ${res.status}`);
	return res.json();
}

// Jackett system status endpoint (different from indexers)
async function jackettSystemFetch(config: ServiceConfig, path: string) {
	const url = new URL(`${config.url}/api/v2.0${path}`);
	url.searchParams.set('apikey', config.apiKey ?? '');
	const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
	if (!res.ok) throw new Error(`Jackett ${path} → ${res.status}`);
	return res.json();
}

// ---------------------------------------------------------------------------
// Exported data helpers (admin-only)
// ---------------------------------------------------------------------------

export interface JackettIndexer {
	id: number;
	name: string;
	type: string;
	description: string;
	language: string;
	link: string;
	enabled: boolean;
	privacy: string;
	categories: Array<{ id: number; name: string; subCategories: Array<{ id: number; name: string }> }>;
}

export interface JackettIndexerStats {
	indexer: string;
	numRss: number;
	numAuth: number;
	numReject: number;
	numError: number;
	lastError: string;
	lastChecked: string;
}

export interface JackettSystemStatus {
	appVersion: string;
	configVersion: number;
	platform: string;
	platformVersion: string;
	runtimeVersion: string;
}

export async function getJackettIndexers(config: ServiceConfig): Promise<JackettIndexer[]> {
	return withCache(`jackett:indexers:${config.id}`, 60_000, async () => {
		// Jackett indexers endpoint: /api/v2.0/indexers (no trailing slash)
		const url = new URL(`${config.url}/api/v2.0/indexers`);
		url.searchParams.set('apikey', config.apiKey ?? '');
		const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
		if (!res.ok) throw new Error(`Jackett indexers → ${res.status}`);
		const data = await res.json();
		return (data?.Result ?? []).map((i: any) => ({
			id: i.id,
			name: i.name,
			type: i.type,
			description: i.description,
			language: i.language,
			link: i.link,
			enabled: i.enabled,
			privacy: i.privacy,
			categories: i.caps?.categories ?? []
		}));
	});
}

export async function getJackettIndexerStats(config: ServiceConfig): Promise<JackettIndexerStats[]> {
	return withCache(`jackett:stats:${config.id}`, 30_000, async () => {
		// Jackett stats endpoint: /api/v2.0/indexers/stats
		const url = new URL(`${config.url}/api/v2.0/indexers/stats`);
		url.searchParams.set('apikey', config.apiKey ?? '');
		const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
		if (!res.ok) throw new Error(`Jackett stats → ${res.status}`);
		const data = await res.json();
		return (data?.Result ?? []).map((i: any) => ({
			indexer: i.indexer,
			numRss: i.numRss ?? 0,
			numAuth: i.numAuth ?? 0,
			numReject: i.numReject ?? 0,
			numError: i.numError ?? 0,
			lastError: i.lasterrormsg ?? '',
			lastChecked: i.lastcheck ?? ''
		}));
	});
}

export async function getJackettSystemStatus(config: ServiceConfig): Promise<JackettSystemStatus> {
	const data = await jackettFetch(config, '/config');
	return {
		appVersion: data?.Result?.app_version ?? 'unknown',
		configVersion: data?.Result?.config_version ?? 0,
		platform: data?.Result?.platform ?? 'unknown',
		platformVersion: data?.Result?.os_version ?? '',
		runtimeVersion: data?.Result?.runtime_version ?? ''
	};
}

// ---------------------------------------------------------------------------
// Bulk indexer configuration helpers
// ---------------------------------------------------------------------------

export interface BulkIndexerUpdate {
	enabled?: boolean;
	categories?: number[];
	imdb?: string;
	tvdb?: string;
	tvmaze?: string;
	tvrage?: string;
}

export async function updateJackettIndexer(
	config: ServiceConfig,
	indexerId: number,
	updates: BulkIndexerUpdate
): Promise<{ Result: string }> {
	const formData = new URLSearchParams();
	formData.append('id', String(indexerId));
	
	if (updates.enabled !== undefined) {
		formData.append('enabled', updates.enabled ? 'true' : 'false');
	}
	if (updates.categories) {
		formData.append('caps', JSON.stringify(updates.categories));
	}
	if (updates.imdb) {
		formData.append('imdb', updates.imdb);
	}
	if (updates.tvdb) {
		formData.append('tvdb', updates.tvdb);
	}
	if (updates.tvmaze) {
		formData.append('tvmaze', updates.tvmaze);
	}
	if (updates.tvrage) {
		formData.append('tvrage', updates.tvrage);
	}

	const url = new URL(`${config.url}/api/v2.0/indexers/${indexerId}`);
	url.searchParams.set('apikey', config.apiKey ?? '');

	const res = await fetch(url.toString(), {
		method: 'PUT',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: formData.toString(),
		signal: AbortSignal.timeout(8000)
	});

	if (!res.ok) throw new Error(`Jackett update ${indexerId} → ${res.status}`);
	return res.json();
}

export async function toggleJackettIndexers(
	config: ServiceConfig,
	indexerIds: number[],
	enabled: boolean
): Promise<{ updated: number; failed: number }> {
	let updated = 0;
	let failed = 0;

	for (const id of indexerIds) {
		try {
			await updateJackettIndexer(config, id, { enabled });
			updated++;
		} catch {
			failed++;
		}
	}

	return { updated, failed };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const jackettAdapter: ServiceAdapter = {
	id: 'jackett',
	displayName: 'Jackett',
	defaultPort: 9117,
	color: '#f59e0b',
	abbreviation: 'JK',
	isEnrichmentOnly: true,

	contractVersion: 1,
	tier: 'server',
	capabilities: {
		enrichmentOnly: true,
		adminAuth: {
			required: true,
			fields: ['url', 'adminApiKey'],
			supportsHealthProbe: true
		}
	},

	async probeAdminCredential(config) {
		try {
			// Jackett uses /api/v2.0/system/status for health check
			const res = await fetch(`${config.url}/api/v2.0/system/status?apikey=${encodeURIComponent(config.apiKey ?? '')}`, {
				signal: AbortSignal.timeout(5000)
			});
			if (res.status === 401 || res.status === 403) return 'invalid';
			if (!res.ok) return 'expired';
			return 'ok';
		} catch {
			return 'expired';
		}
	},

	icon: 'jackett',
	mediaTypes: ['other'],
	onboarding: {
		category: 'indexer',
		description: 'Torznab indexer manager for automation services',
		priority: 2,
		requiredFields: ['url', 'apiKey'],
	},

	async ping(config): Promise<ServiceHealth> {
		const start = Date.now();
		try {
			// Use system/status endpoint for health check
			const url = new URL(`${config.url}/api/v2.0/system/status`);
			url.searchParams.set('apikey', config.apiKey ?? '');
			const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
			if (!res.ok) throw new Error(`Jackett system status → ${res.status}`);
			return {
				serviceId: config.id,
				name: config.name,
				type: 'jackett',
				online: true,
				latency: Date.now() - start
			};
		} catch (e) {
			return {
				serviceId: config.id,
				name: config.name,
				type: 'jackett',
				online: false,
				error: String(e)
			};
		}
	}
};