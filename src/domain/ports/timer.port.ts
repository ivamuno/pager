export interface TimerPort {
  start(alertId: string, targetId: string, delay: string): Promise<void>;
  stop(alertId: string, targetId: string): Promise<void>;
}
