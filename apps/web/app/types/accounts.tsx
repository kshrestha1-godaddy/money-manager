export interface AccountInterface {
    id: number;
    holderName: string;
    accountNumber: string;
    branchCode: string;
    bankName: string;
    branchName: string;
    bankAddress: string;
    accountType: string;
    mobileNumbers: string[];
    branchContacts: string[];
    swift: string;
    bankEmail: string;
    accountOpeningDate: Date;
    securityQuestion: string[];
    balance: number;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
}
