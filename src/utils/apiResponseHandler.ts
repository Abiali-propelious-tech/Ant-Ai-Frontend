export interface ApiResponse<T = any> {
  value: T | null;
  success: boolean;
  statusCode: number;
  resultMessage: string;
  errorMessage: string;
  exceptionMessage: string;
}

export function handleApiResponse<T = any>(response: Response): Promise<T> {
  return response.json().then((data: ApiResponse<T>) => {
    if (!data.success) {
      const errorMessage = data.errorMessage || data.resultMessage || 'API request failed';
      throw new Error(errorMessage);
    }
    return data.value as T;
  });
}

export function handleApiResponseWithFallback<T = any>(response: Response, fallback: T): Promise<T> {
  return response.json().then((data: ApiResponse<T>) => {
    if (!data.success) {
      console.warn('API request failed:', data.errorMessage || data.resultMessage);
      return fallback;
    }
    return data.value as T;
  }).catch(() => {
    console.warn('Failed to parse API response, using fallback');
    return fallback;
  });
}

export function handleStreamingResponse(response: Response): Response {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
}
