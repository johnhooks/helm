import type { Hull } from './hull';
import type { InstalledComponent } from './component';

export interface Loadout {
	hull: Hull;
	core: InstalledComponent;
	drive: InstalledComponent;
	sensor: InstalledComponent;
	shield: InstalledComponent;
	nav: InstalledComponent;
	equipment: InstalledComponent[];
}
