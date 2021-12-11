import { EscalationLevel } from "./escalation-level.model";
import { MonitoredService } from "./monitored-service.model";

export class EscalationPolicy {
  constructor(public monitoredService: MonitoredService, public level: EscalationLevel) {}
}
