
export type TokenGetter = () => Promise<string | null>;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  getToken?: TokenGetter;
}

// export class ApiError extends Error {
//   constructor(
//     message: string,
//     public readonly status: number
//   ) {
//     super(message);
//     this.name = "ApiError";
//   }
// }

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);

    this.name = "ApiError";
    this.status = status;
  }
}


export function createApiClient(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  async function request<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { getToken, body, headers, ...requestOptions } = options;

    const requestHeaders = new Headers(headers);
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;

    if (body !== undefined && !isFormData) {
      requestHeaders.set("Content-Type", "application/json");
    }

    if (getToken) {
      const token = await getToken();

      if (!token) {
        throw new ApiError(
          "You must sign in before performing this action.",
          401
        );
      }

      requestHeaders.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(
      `${normalizedBaseUrl}${path.startsWith("/") ? path : `/${path}`}`,
      {
        ...requestOptions,
        headers: requestHeaders,
        body:
          body === undefined
            ? undefined
            : isFormData
              ? (body as FormData)
              : JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();

      let message = responseText || response.statusText;

      try {
        const parsed = JSON.parse(responseText);
        message =
          parsed.message ??
          parsed.title ??
          parsed.detail ??
          message;
      } catch {
        // The response wasn't JSON; keep the original text.
      }

      throw new ApiError(
        message || `Request failed with status ${response.status}.`,
        response.status
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  return {
    get<T>(path: string, getToken?: TokenGetter) {
      return request<T>(path, {
        method: "GET",
        getToken,
      });
    },

    post<T>(path: string, body: unknown, getToken: TokenGetter) {
      return request<T>(path, {
        method: "POST",
        body,
        getToken,
      });
    },

    put<T>(path: string, body: unknown, getToken: TokenGetter) {
      return request<T>(path, {
        method: "PUT",
        body,
        getToken,
      });
    },

    delete<T>(path: string, getToken: TokenGetter) {
      return request<T>(path, {
        method: "DELETE",
        getToken,
      });
    },
  };
}
