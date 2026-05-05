import type { StarNode } from '@helm/types';

export interface NavigationTarget {
	kind: 'star' | 'waypoint';
	nodeId: number;
	label: string;
	x: number;
	y: number;
	z: number;
	star?: StarNode;
}

export interface AstrometricActionProps {
	target: NavigationTarget;
	currentNodeId: number;
	selectedDistance: number | null;
	hasActiveAction: boolean;
	onClose: () => void;
}
