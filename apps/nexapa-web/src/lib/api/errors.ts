export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    code: string,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const data = body as Record<string, unknown> | undefined;
    const message = typeof data?.message === "string" ? data.message : "An error occurred";
    const code = typeof data?.code === "string"
      ? data.code
      : typeof data?.error === "string"
        ? data.error
        : "unknown";
    const errors = (data?.errors ?? data?.messages) as Record<string, string[]> | undefined;

    switch (status) {
      case 401:
        return new ApiError(
          "Authentication is required, or local guest API access is disabled.",
          401,
          "unauthorized",
          errors,
        );
      case 404:
        return new ApiError(message, 404, code === "unknown" ? "not_found" : code, errors);
      case 409:
        return new ApiError(message, 409, code === "unknown" ? "conflict" : code, errors);
      case 422:
        return new ApiError(message, 422, code === "unknown" ? "validation_error" : code, errors);
      case 429:
        return new ApiError(
          "Too many requests. Wait briefly before trying again.",
          429,
          "rate_limited",
          errors,
        );
      default:
        if (status >= 500) {
          return new ApiError(
            message === "An error occurred" ? "Nexapa API encountered a server error." : message,
            status,
            code === "unknown" ? "server_error" : code,
            errors,
          );
        }
        return new ApiError(message, status, code, errors);
    }
  }

  static networkError(): ApiError {
    return new ApiError("Nexapa API cannot be reached.", 0, "network_error");
  }

  static timeoutError(): ApiError {
    return new ApiError("Request timed out.", 0, "timeout");
  }

  static invalidResponse(): ApiError {
    return new ApiError("Received an invalid response from the API.", 0, "invalid_response");
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
