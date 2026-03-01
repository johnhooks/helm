import type { Product } from '@helm/types';

export interface InstalledComponent {
	product: Product;
	slot: string;
	life: number | null;
	usageCount: number;
}
