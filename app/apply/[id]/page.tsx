'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, type Loan, type Borrower, type DocumentRequirement, loanTypeLabels } from '@/lib/supabase'
import { cn, formatCurrency, debounce, parseCurrency, calculateDSCR, calculateLTV, calculateLTC, calculateLTARV, getDSCRStatus, getLTVStatus } from '@/lib/utils'
import { 
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  Upload,
  Camera,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  X
} from 'lucide-react'

const STEPS = {
  dscr: ['Property Info', 'DSCR Details', 'Documents', 'Review'],
  fix_flip: ['Property Info', 'Rehab Details', 'Documents', 'Review'],
  bridge: ['Property Info', 'Exit Strategy', 'Documents', 'Review']
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function LoanApplicationPage() {
  const router = useRouter()
  const params = useParams()
  const loanId = params.id as string

  const [loan, setLoan] = useState<Loan | null>(null)
  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [docRequirements, setDocRequirements] = useState<DocumentRequirement[]>([])
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string; status: string }>>({})
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    // Property
    property_address: '',
    property_city: '',
    property_state: 'OH',
    property_zip: '',
    property_type: 'SFR',
    property_units: 1,
    
    // Purchase
    purchase_price: '',
    down_payment: '',
    loan_amount: '',
    
    // DSCR
    monthly_rent: '',
    annual_taxes: '',
    annual_insurance: '',
    monthly_hoa: '',
    
    // Fix & Flip
    rehab_budget: '',
    arv: '',
    rehab_timeline_months: '6',
    exit_strategy: 'Sale',
    
    // Bridge
    payoff_source: '',
    takeout_lender: '',
    
    // Notes
    borrower_notes: ''
  })

  // Load loan data
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Fetch loan
      const { data: loanData } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single()

      if (!loanData || loanData.borrower_id !== user.id) {
        router.push('/dashboard')
        return
      }

      setLoan(loanData)
      setCurrentStep(loanData.current_step || 1)
      
      // Merge saved form data
      if (loanData.form_data) {
        setFormData(prev => ({ ...prev, ...loanData.form_data }))
      }

      // Fetch borrower
      const { data: borrowerData } = await supabase
        .from('borrowers')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setBorrower(borrowerData)

      // Fetch document requirements
      const { data: docReqs } = await supabase
        .from('document_requirements')
        .select('*')
        .eq('loan_type', loanData.loan_type)
        .order('sort_order')
      
      setDocRequirements(docReqs || [])

      // Fetch uploaded documents
      const { data: docs } = await supabase
        .from('documents')
        .select('document_type, file_name, status, is_from_profile')
        .eq('loan_id', loanId)
      
      const docMap: Record<string, { name: string; status: string }> = {}
      docs?.forEach(d => {
        docMap[d.document_type] = { name: d.file_name, status: d.status }
      })
      setUploadedDocs(docMap)

      // Also check for profile documents
      const { data: profileDocs } = await supabase
        .from('documents')
        .select('document_type, file_name')
        .eq('borrower_id', user.id)
        .eq('is_from_profile', true)
      
      profileDocs?.forEach(d => {
        if (!docMap[d.document_type]) {
          docMap[d.document_type] = { name: `${d.file_name} (from profile)`, status: 'uploaded' }
        }
      })
      setUploadedDocs(docMap)

      setLoading(false)
    }

    fetchData()
  }, [loanId, router])

  // Auto-save debounced
  const saveFormData = useCallback(
    debounce(async (data: typeof formData, step: number) => {
      if (!loan) return
      
      setSaving(true)
      
      const supabase = createClient()
      
      // Calculate derived values
      const purchasePrice = parseCurrency(data.purchase_price)
      const downPayment = parseCurrency(data.down_payment)
      const loanAmount = purchasePrice - downPayment
      
      const updates: Partial<Loan> = {
        form_data: data,
        current_step: step,
        last_saved_at: new Date().toISOString(),
        property_address: data.property_address,
        property_city: data.property_city,
        property_state: data.property_state,
        property_zip: data.property_zip,
        property_type: data.property_type,
        property_units: data.property_units,
        purchase_price: purchasePrice || undefined,
        down_payment: downPayment || undefined,
        loan_amount: loanAmount || undefined,
      }

      if (loan.loan_type === 'dscr') {
        updates.monthly_rent = parseCurrency(data.monthly_rent) || undefined
        updates.annual_taxes = parseCurrency(data.annual_taxes) || undefined
        updates.annual_insurance = parseCurrency(data.annual_insurance) || undefined
        updates.monthly_hoa = parseCurrency(data.monthly_hoa) || undefined
      }

      if (loan.loan_type === 'fix_flip') {
        updates.rehab_budget = parseCurrency(data.rehab_budget) || undefined
        updates.arv = parseCurrency(data.arv) || undefined
        updates.rehab_timeline_months = parseInt(data.rehab_timeline_months) || undefined
        updates.exit_strategy = data.exit_strategy
      }

      if (loan.loan_type === 'bridge') {
        updates.payoff_source = data.payoff_source
        updates.takeout_lender = data.takeout_lender
        updates.exit_strategy = data.exit_strategy
      }

      await supabase
        .from('loans')
        .update(updates)
        .eq('id', loan.id)

      setSaving(false)
      setLastSaved(new Date())
    }, 1000),
    [loan]
  )

  // Handle input changes
  const handleChange = (field: string, value: string | number) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    saveFormData(newData, currentStep)
  }

  // Navigate steps
  const goToStep = (step: number) => {
    setCurrentStep(step)
    saveFormData(formData, step)
    window.scrollTo(0, 0)
  }

  // Submit application
  const handleSubmit = async () => {
    setSubmitting(true)
    
    const supabase = createClient()
    
    // Update loan status
    await supabase
      .from('loans')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .eq('id', loan!.id)

    // Trigger email notification via webhook
    try {
      await fetch('/api/webhooks/loan-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: loan!.id,
          newStatus: 'submitted',
          oldStatus: 'draft'
        })
      })
    } catch (e) {
      console.log('Email notification skipped')
    }

    setShowSuccess(true)
    
    setTimeout(() => {
      router.push('/dashboard')
    }, 2500)
  }

  // Calculate values
  const purchasePrice = parseCurrency(formData.purchase_price)
  const downPayment = parseCurrency(formData.down_payment)
  const loanAmount = purchasePrice - downPayment
  const monthlyRent = parseCurrency(formData.monthly_rent)
  const annualTaxes = parseCurrency(formData.annual_taxes)
  const annualInsurance = parseCurrency(formData.annual_insurance)
  const monthlyHoa = parseCurrency(formData.monthly_hoa)
  const rehabBudget = parseCurrency(formData.rehab_budget)
  const arv = parseCurrency(formData.arv)

  const dscr = loan?.loan_type === 'dscr' 
    ? calculateDSCR(monthlyRent, loanAmount, annualTaxes, annualInsurance, monthlyHoa)
    : null

  const ltv = calculateLTV(loanAmount, purchasePrice)
  const ltc = calculateLTC(loanAmount, purchasePrice, rehabBudget)
  const ltarv = calculateLTARV(loanAmount, arv)

  const dscrStatus = getDSCRStatus(dscr)
  const ltvStatus = getLTVStatus(ltv)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!loan) return null

  const steps = STEPS[loan.loan_type]
  const totalSteps = steps.length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-navy-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm"
            >
              <ArrowLeft size={16} />
              Save & Exit
            </Link>
            
            <div className="flex items-center gap-3">
              {saving ? (
                <span className="text-white/60 text-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </span>
              ) : lastSaved ? (
                <span className="text-white/60 text-sm flex items-center gap-2">
                  <Check size={14} />
                  Saved
                </span>
              ) : null}
              
              <span className="badge bg-white/20 text-white">
                {loanTypeLabels[loan.loan_type]}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-slate-200 sticky top-[60px] z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            {steps.map((step, i) => (
              <div key={i} className="flex-1 flex items-center">
                <button
                  onClick={() => i + 1 < currentStep && goToStep(i + 1)}
                  disabled={i + 1 > currentStep}
                  className="flex items-center gap-2 w-full group"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    i + 1 < currentStep && 'bg-green-500 text-white',
                    i + 1 === currentStep && 'bg-primary-500 text-white',
                    i + 1 > currentStep && 'bg-slate-200 text-slate-400'
                  )}>
                    {i + 1 < currentStep ? <Check size={16} /> : i + 1}
                  </div>
                  <span className={cn(
                    'text-sm hidden sm:block transition-colors',
                    i + 1 <= currentStep ? 'text-slate-900 font-medium' : 'text-slate-400'
                  )}>
                    {step}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-2',
                    i + 1 < currentStep ? 'bg-green-500' : 'bg-slate-200'
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-6 md:p-8">
          {/* Step 1: Property Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Property Information</h2>
                <p className="text-slate-500 mt-1">Enter the subject property details</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Property Address</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="123 Main Street"
                    value={formData.property_address}
                    onChange={(e) => handleChange('property_address', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="label">City</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Columbus"
                      value={formData.property_city}
                      onChange={(e) => handleChange('property_city', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">State</label>
                    <select
                      className="input"
                      value={formData.property_state}
                      onChange={(e) => handleChange('property_state', e.target.value)}
                    >
                      {US_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">ZIP Code</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="43220"
                      value={formData.property_zip}
                      onChange={(e) => handleChange('property_zip', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Property Type</label>
                    <select
                      className="input"
                      value={formData.property_type}
                      onChange={(e) => handleChange('property_type', e.target.value)}
                    >
                      <option value="SFR">Single Family</option>
                      <option value="2-4">2-4 Units</option>
                      <option value="Condo">Condo</option>
                      <option value="Townhouse">Townhouse</option>
                    </select>
                  </div>
                  <div>
                    <label className="label"># of Units</label>
                    <input
                      type="number"
                      className="input"
                      min="1"
                      max="4"
                      value={formData.property_units}
                      onChange={(e) => handleChange('property_units', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Purchase Price</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="text"
                        className="input pl-8"
                        placeholder="350,000"
                        value={formData.purchase_price}
                        onChange={(e) => handleChange('purchase_price', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Down Payment</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="text"
                        className="input pl-8"
                        placeholder="87,500"
                        value={formData.down_payment}
                        onChange={(e) => handleChange('down_payment', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Loan Amount Display */}
                {loanAmount > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-slate-600">Estimated Loan Amount</span>
                    <span className="text-xl font-bold text-slate-900">
                      {formatCurrency(loanAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: DSCR Details */}
          {currentStep === 2 && loan.loan_type === 'dscr' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">DSCR Calculation</h2>
                <p className="text-slate-500 mt-1">Enter rental income and expenses</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Monthly Rent</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="text"
                      className="input pl-8"
                      placeholder="2,800"
                      value={formData.monthly_rent}
                      onChange={(e) => handleChange('monthly_rent', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Annual Property Taxes</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="text"
                      className="input pl-8"
                      placeholder="4,200"
                      value={formData.annual_taxes}
                      onChange={(e) => handleChange('annual_taxes', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Annual Insurance</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="text"
                      className="input pl-8"
                      placeholder="1,800"
                      value={formData.annual_insurance}
                      onChange={(e) => handleChange('annual_insurance', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Monthly HOA (if any)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="text"
                      className="input pl-8"
                      placeholder="0"
                      value={formData.monthly_hoa}
                      onChange={(e) => handleChange('monthly_hoa', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* DSCR Calculator Display */}
              <div className={cn(
                'dscr-display',
                dscr !== null && dscr >= 1.25 && 'dscr-display-good',
                dscr !== null && dscr >= 1.0 && dscr < 1.25 && 'dscr-display-warning',
                dscr !== null && dscr < 1.0 && 'dscr-display-bad',
                dscr === null && 'bg-slate-50 border border-slate-200'
              )}>
                <div className="text-sm text-slate-500 mb-2">Calculated DSCR</div>
                <div className={cn(
                  'text-5xl font-bold',
                  dscr !== null && dscr >= 1.25 && 'text-green-600',
                  dscr !== null && dscr >= 1.0 && dscr < 1.25 && 'text-yellow-600',
                  dscr !== null && dscr < 1.0 && 'text-red-600',
                  dscr === null && 'text-slate-300'
                )}>
                  {dscr !== null ? dscr.toFixed(2) : '—'}
                </div>
                <div className={cn('text-sm mt-2', dscrStatus.color)}>
                  {dscr !== null && (
                    <>
                      {dscr >= 1.25 && '✓ Excellent — Meets standard requirements'}
                      {dscr >= 1.0 && dscr < 1.25 && '✓ Acceptable — May require review'}
                      {dscr < 1.0 && '⚠ Below minimum — May not qualify'}
                    </>
                  )}
                  {dscr === null && 'Enter values to calculate'}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Fix & Flip Details */}
          {currentStep === 2 && loan.loan_type === 'fix_flip' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Rehab Details</h2>
                <p className="text-slate-500 mt-1">Enter renovation budget and after repair value</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Rehab Budget</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="text"
                      className="input pl-8"
                      placeholder="75,000"
                      value={formData.rehab_budget}
                      onChange={(e) => handleChange('rehab_budget', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">After Repair Value (ARV)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="text"
                      className="input pl-8"
                      placeholder="475,000"
                      value={formData.arv}
                      onChange={(e) => handleChange('arv', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Rehab Timeline</label>
                  <select
                    className="input"
                    value={formData.rehab_timeline_months}
                    onChange={(e) => handleChange('rehab_timeline_months', e.target.value)}
                  >
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="9">9 months</option>
                    <option value="12">12 months</option>
                  </select>
                </div>
                <div>
                  <label className="label">Exit Strategy</label>
                  <select
                    className="input"
                    value={formData.exit_strategy}
                    onChange={(e) => handleChange('exit_strategy', e.target.value)}
                  >
                    <option value="Sale">Sale</option>
                    <option value="Refinance">Refinance to DSCR</option>
                    <option value="Hold">Hold as Rental</option>
                  </select>
                </div>
              </div>

              {/* LTV/LTC/LTARV Display */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-500 mb-1">LTV</div>
                  <div className={cn(
                    'text-2xl font-bold',
                    ltv !== null && ltv <= 80 ? 'text-green-600' : 'text-yellow-600'
                  )}>
                    {ltv !== null ? `${ltv.toFixed(0)}%` : '—'}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-500 mb-1">LTC</div>
                  <div className={cn(
                    'text-2xl font-bold',
                    ltc !== null && ltc <= 90 ? 'text-green-600' : 'text-yellow-600'
                  )}>
                    {ltc !== null ? `${ltc.toFixed(0)}%` : '—'}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-500 mb-1">LTARV</div>
                  <div className={cn(
                    'text-2xl font-bold',
                    ltarv !== null && ltarv <= 70 ? 'text-green-600' : 'text-yellow-600'
                  )}>
                    {ltarv !== null ? `${ltarv.toFixed(0)}%` : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Bridge Details */}
          {currentStep === 2 && loan.loan_type === 'bridge' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Exit Strategy</h2>
                <p className="text-slate-500 mt-1">How will this loan be repaid?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Exit Strategy</label>
                  <select
                    className="input"
                    value={formData.exit_strategy}
                    onChange={(e) => handleChange('exit_strategy', e.target.value)}
                  >
                    <option value="Sale">Sale of Property</option>
                    <option value="Refinance">Refinance with Permanent Loan</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Payoff Source / Takeout Lender</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Conventional refinance, Sale proceeds"
                    value={formData.takeout_lender}
                    onChange={(e) => handleChange('takeout_lender', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Additional Notes</label>
                  <textarea
                    className="input min-h-[100px]"
                    placeholder="Describe your exit strategy in detail..."
                    value={formData.borrower_notes}
                    onChange={(e) => handleChange('borrower_notes', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Required Documents</h2>
                <p className="text-slate-500 mt-1">Upload the following documents to complete your application</p>
              </div>

              <div className="space-y-3">
                {docRequirements.map((doc) => {
                  const uploaded = uploadedDocs[doc.document_type]
                  const isUploaded = !!uploaded
                  const isFromProfile = uploaded?.name?.includes('(from profile)')
                  
                  return (
                    <div 
                      key={doc.id}
                      className={cn(
                        'doc-item',
                        isUploaded ? 'doc-item-uploaded' : 'doc-item-pending'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          isUploaded ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                        )}>
                          {isUploaded ? <Check size={18} /> : <FileText size={18} />}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{doc.display_name}</div>
                          <div className="text-sm text-slate-500">
                            {isUploaded ? (
                              isFromProfile ? 'Using document from profile' : 'Uploaded'
                            ) : (
                              doc.is_required ? 'Required' : 'Optional'
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!isUploaded && (
                          <>
                            <button className="btn-secondary btn-sm flex items-center gap-2">
                              <Camera size={14} />
                              <span className="hidden sm:inline">Capture</span>
                            </button>
                            <button className="btn-primary btn-sm flex items-center gap-2">
                              <Upload size={14} />
                              Upload
                            </button>
                          </>
                        )}
                        {isUploaded && (
                          <button className="text-sm text-green-600 font-medium">
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Tip:</strong> You can continue to the review step and submit your application. 
                  Missing documents can be uploaded later from your dashboard.
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Review & Submit</h2>
                <p className="text-slate-500 mt-1">Please review your application before submitting</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-5">
                  <div className="text-sm text-slate-500 mb-3">Borrower Information</div>
                  <div className="font-semibold text-slate-900">
                    {borrower?.first_name} {borrower?.last_name}
                  </div>
                  <div className="text-slate-600">{borrower?.company_name}</div>
                  <div className="text-slate-600">Credit Score: {borrower?.credit_score || '—'}</div>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-5">
                  <div className="text-sm text-slate-500 mb-3">Property</div>
                  <div className="font-semibold text-slate-900">
                    {formData.property_address || '—'}
                  </div>
                  <div className="text-slate-600">
                    {formData.property_city}, {formData.property_state} {formData.property_zip}
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-5">
                  <div className="text-sm text-slate-500 mb-3">Loan Details</div>
                  <div className="font-semibold text-slate-900">
                    {formatCurrency(loanAmount)}
                  </div>
                  <div className="text-slate-600">
                    {loanTypeLabels[loan.loan_type]} • 
                    {loan.loan_type === 'dscr' ? ' 30-year term' : ' 12-month term'}
                  </div>
                </div>
                
                <div className={cn(
                  'rounded-lg p-5',
                  loan.loan_type === 'dscr' && dscr && dscr >= 1.0 ? 'bg-green-50' : 'bg-primary-50'
                )}>
                  <div className="text-sm text-slate-500 mb-3">
                    {loan.loan_type === 'dscr' ? 'DSCR Ratio' : 'Loan-to-ARV'}
                  </div>
                  <div className={cn(
                    'text-3xl font-bold',
                    loan.loan_type === 'dscr' && dscr && dscr >= 1.0 ? 'text-green-600' : 'text-primary-600'
                  )}>
                    {loan.loan_type === 'dscr' 
                      ? (dscr?.toFixed(2) || '—')
                      : (ltarv ? `${ltarv.toFixed(0)}%` : '—')
                    }
                  </div>
                </div>
              </div>

              <div className="bg-primary-50 border border-primary-200 rounded-lg p-5">
                <div className="flex gap-4">
                  <Clock className="w-6 h-6 text-primary-500 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">What happens next?</div>
                    <div className="text-sm text-slate-600 mt-1">
                      Once submitted, our team will review your application within 24-48 hours. 
                      You'll receive status updates via email and can track progress in your dashboard.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
            <button
              onClick={() => currentStep > 1 ? goToStep(currentStep - 1) : router.push('/apply')}
              className="btn-secondary btn-md"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back
            </button>
            
            {currentStep < totalSteps ? (
              <button
                onClick={() => goToStep(currentStep + 1)}
                className="btn-primary btn-md"
              >
                Continue
                <ArrowRight size={16} className="ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn bg-green-500 hover:bg-green-600 text-white btn-md"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check size={16} className="mr-2" />
                    Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-slide-up">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Application Submitted!
            </h3>
            <p className="text-slate-500">
              We'll review your application and be in touch within 24-48 hours.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}