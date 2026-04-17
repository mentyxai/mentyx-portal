import { createAdminClient } from '@/lib/supabase-server'
import { sendNotificationWithEmail, emailTemplates } from '@/lib/email'
import { NextResponse } from 'next/server'

// This endpoint checks for missing documents and sends reminders
// Can be called by a cron job or manually

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()

    // Find loans that are submitted or in_review with missing required docs
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*, borrowers(*)')
      .in('status', ['submitted', 'in_review'])

    if (loansError) throw loansError

    const reminders = []

    for (const loan of loans || []) {
      // Get required documents for this loan type
      const { data: requirements } = await supabase
        .from('document_requirements')
        .select('document_type, display_name')
        .eq('loan_type', loan.loan_type)
        .eq('is_required', true)

      // Get uploaded documents
      const { data: uploaded } = await supabase
        .from('documents')
        .select('document_type')
        .eq('loan_id', loan.id)
        .in('status', ['uploaded', 'approved', 'reviewing'])

      const uploadedTypes = new Set(uploaded?.map(d => d.document_type) || [])
      
      // Find missing documents
      const missingDocs = requirements?.filter(r => !uploadedTypes.has(r.document_type)) || []

      if (missingDocs.length > 0) {
        const borrower = loan.borrowers
        const borrowerName = `${borrower.first_name} ${borrower.last_name}`
        const propertyAddress = loan.property_address || 'Your property'
        const missingDocNames = missingDocs.map(d => d.display_name)

        // Check if we already sent a reminder recently (within 24 hours)
        const { data: recentNotifications } = await supabase
          .from('notifications')
          .select('id')
          .eq('loan_id', loan.id)
          .eq('type', 'document_reminder')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1)

        if (recentNotifications && recentNotifications.length > 0) {
          // Skip - already sent reminder recently
          continue
        }

        // Send reminder
        const notification = await sendNotificationWithEmail(
          supabase,
          borrower.id,
          loan.id,
          'document_reminder',
          'Documents Needed',
          `We need ${missingDocs.length} document(s) to continue processing your loan for ${propertyAddress}.`,
          emailTemplates.documentReminder(borrowerName, propertyAddress, missingDocNames)
        )

        reminders.push({
          loanId: loan.id,
          borrower: borrowerName,
          missingDocs: missingDocNames,
          notificationId: notification?.id
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      remindersCount: reminders.length,
      reminders 
    })

  } catch (error: any) {
    console.error('Reminder error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
