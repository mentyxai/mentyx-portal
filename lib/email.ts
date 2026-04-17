import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@focusdscr.com'
const APP_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Focus DSCR'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!resend) {
    console.log('Email service not configured. Would send:', options)
    return false
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    })
    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

// Email Templates
export const emailTemplates = {
  applicationSubmitted: (borrowerName: string, propertyAddress: string, loanType: string) => ({
    subject: `Application Received - ${propertyAddress}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0B2545; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #00B4D8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${APP_NAME}</h1>
            </div>
            <div class="content">
              <h2>Application Received!</h2>
              <p>Hi ${borrowerName},</p>
              <p>We've received your ${loanType} loan application for:</p>
              <p><strong>${propertyAddress}</strong></p>
              <p>Our team will review your application within 24-48 hours. You'll receive updates as your application progresses.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">View Application Status</a>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Application Received!
      
      Hi ${borrowerName},
      
      We've received your ${loanType} loan application for ${propertyAddress}.
      
      Our team will review your application within 24-48 hours.
      
      View your application: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard
    `
  }),

  statusChanged: (borrowerName: string, propertyAddress: string, newStatus: string) => ({
    subject: `Loan Status Update - ${propertyAddress}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0B2545; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .status { display: inline-block; background: #00B4D8; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
            .button { display: inline-block; background: #00B4D8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${APP_NAME}</h1>
            </div>
            <div class="content">
              <h2>Loan Status Update</h2>
              <p>Hi ${borrowerName},</p>
              <p>Your loan for <strong>${propertyAddress}</strong> has been updated:</p>
              <p><span class="status">${newStatus}</span></p>
              <p>Log in to your portal for more details.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">View Details</a>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Loan Status Update
      
      Hi ${borrowerName},
      
      Your loan for ${propertyAddress} has been updated to: ${newStatus}
      
      Log in to view details: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard
    `
  }),

  documentReminder: (borrowerName: string, propertyAddress: string, missingDocs: string[]) => ({
    subject: `Documents Needed - ${propertyAddress}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0B2545; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .doc-list { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .doc-item { padding: 8px 0; border-bottom: 1px solid #eee; }
            .button { display: inline-block; background: #00B4D8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${APP_NAME}</h1>
            </div>
            <div class="content">
              <h2>Documents Needed</h2>
              <p>Hi ${borrowerName},</p>
              <p>We're waiting on a few documents to continue processing your loan for <strong>${propertyAddress}</strong>:</p>
              <div class="doc-list">
                ${missingDocs.map(doc => `<div class="doc-item">📄 ${doc}</div>`).join('')}
              </div>
              <p>Upload these documents to keep your application moving.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Upload Documents</a>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Documents Needed
      
      Hi ${borrowerName},
      
      We're waiting on documents for your loan for ${propertyAddress}:
      
      ${missingDocs.map(doc => `- ${doc}`).join('\n')}
      
      Upload them here: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard
    `
  }),

  loanFunded: (borrowerName: string, propertyAddress: string, loanAmount: string) => ({
    subject: `🎉 Congratulations! Your Loan Has Been Funded - ${propertyAddress}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .amount { font-size: 36px; font-weight: bold; color: #10B981; margin: 20px 0; }
            .button { display: inline-block; background: #0B2545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your loan has been funded</p>
            </div>
            <div class="content">
              <p>Hi ${borrowerName},</p>
              <p>Great news! Your loan for <strong>${propertyAddress}</strong> has been funded.</p>
              <p class="amount">${loanAmount}</p>
              <p>Thank you for choosing ${APP_NAME}. We look forward to helping you with your next investment.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/apply" class="button">Start Your Next Application</a>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Congratulations! Your Loan Has Been Funded
      
      Hi ${borrowerName},
      
      Great news! Your loan for ${propertyAddress} has been funded.
      
      Amount: ${loanAmount}
      
      Thank you for choosing ${APP_NAME}.
      
      Start your next application: ${process.env.NEXT_PUBLIC_APP_URL}/apply
    `
  })
}

// Send notification with email
export async function sendNotificationWithEmail(
  supabase: any,
  borrowerId: string,
  loanId: string | null,
  type: string,
  title: string,
  body: string,
  emailTemplate?: { subject: string; html: string; text?: string }
) {
  // Create notification in database
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      borrower_id: borrowerId,
      loan_id: loanId,
      type,
      title,
      body
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating notification:', error)
    return null
  }

  // Send email if template provided
  if (emailTemplate && resend) {
    const { data: borrower } = await supabase
      .from('borrowers')
      .select('email')
      .eq('id', borrowerId)
      .single()

    if (borrower?.email) {
      const emailSent = await sendEmail({
        to: borrower.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      })

      // Update notification with email status
      if (emailSent) {
        await supabase
          .from('notifications')
          .update({ 
            email_sent: true, 
            email_sent_at: new Date().toISOString() 
          })
          .eq('id', notification.id)
      }
    }
  }

  return notification
}
