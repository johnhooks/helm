import type { ComponentType, TuningConfig, WorkbenchProduct } from '../types';

import coreData from '../../data/products/core.json';
import driveData from '../../data/products/drive.json';
import sensorData from '../../data/products/sensor.json';
import shieldData from '../../data/products/shield.json';
import navData from '../../data/products/nav.json';

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
	draw?: number;
	tuning?: { param: string; min: number; max: number };
};

interface ProductJson {
	items: RawProduct[];
}

let nextId = 1;

function loadProducts(data: ProductJson): WorkbenchProduct[] {
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
		draw: item.draw ?? null,
		tuning: item.tuning ? (item.tuning as TuningConfig) : null,
	}));
}

const cores = loadProducts(coreData as ProductJson);
const drives = loadProducts(driveData as ProductJson);
const sensors = loadProducts(sensorData as ProductJson);
const shields = loadProducts(shieldData as ProductJson);
const navs = loadProducts(navData as ProductJson);

const allProducts = [...cores, ...drives, ...sensors, ...shields, ...navs];

export function getProductsByType(type: ComponentType): WorkbenchProduct[] {
	return allProducts.filter((p) => p.type === type);
}

export function getProduct(slug: string): WorkbenchProduct | undefined {
	return allProducts.find((p) => p.slug === slug);
}

export function getAllProducts(): WorkbenchProduct[] {
	return allProducts;
}

export const defaults = {
	core: cores.find((p) => p.slug === 'epoch_s')!,
	drive: drives.find((p) => p.slug === 'dr_505')!,
	sensor: sensors.find((p) => p.slug === 'vrs_mk1')!,
	shield: shields.find((p) => p.slug === 'aegis_beta')!,
	nav: navs.find((p) => p.slug === 'nav_tier_3')!,
};
