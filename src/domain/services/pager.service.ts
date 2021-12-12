import { v4 as uuidv4 } from 'uuid';
import { Acknowledgement, AlertState, EscalationLevel, NotFoundError } from '../model';
import { Alert } from '../model/alert.model';
import { EscalationPolicy } from '../model/escalation-policy.model';
import { MonitoredServiceState, MonitoredServiceStates } from '../model/monitored-service-state.model';
import { EscalationPolicyPort, LoggerPort, PersistencePort } from '../ports';
import { INotificationService } from './notification.service';

export class PagerService {
  constructor(
    private readonly logger: LoggerPort,
    private readonly escalationPolicyPort: EscalationPolicyPort,
    private readonly persistencePort: PersistencePort,
    private readonly notificationService: INotificationService,
    private readonly identifierFactory: (string) => string = () => uuidv4(),
  ) {}

  public async alert(alert: Alert): Promise<void> {
    const monitoredServiceState: MonitoredServiceState = await this.persistencePort.getMonitoredServiceState(
      alert.monitoredServiceId,
    );
    if (!monitoredServiceState.isHealthy()) {
      this.logger.log('Alert is ignored because the service was already notified.', alert);
      return;
    }

    monitoredServiceState.state = MonitoredServiceStates.unhealth;
    monitoredServiceState.alertState = await this.buildAlertState(alert);

    await this.notifyAndSave(monitoredServiceState);
  }

  public async setAcknowledgementTimeout(ack: Acknowledgement): Promise<void> {
    const monitoredServiceState: MonitoredServiceState = await this.persistencePort.getMonitoredServiceState(
      ack.monitoredServiceId,
    );
    if (monitoredServiceState.isHealthy()) {
      this.logger.log('ACK Timeout is ignored because the service is in a Healthy State.', ack);
      return;
    }

    const alertState: AlertState = monitoredServiceState.alertState;
    if (alertState.escalationLevel.isAckReceived()) {
      this.logger.log('ACK Timeout is ignored because the notification ACK was received.', ack);
      return;
    }

    alertState.escalationLevel = alertState.escalationLevel.nextLevel;
    await this.notifyAndSave(monitoredServiceState);
  }

  public async setHealthy(identifier: string) {
    const monitoredServiceState: MonitoredServiceState = await this.persistencePort.getMonitoredServiceState(
      identifier,
    );
    if (monitoredServiceState.isHealthy()) {
      this.logger.log('SetHealth Operation ignored the service is in a Healthy State.', identifier);
      return;
    }

    monitoredServiceState.alertState = undefined;
    monitoredServiceState.state = MonitoredServiceStates.health;
    await this.persistencePort.setMonitoredServiceState(monitoredServiceState);
  }

  public async setAcknowledgement(ack: Acknowledgement): Promise<void> {
    const monitoredServiceState: MonitoredServiceState = await this.persistencePort.getMonitoredServiceState(
      ack.monitoredServiceId,
    );
    if (monitoredServiceState.isHealthy()) {
      this.logger.log('SetAcknowledgement Operation ignored the service is in a Healthy State.', ack);
      return;
    }

    const targets = monitoredServiceState.alertState?.escalationLevel?.targets || [];
    const target = targets.find((t) => t.identifier === ack.targetId);
    if (!target) {
      this.logger.log('SetAcknowledgement Operation ignored because the target was not found.', ack);
      return;
    }

    target.isAckReceived = true;
    await this.persistencePort.setMonitoredServiceState(monitoredServiceState);
  }

  private async buildAlertState(alert: Alert): Promise<AlertState> {
    const escalationPolicy: EscalationPolicy = await this.escalationPolicyPort.get(alert.monitoredServiceId);
    const alertState = new AlertState(this.identifierFactory(alert.monitoredServiceId), alert.message, escalationPolicy.level);
    alertState.escalationLevel.targets.forEach((t) => {
      t.identifier = this.identifierFactory(t.identifier);
    });

    return alertState;
  }

  private async notifyAndSave(monitoredServiceState: MonitoredServiceState) {
    const alertState: AlertState = monitoredServiceState.alertState;
    const targets = alertState?.escalationLevel?.targets || [];
    if (targets.length === 0) {
      throw new NotFoundError('targets');
    }

    await this.persistencePort.setMonitoredServiceState(monitoredServiceState);

    await this.notificationService.notify(
      alertState.identifier,
      alertState.message,
      alertState.escalationLevel.targets,
    );
  }
}
