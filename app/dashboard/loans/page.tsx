'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, type Loan, statusLabels, statusColors, loanTypeLabels, loanTypeColors } from '@/lib/supabase'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Plus, Search, Filter, ArrowUpDown } from 'lucide-react'

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchLoans = async () => {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: loansData } = await supabase
        .from('loans')
        .select('*')
        .eq('borrower_id', user.id)
        .order('created_at', { ascending: false })
      
      setLoans(loansData || [])
      setLoading(false)
    }

    fetchLoans()
  }, [])

  const filteredLoans = loans.filter(loan => {
    // Status filter
    if (filter === 'active' && ['funded', 'denied', 'withdrawn'].includes(loan.status)) return false
    if (filter === 'funded' && loan.status !== 'funded') return false
    if (filter === 'pending' && !['submitted', 'in_review'].includes(loan.status)) return false
    
    // Search
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        loan.property_address?.toLowerCase().includes(searchLower) ||
        loan.property_city?.toLowerCase().includes(searchLower) ||
        loanTypeLabels[loan.loan_type].toLowerCase().includes(searchLower)
      )
    }
    
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Loans</h1>
          <p className="text-slate-500 mt-1">View and manage all your loan applications</p>
        </div>
        <Link href="/apply" className="btn-primary btn-md inline-flex items-center gap-2 self-start">
          <Plus size={18} />
          New Application
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by address, city..."
            className="input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'funded', 'pending'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'btn btn-sm capitalize',
                filter === f ? 'btn-primary' : 'btn-secondary'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Table */}
      <div className="card overflow-hidden">
        {filteredLoans.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500">No loans found</p>
            {loans.length === 0 && (
              <Link href="/apply" className="btn-primary btn-md mt-4 inline-flex items-center gap-2">
                <Plus size={18} />
                Start Your First Application
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Property</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Amount</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((loan) => (
                  <tr 
                    key={loan.id} 
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => window.location.href = `/dashboard/loans/${loan.id}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {loan.property_address || 'New Application'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {loan.property_city}, {loan.property_state}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('badge', loanTypeColors[loan.loan_type])}>
                        {loanTypeLabels[loan.loan_type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatCurrency(loan.loan_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('badge', statusColors[loan.status])}>
                        {statusLabels[loan.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDate(loan.submitted_at || loan.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
