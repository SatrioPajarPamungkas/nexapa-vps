#!/usr/bin/env bash

set -u

APP_DIR="/opt/nexapa-commerce-native/apps/nexapa-commerce-admin"
WEB_DIR="/var/www/nexapa-commerce-admin"
NGINX_SOURCE="/opt/nexapa-commerce-native/nginx/sites-available/nexapa-commerce-native.conf"
NGINX_TARGET="/etc/nginx/sites-available/nexapa-commerce"

cd "$APP_DIR" || {
  echo "Folder aplikasi tidak ditemukan: $APP_DIR"
  return 1 2>/dev/null || true
}

npm ci
npm run typecheck
npm run build

install -d -o root -g www-data -m 0755 "$WEB_DIR"
rsync -a --delete "$APP_DIR/dist/" "$WEB_DIR/"
chown -R root:www-data "$WEB_DIR"
find "$WEB_DIR" -type d -exec chmod 0755 {} +
find "$WEB_DIR" -type f -exec chmod 0644 {} +

if [ -f "$NGINX_TARGET" ]; then
  cp "$NGINX_TARGET" "$NGINX_TARGET.backup-$(date +%Y%m%d-%H%M%S)"
fi

install -o root -g root -m 0644 "$NGINX_SOURCE" "$NGINX_TARGET"
ln -sfn "$NGINX_TARGET" /etc/nginx/sites-enabled/nexapa-commerce

if nginx -t; then
  systemctl reload nginx
  echo "DEPLOY ADMIN NATIVE OK"
else
  echo "Konfigurasi Nginx gagal. Nginx tidak dimuat ulang."
fi
