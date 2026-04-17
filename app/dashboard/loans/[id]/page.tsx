'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, type Loan, type Borrower, type Document, type DocumentRequirement, statusLabels, statusColors, loanTypeLabels, loanTypeColors } from '@/lib/supabase'
import { formatCurrency, formatDate, formatDateTime, cn } from '@/lib/utils'
import { 
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  Camera,
  AlertCircle,
  MessageSquare,
  Send,
  Download,
  Eye,
  X,
  Loader2,
  CircleDot,
  Check
} from 'lucide-react'

const STATUS_TIMELINE = [
  { status: 'draft', label: 'Draft', description: 'Application started' },
  { status: 'submitted', label: 'Submitted', description: 'Under initial review' },
  { status: 'in_review', label: 'In Review', description: 'Underwriting in progress' },
  { status: 'approved', label: 'Approved', description: 'Loan approved' },
  { status: 'clear_to_close', label: 'Clear to Close', description: 'Ready for closing' },
  { status: 'funded', label: 'Funded', description: 'Loan funded' },
]

export default function LoanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const loanId = params.id as string

  const [loan, setLoan] = useState<Loan | null>(null)
  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [docRequirements, setDocRequirements] = useState<DocumentRequirement[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'messages'>('overview')
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [loanId])

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

    // Fetch borrower
    const { data: borrowerData } = await supabase
      .from('borrowers')
      .select('*')
      .eq('id', user.id)
      .single()
    
    setBorrower(borrowerData)

    // Fetch documents
    const { data: docsData } = await supabase
      .from('documents')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false })
    
    setDocuments(docsData || [])

    // Fetch document requirements
    const { data: reqsData } = await supabase
      .from('document_requirements')
      .select('*')
      .eq('loan_type', loanData.loan_type)
      .order('sort_order')
    
    setDocRequirements(reqsData || [])

    // Fetch messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: true })
    
    setMessages(messagesData || [])

    setLoading(false)
  }

  const handleFileUpload = async (docType: string, file: File) => {
    if (!loan || !borrower) return
    
    setUploadingDoc(docType)
    
    const supabase = createClient()
    
    // Upload to Supabase Storage
    const filePath = `${borrower.id}/${loan.id}/${docType}_${Date.now()}_${file.name}`
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      setUploadingDoc(null)
      return
    }

    // Create document record
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        loan_id: loan.id,
        borrower_id: borrower.id,
        document_type: docType,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: filePath,
        status: 'uploaded',
        is_from_profile: false
      })
      .select()
      .single()

    if (!docError && docData) {
      setDocuments(prev => [docData, ...prev])
    }

    setUploadingDoc(null)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !loan || !borrower) return
    
    setSendingMessage(true)
    
    const supabase = createClient()
    
    const { data: msgData, error } = await supabase
      .from('messages')
      .insert({
        loan_id: loan.id,
        sender_id: borrower.id,
        sender_type: 'borrower',
        body: newMessage.trim()
      })
      .select()
      .single()

    if (!error && msgData) {
      setMessages(prev => [...prev, msgData])
      setNewMessage('')
    }

    setSendingMessage(false)
  }

  const getStatusIndex = (status: string) => {
    if (status === 'denied' || status === 'withdrawn') return -1
    return STATUS_TIMELINE.findIndex(s => s.status === status)
  }

  const getDocStatus = (docType: string) => {
    const doc = documents.find(d => d.document_type === docType)
    return doc || null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!loan) return null

  const currentStatusIndex = getStatusIndex(loan.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link 
            href="/dashboard/loans"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-3"
          >
            <ArrowLeft size={16} />
            Back to Loans
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {loan.property_address || 'Loan Application'}
          </h1>
          <p className="text-slate-500 mt-1">
            {loan.property_city}, {loan.property_state} {loan.property_zip}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('badge', loanTypeColors[loan.loan_type])}>
            {loanTypeLabels[loan.loan_type]}
          </span>
          <span className={cn('badge', statusColors[loan.status])}>
            {statusLabels[loan.status]}
          </span>
        </div>
      </div>

      {/* Status Timeline */}
      {loan.status !== 'denied' && loan.status !== 'withdrawn' && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-6">Loan Progress</h2>
          <div className="flex items-center justify-between">
            {STATUS_TIMELINE.map((step, index) => {
              const isComplete = index < currentStatusIndex
              const isCurrent = index === currentStatusIndex
              const isPending = index > currentStatusIndex
              
              return (
                <div key={step.status} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      isComplete && 'bg-green-500 text-white',
                      isCurrent && 'bg-primary-500 text-white ring-4 ring-primary-100',
                      isPending && 'bg-slate-200 text-slate-400'
                    )}>
                      {isComplete ? (
                        <Check size={20} />
                      ) : isCurrent ? (
                        <CircleDot size={20} />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <div className={cn(
                        'text-sm font-medium',
                        (isComplete || isCurrent) ? 'text-slate-900' : 'text-slate-400'
                      )}>
                        {step.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < STATUS_TIMELINE.length - 1 && (
                    <div className={cn(
                      'flex-1 h-1 mx-2 rounded',
                      index < currentStatusIndex ? 'bg-green-500' : 'bg-slate-200'
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-8">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 py-4 border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.id === 'documents' && (
                <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                  {documents.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Loan Details */}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Loan Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Loan Amount</span>
                <span className="font-semibold text-slate-900">{formatCurrency(loan.loan_amount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Purchase Price</span>
                <span className="font-medium text-slate-700">{formatCurrency(loan.purchase_price)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Down Payment</span>
                <span className="font-medium text-slate-700">{formatCurrency(loan.down_payment)}</span>
              </div>
              {loan.loan_type === 'dscr' && (
                <>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Monthly Rent</span>
                    <span className="font-medium text-slate-700">{formatCurrency(loan.monthly_rent)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">DSCR Ratio</span>
                    <span className={cn(
                      'font-bold',
                      loan.dscr_ratio && loan.dscr_ratio >= 1.25 ? 'text-green-600' : 'text-yellow-600'
                    )}>
                      {loan.dscr_ratio?.toFixed(2) || '—'}
                    </span>
                  </div>
                </>
              )}
              {loan.loan_type === 'fix_flip' && (
                <>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Rehab Budget</span>
                    <span className="font-medium text-slate-700">{formatCurrency(loan.rehab_budget)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">ARV</span>
                    <span className="font-medium text-slate-700">{formatCurrency(loan.arv)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">LTARV</span>
                    <span className={cn(
                      'font-bold',
                      loan.ltarv && loan.ltarv <= 70 ? 'text-green-600' : 'text-yellow-600'
                    )}>
                      {loan.ltarv ? `${loan.ltarv}%` : '—'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Property Details */}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Property Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Address</span>
                <span className="font-medium text-slate-700 text-right">{loan.property_address}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">City, State</span>
                <span className="font-medium text-slate-700">{loan.property_city}, {loan.property_state}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">ZIP Code</span>
                <span className="font-medium text-slate-700">{loan.property_zip}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Property Type</span>
                <span className="font-medium text-slate-700">{loan.property_type}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Units</span>
                <span className="font-medium text-slate-700">{loan.property_units}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              {loan.created_at && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Clock size={16} className="text-slate-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">Application Created</div>
                    <div className="text-xs text-slate-500">{formatDateTime(loan.created_at)}</div>
                  </div>
                </div>
              )}
              {loan.submitted_at && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Send size={16} className="text-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">Submitted</div>
                    <div className="text-xs text-slate-500">{formatDateTime(loan.submitted_at)}</div>
                  </div>
                </div>
              )}
              {loan.funded_at && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-green-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">Funded</div>
                    <div className="text-xs text-slate-500">{formatDateTime(loan.funded_at)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conditions */}
          {loan.conditions && loan.conditions.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Conditions</h3>
              <div className="space-y-3">
                {loan.conditions.map((condition: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle size={18} className="text-yellow-500 mt-0.5" />
                    <div className="text-sm text-yellow-800">{condition.text || condition}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Required Documents</h3>
            <p className="text-sm text-slate-500 mt-1">
              Upload all required documents to move your application forward
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {docRequirements.map((req) => {
              const doc = getDocStatus(req.document_type)
              const isUploaded = !!doc
              const isUploading = uploadingDoc === req.document_type
              
              return (
                <div key={req.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      isUploaded ? 'bg-green-100' : 'bg-slate-100'
                    )}>
                      {isUploaded ? (
                        <CheckCircle2 size={20} className="text-green-500" />
                      ) : (
                        <FileText size={20} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{req.display_name}</div>
                      <div className="text-sm text-slate-500">
                        {isUploaded ? doc.file_name : req.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isUploading ? (
                      <div className="flex items-center gap-2 text-primary-600">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Uploading...</span>
                      </div>
                    ) : isUploaded ? (
                      <>
                        <span className={cn(
                          'badge',
                          doc.status === 'approved' && 'bg-green-100 text-green-700',
                          doc.status === 'uploaded' && 'bg-blue-100 text-blue-700',
                          doc.status === 'rejected' && 'bg-red-100 text-red-700',
                          doc.status === 'reviewing' && 'bg-yellow-100 text-yellow-700'
                        )}>
                          {doc.status === 'approved' && 'Approved'}
                          {doc.status === 'uploaded' && 'Uploaded'}
                          {doc.status === 'rejected' && 'Rejected'}
                          {doc.status === 'reviewing' && 'Reviewing'}
                        </span>
                        <button className="btn-ghost btn-sm">
                          <Eye size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <label className="btn-secondary btn-sm flex items-center gap-2 cursor-pointer">
                          <Camera size={14} />
                          <span className="hidden sm:inline">Capture</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(req.document_type, file)
                            }}
                          />
                        </label>
                        <label className="btn-primary btn-sm flex items-center gap-2 cursor-pointer">
                          <Upload size={14} />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.heic"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(req.document_type, file)
                            }}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="card flex flex-col h-[500px]">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No messages yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Send a message to communicate with your loan officer
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'max-w-[80%] rounded-lg p-4',
                    msg.sender_type === 'borrower'
                      ? 'ml-auto bg-primary-500 text-white'
                      : 'bg-slate-100 text-slate-900'
                  )}
                >
                  <div className="text-sm">{msg.body}</div>
                  <div className={cn(
                    'text-xs mt-2',
                    msg.sender_type === 'borrower' ? 'text-primary-100' : 'text-slate-400'
                  )}>
                    {formatDateTime(msg.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="border-t border-slate-100 p-4">
            <div className="flex gap-3">
              <input
                type="text"
                className="input flex-1"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="btn-primary btn-md"
              >
                {sendingMessage ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continue Application (if draft) */}
      {loan.status === 'draft' && (
        <div className="card p-6 bg-gradient-to-r from-primary-50 to-cyan-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Continue Your Application</h3>
              <p className="text-sm text-slate-600 mt-1">
                You're on step {loan.current_step} of 4. Pick up where you left off.
              </p>
            </div>
            <Link 
              href={`/apply/${loan.id}`}
              className="btn-primary btn-md"
            >
              Continue Application
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
