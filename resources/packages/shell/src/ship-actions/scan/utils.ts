import { __ } from '@wordpress/i18n';
import { getActionTitle } from '../utils';

const SCAN_TITLE: Record<string, string> = {
	scan_route: __('Route Scan', 'helm'),
};

export function getScanTitle(type: string, targetName?: string): string {
	return getActionTitle(SCAN_TITLE, __('Scan', 'helm'), type, targetName);
}
