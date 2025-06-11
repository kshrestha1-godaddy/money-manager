import { DebtInterface } from "../types/debts";

export interface DebtFormData {
  borrowerName: string;
  borrowerContact: string;
  borrowerEmail: string;
  amount: number;
  interestRate: number;
  dueDate: string;
  lentDate: string;
  status: DebtInterface['status'];
  purpose: string;
  notes: string;
  accountId: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export function validateDebtForm(formData: DebtFormData): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!formData.borrowerName?.trim()) {
    errors.push({ field: 'borrowerName', message: 'Borrower name is required' });
  } else if (formData.borrowerName.trim().length < 2) {
    errors.push({ field: 'borrowerName', message: 'Borrower name must be at least 2 characters long' });
  } else if (formData.borrowerName.trim().length > 100) {
    errors.push({ field: 'borrowerName', message: 'Borrower name cannot exceed 100 characters' });
  }

  // Amount validation
  if (!formData.amount || formData.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be greater than 0' });
  } else if (!isFinite(formData.amount)) {
    errors.push({ field: 'amount', message: 'Please enter a valid amount' });
  } else if (formData.amount > 999999999.99) {
    errors.push({ field: 'amount', message: 'Amount is too large (maximum: 999,999,999.99)' });
  } else {
    // Check decimal places
    const amountStr = formData.amount.toString();
    if (amountStr.includes('.')) {
      const decimalPart = amountStr.split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        errors.push({ field: 'amount', message: 'Amount cannot have more than 2 decimal places' });
      }
    }
  }

  // Interest rate validation
  if (formData.interestRate < 0) {
    errors.push({ field: 'interestRate', message: 'Interest rate cannot be negative' });
  } else if (formData.interestRate > 100) {
    errors.push({ field: 'interestRate', message: 'Interest rate cannot exceed 100%' });
  } else if (!isFinite(formData.interestRate)) {
    errors.push({ field: 'interestRate', message: 'Please enter a valid interest rate' });
  }

  // Email validation (if provided)
  if (formData.borrowerEmail && formData.borrowerEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.borrowerEmail.trim())) {
      errors.push({ field: 'borrowerEmail', message: 'Please enter a valid email address' });
    }
  }

  // Phone validation (if provided)
  if (formData.borrowerContact && formData.borrowerContact.trim()) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanedPhone = formData.borrowerContact.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      errors.push({ field: 'borrowerContact', message: 'Please enter a valid phone number' });
    }
  }

  // Date validations
  if (!formData.lentDate) {
    errors.push({ field: 'lentDate', message: 'Lent date is required' });
  } else {
    const lentDate = new Date(formData.lentDate);
    if (isNaN(lentDate.getTime())) {
      errors.push({ field: 'lentDate', message: 'Please enter a valid lent date' });
    } else if (lentDate > new Date()) {
      errors.push({ field: 'lentDate', message: 'Lent date cannot be in the future' });
    }
  }

  if (formData.dueDate && formData.dueDate.trim()) {
    const dueDate = new Date(formData.dueDate);
    const lentDate = new Date(formData.lentDate);
    
    if (isNaN(dueDate.getTime())) {
      errors.push({ field: 'dueDate', message: 'Please enter a valid due date' });
    } else if (!isNaN(lentDate.getTime()) && dueDate <= lentDate) {
      errors.push({ field: 'dueDate', message: 'Due date must be after the lent date' });
    }
  }

  // Purpose and notes length validation
  if (formData.purpose && formData.purpose.length > 500) {
    errors.push({ field: 'purpose', message: 'Purpose cannot exceed 500 characters' });
  }

  if (formData.notes && formData.notes.length > 1000) {
    errors.push({ field: 'notes', message: 'Notes cannot exceed 1000 characters' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateRepaymentAmount(amount: number, remainingAmount: number): ValidationResult {
  const errors: ValidationError[] = [];

  if (!amount || amount <= 0) {
    errors.push({ field: 'amount', message: 'Repayment amount must be greater than 0' });
  } else if (!isFinite(amount)) {
    errors.push({ field: 'amount', message: 'Please enter a valid amount' });
  } else if (amount > remainingAmount) {
    errors.push({ 
      field: 'amount', 
      message: `Repayment amount cannot exceed remaining debt of ${remainingAmount.toFixed(2)}` 
    });
  } else if (amount > 999999999.99) {
    errors.push({ field: 'amount', message: 'Amount is too large' });
  } else {
    // Check decimal places
    const amountStr = amount.toString();
    if (amountStr.includes('.')) {
      const decimalPart = amountStr.split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        errors.push({ field: 'amount', message: 'Amount cannot have more than 2 decimal places' });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function sanitizeFormData(formData: DebtFormData): DebtFormData {
  return {
    ...formData,
    borrowerName: formData.borrowerName.trim(),
    borrowerContact: formData.borrowerContact.trim(),
    borrowerEmail: formData.borrowerEmail.trim(),
    purpose: formData.purpose.trim(),
    notes: formData.notes.trim(),
  };
} 