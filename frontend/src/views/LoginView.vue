<template>
  <div class="login-page">
    <el-card class="login-card" shadow="never">
      <div class="brand-row">
        <span class="logo">研</span>
        <h1>研物通</h1>
      </div>
      <p class="sub">请登录后继续操作</p>
      <el-form :model="form" label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" size="large" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            size="large"
            type="password"
            show-password
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-button type="primary" size="large" class="login-btn" :loading="loading" native-type="submit">
          登录
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const store = useUserStore()
const loading = ref(false)
const form = reactive({ username: 'admin', password: 'admin123' })

async function onSubmit() {
  loading.value = true
  try {
    await store.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 12% 18%, rgba(217, 54, 62, 0.12), transparent 36%),
    radial-gradient(circle at 88% 10%, rgba(0, 0, 0, 0.04), transparent 30%),
    #f0f2f5;
}

.login-card {
  width: min(420px, 100%);
  border-radius: 10px !important;
  border: 1px solid #e8e8e8 !important;
  padding: 12px 8px 4px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

.logo {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  background: #d9363e;
}

h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
}

.sub {
  margin: 10px 0 22px;
  text-align: center;
  color: #8c8c8c;
}

.login-btn {
  width: 100%;
  margin-top: 4px;
  height: 42px;
}
</style>
