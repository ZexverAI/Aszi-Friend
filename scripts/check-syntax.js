import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (entry.isFile() && path.endsWith('.js')) files.push(path);
  }
  return files;
}
const files = [...await collect(join(root, 'src')), ...await collect(join(root, 'scripts'))];
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    console.error(result.stderr || `Syntax check failed: ${file}`);
  }
}
if (failed) process.exitCode = 1;
else console.log(`Syntax OK: ${files.length} JavaScript files.`);
