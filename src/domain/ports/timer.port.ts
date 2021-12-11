import { Acknowledgement } from '../model';

export interface TimerPort {
  start(acknowledgementTimeout: Acknowledgement, delay: string): Promise<void>;
}
