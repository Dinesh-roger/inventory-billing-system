import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Billing from './pages/Billing'
import Invoices from './pages/Invoices'
import Customers from './pages/Customers'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Suppliers from './pages/Suppliers'
import Purchases from './pages/Purchases'
import Stock from './pages/Stock'
import Reports from './pages/Reports'
import Users from './pages/Users'

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user?.role === 'ADMIN' ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="billing" element={<Billing />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="customers" element={<Customers />} />
        <Route path="products" element={<Products />} />
        {/* Admin panel */}
        <Route path="admin/categories" element={<AdminOnly><Categories /></AdminOnly>} />
        <Route path="admin/suppliers" element={<AdminOnly><Suppliers /></AdminOnly>} />
        <Route path="admin/purchases" element={<AdminOnly><Purchases /></AdminOnly>} />
        <Route path="admin/stock" element={<AdminOnly><Stock /></AdminOnly>} />
        <Route path="admin/reports" element={<AdminOnly><Reports /></AdminOnly>} />
        <Route path="admin/users" element={<AdminOnly><Users /></AdminOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
