import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { SHOP_NAME, useAuth } from '../auth'

const link = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-white text-brand-800' : 'text-brand-100 hover:bg-brand-700'}`

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center justify-between bg-brand-800 px-4 py-3 text-white md:hidden">
        <span className="font-extrabold">{SHOP_NAME}</span>
        <button onClick={() => setOpen(!open)} className="rounded border border-brand-600 px-3 py-1 text-sm">Menu</button>
      </header>

      <aside className={`${open ? 'block' : 'hidden'} w-full shrink-0 bg-brand-800 p-4 md:sticky md:top-0 md:block md:h-screen md:w-60 md:overflow-y-auto`}>
        <div className="mb-6 hidden md:block">
          <div className="text-lg font-extrabold leading-tight text-white">{SHOP_NAME}</div>
          <div className="text-xs text-brand-100">Inventory and billing</div>
        </div>
        <nav className="space-y-1" onClick={() => setOpen(false)}>
          <NavLink to="/" end className={link}>Dashboard</NavLink>
          <NavLink to="/billing" className={link}>New bill</NavLink>
          <NavLink to="/invoices" className={link}>Bill history</NavLink>
          <NavLink to="/customers" className={link}>Customers</NavLink>
          <NavLink to="/products" className={link}>{isAdmin ? 'Products' : 'Product list'}</NavLink>
          {isAdmin && (
            <>
              <div className="px-3 pb-1 pt-5 text-xs font-semibold text-brand-100/70">Admin panel</div>
              <NavLink to="/admin/categories" className={link}>Categories</NavLink>
              <NavLink to="/admin/suppliers" className={link}>Suppliers</NavLink>
              <NavLink to="/admin/purchases" className={link}>Stock in (purchases)</NavLink>
              <NavLink to="/admin/stock" className={link}>Stock history</NavLink>
              <NavLink to="/admin/reports" className={link}>Reports</NavLink>
              <NavLink to="/admin/users" className={link}>Staff accounts</NavLink>
            </>
          )}
        </nav>
        <div className="mt-8 border-t border-brand-600 pt-4 text-sm text-brand-100">
          <div className="font-semibold text-white">{user?.fullName}</div>
          <div className="mb-2 text-xs">{user?.role === 'ADMIN' ? 'Admin' : 'Staff'}</div>
          <button onClick={() => { logout(); nav('/login') }} className="rounded border border-brand-600 px-3 py-1.5 text-xs font-semibold hover:bg-brand-700">Log out</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
