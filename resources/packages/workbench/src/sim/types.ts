import type { ActionTuning } from '../types';

export type SimActionType =
	| 'jump' | 'scan' | 'mine' | 'wait'
	| 'fire_phaser' | 'fire_torpedo'
	| 'activate_pds' | 'activate_ecm' | 'activate_veil'
	| 'deactivate';

export interface SimAction {
	/**
	 * Seconds from scenario start.
	 */
	t: number;
	/**
	 * Ship slug reference.
	 */
	ship: string;
	/**
	 * Action type.
	 */
	type: SimActionType;
	/**
	 * Action-specific parameters.
	 */
	params?: Record<string, unknown>;
}

export interface ScenarioShip {
	hull: string;
	core: string;
	drive: string;
	sensor: string;
	shield: string;
	nav: string;
	equipment?: string[];
	tuning?: Partial<ActionTuning>;
}

export interface Scenario {
	name: string;
	description: string;
	ships: Record<string, ScenarioShip>;
	actions: SimAction[];
}
