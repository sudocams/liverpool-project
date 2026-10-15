import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../data');
const loads = new Map();
const writes = new Map();

export function loadLocalMap(filename, target) {
  if (loads.has(filename)) return loads.get(filename);
  const loading = (async () => {
    const path = resolve(dataDirectory, filename);
    try {
      const entries = JSON.parse(await readFile(path, 'utf8'));
      if (!Array.isArray(entries)) throw new Error(`Invalid local data file: ${filename}`);
      target.clear();
      for (const [key, value] of entries) target.set(key, value);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  })();
  loads.set(filename, loading);
  return loading;
}

export async function saveLocalMap(filename, source) {
  const path = resolve(dataDirectory, filename);
  const contents = JSON.stringify([...source.entries()]);
  const previous = writes.get(filename) ?? Promise.resolve();
  const saving = previous.catch(() => {}).then(async () => {
    await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
    await chmod(dataDirectory, 0o700);
    const temporaryPath = `${path}.${process.pid}.tmp`;
    await writeFile(temporaryPath, contents, { encoding: 'utf8', mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, path);
  });
  writes.set(filename, saving);
  await saving;
}
