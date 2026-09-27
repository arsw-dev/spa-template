terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.26"
    }
  }

  backend "s3" {
    bucket       = "__SITE_NAME__-tfstate-__AWS_ACCOUNT_ID__-us-east-1"
    key          = "site/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}

# CloudFront only uses certificates from us-east-1
provider "aws" {
  region = "us-east-1"
}

# Reads CLOUDFLARE_API_TOKEN: DNS:Edit for the zone locally, DNS:Read in CI
provider "cloudflare" {}
