class DomainError extends Error {
  constructor(message) {
    super(message);
    
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource) {
    super(`Resource '${resource}' was not found.`);
  }
}