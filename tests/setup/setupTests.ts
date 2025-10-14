import '@testing-library/jest-dom/vitest';
import 'whatwg-fetch';
import { server } from './msw/server';
import { beforeAll, afterAll, afterEach } from 'vitest';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Silencia ruido sin ocultar fallos reales
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('Warning:') || msg.includes('Deprecated')) return;
    originalError(...args);
  };
});
afterAll(() => { console.error = originalError; });

// Minimal env for API routes
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
