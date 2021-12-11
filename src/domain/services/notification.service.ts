import { EscalationTarget, EscalationTargetType, AcknowledgementTimeout } from '../model';
import { EmailNotificationPort, NotificationPort, SMSNotificationPort } from '../ports/notification.port';
import { TimerPort } from '../ports/timer.port';

export interface INotificationService {
  notify(monitoredServiceId: string, message: string, targets: EscalationTarget<any>[]): Promise<void>;
}

const delayInMinutes = '15';

export class NotificationService implements INotificationService {
  private readonly notificationStrategies: { [key: string]: NotificationPort<any> } = {};

  constructor(
    private readonly timerPort: TimerPort,
    emailNotificationPort: EmailNotificationPort,
    smsNotificationPort: SMSNotificationPort,
  ) {
    this.notificationStrategies[EscalationTargetType.email] = emailNotificationPort;
    this.notificationStrategies[EscalationTargetType.sms] = smsNotificationPort;
  }

  async notify(monitoredServiceId: string, message: string, targets: EscalationTarget<any>[]): Promise<void> {
    const promises: Promise<void>[] = targets.reduce((acc, t) => {
      const notificationStrategy = this.notificationStrategies[t.getEscalationTargetType()];
      const targetPromise: Promise<void> = notificationStrategy.notify(message, t.payload);
      const acknowledgementTimeout = new AcknowledgementTimeout(monitoredServiceId, t.identifier);
      const timerPromise: Promise<void> = this.timerPort.start(acknowledgementTimeout, delayInMinutes);
      acc.push(...[targetPromise, timerPromise]);
      return acc;
    }, []);

    await Promise.all(promises);
  }
}
