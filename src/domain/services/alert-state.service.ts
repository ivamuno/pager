import { AlertState } from '../model';
import { PersistencePort } from '../ports';

export interface IAlertStateService {
  get(id: string): Promise<AlertState>;

  set(entity: AlertState): Promise<void>;
}

export class AlertStateService implements IAlertStateService {
  public constructor(private readonly persistencePort: PersistencePort<AlertState>) {}

  public async get(id: string): Promise<AlertState> {
    return await this.persistencePort.get(id);
  }

  public async set(entity: AlertState): Promise<void> {
    await this.persistencePort.set(entity);
  }
}
