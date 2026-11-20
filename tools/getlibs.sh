#!/bin/sh
# Распаковка библиотек AL2023 для headless Chromium (libnss3, libnspr4 и др.)
set -e
mkdir -p /tmp/al2023
node -e '
const fs=require("fs"),zlib=require("zlib");
const p="node_modules/@sparticuz/chromium/bin/al2023.tar.br";
if(!fs.existsSync(p)){console.log("нет al2023.tar.br");process.exit(1)}
fs.writeFileSync("/tmp/al2023.tar",zlib.brotliDecompressSync(fs.readFileSync(p)));
' 
tar -xf /tmp/al2023.tar -C /tmp/al2023
echo "библиотеки в /tmp/al2023/lib"
