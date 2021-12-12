import { EscalationTarget } from './escalation-target.model';

export class EscalationLevel {
  constructor(public targets: EscalationTarget<any>[], public nextLevel: EscalationLevel = undefined) {}

  isCompleted(): boolean {
    return this.targets.find((t) => !t.isAckReceived) === undefined;
  }
}
