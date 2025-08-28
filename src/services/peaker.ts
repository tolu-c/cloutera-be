import axios, { AxiosResponse } from "axios";
import { ExternalServiceResponse } from "../types/service.types";
import { Service } from "../models/service";
import { getPeakerApiKey, API_URL } from "../constants";

export const fetchAndSaveServices = async () => {
  try {
    const response: AxiosResponse<ExternalServiceResponse[]> = await axios.get(
      `${API_URL}?key=${getPeakerApiKey()}&action=services`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 3000,
      },
    );

    if (!Array.isArray(response.data)) {
      throw new Error("Invalid response format from external API");
    }

    const services = response.data;

    await Service.deleteMany({});
    await Service.insertMany(
      services.map((s) => ({
        serviceId: s.service,
        name: s.name,
        type: s.type,
        category: s.category,
        // rate: s.rate,
        rate: String(Number(s.rate) * 0.1 + Number(s.rate)),
        min: s.min,
        max: s.max,
        refill: s.refill,
        cancel: s.cancel,
      })),
    );

    console.log("Services updated successfully");
  } catch (error) {
    console.error("Error fetching services from external API:", error);
    throw new Error(
      `Failed to fetch services: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
