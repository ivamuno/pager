export enum EscalationTargetType {
  sms = 'sms',
  email = 'email',
}

export abstract class EscalationTarget<TType> {
  constructor(public identifier: string, public isNotified: boolean, public payload: TType) {}

  abstract getEscalationTargetType(): EscalationTargetType;
}

export class EscalationSMSTargetPayload {
  phoneNumber: string;
}

export class EscalationSMSTarget extends EscalationTarget<EscalationSMSTargetPayload> {
  constructor(identifier: string, isNotified: boolean, payload: EscalationSMSTargetPayload) {
    super(identifier, isNotified, payload);
  }

  getEscalationTargetType(): EscalationTargetType {
    return EscalationTargetType.sms;
  }
}

export class EscalationEmailTargetPayload {
  email: string;
}

export class EscalationEmailTarget extends EscalationTarget<EscalationEmailTargetPayload> {
  constructor(identifier: string, isNotified: boolean, payload: EscalationEmailTargetPayload) {
    super(identifier, isNotified, payload);
  }

  getEscalationTargetType(): EscalationTargetType {
    return EscalationTargetType.email;
  }
}
