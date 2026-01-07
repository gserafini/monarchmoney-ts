import fetch, { FetchError } from 'node-fetch';
import { AuthService, type SessionInfo } from '../auth/index.js';
import { AuthError, MonarchError, NetworkError, RateLimitError, normalizeGraphQLError, normalizeHTTPError } from '../errors/index.js';

export interface GraphQLRequestOptions {
  cacheKey?: string;
  timeoutMs?: number;
  retries?: number;
  dedupe?: boolean;
}

export class GraphQLClient {
  private baseURL: string;
  private auth: AuthService;
  private activeRequests = new Map<string, Promise<unknown>>();
  private minIntervalMs = 250;
  private lastRequestTime = 0;

  constructor(baseURL: string, auth: AuthService) {
    this.baseURL = baseURL.endsWith('/graphql') ? baseURL : `${baseURL}/graphql`;
    this.auth = auth;
  }

  async query<T>(query: string, variables?: Record<string, unknown>, opts: GraphQLRequestOptions = {}): Promise<T> {
    return this.execute<T>(query, variables, opts);
  }

  async mutate<T>(query: string, variables?: Record<string, unknown>, opts: GraphQLRequestOptions = {}): Promise<T> {
    return this.execute<T>(query, variables, opts);
  }

  private async execute<T>(
    query: string,
    variables?: Record<string, unknown>,
    opts: GraphQLRequestOptions = {}
  ): Promise<T> {
    const dedupeKey = opts.dedupe !== false ? this.makeDedupeKey(query, variables) : null;
    if (dedupeKey && this.activeRequests.has(dedupeKey)) {
      return this.activeRequests.get(dedupeKey) as Promise<T>;
    }

    const promise = this.performRequest<T>(query, variables, opts).finally(() => {
      if (dedupeKey) this.activeRequests.delete(dedupeKey);
    });

    if (dedupeKey) this.activeRequests.set(dedupeKey, promise);
    return promise;
  }

  private async performRequest<T>(
    query: string,
    variables?: Record<string, unknown>,
    opts: GraphQLRequestOptions = {}
  ): Promise<T> {
    const session: SessionInfo | undefined = this.auth.getSession() ?? (await this.auth.loadSession());
    if (!session?.token) throw new AuthError('No session token available');
    if (this.auth.isSessionExpired()) throw new AuthError('Session expired');

    // minimal pacing
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise(res => setTimeout(res, this.minIntervalMs - elapsed));
    }

    const body = { query, variables: variables ?? {}, operationName: null };

    const attempt = async (): Promise<T> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000);
      const res = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.buildHeaders(session),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw normalizeHTTPError(res.status, await res.text());
      }

      const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
      if (json.errors?.length) {
        throw normalizeGraphQLError(json.errors[0].message);
      }
      if (!json.data) {
        throw new MonarchError({ message: 'Empty GraphQL response', cause: 'unknown' });
      }
      return json.data;
    };

    try {
      return await this.retry(attempt, opts.retries ?? 2);
    } catch (err) {
      if (err instanceof MonarchError) throw err;
      if (err instanceof FetchError && err.type === 'aborted') {
        throw new NetworkError('Request aborted/timeout', err);
      }
      if (err instanceof FetchError) {
        throw new NetworkError((err as Error).message, err);
      }
      throw err as Error;
    } finally {
      this.lastRequestTime = Date.now();
    }
  }

  private buildHeaders(session: SessionInfo): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${session.token}`,
      'Client-Platform': 'web',
      'Origin': 'https://app.monarchmoney.com',
      'device-uuid': session.deviceUuid,
      'User-Agent': 'monarchmoney-ts-sdk/v2',
    };
  }

  private makeDedupeKey(query: string, variables?: Record<string, unknown>): string {
    const v = variables ? JSON.stringify(variables) : '';
    return `${query}::${v}`;
  }

  private async retry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
    let attempt = 0;
    let delay = 250;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        const isRate = err instanceof RateLimitError;
        const is5xx = err instanceof MonarchError && err.causeCategory === 'dependency_down';
        if (attempt >= retries || (!isRate && !is5xx)) throw err;
        await new Promise(res => setTimeout(res, delay));
        delay = Math.min(delay * 2, 2000);
        attempt++;
      }
    }
  }
}
