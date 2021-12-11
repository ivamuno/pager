import { EscalationSMSTargetPayload, EscalationEmailTargetPayload } from '../model/escalation-target.model';

export interface NotificationPort<TTo> {
  notify(message: string, to: TTo): Promise<void>;
}

export interface EmailNotificationPort extends NotificationPort<EscalationSMSTargetPayload> {}

export interface SMSNotificationPort extends NotificationPort<EscalationEmailTargetPayload> {}
