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
		/** Webpack library: window.helm.datacore (handle: helm-datacore). */
		datacore: typeof import('@helm/datacore');
		/** Webpack library: window.helm.nav (handle: helm-nav). */
		nav: typeof import('@helm/nav');
	}

	interface Window {
		helm: HelmGlobal;
	}
}

export {};
