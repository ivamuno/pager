import { EscalationPolicy } from '../model/escalation-policy.model';

export interface EscalationPolicyPort {
  get(monitoredServiceId: string): Promise<EscalationPolicy>;
}
