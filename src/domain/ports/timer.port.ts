import { AcknowledgementTimeout } from "../model";

export interface TimerPort {
  start(acknowledgementTimeout: AcknowledgementTimeout, delay: string): Promise<void>;
  stop(acknowledgementTimeout: AcknowledgementTimeout): Promise<void>;
}
