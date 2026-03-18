import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface RenewalHistory {
  id: number;
  license_id: number;
  renewed_at: string;
  previous_expiry: string;
  new_expiry: string;
  cost: number;
  payment_process: string;
  description: string;
}

export interface License {
  id: number;
  name: string;
  category: string;
  serial_number: string;
  description: string;
  system_scope: string;
  provider: string;
  service_code: string;
  contract_code: string;
  issue_date: string;
  expiry_date: string;
  business_contact: string;
  technical_contact: string;
  website: string;
  notes: string;
  status: 'active' | 'expiring' | 'expired';
  cost: number;
  currency: string;
  owner_id: number;
  owner_name?: string;
  department: string;
  tags: string;
  is_important: boolean;
  payment_process?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  department: string;
}

export interface DashboardStats {
  summary: {
    total: number;
    expired: number;
    expiringSoon: number;
    active: number;
    important: number;
  };
  importantSummary?: {
    total: number;
    active: number;
    expiringSoon: number;
    expired: number;
  };
  costByDept: { department: string; total_cost: number }[];
  monthlyRenewals: { month: string; count: number }[];
  topProviders: { provider: string; count: number; total_cost: number }[];
}
