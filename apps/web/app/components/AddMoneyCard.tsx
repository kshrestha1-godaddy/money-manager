"use client";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { TextInput } from "@repo/ui/text-input";

// Server Actions
import { addTransaction } from "../lib/transaction";

const SUPPORTED_BANKS = [
  {
    name: "HDFC Bank",
    redirectUrl: "https://netbanking.hdfcbank.com",
  },
  {
    name: "Axis Bank",
    redirectUrl: "https://www.axisbank.com/",
  },
];

export const AddMoney = () => {
  const [redirectUrl, setRedirectUrl] = useState(
    SUPPORTED_BANKS[0]?.redirectUrl,
  );

  const [selectedBank, setSelectedBank] = useState(SUPPORTED_BANKS[0]);
  const [amount, setAmount] = useState(0);

  return (
    <Card title="Add Money">
      <div className="w-full">
        <TextInput
          label={"Amount"}
          placeholder={"Amount"}
          onChange={(value) => {
            setAmount(Number(value));
          }}
        />

        <div className="py-4 text-left">Bank</div>

        <Select
          key="bank"
          onSelect={(value) => {
            setRedirectUrl(
              SUPPORTED_BANKS.find((x) => x.name === value)?.redirectUrl || "",
            );
            setSelectedBank(
              SUPPORTED_BANKS.find((x) => x.name === value) ||
                SUPPORTED_BANKS[0],
            );
          }}
          options={SUPPORTED_BANKS.map((x) => ({
            key: x.name,
            value: x.name,
          }))}
        />

        <div className="flex justify-center pt-10">
          <Button
            onClick={async () => {
              try {
                const txn = await addTransaction(amount * 100, selectedBank);
                console.log(txn);

                if (txn && redirectUrl) {
                  window.location.href = redirectUrl;
                }
              } catch (error) {
                console.error("Transaction failed:", error);
              }
            }}
          >
            Add Money
          </Button>
        </div>
      </div>
    </Card>
  );
};
