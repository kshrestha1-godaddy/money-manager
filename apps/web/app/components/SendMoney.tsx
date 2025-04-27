"use client";

import { TextInput } from "@repo/ui/text-input";
import { useState } from "react";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";

import { sendMoney } from "../lib/transaction";

export const SendMoney = () => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  return (
    <Card title="Send Money">
      <div className="w-full">
        <TextInput
          label={"Recipient A/C"}
          placeholder={"Recipient"}
          type="number"
          onChange={(value) => {
            setRecipient(value);
          }}
        />

        <TextInput
          label={"Amount"}
          placeholder={"Amount"}
          type="number"
          onChange={(value) => {
            setAmount(Number(value));
          }}
        />

        {message && (
          <div
            className={`mt-4 text-center ${error ? "text-red-500" : "text-green-500"}`}
          >
            {message}
          </div>
        )}

        <div className="flex justify-center pt-10">
          <Button
            onClick={async () => {
              try {
                const response = await sendMoney(amount * 100, recipient);

                setMessage(response.message);
                setError(!response.success);

                if (response.success) {
                  // Reset form on success
                  setRecipient("");
                  setAmount(0);
                }
              } catch (error) {
                console.error("Transaction failed:", error);
                setMessage("Transaction failed");
                setError(true);
              }
            }}
          >
            Send Money
          </Button>
        </div>
      </div>
    </Card>
  );
};
