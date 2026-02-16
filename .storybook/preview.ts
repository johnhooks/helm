import type { Preview } from '@storybook/react-vite';
import React from 'react';
import { SlotFillProvider } from '@wordpress/components';

// Import WordPress component styles (needed for Modal, etc.)
import '@wordpress/components/build-style/style.css';

// Import all UI styles (tokens, surfaces, layout, components).
import '../resources/packages/ui/src/styles/all.css';
import './preview.css';

// Tokens are scoped to .helm-page-root. WordPress Modal portals to
// document.body which escapes the decorator div, so also put the class
// on body so portaled content inherits the design tokens.
document.body.classList.add('helm-page-root');

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      disableSaveFromUI: true,
    },
    layout: 'centered',
  },
  decorators: [
    (Story) =>
      React.createElement(
        'div',
        { className: 'helm-page-root' },
        React.createElement(SlotFillProvider, null, React.createElement(Story)),
      ),
  ],
};

export default preview;
