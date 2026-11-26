import axios from 'axios'

// Empty in local dev (Vite proxies /api). Set VITE_API_URL on Netlify to the backend URL.
const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api` })

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Token expired or invalid: go back to login
    if (err.response?.status === 401 && !String(err.config?.url).includes('/auth/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export const errMsg = (e: unknown): string => {
  const anyErr = e as { response?: { data?: { message?: string } }; message?: string }
  return anyErr?.response?.data?.message ?? anyErr?.message ?? 'Something went wrong'
}

/** Opens the invoice PDF in a new tab (use the browser's print button there). */
export async function openInvoicePdf(id: number) {
  const r = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
  window.open(URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' })), '_blank')
}

export async function downloadFile(url: string, filename: string, params?: Record<string, string>) {
  const r = await api.get(url, { responseType: 'blob', params })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(r.data)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default api
