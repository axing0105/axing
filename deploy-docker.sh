#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> 构建并启动进销存 Docker 服务..."
docker compose up -d --build

echo "==> 保存镜像到 docker-images/（便于备份迁移）..."
mkdir -p docker-images
docker save jxc-frontend:latest jxc-backend:latest -o docker-images/jxc-images.tar

echo "==> 当前容器状态："
docker compose ps

echo ""
echo "部署完成："
echo "  访问地址：http://127.0.0.1:3080"
echo "  默认账号：admin / admin123"
echo "  镜像备份：docker-images/jxc-images.tar"
echo ""
echo "常用命令："
echo "  启动：docker compose up -d"
echo "  停止：docker compose down"
echo "  导入镜像：docker load -i docker-images/jxc-images.tar"
