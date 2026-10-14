
import { createApiClient } from "./apiClient";

const baseUrl = import.meta.env.VITE_CONTENT_API_URL;

if (!baseUrl) {
  throw new Error("Missing VITE_CONTENT_API_URL in .env.local");
}

export const contentApi = createApiClient(baseUrl);
