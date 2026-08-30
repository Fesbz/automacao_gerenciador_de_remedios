const API_URL = 'http://10.0.2.2:3000';
const DEFAULT_TIMEOUT = 10000;

export class ApiRequestError extends Error {
  status: number | null;
  code: string;
  details?: unknown;

  constructor(
    message: string,
    status: number | null,
    code: string,
    details?: unknown,
  ) {
    super(message);

    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = RequestInit & {
  timeout?: number;
};

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    headers,
    body,
    ...rest
  } = options;

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  /*
   * IMPORTANTE:
   * usamos API_URL, que é a constante declarada acima.
   */
  const url = `${API_URL}${endpoint}`;

  const requestHeaders: HeadersInit = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...headers,
  };

  try {
    console.log(
      `[API] ${rest.method ?? 'GET'} ${url}`,
    );

    const response = await fetch(url, {
      ...rest,
      body,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType =
      response.headers.get('content-type') || '';

    let responseData: unknown = null;

    if (response.status !== 204) {
      if (
        contentType.includes(
          'application/json',
        )
      ) {
        try {
          responseData = await response.json();
        } catch {
          throw new ApiRequestError(
            'A resposta do servidor não contém um JSON válido.',
            response.status,
            'INVALID_JSON',
          );
        }
      } else {
        try {
          responseData =
            await response.text();
        } catch {
          responseData = null;
        }
      }
    }

    if (!response.ok) {
      let message =
        'Ocorreu um erro na requisição.';

      switch (response.status) {
        case 400:
          message =
            'A requisição é inválida.';
          break;

        case 401:
          message =
            'Não autorizado. Faça login novamente.';
          break;

        case 403:
          message =
            'Você não possui permissão para realizar esta ação.';
          break;

        case 404:
          message =
            'O recurso solicitado não foi encontrado.';
          break;

        case 409:
          message =
            'O recurso já existe ou existe um conflito.';
          break;

        case 422:
          message =
            'Os dados enviados são inválidos.';
          break;

        case 429:
          message =
            'Muitas requisições. Tente novamente mais tarde.';
          break;

        default:
          if (response.status >= 500) {
            message =
              'O servidor apresentou um erro.';
          }
      }

      /*
       * Nosso backend responde:
       * {
       *   error: {
       *     message: "..."
       *   }
       * }
       */
      const serverMessage =
        typeof responseData === 'object' &&
        responseData !== null &&
        'error' in responseData &&
        typeof responseData.error ===
          'object' &&
        responseData.error !== null &&
        'message' in responseData.error &&
        typeof responseData.error.message ===
          'string'
          ? responseData.error.message
          : null;

      throw new ApiRequestError(
        serverMessage || message,
        response.status,
        `HTTP_${response.status}`,
        responseData,
      );
    }

    return responseData as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiRequestError) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new ApiRequestError(
        'A requisição demorou muito para responder.',
        null,
        'TIMEOUT',
      );
    }

    console.error(
      '[API] Erro de conexão:',
      error,
    );

    throw new ApiRequestError(
      'Não foi possível conectar ao servidor. Verifique sua conexão.',
      null,
      'NETWORK_ERROR',
      error,
    );
  }
}

export const api = {
  get<T>(
    endpoint: string,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  },

  post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });
  },

  put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });
  },

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });
  },

  delete<T>(
    endpoint: string,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },

  head(
    endpoint: string,
    options?: RequestOptions,
  ) {
    return request<void>(endpoint, {
      ...options,
      method: 'HEAD',
    });
  },

  options<T>(
    endpoint: string,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'OPTIONS',
    });
  },
};