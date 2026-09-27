output "state_bucket_name" {
  description = "Terraform state bucket"
  value       = module.bootstrap.state_bucket_name
}

output "plan_role_arn" {
  description = "Role for pull-request plans, passed to CI as plan-role-arn"
  value       = module.bootstrap.plan_role_arn
}
