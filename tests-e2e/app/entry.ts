import { createDatacore } from '@helm/datacore';
import { createCache } from '@helm/cache';

window.helm = {
	createDatacore,
	createCache,
} as Window['helm'];
