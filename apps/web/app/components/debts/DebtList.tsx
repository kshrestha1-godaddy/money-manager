"use client";

import React from "react";
import { DebtGrid } from "./DebtCard";
import { DebtInterface } from "../../types/debts";

export function DebtList({ debts, onEdit, onDelete, onViewDetails, onAddRepayment }: { 
  debts: DebtInterface[];
  onEdit?: (debt: DebtInterface) => void;
  onDelete?: (debt: DebtInterface) => void;
  onViewDetails?: (debt: DebtInterface) => void;
  onAddRepayment?: (debt: DebtInterface) => void;
}) {
  return (
    <div>
      <DebtGrid 
        debts={debts} 
        onEdit={onEdit} 
        onDelete={onDelete} 
        onViewDetails={onViewDetails}
        onAddRepayment={onAddRepayment}
      />
    </div>
  );
} 