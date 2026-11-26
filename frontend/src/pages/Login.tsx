import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { SHOP_NAME, useAuth } from '../auth'
import { errMsg } from '../api'
import { Btn, Field, inputCls } from '../components/ui'

const schema = z.object({
  username: z.string().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
})
type Form = z.infer<typeof schema>

export default function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  if (user) return <Navigate to="/" replace />

  const onSubmit = async (v: Form) => {
    setError('')
    try {
      await login(v.username, v.password)
      nav('/')
    } catch (e) {
      setError(errMsg(e))
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-800 p-12 text-white md:flex">
        <div className="text-xl font-extrabold">{SHOP_NAME}</div>
        <div>
          <p className="max-w-sm text-3xl font-extrabold leading-tight">Bill faster. Know what is on the shelf.</p>
          <p className="mt-3 max-w-sm text-brand-100">Stock, GST invoices, credit dues and daily sales in one place.</p>
        </div>
        <div className="text-sm text-brand-100">Staff can bill. Only the owner can change products.</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-extrabold">Log in</h1>
          <Field label="Username" error={errors.username?.message}>
            <input className={inputCls} autoComplete="username" autoFocus {...register('username')} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <input type="password" className={inputCls} autoComplete="current-password" {...register('password')} />
          </Field>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Btn type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? 'Logging in…' : 'Log in'}</Btn>
        </form>
      </div>
    </div>
  )
}
