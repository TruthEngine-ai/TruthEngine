const BASE_URL = 'http://139.224.192.180:8000';

const getToken = (): string | null => {
    return localStorage.getItem('token');
};

interface RequestConfig extends Omit<RequestInit, 'body'> {
    params?: Record<string, any>;
}

const request = async (endpoint: string, data?: any, config: RequestConfig = {}): Promise<any> => {
    const { params, headers = {}, method = 'GET', ...rest } = config;
    let url = `${BASE_URL}${endpoint}`;
    if (params) {
        const queryString = Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        url = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    }

    const requestHeaders: Record<string, string> = {
        ...(headers as Record<string, string>),
    };
    
    if (data && !(data instanceof FormData)) {
        requestHeaders['Content-Type'] = 'application/json';
    }
    
    const token = getToken();
    if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const fetchConfig: RequestInit = {
        method,
        headers: requestHeaders,
        ...rest,
    };

    if (data) {
        fetchConfig.body = data instanceof FormData ? data : JSON.stringify(data);
    }

    try {
        const response = await fetch(url, fetchConfig);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw {
                status: response.status,
                statusText: response.statusText,
                data: errorData,
            };
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    } catch (error) {
        console.error('请求出错:', error);
        throw error;
    }
};

export const get = (endpoint: string, config: RequestConfig = {}) =>
    request(endpoint, undefined, { ...config, method: 'GET' });

export const post = (endpoint: string, data?: any, config: RequestConfig = {}) =>
    request(endpoint, data, { ...config, method: 'POST' });

export const del = (endpoint: string, config: RequestConfig = {}) =>
    request(endpoint, undefined, { ...config, method: 'DELETE' });

export default request;
