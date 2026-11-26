import SimpleCrud from '../components/SimpleCrud'
import type { Supplier } from '../types'

export default function Suppliers() {
  return (
    <SimpleCrud<Supplier>
      title="Suppliers" subtitle="Who you buy stock from." noun="supplier" endpoint="/suppliers"
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'address', label: 'Address' },
      ]}
      canWrite canDelete
    />
  )
}
