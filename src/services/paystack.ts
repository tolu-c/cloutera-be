import axios, { AxiosResponse } from "axios";
import {
  InitializePaymentResponse,
  VerifyPaymentResponse,
} from "../types/service.types";

export async function initializePayment(email: string, amount: string) {
  try {
    const res: AxiosResponse<InitializePaymentResponse> = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    return res.data;
  } catch (error) {
    console.error("Error initializing payment:", error);
    throw new Error(
      `Failed to initialize payment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function verifyPayment(reference: string) {
  try {
    const res: AxiosResponse<VerifyPaymentResponse> = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    return res.data;
  } catch (error) {
    console.error("Error verifying payment:", error);
    throw new Error(
      `Failed to verify payment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
