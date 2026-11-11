import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserInfo } from '@/api'
import { getMe, login as loginApi, register as registerApi } from '@/api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<UserInfo | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  )

  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isLoggedIn = computed(() => Boolean(token.value))

  function persist(nextToken: string, nextUser: UserInfo) {
    token.value = nextToken
    user.value = nextUser
    localStorage.setItem('token', nextToken)
    localStorage.setItem('user', JSON.stringify(nextUser))
  }

  async function login(username: string, password: string) {
    const res = await loginApi({ username, password })
    persist(res.token, res.user)
  }

  async function register(data: {
    username: string
    password: string
    name: string
    companyName?: string
  }) {
    const res = await registerApi(data)
    persist(res.token, res.user)
  }

  async function fetchMe() {
    if (!token.value) return
    const me = await getMe()
    user.value = me
    localStorage.setItem('user', JSON.stringify(me))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isAdmin, isLoggedIn, login, register, fetchMe, logout }
})
