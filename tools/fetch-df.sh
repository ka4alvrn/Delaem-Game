#!/bin/sh
# Скачивает атласы DroneFlames PC Port, нужные import-df.js
# (github.com/makkaX2/DroneFlames-PC-Port, assets/sprites)
# требует gh (авторизованный) или GITHUB_TOKEN в env
set -e
cd "$(dirname "$0")"
mkdir -p df
REPO=makkaX2/DroneFlames-PC-Port
for a in atlas_units314 atlas_air316 atlas_navy1 atlas_world2 atlas_world3 \
         atlas_world6 atlas_world7 atlas_world12 \
         atlas_dmg314_west atlas_dmg314_east atlas_dmg314_asia; do
  for ext in json png; do
    [ -s "df/$a.$ext" ] && continue
    printf '  %s.%s ' "$a" "$ext"
    gh api "/repos/$REPO/contents/assets/sprites/$a.$ext" --jq .content | base64 -d > "df/$a.$ext"
    echo ok
  done
done
echo "готово: df/"
