export const ActionType = {
	ScanRoute: 'scan_route',
	Jump: 'jump',
	Survey: 'survey',
	ScanPlanet: 'scan_planet',
	Mine: 'mine',
	Refine: 'refine',
	Buy: 'buy',
	Sell: 'sell',
	Transfer: 'transfer',
	Repair: 'repair',
	Upgrade: 'upgrade',
	FirePhaser: 'fire_phaser',
	FireTorpedo: 'fire_torpedo',
	ScanPassive: 'scan_passive',
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

const TIME_ACTIONS: ReadonlySet<ActionType> = new Set([
	ActionType.ScanRoute,
	ActionType.Jump,
	ActionType.Survey,
	ActionType.ScanPlanet,
	ActionType.Mine,
	ActionType.Refine,
	ActionType.Repair,
	ActionType.Upgrade,
	ActionType.FirePhaser,
	ActionType.FireTorpedo,
]);

export function actionRequiresTime(type: ActionType): boolean {
	return TIME_ACTIONS.has(type);
}

const ACTION_LABELS: Record<ActionType, string> = {
	scan_route: 'Scan Route',
	jump: 'Jump',
	survey: 'Survey',
	scan_planet: 'Scan Planet',
	mine: 'Mine',
	refine: 'Refine',
	buy: 'Buy',
	sell: 'Sell',
	transfer: 'Transfer',
	repair: 'Repair',
	upgrade: 'Upgrade',
	fire_phaser: 'Fire Phaser',
	fire_torpedo: 'Fire Torpedo',
	scan_passive: 'Passive Scan',
};

export function actionLabel(type: ActionType): string {
	return ACTION_LABELS[type];
}
