import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'

export type AuthUser = {
  id: string
  tenantId: string
  username: string
  name: string
  companyName?: string
  role: Role
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

const secret = () => process.env.JWT_SECRET || 'jxc-dev-secret-change-me'

export function signToken(user: AuthUser) {
  return jwt.sign(user, secret(), { expiresIn: '7d' })
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未登录' })
  }
  try {
    const payload = jwt.verify(header.slice(7), secret()) as AuthUser
    if (!payload.tenantId) {
      return res.status(401).json({ message: '登录已失效，请重新登录' })
    }
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ message: '登录已失效，请重新登录' })
  }
}

export function adminRequired(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: '需要管理员权限' })
  }
  next()
}
