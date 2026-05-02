import type { SensorAffinity } from '@helm/formulas';
import type { CatalogProduct, TuningConfig, DriveDSP } from '../types/catalog';

import coreData from '../../../../../tests/_data/catalog/products/core.json';
import driveData from '../../../../../tests/_data/catalog/products/drive.json';
import sensorData from '../../../../../tests/_data/catalog/products/sensor.json';
import shieldData from '../../../../../tests/_data/catalog/products/shield.json';
import navData from '../../../../../tests/_data/catalog/products/nav.json';
import weaponData from '../../../../../tests/_data/catalog/products/weapon.json';
import equipmentData from '../../../../../tests/_data/catalog/products/equipment.json';

export type ComponentType =
	| 'core'
	| 'drive'
	| 'sensor'
	| 'shield'
	| 'nav'
	| 'weapon'
	| 'cloak'
	| 'equipment';

type RawProduct = {
	slug: string;
	type: string;
	label: string;
	version: number;
	footprint: number;
	hp?: number;
	rate?: number;
	sustain?: number;
	capacity?: number;
	chance?: number;
	mult_a?: number;
	mult_b?: number;
	mult_c?: number;
	mult_d?: number;
	mult_e?: number;
	mult_f?: number;
	draw?: number;
	tuning?: { param: string; min: number; max: number };
	dsp?:
		| {
				active: number;
				passive: number;
				pulseGain: number;
				continuousGain: number;
				pvpGain: number;
		  }
		| {
				spool: { duration: number; peakPower: number; curve: number };
				sustain: { duration: number; peakPower: number; curve: number };
				cooldown: {
					duration: number;
					peakPower: number;
					curve: number;
				};
		  };
};

interface ProductJson {
	items: RawProduct[];
}

let nextId = 1;

function parseSensorDsp(dsp: RawProduct['dsp']): SensorAffinity | null {
	if (!dsp || !('active' in dsp)) {
		return null;
	}
	return dsp as SensorAffinity;
}

function parseDriveDsp(dsp: RawProduct['dsp']): DriveDSP | null {
	if (!dsp || !('spool' in dsp)) {
		return null;
	}
	return dsp as DriveDSP;
}

function loadProducts(data: ProductJson): CatalogProduct[] {
	return data.items.map((item) => ({
		id: nextId++,
		slug: item.slug,
		type: item.type,
		label: item.label,
		version: item.version,
		footprint: item.footprint,
		hp: item.hp ?? null,
		rate: item.rate ?? null,
		sustain: item.sustain ?? null,
		capacity: item.capacity ?? null,
		chance: item.chance ?? null,
		mult_a: item.mult_a ?? null,
		mult_b: item.mult_b ?? null,
		mult_c: item.mult_c ?? null,
		mult_d: item.mult_d ?? null,
		mult_e: item.mult_e ?? null,
		mult_f: item.mult_f ?? null,
		draw: item.draw ?? null,
		tuning: item.tuning ? (item.tuning as TuningConfig) : null,
		sensorDsp: parseSensorDsp(item.dsp),
		driveDsp: parseDriveDsp(item.dsp),
	}));
}

const cores = loadProducts(coreData as ProductJson);
const drives = loadProducts(driveData as ProductJson);
const sensors = loadProducts(sensorData as ProductJson);
const shields = loadProducts(shieldData as ProductJson);
const navs = loadProducts(navData as ProductJson);
const weapons = loadProducts(weaponData as ProductJson);
const equipment = loadProducts(equipmentData as ProductJson);

const allProducts = [
	...cores,
	...drives,
	...sensors,
	...shields,
	...navs,
	...weapons,
	...equipment,
];

export function getProductsByType(type: ComponentType): CatalogProduct[] {
	return allProducts.filter((p) => p.type === type);
}

export function getProduct(slug: string): CatalogProduct | undefined {
	return allProducts.find((p) => p.slug === slug);
}

export function getProductSlugs(type: ComponentType): string[] {
	const slugs = new Set<string>();
	for (const p of allProducts) {
		if (p.type === type) {
			slugs.add(p.slug);
		}
	}
	return [...slugs];
}

export function getAllProducts(): CatalogProduct[] {
	return allProducts;
}

export const DEFAULT_LOADOUT_SLUGS = {
	core: 'epoch_s',
	drive: 'dr_505',
	sensor: 'vrs_mk1',
	shield: 'aegis_delta',
	nav: 'nav_tier_3',
} as const;
