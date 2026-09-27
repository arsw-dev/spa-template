import type { Field } from './fields.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { byFlag, conflictsWith, FIELDS, problemWith } from './fields.ts';

const field = (flag: string): Field => FIELDS.find(each => each.flag === flag)!;

describe('site name', () => {
  it('accepts lowercase names up to 30 characters', () => {
    for (const name of ['ab', 'acme', 'obrien-sons', `a${'b'.repeat(29)}`]) {
      assert.equal(problemWith(field('name'), name), undefined, name);
    }
  });

  it('refuses names S3 or the pattern rejects', () => {
    for (const name of ['a', 'Acme', '1acme', 'acme-', `a${'b'.repeat(30)}`, 'xn--acme', 'sthree-acme', 'amzn-s3-demo-x']) {
      assert.notEqual(problemWith(field('name'), name), undefined, name);
    }
  });
});

describe('gitHub repository', () => {
  it('accepts owner/name as GitHub allows it', () => {
    for (const repo of ['acme-co/site', 'Acme-Co/My.Site_2', 'a/.github']) {
      assert.equal(problemWith(field('github-repo'), repo), undefined, repo);
    }
  });

  it('refuses shapes that give an OIDC trust that never matches', () => {
    for (const repo of ['acme-co/site.git', 'acme-co/Site.GIT', 'acme-co/..', 'acme-co/.', '_-/x', '-acme/site', 'acme/site/x', 'acme']) {
      assert.notEqual(problemWith(field('github-repo'), repo), undefined, repo);
    }
  });
});

describe('conflictsWith', () => {
  const values = { __SITE_NAME__: 'acme', __SITE_TITLE__: 'Acme', __AWS_ACCOUNT_ID__: '123456789012', __GITHUB_REPO__: 'acme-co/site', __CLOUDFLARE_ZONE_ID__: '0'.repeat(32) };
  const first = byFlag(values);

  it('records the values by flag, so the marker holds no tokens for setup to fill in', () => {
    assert.deepEqual(Object.keys(first), ['name', 'title', 'aws-account', 'github-repo', 'cloudflare-zone']);
    assert.doesNotMatch(JSON.stringify(first), /__[A-Z_]+__/);
  });

  it('allows a re-run with the same values, or with no earlier run', () => {
    assert.deepEqual(conflictsWith(first, values), []);
    assert.deepEqual(conflictsWith({}, values), []);
  });

  it('names every value that changed', () => {
    assert.deepEqual(conflictsWith(first, { ...values, __SITE_NAME__: 'globex', __AWS_ACCOUNT_ID__: '999999999999' }), [
      '--name was "acme", now "globex"',
      '--aws-account was "123456789012", now "999999999999"',
    ]);
  });
});
