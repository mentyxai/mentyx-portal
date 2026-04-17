'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, type Borrower } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  FileText, 
  FolderOpen, 
  Bell, 
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      const { data: borrowerData } = await supabase
        .from('borrowers')
        .select('*')
        .eq('id', user.id)
        .single()

      setBorrower(borrowerData)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/loans', label: 'My Loans', icon: FileText },
    { href: '/dashboard/documents', label: 'Documents', icon: FolderOpen },
  ]

  const initials = borrower 
    ? `${borrower.first_name?.[0] || ''}${borrower.last_name?.[0] || ''}`.toUpperCase()
    : 'U'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-navy-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-white font-semibold">Focus DSCR</div>
                <div className="text-primary-400 text-[10px] tracking-wider uppercase">Investor Portal</div>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 hover:bg-white/10 rounded-lg p-1.5 pr-3 transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {initials}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-white">
                      {borrower?.first_name} {borrower?.last_name}
                    </div>
                    <div className="text-xs text-white/60 truncate max-w-[120px]">
                      {borrower?.company_name || borrower?.email}
                    </div>
                  </div>
                  <ChevronDown size={16} className="text-white/60 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-elevated border border-slate-200 py-2 z-50 animate-fade-in">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <div className="font-medium text-slate-900">
                          {borrower?.first_name} {borrower?.last_name}
                        </div>
                        <div className="text-sm text-slate-500 truncate">
                          {borrower?.email}
                        </div>
                      </div>
                      <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings size={16} />
                        Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 py-2 px-4 animate-slide-up">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
