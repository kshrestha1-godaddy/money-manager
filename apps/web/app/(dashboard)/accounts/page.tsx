"use client";

import { AccountList } from "../../components/AccountList";
import { AccountInterface } from "../../types/accounts";
import { Button } from "@repo/ui/button";


const accounts: AccountInterface[] = [
  {
    holderName: "KAMAL SHRESTHA",
    accountNumber: "12710017500563",
    bankName: "Nabil Bank",
    branchName: "KAPAN",
    bankAddress: "Budanilkantha Municipality Ward No. 10, Panchakanya Chowk, Kapan, Kathmandu",
    accountType: "GEN N Regular Savings Account",
    mobileNumbers: ["9779767652812", "9779843312567"],
    branchContacts: ["977 1 4813113", "977 1 4813114"],
    swift: "NARBNPKA",
    bankEmail: "Abha Rana 9841786462 Abha.Rana@nabilbank.com",
    securityQuestion: [],
    branchCode: "1234567890",
    accountOpeningDate: new Date("2021-01-01"),
    id: 1,
  },
  {
    holderName: "JANE DOE",
    accountNumber: "12345678901234",
    bankName: "Sample Bank",
    branchName: "MAIN",
    bankAddress: "123 Main St, Kathmandu",
    accountType: "Savings Account",
    mobileNumbers: ["9800000000"],
    branchContacts: ["977 1 1234567"],
    swift: "SAMPBANK",
    bankEmail: "jane.doe@samplebank.com",
    securityQuestion: [],
    branchCode: "1234567890",
    accountOpeningDate: new Date("2021-01-01"),
    id: 2,
  },
{
    holderName: "JANE DOE",
    accountNumber: "12345678901234",
    bankName: "Sample Bank",
    branchName: "MAIN",
    bankAddress: "123 Main St, Kathmandu",
    accountType: "Savings Account",
    mobileNumbers: ["9800000000"],
    branchContacts: ["977 1 1234567"],
    swift: "SAMPBANK",
    bankEmail: "jane.doe@samplebank.com",
    securityQuestion: [],
    branchCode: "1234567890",
    accountOpeningDate: new Date("2021-01-01"),
    id: 3,
  },
];


function AddAccountHandler(){
  console.log("Add Account");
  
}



export default function Accounts() {
    return (
        <>
            <div>
              <div className="flex justify-end">
                <Button onClick={() => { console.log("Add Account") }}>Add Account</Button>
              </div>
              
              <div className="p-6 flex flex-col gap-6 items-center">
                  <AccountList accounts={accounts} />
              </div>
            </div>           
        </>
    );
}