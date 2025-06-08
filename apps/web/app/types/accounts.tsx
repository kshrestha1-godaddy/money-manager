export interface AccountInterface {
    id: number;
    holderName: string;
    accountNumber: string;
    branchCode: string; // IFSC/Code
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
    balance?: number; // Make optional since it might not be set initially
    userId: number;
    createdAt: Date;
    updatedAt: Date;
}
