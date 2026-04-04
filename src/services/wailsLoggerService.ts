/**
 * Mock Frontend Logger Service
 * All methods log to console instead of sending to backend
 */
export const wailsLoggerService = {
  async logError(message: string, error?: Error, componentInfo?: string): Promise<void> {
  },

  async logWarning(message: string, details?: string): Promise<void> {
  },

  async logInfo(message: string, details?: string): Promise<void> {
  },

  async getLogDirectory(): Promise<string> {
    return '/demo/logs';
  },

  async getTodayLogPath(): Promise<string> {
    return '/demo/logs/today.log';
  },

  initializeGlobalHandlers(): void {
    // No-op in demo mode
  },
};

// React Error Boundary helper
export class ErrorBoundaryLogger {
  static logError(error: Error, errorInfo: { componentStack: string }): void {
  }
}

export default wailsLoggerService;
