/**
 * PoDM Autonomous QA Test Suite — Live API Client Helper
 * Executes real HTTP requests against the Express server and maintains cookie state
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { EvidenceCollector } from './evidence.helper';

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
  cookies: Record<string, string>;
}

export class ApiClient {
  private baseUrl: string;
  private client: AxiosInstance;
  private cookies: Record<string, string> = {};
  private defaultHeaders: Record<string, string> = {};

  constructor(baseUrl: string = process.env.TARGET_API_URL || 'http://localhost:5000/api/v1') {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      validateStatus: () => true, // Don't throw on HTTP error status codes (4xx, 5xx)
      timeout: 10000,
    });
  }

  public setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  public removeHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  public setBearerToken(token: string): void {
    this.setHeader('Authorization', `Bearer ${token}`);
  }

  public clearBearerToken(): void {
    this.removeHeader('Authorization');
  }

  public setCookie(name: string, value: string): void {
    this.cookies[name] = value;
  }

  public clearCookies(): void {
    this.cookies = {};
  }

  public getCookieHeader(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private extractCookies(resHeaders: Record<string, any>): void {
    const setCookie = resHeaders['set-cookie'];
    if (!setCookie) return;
    const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const str of cookieArray) {
      const parts = str.split(';')[0].split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        this.cookies[name] = val;
      }
    }
  }

  public async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: any,
    customHeaders?: Record<string, string>,
    collector?: EvidenceCollector
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...customHeaders,
    };

    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = headers['Cookie'] ? `${headers['Cookie']}; ${cookieHeader}` : cookieHeader;
    }

    const config: AxiosRequestConfig = {
      method,
      url,
      headers,
      data,
    };

    let response: AxiosResponse;
    try {
      response = await this.client.request(config);
    } catch (err: any) {
      if (collector) {
        collector.recordApi(method, `${this.baseUrl}${url}`, data, headers, 500, {
          error: err.message || String(err),
        });
      }
      throw err;
    }

    this.extractCookies(response.headers);

    const result: ApiResponse<T> = {
      status: response.status,
      data: response.data,
      headers: response.headers as Record<string, string>,
      cookies: { ...this.cookies },
    };

    if (collector) {
      collector.recordApi(
        method,
        `${this.baseUrl}${url}`,
        data,
        headers,
        response.status,
        response.data,
        response.headers as Record<string, string>
      );
    }

    return result;
  }

  public async get<T = any>(url: string, headers?: Record<string, string>, collector?: EvidenceCollector) {
    return this.request<T>('GET', url, undefined, headers, collector);
  }

  public async post<T = any>(url: string, data?: any, headers?: Record<string, string>, collector?: EvidenceCollector) {
    return this.request<T>('POST', url, data, headers, collector);
  }

  public async put<T = any>(url: string, data?: any, headers?: Record<string, string>, collector?: EvidenceCollector) {
    return this.request<T>('PUT', url, data, headers, collector);
  }

  public async delete<T = any>(url: string, headers?: Record<string, string>, collector?: EvidenceCollector) {
    return this.request<T>('DELETE', url, undefined, headers, collector);
  }
}
