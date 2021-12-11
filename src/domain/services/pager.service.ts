import { v4 as uuidv4 } from 'uuid';
import { Acknowledgement, AlertState, NotFoundError } from '../model';
import { Alert } from '../model/alert.model';
import { EscalationPolicy } from '../model/escalation-policy.model';
import { MonitoredServiceState, MonitoredServiceStates } from '../model/monitored-service-state.model';
import { EscalationPolicyPort, LoggerPort } from '../ports';
import { IAlertStateService } from './alert-state.service';
import { IMonitoredServiceStateService } from './monitored-service-state.service';
import { INotificationService } from './notification.service';

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
    const wasSet: boolean = await this.setMonitoredServiceStateAsUnhealthy(alert.monitoredServiceId);
    if (!wasSet) {
      this.logger.log('Alert is ignored because the service was already notified.', alert);
      return;
    }

    const alertState = await this.buildAlertState(alert);

    await this.notifyAndSave(alertState);
  }

  public async setAcknowledgementTimeout(ack: Acknowledgement): Promise<void> {
    const alertState: AlertState = await this.alertStateService.get(ack.monitoredServiceId);
    const targets = alertState.escalationLevel?.targets || [];
    const isLevelNotified = targets.find((target) => target.isNotified) !== undefined;
    if (isLevelNotified) {
      this.logger.log('ACK Timeout is ignored because the notification ACK was received.', ack);
      return;
    }

    const monitoredServiceState: MonitoredServiceState = await this.monitoredServiceStateService.get(
      ack.monitoredServiceId,
    );
    if (monitoredServiceState.isHealthy()) {
      this.logger.log('ACK Timeout is ignored because the service is in a Healthy State.', ack);
      return;
    }

    alertState.escalationLevel = alertState.escalationLevel.nextLevel;
    await this.notifyAndSave(alertState);
  }

  public async setHealthy(identifier: string) {
    const monitoredServiceState = new MonitoredServiceState(identifier, MonitoredServiceStates.health);
    await this.monitoredServiceStateService.set(monitoredServiceState);

    await this.alertStateService.delete(identifier);
  }

  public async setAcknowledgement(ack: Acknowledgement): Promise<void> {
    const alertState: AlertState = await this.alertStateService.get(ack.monitoredServiceId);
    const targets = alertState.escalationLevel?.targets || [];
    const target = targets.find((t) => t.identifier === ack.targetId);
    if (!target) {
      throw new NotFoundError('target');
    }

    target.isNotified = true;
    await this.alertStateService.set(alertState);
  }

  private async buildAlertState(alert: Alert): Promise<AlertState> {
    const escalationPolicy: EscalationPolicy = await this.escalationPolicyPort.get(alert.monitoredServiceId);
    const alertState = new AlertState(alert.monitoredServiceId, alert.message, escalationPolicy.level);
    alertState.escalationLevel.targets.forEach((t) => {
      t.identifier = this.identifierFactory(t.identifier);
    });

    return alertState;
  }

  private async setMonitoredServiceStateAsUnhealthy(monitoredServiceId: string): Promise<boolean> {
    const monitoredServiceState: MonitoredServiceState = await this.monitoredServiceStateService.get(
      monitoredServiceId,
    );

    if (!monitoredServiceState.isHealthy()) {
      return false;
    }

    monitoredServiceState.state = MonitoredServiceStates.unhealth;
    await this.monitoredServiceStateService.set(monitoredServiceState);
    return true;
  }

  private async notifyAndSave(alertState: AlertState) {
    const targets = alertState.escalationLevel?.targets || [];
    if (targets.length === 0) {
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
