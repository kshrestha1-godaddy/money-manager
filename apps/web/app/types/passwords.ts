export interface PasswordInterface {
  id: number;
  websiteName: string;
  description: string;
  username: string;
  passwordHash: string;
  transactionPin?: string | null;
  validity?: Date | null;
  notes?: string | null;
  favicon?: string | null;
  category?: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export type PasswordFormData = {
  websiteName: string;
  description: string;
  username: string;
  password: string; // Plain text password to be encrypted
  secretKey: string; // Key used for encryption
  transactionPin?: string; // Plain text PIN to be encrypted
  validity?: Date | string; // Date or ISO string
  notes?: string;
  category?: string;
  tags?: string[];
};

export type PasswordUpdateData = Partial<Omit<PasswordFormData, 'password' | 'secretKey'>> & {
  id: number;
  password?: string; // Optional for updates
  secretKey?: string; // Required if password is provided
  transactionPin?: string; // Optional for updates
  validity?: Date | string | null; // Optional for updates
};

export type DecryptPasswordData = {
  passwordHash: string;
  secretKey: string;
}; 