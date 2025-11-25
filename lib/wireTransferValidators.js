// Wire Transfer Validators - Extracted for performance
export const validateRoutingNumber = (routing, transferType, country) => {
  if (transferType === 'domestic') {
    if (!routing) return { valid: false, error: 'Routing number is required' };
    const sanitizedRouting = routing.replace(/\s/g, '');
    if (sanitizedRouting.length !== 9) {
      return { valid: false, error: `US routing number must be exactly 9 digits (you entered ${sanitizedRouting.length})` };
    }
    if (!/^\d+$/.test(sanitizedRouting)) {
      return { valid: false, error: 'US routing number must contain only numbers' };
    }
  }
  return { valid: true };
};

export const validateAccountNumber = (accountNumber, transferType) => {
  if (!accountNumber) return { valid: false, error: 'Account number is required' };
  const sanitizedAccount = accountNumber.replace(/\s/g, '');
  if (sanitizedAccount.length < 8 || sanitizedAccount.length > 17) {
    return { valid: false, error: `Account number must be between 8-17 characters (you entered ${sanitizedAccount.length})` };
  }
  if (!/^[a-zA-Z0-9]+$/.test(sanitizedAccount)) {
    return { valid: false, error: 'Account number must contain only letters and numbers' };
  }
  return { valid: true };
};

export const validateSwiftCode = (swiftCode) => {
  if (swiftCode) {
    const swiftPattern = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    if (!swiftPattern.test(swiftCode.trim())) {
      return { valid: false, error: 'Invalid SWIFT code format (e.g., CHASUS33)' };
    }
  }
  return { valid: true };
};

export const validateAmount = (amount) => {
  const numAmount = parseFloat(amount);
  if (!amount || numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (numAmount > 999999999.99) {
    return { valid: false, error: 'Amount exceeds maximum transfer limit' };
  }
  return { valid: true };
};
