"use client";

import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { CalculatorModal } from './CalculatorModal';

export function CalculatorButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-[10.5rem] right-6 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors z-50 group"
        title="Calculator"
      >
        <Calculator className="w-6 h-6" />
        <span className="sr-only">Calculator</span>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Calculator
          <div className="absolute top-full right-3 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </button>

      <CalculatorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

