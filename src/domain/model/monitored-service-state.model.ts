import { AlertState } from '.';
import { MonitoredService } from './monitored-service.model';

/* eslint-disable no-unused-vars */
export enum MonitoredServiceStates {
  health = 'health',
  unhealth = 'unhealth',
}

export class MonitoredServiceState extends MonitoredService {
  constructor(identifier: string, public state: MonitoredServiceStates, public alertState: AlertState) {
    super(identifier);
  }

  isHealthy(): boolean {
    return MonitoredServiceStates.health === this.state;
  }
}
