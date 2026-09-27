# __SITE_TITLE__

A single-page site hosted on AWS (S3 + CloudFront) with Cloudflare DNS, built on [spa-platform](https://github.com/arsw-dev/spa-platform).

## Layout

| Path                 | What                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `site/`              | The site: Vite + React + TypeScript                                                                                    |
| `infra/bootstrap/`   | One-time account setup: Terraform state bucket, GitHub OIDC provider, read-only plan role                              |
| `infra/`             | The site's hosting: S3 bucket, CloudFront, certificate, DNS records, deploy role                                       |
| `.github/workflows/` | `ci.yml` (every pull request) and `deploy.yml` (every merge to `main`), both calling spa-platform's reusable workflows |

## Development

```sh
pnpm install
pnpm --filter site dev     # http://localhost:5173
pnpm lint
pnpm --filter site build
```

## Deploying

- **Deploys are automatic.** Every merge to `main` that changes the site builds it, uploads it and smoke-tests the live site. To redeploy by hand, go to Actions → Deploy → _Run workflow_.
- **Pull requests** run CI: lint, build, Terraform plans (posted as PR comments), and the routing function's tests. **CI Result** must pass before merging.

## Infrastructure

The Terraform modules and workflows come from spa-platform, pinned to a release: modules by tag (`?ref=`), workflows by commit SHA. Dependabot proposes new workflow pins only; move the module tags to the same release in that pull request, then plan and apply ([upgrading](https://github.com/arsw-dev/spa-platform/blob/main/docs/runbook.md#upgrade-spa-platform)). Changes to `infra/` are applied from a workstation with admin access to the AWS account. CI only plans.

## First-time setup

Once per site, in order, from the repository root. You need the AWS CLI signed in to this account, Terraform 1.15.6, and `CLOUDFLARE_API_TOKEN` set to a token with DNS:Edit on the zone.

The repository should be **public**: it holds no secrets, and on GitHub's free plan only public repositories can have the `production` environment and ruleset below. A private repository needs GitHub Team.

1. **Account setup** (state bucket, OIDC provider, plan role):

   ```sh
   terraform -chdir=infra/bootstrap init
   terraform -chdir=infra/bootstrap apply
   mv infra/bootstrap/backend.tf.pending infra/bootstrap/backend.tf
   terraform -chdir=infra/bootstrap init -migrate-state   # move state into the bucket it created
   ```

   If the account already has GitHub's OIDC provider, set `create_github_oidc_provider = false` in `infra/bootstrap/main.tf` first.

   Commit `infra/bootstrap/backend.tf` and `infra/bootstrap/.terraform.lock.hcl` (in a pull request once the ruleset exists). Until then, CI plans the bootstrap root against an empty state and shows everything being created. The local `infra/bootstrap/terraform.tfstate` left by the migration is gitignored; delete it once `terraform -chdir=infra/bootstrap plan` shows no changes.

2. **The site**, on its preview address first:

   ```sh
   terraform -chdir=infra init
   terraform -chdir=infra apply
   terraform -chdir=infra output
   ```

   Commit `infra/.terraform.lock.hcl` too.

3. **GitHub settings:**
   - Environment **`production`**, with deployment branches limited to `main`, holding these variables from `terraform output`: `AWS_DEPLOY_ROLE_ARN`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, and `SITE_URL` (the `site_url` output).
   - **Repository** secret `CLOUDFLARE_API_TOKEN`: a DNS:**Read** token for the zone, used by CI plans.
   - A ruleset on `main` requiring pull requests and the **CI Result** check.
   - Settings → Actions → require actions pinned to full-length commit SHAs.
4. **First deploy:** Actions → Deploy → _Run workflow_, then open the `site_url`.
5. **The custom domain,** once the Cloudflare zone is active: work through the [onboarding pre-flight](https://github.com/arsw-dev/spa-platform/blob/main/docs/runbook.md). Then set `domains` in `infra/variables.tf` (for example `["__SITE_NAME__.com", "www.__SITE_NAME__.com"]`), apply, and update `SITE_URL`.

## Operations

Rollback, restoring files, stuck state locks, and more: [spa-platform runbook](https://github.com/arsw-dev/spa-platform/blob/main/docs/runbook.md).
