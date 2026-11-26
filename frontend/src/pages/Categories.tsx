import SimpleCrud from '../components/SimpleCrud'
import type { Category } from '../types'

export default function Categories() {
  return (
    <SimpleCrud<Category>
      title="Categories" subtitle="Group products so they are easy to find." noun="category" endpoint="/categories"
      fields={[{ key: 'name', label: 'Name', required: true }]} canWrite canDelete
    />
  )
}
