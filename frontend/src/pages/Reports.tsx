import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api, { downloadFile, errMsg } from '../api'
import type { SalesReport, StockValuation } from '../types'
import { Btn, Empty, PageHeader, Panel, inputCls, inr, td, th } from '../components/ui'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d) }

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Panel className="p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </Panel>
  )
}

export default function Reports() {
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(iso(new Date()))
  const [exportError, setExportError] = useState('')

  const sales = useQuery({ queryKey: ['sales-report', from, to], queryFn: async () => (await api.get<SalesReport>('/reports/sales', { params: { from, to } })).data })
  const valuation = useQuery({ queryKey: ['valuation'], queryFn: async () => (await api.get<StockValuation>('/reports/stock-valuation')).data })
  const r = sales.data

  const exportFile = async (fn: () => Promise<void>) => { setExportError(''); try { await fn() } catch (e) { setExportError(errMsg(e)) } }

  return (
    <>
      <PageHeader title="Reports" subtitle="Sales, profit and stock value. Export to Excel for your accountant.">
        <input type="date" className={`${inputCls} w-40`} value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <input type="date" className={`${inputCls} w-40`} value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        <Btn variant="ghost" onClick={() => exportFile(() => downloadFile('/reports/sales/export', `sales-${from}-to-${to}.xlsx`, { from, to }))}>Export sales</Btn>
        <Btn variant="ghost" onClick={() => exportFile(() => downloadFile('/reports/stock/export', 'stock-report.xlsx'))}>Export stock</Btn>
      </PageHeader>

      {(sales.isError || exportError) && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{exportError || errMsg(sales.error)}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total sales (with GST)" value={inr(r?.totalSales)} hint={`${r?.invoiceCount ?? 0} bills`} />
        <Stat label="Profit (excluding GST)" value={inr(r?.profit)} hint={`Cost of goods ${inr(r?.cost)}`} />
        <Stat label="GST collected" value={inr(r?.gstAmount)} hint={`Discounts given ${inr(r?.discount)}`} />
        <Stat label="Stock value (at cost)" value={inr(valuation.data?.costValue)} hint={`${valuation.data?.totalUnits ?? 0} units · retail ${inr(valuation.data?.retailValue)}`} />
      </div>

      <Panel className="mt-5 p-4">
        <h2 className="mb-3 font-bold">Daily sales</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r?.daily.map((d) => ({ ...d, day: d.date.slice(5) })) ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => inr(v)} />
              <Bar dataKey="total" name="Sales" fill="#0f766e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel className="mt-5 overflow-x-auto">
        <h2 className="border-b border-slate-200 px-4 py-3 font-bold">Top selling products</h2>
        {r && r.topProducts.length === 0 ? <Empty>No sales in this period.</Empty> : (
          <table className="w-full">
            <thead><tr><th className={th}>Product</th><th className={th}>Units sold</th><th className={th}>Revenue (excl. GST)</th></tr></thead>
            <tbody>{r?.topProducts.map((p) => <tr key={p.productId}><td className={td}>{p.name}</td><td className={td}>{p.quantity}</td><td className={td}>{inr(p.revenue)}</td></tr>)}</tbody>
          </table>
        )}
      </Panel>
    </>
  )
}
