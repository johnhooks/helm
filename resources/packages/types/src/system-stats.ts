export interface EngineeringStats {
	rechargeRate: number;
	coreLife: number;
	outputMult: number;
	condition: number;
}

export interface NavigationStats {
	range: number;
	speed: number;
	draw: number;
	condition: number;
}

export interface SensorStats {
	range: number;
	scanDuration: number;
	discovery: number;
	condition: number;
}

export interface SystemStats {
	engineering: EngineeringStats;
	navigation: NavigationStats;
	sensors: SensorStats;
}
