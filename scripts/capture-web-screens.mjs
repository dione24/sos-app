#!/usr/bin/env node
/**
 * Capture chaque écran de l'app (export web) en 390×844 avec Chromium headless.
 *
 * Prérequis : `npx expo export --platform web --output-dir dist-web`, puis un
 * Playwright installé quelque part (SOS_PLAYWRIGHT_DIR=<dossier node_modules>).
 *
 *   SOS_PLAYWRIGHT_DIR=/chemin/node_modules node scripts/capture-web-screens.mjs docs/design/screens/apres
 *
 * Le serveur n'écoute que sur 127.0.0.1. Aucune donnée réelle : le dossier de
 * démonstration utilise un numéro fictif évident et reste dans le navigateur.
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const outDir = resolve(process.argv[2] ?? 'docs/design/screens/apres');
const distDir = resolve(process.env.SOS_WEB_DIST ?? 'dist-web');
const playwrightDir = process.env.SOS_PLAYWRIGHT_DIR;
if (!playwrightDir) throw new Error('SOS_PLAYWRIGHT_DIR manquant (dossier node_modules contenant playwright)');
const { chromium } = createRequire(join(playwrightDir, '/'))('playwright');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.ico': 'image/x-icon' };

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  let file = join(distDir, decodeURIComponent(url.pathname));
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(distDir, 'index.html');
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'fr-FR',
  colorScheme: process.env.SOS_COLOR_SCHEME === 'dark' ? 'dark' : 'light',
  permissions: [],
});
const page = await context.newPage();
page.on('pageerror', (error) => console.error('pageerror', error.message));

async function open(path) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.waitForTimeout(700);
}

async function shot(name) {
  const file = join(outDir, `${name}.png`);
  await page.screenshot({ path: file, type: 'png' });
  const kb = Math.round(statSync(file).size / 1024);
  console.log(`${name}.png ${kb} Ko${kb > 300 ? '  (trop lourd)' : ''}`);
}

async function tap(text) {
  await page.getByText(text, { exact: false }).first().click();
  await page.waitForTimeout(600);
}

await open('/onboarding');
await shot('01-onboarding');
await tap('Accéder au SOS sans dossier');
await page.waitForTimeout(800);
await shot('02-accueil');

await open('/sos');
await shot('03-sos');

await open('/guides');
await shot('04-guides');

await open('/guide/rcp');
await shot('05-guide-etape');

await open('/cpr');
await shot('06-rcp');
await tap('Appeler le 122');
await shot('07-confirmation-appel');

await open('/directory');
await shot('08-annuaire');

await open('/map');
await shot('09-lieux');

await open('/weather');
await shot('10-meteo');

await open('/profile');
await shot('11-dossier-edition');
// Dossier de démonstration : numéro fictif évident, jamais transmis.
const field = (label) => page.getByRole('textbox', { name: label, exact: true });
await field('Nom complet').fill('Awa Traoré');
await field('Numéro de téléphone').fill('+223 00 00 00 00');
await field('Groupe sanguin').fill('O+');
await field('Allergies').fill('Pénicilline');
await field('Nom').first().fill('Moussa Traoré');
await field('Téléphone').first().fill('+223 00 00 00 01');
await tap('Enregistrer');
await page.waitForTimeout(800);
await shot('12-dossier');

await open('/');
await shot('13-accueil-dossier');

await open('/mesh');
await shot('14-alertes-proches');

await open('/settings');
await shot('15-reglages');

await open('/privacy');
await shot('16-confidentialite');

await browser.close();
server.close();
