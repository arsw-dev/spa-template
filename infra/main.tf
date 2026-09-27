module "site" {
  source = "github.com/arsw-dev/spa-platform//modules/static-site?ref=v1.0.0-rc.2"

  name        = "__SITE_NAME__"
  domains     = var.domains
  github_repo = "__GITHUB_REPO__"
  # The repo's OIDC subject as GitHub reports it (immutable: owner and repo IDs); the deploy role trusts it
  github_subject_prefix = "__GITHUB_SUBJECT_PREFIX__"
  plan_role_name        = "__SITE_NAME__-terraform-plan"

  validation_record_fqdns = values(module.certificate_dns.record_names)
}

# Two calls, not one: the validation records must exist before the certificate is validated, and the domain
# records point at the distribution, which needs the validated certificate. One resource for both would be a cycle.

module "certificate_dns" {
  source = "github.com/arsw-dev/spa-platform//modules/cloudflare-dns?ref=v1.0.0-rc.2"

  zone_id = var.cloudflare_zone_id
  records = {
    for domain, record in module.site.certificate_validation_records : domain => {
      name    = record.name
      type    = record.type
      content = record.value
    }
  }
}

module "site_dns" {
  source = "github.com/arsw-dev/spa-platform//modules/cloudflare-dns?ref=v1.0.0-rc.2"

  zone_id = var.cloudflare_zone_id
  records = {
    for domain, record in module.site.domain_records : domain => {
      name    = record.name
      type    = record.type
      content = record.value
    }
  }
}
