# Serves the self-contained HTML in this directory.
# Local:
#   docker build -t openpeeps-releases:local -f releases/Dockerfile releases
#   docker run --rm -p 8080:80 openpeeps-releases:local
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY *.html /usr/share/nginx/html/

EXPOSE 80
