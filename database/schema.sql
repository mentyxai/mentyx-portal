-- ============================================================================
-- MENTYX BORROWER PORTAL - DATABASE SCHEMA
-- ============================================================================
-- Run this in Supabase SQL Editor to set up your database
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Borrowers (extends Supabase auth.users)
CREATE TABLE public.borrowers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  company_type TEXT, -- LLC, Corp, Individual
  ein TEXT,
  credit_score INTEGER,
  experience_years INTEGER,
  properties_owned INTEGER DEFAULT 0,
  mailing_address TEXT,
  mailing_city TEXT,
  mailing_state TEXT,
  mailing_zip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
  
  -- Basic Info
  loan_type TEXT NOT NULL CHECK (loan_type IN ('dscr', 'fix_flip', 'bridge')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'in_review', 'approved', 'denied', 
    'clear_to_close', 'funded', 'withdrawn'
  )),
  
  -- Property Info
  property_address TEXT,
  property_city TEXT,
  property_state TEXT,
  property_zip TEXT,
  property_type TEXT, -- SFR, 2-4 Unit, Condo, etc.
  property_units INTEGER DEFAULT 1,
  
  -- Purchase/Loan Details
  purchase_price DECIMAL(12,2),
  down_payment DECIMAL(12,2),
  loan_amount DECIMAL(12,2),
  
  -- DSCR Specific
  monthly_rent DECIMAL(10,2),
  annual_taxes DECIMAL(10,2),
  annual_insurance DECIMAL(10,2),
  monthly_hoa DECIMAL(10,2) DEFAULT 0,
  dscr_ratio DECIMAL(4,2),
  
  -- Fix & Flip Specific
  rehab_budget DECIMAL(12,2),
  arv DECIMAL(12,2), -- After Repair Value
  ltv DECIMAL(5,2),  -- Loan to Value
  ltc DECIMAL(5,2),  -- Loan to Cost
  ltarv DECIMAL(5,2), -- Loan to ARV
  rehab_timeline_months INTEGER,
  exit_strategy TEXT,
  
  -- Bridge Specific
  payoff_source TEXT,
  takeout_lender TEXT,
  
  -- Calculated Fields
  estimated_rate DECIMAL(5,3),
  estimated_monthly_payment DECIMAL(10,2),
  
  -- Application Progress
  current_step INTEGER DEFAULT 1,
  form_data JSONB DEFAULT '{}', -- Stores all form fields for auto-save
  last_saved_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  funded_at TIMESTAMPTZ,
  
  -- Notes
  internal_notes TEXT,
  borrower_notes TEXT,
  conditions JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
  
  -- Document Info
  document_type TEXT NOT NULL, -- purchase_contract, bank_statement, id, entity_docs, etc.
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT, -- pdf, jpg, png
  storage_path TEXT, -- Supabase storage path
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'uploaded', 'reviewing', 'approved', 'rejected'
  )),
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  
  -- Metadata
  is_from_profile BOOLEAN DEFAULT FALSE, -- Re-used from borrower profile
  expires_at TIMESTAMPTZ, -- For docs that expire (like bank statements)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Requirements (what's needed per loan type)
CREATE TABLE public.document_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_type TEXT NOT NULL,
  document_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  UNIQUE(loan_type, document_type)
);

-- Activity Log (audit trail)
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
  borrower_id UUID REFERENCES public.borrowers(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- created, updated, submitted, status_changed, document_uploaded, etc.
  details JSONB,
  performed_by UUID, -- user who did the action
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (borrower <-> lender communication)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('borrower', 'lender')),
  
  subject TEXT,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- status_change, document_request, message, reminder
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Delivery tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  sms_sent BOOLEAN DEFAULT FALSE,
  sms_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_loans_borrower ON public.loans(borrower_id);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_loans_type ON public.loans(loan_type);
CREATE INDEX idx_documents_loan ON public.documents(loan_id);
CREATE INDEX idx_documents_borrower ON public.documents(borrower_id);
CREATE INDEX idx_activity_loan ON public.activity_log(loan_id);
CREATE INDEX idx_messages_loan ON public.messages(loan_id);
CREATE INDEX idx_notifications_borrower ON public.notifications(borrower_id);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Borrowers can only see their own data
CREATE POLICY "Borrowers can view own profile" ON public.borrowers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Borrowers can update own profile" ON public.borrowers
  FOR UPDATE USING (auth.uid() = id);

-- Loans - borrowers see their own
CREATE POLICY "Borrowers can view own loans" ON public.loans
  FOR SELECT USING (auth.uid() = borrower_id);

CREATE POLICY "Borrowers can insert own loans" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = borrower_id);

CREATE POLICY "Borrowers can update own loans" ON public.loans
  FOR UPDATE USING (auth.uid() = borrower_id);

-- Documents - borrowers see their own
CREATE POLICY "Borrowers can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = borrower_id);

CREATE POLICY "Borrowers can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = borrower_id);

CREATE POLICY "Borrowers can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = borrower_id);

-- Messages
CREATE POLICY "Borrowers can view own messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.loans 
      WHERE loans.id = messages.loan_id 
      AND loans.borrower_id = auth.uid()
    )
  );

CREATE POLICY "Borrowers can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_type = 'borrower' AND sender_id = auth.uid()
  );

-- Notifications
CREATE POLICY "Borrowers can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = borrower_id);

CREATE POLICY "Borrowers can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = borrower_id);


-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER borrowers_updated_at
  BEFORE UPDATE ON public.borrowers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate DSCR automatically
CREATE OR REPLACE FUNCTION calculate_dscr()
RETURNS TRIGGER AS $$
DECLARE
  monthly_pi DECIMAL;
  monthly_taxes DECIMAL;
  monthly_insurance DECIMAL;
  monthly_hoa DECIMAL;
  total_pitia DECIMAL;
BEGIN
  IF NEW.loan_type = 'dscr' AND NEW.monthly_rent IS NOT NULL THEN
    -- Estimate monthly P&I (assuming 7.5% rate, 30 year)
    monthly_pi := COALESCE(NEW.loan_amount, 0) * 0.007;
    monthly_taxes := COALESCE(NEW.annual_taxes, 0) / 12;
    monthly_insurance := COALESCE(NEW.annual_insurance, 0) / 12;
    monthly_hoa := COALESCE(NEW.monthly_hoa, 0);
    
    total_pitia := monthly_pi + monthly_taxes + monthly_insurance + monthly_hoa;
    
    IF total_pitia > 0 THEN
      NEW.dscr_ratio := ROUND(NEW.monthly_rent / total_pitia, 2);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loans_calculate_dscr
  BEFORE INSERT OR UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION calculate_dscr();

-- Calculate LTV/LTC/LTARV for Fix & Flip
CREATE OR REPLACE FUNCTION calculate_ltv_ltc()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.loan_type = 'fix_flip' THEN
    -- LTV = Loan / Purchase Price
    IF NEW.purchase_price > 0 THEN
      NEW.ltv := ROUND((NEW.loan_amount / NEW.purchase_price) * 100, 2);
    END IF;
    
    -- LTC = Loan / (Purchase + Rehab)
    IF (NEW.purchase_price + COALESCE(NEW.rehab_budget, 0)) > 0 THEN
      NEW.ltc := ROUND((NEW.loan_amount / (NEW.purchase_price + COALESCE(NEW.rehab_budget, 0))) * 100, 2);
    END IF;
    
    -- LTARV = Loan / ARV
    IF NEW.arv > 0 THEN
      NEW.ltarv := ROUND((NEW.loan_amount / NEW.arv) * 100, 2);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loans_calculate_ltv
  BEFORE INSERT OR UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION calculate_ltv_ltc();

-- Log activity on loan status change
CREATE OR REPLACE FUNCTION log_loan_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (loan_id, borrower_id, action, details)
    VALUES (NEW.id, NEW.borrower_id, 'loan_created', jsonb_build_object('loan_type', NEW.loan_type));
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.activity_log (loan_id, borrower_id, action, details)
    VALUES (NEW.id, NEW.borrower_id, 'status_changed', jsonb_build_object(
      'from', OLD.status,
      'to', NEW.status
    ));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loans_activity_log
  AFTER INSERT OR UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION log_loan_activity();


-- ============================================================================
-- SEED DATA: Document Requirements
-- ============================================================================

INSERT INTO public.document_requirements (loan_type, document_type, display_name, description, is_required, sort_order) VALUES
-- DSCR Documents
('dscr', 'purchase_contract', 'Purchase Contract', 'Fully executed purchase agreement', true, 1),
('dscr', 'lease_agreement', 'Lease Agreement or Rent Schedule', 'Current lease or market rent analysis', true, 2),
('dscr', 'entity_docs', 'Entity Documents', 'LLC operating agreement or corporate docs', true, 3),
('dscr', 'photo_id', 'Government ID', 'Driver''s license or passport', true, 4),
('dscr', 'bank_statements', 'Bank Statements (2 months)', 'Most recent 2 months of bank statements', true, 5),
('dscr', 'insurance_quote', 'Insurance Quote', 'Property insurance quote or binder', false, 6),

-- Fix & Flip Documents
('fix_flip', 'purchase_contract', 'Purchase Contract', 'Fully executed purchase agreement', true, 1),
('fix_flip', 'rehab_budget', 'Rehab Budget / Scope of Work', 'Detailed renovation budget and timeline', true, 2),
('fix_flip', 'entity_docs', 'Entity Documents', 'LLC operating agreement or corporate docs', true, 3),
('fix_flip', 'photo_id', 'Government ID', 'Driver''s license or passport', true, 4),
('fix_flip', 'bank_statements', 'Bank Statements (2 months)', 'Proof of funds for down payment and reserves', true, 5),
('fix_flip', 'contractor_info', 'Contractor Information', 'Licensed contractor details and references', false, 6),
('fix_flip', 'project_photos', 'Property Photos', 'Current condition photos of the property', false, 7),

-- Bridge Documents
('bridge', 'purchase_contract', 'Purchase Contract', 'Fully executed purchase agreement', true, 1),
('bridge', 'exit_strategy', 'Exit Strategy Documentation', 'Proof of takeout financing or sale plan', true, 2),
('bridge', 'entity_docs', 'Entity Documents', 'LLC operating agreement or corporate docs', true, 3),
('bridge', 'photo_id', 'Government ID', 'Driver''s license or passport', true, 4),
('bridge', 'bank_statements', 'Bank Statements (2 months)', 'Most recent 2 months of bank statements', true, 5),
('bridge', 'payoff_statement', 'Payoff Statement', 'Current loan payoff if refinancing', false, 6);


-- ============================================================================
-- SEED DATA: Demo Borrower & Loans (for Focus DSCR demo)
-- ============================================================================
-- NOTE: You'll need to create the auth user first, then run these with that user's ID

-- This creates a demo borrower profile
-- IMPORTANT: Replace 'DEMO_USER_ID' with actual auth.users id after creating the user
-- Or run the seed script from the app after signup

-- Demo data will be inserted via the app's seed endpoint


-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Run these in Supabase Dashboard > Storage

-- CREATE BUCKET: documents (for loan documents)
-- Settings: Public = false, File size limit = 10MB
-- Allowed MIME types: application/pdf, image/jpeg, image/png, image/heic

-- RLS Policy for documents bucket:
-- CREATE POLICY "Borrowers can upload own documents"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'documents' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- CREATE POLICY "Borrowers can view own documents"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'documents' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );
