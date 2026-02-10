declare global {
	interface HelmSettings {
		workerUrl: string;
		debug: boolean;
		shipId: number | null;
	}

	interface HelmGlobal {
		/** PHP inline script — injected before page bundles. */
		settings: HelmSettings;
		/** Webpack library: window.helm.ui (handle: helm-ui). */
		ui: typeof import('@helm/ui');
		/** Webpack library: window.helm.core (handle: helm-core). */
		core: typeof import('@helm/core');
	}

	interface Window {
		helm: HelmGlobal;
	}
}

export {};
