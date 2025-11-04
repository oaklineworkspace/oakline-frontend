export const getCreditScoreTier = (score) => {
  if (!score || score < 300) return { tier: 'No Score', color: '#94a3b8', bgColor: '#f1f5f9', range: 'N/A' };
  if (score >= 750) return { tier: 'Excellent', color: '#10b981', bgColor: '#d1fae5', range: '750-850' };
  if (score >= 700) return { tier: 'Good', color: '#3b82f6', bgColor: '#dbeafe', range: '700-749' };
  if (score >= 650) return { tier: 'Fair', color: '#f59e0b', bgColor: '#fef3c7', range: '650-699' };
  if (score >= 600) return { tier: 'Poor', color: '#f97316', bgColor: '#fed7aa', range: '600-649' };
  return { tier: 'Very Poor', color: '#ef4444', bgColor: '#fee2e2', range: '300-599' };
};

export const getCreditScoreMessage = (score) => {
  if (!score || score < 300) {
    return 'No credit score available. Contact support for assistance.';
  }
  
  const { tier } = getCreditScoreTier(score);
  
  if (score >= 750) {
    return `Your score is ${score} (${tier}). Excellent work! Keep making timely repayments to maintain your outstanding credit.`;
  }
  if (score >= 700) {
    return `Your score is ${score} (${tier}). You're doing well! Continue making timely repayments to reach excellent status.`;
  }
  if (score >= 650) {
    return `Your score is ${score} (${tier}). Keep making timely repayments to improve your score and unlock better rates.`;
  }
  if (score >= 600) {
    return `Your score is ${score} (${tier}). Focus on timely repayments and reducing debt to improve your credit standing.`;
  }
  return `Your score is ${score} (${tier}). Make timely repayments and maintain low balances to rebuild your credit.`;
};

export const formatCreditScoreDate = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};
