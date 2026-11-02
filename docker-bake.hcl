# Build targets for CI (.forgejo/workflows/build.yaml). Both images live in
# one Dockerfile:
#   - app:  production runtime image (Alpine, musl)
#   - test: Playwright integration-test image (Ubuntu noble, glibc)
# The test stage reuses the five shared packages' dist/ from the builder
# stage instead of rebuilding them: dist/ is portable JS, while each image
# keeps its own runtime base and node_modules ABI (musl vs glibc).
# IMAGE, SHA, VERSION and ENVIRONMENT are provided by the CI environment.

variable "IMAGE" {
  default = ""
}

variable "SHA" {
  default = ""
}

variable "VERSION" {
  default = ""
}

variable "ENVIRONMENT" {
  default = ""
}

group "default" {
  targets = ["app", "test"]
}

target "app" {
  context    = "."
  dockerfile = "Dockerfile"
  target     = "app"
  tags       = ["${IMAGE}:${SHA}"]
  args = {
    VERSION     = "${VERSION}"
    ENVIRONMENT = "${ENVIRONMENT}"
  }
}

target "test" {
  context    = "."
  dockerfile = "Dockerfile"
  target     = "test"
  tags       = ["${IMAGE}:test-${SHA}"]
}
