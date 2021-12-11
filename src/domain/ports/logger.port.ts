export interface LoggerPort {
  log(message: any, ...optionalParams: any[]): Promise<void>;
}
