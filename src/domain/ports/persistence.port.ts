export interface PersistencePortEntity {
  identifier: string;
  version: string;
  payload: any;
}

export interface PersistencePort<TState extends PersistencePortEntity> {
  get(id: string): Promise<TState>;
  set(entity: TState): Promise<void>;
  delete(entity: TState): Promise<void>;
}
