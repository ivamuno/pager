import { MonitoredServiceState } from '../model';

export interface PersistencePort {
  getMonitoredServiceState(id: string): Promise<MonitoredServiceState>;
  setMonitoredServiceState(entity: MonitoredServiceState): Promise<void>;
}
