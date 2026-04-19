import type { StarNode } from '@helm/types';

export interface StarContextActionProps {
	star: StarNode;
	currentNodeId: number;
	selectedDistance: number | null;
	hasActiveAction: boolean;
	onClose: () => void;
}
