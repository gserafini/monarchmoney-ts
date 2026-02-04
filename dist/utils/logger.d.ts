import { Logger } from '../types';
export declare class ConsoleLogger implements Logger {
    private level;
    constructor(level?: 'debug' | 'info' | 'warn' | 'error');
    private shouldLog;
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
export declare class SilentLogger implements Logger {
    debug(): void;
    info(): void;
    warn(): void;
    error(): void;
}
export declare function createLogger(level?: 'debug' | 'info' | 'warn' | 'error' | 'silent'): Logger;
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map