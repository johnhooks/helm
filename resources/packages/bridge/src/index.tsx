/**
 * Helm Bridge — admin application entry point.
 *
 * Mounts the React app with TanStack Router for client-side navigation.
 * Query-param routing (?path=) keeps everything inside a single WP-Admin page.
 */
import { createRoot } from '@wordpress/element';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './fullscreen.css';

const rootElement = document.querySelector('.helm-bridge-root');
if (rootElement) {
	createRoot(rootElement).render(<RouterProvider router={router} />);
}
