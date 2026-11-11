import { beforeEach, expect, it, vi } from 'vitest';

const addHeader = vi.hoisted(() => vi.fn());
vi.mock('@maplibre/maplibre-react-native', () => ({ TransformRequestManager: { addHeader } }));
vi.mock('@/constants/map', () => ({ MAP_REQUEST_USER_AGENT: 'sos-test' }));
beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); });

it('adds MapTiler headers once, only on demand', async () => {
  const { ensureMapHeaders } = await import('../map-headers');
  expect(addHeader).not.toHaveBeenCalled();
  ensureMapHeaders(); ensureMapHeaders();
  expect(addHeader).toHaveBeenCalledOnce();
  expect(addHeader).toHaveBeenCalledWith(expect.objectContaining({ match: '^https://api\\.maptiler\\.com/', value: 'sos-test' }));
});

it('allows a later retry if header setup failed', async () => {
  addHeader.mockImplementationOnce(() => { throw new Error('native unavailable'); });
  const { ensureMapHeaders } = await import('../map-headers');
  expect(() => ensureMapHeaders()).toThrow(); ensureMapHeaders();
  expect(addHeader).toHaveBeenCalledTimes(2);
});
