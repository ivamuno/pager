import { MonitoredServiceState, NotFoundError } from '../model';
import { PersistencePort } from '../ports';

export interface IMonitoredServiceStateService {
  get(id: string): Promise<MonitoredServiceState>;

  set(entity: MonitoredServiceState): Promise<void>;
}

export class MonitoredServiceStateService {
  public constructor(private readonly persistencePort: PersistencePort<MonitoredServiceState>) {}

  public async get(monitoredServiceId: string): Promise<MonitoredServiceState> {
    const monitoredServiceState = await this.persistencePort.get(monitoredServiceId);
    if (!monitoredServiceState) {
      throw new NotFoundError(monitoredServiceId);
    }

    return monitoredServiceState;
  }

  public async set(monitoredService: MonitoredServiceState): Promise<void> {
    await this.persistencePort.set(monitoredService);
  }
}
