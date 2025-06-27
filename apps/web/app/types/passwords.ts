export interface PasswordInterface {
  id: number;
  websiteName: string;
  websiteUrl: string;
  username: string;
  passwordHash: string;
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
  websiteUrl: string;
  username: string;
  password: string; // Plain text password to be encrypted
  secretKey: string; // Key used for encryption
  notes?: string;
  category?: string;
  tags?: string[];
};

export type PasswordUpdateData = Partial<Omit<PasswordFormData, 'password' | 'secretKey'>> & {
  id: number;
  password?: string; // Optional for updates
  secretKey?: string; // Required if password is provided
};

export type DecryptPasswordData = {
  passwordHash: string;
  secretKey: string;
}; 