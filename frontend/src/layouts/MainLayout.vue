<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="brand">
        <span class="logo">研</span>
        <span class="brand-text">研物通</span>
      </div>
      <el-scrollbar class="menu-scroll">
        <el-menu
          :default-active="route.path"
          :default-openeds="['base', 'biz', 'fin', 'settings']"
          router
          class="side-menu"
          background-color="#1e2a3a"
          text-color="#c5ced9"
          active-text-color="#ffffff"
        >
          <el-sub-menu index="base">
            <template #title>
              <el-icon><Box /></el-icon>
              <span>基础数据</span>
            </template>
            <el-menu-item index="/products">
              <el-icon><Goods /></el-icon>
              <span>商品库</span>
            </el-menu-item>
            <el-menu-item index="/customers">
              <el-icon><User /></el-icon>
              <span>课题组</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="biz">
            <template #title>
              <el-icon><Tickets /></el-icon>
              <span>业务单据</span>
            </template>
            <el-menu-item index="/inbounds">
              <el-icon><Download /></el-icon>
              <span>入库登记</span>
            </el-menu-item>
            <el-menu-item index="/outbounds">
              <el-icon><Upload /></el-icon>
              <span>出库登记</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="fin">
            <template #title>
              <el-icon><Coin /></el-icon>
              <span>财务业务</span>
            </template>
            <el-menu-item v-if="store.isAdmin" index="/finance">
              <el-icon><DataLine /></el-icon>
              <span>财务统计</span>
            </el-menu-item>
            <el-menu-item index="/invoices">
              <el-icon><Ticket /></el-icon>
              <span>发票对账</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="store.isAdmin" index="settings">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>设置</span>
            </template>
            <el-menu-item index="/users">
              <el-icon><UserFilled /></el-icon>
              <span>账号管理</span>
            </el-menu-item>
            <el-menu-item index="/settings">
              <el-icon><Tools /></el-icon>
              <span>系统设置</span>
            </el-menu-item>
            <el-menu-item index="/cloud">
              <el-icon><Cloudy /></el-icon>
              <span>云数据</span>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container class="main-wrap">
      <div class="status-bar">
        <div class="status-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
          <div class="status-title">{{ route.meta.title }}</div>
          <div class="status-desc">{{ route.meta.desc }}</div>
        </div>
        <div class="status-center">{{ displayCompany }}</div>
        <div class="status-right">{{ nowText }}</div>
      </div>

      <el-main class="main">
        <div class="page-shell">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const store = useUserStore()
const now = ref(new Date())
let timer: number | undefined

const weekMap = ['日', '一', '二', '三', '四', '五', '六']
const nowText = computed(() => {
  const d = now.value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} 星期${weekMap[d.getDay()]} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const displayCompany = computed(
  () => store.user?.companyName?.trim() || store.user?.name || '未设置公司'
)

onMounted(() => {
  store.fetchMe().catch(() => undefined)
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<style scoped>
.layout {
  height: 100%;
  background: #f0f2f5;
}

.aside {
  background: linear-gradient(180deg, #243447 0%, #1e2a3a 48%, #182231 100%);
  border-right: 1px solid #15202c;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(15, 23, 42, 0.12);
}

.brand {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.18);
}

.logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  background: #d9363e;
}

.brand-text {
  font-size: 16px;
  font-weight: 700;
  color: #f3f6fa;
  letter-spacing: 0.02em;
}

.menu-scroll {
  flex: 1;
}

.side-menu {
  border-right: none !important;
  padding: 8px 0 16px;
  background: transparent !important;
}

.side-menu :deep(.el-sub-menu__title),
.side-menu :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  margin: 2px 8px;
  border-radius: 6px;
}

.side-menu :deep(.el-sub-menu__title) {
  color: #e8edf3 !important;
}

.side-menu :deep(.el-sub-menu__title:hover),
.side-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.06) !important;
}

.side-menu :deep(.el-sub-menu .el-menu) {
  background: transparent !important;
}

.side-menu :deep(.el-sub-menu__icon-arrow) {
  color: #8b98a8;
}

.side-menu :deep(.el-menu-item.is-active) {
  background: rgba(217, 54, 62, 0.22) !important;
  color: #fff !important;
  position: relative;
  font-weight: 600;
}

.side-menu :deep(.el-menu-item.is-active)::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: #d9363e;
}

.main-wrap {
  min-width: 0;
  min-height: 0;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.status-bar {
  flex-shrink: 0;
  min-height: 72px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) auto minmax(180px, 1fr);
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
}

.status-left {
  min-width: 0;
  justify-self: start;
}

.status-left :deep(.el-breadcrumb) {
  font-size: 12px;
  line-height: 1.2;
  margin-bottom: 2px;
}

.status-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f1f1f;
  line-height: 1.3;
}

.status-desc {
  margin-top: 2px;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-center {
  justify-self: center;
  font-size: 15px;
  font-weight: 700;
  color: #1f1f1f;
  letter-spacing: 0.04em;
  white-space: nowrap;
  max-width: 28vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-right {
  justify-self: end;
  font-size: 13px;
  color: #595959;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.main {
  flex: 1;
  min-height: 0;
  display: block;
  padding: 16px 18px 24px;
  overflow: auto;
}

.page-shell {
  width: 100%;
}

@media (max-width: 900px) {
  .aside {
    width: 64px !important;
  }
  .brand-text,
  .side-menu :deep(.el-sub-menu__title span),
  .side-menu :deep(.el-menu-item span),
  .status-center,
  .status-right,
  .status-desc {
    display: none;
  }
  .brand {
    justify-content: center;
    padding: 0;
  }
  .status-bar {
    grid-template-columns: 1fr;
    min-height: 56px;
  }
}
</style>
