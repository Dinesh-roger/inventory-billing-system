import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { errMsg } from '../api'
import { useAuth } from '../auth'
import type { Role, UserRow } from '../types'
import { Badge, Btn, Field, Modal, PageHeader, Panel, inputCls, td, th } from '../components/ui'

const emptyForm = { username: '', password: '', fullName: '', email: '', role: 'STAFF' as Role, active: true }

export default function Users() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const list = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<UserRow[]>('/users')).data })
  const save = useMutation({
    mutationFn: async () => (editing ? api.put(`/users/${editing.id}`, form) : api.post('/users', form)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false) },
    onError: (e) => setError(errMsg(e)),
  })
  const deactivate = useMutation({
    mutationFn: async (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e) => alert(errMsg(e)),
  })

  const openForm = (u: UserRow | null) => {
    setEditing(u)
    setError('')
    setForm(u ? { username: u.username, password: '', fullName: u.fullName, email: u.email ?? '', role: u.role, active: u.active } : emptyForm)
    setOpen(true)
  }
  const valid = form.username.trim() && form.fullName.trim() && (editing || form.password.length >= 6)

  return (
    <>
      <PageHeader title="Staff accounts" subtitle="Admins can change products and see reports. Staff can only bill and view.">
        <Btn onClick={() => openForm(null)}>Add user</Btn>
      </PageHeader>
      <Panel className="overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Name</th><th className={th}>Username</th><th className={th}>Role</th><th className={th}>Status</th><th className={th} /></tr></thead>
          <tbody>
            {list.data?.map((u) => (
              <tr key={u.id}>
                <td className={td}>{u.fullName}</td><td className={td}>{u.username}</td>
                <td className={td}><Badge tone={u.role === 'ADMIN' ? 'green' : 'slate'}>{u.role === 'ADMIN' ? 'Admin' : 'Staff'}</Badge></td>
                <td className={td}>{u.active ? 'Active' : <Badge tone="red">Disabled</Badge>}</td>
                <td className={`${td} text-right`}>
                  <Btn variant="subtle" onClick={() => openForm(u)}>Edit</Btn>
                  {u.active && u.username !== me?.username && (
                    <Btn variant="subtle" className="!text-red-600" onClick={() => { if (confirm(`Disable ${u.username}?`)) deactivate.mutate(u.id) }}>Disable</Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Modal open={open} title={editing ? 'Edit user' : 'Add user'} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
          <Field label="Full name *"><input className={inputCls} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <Field label="Username *"><input className={inputCls} disabled={!!editing} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label={editing ? 'New password (leave empty to keep)' : 'Password * (min 6 characters)'}>
            <input type="password" className={inputCls} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role">
            <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="STAFF">Staff (billing and view only)</option><option value="ADMIN">Admin (full access)</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Account is active</label>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" disabled={!valid || save.isPending}>Save user</Btn>
          </div>
        </form>
      </Modal>
    </>
  )
}
