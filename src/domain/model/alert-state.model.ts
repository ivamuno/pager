import { EscalationLevel } from './escalation-level.model';

export class AlertState {
  payload: {
    message;
    level;
    escalationLevel;
  };

  constructor(
    public identifier: string,
    public version: string,
    public message: string,
    public escalationLevel: EscalationLevel,
  ) {}
}
