"use client";

import React from "react";
import { AccountGrid    } from "./AccountCard";
import { AccountInterface } from "../types/accounts";





export function AccountList({ accounts }: { accounts: AccountInterface[] }) {
  return (
    <div>

          <AccountGrid accounts={accounts} />
    </div>
  );
} 