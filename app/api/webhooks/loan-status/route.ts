import { createAdminClient } from '@/lib/supabase-server'
import { sendNotificationWithEmail, emailTemplates } from '@/lib/email'
import { NextResponse } from 'next/server'

// This endpoint can be called by Supabase webhooks or admin actions
// to trigger notifications when loan status changes

export async function POST(request: Request) {
  try {
    const { loanId, newStatus, oldStatus } = await request.json()

    if (!loanId || !newStatus) {
      return NextResponse.json({ error: 'loanId and newStatus required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch loan with borrower details
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*, borrowers(*)')
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    const borrower = loan.borrowers
    const borrowerName = `${borrower.first_name} ${borrower.last_name}`
    const propertyAddress = loan.property_address || 'Your property'

    // Determine notification type and email template
    let notificationType = 'status_change'
    let notificationTitle = ''
    let notificationBody = ''
    let emailTemplate = null

    const statusLabels: Record<string, string> = {
      submitted: 'Submitted',
      in_review: 'In Review',
      approved: 'Approved',
      clear_to_close: 'Clear to Close',
      funded: 'Funded',
      denied: 'Denied'
    }

    switch (newStatus) {
      case 'submitted':
        notificationTitle = 'Application Submitted'
        notificationBody = `Your application for ${propertyAddress} has been submitted and is under initial review.`
        emailTemplate = emailTemplates.applicationSubmitted(
          borrowerName, 
          propertyAddress, 
          loan.loan_type === 'dscr' ? 'DSCR' : loan.loan_type === 'fix_flip' ? 'Fix & Flip' : 'Bridge'
        )
        break

      case 'in_review':
        notificationTitle = 'Application In Review'
        notificationBody = `Your application for ${propertyAddress} is now being reviewed by our underwriting team.`
        emailTemplate = emailTemplates.statusChanged(borrowerName, propertyAddress, 'In Review')
        break

      case 'approved':
        notificationTitle = 'Loan Approved!'
        notificationBody = `Great news! Your loan for ${propertyAddress} has been approved.`
        emailTemplate = emailTemplates.statusChanged(borrowerName, propertyAddress, 'Approved')
        break

      case 'clear_to_close':
        notificationTitle = 'Clear to Close'
        notificationBody = `Your loan for ${propertyAddress} is clear to close. We'll be in touch with closing details.`
        emailTemplate = emailTemplates.statusChanged(borrowerName, propertyAddress, 'Clear to Close')
        break

      case 'funded':
        notificationTitle = '🎉 Loan Funded!'
        notificationBody = `Congratulations! Your loan for ${propertyAddress} has been funded.`
        const loanAmount = new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 0 
        }).format(loan.loan_amount || 0)
        emailTemplate = emailTemplates.loanFunded(borrowerName, propertyAddress, loanAmount)
        break

      case 'denied':
        notificationTitle = 'Application Update'
        notificationBody = `Your application for ${propertyAddress} was not approved. Please contact us for more information.`
        emailTemplate = emailTemplates.statusChanged(borrowerName, propertyAddress, 'Not Approved')
        break

      default:
        notificationTitle = 'Status Update'
        notificationBody = `Your loan for ${propertyAddress} status has been updated to ${statusLabels[newStatus] || newStatus}.`
    }

    // Send notification with email
    const notification = await sendNotificationWithEmail(
      supabase,
      borrower.id,
      loanId,
      notificationType,
      notificationTitle,
      notificationBody,
      emailTemplate || undefined
    )

    return NextResponse.json({ 
      success: true, 
      notification,
      emailSent: !!emailTemplate
    })

  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
