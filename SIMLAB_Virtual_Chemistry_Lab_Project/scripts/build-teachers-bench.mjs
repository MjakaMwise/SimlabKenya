import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { catalog, stations, titrationMethods } from './practicals-catalog.mjs';

const read = name => readFileSync('dist/' + name, 'utf8');
const assets = Object.fromEntries(readdirSync('dist', { withFileTypes: true })
  .filter(entry => entry.isFile())
  .map(entry => ['/' + entry.name, read(entry.name)]));
mkdirSync('dist/server', { recursive: true });
writeFileSync('dist/server/index.js', 'const assets = ' + JSON.stringify(assets) + ';\n'
  + 'const stations = ' + JSON.stringify(stations) + ';\n'
  + 'const titrationMethods = ' + JSON.stringify(titrationMethods) + ';\n'
  + 'const catalog = ' + JSON.stringify(catalog) + ';\n'
  + readFileSync('worker/index.js', 'utf8'));
