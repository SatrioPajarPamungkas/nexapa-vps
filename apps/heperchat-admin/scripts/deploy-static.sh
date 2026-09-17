#!/usr/bin/env bash

set -u

APP_DIR="/opt/nexapa-commerce-native/apps/nexapa-commerce-admin"
WEB_DIR="/var/www/nexapa-commerce-admin"
NGINX_SOURCE="/opt/nexapa-commerce-native/nginx/sites-available/nexapa-commerce-native.conf"
NGINX_TARGET="/etc/nginx/sites-available/nexapa-commerce"

if [ ! -d "$APP_DIR" ]; then
  echo "Folder aplikasi tidak ditemukan: $APP_DIR"
else
  cd "$APP_DIR"
  build_ok=true

  if ! npm ci; then
    build_ok=false
  fi

  if [ "$build_ok" = true ] && ! npm run typecheck; then
    build_ok=false
  fi

  if [ "$build_ok" = true ] && ! npm run build; then
    build_ok=false
  fi

  if [ "$build_ok" = true ]; then
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
  else
    echo "BUILD GAGAL. FILE LAMA TETAP TAYANG DAN TIDAK DITIMPA."
  fi
fi
