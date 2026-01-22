import { execSync } from 'node:child_process';

const patterns = ['-----BEGIN' + ' PRIVATE KEY', 'pk' + '_live_', 'sk' + '_live_'];
const matches: { pattern: string; output: string }[] = [];

for (const pattern of patterns) {
  try {
    const output = execSync(
      `rg -n --hidden --glob '!.git' --glob '!scripts/security/scan-repo-secrets.ts' -- ${JSON.stringify(
        pattern
      )} .`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ).trim();

    if (output) {
      matches.push({ pattern, output });
    }
  } catch (error: any) {
    if (error?.status !== 1) {
      console.error(`Error scanning for pattern: ${pattern}`);
      console.error(error?.message || error);
      process.exit(2);
    }
  }
}

if (matches.length > 0) {
  console.error('Potential secrets detected:');
  for (const match of matches) {
    console.error(`\nPattern: ${match.pattern}`);
    console.error(match.output);
  }
  process.exit(1);
}

console.log('No secret patterns found.');
