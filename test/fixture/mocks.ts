import { AlertState, MonitoredServiceState } from '../../src/domain/model';
import {
  EmailNotificationPort,
  EscalationPolicyPort,
  LoggerPort,
  PersistencePort,
  SMSNotificationPort,
  TimerPort,
} from '../../src/domain/ports';

export class Mocks {
  loggerMock: LoggerPort = {
    log: jest.fn(),
  };

  escalationPolicyPortMock: EscalationPolicyPort = {
    get: jest.fn(),
  };

  persistencePortMonitoredServiceStateMock: PersistencePort<MonitoredServiceState> = {
    delete: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  };

  persistencePortAlertStateMock: PersistencePort<AlertState> = {
    delete: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  };

  timerPortMock: TimerPort = {
    start: jest.fn(),
  };

  emailNotificationPortMock: EmailNotificationPort = {
    notify: jest.fn(),
  };

  smsNotificationPortMock: SMSNotificationPort = {
    notify: jest.fn(),
  };

  restart() {
    jest.clearAllMocks();
    (this.loggerMock.log as jest.Mock<any>).mockReset();
    (this.escalationPolicyPortMock.get as jest.Mock<any>).mockReset();
    (this.persistencePortMonitoredServiceStateMock.delete as jest.Mock<any>).mockReset();
    (this.persistencePortMonitoredServiceStateMock.get as jest.Mock<any>).mockReset();
    (this.persistencePortMonitoredServiceStateMock.set as jest.Mock<any>).mockReset();
    (this.persistencePortAlertStateMock.delete as jest.Mock<any>).mockReset();
    (this.persistencePortAlertStateMock.get as jest.Mock<any>).mockReset();
    (this.persistencePortAlertStateMock.set as jest.Mock<any>).mockReset();
    (this.timerPortMock.start as jest.Mock<any>).mockReset();
    (this.emailNotificationPortMock.notify as jest.Mock<any>).mockReset();
    (this.smsNotificationPortMock.notify as jest.Mock<any>).mockReset();
  }
}
