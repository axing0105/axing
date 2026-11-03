#!/bin/sh
set -e

echo "Waiting for MySQL..."
i=0
until node -e "
const net=require('net');
const s=net.connect(Number(process.env.DB_PORT||3306), process.env.DB_HOST||'mysql');
s.on('connect',()=>{s.end();process.exit(0)});
s.on('error',()=>process.exit(1));
" 2>/dev/null; do
  i=$((i+1))
  if [ "$i" -gt 60 ]; then
    echo "MySQL not ready after 60s"
    exit 1
  fi
  sleep 1
done

echo "Pushing schema & seeding..."
npx prisma db push
node dist/prisma/seed.js || true

echo "Starting API..."
exec node dist/src/index.js
