module "bootstrap" {
  source = "github.com/arsw-dev/spa-platform//modules/account-bootstrap?ref=250ffe0e3f9b2bd5dd168b24f5975f0e01e8ada9"

  name              = "__SITE_NAME__"
  state_bucket_name = "__SITE_NAME__-tfstate-__AWS_ACCOUNT_ID__-us-east-1"
  github_repo       = "__GITHUB_REPO__"

  # One per Terraform root in this account; the plan role can read only these
  state_keys = [
    "bootstrap/terraform.tfstate",
    "site/terraform.tfstate",
  ]

  # AWS allows one GitHub OIDC provider per account: set false if this account already has one
  create_github_oidc_provider = true
}
