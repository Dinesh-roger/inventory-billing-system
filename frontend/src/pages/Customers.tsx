import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api, { errMsg } from '../api'
import { useAuth } from '../auth'
import SimpleCrud from '../components/SimpleCrud'
import { Badge, Btn, Field, Modal, inputCls, inr } from '../components/ui'
import type { Customer, PaymentMode } from '../types'

function PayDue({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<PaymentMode>('CASH')
  const [error, setError] = useState('')
  const pay = useMutation({
    mutationFn: async () => api.post(`/customers/${customer!.id}/pay`, { amount: Number(amount), mode }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['/customers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setAmount(''); onClose() },
    onError: (e) => setError(errMsg(e)),
  })
  return (
    <Modal open={!!customer} title={`Receive payment from ${customer?.name ?? ''}`} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600">Pending due: <b>{inr(customer?.dueAmount)}</b></p>
      <div className="space-y-4">
        <Field label="Amount received"><input type="number" min="0" step="0.01" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Payment mode">
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}>
            <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option>
          </select>
        </Field>
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={!(Number(amount) > 0) || pay.isPending} onClick={() => pay.mutate()}>Save payment</Btn>
        </div>
      </div>
    </Modal>
  )
}

export default function Customers() {
  const { user } = useAuth()
  const [payFor, setPayFor] = useState<Customer | null>(null)
  return (
    <>
      <SimpleCrud<Customer>
        title="Customers" subtitle="Regular customers and their pending credit." noun="customer" endpoint="/customers"
        fields={[{ key: 'name', label: 'Name', required: true }, { key: 'phone', label: 'Phone' }, { key: 'address', label: 'Address' }]}
        canWrite canDelete={user?.role === 'ADMIN'} searchable
        extraColumns={[{ header: 'Pending due', render: (c) => (c.dueAmount > 0 ? <Badge tone="amber">{inr(c.dueAmount)}</Badge> : <span className="text-slate-400">None</span>) }]}
        rowActions={(c) => c.dueAmount > 0 && <Btn variant="subtle" onClick={() => setPayFor(c)}>Receive payment</Btn>}
      />
      <PayDue customer={payFor} onClose={() => setPayFor(null)} />
    </>
  )
}
