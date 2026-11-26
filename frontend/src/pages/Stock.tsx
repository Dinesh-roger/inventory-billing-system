import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { errMsg } from '../api'
import type { Page, Product, StockMovement } from '../types'
import { Badge, Btn, Empty, Field, Modal, PageHeader, Pager, Panel, fmtDate, inputCls, td, th } from '../components/ui'

export default function Stock() {
  const qc = useQueryClient()
  const [productId, setProductId] = useState('')
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const [adjProduct, setAdjProduct] = useState('')
  const [change, setChange] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const products = useQuery({ queryKey: ['all-products'], queryFn: async () => (await api.get<Page<Product>>('/products', { params: { size: 500 } })).data.content })
  const list = useQuery({
    queryKey: ['movements', productId, page],
    queryFn: async () => (await api.get<Page<StockMovement>>('/stock/movements', { params: { productId: productId || undefined, page, size: 15 } })).data,
  })

  const adjust = useMutation({
    mutationFn: async () => api.post('/stock/adjust', { productId: Number(adjProduct), quantityChange: Number(change), reason }),
    onSuccess: () => {
      ['movements', 'products', 'all-products', 'low-stock', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      setOpen(false)
    },
    onError: (e) => setError(errMsg(e)),
  })

  const tone = (t: StockMovement['type']) => (t === 'IN' ? 'green' : t === 'OUT' ? 'slate' : 'amber')
  const selected = products.data?.find((p) => p.id === Number(adjProduct))

  return (
    <>
      <PageHeader title="Stock history" subtitle="Every stock in, sale and manual correction is logged here.">
        <select className={`${inputCls} w-56`} value={productId} onChange={(e) => { setProductId(e.target.value); setPage(0) }} aria-label="Filter by product">
          <option value="">All products</option>
          {products.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Btn onClick={() => { setAdjProduct(''); setChange(''); setReason(''); setError(''); setOpen(true) }}>Adjust stock</Btn>
      </PageHeader>

      <Panel className="overflow-x-auto">
        {list.data && list.data.content.length === 0 ? <Empty>No stock movements yet.</Empty> : (
          <table className="w-full">
            <thead><tr><th className={th}>When</th><th className={th}>Product</th><th className={th}>Type</th><th className={th}>Change</th><th className={th}>Balance</th><th className={th}>Reason</th><th className={th}>By</th></tr></thead>
            <tbody>
              {list.data?.content.map((m) => (
                <tr key={m.id}>
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(m.createdAt)}</td>
                  <td className={td}>{m.productName}</td>
                  <td className={td}><Badge tone={tone(m.type)}>{m.type === 'IN' ? 'Stock in' : m.type === 'OUT' ? 'Sale' : 'Adjustment'}</Badge></td>
                  <td className={`${td} font-semibold ${m.quantity < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                  <td className={td}>{m.balanceAfter}</td>
                  <td className={td}>{m.reason}{m.reference ? ` (${m.reference})` : ''}</td>
                  <td className={td}>{m.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pager page={page} totalPages={list.data?.totalPages ?? 0} onChange={setPage} />
      </Panel>

      <Modal open={open} title="Adjust stock" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Use this for damaged, expired or miscounted items. Use a negative number to reduce stock.</p>
          <Field label="Product">
            <select className={inputCls} value={adjProduct} onChange={(e) => setAdjProduct(e.target.value)}>
              <option value="">Select product</option>
              {products.data?.map((p) => <option key={p.id} value={p.id}>{p.name} (stock {p.stockQty} {p.unit})</option>)}
            </select>
          </Field>
          <Field label="Quantity change (e.g. -2 or 5)"><input type="number" step="0.001" className={inputCls} value={change} onChange={(e) => setChange(e.target.value)} /></Field>
          {selected && Number(change) !== 0 && change !== '' && <p className="text-sm">New stock will be <b>{Math.round((selected.stockQty + Number(change)) * 1000) / 1000} {selected.unit}</b></p>}
          <Field label="Reason"><input className={inputCls} placeholder="Damaged, expired, recount…" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn disabled={!adjProduct || !Number(change) || !reason.trim() || adjust.isPending} onClick={() => adjust.mutate()}>Save adjustment</Btn>
          </div>
        </div>
      </Modal>
    </>
  )
}
