import { MonitoredService } from './monitored-service.model';

export enum MonitoredServiceStates {
  health = 'health',
  unhealth = 'unhealth',
}

export class MonitoredServiceState extends MonitoredService {
  constructor(identifier: string, public version: string, public state: MonitoredServiceStates) {
    super(identifier);
  }

  isHealthy(): boolean {
    return MonitoredServiceStates.health === this.state;
  }

  payload: MonitoredServiceStates = this.state;
}
