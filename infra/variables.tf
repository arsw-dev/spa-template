variable "domains" {
  description = "Custom domains, the first canonical. Leave empty to run on the *.cloudfront.net preview address; add them once the Cloudflare zone is active (see the runbook's onboarding pre-flight)"
  type        = list(string)
  default     = []
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the site's domain (the zone's overview page)"
  type        = string
  default     = "__CLOUDFLARE_ZONE_ID__"
}
