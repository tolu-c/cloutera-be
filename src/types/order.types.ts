import { OrderStatus } from "./enums";

export interface PeakerOrderStatus {
  charge: string;
  start_count: string;
  status: OrderStatus;
  remains: string;
  currency: string;
}
