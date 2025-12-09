
-- Fix loan payments_made count based on actual completed payments
UPDATE public.loans
SET payments_made = (
  SELECT COUNT(*)
  FROM public.loan_payments
  WHERE loan_payments.loan_id = loans.id
    AND loan_payments.status IN ('completed', 'approved')
    AND loan_payments.is_deposit = false
)
WHERE id IN (
  SELECT DISTINCT loan_id 
  FROM public.loan_payments
  WHERE status IN ('completed', 'approved')
);

-- Update loans with zero payments_made if they have no completed payments
UPDATE public.loans
SET payments_made = 0
WHERE payments_made IS NULL
  OR payments_made < 0;
