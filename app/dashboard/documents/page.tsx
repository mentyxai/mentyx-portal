'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, type Document, type Loan, loanTypeLabels } from '@/lib/supabase'
import { formatDate, formatFileSize, cn } from '@/lib/utils'
import { 
  FileText, 
  Upload, 
  Camera, 
  Search, 
  Filter,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  FolderOpen
} from 'lucide-react'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<(Document & { loan?: Loan })[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch all documents
    const { data: docsData } = await supabase
      .from('documents')
      .select('*')
      .eq('borrower_id', user.id)
      .order('created_at', { ascending: false })

    // Fetch loans for reference
    const { data: loansData } = await supabase
      .from('loans')
      .select('*')
      .eq('borrower_id', user.id)

    setLoans(loansData || [])

    // Merge loan data into documents
    const docsWithLoans = (docsData || []).map(doc => {
      const loan = loansData?.find(l => l.id === doc.loan_id)
      return { ...doc, loan }
    })

    setDocuments(docsWithLoans)
    setLoading(false)
  }

  const handleProfileDocUpload = async (file: File, docType: string) => {
    setUploading(true)
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Upload to storage
    const filePath = `${user.id}/profile/${docType}_${Date.now()}_${file.name}`
    
    const { error: uploadError } = await supabase
      .storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      setUploading(false)
      return
    }

    // Create document record
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        loan_id: null,
        borrower_id: user.id,
        document_type: docType,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: filePath,
        status: 'uploaded',
        is_from_profile: true
      })
      .select()
      .single()

    if (!docError && docData) {
      setDocuments(prev => [docData, ...prev])
    }

    setUploading(false)
  }

  const filteredDocs = documents.filter(doc => {
    if (filter !== 'all' && doc.status !== filter) return false
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        doc.file_name.toLowerCase().includes(searchLower) ||
        doc.document_type.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const profileDocs = filteredDocs.filter(d => d.is_from_profile)
  const loanDocs = filteredDocs.filter(d => !d.is_from_profile)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 size={16} className="text-green-500" />
      case 'rejected':
        return <XCircle size={16} className="text-red-500" />
      case 'reviewing':
        return <Clock size={16} className="text-yellow-500" />
      default:
        return <Clock size={16} className="text-blue-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      uploaded: 'bg-blue-100 text-blue-700',
      reviewing: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      pending: 'bg-slate-100 text-slate-600'
    }
    return styles[status] || styles.pending
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-500 mt-1">Manage all your uploaded documents</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search documents..."
            className="input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                'btn btn-sm capitalize',
                filter === f ? 'btn-primary' : 'btn-secondary'
              )}
            >
              {f === 'pending' ? 'Uploaded' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Documents */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Profile Documents</h2>
            <p className="text-sm text-slate-500 mt-1">
              These documents are saved to your profile and can be reused across applications
            </p>
          </div>
          <label className={cn(
            'btn-primary btn-sm flex items-center gap-2 cursor-pointer',
            uploading && 'opacity-50 pointer-events-none'
          )}>
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            Upload New
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  // For demo, default to entity_docs type
                  handleProfileDocUpload(file, 'entity_docs')
                }
              }}
            />
          </label>
        </div>

        {profileDocs.length === 0 ? (
          <div className="p-8 text-center">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No profile documents yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Upload entity docs, ID, and other reusable documents
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {profileDocs.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <FileText size={20} className="text-primary-500" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{doc.file_name}</div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size || 0)}</span>
                      <span>•</span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('badge', getStatusBadge(doc.status))}>
                    {doc.status}
                  </span>
                  <button className="btn-ghost btn-sm">
                    <Eye size={16} />
                  </button>
                  <button className="btn-ghost btn-sm">
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loan Documents */}
      <div className="card">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Loan Documents</h2>
          <p className="text-sm text-slate-500 mt-1">
            Documents uploaded for specific loan applications
          </p>
        </div>

        {loanDocs.length === 0 ? (
          <div className="p-8 text-center">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No loan documents yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Documents uploaded during loan applications will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {loanDocs.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{doc.file_name}</div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                      <span>•</span>
                      {doc.loan && (
                        <>
                          <Link 
                            href={`/dashboard/loans/${doc.loan.id}`}
                            className="text-primary-600 hover:underline"
                          >
                            {doc.loan.property_address || 'Loan'}
                          </Link>
                          <span>•</span>
                        </>
                      )}
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusIcon(doc.status)}
                  <span className={cn('badge', getStatusBadge(doc.status))}>
                    {doc.status}
                  </span>
                  <button className="btn-ghost btn-sm">
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
