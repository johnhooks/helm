/**
 * Helm Settings — admin settings entry point.
 *
 * Standard WordPress admin page using @wordpress/components.
 */
import { createRoot } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

function Settings() {
	return (
		<div>
			<h2>{__('Helm Settings', 'helm')}</h2>
			<p>{__('Settings placeholder.', 'helm')}</p>
		</div>
	);
}

const rootElement = document.querySelector('.helm-admin-settings-root');
if (rootElement) {
	createRoot(rootElement).render(<Settings />);
}
