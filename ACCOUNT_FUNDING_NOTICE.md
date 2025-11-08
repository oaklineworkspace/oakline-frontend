# Account Funding Notice Feature

## Overview
Automatically displays prominent notices to users when they have accounts that require funding to be activated.

## Implementation

### What Was Built
1. **FundingNotice Component** (`components/FundingNotice.js`)
   - Displays warning banner for accounts with `status = 'pending_funding'`
   - Shows account type, minimum deposit amount, and accepted currencies
   - Includes a clear call-to-action button to make deposits
   - Responsive design with animations

2. **Integration Points**
   - **Dashboard** (`pages/dashboard.js`): Notices appear prominently below the account summary
   - **Account Details** (`pages/account-details.js`): Notices appear after the balance card

### How It Works
When a page loads, the component:
1. Filters accounts to find those with `status === 'pending_funding'`
2. For each pending funding account, displays a notice with:
   - Account type
   - Minimum deposit amount (from `min_deposit` field)
   - Accepted currencies (USD, BTC, USDT, ETH, etc.)
   - Account number
   - "Make Deposit Now" button (links to `/crypto-deposit`)

### Visual Design
- **Color Scheme**: Warning yellow/orange gradient for visibility
- **Icon**: Animated warning emoji with pulse effect
- **Layout**: Card-based design with clear sections
- **Responsive**: Adapts to mobile and desktop screens

### Database Architecture Decision

**Question**: Should we use one table or separate tables for:
1. Minimum deposit for account opening
2. General account funding

**Answer**: **Use SEPARATE tables** (current design is optimal)

#### Current Tables:
1. **`account_opening_crypto_deposits`** - For minimum deposits to activate new accounts
   - Tied to account opening workflow (`application_id`, `account_id`)
   - Specific approval flow and required confirmations
   - Tracks if deposit meets minimum requirement
   - Status transitions specific to account activation

2. **`admin_assigned_wallets`** + regular deposits - For funding active accounts
   - General purpose funding after account is already active
   - Different workflow and requirements

#### Benefits of Separate Tables:
✅ **Clear separation of concerns** - Opening deposits vs. regular funding
✅ **Different approval workflows** don't interfere with each other
✅ **Easier auditing** - Can track account openings separately
✅ **Prevents confusion** - Users and admins know which deposits are for activation
✅ **Specific fields** - Each table has fields tailored to its purpose
✅ **Better reporting** - Can easily generate reports on account openings
✅ **Compliance** - Regulatory requirements may differ for opening vs. funding

### Usage

The component automatically displays when:
- User has an account with `status = 'pending_funding'`
- The account has a `min_deposit` value set
- User visits the dashboard or account details page

### Customization

To modify the accepted currencies, edit the `FundingNotice` component:
```javascript
<div className={styles.detailItem}>
  <span className={styles.label}>Accepted Currency:</span>
  <span className={styles.value}>USD, BTC, USDT, ETH, and more</span>
</div>
```

To change the deposit link, modify the `handleDepositClick` function:
```javascript
const handleDepositClick = () => {
  router.push('/crypto-deposit'); // Change this URL
};
```

### Testing

To test the notice:
1. Create an account with `status = 'pending_funding'`
2. Set the `min_deposit` field to a value (e.g., 500)
3. Log in as the user
4. Navigate to dashboard or account details page
5. The funding notice should appear prominently

### Future Enhancements

Potential improvements:
- Email notifications for pending funding accounts
- Countdown timer for time-sensitive activations
- Integration with specific crypto deposit flows
- Auto-dismiss when deposit is completed
- Multi-currency display based on user preference
