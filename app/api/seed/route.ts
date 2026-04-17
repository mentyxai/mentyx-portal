import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Demo borrower data
const DEMO_BORROWER = {
  email: 'mchen@realestateinv.com',
  first_name: 'Michael',
  last_name: 'Chen',
  phone: '(614) 555-0192',
  company_name: 'Chen Capital Investments LLC',
  company_type: 'LLC',
  ein: 'XX-XXX4521',
  credit_score: 745,
  experience_years: 5,
  properties_owned: 12,
  mailing_address: '456 Investment Blvd',
  mailing_city: 'Columbus',
  mailing_state: 'OH',
  mailing_zip: '43215'
}

// Demo loans
const DEMO_LOANS = [
  {
    loan_type: 'dscr',
    status: 'funded',
    property_address: '1847 Maple Grove Dr',
    property_city: 'Columbus',
    property_state: 'OH',
    property_zip: '43220',
    property_type: 'SFR',
    property_units: 1,
    purchase_price: 350000,
    down_payment: 87500,
    loan_amount: 262500,
    monthly_rent: 2800,
    annual_taxes: 4200,
    annual_insurance: 1800,
    monthly_hoa: 0,
    dscr_ratio: 1.32,
    current_step: 4,
    submitted_at: '2024-11-10T10:00:00Z',
    funded_at: '2024-11-15T14:30:00Z'
  },
  {
    loan_type: 'fix_flip',
    status: 'funded',
    property_address: '2234 Oak Valley Ln',
    property_city: 'Dublin',
    property_state: 'OH',
    property_zip: '43017',
    property_type: 'SFR',
    property_units: 1,
    purchase_price: 275000,
    down_payment: 55000,
    loan_amount: 220000,
    rehab_budget: 75000,
    arv: 425000,
    ltv: 80,
    ltc: 63,
    ltarv: 52,
    rehab_timeline_months: 6,
    exit_strategy: 'Sale',
    current_step: 4,
    submitted_at: '2024-09-15T09:00:00Z',
    funded_at: '2024-09-22T11:00:00Z'
  },
  {
    loan_type: 'dscr',
    status: 'in_review',
    property_address: '891 Riverside Blvd',
    property_city: 'Westerville',
    property_state: 'OH',
    property_zip: '43081',
    property_type: 'SFR',
    property_units: 1,
    purchase_price: 400000,
    down_payment: 80000,
    loan_amount: 320000,
    monthly_rent: 3100,
    annual_taxes: 5000,
    annual_insurance: 2100,
    monthly_hoa: 0,
    dscr_ratio: 1.18,
    current_step: 4,
    submitted_at: '2025-04-10T08:00:00Z'
  }
]

// Demo documents (marked as from profile)
const DEMO_PROFILE_DOCS = [
  { document_type: 'entity_docs', file_name: 'Chen_Capital_LLC_Operating_Agreement.pdf' },
  { document_type: 'photo_id', file_name: 'Michael_Chen_Drivers_License.pdf' }
]

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()
    
    // Get the current user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from the request body instead
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Update borrower profile with demo data
    const { error: borrowerError } = await supabase
      .from('borrowers')
      .upsert({
        id: userId,
        ...DEMO_BORROWER
      })

    if (borrowerError) {
      console.error('Borrower error:', borrowerError)
      return NextResponse.json({ error: borrowerError.message }, { status: 500 })
    }

    // Create demo loans
    for (const loanData of DEMO_LOANS) {
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .insert({
          ...loanData,
          borrower_id: userId,
          form_data: {
            property_address: loanData.property_address,
            property_city: loanData.property_city,
            property_state: loanData.property_state,
            property_zip: loanData.property_zip,
            purchase_price: loanData.purchase_price?.toString(),
            down_payment: loanData.down_payment?.toString(),
            monthly_rent: loanData.monthly_rent?.toString(),
            annual_taxes: loanData.annual_taxes?.toString(),
            annual_insurance: loanData.annual_insurance?.toString(),
            rehab_budget: loanData.rehab_budget?.toString(),
            arv: loanData.arv?.toString()
          }
        })
        .select()
        .single()

      if (loanError) {
        console.error('Loan error:', loanError)
        continue
      }

      // Add some documents for funded loans
      if (loan && loanData.status === 'funded') {
        await supabase
          .from('documents')
          .insert([
            {
              loan_id: loan.id,
              borrower_id: userId,
              document_type: 'purchase_contract',
              file_name: 'Purchase_Agreement.pdf',
              status: 'approved',
              is_from_profile: false
            },
            {
              loan_id: loan.id,
              borrower_id: userId,
              document_type: 'entity_docs',
              file_name: 'Chen_Capital_LLC_Operating_Agreement.pdf',
              status: 'approved',
              is_from_profile: true
            },
            {
              loan_id: loan.id,
              borrower_id: userId,
              document_type: 'photo_id',
              file_name: 'Michael_Chen_Drivers_License.pdf',
              status: 'approved',
              is_from_profile: true
            }
          ])
      }
    }

    // Create profile documents
    for (const doc of DEMO_PROFILE_DOCS) {
      await supabase
        .from('documents')
        .insert({
          loan_id: null,
          borrower_id: userId,
          document_type: doc.document_type,
          file_name: doc.file_name,
          status: 'approved',
          is_from_profile: true
        })
    }

    // Create some notifications
    await supabase
      .from('notifications')
      .insert([
        {
          borrower_id: userId,
          type: 'status_change',
          title: 'Loan Funded!',
          body: 'Your DSCR loan for 1847 Maple Grove Dr has been funded.',
          is_read: true
        },
        {
          borrower_id: userId,
          type: 'status_change',
          title: 'Application In Review',
          body: 'Your DSCR loan for 891 Riverside Blvd is now in underwriting.',
          is_read: false
        }
      ])

    return NextResponse.json({ 
      success: true, 
      message: 'Demo data created successfully',
      borrower: DEMO_BORROWER.first_name + ' ' + DEMO_BORROWER.last_name,
      loans: DEMO_LOANS.length
    })

  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
