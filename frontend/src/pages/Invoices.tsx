import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api, { openInvoicePdf } from '../api'
import type { Invoice, Page } from '../types'
import { Badge, Btn, Empty, Modal, PageHeader, Pager, Panel, fmtDate, fmtQty, inputCls, inr, td, th } from '../components/ui'
import { whatsappLink } from './Billing'

// local date as YYYY-MM-DD (not UTC)
const ymd = (d: Date) => d.toLocaleDateString('en-CA')
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d) }
const monthStart = () => { const d = new Date(); d.setDate(1); return ymd(d) }

type Preset = 'all' | 'today' | '7d' | 'month'

export default function Invoices() {
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [preset, setPreset] = useState<Preset>('all')
  const [page, setPage] = useState(0)
  const [view, setView] = useState<Invoice | null>(null)
  useEffect(() => setPage(0), [q, from, to])

  const applyPreset = (p: Preset) => {
    setPreset(p)
    const today = ymd(new Date())
    if (p === 'all') { setFrom(''); setTo('') }
    if (p === 'today') { setFrom(today); setTo(today) }
    if (p === '7d') { setFrom(daysAgo(6)); setTo(today) }
    if (p === 'month') { setFrom(monthStart()); setTo(today) }
  }

  const list = useQuery({
    queryKey: ['invoices', q, from, to, page],
    queryFn: async () => (await api.get<Page<Invoice>>('/invoices', { params: { q, from: from || undefined, to: to || undefined, page, size: 10 } })).data,
  })

  const pageTotal = list.data?.content.reduce((s, i) => s + i.totalAmount, 0) ?? 0
  const chip = (p: Preset, label: string) => (
    <Btn key={p} variant={preset === p ? 'primary' : 'ghost'} onClick={() => applyPreset(p)}>{label}</Btn>
  )

  return (
    <>
      <PageHeader title="Bill history" subtitle="Every bill ever made, newest first. Open the PDF to print or share it.">
        <input className={`${inputCls} w-64`} placeholder="Search invoice no. or customer" value={q} onChange={(e) => setQ(e.target.value)} />
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {chip('all', 'All bills')}{chip('today', 'Today')}{chip('7d', 'Last 7 days')}{chip('month', 'This month')}
        <span className="mx-1 text-sm text-slate-500">or</span>
        <input type="date" className={`${inputCls} w-40`} value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPreset('all') }} aria-label="From date" />
        <input type="date" className={`${inputCls} w-40`} value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPreset('all') }} aria-label="To date" />
      </div>

      <Panel className="overflow-x-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 text-sm text-slate-600">
          <span>{list.data?.totalElements ?? 0} bills found</span>
          <span>This page total: <b className="text-ink">{inr(pageTotal)}</b></span>
        </div>
        {list.isError && <p role="alert" className="m-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Could not load bills. Check that the backend is running.</p>}
        {list.data && list.data.content.length === 0 ? <Empty>No bills found for this search or date range.</Empty> : (
          <table className="w-full">
            <thead><tr><th className={th}>Invoice</th><th className={th}>Date</th><th className={th}>Customer</th><th className={th}>Payment</th><th className={th}>Total</th><th className={th}>Due</th><th className={th} /></tr></thead>
            <tbody>
              {list.data?.content.map((i) => (
                <tr key={i.id}>
                  <td className={`${td} font-semibold`}>{i.invoiceNumber}</td>
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(i.createdAt)}</td>
                  <td className={td}>{i.customerName}</td>
                  <td className={td}>{i.paymentMode}</td>
                  <td className={td}>{inr(i.totalAmount)}</td>
                  <td className={td}>{i.dueAmount > 0 ? <Badge tone="amber">{inr(i.dueAmount)}</Badge> : '-'}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <Btn variant="subtle" onClick={() => setView(i)}>Items</Btn>
                    <Btn variant="subtle" onClick={() => openInvoicePdf(i.id)}>PDF</Btn>
                    <a className="inline-block rounded-md px-3.5 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" href={whatsappLink(i)} target="_blank" rel="noreferrer">WhatsApp</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pager page={page} totalPages={list.data?.totalPages ?? 0} onChange={setPage} />
      </Panel>

      <Modal open={!!view} title={view?.invoiceNumber ?? ''} onClose={() => setView(null)}>
        {view && (
          <div className="space-y-3 text-sm">
            <div className="text-slate-600">{fmtDate(view.createdAt)} · {view.customerName} · {view.paymentMode}</div>
            <table className="w-full">
              <thead><tr><th className={th}>Item</th><th className={th}>Qty</th><th className={th}>Rate</th><th className={th}>Amount</th></tr></thead>
              <tbody>{view.items.map((it, idx) => (
                <tr key={idx}><td className={td}>{it.productName}</td><td className={td}>{fmtQty(it.quantity)} {it.unit}</td><td className={td}>{inr(it.unitPrice)}</td><td className={td}>{inr(it.lineTotal)}</td></tr>
              ))}</tbody>
            </table>
            <div className="space-y-1 text-right">
              <div>Sub total: {inr(view.subTotal)}</div>
              <div>Discount: {inr(view.discount)}</div><div>GST: {inr(view.gstAmount)}</div>
              <div className="text-base font-extrabold">Total: {inr(view.totalAmount)}</div>
              {view.dueAmount > 0 && <div className="text-amber-700">Balance due: {inr(view.dueAmount)}</div>}
              <div className="text-slate-500">Billed by {view.createdBy}</div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
