export const logger = {
  info(message: string, details?: Record<string, unknown>): void {
    if (details) {
      console.log(`[artieBulkTool] ${message}`, details);
      return;
    }
    console.log(`[artieBulkTool] ${message}`);
  },
  warn(message: string, details?: Record<string, unknown>): void {
    if (details) {
      console.warn(`[artieBulkTool] ${message}`, details);
      return;
    }
    console.warn(`[artieBulkTool] ${message}`);
  },
  error(message: string, details?: Record<string, unknown>): void {
    if (details) {
      console.error(`[artieBulkTool] ${message}`, details);
      return;
    }
    console.error(`[artieBulkTool] ${message}`);
  },
};
