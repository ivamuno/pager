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

  persistencePortMock: PersistencePort = {
    getMonitoredServiceState: jest.fn(),
    setMonitoredServiceState: jest.fn(),
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
    (this.persistencePortMock.getMonitoredServiceState as jest.Mock<any>).mockReset();
    (this.persistencePortMock.setMonitoredServiceState as jest.Mock<any>).mockReset();
    (this.timerPortMock.start as jest.Mock<any>).mockReset();
    (this.emailNotificationPortMock.notify as jest.Mock<any>).mockReset();
    (this.smsNotificationPortMock.notify as jest.Mock<any>).mockReset();
  }
}
