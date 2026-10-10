import type { ApiResponse, HealthCheckData } from '@lumaspend/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiClient {
  private static baseUrl = API_BASE_URL;

  static async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = (await response.json()) as ApiResponse<T>;
      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unable to connect to the server'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  static async getHealth(): Promise<ApiResponse<HealthCheckData>> {
    return this.request<HealthCheckData>('/health');
  }
}
