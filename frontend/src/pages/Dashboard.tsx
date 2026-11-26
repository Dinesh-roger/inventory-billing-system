import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../auth'
import type { Dashboard as Dash, Product } from '../types'
import { Badge, Empty, Panel, PageHeader, fmtQty, inr, td, th } from '../components/ui'

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Panel className="p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </Panel>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get<Dash>('/dashboard')).data })
  const low = useQuery({ queryKey: ['low-stock'], queryFn: async () => (await api.get<Product[]>('/products/low-stock')).data })
  const d = dash.data

  return (
    <>
      <PageHeader title={`Hello, ${user?.fullName ?? ''}`} subtitle="Here is how the shop is doing today.">
        <Link to="/billing" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Start a new bill</Link>
      </PageHeader>

      {dash.isError && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Could not load the dashboard. Is the backend running on port 8080?</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Sales today" value={inr(d?.todaySales)} hint={`${d?.todayInvoices ?? 0} bills`} />
        <Stat label="Sales this month" value={inr(d?.monthSales)} />
        <Stat label="Pending customer dues" value={inr(d?.pendingDues)} />
        <Stat label="Items to reorder" value={String(d?.lowStockCount ?? 0)} hint={`${d?.totalProducts ?? 0} products in total`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Panel className="p-4 lg:col-span-3">
          <h2 className="mb-3 font-bold">Sales, last 7 days</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d?.last7Days.map((x) => ({ ...x, day: new Date(x.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }) })) ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={55} />
                <Tooltip formatter={(v: number) => inr(v)} />
                <Bar dataKey="total" name="Sales" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <h2 className="border-b border-slate-200 px-4 py-3 font-bold">Top selling, last 7 days</h2>
          {d && d.topProducts.length === 0 ? <Empty>No sales yet this week.</Empty> : (
            <table className="w-full">
              <tbody>
                {d?.topProducts.map((p) => (
                  <tr key={p.productId}><td className={td}>{p.name}</td><td className={`${td} text-right`}>{p.quantity} sold</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <Panel className="mt-5 overflow-x-auto">
        <h2 className="border-b border-slate-200 px-4 py-3 font-bold">Low stock</h2>
        {low.data && low.data.length === 0 ? <Empty>All items are above their reorder level.</Empty> : (
          <table className="w-full">
            <thead><tr><th className={th}>Product</th><th className={th}>SKU</th><th className={th}>In stock</th><th className={th}>Reorder level</th></tr></thead>
            <tbody>
              {low.data?.map((p) => (
                <tr key={p.id}>
                  <td className={td}>{p.name}</td><td className={td}>{p.sku}</td>
                  <td className={td}><Badge tone={p.stockQty === 0 ? 'red' : 'amber'}>{p.stockQty === 0 ? 'Out of stock' : `${fmtQty(p.stockQty)} ${p.unit} left`}</Badge></td>
                  <td className={td}>{p.reorderLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  )
}
