import { MonitoredService } from './monitored-service.model';

/* eslint-disable no-unused-vars */
export enum MonitoredServiceStates {
  health = 'health',
  unhealth = 'unhealth',
}

export class MonitoredServiceState extends MonitoredService {
  payload: MonitoredServiceStates = this.state;

  constructor(identifier: string, public version: string, public state: MonitoredServiceStates) {
    super(identifier);
  }

  isHealthy(): boolean {
    return MonitoredServiceStates.health === this.state;
  }
}
