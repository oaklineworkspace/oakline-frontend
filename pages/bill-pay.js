
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function BillPay() {
  // ... (keep your state & logic unchanged)

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <Link href="/" style={styles.logoContainer}>
          <img src="/images/logo-primary.png.jpg" alt="Oakline Bank" style={styles.logo} />
          <span style={styles.logoText}>Oakline Bank</span>
        </Link>
        <div style={styles.headerInfo}>
          <div style={styles.routingInfo}>Routing Number: 075915826</div>
          <Link href="/dashboard" style={styles.backButton}>← Back to Dashboard</Link>
        </div>
      </header>

      <main style={styles.content}>
        {/* Title Section */}
        <section style={styles.titleSection}>
          <h1 style={styles.title}>🧾 Bill Pay</h1>
          <p style={styles.subtitle}>Manage and pay your bills with security and ease</p>
        </section>

        {/* Features */}
        <section style={styles.infoCard}>
          <h3 style={styles.infoTitle}>💡 Why Use Bill Pay?</h3>
          <div style={styles.featureGrid}>
            <Feature icon="📅" text="Schedule Future Payments" />
            <Feature icon="🔄" text="Set Recurring Payments" />
            <Feature icon="📧" text="Email Confirmations" />
            <Feature icon="🔒" text="Bank-Level Security" />
          </div>
        </section>

        {/* Messages */}
        {message && (
          <div
            style={{
              ...styles.message,
              backgroundColor: message.includes('✅') ? '#ecfdf5' : '#fef2f2',
              color: message.includes('✅') ? '#065f46' : '#991b1b',
              borderColor: message.includes('✅') ? '#6ee7b7' : '#fca5a5'
            }}
          >
            {message}
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handlePayment} style={styles.form}>
          <h3 style={styles.formTitle}>💳 Schedule a Payment</h3>

          {/* Accounts */}
          <FormGroup label="Pay From Account *">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              style={styles.select}
              required
            >
              <option value="">Select Account</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_name || account.account_type?.toUpperCase()} • 
                  ****{account.account_number?.slice(-4)} • 
                  {formatCurrency(account.balance || 0)}
                </option>
              ))}
            </select>
          </FormGroup>

          {/* Payees */}
          <FormGroup label="Pay To *">
            <div style={styles.payeeSection}>
              <select
                value={selectedPayee}
                onChange={(e) => setSelectedPayee(e.target.value)}
                style={styles.select}
                required
              >
                <option value="">Select Payee</option>
                {payees.map(payee => (
                  <option key={payee.id} value={payee.id}>
                    {payee.name} {payee.category && `(${payee.category})`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddPayee(!showAddPayee)}
                style={styles.addPayeeButton}
              >
                + Add Payee
              </button>
            </div>
          </FormGroup>

          {/* Add Payee Form */}
          {showAddPayee && (
            <div style={styles.addPayeeForm}>
              <h4 style={styles.addPayeeTitle}>➕ New Payee</h4>
              <div style={styles.payeeGrid}>
                {['name', 'address', 'phone', 'accountNumber'].map(field => (
                  <input
                    key={field}
                    type="text"
                    placeholder={field === 'name' ? 'Payee Name *' : field.charAt(0).toUpperCase() + field.slice(1)}
                    value={newPayee[field]}
                    onChange={(e) => setNewPayee({ ...newPayee, [field]: e.target.value })}
                    style={styles.input}
                  />
                ))}
              </div>
              <div style={styles.payeeActions}>
                <button type="button" onClick={handleAddPayee} style={styles.savePayeeButton}>Save</button>
                <button type="button" onClick={() => setShowAddPayee(false)} style={styles.cancelButton}>Cancel</button>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div style={styles.formRow}>
            <FormGroup label="Amount ($) *">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                style={styles.input}
                placeholder="0.00"
                required
              />
            </FormGroup>
            <FormGroup label="Payment Date *">
              <input
                type="date"
                value={paymentData.scheduledDate}
                onChange={(e) => setPaymentData({...paymentData, scheduledDate: e.target.value})}
                style={styles.input}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </FormGroup>
          </div>

          {/* Memo */}
          <FormGroup label="Memo (Optional)">
            <input
              type="text"
              value={paymentData.memo}
              onChange={(e) => setPaymentData({...paymentData, memo: e.target.value})}
              style={styles.input}
              placeholder="Payment reference or notes"
            />
          </FormGroup>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '🔄 Processing...' : '💳 Confirm Payment'}
          </button>
        </form>

        {/* Security Info */}
        <section style={styles.securityNote}>
          <h4 style={styles.securityTitle}>🔒 Security Guarantee</h4>
          <ul style={styles.securityList}>
            <li>All payments are encrypted and processed securely</li>
            <li>Payments scheduled after 3 PM may process the next business day</li>
            <li>You can modify or cancel up to 1 business day before</li>
            <li>Confirmation receipts will be sent to your email</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

/* ✅ Small reusable helpers */
function FormGroup({ label, children }) {
  return (
    <div style={styles.formGroup}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function Feature({ icon, text }) {
  return (
    <div style={styles.feature}>
      <span style={styles.featureIcon}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
