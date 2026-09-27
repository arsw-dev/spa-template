# spa-template

The starting point for a client site on [spa-platform](https://github.com/arsw-dev/spa-platform): a coming-soon page, the Terraform for the client's AWS account and Cloudflare zone, and CI/deploy workflows that call spa-platform.

**This README and everything template-only disappear when you run setup.** The result is an ordinary project whose README describes the site.

## Before you start

The client owns every account; you work in them as a collaborator. Gather:

| Value              | Where it comes from                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| Site name          | You choose it: 2–30 lowercase letters, digits and hyphens. It's used in AWS resource names                      |
| Site title         | The client's name for the site                                                                                  |
| AWS account ID     | The client's account, after they've run the contractor-role one-click link from the latest spa-platform release |
| GitHub repository  | An empty repo the client created in their org, with you added as an admin                                       |
| Cloudflare zone ID | The client's zone (its overview page), with you added as a member                                               |

## Creating a site

```sh
git clone https://github.com/arsw-dev/spa-template.git <site> && cd <site>
node scripts/setup.ts                 # asks for the values above; or pass --name --title --aws-account --github-repo --cloudflare-zone
pnpm install
git add -A && git commit -m "Set up <site>"
# Before pushing: in the client's repo, create the `production` environment, limited to `main` (see below)
git remote set-url origin https://github.com/<client-org>/<repo>.git
git push -u origin main
```

Then follow **First-time setup** in the generated README.

Create the environment **before** the first push. The push runs Deploy, and a job that names an environment that doesn't exist creates it, unprotected. That first Deploy still fails, because the variables only exist after first-time setup: that's expected.

Setup:

1. Fills in the values: it HTML-escapes the title in `index.html` and quotes it safely in TypeScript.
2. Moves `template/workflows/*` into `.github/workflows/`.
3. Replaces this README with `template/README.md`.
4. Deletes `template/`, `scripts/` and `.github/workflows/template-ci.yml`.
5. Fails if any placeholder is left. It refuses to run twice.

## Maintaining the template

`template-ci.yml` runs setup on a copy with sample values and checks the result: no placeholders or template files left, lint, site build, `terraform fmt` and `validate` for both roots, and `actionlint` on the generated workflows.

When spa-platform releases, bump the `?ref=` pins in `infra/` and the workflow pins in `template/workflows/` together.
