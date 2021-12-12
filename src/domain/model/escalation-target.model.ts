/* eslint-disable no-unused-vars */
export enum EscalationTargetType {
  sms = 'sms',
  email = 'email',
}

export abstract class EscalationTarget<TType> {
  constructor(public identifier: string, public isAckReceived: boolean, public payload: TType) {}

  abstract getEscalationTargetType(): EscalationTargetType;
}

export class EscalationSMSTargetPayload {
  phoneNumber: string;
}

export class EscalationSMSTarget extends EscalationTarget<EscalationSMSTargetPayload> {
  constructor(identifier: string, isAckReceived: boolean, payload: EscalationSMSTargetPayload) {
    super(identifier, isAckReceived, payload);
  }

  getEscalationTargetType(): EscalationTargetType {
    return EscalationTargetType.sms;
  }
}

export class EscalationEmailTargetPayload {
  email: string;
}

export class EscalationEmailTarget extends EscalationTarget<EscalationEmailTargetPayload> {
  constructor(identifier: string, isAckReceived: boolean, payload: EscalationEmailTargetPayload) {
    super(identifier, isAckReceived, payload);
  }

  getEscalationTargetType(): EscalationTargetType {
    return EscalationTargetType.email;
  }
}
