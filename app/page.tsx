'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    email: process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? 'demo@focusdscr.com' : '',
    password: process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? 'demo123456' : '',
    firstName: '',
    lastName: '',
    phone: '',
    companyName: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      if (isSignUp) {
        // Sign up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
            }
          }
        })

        if (authError) throw authError

        if (authData.user) {
          // Create borrower profile
          const { error: profileError } = await supabase
            .from('borrowers')
            .insert({
              id: authData.user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              phone: formData.phone,
              company_name: formData.companyName
            })

          if (profileError) throw profileError
        }

        router.push('/dashboard')
      } else {
        // Sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (signInError) throw signInError

        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-700 via-navy-600 to-navy-700 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">F</span>
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white">Focus DSCR</div>
              <div className="text-xs text-primary-400 tracking-wider uppercase">Investor Portal</div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {isSignUp 
              ? 'Start applying for loans in minutes'
              : 'Sign in to access your dashboard'
            }
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="input"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="input"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="input"
                    placeholder="ABC Investments LLC"
                  />
                </div>

                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </>
            )}

            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="ml-1 text-primary-600 hover:text-primary-700 font-medium"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>

          {!isSignUp && (
            <div className="mt-4 text-center">
              <a href="#" className="text-sm text-slate-500 hover:text-primary-600">
                Forgot your password?
              </a>
            </div>
          )}
        </div>

        {/* Demo mode badge */}
        {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-xs font-medium">
              Demo Mode — Use any credentials
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
