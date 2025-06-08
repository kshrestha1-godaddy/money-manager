"use client";

import React from "react";
import { AccountGrid    } from "./AccountCard";
import { AccountInterface } from "../types/accounts";

export function AccountList({ accounts, onEdit, onDelete, onViewDetails }: { 
  accounts: AccountInterface[];
  onEdit?: (account: AccountInterface) => void;
  onDelete?: (account: AccountInterface) => void;
  onViewDetails?: (account: AccountInterface) => void;
}) {
  return (
    <div>
      <AccountGrid 
        accounts={accounts} 
        onEdit={onEdit} 
        onDelete={onDelete} 
        onViewDetails={onViewDetails}
      />
    </div>
  );
} 