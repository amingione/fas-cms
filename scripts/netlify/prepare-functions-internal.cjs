const fs = require('node:fs');
const path = require('node:path');

const targetDir = path.join(process.cwd(), '.netlify', 'functions-internal');
const packageJsonPath = path.join(targetDir, 'package.json');
const contents = JSON.stringify({ type: 'commonjs' }, null, 2) + '\n';

try {
  fs.mkdirSync(targetDir, { recursive: true });
  if (!fs.existsSync(packageJsonPath) || fs.readFileSync(packageJsonPath, 'utf8') !== contents) {
    fs.writeFileSync(packageJsonPath, contents);
  }
} catch (error) {
  console.warn('[prepare-functions-internal] Failed to ensure functions-internal package.json', error);
}
