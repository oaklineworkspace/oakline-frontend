-- Check what crypto/network combinations exist for this user
SELECT 
  'user_crypto_wallets' as source,
  user_id,
  crypto_type,
  network_type,
  wallet_address,
  LENGTH(wallet_address) as address_length
FROM public.user_crypto_wallets 
WHERE user_id = 'a7b08f08-b141-4899-bf63-38c5b881061a'

UNION ALL

SELECT 
  'admin_assigned_wallets' as source,
  user_id,
  crypto_type,
  network_type,
  wallet_address,
  LENGTH(wallet_address) as address_length
FROM public.admin_assigned_wallets 
WHERE user_id = 'a7b08f08-b141-4899-bf63-38c5b881061a';

-- Also check for any whitespace or case issues
SELECT 
  crypto_type,
  network_type,
  '|' || crypto_type || '|' as crypto_debug,
  '|' || network_type || '|' as network_debug
FROM public.user_crypto_wallets 
WHERE user_id = 'a7b08f08-b141-4899-bf63-38c5b881061a'
LIMIT 5;
