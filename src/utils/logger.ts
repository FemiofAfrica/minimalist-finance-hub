/**
 * Logger utility for managing console logs with different log levels
 * Automatically disables debug and info logs in production environment
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
}

class Logger {
  private level: LogLevel;
  private prefix: string;
  private isProduction: boolean;

  constructor(options: LoggerOptions = {}) {
    this.isProduction = import.meta.env.MODE === 'production';
    this.level = this.isProduction ? LogLevel.WARN : (options.level ?? LogLevel.DEBUG);
    this.prefix = options.prefix ?? '';
  }

  /**
   * Set the log level
   * @param level The log level to set
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Set a prefix for all log messages
   * @param prefix The prefix to set
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  /**
   * Log a debug message (only in development)
   * @param message The message to log
   * @param args Additional arguments to log
   */
  debug(message: string, ...args: unknown[]): void {
    if (import.meta.env.MODE !== 'production' && this.level <= LogLevel.DEBUG) {
      console.log(`${this.prefix ? `[${this.prefix}] ` : ''}${message}`, ...args);
    }
  }

  /**
   * Log an info message (only in development)
   * @param message The message to log
   * @param args Additional arguments to log
   */
  info(message: string, ...args: unknown[]): void {
    if (import.meta.env.MODE !== 'production' && this.level <= LogLevel.INFO) {
      console.log(`${this.prefix ? `[${this.prefix}] ` : ''}${message}`, ...args);
    }
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`${this.prefix ? `[${this.prefix}] ` : ''}${message}`, ...args);
    }
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`${this.prefix ? `[${this.prefix}] ` : ''}${message}`, ...args);
    }
  }

  /**
   * Create a new logger instance with a specific prefix
   * @param prefix The prefix for the new logger
   * @returns A new logger instance with the specified prefix
   */
  createLogger(prefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: prefix
    });
  }
}

// Export the LogLevel enum for external use
export { LogLevel };

// Create and export a default logger instance
const defaultLogger = new Logger();
export default defaultLogger;