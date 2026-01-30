import React, { useState, useCallback } from 'react';
import { X, Target, Calendar, DollarSign, Flag, Tag, Palette, AlertCircle } from 'lucide-react';
import { useCurrency } from '../../../providers/CurrencyProvider';
import { BUTTON_COLORS, INPUT_COLORS, TEXT_COLORS, CONTAINER_COLORS } from '../../../config/colorConfig';

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goalData: any) => Promise<void>;
  isLoading?: boolean;
}

const modalContainer = CONTAINER_COLORS.modal;
const cardContainer = CONTAINER_COLORS.card;
const standardInput = INPUT_COLORS.standard;
const selectInput = INPUT_COLORS.select;
const textareaInput = INPUT_COLORS.textarea;
const primaryButton = BUTTON_COLORS.primary;
const secondaryButton = BUTTON_COLORS.secondary;
const labelText = TEXT_COLORS.label;
const cardTitle = TEXT_COLORS.cardTitle;

const statusOptions = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

const priorityOptions = [
  { value: 1, label: 'High (1)' },
  { value: 2, label: 'Medium (2)' },
  { value: 3, label: 'Low (3)' },
  { value: 4, label: 'Very Low (4)' },
  { value: 5, label: 'Lowest (5)' },
];

const riskLevelOptions = [
  { value: 'VERY_LOW', label: 'Very Low' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'VERY_HIGH', label: 'Very High' },
];

const colorOptions = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
  '#f97316', '#f59e0b', '#eab308', '#22c55e',
  '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6'
];

export function AddGoalModal({ isOpen, onClose, onSubmit, isLoading = false }: AddGoalModalProps) {
  const { currency: userCurrency } = useCurrency();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    targetCompletionDate: '',
    priority: 1,
    status: 'PLANNING',
    category: '',
    tags: '',
    color: '#6366f1',
    notes: '',
    successCriteria: '',
    riskLevel: 'LOW',
    isPublic: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.targetCompletionDate && formData.startDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.targetCompletionDate);
      if (endDate <= startDate) {
        newErrors.targetCompletionDate = 'Target completion date must be after start date';
      }
    }

    if (formData.targetAmount && isNaN(parseFloat(formData.targetAmount))) {
      newErrors.targetAmount = 'Target amount must be a valid number';
    }

    if (formData.targetAmount && parseFloat(formData.targetAmount) < 0) {
      newErrors.targetAmount = 'Target amount cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const goalData = {
        ...formData,
        currency: userCurrency, // Always use user's currency
        targetAmount: formData.targetAmount ? parseFloat(formData.targetAmount) : undefined,
        startDate: new Date(formData.startDate),
        targetCompletionDate: formData.targetCompletionDate ? new Date(formData.targetCompletionDate) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      };

      await onSubmit(goalData);
    } catch (error) {
      console.error('Error submitting goal:', error);
    }
  }, [formData, validateForm, onSubmit]);

  const handleReset = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      targetAmount: '',
      startDate: new Date().toISOString().split('T')[0],
      targetCompletionDate: '',
      priority: 1,
      status: 'PLANNING',
      category: '',
      tags: '',
      color: '#6366f1',
      notes: '',
      successCriteria: '',
      riskLevel: 'LOW',
      isPublic: false,
    });
    setErrors({});
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-750 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Add New Goal
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Create a new financial goal to track your progress.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                onClick={onClose}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-8">
                {/* Basic Information Section */}
                <div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Goal Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className={standardInput}
                        placeholder="e.g., Build Emergency Fund"
                      />
                      {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className={textareaInput}
                        rows={3}
                        placeholder="Describe your goal and why it's important..."
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Information Section */}
                <div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Financial Target
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Amount ({userCurrency})
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.targetAmount}
                          onChange={(e) => handleInputChange('targetAmount', e.target.value)}
                          className={`${standardInput} pl-10`}
                          placeholder="0.00"
                        />
                      </div>
                      {errors.targetAmount && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.targetAmount}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Success Criteria
                      </label>
                      <textarea
                        value={formData.successCriteria}
                        onChange={(e) => handleInputChange('successCriteria', e.target.value)}
                        className={textareaInput}
                        rows={3}
                        placeholder="How will you know when this goal is achieved?"
                      />
                    </div>
                  </div>
                </div>

                {/* Timeline Section */}
                <div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Timeline
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        className={standardInput}
                      />
                      {errors.startDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Completion Date
                      </label>
                      <input
                        type="date"
                        value={formData.targetCompletionDate}
                        onChange={(e) => handleInputChange('targetCompletionDate', e.target.value)}
                        className={standardInput}
                      />
                      {errors.targetCompletionDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.targetCompletionDate}</p>}
                    </div>
                  </div>
                </div>

                {/* Organization Section */}
                <div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Flag className="h-4 w-4 mr-2" />
                    Organization & Settings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Priority
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                        className={selectInput}
                      >
                        {priorityOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className={selectInput}
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Risk Level
                      </label>
                      <select
                        value={formData.riskLevel}
                        onChange={(e) => handleInputChange('riskLevel', e.target.value)}
                        className={selectInput}
                      >
                        {riskLevelOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className={standardInput}
                        placeholder="e.g., Emergency Fund, Investment"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => handleInputChange('tags', e.target.value)}
                        className={standardInput}
                        placeholder="e.g., savings, security, financial"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Color Theme
                      </label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {colorOptions.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleInputChange('color', color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              formData.color === color 
                                ? 'border-gray-900 dark:border-white scale-110' 
                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: color }}
                            title="Select color theme"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information Section */}
                <div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                    Additional Information
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className={textareaInput}
                        rows={3}
                        placeholder="Additional notes about this goal..."
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        id="isPublic"
                        type="checkbox"
                        checked={formData.isPublic}
                        onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isPublic" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                        Make this goal public (visible to others)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 dark:bg-gray-750 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Goal'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}