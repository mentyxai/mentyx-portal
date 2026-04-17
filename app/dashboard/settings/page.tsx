'use client'

import { useEffect, useState } from 'react'
import { createClient, type Borrower } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { User, Building2, CreditCard, Save, Loader2, Check } from 'lucide-react'

export default function SettingsPage() {
  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    company_name: '',
    company_type: 'LLC',
    ein: '',
    credit_score: '',
    experience_years: '',
    mailing_address: '',
    mailing_city: '',
    mailing_state: '',
    mailing_zip: ''
  })

  useEffect(() => {
    const fetchBorrower = async () => {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: borrowerData } = await supabase
        .from('borrowers')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (borrowerData) {
        setBorrower(borrowerData)
        setFormData({
          first_name: borrowerData.first_name || '',
          last_name: borrowerData.last_name || '',
          phone: borrowerData.phone || '',
          company_name: borrowerData.company_name || '',
          company_type: borrowerData.company_type || 'LLC',
          ein: borrowerData.ein || '',
          credit_score: borrowerData.credit_score?.toString() || '',
          experience_years: borrowerData.experience_years?.toString() || '',
          mailing_address: borrowerData.mailing_address || '',
          mailing_city: borrowerData.mailing_city || '',
          mailing_state: borrowerData.mailing_state || '',
          mailing_zip: borrowerData.mailing_zip || ''
        })
      }
      
      setLoading(false)
    }

    fetchBorrower()
  }, [])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!borrower) return
    
    setSaving(true)
    
    const supabase = createClient()
    
    await supabase
      .from('borrowers')
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        company_name: formData.company_name,
        company_type: formData.company_type,
        ein: formData.ein,
        credit_score: formData.credit_score ? parseInt(formData.credit_score) : null,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        mailing_address: formData.mailing_address,
        mailing_city: formData.mailing_city,
        mailing_state: formData.mailing_state,
        mailing_zip: formData.mailing_zip
      })
      .eq('id', borrower.id)

    setSaving(false)
    setSaved(true)
    
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Personal Info */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <User className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="font-semibold text-slate-900">Personal Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input
                type="text"
                className="input"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                type="text"
                className="input"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input
              type="tel"
              className="input"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input bg-slate-50"
              value={borrower?.email || ''}
              disabled
            />
            <p className="text-xs text-slate-500 mt-1">Contact support to change your email</p>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Building2 className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="font-semibold text-slate-900">Company Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                className="input"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Entity Type</label>
              <select
                className="input"
                value={formData.company_type}
                onChange={(e) => handleChange('company_type', e.target.value)}
              >
                <option value="LLC">LLC</option>
                <option value="Corporation">Corporation</option>
                <option value="Partnership">Partnership</option>
                <option value="Individual">Individual</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">EIN / Tax ID</label>
            <input
              type="text"
              className="input"
              placeholder="XX-XXXXXXX"
              value={formData.ein}
              onChange={(e) => handleChange('ein', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Financial Info */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="font-semibold text-slate-900">Financial Profile</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Credit Score</label>
              <input
                type="number"
                className="input"
                placeholder="740"
                min="300"
                max="850"
                value={formData.credit_score}
                onChange={(e) => handleChange('credit_score', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Years of Experience</label>
              <input
                type="number"
                className="input"
                placeholder="5"
                min="0"
                value={formData.experience_years}
                onChange={(e) => handleChange('experience_years', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mailing Address */}
      <div className="card">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Mailing Address</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Street Address</label>
            <input
              type="text"
              className="input"
              value={formData.mailing_address}
              onChange={(e) => handleChange('mailing_address', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">City</label>
              <input
                type="text"
                className="input"
                value={formData.mailing_city}
                onChange={(e) => handleChange('mailing_city', e.target.value)}
              />
            </div>
            <div>
              <label className="label">State</label>
              <input
                type="text"
                className="input"
                maxLength={2}
                value={formData.mailing_state}
                onChange={(e) => handleChange('mailing_state', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="label">ZIP</label>
              <input
                type="text"
                className="input"
                value={formData.mailing_zip}
                onChange={(e) => handleChange('mailing_zip', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'btn btn-lg inline-flex items-center gap-2',
            saved ? 'bg-green-500 hover:bg-green-600 text-white' : 'btn-primary'
          )}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check size={18} />
              Saved!
            </>
          ) : (
            <>
              <Save size={18} />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  )
}
