
-- Recalculate payments_made for all loans based on actual payments
-- This ensures consistency when large payments are made

UPDATE public.loans
SET payments_made = COALESCE((
  SELECT 
    CASE 
      -- For loans with completed payments, calculate based on principal paid
      WHEN COUNT(*) > 0 AND monthly_payment_amount > 0 THEN
        GREATEST(
          COUNT(*) FILTER (WHERE status IN ('completed', 'approved') AND is_deposit = false),
          FLOOR(
            SUM(principal_amount) FILTER (WHERE status IN ('completed', 'approved') AND is_deposit = false) / 
            NULLIF(
              (monthly_payment_amount - (remaining_balance * (interest_rate / 100 / 12))),
              0
            )
          )
        )
      ELSE 
        COUNT(*) FILTER (WHERE status IN ('completed', 'approved') AND is_deposit = false)
    END
  FROM public.loan_payments
  WHERE loan_payments.loan_id = loans.id
), 0)
WHERE id IN (
  SELECT DISTINCT loan_id 
  FROM public.loan_payments
  WHERE status IN ('completed', 'approved')
);

-- Update next_payment_date based on recalculated payments_made
UPDATE public.loans
SET next_payment_date = CASE
  WHEN status = 'active' AND remaining_balance > 0.01 THEN
    (start_date + INTERVAL '1 month' * (payments_made + 1))::date
  ELSE NULL
END
WHERE status IN ('active', 'approved')
  AND remaining_balance > 0.01;

-- Set next_payment_date to NULL for fully paid loans
UPDATE public.loans
SET next_payment_date = NULL
WHERE remaining_balance <= 0.01
  OR status IN ('completed', 'paid', 'closed');
