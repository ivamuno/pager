import { TimerPort } from 'src/domain/ports/timer.port';
import {
  Alert,
  AlertState,
  EscalationEmailTarget,
  EscalationLevel,
  EscalationPolicy,
  EscalationSMSTarget,
  EscalationTarget,
  MonitoredService,
  MonitoredServiceState,
  MonitoredServiceStates,
} from '../src/domain/model';

import {
  EmailNotificationPort,
  EscalationPolicyPort,
  LoggerPort,
  NotificationPort,
  PersistencePort,
  SMSNotificationPort,
} from '../src/domain/ports';

import {
  AlertStateService,
  IAlertStateService,
  IMonitoredServiceStateService,
  INotificationService,
  MonitoredServiceStateService,
  NotificationService,
  PagerService,
} from '../src/domain/services';

const loggerMock: LoggerPort = {
  log: jest.fn(),
};

const escalationPolicyPortMock: EscalationPolicyPort = {
  get: jest.fn(),
};

const persistencePortMonitoredServiceStateMock: PersistencePort<MonitoredServiceState> = {
  delete: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
};

const monitoredServiceStateService: IMonitoredServiceStateService = new MonitoredServiceStateService(
  persistencePortMonitoredServiceStateMock,
);

const persistencePortAlertStateMock: PersistencePort<AlertState> = {
  delete: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
};

const alertStateService: IAlertStateService = new AlertStateService(persistencePortAlertStateMock);

const timerPortMock: TimerPort = {
  start: jest.fn(),
  stop: jest.fn(),
};

const emailNotificationPortMock: EmailNotificationPort = {
  notify: jest.fn(),
};

const smsNotificationPortMock: SMSNotificationPort = {
  notify: jest.fn(),
};

const notificationService: INotificationService = new NotificationService(
  timerPortMock,
  emailNotificationPortMock,
  smsNotificationPortMock,
);

let pagerService: PagerService;

describe('PagerService (e2e)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pagerService = new PagerService(
      loggerMock,
      escalationPolicyPortMock,
      monitoredServiceStateService,
      alertStateService,
      notificationService,
      (id) => id,
    );
  });

  describe('GIVEN a Monitored Service in a Healthy State', () => {
    const monitoredId = 'monitoredId:1234';
    persistencePortMonitoredServiceStateMock.get = jest.fn().mockImplementationOnce((id: string) => {
      expect(id).toBe(monitoredId);
      return new MonitoredServiceState(monitoredId, 'v1', MonitoredServiceStates.health);
    });

    describe('WHEN the Pager receives an Alert related to this Monitored Service', () => {
      const alertMessage = 'service down';
      const alert = new Alert(monitoredId, alertMessage);
      test(`THEN the Monitored Service becomes Unhealthy,
              the Pager notifies all targets of the first level of the escalation policy,
              and sets a 15-minutes acknowledgement delay`, async () => {
        const escalationLevelTargetSMS2 = new EscalationSMSTarget('targetSMS2', false, {
          phoneNumber: 'targetSMSNumber2',
        });
        const escalationLevel2 = new EscalationLevel([escalationLevelTargetSMS2]);

        const escalationLevelTargetSMS1 = new EscalationSMSTarget('targetSMS1', false, {
          phoneNumber: 'targetSMSNumber1',
        });
        const escalationEmailTargetEmail1 = new EscalationEmailTarget('targetEmail1', false, {
          email: 'targetEmailEmail1',
        });
        const escalationLevel1 = new EscalationLevel(
          [escalationLevelTargetSMS1, escalationEmailTargetEmail1],
          escalationLevel2,
        );
        const escalationPolicy = new EscalationPolicy(new MonitoredService(monitoredId), escalationLevel1);
        const expectedEscalationPolicy = JSON.parse(JSON.stringify(escalationPolicy)) as EscalationPolicy;

        escalationPolicyPortMock.get = jest.fn().mockImplementationOnce((id: string) => {
          expect(id).toBe(monitoredId);
          return escalationPolicy;
        });

        await pagerService.alert(alert);

        assetMonitoredServiceStateCalled(persistencePortMonitoredServiceStateMock, MonitoredServiceStates.unhealth);

        assertTimerCalled(timerPortMock, expectedEscalationPolicy.level.targets, monitoredId);

        assertNotificationCalled(emailNotificationPortMock, alertMessage, {
          email: escalationEmailTargetEmail1.payload.email,
        });

        assertNotificationCalled(smsNotificationPortMock, alertMessage, {
          phoneNumber: escalationLevelTargetSMS1.payload.phoneNumber,
        });

        assetAlertStateCalled(persistencePortAlertStateMock, monitoredId);
      });
    });
  });
});

function assetAlertStateCalled(mock: PersistencePort<AlertState>, id: string): void {
  const setAlertStateSpy = jest.spyOn(mock, 'set');
  expect(setAlertStateSpy).toBeCalledTimes(1);
  expect(setAlertStateSpy.mock.calls[0][0].identifier).toBe(id);
}

function assetMonitoredServiceStateCalled(
  mock: PersistencePort<MonitoredServiceState>,
  expectedState: MonitoredServiceStates,
): void {
  const setMonitoredServiceStateSpy = jest.spyOn(mock, 'set');
  expect(setMonitoredServiceStateSpy).toBeCalledTimes(1);
  expect(setMonitoredServiceStateSpy.mock.calls[0][0].state).toBe(expectedState);
}

function assertTimerCalled(
  timerPort: TimerPort,
  escalationTargets: EscalationTarget<any>[],
  monitoredId: string,
): void {
  function mapTimerCall(timerPortStartSpy): { alertId: string; targetId: string; delay: string }[] {
    return timerPortStartSpy.mock.calls.map((call: [alertId: string, targetId: string, delay: string]) => {
      return { alertId: call[0], targetId: call[1], delay: call[2] };
    });
  }

  const timerPortStartSpy = jest.spyOn(timerPort, 'start');
  expect(timerPortStartSpy).toBeCalledTimes(2);

  const timerPortStartCalls: { alertId: string; targetId: string; delay: string }[] = mapTimerCall(timerPortStartSpy);

  escalationTargets.forEach((target) => {
    const timerPortStartCall = timerPortStartCalls.find((startCall) => startCall.targetId === target.identifier);
    expect(timerPortStartCall).toEqual({ alertId: monitoredId, targetId: target.identifier, delay: '15' });
  });
}

function assertNotificationCalled(notificationPortMock: NotificationPort<any>, message: string, to: any): void {
  function mapNotificationNotifyCall(smsNotificationNotifySpy): { message: string; to: any } {
    return {
      message: smsNotificationNotifySpy.mock.calls[0][0],
      to: smsNotificationNotifySpy.mock.calls[0][1],
    };
  }

  const notificationNotifySpy = jest.spyOn(notificationPortMock, 'notify');
  expect(notificationNotifySpy).toBeCalledTimes(1);
  const emailNotificationNotifyCall = mapNotificationNotifyCall(notificationNotifySpy);
  expect(emailNotificationNotifyCall).toEqual({ message, to });
}
