export class ConsoleLogger {
    constructor(level = 'info') {
        this.level = level;
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentIndex = levels.indexOf(this.level);
        const messageIndex = levels.indexOf(level);
        return messageIndex >= currentIndex;
    }
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.error(`[MonarchMoney DEBUG] ${message}`, ...args);
        }
    }
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.error(`[MonarchMoney INFO] ${message}`, ...args);
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.error(`[MonarchMoney WARN] ${message}`, ...args);
        }
    }
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(`[MonarchMoney ERROR] ${message}`, ...args);
        }
    }
}
export class SilentLogger {
    debug() { }
    info() { }
    warn() { }
    error() { }
}
export function createLogger(level) {
    if (level === 'silent') {
        return new SilentLogger();
    }
    return new ConsoleLogger(level);
}
// Default logger instance
export const logger = createLogger(process.env.MONARCH_LOG_LEVEL || 'info');
//# sourceMappingURL=logger.js.map