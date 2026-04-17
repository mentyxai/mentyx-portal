'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, type Loan, type Borrower, statusLabels, statusColors, loanTypeLabels, loanTypeColors } from '@/lib/supabase'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { 
  Plus, 
  TrendingUp, 
  FileText, 
  Building2, 
  Calculator,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export default function DashboardPage() {
  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch borrower
      const { data: borrowerData } = await supabase
        .from('borrowers')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setBorrower(borrowerData)

      // Fetch loans
      const { data: loansData } = await supabase
        .from('loans')
        .select('*')
        .eq('borrower_id', user.id)
        .order('created_at', { ascending: false })
      
      setLoans(loansData || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Calculate stats
  const totalFunded = loans
    .filter(l => l.status === 'funded')
    .reduce((sum, l) => sum + (l.loan_amount || 0), 0)
  
  const activeLoans = loans.filter(l => !['funded', 'denied', 'withdrawn'].includes(l.status))
  const fundedLoans = loans.filter(l => l.status === 'funded')
  
  const avgDSCR = loans
    .filter(l => l.dscr_ratio)
    .reduce((sum, l, _, arr) => sum + (l.dscr_ratio! / arr.length), 0)

  const stats = [
    { 
      label: 'Total Funded', 
      value: formatCurrency(totalFunded), 
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      label: 'Active Loans', 
      value: activeLoans.length.toString(), 
      icon: FileText,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50'
    },
    { 
      label: 'Properties', 
      value: (borrower?.properties_owned || loans.length).toString(), 
      icon: Building2,
      color: 'text-navy-600',
      bgColor: 'bg-navy-50'
    },
    { 
      label: 'Avg DSCR', 
      value: avgDSCR > 0 ? avgDSCR.toFixed(2) : '—', 
      icon: Calculator,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {borrower?.first_name || 'Investor'}!
        </h1>
        <p className="text-slate-500 mt-1">
          Here's an overview of your investment portfolio
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{stat.label}</span>
              <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
            </div>
            <div className={cn('text-2xl font-bold', stat.color)}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Loans */}
        <div className="lg:col-span-2 card">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Loans</h2>
            <Link 
              href="/dashboard/loans"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className="divide-y divide-slate-100">
            {loans.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No loans yet</p>
                <Link href="/apply" className="btn-primary btn-sm mt-4">
                  Start Application
                </Link>
              </div>
            ) : (
              loans.slice(0, 5).map((loan) => (
                <Link
                  key={loan.id}
                  href={`/dashboard/loans/${loan.id}`}
                  className="loan-card flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {loan.property_address || 'New Application'}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn('badge', loanTypeColors[loan.loan_type])}>
                        {loanTypeLabels[loan.loan_type]}
                      </span>
                      {loan.dscr_ratio && (
                        <span className="text-sm text-slate-500">
                          DSCR: {loan.dscr_ratio.toFixed(2)}
                        </span>
                      )}
                      {loan.ltarv && (
                        <span className="text-sm text-slate-500">
                          LTARV: {loan.ltarv}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-semibold text-slate-900">
                      {formatCurrency(loan.loan_amount)}
                    </div>
                    <span className={cn('badge', statusColors[loan.status])}>
                      {statusLabels[loan.status]}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* New Loan CTA */}
          <div className="bg-gradient-to-br from-navy-700 to-navy-600 rounded-xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <h3 className="text-lg font-semibold mb-2 relative">
              Ready for your next deal?
            </h3>
            <p className="text-white/70 text-sm mb-4 relative">
              Apply in minutes. Your profile is already saved.
            </p>
            <Link 
              href="/apply"
              className="btn bg-primary-500 hover:bg-primary-600 text-white btn-md inline-flex items-center gap-2 relative"
            >
              <Plus size={18} />
              New Loan Application
            </Link>
          </div>

          {/* Profile Card */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Your Profile</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Company</span>
                <span className="font-medium text-slate-900">
                  {borrower?.company_name || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Credit Score</span>
                <span className="font-medium text-slate-900">
                  {borrower?.credit_score || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Experience</span>
                <span className="font-medium text-slate-900">
                  {borrower?.experience_years ? `${borrower.experience_years}+ years` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Member Since</span>
                <span className="font-medium text-slate-900">
                  {formatDate(borrower?.created_at)}
                </span>
              </div>
            </div>
            <Link 
              href="/dashboard/settings"
              className="btn-secondary btn-sm w-full mt-4"
            >
              Edit Profile
            </Link>
          </div>

          {/* Status Legend */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Loan Status Guide</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-slate-600">Submitted — Under initial review</span>
              </div>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-slate-600">In Review — Underwriting in progress</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-slate-600">Approved — Ready for closing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
