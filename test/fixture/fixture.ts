import {
  AlertStateService,
  MonitoredServiceStateService,
  NotificationService,
  PagerService,
} from '../../src/domain/services';
import { Mocks } from './mocks';

export class Fixture {
  mocks: Mocks;
  sut: PagerService;

  constructor() {
    this.mocks = new Mocks();

    const monitoredServiceStateService = new MonitoredServiceStateService(
      this.mocks.persistencePortMonitoredServiceStateMock,
    );

    const alertStateService = new AlertStateService(this.mocks.persistencePortAlertStateMock);

    const notificationService = new NotificationService(
      this.mocks.timerPortMock,
      this.mocks.emailNotificationPortMock,
      this.mocks.smsNotificationPortMock,
    );

    this.sut = new PagerService(
      this.mocks.loggerMock,
      this.mocks.escalationPolicyPortMock,
      monitoredServiceStateService,
      alertStateService,
      notificationService,
      (id) => id,
    );
  }
}
