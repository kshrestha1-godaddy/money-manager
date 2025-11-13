"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calculator as CalcIcon, Delete } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset calculator when modal opens
  useEffect(() => {
    if (isOpen) {
      handleClear();
    }
  }, [isOpen]);

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const handleNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleBackspace = () => {
    if (!waitingForOperand && display !== '0') {
      const newDisplay = display.slice(0, -1);
      setDisplay(newDisplay === '' ? '0' : newDisplay);
    }
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      let newValue = currentValue;

      switch (operation) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '×':
          newValue = currentValue * inputValue;
          break;
        case '÷':
          newValue = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
        case '%':
          newValue = currentValue % inputValue;
          break;
      }

      setPreviousValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const handleOperation = (nextOperation: string) => {
    performOperation(nextOperation);
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      performOperation('=');
      setOperation(null);
      setPreviousValue(null);
    }
  };

  const handlePercentage = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const handleNegate = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

      if (e.key >= '0' && e.key <= '9') {
        handleNumber(e.key);
      } else if (e.key === '.') {
        handleDecimal();
      } else if (e.key === '+') {
        handleOperation('+');
      } else if (e.key === '-') {
        handleOperation('-');
      } else if (e.key === '*') {
        handleOperation('×');
      } else if (e.key === '/') {
        handleOperation('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        handleEquals();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'c' || e.key === 'C') {
        handleClear();
      } else if (e.key === '%') {
        handlePercentage();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, previousValue, operation, waitingForOperand]);

  if (!isOpen || !mounted) return null;

  const Button = ({ 
    children, 
    onClick, 
    className = '',
    variant = 'default' 
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    className?: string;
    variant?: 'default' | 'operation' | 'equals' | 'clear';
  }) => {
    const baseClass = 'flex items-center justify-center rounded-xl font-semibold text-lg transition-all active:scale-95';
    const variantClasses = {
      default: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
      operation: 'bg-purple-100 hover:bg-purple-200 text-purple-700',
      equals: 'bg-purple-600 hover:bg-purple-700 text-white',
      clear: 'bg-red-100 hover:bg-red-200 text-red-700'
    };

    return (
      <button
        onClick={onClick}
        className={`${baseClass} ${variantClasses[variant]} ${className}`}
      >
        {children}
      </button>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <CalcIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Calculator</h2>
              <p className="text-sm text-purple-100">Basic calculations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Calculator Body */}
        <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Display */}
          <div className="bg-white rounded-xl p-6 mb-6 shadow-inner border-2 border-gray-200">
            <div className="text-right">
              {operation && previousValue !== null && (
                <div className="text-sm text-gray-500 mb-1 font-medium">
                  {previousValue} {operation}
                </div>
              )}
              <div className="text-4xl font-bold text-gray-900 break-all">
                {display}
              </div>
            </div>
          </div>

          {/* Buttons Grid */}
          <div className="grid grid-cols-4 gap-3">
            {/* Row 1 */}
            <Button onClick={handleClear} variant="clear" className="col-span-2 h-14">
              AC
            </Button>
            <Button onClick={handleBackspace} variant="operation" className="h-14">
              <Delete className="w-5 h-5" />
            </Button>
            <Button onClick={() => handleOperation('÷')} variant="operation" className="h-14">
              ÷
            </Button>

            {/* Row 2 */}
            <Button onClick={() => handleNumber('7')} className="h-14">7</Button>
            <Button onClick={() => handleNumber('8')} className="h-14">8</Button>
            <Button onClick={() => handleNumber('9')} className="h-14">9</Button>
            <Button onClick={() => handleOperation('×')} variant="operation" className="h-14">
              ×
            </Button>

            {/* Row 3 */}
            <Button onClick={() => handleNumber('4')} className="h-14">4</Button>
            <Button onClick={() => handleNumber('5')} className="h-14">5</Button>
            <Button onClick={() => handleNumber('6')} className="h-14">6</Button>
            <Button onClick={() => handleOperation('-')} variant="operation" className="h-14">
              −
            </Button>

            {/* Row 4 */}
            <Button onClick={() => handleNumber('1')} className="h-14">1</Button>
            <Button onClick={() => handleNumber('2')} className="h-14">2</Button>
            <Button onClick={() => handleNumber('3')} className="h-14">3</Button>
            <Button onClick={() => handleOperation('+')} variant="operation" className="h-14">
              +
            </Button>

            {/* Row 5 */}
            <Button onClick={handleNegate} className="h-14">+/−</Button>
            <Button onClick={() => handleNumber('0')} className="h-14">0</Button>
            <Button onClick={handleDecimal} className="h-14">.</Button>
            <Button onClick={handleEquals} variant="equals" className="h-14">
              =
            </Button>
          </div>

          {/* Keyboard Hint */}
          <div className="mt-4 text-center text-xs text-gray-500">
            Keyboard shortcuts enabled • ESC to close
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

