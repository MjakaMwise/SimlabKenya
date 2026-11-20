import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog, stations, titrationMethods } from './practicals-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const workerSource = await readFile(path.join(root, 'worker/index.js'), 'utf8');
const assets = {};

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (path.relative(dist, filename).split(path.sep)[0] !== 'server') await collect(filename);
      continue;
    }
    if (!entry.isFile()) continue;
    const relative = path.relative(dist, filename).split(path.sep).join('/');
    if (relative.startsWith('server/')) continue;
    assets['/' + relative] = await readFile(filename, 'utf8');
  }
}

await collect(dist);
if (!assets['/index.html']) throw new Error('dist/index.html is missing.');
const output = path.join(dist, 'server/index.js');
await mkdir(path.dirname(output), { recursive: true });
const context = `const stations = ${JSON.stringify(stations)};\nconst titrationMethods = ${JSON.stringify(titrationMethods)};\nconst catalog = ${JSON.stringify(catalog)};\n`;
await writeFile(output, `const assets = ${JSON.stringify(assets)};\n${context}${workerSource}`, 'utf8');
console.log(`Built Worker with ${Object.keys(assets).length} web assets.`);
