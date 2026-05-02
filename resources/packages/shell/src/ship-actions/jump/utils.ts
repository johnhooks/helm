import { __ } from '@wordpress/i18n';
import { getActionTitle } from '../utils';

const JUMP_TITLE: Record<string, string> = {
	jump: __('Jump', 'helm'),
};

export function getJumpTitle(type: string, targetName?: string): string {
	return getActionTitle(JUMP_TITLE, __('Jump', 'helm'), type, targetName);
}
