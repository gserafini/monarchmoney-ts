import fetch from 'node-fetch';
import { totp } from 'otplib';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { AuthError, ValidationError } from '../errors/index.js';

const LOGIN_ENDPOINT = 'https://api.monarchmoney.com/auth/login/';
const DEFAULT_SESSION_FILE = path.join(os.homedir(), '.mm', 'session.json');

export interface LoginOptions {
  email: string;
  password: string;
  totpSecret?: string;
  supportsMfa?: boolean;
  trustedDevice?: boolean;
  saveSession?: boolean;
  sessionPath?: string;
  deviceUuid?: string;
}

export interface TokenLoginOptions {
  token: string;
  saveSession?: boolean;
  sessionPath?: string;
  deviceUuid?: string;
}

export interface SessionInfo {
  token: string;
  tokenExpiration?: string;
  id?: string;
  email?: string;
  name?: string;
  createdAt: string;
  deviceUuid: string;
}

export class AuthService {
  private sessionPath: string;
  private session?: SessionInfo;

  constructor(sessionPath?: string, private defaultDeviceUuid: string = randomUUID()) {
    this.sessionPath = sessionPath ?? DEFAULT_SESSION_FILE;
  }

  getSession(): SessionInfo | undefined {
    return this.session;
  }

  isSessionExpired(): boolean {
    if (!this.session?.tokenExpiration) return false;
    const expires = Date.parse(this.session.tokenExpiration);
    if (Number.isNaN(expires)) return false;
    return Date.now() > expires;
  }

  async loginWithToken(opts: TokenLoginOptions): Promise<SessionInfo> {
    if (!opts.token) throw new ValidationError('Token is required');
    const session: SessionInfo = {
      token: opts.token,
      createdAt: new Date().toISOString(),
      deviceUuid: opts.deviceUuid ?? this.defaultDeviceUuid,
    };
    if (opts.saveSession !== false) {
      await this.saveSession(session, opts.sessionPath);
    }
    this.session = session;
    return session;
  }

  async login(opts: LoginOptions): Promise<SessionInfo> {
    if (!opts.email || !opts.password) throw new ValidationError('Email and password are required');
    const totpCode = opts.totpSecret ? totp.generate(opts.totpSecret) : undefined;
    const body: Record<string, unknown> = {
      username: opts.email,
      password: opts.password,
      supports_mfa: opts.supportsMfa ?? true,
      trusted_device: opts.trustedDevice ?? false,
    };
    if (totpCode) body.totp = totpCode;

    const res = await fetch(LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Client-Platform': 'web',
        'Content-Type': 'application/json',
        'User-Agent': 'monarchmoney-ts-sdk/v2',
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    if (res.status === 403) throw new AuthError('MFA required or invalid TOTP');
    if (res.status !== 200) throw new AuthError(`Login failed: ${res.status} ${res.statusText} - ${raw}`);

    let json: any;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new AuthError(`Login response was not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!json.token) throw new AuthError('Login response missing token');

    const session: SessionInfo = {
      token: json.token,
      tokenExpiration: json.tokenExpiration,
      id: json.id,
      email: json.email,
      name: json.name,
      createdAt: new Date().toISOString(),
      deviceUuid: opts.deviceUuid ?? this.defaultDeviceUuid,
    };

    if (opts.saveSession !== false) {
      await this.saveSession(session, opts.sessionPath);
    }
    this.session = session;
    return session;
  }

  async loadSession(sessionPath?: string): Promise<SessionInfo | undefined> {
    const file = sessionPath ?? this.sessionPath;
    try {
      const raw = await fs.readFile(file, 'utf8');
      const parsed = JSON.parse(raw) as SessionInfo;
      if (!parsed.token) throw new Error('invalid session file');
      this.session = parsed;
      if (this.isSessionExpired()) {
        await this.invalidateSession();
        return undefined;
      }
      return parsed;
    } catch (err) {
      if (
        (err instanceof Error && err.message === 'invalid session file') ||
        err instanceof SyntaxError ||
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        await this.invalidateSession();
        return undefined;
      }
      throw new AuthError('Failed to load session', err);
    }
  }

  async invalidateSession(): Promise<void> {
    this.session = undefined;
    try {
      await fs.unlink(this.sessionPath);
    } catch {
      // ignore
    }
  }

  private async saveSession(session: SessionInfo, sessionPath?: string): Promise<void> {
    const file = sessionPath ?? this.sessionPath;
    const dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(session, null, 2), { mode: 0o600 });
  }
}
