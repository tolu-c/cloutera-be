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
