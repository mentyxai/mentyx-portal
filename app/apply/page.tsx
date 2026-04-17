'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, type LoanType } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { 
  ArrowLeft,
  Building2,
  Hammer,
  ArrowLeftRight,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'

const loanTypes = [
  {
    type: 'dscr' as LoanType,
    title: 'DSCR Rental Loan',
    description: 'Long-term financing for rental properties based on property cash flow',
    icon: Building2,
    color: 'primary',
    features: [
      'No income verification required',
      '30-year fixed rate terms',
      'Cash-out refinance available',
      'Portfolio loan support'
    ]
  },
  {
    type: 'fix_flip' as LoanType,
    title: 'Fix & Flip Loan',
    description: 'Short-term financing for property renovation and resale',
    icon: Hammer,
    color: 'amber',
    features: [
      'Close in as fast as 7 days',
      'Rehab funds included in loan',
      '12-month terms',
      'Up to 90% LTC'
    ]
  },
  {
    type: 'bridge' as LoanType,
    title: 'Bridge Loan',
    description: 'Short-term financing to bridge the gap between transactions',
    icon: ArrowLeftRight,
    color: 'purple',
    features: [
      'Quick closing available',
      'Flexible exit strategies',
      '6-24 month terms',
      'Interest-only payments'
    ]
  }
]

export default function ApplyPage() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<LoanType | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleStartApplication = async () => {
    if (!selectedType) return
    
    setIsCreating(true)
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/')
      return
    }

    // Create new loan application
    const { data: loan, error } = await supabase
      .from('loans')
      .insert({
        borrower_id: user.id,
        loan_type: selectedType,
        status: 'draft',
        current_step: 1,
        form_data: {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating loan:', error)
      setIsCreating(false)
      return
    }

    // Redirect to application form
    router.push(`/apply/${loan.id}`)
  }

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { border: string; bg: string; icon: string }> = {
      primary: {
        border: isSelected ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-slate-200 hover:border-primary-300',
        bg: 'bg-primary-50',
        icon: 'text-primary-600'
      },
      amber: {
        border: isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300',
        bg: 'bg-amber-50',
        icon: 'text-amber-600'
      },
      purple: {
        border: isSelected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200 hover:border-purple-300',
        bg: 'bg-purple-50',
        icon: 'text-purple-600'
      }
    }
    return colors[color]
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-navy-700 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            New Loan Application
          </h1>
          <p className="text-slate-500">
            Select the type of loan you're applying for
          </p>
        </div>

        {/* Loan Type Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {loanTypes.map((loan) => {
            const isSelected = selectedType === loan.type
            const colors = getColorClasses(loan.color, isSelected)
            
            return (
              <button
                key={loan.type}
                onClick={() => setSelectedType(loan.type)}
                className={cn(
                  'card p-6 text-left transition-all duration-200',
                  colors.border,
                  isSelected && 'transform scale-[1.02]'
                )}
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', colors.bg)}>
                  <loan.icon className={cn('w-6 h-6', colors.icon)} />
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {loan.title}
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  {loan.description}
                </p>
                
                <div className="space-y-2">
                  {loan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>

                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <span className="text-sm font-medium text-primary-600">
                      Selected ✓
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={handleStartApplication}
            disabled={!selectedType || isCreating}
            className={cn(
              'btn btn-lg inline-flex items-center gap-2',
              selectedType 
                ? 'btn-primary' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            {isCreating ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Creating...
              </>
            ) : (
              <>
                Continue to Application
                <ArrowRight size={18} />
              </>
            )}
          </button>
          
          <p className="text-sm text-slate-500 mt-4">
            Average application time: <strong>10 minutes</strong>
          </p>
        </div>
      </main>
    </div>
  )
}
