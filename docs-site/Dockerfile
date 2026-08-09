# Pre-built static docs (CI runs `pnpm --filter @openpeeps/docs-site build`
# before this image build). Serves multi-version VitePress output.
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/

EXPOSE 80
