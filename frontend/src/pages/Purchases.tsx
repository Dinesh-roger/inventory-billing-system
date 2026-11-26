import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { errMsg } from '../api'
import type { Page, Product, Purchase, Supplier } from '../types'
import { Btn, Empty, Field, Modal, PageHeader, Pager, Panel, inputCls, inr, td, th } from '../components/ui'

interface Line { productId: string; quantity: string; unitCost: string }
const blank = (): Line => ({ productId: '', quantity: '1', unitCost: '' })

export default function Purchases() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [ref, setRef] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<Line[]>([blank()])
  const [error, setError] = useState('')

  const suppliers = useQuery({ queryKey: ['/suppliers'], queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data })
  const products = useQuery({ queryKey: ['all-products'], queryFn: async () => (await api.get<Page<Product>>('/products', { params: { size: 500 } })).data.content })
  const list = useQuery({ queryKey: ['purchases', page], queryFn: async () => (await api.get<Page<Purchase>>('/purchases', { params: { page, size: 10 } })).data })

  const save = useMutation({
    mutationFn: async () => api.post('/purchases', {
      supplierId: Number(supplierId), purchaseDate: date, referenceNo: ref || null,
      items: lines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity), unitCost: Number(l.unitCost) })),
    }),
    onSuccess: () => {
      ['purchases', 'products', 'all-products', 'low-stock', 'dashboard', 'movements'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      setOpen(false)
    },
    onError: (e) => setError(errMsg(e)),
  })

  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const valid = supplierId && lines.every((l) => l.productId && Number(l.quantity) > 0 && l.unitCost !== '' && Number(l.unitCost) >= 0)
  const total = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unitCost || 0), 0)

  const openForm = () => { setSupplierId(''); setRef(''); setLines([blank()]); setError(''); setOpen(true) }

  return (
    <>
      <PageHeader title="Stock in (purchases)" subtitle="Record goods bought from a supplier. Stock and cost price update automatically.">
        <Btn onClick={openForm}>Record purchase</Btn>
      </PageHeader>

      <Panel className="overflow-x-auto">
        {list.data && list.data.content.length === 0 ? <Empty>No purchases recorded yet.</Empty> : (
          <table className="w-full">
            <thead><tr><th className={th}>Date</th><th className={th}>Supplier</th><th className={th}>Reference</th><th className={th}>Items</th><th className={th}>Total</th></tr></thead>
            <tbody>
              {list.data?.content.map((p) => (
                <tr key={p.id}>
                  <td className={td}>{p.purchaseDate}</td><td className={td}>{p.supplierName}</td><td className={td}>{p.referenceNo ?? '-'}</td>
                  <td className={td}>{p.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}</td>
                  <td className={td}>{inr(p.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pager page={page} totalPages={list.data?.totalPages ?? 0} onChange={setPage} />
      </Panel>

      <Modal open={open} title="Record purchase" onClose={() => setOpen(false)} wide>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Supplier *">
              <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select supplier</option>
                {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Bill / reference no."><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
            <Field label="Date"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>

          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-12 sm:col-span-6">
                  <Field label={i === 0 ? 'Product' : ''}>
                    <select className={inputCls} value={l.productId} onChange={(e) => {
                      const p = products.data?.find((x) => x.id === Number(e.target.value))
                      setLine(i, { productId: e.target.value, unitCost: l.unitCost || (p ? String(p.costPrice) : '') })
                    }}>
                      <option value="">Select product</option>
                      {products.data?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </Field>
                </div>
                <div className="col-span-5 sm:col-span-2"><Field label={i === 0 ? 'Quantity' : ''}><input type="number" min="0.001" step="0.001" className={inputCls} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} /></Field></div>
                <div className="col-span-5 sm:col-span-3"><Field label={i === 0 ? 'Cost each (Rs)' : ''}><input type="number" min="0" step="0.01" className={inputCls} value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} /></Field></div>
                <div className="col-span-2 sm:col-span-1"><Btn variant="subtle" className="!text-red-600" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, idx) => idx !== i))} aria-label="Remove line">×</Btn></div>
              </div>
            ))}
            <Btn variant="ghost" onClick={() => setLines([...lines, blank()])}>Add another product</Btn>
          </div>

          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <div className="font-bold">Total: {inr(total)}</div>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
              <Btn disabled={!valid || save.isPending} onClick={() => save.mutate()}>Save purchase</Btn>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
