import http from './http'

export const login = (data: { username: string; password: string }) =>
  http.post('/login', data) as Promise<{ token: string; user: UserInfo }>

export const getMe = () => http.get('/me') as Promise<UserInfo>

export const updatePassword = (data: { oldPassword: string; newPassword: string }) =>
  http.patch('/password', data)

export const listUsers = () => http.get('/users') as Promise<UserInfo[]>
export const createUser = (data: Record<string, unknown>) => http.post('/users', data)
export const updateUser = (id: string, data: Record<string, unknown>) =>
  http.patch(`/users/${id}`, data)
export const deleteUser = (id: string) => http.delete(`/users/${id}`)

export const listProductBrands = () => http.get('/products/brands') as Promise<string[]>
export const listProducts = (params?: { q?: string; brand?: string }) =>
  http.get('/products', { params }) as Promise<Product[]>
export const createProduct = (data: Record<string, unknown>) => http.post('/products', data)
export const batchImportProducts = (items: Record<string, unknown>[]) =>
  http.post('/products/batch', { items }) as Promise<{
    created: number
    updated: number
    failed: number
    errors: { row: number; sku: string; message: string }[]
  }>
export const updateProduct = (id: string, data: Record<string, unknown>) =>
  http.patch(`/products/${id}`, data)
export const deleteProduct = (id: string) => http.delete(`/products/${id}`)

export const listCustomers = (q?: string) =>
  http.get('/customers', { params: { q } }) as Promise<Customer[]>
export const createCustomer = (data: Record<string, unknown>) => http.post('/customers', data)
export const updateCustomer = (id: string, data: Record<string, unknown>) =>
  http.patch(`/customers/${id}`, data)
export const deleteCustomer = (id: string) => http.delete(`/customers/${id}`)

export const listInbounds = (params?: { from?: string; to?: string }) =>
  http.get('/inbounds', { params }) as Promise<InboundOrder[]>
export const getInbound = (id: string) => http.get(`/inbounds/${id}`) as Promise<InboundOrder>
export const createInbound = (data: Record<string, unknown>) => http.post('/inbounds', data)
export const updateInbound = (id: string, data: Record<string, unknown>) =>
  http.patch(`/inbounds/${id}`, data)
export const deleteInbound = (id: string) => http.delete(`/inbounds/${id}`)

export const listOutbounds = (params?: { from?: string; to?: string }) =>
  http.get('/outbounds', { params }) as Promise<OutboundOrder[]>
export const getOutbound = (id: string) => http.get(`/outbounds/${id}`) as Promise<OutboundOrder>
export const createOutbound = (data: Record<string, unknown>) => http.post('/outbounds', data)
export const updateOutbound = (id: string, data: Record<string, unknown>) =>
  http.patch(`/outbounds/${id}`, data)
export const deleteOutbound = (id: string) => http.delete(`/outbounds/${id}`)

export const getFinanceSummary = (year: number) =>
  http.get('/finance/summary', { params: { year } }) as Promise<FinanceSummary>
export const getFinance = getFinanceSummary

export const getFinanceLedger = (params?: { from?: string; to?: string; limit?: number }) =>
  http.get('/finance/ledger', { params }) as Promise<LedgerRow[]>

export const getFinanceYearEnd = (year: number) =>
  http.get('/finance/year-end', { params: { year } }) as Promise<YearEndReport>

export const listInvoices = (params?: Record<string, unknown>) =>
  http.get('/invoices', { params }) as Promise<Invoice[]>
export const createInvoice = (data: Record<string, unknown>) => http.post('/invoices', data)
export const updateInvoice = (id: string, data: Record<string, unknown>) =>
  http.patch(`/invoices/${id}`, data)
export const deleteInvoice = (id: string) => http.delete(`/invoices/${id}`)

export type UserInfo = {
  id: string
  username: string
  name: string
  companyName?: string
  role: 'ADMIN' | 'STAFF'
  createdAt?: string
}

export type Product = {
  id: string
  name: string
  sku: string
  brand: string
  model: string
  unit: string
  unitPrice: number
  remark: string
  stock: number
}

export type Customer = {
  id: string
  name: string
  phone: string
  address: string
  remark: string
}

export type OrderItem = {
  id: string
  quantity: number
  unitPrice: number
  amount: number
  product: Product
}

export type InboundOrder = {
  id: string
  orderNo: string
  unitName?: string
  recordDate: string
  amount: number
  remark: string
  createdAt: string
  operator: { id: string; name: string; username: string }
  items: OrderItem[]
}

export type OutboundOrder = {
  id: string
  orderNo: string
  unitName?: string
  recordDate: string
  orderDate: string
  amount: number
  remark: string
  createdAt: string
  customer: Customer
  operator: { id: string; name: string; username: string }
  items: OrderItem[]
}

export type Invoice = {
  id: string
  invoiceTime: string
  invoiceUnit: string
  amount: number
  invoiceNo: string
  researchGroup: string
  paid: boolean
  contact: string
  remark: string
}

export type FinanceSummary = {
  year: number
  inboundTotal: number
  outboundTotal: number
  grossProfit: number
  months: { month: number; inbound: number; outbound: number; grossProfit: number }[]
}

export type LedgerRow = {
  id: string
  type: 'IN' | 'OUT'
  typeLabel: string
  date: string
  orderNo: string
  party: string
  amount: number
  remark: string
  operator: string
}

export type YearEndReport = FinanceSummary & {
  balanceDiff: number
}
