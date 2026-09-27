import type { Field } from './fields.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { byFlag, conflictsWith, FIELDS, problemWith, subjectMismatch } from './fields.ts';

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

describe('GitHub OIDC subject prefix', () => {
  it('accepts the immutable and legacy forms', () => {
    for (const prefix of ['repo:acme-co@186983646/site@1390922369', 'repo:acme-co/site', 'repo:Acme-Co@1/My.Site_2@2']) {
      assert.equal(problemWith(field('github-subject-prefix'), prefix), undefined, prefix);
    }
  });

  it('refuses anything else, including a full subject or wildcards', () => {
    for (const prefix of ['acme-co/site', 'repo:acme-co/site:', 'repo:acme-co/site:pull_request', 'repo:acme-co/*', 'repo:acme-co@x/site', 'null', '']) {
      assert.notEqual(problemWith(field('github-subject-prefix'), prefix), undefined, prefix);
    }
  });

  it('must name the same repository as github-repo, capitalisation included', () => {
    const repo = { __GITHUB_REPO__: 'acme-co/site' };
    assert.equal(subjectMismatch({ ...repo, __GITHUB_SUBJECT_PREFIX__: 'repo:acme-co@1/site@2' }), undefined);
    assert.equal(subjectMismatch({ ...repo, __GITHUB_SUBJECT_PREFIX__: 'repo:acme-co/site' }), undefined);
    assert.match(subjectMismatch({ ...repo, __GITHUB_SUBJECT_PREFIX__: 'repo:Acme-Co@1/site@2' })!, /is for Acme-Co\/site, not acme-co\/site/);
    assert.match(subjectMismatch({ ...repo, __GITHUB_SUBJECT_PREFIX__: 'repo:acme-co@1/website@2' })!, /not acme-co\/site/);
  });
});

describe('conflictsWith', () => {
  const values = { __SITE_NAME__: 'acme', __SITE_TITLE__: 'Acme', __AWS_ACCOUNT_ID__: '123456789012', __GITHUB_REPO__: 'acme-co/site', __GITHUB_SUBJECT_PREFIX__: 'repo:acme-co@1/site@2', __CLOUDFLARE_ZONE_ID__: '0'.repeat(32) };
  const first = byFlag(values);

  it('records the values by flag, so the marker holds no tokens for setup to fill in', () => {
    assert.deepEqual(Object.keys(first), ['name', 'title', 'aws-account', 'github-repo', 'github-subject-prefix', 'cloudflare-zone']);
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
