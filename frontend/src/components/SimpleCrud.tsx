import { useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { errMsg } from '../api'
import { Btn, Empty, Field, Modal, PageHeader, Panel, inputCls, td, th } from './ui'

export interface FieldDef { key: string; label: string; required?: boolean; type?: string }
interface Props<T> {
  title: string
  subtitle?: string
  noun: string
  endpoint: string
  fields: FieldDef[]
  canWrite: boolean
  canDelete: boolean
  searchable?: boolean
  extraColumns?: { header: string; render: (row: T) => ReactNode }[]
  rowActions?: (row: T) => ReactNode
}

/** Small reusable list + add/edit/delete screen used for categories, suppliers and customers. */
export default function SimpleCrud<T extends { id: number }>(p: Props<T>) {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<T | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const list = useQuery({
    queryKey: [p.endpoint, q],
    queryFn: async () => (await api.get<T[]>(p.endpoint, { params: p.searchable ? { q } : undefined })).data,
  })

  const save = useMutation({
    mutationFn: async () => (editing ? api.put(`${p.endpoint}/${editing.id}`, form) : api.post(p.endpoint, form)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [p.endpoint] }); setOpen(false) },
    onError: (e) => setError(errMsg(e)),
  })
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`${p.endpoint}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [p.endpoint] }),
    onError: (e) => alert(errMsg(e)),
  })

  const openForm = (row: T | null) => {
    setEditing(row)
    setError('')
    const init: Record<string, string> = {}
    p.fields.forEach((f) => { init[f.key] = String((row as Record<string, unknown> | null)?.[f.key] ?? '') })
    setForm(init)
    setOpen(true)
  }

  const missing = p.fields.some((f) => f.required && !form[f.key]?.trim())

  return (
    <>
      <PageHeader title={p.title} subtitle={p.subtitle}>
        {p.searchable && <input className={`${inputCls} w-56`} placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />}
        {p.canWrite && <Btn onClick={() => openForm(null)}>Add {p.noun}</Btn>}
      </PageHeader>

      <Panel className="overflow-x-auto">
        {list.data && list.data.length === 0 ? <Empty>No {p.noun}s yet.</Empty> : (
          <table className="w-full">
            <thead>
              <tr>
                {p.fields.map((f) => <th key={f.key} className={th}>{f.label}</th>)}
                {p.extraColumns?.map((c) => <th key={c.header} className={th}>{c.header}</th>)}
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {list.data?.map((row) => (
                <tr key={row.id}>
                  {p.fields.map((f) => <td key={f.key} className={td}>{String((row as Record<string, unknown>)[f.key] ?? '')}</td>)}
                  {p.extraColumns?.map((c) => <td key={c.header} className={td}>{c.render(row)}</td>)}
                  <td className={`${td} whitespace-nowrap text-right`}>
                    {p.rowActions?.(row)}
                    {p.canWrite && <Btn variant="subtle" onClick={() => openForm(row)}>Edit</Btn>}
                    {p.canDelete && (
                      <Btn variant="subtle" className="!text-red-600" onClick={() => { if (confirm(`Delete this ${p.noun}?`)) remove.mutate(row.id) }}>Delete</Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Modal open={open} title={`${editing ? 'Edit' : 'Add'} ${p.noun}`} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
          {p.fields.map((f) => (
            <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
              <input className={inputCls} type={f.type ?? 'text'} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </Field>
          ))}
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" disabled={missing || save.isPending}>Save {p.noun}</Btn>
          </div>
        </form>
      </Modal>
    </>
  )
}
