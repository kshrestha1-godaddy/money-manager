"use client";

import React, { useState, useEffect } from 'react';
import { X, Target, Calendar, DollarSign } from 'lucide-react';
import { BudgetTarget } from '../../../types/financial';
import { BudgetTargetFormData } from '../../../hooks/useBudgetTracking';
import { useCurrency } from '../../../providers/CurrencyProvider';
import { formatCurrency } from '../../../utils/currency';

interface BudgetTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BudgetTargetFormData) => void;
  target?: BudgetTarget | null;
  isLoading?: boolean;
}

export function BudgetTargetModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  target, 
  isLoading = false 
}: BudgetTargetModalProps) {
  const { currency } = useCurrency();
  const [formData, setFormData] = useState<BudgetTargetFormData>({
    name: '',
    targetAmount: 0,
    period: 'MONTHLY',
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or target changes
  useEffect(() => {
    if (isOpen) {
      if (target) {
        setFormData({
          name: target.name,
          targetAmount: target.targetAmount,
          period: target.period,
          startDate: target.startDate,
          endDate: target.endDate,
        });
      } else {
        setFormData({
          name: '',
          targetAmount: 0,
          period: 'MONTHLY',
          startDate: new Date(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        });
      }
      setErrors({});
    }
  }, [isOpen, target]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }

    if (formData.targetAmount <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0';
    }

    if (formData.startDate >= formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof BudgetTargetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculateImpliedAnnual = () => {
    switch (formData.period) {
      case 'WEEKLY':
        return formData.targetAmount * 52;
      case 'MONTHLY':
        return formData.targetAmount * 12;
      case 'QUARTERLY':
        return formData.targetAmount * 4;
      case 'YEARLY':
        return formData.targetAmount;
      default:
        return formData.targetAmount * 12;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {target ? 'Edit Budget Target' : 'Create Budget Target'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Category Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Food, Transportation, Entertainment"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Target Amount */}
          <div>
            <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Target Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                id="targetAmount"
                value={formData.targetAmount || ''}
                onChange={(e) => handleInputChange('targetAmount', parseFloat(e.target.value) || 0)}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.targetAmount ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={isLoading}
              />
            </div>
            {errors.targetAmount && (
              <p className="mt-1 text-sm text-red-600">{errors.targetAmount}</p>
            )}
          </div>

          {/* Period */}
          <div>
            <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-2">
              Budget Period
            </label>
            <select
              id="period"
              value={formData.period}
              onChange={(e) => handleInputChange('period', e.target.value as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  id="startDate"
                  value={formData.startDate.toISOString().split('T')[0]}
                  onChange={(e) => handleInputChange('startDate', new Date(e.target.value))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  id="endDate"
                  value={formData.endDate.toISOString().split('T')[0]}
                  onChange={(e) => handleInputChange('endDate', new Date(e.target.value))}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Implied Annual Amount */}
          {formData.targetAmount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Budget Preview</span>
              </div>
              <div className="text-sm text-blue-700">
                <p>
                  <span className="font-medium">{formData.period.toLowerCase()} target:</span>{' '}
                  {formatCurrency(formData.targetAmount, currency)}
                </p>
                <p>
                  <span className="font-medium">Implied annual spend:</span>{' '}
                  {formatCurrency(calculateImpliedAnnual(), currency)}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : target ? 'Update Target' : 'Create Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
