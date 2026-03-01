export interface Hull {
	slug: string;
	label: string;
	internalSpace: number;
	slots: readonly string[];
	equipmentSlots: number;
	hullMass: number;
	hullSignature: number;
	hullIntegrity: number;
	shieldCapacityMultiplier?: number;
	scanComfortMultiplier?: number;
	weaponDrawMultiplier?: number;
	stealthDrawMultiplier?: number;
	amplitudeMultiplier?: number;
	spoolMultiplier?: number;
}
