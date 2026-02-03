import axios, { type AxiosResponse } from "axios";
import crypto from "crypto";
import type {
  ErcaspayInitiateResponse,
  ErcaspayVerifyResponse,
} from "../types/service.types";
import { Currency } from "../types/enums";

const ERCASPAY_BASE_URL =
  process.env.ERCAS_URL || "https://api-staging.ercaspay.com";

interface ErcaspayInitiateRequest {
  amount: number;
  paymentReference: string;
  paymentMethods: string;
  customerName: string;
  customerEmail: string;
  customerPhoneNumber?: string;
  currency: Currency;
  redirectUrl?: string;
  description?: string;
  feeBearer?: "customer" | "merchant";
  metadata?: Record<string, unknown>;
}

export function generatePaymentReference(): string {
  return `CLOU-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function initializePayment(data: {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhoneNumber?: string;
  description?: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<ErcaspayInitiateResponse> {
  try {
    const paymentReference = generatePaymentReference();
    const redirectUrl = `${process.env.CLIENT_URL}/${process.env.ERCAS_REDIRECT_URL}`;

    const requestBody: ErcaspayInitiateRequest = {
      amount: data.amount,
      paymentReference,
      paymentMethods: "card,bank-transfer,ussd,qrcode",
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhoneNumber: data.customerPhoneNumber,
      currency: Currency.NGN,
      redirectUrl: data.redirectUrl || redirectUrl,
      description: data.description,
      metadata: data.metadata,
    };

    const res: AxiosResponse<ErcaspayInitiateResponse> = await axios.post(
      `${ERCASPAY_BASE_URL}/api/v1/payment/initiate`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${process.env.ERCAS_SECRET_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    return res.data;
  } catch (error) {
    console.error("Error initializing Ercaspay payment:", error);
    throw new Error(
      `Failed to initialize Ercaspay payment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function verifyPayment(
  transactionRef: string,
): Promise<ErcaspayVerifyResponse> {
  try {
    const res: AxiosResponse<ErcaspayVerifyResponse> = await axios.get(
      `${ERCASPAY_BASE_URL}/api/v1/payment/transaction/verify/${transactionRef}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ERCAS_SECRET_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    return res.data;
  } catch (error) {
    console.error("Error verifying Ercaspay payment:", error);
    throw new Error(
      `Failed to verify Ercaspay payment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
