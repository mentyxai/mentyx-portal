import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null) return '—'
  return `${value.toFixed(decimals)}%`
}

export function formatDate(date: string | undefined | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatDateTime(date: string | undefined | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function calculateDSCR(
  monthlyRent: number,
  loanAmount: number,
  annualTaxes: number,
  annualInsurance: number,
  monthlyHoa: number = 0,
  interestRate: number = 0.075 // 7.5% default
): number | null {
  if (!monthlyRent || !loanAmount) return null
  
  // Monthly P&I (30-year amortization)
  const monthlyRate = interestRate / 12
  const numPayments = 360
  const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                    (Math.pow(1 + monthlyRate, numPayments) - 1)
  
  const monthlyTaxes = annualTaxes / 12
  const monthlyInsurance = annualInsurance / 12
  const totalPITIA = monthlyPI + monthlyTaxes + monthlyInsurance + monthlyHoa
  
  if (totalPITIA === 0) return null
  
  return monthlyRent / totalPITIA
}

export function calculateLTV(loanAmount: number, propertyValue: number): number | null {
  if (!loanAmount || !propertyValue) return null
  return (loanAmount / propertyValue) * 100
}

export function calculateLTC(loanAmount: number, purchasePrice: number, rehabBudget: number = 0): number | null {
  const totalCost = purchasePrice + rehabBudget
  if (!loanAmount || !totalCost) return null
  return (loanAmount / totalCost) * 100
}

export function calculateLTARV(loanAmount: number, arv: number): number | null {
  if (!loanAmount || !arv) return null
  return (loanAmount / arv) * 100
}

export function getDSCRStatus(dscr: number | null): { label: string; color: string } {
  if (dscr === null) return { label: 'Enter values', color: 'text-gray-400' }
  if (dscr >= 1.25) return { label: 'Excellent', color: 'text-green-600' }
  if (dscr >= 1.0) return { label: 'Acceptable', color: 'text-yellow-600' }
  return { label: 'Below minimum', color: 'text-red-600' }
}

export function getLTVStatus(ltv: number | null, maxLTV: number = 80): { label: string; color: string } {
  if (ltv === null) return { label: 'Enter values', color: 'text-gray-400' }
  if (ltv <= maxLTV) return { label: 'Within limits', color: 'text-green-600' }
  return { label: 'Exceeds limit', color: 'text-red-600' }
}

// File size formatting
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

// Debounce function for auto-save
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Parse currency input (removes $ and commas)
export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[$,]/g, '')) || 0
}

// Format number with commas for display
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}
