import { AlertSeverity, AlertType } from '@prisma/client'

export type AlertListItem = {
  id: number
  type: AlertType
  severity: AlertSeverity
  producto: {
    id: number
    nombre: string
    marca?: string | null
    categoria?: string | null
    stockActual: number | null
    stockMinimo: number | null
    proveedor?: {
      id: number
      nombre: string
      contacto?: string | null
      telefono?: string | null
      email?: string | null
    } | null
  }
  lote?: {
    id: number
    codigo?: string | null
    cantidad?: number | null
    fechaVenc?: string | null
  }
  mensaje: string
  venceEnDias?: number | null
  stockActual?: number | null
  stockMinimo?: number | null
  windowDias: number
  leida: boolean
  createdAt: string
  resolvedAt?: string | null
}

export type AlertsQueryParams = {
  type?: 'all' | 'stock' | 'expiry'
  severity?: AlertSeverity
  windowDays?: number
  unreadOnly?: boolean
  search?: string
  page?: number
  pageSize?: number
}
