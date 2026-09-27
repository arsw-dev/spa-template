type Field = {
  flag: string;
  token: string;
  prompt: string;
  pattern: RegExp;
  hint: string;
  // Rules a pattern can't express readably; returns why the value is refused
  refuse?: (value: string) => string | undefined;
};

// Keyed by token (__SITE_NAME__) while filling in, and by flag (name) in the marker, which mustn't contain tokens
type Values = Record<string, string>;

// S3 refuses bucket names with these prefixes, and every bucket name starts with the site name
const RESERVED_BUCKET_PREFIXES = ['xn--', 'sthree-', 'amzn-s3-demo-'];

// The state bucket (<name>-tfstate-<account>-us-east-1) is the longest name built from the site name; S3 allows 63
const FIELDS: Field[] = [
  {
    flag: 'name',
    token: '__SITE_NAME__',
    prompt: 'Site name (used in AWS resource names)',
    pattern: /^[a-z][a-z0-9-]{0,28}[a-z0-9]$/,
    hint: '2-30 lowercase letters, digits and hyphens, starting with a letter',
    refuse: value => RESERVED_BUCKET_PREFIXES.some(prefix => value.startsWith(prefix))
      ? `S3 bucket names can't start with ${RESERVED_BUCKET_PREFIXES.join(', ')}`
      : undefined,
  },
  { flag: 'title', token: '__SITE_TITLE__', prompt: 'Site title (shown on the page)', pattern: /^[\p{L}\p{N} .,&'!?:-]{1,80}$/u, hint: 'up to 80 letters, digits, spaces and . , & \' ! ? : -' },
  { flag: 'aws-account', token: '__AWS_ACCOUNT_ID__', prompt: 'Client AWS account ID', pattern: /^\d{12}$/, hint: '12 digits' },
  {
    flag: 'github-repo',
    token: '__GITHUB_REPO__',
    prompt: 'GitHub repository (owner/name, capitalised exactly as on GitHub)',
    pattern: /^[A-Z0-9][A-Z0-9-]{0,38}\/[\w.-]{1,100}$/i,
    hint: 'owner/name, as in the repository\'s URL',
    refuse: (value) => {
      const name = value.slice(value.indexOf('/') + 1);
      if (/^\.+$/.test(name)) {
        return 'a repository name can\'t be only dots';
      }
      if (name.toLowerCase().endsWith('.git')) {
        return 'leave off the .git suffix';
      }
      return undefined;
    },
  },
  {
    flag: 'github-subject-prefix',
    token: '__GITHUB_SUBJECT_PREFIX__',
    prompt: 'GitHub OIDC subject prefix (gh api repos/<owner>/<repo>/actions/oidc/customization/sub --jq .sub_claim_prefix)',
    pattern: /^repo:[A-Za-z0-9-]+(?:@\d+)?\/[\w.-]+(?:@\d+)?$/,
    hint: 'repo:owner@<id>/name@<id> (or repo:owner/name for older repos), as GitHub reports it',
  },
  { flag: 'cloudflare-zone', token: '__CLOUDFLARE_ZONE_ID__', prompt: 'Cloudflare zone ID', pattern: /^[0-9a-f]{32}$/, hint: '32 hex characters, from the zone\'s overview page' },
];

// The AWS roles trust the subject prefix, so it must be the same repository as github-repo, capitalisation included
const subjectMismatch = (values: Values): string | undefined => {
  const repo = values.__GITHUB_REPO__;
  const prefix = values.__GITHUB_SUBJECT_PREFIX__;
  if (repo === undefined || prefix === undefined) {
    return undefined;
  }
  const named = prefix.replace(/^repo:/, '').replaceAll(/@\d+/g, '');
  return named === repo ? undefined : `the subject prefix ${prefix} is for ${named}, not ${repo}`;
};

// Why a value is refused, or undefined when it's valid
const problemWith = (field: Field, value: string): string | undefined =>
  field.pattern.test(value) ? field.refuse?.(value) : field.hint;

const byFlag = (values: Values): Values => Object.fromEntries(FIELDS.map(field => [field.flag, values[field.token]!]));

// A re-run after a partial failure must use the first run's values (previous, by flag): the files already filled keep them
const conflictsWith = (previous: Values, values: Values): string[] =>
  FIELDS.filter(field => previous[field.flag] !== undefined && previous[field.flag] !== values[field.token])
    .map(field => `--${field.flag} was "${previous[field.flag]}", now "${values[field.token]}"`);

export { byFlag, conflictsWith, FIELDS, problemWith, subjectMismatch };
export type { Field, Values };
