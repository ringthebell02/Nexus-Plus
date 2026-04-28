import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'nexus' | 'sonarr' | 'glass' | 'material3';
export type AccentColor = 'gold' | 'cyan' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'blue';

export interface ThemeState {
	theme: Theme;
	accent: AccentColor;
}

const STORAGE_KEY = 'nexus-theme';

const defaultTheme: ThemeState = {
	theme: 'nexus',
	accent: 'gold'
};

function getInitialState(): ThemeState {
	if (!browser) return defaultTheme;
	
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored) as ThemeState;
		}
	} catch (e) {
		console.warn('Failed to load theme from localStorage:', e);
	}
	return defaultTheme;
}

function createThemeStore() {
	const { subscribe, set, update } = writable<ThemeState>(getInitialState());

	return {
		subscribe,
		setTheme: (theme: Theme) => {
			update(state => {
				const newState = { ...state, theme };
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
				}
				return newState;
			});
		},
		setAccent: (accent: AccentColor) => {
			update(state => {
				const newState = { ...state, accent };
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
				}
				return newState;
			});
		},
		reset: () => {
			set(defaultTheme);
			if (browser) {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	};
}

export const themeStore = createThemeStore();

// Helper to apply theme to document
export function applyTheme(state: ThemeState) {
	if (!browser) return;
	
	document.documentElement.setAttribute('data-theme', state.theme);
	document.documentElement.setAttribute('data-accent', state.accent);
}