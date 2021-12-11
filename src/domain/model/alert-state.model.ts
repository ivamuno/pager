import { EscalationLevel } from './escalation-level.model';

export class AlertState {
  constructor(
    public identifier: string,
    public version: string,
    public message: string,
    public escalationLevel: EscalationLevel,
  ) {}

  payload: {
    message;
    level;
    escalationLevel;
  };
}
