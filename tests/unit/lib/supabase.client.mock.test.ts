import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({
  __esModule: true,
  supabase: { from: vi.fn().mockReturnThis(), select: vi.fn() }
}));
describe('Supabase client mock', () => {
  it('importa sin llamar red real', async () => {
    const { supabase } = await import('@/lib/supabase');
    expect(typeof (supabase as any).from).toBe('function');
  });
});
