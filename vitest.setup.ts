/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom/vitest';

// Stub jQuery for modules that subscribe to WordPress Heartbeat at import time.
// @ts-expect-error — minimal stub, not a real jQuery implementation.
globalThis.jQuery = () => ( { on: () => {} } );
