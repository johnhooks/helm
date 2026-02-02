import type { Preview } from '@storybook/react-vite';
import React from 'react';
import { SlotFillProvider } from '@wordpress/components';

// Import WordPress component styles (needed for Modal, etc.)
import '@wordpress/components/build-style/style.css';

// Import UI styles
import '../resources/packages/ui/src/styles/index.css';
import './preview.css';

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => React.createElement(SlotFillProvider, null, React.createElement(Story)),
  ],
};

export default preview;
