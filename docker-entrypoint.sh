#!/bin/sh
set -e

# API_BASE env var (set via docker-compose / docker run -e) decides which
# backend the front-end talks to. Defaults to localhost:3000 for local dev.
API_BASE_VALUE="${API_BASE:-http://localhost:3000}"

# Rewrite the API_BASE line in common.js at container start, so the same
# image works for local (API_BASE=http://localhost:3000) and server/prod
# (API_BASE=https://api.yourdomain.com) just by changing an env var.
sed -i "s#window.API_BASE = .*#window.API_BASE = '${API_BASE_VALUE}';#" /usr/share/nginx/html/common.js

exec nginx -g 'daemon off;'