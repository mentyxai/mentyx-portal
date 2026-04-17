import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Types
export type LoanType = 'dscr' | 'fix_flip' | 'bridge'

export type LoanStatus = 
  | 'draft' 
  | 'submitted' 
  | 'in_review' 
  | 'approved' 
  | 'denied' 
  | 'clear_to_close' 
  | 'funded' 
  | 'withdrawn'

export type DocumentStatus = 'pending' | 'uploaded' | 'reviewing' | 'approved' | 'rejected'

export interface Borrower {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  company_name?: string
  company_type?: string
  ein?: string
  credit_score?: number
  experience_years?: number
  properties_owned?: number
  mailing_address?: string
  mailing_city?: string
  mailing_state?: string
  mailing_zip?: string
  created_at: string
  updated_at: string
}

export interface Loan {
  id: string
  borrower_id: string
  loan_type: LoanType
  status: LoanStatus
  property_address?: string
  property_city?: string
  property_state?: string
  property_zip?: string
  property_type?: string
  property_units?: number
  purchase_price?: number
  down_payment?: number
  loan_amount?: number
  monthly_rent?: number
  annual_taxes?: number
  annual_insurance?: number
  monthly_hoa?: number
  dscr_ratio?: number
  rehab_budget?: number
  arv?: number
  ltv?: number
  ltc?: number
  ltarv?: number
  rehab_timeline_months?: number
  exit_strategy?: string
  payoff_source?: string
  takeout_lender?: string
  estimated_rate?: number
  estimated_monthly_payment?: number
  current_step: number
  form_data: Record<string, any>
  last_saved_at?: string
  submitted_at?: string
  decision_at?: string
  funded_at?: string
  internal_notes?: string
  borrower_notes?: string
  conditions?: any[]
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  loan_id: string
  borrower_id: string
  document_type: string
  file_name: string
  file_size?: number
  file_type?: string
  storage_path?: string
  status: DocumentStatus
  rejection_reason?: string
  reviewed_by?: string
  reviewed_at?: string
  is_from_profile: boolean
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface DocumentRequirement {
  id: string
  loan_type: LoanType
  document_type: string
  display_name: string
  description?: string
  is_required: boolean
  sort_order: number
}

export interface Notification {
  id: string
  borrower_id: string
  loan_id?: string
  type: string
  title: string
  body: string
  is_read: boolean
  read_at?: string
  created_at: string
}

// Status display helpers
export const statusLabels: Record<LoanStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  in_review: 'In Review',
  approved: 'Approved',
  denied: 'Denied',
  clear_to_close: 'Clear to Close',
  funded: 'Funded',
  withdrawn: 'Withdrawn'
}

export const statusColors: Record<LoanStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
  clear_to_close: 'bg-emerald-100 text-emerald-700',
  funded: 'bg-emerald-100 text-emerald-700',
  withdrawn: 'bg-gray-100 text-gray-500'
}

export const loanTypeLabels: Record<LoanType, string> = {
  dscr: 'DSCR Rental',
  fix_flip: 'Fix & Flip',
  bridge: 'Bridge'
}

export const loanTypeColors: Record<LoanType, string> = {
  dscr: 'bg-primary-100 text-primary-700',
  fix_flip: 'bg-amber-100 text-amber-700',
  bridge: 'bg-purple-100 text-purple-700'
}
