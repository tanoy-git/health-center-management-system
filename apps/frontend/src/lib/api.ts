export function getBasePath(): string {
  const configured = process.env.NEXT_PUBLIC_BASE_PATH;
  return configured !== undefined ? configured : '/health-erp';
}

export function assetUrl(path: string): string {
  const base = getBasePath().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const publicUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicUrl && publicUrl.trim()) {
      // Remove trailing slash and any redundant /api/v1 suffix
      const cleanUrl = publicUrl.replace(/\/$/, '').replace(/\/api\/v1$/, '');
      if (cleanUrl) {
        return `${cleanUrl}/api/v1`;
      }
    }
  }
  const basePath = getBasePath().replace(/\/$/, '');
  return `${basePath}/api/v1`;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('aegis_token') : null;
  const activeCenterId =
    typeof window !== 'undefined'
      ? localStorage.getItem('aegis_active_center_id')
      : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (activeCenterId) {
    headers['x-center-id'] = activeCenterId;
  }

  const apiBase = getApiBase();
  const url = `${apiBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    let errorMsg = 'Unauthorized session';
    let data: any = null;
    try {
      data = await response.json();
      errorMsg = data?.message || errorMsg;
      if (Array.isArray(errorMsg)) errorMsg = errorMsg.join(', ');
    } catch {}

    if (typeof window !== 'undefined') {
      localStorage.removeItem('aegis_token');
      localStorage.removeItem('aegis_user');
      const basePath = getBasePath().replace(/\/$/, '');
      const loginPath = `${basePath}/login`;
      if (window.location.pathname !== loginPath && window.location.pathname !== '/login') {
        window.location.href = loginPath;
      }
    }
    throw new ApiError(errorMsg, 401, data);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    const blob = await response.blob();
    return blob as unknown as T;
  }

  let data: any;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    const errorMsg =
      data?.message || (Array.isArray(data?.message) ? data.message.join(', ') : 'API Request Failed');
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}
