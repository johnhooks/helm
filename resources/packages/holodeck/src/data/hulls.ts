import type { Hull } from '../types/hull';
import hullData from '../../../../../tests/_data/catalog/hulls.json';

export const HULLS: Hull[] = hullData;

export function getHull(slug: string): Hull | undefined {
	return HULLS.find((h) => h.slug === slug);
}
