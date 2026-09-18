#!/usr/bin/env bash
set -e

cd /srv/nexapa-crm/app

systemctl stop nexapa-crm.service

rm -rf .next
npm run build

mkdir -p .next/standalone/.next
cp -a .next/static .next/standalone/.next/static

if [ -d public ]; then
  cp -a public .next/standalone/public
fi

chown -R nexapacrm:nexapacrm .next

systemctl start nexapa-crm.service
systemctl status nexapa-crm.service --no-pager -l
