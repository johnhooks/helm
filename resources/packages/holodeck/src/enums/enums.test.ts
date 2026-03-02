import { describe, it, expect } from 'vitest';
import {
	ActionType,
	actionRequiresTime,
	actionLabel,
	ActionStatus,
	isActionComplete,
	isActionSuccess,
	ShipFittingSlot,
	REQUIRED_SLOTS,
	EQUIPMENT_SLOTS,
	isRequiredSlot,
} from '../index';

describe('ActionType', () => {
	it('has 14 types', () => {
		expect(Object.values(ActionType)).toHaveLength(14);
	});

	it('values match PHP string backing', () => {
		expect(ActionType.ScanRoute).toBe('scan_route');
		expect(ActionType.Jump).toBe('jump');
		expect(ActionType.Survey).toBe('survey');
		expect(ActionType.ScanPlanet).toBe('scan_planet');
		expect(ActionType.Mine).toBe('mine');
		expect(ActionType.Refine).toBe('refine');
		expect(ActionType.Buy).toBe('buy');
		expect(ActionType.Sell).toBe('sell');
		expect(ActionType.Transfer).toBe('transfer');
		expect(ActionType.Repair).toBe('repair');
		expect(ActionType.Upgrade).toBe('upgrade');
	});

	it('requiresTime is correct for time-based actions', () => {
		expect(actionRequiresTime(ActionType.ScanRoute)).toBe(true);
		expect(actionRequiresTime(ActionType.Jump)).toBe(true);
		expect(actionRequiresTime(ActionType.Survey)).toBe(true);
		expect(actionRequiresTime(ActionType.ScanPlanet)).toBe(true);
		expect(actionRequiresTime(ActionType.Mine)).toBe(true);
		expect(actionRequiresTime(ActionType.Refine)).toBe(true);
		expect(actionRequiresTime(ActionType.Repair)).toBe(true);
		expect(actionRequiresTime(ActionType.Upgrade)).toBe(true);
	});

	it('requiresTime is false for instant actions', () => {
		expect(actionRequiresTime(ActionType.Buy)).toBe(false);
		expect(actionRequiresTime(ActionType.Sell)).toBe(false);
		expect(actionRequiresTime(ActionType.Transfer)).toBe(false);
		expect(actionRequiresTime(ActionType.ScanPassive)).toBe(false);
	});

	it('actionLabel returns human-readable labels', () => {
		expect(actionLabel(ActionType.ScanRoute)).toBe('Scan Route');
		expect(actionLabel(ActionType.Jump)).toBe('Jump');
		expect(actionLabel(ActionType.ScanPlanet)).toBe('Scan Planet');
	});
});

describe('ActionStatus', () => {
	it('has 5 statuses', () => {
		expect(Object.values(ActionStatus)).toHaveLength(5);
	});

	it('values match PHP string backing', () => {
		expect(ActionStatus.Pending).toBe('pending');
		expect(ActionStatus.Running).toBe('running');
		expect(ActionStatus.Fulfilled).toBe('fulfilled');
		expect(ActionStatus.Partial).toBe('partial');
		expect(ActionStatus.Failed).toBe('failed');
	});

	it('isActionComplete identifies terminal statuses', () => {
		expect(isActionComplete(ActionStatus.Pending)).toBe(false);
		expect(isActionComplete(ActionStatus.Running)).toBe(false);
		expect(isActionComplete(ActionStatus.Fulfilled)).toBe(true);
		expect(isActionComplete(ActionStatus.Partial)).toBe(true);
		expect(isActionComplete(ActionStatus.Failed)).toBe(true);
	});

	it('isActionSuccess identifies successful outcomes', () => {
		expect(isActionSuccess(ActionStatus.Pending)).toBe(false);
		expect(isActionSuccess(ActionStatus.Running)).toBe(false);
		expect(isActionSuccess(ActionStatus.Fulfilled)).toBe(true);
		expect(isActionSuccess(ActionStatus.Partial)).toBe(true);
		expect(isActionSuccess(ActionStatus.Failed)).toBe(false);
	});
});

describe('ShipFittingSlot', () => {
	it('has 8 slots', () => {
		expect(Object.values(ShipFittingSlot)).toHaveLength(8);
	});

	it('values match PHP string backing', () => {
		expect(ShipFittingSlot.Core).toBe('core');
		expect(ShipFittingSlot.Drive).toBe('drive');
		expect(ShipFittingSlot.Sensor).toBe('sensor');
		expect(ShipFittingSlot.Shield).toBe('shield');
		expect(ShipFittingSlot.Nav).toBe('nav');
		expect(ShipFittingSlot.Equip1).toBe('equip_1');
		expect(ShipFittingSlot.Equip2).toBe('equip_2');
		expect(ShipFittingSlot.Equip3).toBe('equip_3');
	});

	it('REQUIRED_SLOTS contains 5 required slots', () => {
		expect(REQUIRED_SLOTS).toHaveLength(5);
		expect(REQUIRED_SLOTS).toContain(ShipFittingSlot.Core);
		expect(REQUIRED_SLOTS).toContain(ShipFittingSlot.Drive);
		expect(REQUIRED_SLOTS).toContain(ShipFittingSlot.Sensor);
		expect(REQUIRED_SLOTS).toContain(ShipFittingSlot.Shield);
		expect(REQUIRED_SLOTS).toContain(ShipFittingSlot.Nav);
	});

	it('EQUIPMENT_SLOTS contains 3 equipment slots', () => {
		expect(EQUIPMENT_SLOTS).toHaveLength(3);
		expect(EQUIPMENT_SLOTS).toContain(ShipFittingSlot.Equip1);
		expect(EQUIPMENT_SLOTS).toContain(ShipFittingSlot.Equip2);
		expect(EQUIPMENT_SLOTS).toContain(ShipFittingSlot.Equip3);
	});

	it('required + equipment = all slots', () => {
		const all = [...REQUIRED_SLOTS, ...EQUIPMENT_SLOTS];
		expect(all).toHaveLength(8);
		expect(new Set(all).size).toBe(8);
	});

	it('isRequiredSlot partitions correctly', () => {
		for (const slot of REQUIRED_SLOTS) {
			expect(isRequiredSlot(slot)).toBe(true);
		}
		for (const slot of EQUIPMENT_SLOTS) {
			expect(isRequiredSlot(slot)).toBe(false);
		}
	});
});
