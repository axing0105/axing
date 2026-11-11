# 研物通

面向课题组/实验室的物资进销存系统。参考 [mogutouERP](https://github.com/Allenxuxu/mogutouERP) 业务形态，使用 Vue 3 + Express + MySQL 实现。

## 功能

- 公开注册（每人独立租户数据空间）
- 商品库（品牌分类、货号、型号、单价、库存）
- 课题组管理
- 入库登记 / 出库登记（搜索手输商品、打印单据）
- 财务统计（流水、毛利、年底对账）
- 发票对账（开票信息、到账状态）
- 账号管理（公司名称、管理员）/ 系统设置（关于我们、帮助、客服）

## 多租户与注册

- 登录页可**注册**：系统自动创建独立租户，注册人成为该租户管理员
- 各租户的商品、课题组、出入库、发票、财务互不可见
- 租户内管理员仍可在「账号管理」添加员工账号（共享本租户数据）
- 演示账号：`admin` / `admin123`（演示租户）

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

> 若从旧版本升级（新增租户字段），本地卷可能无法自动迁移，可执行 `docker compose down -v` 后重新 `up --build`（会清空本地库数据）。

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

## 阿里云 RDS（云端存储）

业务数据通过 Prisma 写入 MySQL。将 `DATABASE_URL` 指向阿里云 RDS 即可云端持久化。

1. 开通 **云数据库 RDS MySQL 8.0**
2. 创建数据库 `jxc`，创建高权限账号，配置白名单（本机公网 IP 或 ECS 内网）
3. 在 `backend/.env` 填写连接串（参考 `backend/.env.example`）：

```bash
DATABASE_URL="mysql://用户名:密码@rm-xxxxxxxx.mysql.rds.aliyuncs.com:3306/jxc"
JWT_SECRET="请换成足够长的随机字符串"
PORT=8088
```

4. 推送表结构并写入演示账号：

```bash
cd backend
npm install
npm run db:setup
npm run dev
```

Docker 部署若要用阿里云库：给 `backend` 服务覆盖 `DATABASE_URL` 环境变量（见 `docker-compose.yml`），并确保 RDS 白名单包含运行 Docker 的机器 IP。

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
- 数据库：MySQL 8（本地 Docker 或阿里云 RDS）
