import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import productRoutes from './routes/products'
import customerRoutes from './routes/customers'
import inboundRoutes from './routes/inbounds'
import outboundRoutes from './routes/outbounds'
import financeRoutes from './routes/finance'
import invoiceRoutes from './routes/invoices'

const app = express()
const port = Number(process.env.PORT) || 8088

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/v1', authRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/products', productRoutes)
app.use('/api/v1/customers', customerRoutes)
app.use('/api/v1/inbounds', inboundRoutes)
app.use('/api/v1/outbounds', outboundRoutes)
app.use('/api/v1/finance', financeRoutes)
app.use('/api/v1/invoices', invoiceRoutes)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ message: '服务器错误' })
})

app.listen(port, () => {
  console.log(`JXC API listening on http://127.0.0.1:${port}`)
})
