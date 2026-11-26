import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { errMsg, openInvoicePdf } from '../api'
import { SHOP_NAME } from '../auth'
import type { Customer, Invoice, Page, PaymentMode, Product } from '../types'
import { Btn, Empty, Field, Modal, PageHeader, Panel, fmtQty, inputCls, inr, isCountUnit, td, th } from '../components/ui'

interface CartLine { product: Product; qty: string }

export function whatsappLink(inv: Invoice) {
  const digits = (inv.customerPhone ?? '').replace(/\D/g, '')
  const phone = digits.length === 10 ? `91${digits}` : digits
  const text = `Thank you for shopping at ${SHOP_NAME}!\nInvoice ${inv.invoiceNumber}\nTotal: ${inr(inv.totalAmount)}` +
    (inv.dueAmount > 0 ? `\nBalance due: ${inr(inv.dueAmount)}` : '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

/** Quick quantity buttons for loose items (1/4, 1/2, 3/4, 1) */
const quickChips = (unit: string): [number, string][] => {
  const u = unit.toLowerCase()
  if (u === 'kg') return [[0.25, '250 g'], [0.5, '500 g'], [0.75, '750 g'], [1, '1 kg']]
  if (u === 'litre' || u === 'l') return [[0.25, '250 ml'], [0.5, '500 ml'], [0.75, '750 ml'], [1, '1 L']]
  return []
}

const lineError = (l: CartLine): string => {
  const q = Number(l.qty)
  if (!l.qty || !(q > 0)) return 'Enter a quantity'
  if (q > l.product.stockQty) return `Only ${fmtQty(l.product.stockQty)} ${l.product.unit} in stock`
  if (isCountUnit(l.product.unit) && !Number.isInteger(q)) return 'Whole numbers only for this item'
  return ''
}

export default function Billing() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerId, setCustomerId] = useState('')
  const [discount, setDiscount] = useState('')
  const [mode, setMode] = useState<PaymentMode>('CASH')
  const [paid, setPaid] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState<Invoice | null>(null)

  const results = useQuery({
    queryKey: ['pos-products', search],
    enabled: search.trim().length > 0,
    queryFn: async () => (await api.get<Page<Product>>('/products', { params: { q: search.trim(), size: 8 } })).data.content,
  })
  const customers = useQuery({ queryKey: ['/customers', ''], queryFn: async () => (await api.get<Customer[]>('/customers')).data })

  const add = (p: Product) => {
    setError('')
    if (p.stockQty <= 0) { setError(`${p.name} is out of stock`); return }
    setCart((c) => {
      const found = c.find((l) => l.product.id === p.id)
      if (!found) return [...c, { product: p, qty: String(Math.min(1, p.stockQty)) }]
      const next = Math.round((Number(found.qty) + 1) * 1000) / 1000
      if (next > p.stockQty) { setError(`Only ${fmtQty(p.stockQty)} ${p.unit} of ${p.name} in stock`); return c }
      return c.map((l) => (l.product.id === p.id ? { ...l, qty: String(next) } : l))
    })
    setSearch('')
  }

  // quantity is kept as text so typing "0." or "0.5" works smoothly
  const setQty = (id: number, qty: string) =>
    setCart((c) => c.map((l) => (l.product.id === id ? { ...l, qty } : l)))

  const totals = useMemo(() => {
    const sub = cart.reduce((s, l) => s + l.product.price * (Number(l.qty) || 0), 0)
    const gstRaw = cart.reduce((s, l) => s + (l.product.price * (Number(l.qty) || 0) * l.product.gstPercent) / 100, 0)
    const disc = Math.min(Math.max(Number(discount) || 0, 0), sub)
    const taxable = sub - disc
    const gst = sub > 0 ? (gstRaw * taxable) / sub : 0
    return { sub, disc, gst, total: taxable + gst }
  }, [cart, discount])

  const checkout = useMutation({
    mutationFn: async () => (await api.post<Invoice>('/invoices', {
      customerId: customerId ? Number(customerId) : null,
      items: cart.map((l) => ({ productId: l.product.id, quantity: Number(l.qty) })),
      discount: totals.disc, paymentMode: mode, paidAmount: mode === 'CREDIT' ? Number(paid) || 0 : null,
    })).data,
    onSuccess: (inv) => {
      setDone(inv)
      setCart([]); setDiscount(''); setPaid(''); setCustomerId(''); setMode('CASH'); setError('')
      ;['products', 'pos-products', 'low-stock', 'dashboard', 'invoices', '/customers', 'movements'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
    },
    onError: (e) => setError(errMsg(e)),
  })

  const creditNeedsCustomer = mode === 'CREDIT' && !customerId
  const hasLineError = cart.some((l) => lineError(l) !== '')

  return (
    <>
      <PageHeader title="New bill" subtitle="Search or scan an item, set quantity, then take payment." />
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Panel className="p-4">
            <Field label="Search by name, SKU or scan barcode">
              <input
                className={inputCls} autoFocus placeholder="Type, then press Enter to add the first match" value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && results.data?.[0]) { e.preventDefault(); add(results.data[0]) } }}
              />
            </Field>
            {search && results.data && (
              <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
                {results.data.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No item matches "{search}"</li>}
                {results.data.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => add(p)} disabled={p.stockQty <= 0} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50 disabled:opacity-50">
                      <span><b>{p.name}</b> <span className="text-slate-500">{p.sku}</span></span>
                      <span>{inr(p.price)} / {p.unit} · {p.stockQty > 0 ? `${fmtQty(p.stockQty)} ${p.unit} in stock` : 'Out of stock'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="overflow-x-auto">
            {cart.length === 0 ? <Empty>The bill is empty. Search for an item above.</Empty> : (
              <table className="w-full">
                <thead><tr><th className={th}>Item</th><th className={th}>Price</th><th className={th}>Quantity</th><th className={th}>Amount</th><th className={th} /></tr></thead>
                <tbody>
                  {cart.map((l) => {
                    const err = lineError(l)
                    const chips = quickChips(l.product.unit)
                    return (
                      <tr key={l.product.id}>
                        <td className={td}>{l.product.name}<div className="text-xs text-slate-500">GST {l.product.gstPercent}%</div></td>
                        <td className={td}>{inr(l.product.price)} <span className="text-xs text-slate-500">/ {l.product.unit}</span></td>
                        <td className={td}>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min="0" step={isCountUnit(l.product.unit) ? 1 : 0.001}
                              className={`${inputCls} !w-24 ${err ? '!border-red-400' : ''}`}
                              value={l.qty} onChange={(e) => setQty(l.product.id, e.target.value)}
                              aria-label={`Quantity of ${l.product.name}`}
                            />
                            <span className="text-sm text-slate-600">{l.product.unit}</span>
                          </div>
                          {chips.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {chips.map(([v, label]) => (
                                <button key={label} type="button" onClick={() => setQty(l.product.id, String(v))}
                                  className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold hover:bg-brand-50">{label}</button>
                              ))}
                            </div>
                          )}
                          {err && <div className="mt-1 text-xs text-red-600">{err}</div>}
                        </td>
                        <td className={td}>{inr(l.product.price * (Number(l.qty) || 0))}</td>
                        <td className={td}><Btn variant="subtle" className="!text-red-600" onClick={() => setCart(cart.filter((x) => x.product.id !== l.product.id))}>Remove</Btn></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        <Panel className="h-fit space-y-4 p-4 lg:col-span-2">
          <Field label="Customer (optional)">
            <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in customer</option>
              {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount (Rs)"><input type="number" min="0" className={inputCls} value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
            <Field label="Payment">
              <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}>
                <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="CREDIT">Credit (pay later)</option>
              </select>
            </Field>
          </div>
          {mode === 'CREDIT' && (
            <Field label="Paid now (Rs)">
              <input type="number" min="0" className={inputCls} value={paid} onChange={(e) => setPaid(e.target.value)} />
              {creditNeedsCustomer && <span className="mt-1 block text-xs text-amber-700">Select a customer to sell on credit.</span>}
            </Field>
          )}

          <dl className="space-y-1.5 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between"><dt>Sub total</dt><dd>{inr(totals.sub)}</dd></div>
            <div className="flex justify-between"><dt>Discount</dt><dd>- {inr(totals.disc)}</dd></div>
            <div className="flex justify-between"><dt>GST</dt><dd>{inr(totals.gst)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-extrabold"><dt>Total</dt><dd>{inr(totals.total)}</dd></div>
          </dl>

          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Btn className="w-full !py-3 text-base" disabled={cart.length === 0 || hasLineError || creditNeedsCustomer || checkout.isPending} onClick={() => checkout.mutate()}>
            {checkout.isPending ? 'Saving bill…' : `Save bill · ${inr(totals.total)}`}
          </Btn>
        </Panel>
      </div>

      <Modal open={!!done} title="Bill saved" onClose={() => setDone(null)}>
        {done && (
          <div className="space-y-4">
            <div className="rounded-md bg-brand-50 p-4">
              <div className="text-sm text-slate-600">{done.invoiceNumber}</div>
              <div className="text-2xl font-extrabold">{inr(done.totalAmount)}</div>
              {done.dueAmount > 0 && <div className="text-sm text-amber-700">Balance due: {inr(done.dueAmount)}</div>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => openInvoicePdf(done.id)}>Open PDF to print</Btn>
              <a className="inline-flex items-center rounded-md border border-slate-300 px-3.5 py-2 text-sm font-semibold hover:bg-slate-50" href={whatsappLink(done)} target="_blank" rel="noreferrer">Share on WhatsApp</a>
              <Btn variant="ghost" onClick={() => setDone(null)}>Start next bill</Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
