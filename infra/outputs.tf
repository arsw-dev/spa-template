output "site_url" {
  description = "Where the site is served: the first custom domain, or the CloudFront preview address"
  value       = length(var.domains) > 0 ? "https://${var.domains[0]}" : "https://${module.site.distribution_domain}"
}

output "s3_bucket" {
  description = "Site bucket (the production environment's S3_BUCKET variable)"
  value       = module.site.bucket_name
}

output "cloudfront_distribution_id" {
  description = "Distribution ID (the production environment's CLOUDFRONT_DISTRIBUTION_ID variable)"
  value       = module.site.distribution_id
}

output "deploy_role_arn" {
  description = "Deploy role (the production environment's AWS_DEPLOY_ROLE_ARN variable)"
  value       = module.site.deploy_role_arn
}
