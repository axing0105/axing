import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      redirect: '/products',
      children: [
        {
          path: 'products',
          component: () => import('@/views/ProductsView.vue'),
          meta: { title: '商品库', desc: '维护物品档案，按品牌分类管理库存商品。' },
        },
        {
          path: 'customers',
          component: () => import('@/views/CustomersView.vue'),
          meta: { title: '课题组', desc: '维护课题组信息，供出库与业务往来使用。' },
        },
        {
          path: 'inbounds',
          component: () => import('@/views/InboundsView.vue'),
          meta: { title: '入库登记', desc: '登记入库明细，支持搜索/手输商品并打印单据。' },
        },
        {
          path: 'outbounds',
          component: () => import('@/views/OutboundsView.vue'),
          meta: { title: '出库登记', desc: '登记出库明细，关联课题组并可打印单据。' },
        },
        {
          path: 'finance',
          component: () => import('@/views/FinanceView.vue'),
          meta: { title: '财务统计', desc: '查看近一个月流水汇总与年底对账。', admin: true },
        },
        {
          path: 'invoices',
          component: () => import('@/views/InvoicesView.vue'),
          meta: { title: '发票对账', desc: '管理开票记录、到账状态与课题组信息。' },
        },
        {
          path: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { title: '账号管理', desc: '管理系统账号与角色权限。', admin: true },
        },
        {
          path: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: '系统设置', desc: '配置单位信息、打印抬头与系统默认项。', admin: true },
        },
        {
          path: 'password',
          component: () => import('@/views/PasswordView.vue'),
          meta: { title: '修改密码', desc: '修改当前登录账号密码。' },
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const store = useUserStore()
  if (!to.meta.public && !store.isLoggedIn) return '/login'
  if (to.path === '/login' && store.isLoggedIn) return '/'
  if (to.meta.admin && !store.isAdmin) return '/products'
  return true
})

export default router
