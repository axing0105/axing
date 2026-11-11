<template>
  <div class="login-page">
    <el-card class="login-card" shadow="never">
      <div class="brand-row">
        <span class="logo">研</span>
        <h1>研物通</h1>
      </div>
      <p class="sub">{{ mode === 'login' ? '请登录后继续操作' : '注册后自动创建独立数据空间' }}</p>

      <el-tabs v-model="mode" stretch class="auth-tabs">
        <el-tab-pane label="登录" name="login" />
        <el-tab-pane label="注册" name="register" />
      </el-tabs>

      <el-form
        v-if="mode === 'login'"
        :model="loginForm"
        label-position="top"
        @submit.prevent="onLogin"
      >
        <el-form-item label="用户名">
          <el-input v-model="loginForm.username" size="large" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="loginForm.password"
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

      <el-form v-else :model="registerForm" label-position="top" @submit.prevent="onRegister">
        <el-form-item label="用户名">
          <el-input v-model="registerForm.username" size="large" placeholder="至少 3 位" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="registerForm.name" size="large" placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="公司/单位名称（可选）">
          <el-input v-model="registerForm.companyName" size="large" placeholder="用于单据抬头" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="registerForm.password"
            size="large"
            type="password"
            show-password
            placeholder="至少 6 位"
          />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input
            v-model="registerForm.confirmPassword"
            size="large"
            type="password"
            show-password
            placeholder="再次输入密码"
          />
        </el-form-item>
        <el-button type="primary" size="large" class="login-btn" :loading="loading" native-type="submit">
          注册并登录
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
const mode = ref<'login' | 'register'>('login')

const loginForm = reactive({ username: 'admin', password: 'admin123' })
const registerForm = reactive({
  username: '',
  name: '',
  companyName: '',
  password: '',
  confirmPassword: '',
})

async function onLogin() {
  loading.value = true
  try {
    await store.login(loginForm.username, loginForm.password)
    ElMessage.success('登录成功')
    router.push('/')
  } finally {
    loading.value = false
  }
}

async function onRegister() {
  if (registerForm.username.trim().length < 3) {
    ElMessage.warning('用户名至少 3 位')
    return
  }
  if (!registerForm.name.trim()) {
    ElMessage.warning('请填写姓名')
    return
  }
  if (registerForm.password.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage.warning('两次密码不一致')
    return
  }

  loading.value = true
  try {
    await store.register({
      username: registerForm.username.trim(),
      name: registerForm.name.trim(),
      companyName: registerForm.companyName.trim(),
      password: registerForm.password,
    })
    ElMessage.success('注册成功，已创建独立数据空间')
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
  margin: 10px 0 8px;
  text-align: center;
  color: #8c8c8c;
}

.auth-tabs {
  margin-bottom: 8px;
}

.login-btn {
  width: 100%;
  margin-top: 4px;
  height: 42px;
}
</style>
