"use client";

import React, { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { CurrencyConverterModal } from './CurrencyConverterModal';

export function CurrencyConverterButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-[6rem] right-6 bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-colors z-50 group"
        title="Currency Converter"
      >
        <ArrowLeftRight className="w-6 h-6" />
        <span className="sr-only">Currency Converter</span>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Currency Converter
          <div className="absolute top-full right-3 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </button>

      <CurrencyConverterModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

