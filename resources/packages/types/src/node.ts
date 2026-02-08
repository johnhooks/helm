import type { Star } from './star';

export interface NavNode {
	id: number;
	type: string;
	x: number;
	y: number;
	z: number;
	created_at: string | null;
}

export interface ApiNodeResponse extends NavNode {
	_embedded?: { 'helm:stars'?: Star[] };
}
