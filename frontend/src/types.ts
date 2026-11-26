export type Role = 'ADMIN' | 'STAFF'
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'CREDIT'

export interface Page<T> { content: T[]; totalPages: number; totalElements: number; number: number }
export interface Category { id: number; name: string }
export interface Supplier { id: number; name: string; phone?: string; email?: string; address?: string }
export interface Customer { id: number; name: string; phone?: string; address?: string; dueAmount: number }

export interface Product {
  id: number; name: string; sku: string; barcode?: string | null
  categoryId?: number | null; categoryName?: string | null
  price: number; costPrice: number; gstPercent: number
  stockQty: number; reorderLevel: number; unit: string; lowStock: boolean
}

export interface InvoiceItem {
  productId: number; productName: string; quantity: number; unit: string
  unitPrice: number; gstPercent: number; lineTotal: number; gstAmount: number
}
export interface Invoice {
  id: number; invoiceNumber: string; customerId?: number | null; customerName: string; customerPhone?: string | null
  createdBy?: string; createdAt: string; subTotal: number; discount: number; gstAmount: number
  totalAmount: number; paidAmount: number; dueAmount: number; paymentMode: PaymentMode; items: InvoiceItem[]
}

export interface StockMovement {
  id: number; productId: number; productName: string; sku: string; type: 'IN' | 'OUT' | 'ADJUSTMENT'
  quantity: number; balanceAfter: number; reason?: string; reference?: string; createdBy?: string; createdAt: string
}
export interface Purchase {
  id: number; supplierName: string; purchaseDate: string; referenceNo?: string; totalAmount: number
  createdBy?: string; items: { productId: number; productName: string; quantity: number; unitCost: number }[]
}
export interface UserRow { id: number; username: string; fullName: string; email?: string; role: Role; active: boolean }

export interface DailySales { date: string; total: number; invoices: number }
export interface TopProduct { productId: number; name: string; quantity: number; revenue: number }
export interface Dashboard {
  todaySales: number; todayInvoices: number; monthSales: number; totalProducts: number
  lowStockCount: number; pendingDues: number; last7Days: DailySales[]; topProducts: TopProduct[]
}
export interface SalesReport {
  from: string; to: string; invoiceCount: number; subTotal: number; discount: number; gstAmount: number
  totalSales: number; cost: number; profit: number; daily: DailySales[]; topProducts: TopProduct[]
}
export interface StockValuation { totalProducts: number; totalUnits: number; costValue: number; retailValue: number }
