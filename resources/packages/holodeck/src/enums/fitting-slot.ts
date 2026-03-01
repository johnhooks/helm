export const ShipFittingSlot = {
	Core: 'core',
	Drive: 'drive',
	Sensor: 'sensor',
	Shield: 'shield',
	Nav: 'nav',
	Equip1: 'equip_1',
	Equip2: 'equip_2',
	Equip3: 'equip_3',
} as const;

export type ShipFittingSlot = (typeof ShipFittingSlot)[keyof typeof ShipFittingSlot];

export const REQUIRED_SLOTS: readonly ShipFittingSlot[] = [
	ShipFittingSlot.Core,
	ShipFittingSlot.Drive,
	ShipFittingSlot.Sensor,
	ShipFittingSlot.Shield,
	ShipFittingSlot.Nav,
];

export const EQUIPMENT_SLOTS: readonly ShipFittingSlot[] = [
	ShipFittingSlot.Equip1,
	ShipFittingSlot.Equip2,
	ShipFittingSlot.Equip3,
];

const REQUIRED_SET: ReadonlySet<ShipFittingSlot> = new Set(REQUIRED_SLOTS);

export function isRequiredSlot(slot: ShipFittingSlot): boolean {
	return REQUIRED_SET.has(slot);
}
