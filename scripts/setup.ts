// Turns this template into a client site: fills in the per-site values, moves the site's workflows into place,
// replaces the onboarding README with the site's README, and removes itself and every template-only file.
//
//   node scripts/setup.ts                   # asks for each value
//   node scripts/setup.ts --name acme --title "Acme Co" --aws-account 123456789012 \
//     --github-repo acme-co/site --cloudflare-zone 0123456789abcdef0123456789abcdef

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

type Field = {
  flag: string;
  token: string;
  prompt: string;
  pattern: RegExp;
  hint: string;
};

// The state bucket (<name>-tfstate-<account>-us-east-1) is the longest name built from the site name; S3 allows 63
const FIELDS: Field[] = [
  { flag: 'name', token: '__SITE_NAME__', prompt: 'Site name (used in AWS resource names)', pattern: /^[a-z][a-z0-9-]{0,28}[a-z0-9]$/, hint: '2-30 lowercase letters, digits and hyphens, starting with a letter' },
  { flag: 'title', token: '__SITE_TITLE__', prompt: 'Site title (shown on the page)', pattern: /^[\p{L}\p{N} .,&'!?:-]{1,80}$/u, hint: 'up to 80 letters, digits, spaces and . , & \' ! ? : -' },
  { flag: 'aws-account', token: '__AWS_ACCOUNT_ID__', prompt: 'Client AWS account ID', pattern: /^\d{12}$/, hint: '12 digits' },
  { flag: 'github-repo', token: '__GITHUB_REPO__', prompt: 'GitHub repository (owner/name)', pattern: /^[\w-]+\/[\w.-]+$/, hint: 'owner/name' },
  { flag: 'cloudflare-zone', token: '__CLOUDFLARE_ZONE_ID__', prompt: 'Cloudflare zone ID', pattern: /^[0-9a-f]{32}$/, hint: '32 hex characters, from the zone\'s overview page' },
];

const TOKEN_PATTERN = /__(?:SITE_NAME|SITE_TITLE|AWS_ACCOUNT_ID|GITHUB_REPO|CLOUDFLARE_ZONE_ID)__/g;
// .test() on a /g regex is stateful (lastIndex carries over between calls), so detection uses a non-global copy
const hasToken = (text: string): boolean => new RegExp(TOKEN_PATTERN.source).test(text);
const SKIP_DIRS = new Set(['.git', 'node_modules', '.terraform', 'dist']);
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.json', '.md', '.pending', '.svg', '.tf', '.ts', '.tsx', '.txt', '.yaml', '.yml']);

const root = join(import.meta.dirname, '..');

const escapeHtml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\'', '&#39;');

const escapeSingleQuoted = (value: string): string => value.replaceAll('\\', '\\\\').replaceAll('\'', '\\\'');

// The title is the only free-text value: escape it for where it lands
const valueFor = (token: string, value: string, file: string): string => {
  if (token !== '__SITE_TITLE__') {
    return value;
  }
  if (file.endsWith('.html')) {
    return escapeHtml(value);
  }
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    return escapeSingleQuoted(value);
  }
  return value;
};

const listTextFiles = async (dir: string): Promise<string[]> => {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (path === import.meta.filename) {
      continue;
    }
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        files.push(...await listTextFiles(path));
      }
    }
    else if (TEXT_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      files.push(path);
    }
  }
  return files;
};

const collectValues = async (): Promise<Map<string, string>> => {
  const { values: args } = parseArgs({
    options: Object.fromEntries(FIELDS.map(field => [field.flag, { type: 'string' as const }])),
  });
  const values = new Map<string, string>();
  const missing = FIELDS.filter(field => !args[field.flag]);
  const readline = missing.length > 0 && process.stdin.isTTY
    ? createInterface({ input: process.stdin, output: process.stdout })
    : undefined;

  try {
    for (const field of FIELDS) {
      const given = args[field.flag];
      let value = typeof given === 'string' ? given.trim() : undefined;
      while (value === undefined || !field.pattern.test(value)) {
        if (value !== undefined) {
          console.error(`  "${value}" isn't valid: ${field.hint}`);
          if (!readline) {
            process.exit(1);
          }
        }
        if (!readline) {
          console.error(`Missing --${field.flag} (${field.hint})`);
          process.exit(1);
        }
        value = (await readline.question(`${field.prompt}: `)).trim();
      }
      values.set(field.token, value);
    }
  }
  finally {
    readline?.close();
  }
  return values;
};

const main = async (): Promise<void> => {
  if (!existsSync(join(root, 'template'))) {
    console.error('This repo is already set up (template/ is gone).');
    process.exit(1);
  }

  const values = await collectValues();

  console.log('==> Filling in values');
  for (const file of await listTextFiles(root)) {
    const text = await readFile(file, 'utf8');
    if (!hasToken(text)) {
      continue;
    }
    const filled = text.replaceAll(TOKEN_PATTERN, token => valueFor(token, values.get(token)!, file));
    await writeFile(file, filled);
    console.log(`    ${relative(root, file).split(sep).join('/')}`);
  }

  // Lines marked "// template-only" only make sense in the template (e.g. lint exclusions for template/)
  const eslintConfig = join(root, 'eslint.config.mjs');
  const config = await readFile(eslintConfig, 'utf8');
  await writeFile(eslintConfig, config.split('\n').filter(line => !line.includes('// template-only')).join('\n'));

  console.log('==> Moving the site workflows into place');
  const workflows = join(root, '.github', 'workflows');
  await mkdir(workflows, { recursive: true });
  for (const name of await readdir(join(root, 'template', 'workflows'))) {
    await rename(join(root, 'template', 'workflows', name), join(workflows, name));
  }

  console.log('==> Removing the template-only files');
  await rename(join(root, 'template', 'README.md'), join(root, 'README.md'));
  await rm(join(root, 'template'), { recursive: true });
  await rm(join(workflows, 'template-ci.yml'), { force: true });
  await rm(join(root, 'scripts'), { recursive: true });

  const leftovers: string[] = [];
  for (const file of await listTextFiles(root)) {
    if (hasToken(await readFile(file, 'utf8'))) {
      leftovers.push(relative(root, file));
    }
  }
  if (leftovers.length > 0) {
    console.error(`Placeholders left in: ${leftovers.join(', ')}`);
    process.exit(1);
  }

  console.log(`==> Done. Next: pnpm install, then follow "First-time setup" in README.md.`);
};

await main();
