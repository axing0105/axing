# 研物通

面向课题组/实验室的物资进销存系统。参考 [mogutouERP](https://github.com/Allenxuxu/mogutouERP) 业务形态，使用 Vue 3 + Express + MySQL 实现。

## 功能

- 商品库（品牌分类、货号、型号、单价、库存）
- 课题组管理
- 入库登记 / 出库登记（搜索手输商品、打印单据）
- 财务统计（流水、毛利、年底对账）
- 发票对账（开票信息、到账状态）
- 账号管理（公司名称、管理员）/ 系统设置（关于我们、帮助、客服）

## Docker 一键部署（推荐）

```bash
# 方式一：脚本（构建 + 启动 + 导出镜像备份）
chmod +x deploy-docker.sh
./deploy-docker.sh

# 方式二：直接 Compose
docker compose up -d --build
```

浏览器打开：**http://127.0.0.1:3080**

默认账号：`admin` / `admin123`

### 持久化说明

| 内容 | 说明 |
|------|------|
| MySQL 数据 | Docker volume `jxc_mysql_data`，`compose down` 不删数据 |
| 应用镜像 | `jxc-frontend:latest` / `jxc-backend:latest` |
| 镜像备份包 | `docker-images/jxc-images.tar`（由脚本生成） |

停止（保留数据库）：

```bash
docker compose down
```

重新启动：

```bash
docker compose up -d
```

从备份恢复镜像：

```bash
docker load -i docker-images/jxc-images.tar
docker compose up -d
```

清空数据（慎用）：

```bash
docker compose down -v
```

## 本地开发启动

### 1. 仅启动 MySQL

```bash
docker compose up -d mysql
```

### 2. 后端

```bash
cd backend
npm install
npm run db:setup
npm run dev
```

API：`http://127.0.0.1:8088`

### 3. 前端

```bash
cd frontend
npm install
npm run dev
```

页面：`http://127.0.0.1:5173`

## 技术栈

- 前端：Vue 3、Vite、Element Plus、Pinia、ECharts
- 后端：Express、TypeScript、Prisma、JWT
- 数据库：MySQL 8
