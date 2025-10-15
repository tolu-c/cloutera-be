import { Sort } from "./enums";

export interface ExternalServiceResponse {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
}

export interface ServiceQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  type?: string;
  minRate?: number;
  maxRate?: number;
  refill?: boolean;
  cancel?: boolean;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: Sort;
}

export interface PaginatedResponse<T> {
  message?: string;
  success: boolean;
  data: T[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: any;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  blocked: number;
}

export interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: PayStackPaymentStatus;
    reference: string;
    receipt_number: string | null;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: string | null;
    log: {
      start_time: number;
      time_spent: number;
      attempts: number;
      errors: number;
      success: boolean;
      mobile: boolean;
      input: unknown[];
      history?: Array<{
        type: string;
        message: string;
        time: number;
      }>;
    };
    fees: number;
    fees_split: number | null;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    } | null;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: unknown | null;
      risk_action: string;
      international_format_phone: string | null;
    };
    plan: unknown | null;
    split: Record<string, unknown>;
    order_id: string | null;
    paidAt: string | null;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: unknown | null;
    source: unknown | null;
    fees_breakdown: unknown | null;
    connect: unknown | null;
    transaction_date: string;
    plan_object: Record<string, unknown>;
    subaccount: Record<string, unknown>;
  };
}

const PayStackPaymentStatus = [
  "success",
  "abandoned",
  "ongoing",
  "pending",
  "processing",
  "queued",
  "reversed",
] as const;

type PayStackPaymentStatus = typeof PayStackPaymentStatus[number];

