
-- Recalculate payments_made for all loans based on actual principal reduction
-- This handles cases where users made large prepayments

UPDATE public.loans
SET payments_made = GREATEST(
  COALESCE((
    SELECT COUNT(*) 
    FROM public.loan_payments 
    WHERE loan_payments.loan_id = loans.id 
      AND loan_payments.status IN ('completed', 'approved')
      AND loan_payments.is_deposit = false
  ), 0),
  CASE 
    -- If monthly payment and principal are available, calculate equivalent payments
    WHEN monthly_payment_amount > 0 AND principal > 0 THEN
      LEAST(
        term_months,
        CEIL(
          (principal - remaining_balance) / 
          NULLIF(
            (monthly_payment_amount - (remaining_balance * (interest_rate / 100 / 12))),
            0
          )
        )
      )
    ELSE 
      COALESCE((
        SELECT COUNT(*) 
        FROM public.loan_payments 
        WHERE loan_payments.loan_id = loans.id 
          AND loan_payments.status IN ('completed', 'approved')
          AND loan_payments.is_deposit = false
      ), 0)
  END
)
WHERE status IN ('active', 'approved')
  AND remaining_balance < principal;

-- Update next payment date based on accurate payments_made
UPDATE public.loans
SET next_payment_date = CASE
  WHEN status = 'active' AND remaining_balance > 0.50 THEN
    (start_date + INTERVAL '1 month' * (payments_made + 1))::date
  ELSE NULL
END
WHERE status IN ('active', 'approved');

-- Set next_payment_date to NULL for paid off loans
UPDATE public.loans
SET next_payment_date = NULL
WHERE remaining_balance <= 0.50
  OR status IN ('completed', 'paid', 'closed');
