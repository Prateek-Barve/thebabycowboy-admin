
import { createApiClient } from "./apiClient";

const baseUrl = import.meta.env.VITE_MEDIA_API_URL;

if (!baseUrl) {
  throw new Error("Missing VITE_MEDIA_API_URL in .env.local");
}

export const mediaApi = createApiClient(baseUrl);
