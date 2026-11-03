<template>
  <div class="page-card" style="max-width: 480px">
    <el-form label-width="100px" @submit.prevent="onSubmit">
      <el-form-item label="原密码">
        <el-input v-model="form.oldPassword" type="password" show-password />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="form.newPassword" type="password" show-password />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" native-type="submit">保存</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { updatePassword } from '@/api'

const loading = ref(false)
const form = reactive({ oldPassword: '', newPassword: '' })

async function onSubmit() {
  loading.value = true
  try {
    await updatePassword(form)
    ElMessage.success('密码已修改')
    form.oldPassword = ''
    form.newPassword = ''
  } finally {
    loading.value = false
  }
}
</script>
