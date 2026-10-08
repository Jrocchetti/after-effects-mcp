import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

// Node 18 does not expand test globs, and shell glob behavior differs on
// Windows. Pass an explicit, sorted file list to the same tsx test runner.
function testsIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? testsIn(path) : entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

const files = testsIn(join(root, 'src')).sort();
if (!files.length) throw new Error('No test files found');
const result = spawnSync(process.execPath, [require.resolve('tsx/cli'), '--test', ...files], {
  cwd: root,
  stdio: 'inherit'
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
