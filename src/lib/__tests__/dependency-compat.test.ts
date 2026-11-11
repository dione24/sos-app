import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(new URL('../../../package.json', import.meta.url));

// Keep these checks when updating Expo Router. Its 57.x query-string consumer
// needs a callable CommonJS decoder; upstream 0.5.1 is ESM-only. The tracked
// patch changes packaging only. Remove it only after the consumer supports the
// upstream export, then rerun clean install, audit, these checks and Metro export.
// Security fix: https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-qr28-fpjm-wq7f
function isolated(script: string) {
  return execFileSync(process.execPath, ['-e', script], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 3_000,
    maxBuffer: 64 * 1024,
  });
}

describe('SDK 57 dependency security compatibility', () => {
  it('retains the official decoder algorithm byte-for-byte apart from its CommonJS export', () => {
    const source = readFileSync(require.resolve('decode-uri-component'), 'utf8');
    const official = source.replace('module.exports = function decodeUriComponent', 'export default function decodeUriComponent');
    expect(createHash('sha256').update(official).digest('hex')).toBe('6a86ac891edf15c5efa0841ebb31935e3669d58b98318b57d7b08a4530317cb0');
    expect(typeof require('decode-uri-component')).toBe('function');
  });

  it('supports a default ESM import transformed by the actual Expo Metro Babel preset', () => {
    expect(isolated(`
      const assert = require('node:assert/strict');
      const babel = require('@babel/core');
      const code = babel.transformSync(
        "import decode from 'decode-uri-component'; export const value = decode('Awa%20Traor%C3%A9');",
        { configFile: false, babelrc: false, filename: 'dependency-metro-smoke.js',
          presets: [require.resolve('babel-preset-expo')],
          caller: { name: 'metro', platform: 'android', supportsStaticESM: false, isDev: false } }
      ).code;
      const target = { exports: {} };
      new Function('require', 'module', 'exports', code)(require, target, target.exports);
      assert.equal(target.exports.value, 'Awa Traoré');
      process.stdout.write('ok');
    `)).toBe('ok');
  });

  it('round-trips query parameters through the real Router 57 fallback parser and serializer', () => {
    expect(isolated(`
      const assert = require('node:assert/strict');
      const { getStateFromPath } = require('./node_modules/expo-router/build/react-navigation/core/getStateFromPath');
      const { getPathFromState } = require('./node_modules/expo-router/build/react-navigation/core/getPathFromState');
      const options = { screens: { sos: 'sos' } };
      const state = getStateFromPath('/sos?type=incendie&note=Awa%20Traor%C3%A9&phone=%2B22300000001&bad=%E0%A4%A', options);
      assert.equal(state.routes[0].params.note, 'Awa Traoré');
      assert.equal(state.routes[0].params.phone, '+22300000001');
      assert.equal(state.routes[0].params.bad, '%E0%A4%A');
      const again = getStateFromPath(getPathFromState(state, options), options);
      assert.deepEqual(again.routes[0].params, state.routes[0].params);
      process.stdout.write('ok');
    `)).toBe('ok');
  });

  it('bounds malformed decoding regressions in a killable child process', () => {
    expect(isolated(`
      const assert = require('node:assert/strict');
      const decode = require('decode-uri-component');
      const { getStateFromPath } = require('./node_modules/expo-router/build/react-navigation/core/getStateFromPath');
      // Fixed finite inputs, never the unbounded advisory exploit. The process
      // deadline also contains a regression to the old recursive decoder.
      const runs = Array.from({length: 1024}, (_, value) => '%' + Math.floor(value / 256).toString(16).padStart(2, '0') + '%' + (value % 256).toString(16).padStart(2, '0') + 'x').join('') + '%zz';
      for (const value of ['%E0'.repeat(1024), runs, '%', '%FE%FF', 'Awa%20Traor%C3%A9%zz']) {
        assert.equal(typeof decode(value), 'string');
        const state = getStateFromPath('/sos?note=' + value, { screens: { sos: 'sos' } });
        assert.equal(typeof state.routes[0].params.note, 'string');
      }
      process.stdout.write('ok');
    `)).toBe('ok');
  });

  it('keeps the default image-size buffer API used by Metro assets', () => {
    const { getAssetSize } = require('metro/private/Assets');
    const icon = fileURLToPath(new URL('../../../assets/images/app-icon.png', import.meta.url));
    expect(getAssetSize('png', readFileSync(icon), icon)).toEqual({ width: 1024, height: 1024 });
  });

  it('retains fingerprint glob and minimatch APIs with cancellation', async () => {
    const fingerprintRequire = createRequire(require.resolve('@expo/fingerprint/package.json'));
    const { glob } = fingerprintRequire('glob');
    const { minimatch } = fingerprintRequire('minimatch');
    expect(minimatch('src/app/sos.tsx', '**/*.tsx', { dot: true, optimizationLevel: 2 })).toBe(true);
    expect(await glob('src/lib/__tests__/dependency-compat.test.ts', { cwd: projectRoot })).toEqual(['src/lib/__tests__/dependency-compat.test.ts']);
    const cancel = new AbortController(); cancel.abort();
    await expect(glob('**/*', { cwd: projectRoot, signal: cancel.signal })).rejects.toThrow();
  });
});
