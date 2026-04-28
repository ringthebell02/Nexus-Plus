<script lang="ts">
	import { themeStore, type Theme, type AccentColor } from '$lib/stores/theme.svelte';
	import { Palette, Sparkles, Layers, Moon } from 'lucide-svelte';

	const themes: { id: Theme; name: string; description: string; icon: string }[] = [
		{ id: 'nexus', name: 'Nexus', description: 'Default dark theme with warm gold accents', icon: 'default' },
		{ id: 'sonarr', name: 'Sonarr', description: 'Dark theme with cyan highlights (like the *arr apps)', icon: 'sonarr' },
		{ id: 'glass', name: 'Glass', description: 'Translucent glassmorphism effect', icon: 'glass' },
		{ id: 'material3', name: 'Material3', description: 'Light theme with Material Design 3 colors', icon: 'material3' }
	];

	const accentColors: { id: AccentColor; name: string; hex: string }[] = [
		{ id: 'gold', name: 'Gold', hex: '#d4a253' },
		{ id: 'cyan', name: 'Cyan', hex: '#58a6ff' },
		{ id: 'green', name: 'Green', hex: '#3fb950' },
		{ id: 'orange', name: 'Orange', hex: '#f0883e' },
		{ id: 'pink', name: 'Pink', hex: '#db61a2' },
		{ id: 'purple', name: 'Purple', hex: '#a371f7' },
		{ id: 'red', name: 'Red', hex: '#f85149' },
		{ id: 'blue', name: 'Blue', hex: '#3b82f6' }
	];

	let currentTheme = $state<Theme>('nexus');
	let currentAccent = $state<AccentColor>('gold');

	// Initialize from store
	themeStore.subscribe((state) => {
		currentTheme = state.theme;
		currentAccent = state.accent;
	})();

	function selectTheme(theme: Theme) {
		currentTheme = theme;
		themeStore.setTheme(theme);
	}

	function selectAccent(accent: AccentColor) {
		currentAccent = accent;
		themeStore.setAccent(accent);
	}
</script>

<svelte:head>
	<title>Theme Settings — Nexus</title>
</svelte:head>

<div class="space-y-8">
	<!-- Theme Selection -->
	<section>
		<div class="mb-4 flex items-center gap-2">
			<Palette size={18} class="text-accent" />
			<h2 class="text-lg font-semibold">Theme</h2>
		</div>
		<p class="mb-4 text-sm text-muted">Choose your preferred visual style.</p>
		
		<div class="grid gap-3 sm:grid-cols-2">
			{#each themes as theme}
				<button
					type="button"
					onclick={() => selectTheme(theme.id)}
					class="group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-200 {currentTheme === theme.id ? 'border-accent bg-accent/10' : 'border-cream/10 hover:border-cream/25 hover:bg-cream/5'}"
				>
					<!-- Theme preview gradient -->
					<div class="absolute inset-0 opacity-20 {theme.id === 'nexus' ? 'bg-gradient-to-br from-amber-900/30 to-void' : theme.id === 'sonarr' ? 'bg-gradient-to-br from-cyan-900/30 to-void' : theme.id === 'glass' ? 'bg-gradient-to-br from-slate-700/20 to-void' : 'bg-gradient-to-br from-purple-200/30 to-cream'}"></div>
					
					<div class="relative">
						<h3 class="font-medium">{theme.name}</h3>
						<p class="mt-1 text-xs text-muted">{theme.description}</p>
					</div>
					
					{#if currentTheme === theme.id}
						<div class="absolute right-3 top-1/2 -translate-y-1/2">
							<div class="flex h-5 w-5 items-center justify-center rounded-full bg-accent">
								<svg class="h-3 w-3 text-void" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
							</div>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	</section>

	<!-- Accent Color Selection -->
	<section>
		<div class="mb-4 flex items-center gap-2">
			<Sparkles size={18} class="text-accent" />
			<h2 class="text-lg font-semibold">Accent Color</h2>
		</div>
		<p class="mb-4 text-sm text-muted">Personalize your accent color across all themes.</p>
		
		<div class="flex flex-wrap gap-3">
			{#each accentColors as color}
				<button
					type="button"
					onclick={() => selectAccent(color.id)}
					class="group relative flex items-center gap-2 rounded-xl border-2 p-2 pr-3 transition-all duration-200 {currentAccent === color.id ? 'border-cream/40 bg-cream/10' : 'border-cream/10 hover:border-cream/25'}"
				>
					<div
						class="h-6 w-6 rounded-full shadow-md"
						style="background-color: {color.hex}"
					></div>
					<span class="text-sm font-medium">{color.name}</span>
					
					{#if currentAccent === color.id}
						<div class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-void bg-accent">
							<svg class="h-2 w-2 text-void" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
							</svg>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	</section>

	<!-- Live Preview -->
	<section>
		<div class="mb-4 flex items-center gap-2">
			<Layers size={18} class="text-accent" />
			<h2 class="text-lg font-semibold">Live Preview</h2>
		</div>
		<p class="mb-4 text-sm text-muted">See how your theme and accent combination looks.</p>
		
		<div class="rounded-xl border border-cream/10 p-6" style="background-color: var(--color-base)">
			<div class="space-y-4">
				<!-- Preview card -->
				<div class="rounded-lg border border-cream/10 p-4" style="background-color: var(--color-raised)">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg" style="background-color: var(--color-accent)">
							<Moon size={18} class="text-void" />
						</div>
						<div>
							<div class="font-medium" style="color: var(--color-cream)">Sample Card</div>
							<div class="text-sm" style="color: var(--color-muted)">This is how your theme looks</div>
						</div>
					</div>
				</div>
				
				<!-- Button preview -->
				<div class="flex gap-3">
					<button
						class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
						style="background-color: var(--color-accent); color: var(--color-void)"
					>
						Primary
					</button>
					<button
						class="rounded-lg border border-cream/20 px-4 py-2 text-sm font-medium transition-colors"
						style="color: var(--color-cream)"
					>
						Secondary
					</button>
				</div>
				
				<!-- Text preview -->
				<div class="space-y-1 text-sm">
					<div style="color: var(--color-cream)">Primary text color</div>
					<div style="color: var(--color-muted)">Muted text color</div>
					<div style="color: var(--color-accent)">Accent text color</div>
				</div>
			</div>
		</div>
	</section>
</div>