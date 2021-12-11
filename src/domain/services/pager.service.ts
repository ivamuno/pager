import { AcknowledgementTimeout, AlertState, NotFoundError } from '../model';
import { Alert } from '../model/alert.model';
import { EscalationPolicy } from '../model/escalation-policy.model';
import { MonitoredServiceState, MonitoredServiceStates } from '../model/monitored-service-state.model';
import { EscalationPolicyPort, LoggerPort } from '../ports';
import { IAlertStateService } from './alert-state.service';
import { IMonitoredServiceStateService } from './monitored-service-state.service';
import { INotificationService } from './notification.service';
import { v4 as uuidv4 } from 'uuid';

export class PagerService {
  constructor(
    private readonly logger: LoggerPort,
    private readonly escalationPolicyPort: EscalationPolicyPort,
    private readonly monitoredServiceStateService: IMonitoredServiceStateService,
    private readonly alertStateService: IAlertStateService,
    private readonly notificationService: INotificationService,
    private readonly identifierFactory: (string) => string = () => uuidv4(),
  ) {}

  public async alert(alert: Alert): Promise<void> {
    const monitoredServiceState: MonitoredServiceState = await this.monitoredServiceStateService.get(
      alert.monitoredServiceId,
    );

    if (!monitoredServiceState.isHealthy()) {
      this.logger.log('Alert is ignored because the service is already notified.', alert);
      return;
    }

    monitoredServiceState.state = MonitoredServiceStates.unhealth;
    await this.monitoredServiceStateService.set(monitoredServiceState);

    const escalationPolicy: EscalationPolicy = await this.escalationPolicyPort.get(alert.monitoredServiceId);

    const version = new Date(Date.now()).toUTCString();
    const alertState = new AlertState(alert.monitoredServiceId, version, alert.message, escalationPolicy.level);
    alertState.escalationLevel.targets.forEach((t) => {
      t.identifier = this.identifierFactory(t.identifier);
    });

    await this.notifyAndSave(alertState);
  }

  public async setAcknowledgementTimeout(ack: AcknowledgementTimeout): Promise<void> {
    const alertState: AlertState = await this.alertStateService.get(ack.monitoredServiceId);
    alertState.escalationLevel = alertState.escalationLevel.nextLevel;
    await this.notifyAndSave(alertState);
  }

  private async notifyAndSave(alertState: AlertState) {
    if (alertState.escalationLevel.targets?.length === 0) {
      throw new NotFoundError('targets');
    }

    await this.notificationService.notify(
      alertState.identifier,
      alertState.message,
      alertState.escalationLevel.targets,
    );

    await this.alertStateService.set(alertState);
  }
}
