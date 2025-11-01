import { OrderStatus } from "./enums";

export interface PeakerOrderStatus {
  charge: string;
  start_count: string;
  status: OrderStatus;
  remains: string;
  currency: string;
}

export interface PeakerErrorStatus {
  error: string;
}

export type MultipleOrderStatus = Record<
  string,
  PeakerOrderStatus | PeakerErrorStatus
>;

export interface PeakerBalance {
  balance: number;
  currency: string;
}
