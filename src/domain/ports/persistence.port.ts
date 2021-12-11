export interface PersistencePortEntity {
  identifier: string;
  payload: any;
}

export interface PersistencePort<TState extends PersistencePortEntity> {
  get(id: string): Promise<TState>;
  set(entity: TState): Promise<void>;
  delete(id: string): Promise<void>;
}
