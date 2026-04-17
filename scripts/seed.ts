/**
 * Seed Script for Mentyx Portal
 * 
 * Run with: npm run db:seed
 * 
 * This creates a demo user and populates with sample data.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const DEMO_USER = {
  email: 'demo@focusdscr.com',
  password: 'demo123456'
}

const DEMO_BORROWER = {
  email: 'demo@focusdscr.com',
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

async function seed() {
  console.log('🌱 Starting seed...')

  // 1. Create auth user
  console.log('Creating demo user...')
  
  // First, try to delete existing user if exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === DEMO_USER.email)
  
  if (existingUser) {
    console.log('Deleting existing demo user...')
    await supabase.auth.admin.deleteUser(existingUser.id)
    // Also delete borrower record
    await supabase.from('borrowers').delete().eq('id', existingUser.id)
  }

  // Create new user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: DEMO_USER.email,
    password: DEMO_USER.password,
    email_confirm: true
  })

  if (authError) {
    console.error('Error creating user:', authError)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`✅ Created user: ${userId}`)

  // 2. Create borrower profile
  console.log('Creating borrower profile...')
  
  const { error: borrowerError } = await supabase
    .from('borrowers')
    .insert({
      id: userId,
      ...DEMO_BORROWER
    })

  if (borrowerError) {
    console.error('Error creating borrower:', borrowerError)
    process.exit(1)
  }
  console.log('✅ Created borrower profile')

  // 3. Create loans
  console.log('Creating demo loans...')
  
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
      console.error('Error creating loan:', loanError)
      continue
    }

    console.log(`✅ Created loan: ${loanData.property_address}`)

    // Add documents for funded loans
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
          },
          {
            loan_id: loan.id,
            borrower_id: userId,
            document_type: 'bank_statements',
            file_name: 'Bank_Statements_Oct_Nov.pdf',
            status: 'approved',
            is_from_profile: false
          }
        ])
      console.log(`  ✅ Added documents for ${loanData.property_address}`)
    }

    // Add some documents for in_review loan (incomplete)
    if (loan && loanData.status === 'in_review') {
      await supabase
        .from('documents')
        .insert([
          {
            loan_id: loan.id,
            borrower_id: userId,
            document_type: 'purchase_contract',
            file_name: 'Purchase_Contract_891_Riverside.pdf',
            status: 'reviewing',
            is_from_profile: false
          },
          {
            loan_id: loan.id,
            borrower_id: userId,
            document_type: 'entity_docs',
            file_name: 'Chen_Capital_LLC_Operating_Agreement.pdf',
            status: 'approved',
            is_from_profile: true
          }
        ])
      console.log(`  ✅ Added partial documents for ${loanData.property_address}`)
    }
  }

  // 4. Create profile documents
  console.log('Creating profile documents...')
  
  await supabase
    .from('documents')
    .insert([
      {
        loan_id: null,
        borrower_id: userId,
        document_type: 'entity_docs',
        file_name: 'Chen_Capital_LLC_Operating_Agreement.pdf',
        status: 'approved',
        is_from_profile: true
      },
      {
        loan_id: null,
        borrower_id: userId,
        document_type: 'photo_id',
        file_name: 'Michael_Chen_Drivers_License.pdf',
        status: 'approved',
        is_from_profile: true
      }
    ])
  console.log('✅ Created profile documents')

  // 5. Create notifications
  console.log('Creating notifications...')
  
  await supabase
    .from('notifications')
    .insert([
      {
        borrower_id: userId,
        type: 'status_change',
        title: '🎉 Loan Funded!',
        body: 'Your DSCR loan for 1847 Maple Grove Dr has been funded.',
        is_read: true,
        email_sent: true
      },
      {
        borrower_id: userId,
        type: 'status_change',
        title: 'Application In Review',
        body: 'Your DSCR loan for 891 Riverside Blvd is now in underwriting.',
        is_read: false,
        email_sent: true
      },
      {
        borrower_id: userId,
        type: 'document_reminder',
        title: 'Documents Needed',
        body: 'We need your lease agreement to continue processing your loan for 891 Riverside Blvd.',
        is_read: false,
        email_sent: true
      }
    ])
  console.log('✅ Created notifications')

  console.log('')
  console.log('🎉 Seed complete!')
  console.log('')
  console.log('Demo credentials:')
  console.log(`  Email: ${DEMO_USER.email}`)
  console.log(`  Password: ${DEMO_USER.password}`)
  console.log('')
}

seed().catch(console.error)
