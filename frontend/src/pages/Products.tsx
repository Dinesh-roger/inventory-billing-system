import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { errMsg } from '../api'
import { useAuth } from '../auth'
import type { Category, Page, Product } from '../types'
import { Badge, Btn, Empty, Field, Modal, PageHeader, Pager, Panel, fmtQty, inputCls, inr, td, th } from '../components/ui'

const num = (msg: string) => z.number({ invalid_type_error: msg }).min(0, 'Cannot be negative')
const schema = z.object({
  name: z.string().min(1, 'Enter the product name'),
  sku: z.string().min(1, 'Enter a SKU / item code'),
  barcode: z.string().optional(),
  categoryId: z.number().nullable(),
  price: num('Enter the selling price'),
  costPrice: num('Enter the cost price'),
  gstPercent: num('Enter GST % (0 if none)').max(100, 'Max 100'),
  stockQty: num('Enter opening stock'),
  reorderLevel: num('Enter reorder level'),
  unit: z.string().min(1, 'Select a unit'),
})
type Form = z.infer<typeof schema>
const empty: Form = { name: '', sku: '', barcode: '', categoryId: null, price: 0, costPrice: 0, gstPercent: 0, stockQty: 0, reorderLevel: 5, unit: 'pcs' }

export default function Products() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('name')
  const [editing, setEditing] = useState<Product | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setPage(0), [q, categoryId, sort])

  const cats = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<Category[]>('/categories')).data })
  const list = useQuery({
    queryKey: ['products', q, categoryId, page, sort],
    queryFn: async () => (await api.get<Page<Product>>('/products', { params: { q, categoryId: categoryId || undefined, page, size: 10, sort, dir: sort === 'stockQty' ? 'asc' : 'asc' } })).data,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: empty })

  const save = useMutation({
    mutationFn: async (v: Form) => {
      const body = { ...v, barcode: v.barcode || null }
      return editing ? api.put(`/products/${editing.id}`, body) : api.post('/products', body)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['low-stock'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setOpen(false) },
    onError: (e) => setError(errMsg(e)),
  })
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['low-stock'] }) },
    onError: (e) => alert(errMsg(e)),
  })

  const openForm = (p: Product | null) => {
    setEditing(p)
    setError('')
    reset(p ? { name: p.name, sku: p.sku, barcode: p.barcode ?? '', categoryId: p.categoryId ?? null, price: p.price, costPrice: p.costPrice, gstPercent: p.gstPercent, stockQty: p.stockQty, reorderLevel: p.reorderLevel, unit: p.unit } : empty)
    setOpen(true)
  }

  const numReg = (name: 'price' | 'costPrice' | 'gstPercent' | 'stockQty' | 'reorderLevel') => register(name, { valueAsNumber: true })

  return (
    <>
      <PageHeader title="Products" subtitle={isAdmin ? 'Add, edit and remove products. Staff can only view this list.' : 'View prices and stock. Only the owner can change products.'}>
        <input className={`${inputCls} w-52`} placeholder="Search name, SKU, barcode" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} w-40`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={`${inputCls} w-36`} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          <option value="name">Sort: Name</option><option value="price">Sort: Price</option><option value="stockQty">Sort: Stock</option>
        </select>
        {isAdmin && <Btn onClick={() => openForm(null)}>Add product</Btn>}
      </PageHeader>

      <Panel className="overflow-x-auto">
        {list.data && list.data.content.length === 0 ? <Empty>No products found.</Empty> : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Product</th><th className={th}>SKU</th><th className={th}>Category</th>
                <th className={th}>Price</th><th className={th}>GST</th><th className={th}>Stock</th>
                {isAdmin && <th className={th} />}
              </tr>
            </thead>
            <tbody>
              {list.data?.content.map((p) => (
                <tr key={p.id}>
                  <td className={td}><div className="font-semibold">{p.name}</div>{p.barcode && <div className="text-xs text-slate-500">{p.barcode}</div>}</td>
                  <td className={td}>{p.sku}</td>
                  <td className={td}>{p.categoryName ?? '-'}</td>
                  <td className={td}>{inr(p.price)} <span className="text-xs text-slate-500">/ {p.unit}</span></td>
                  <td className={td}>{p.gstPercent}%</td>
                  <td className={td}>{p.lowStock ? <Badge tone={p.stockQty === 0 ? 'red' : 'amber'}>{fmtQty(p.stockQty)} {p.unit} left</Badge> : `${fmtQty(p.stockQty)} ${p.unit}`}</td>
                  {isAdmin && (
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <Btn variant="subtle" onClick={() => openForm(p)}>Edit</Btn>
                      <Btn variant="subtle" className="!text-red-600" onClick={() => { if (confirm(`Delete ${p.name}? Old invoices will keep it.`)) remove.mutate(p.id) }}>Delete</Btn>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pager page={page} totalPages={list.data?.totalPages ?? 0} onChange={setPage} />
      </Panel>

      <Modal open={open} title={editing ? 'Edit product' : 'Add product'} onClose={() => setOpen(false)} wide>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => save.mutate(v))}>
          <Field label="Product name *" error={errors.name?.message}><input className={inputCls} {...register('name')} /></Field>
          <Field label="SKU / item code *" error={errors.sku?.message}><input className={inputCls} {...register('sku')} /></Field>
          <Field label="Barcode" error={errors.barcode?.message}><input className={inputCls} {...register('barcode')} /></Field>
          <Field label="Category">
            <select className={inputCls} {...register('categoryId', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}>
              <option value="">No category</option>
              {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Selling price per unit (Rs) *" error={errors.price?.message}><input type="number" step="0.01" className={inputCls} {...numReg('price')} /></Field>
          <Field label="Cost price per unit (Rs)" error={errors.costPrice?.message}><input type="number" step="0.01" className={inputCls} {...numReg('costPrice')} /></Field>
          <Field label="Sold by (unit)" error={errors.unit?.message}>
            <select className={inputCls} {...register('unit')}>
              <option value="pcs">Pieces (pcs)</option>
              <option value="kg">Kilogram (kg)</option>
              <option value="litre">Litre</option>
              <option value="pack">Pack</option>
              <option value="dozen">Dozen</option>
            </select>
          </Field>
          <Field label="GST %" error={errors.gstPercent?.message}><input type="number" step="0.01" className={inputCls} {...numReg('gstPercent')} /></Field>
          <Field label="Reorder level" error={errors.reorderLevel?.message}><input type="number" step="0.001" className={inputCls} {...numReg('reorderLevel')} /></Field>
          <Field label={editing ? 'Current stock (change it from Stock history)' : 'Opening stock'} error={errors.stockQty?.message}>
            <input type="number" step="0.001" className={`${inputCls} ${editing ? 'bg-slate-100' : ''}`} readOnly={!!editing} {...numReg('stockQty')} />
          </Field>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" disabled={save.isPending}>Save product</Btn>
          </div>
        </form>
      </Modal>
    </>
  )
}
