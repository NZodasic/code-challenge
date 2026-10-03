export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { total?: number; cursor?: string; nextCursor?: string | null; limit?: number };
}
