export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  stack?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'connecting' | 'unconfigured';
      latencyMs?: number;
    };
    aiEngine: {
      status: 'configured' | 'unconfigured';
    };
  };
}
