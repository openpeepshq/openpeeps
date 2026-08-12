# Pre-built static component gallery (CI runs
# `pnpm --filter @openpeepshq/component-gallery build` before this image build).
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/

EXPOSE 80
