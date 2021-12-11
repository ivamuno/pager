import {
  AcknowledgementTimeout,
  Alert,
  AlertState,
  EscalationPolicy,
  EscalationTarget,
  MonitoredServiceState,
  MonitoredServiceStates,
  NotFoundError,
} from '../src/domain/model';

import { NotificationPort, PersistencePort, TimerPort } from '../src/domain/ports';

import { PagerService } from '../src/domain/services';
import { Fixture } from './fixture/fixture';
import { Mocks } from './fixture/mocks';
import { WellKnown } from './fixture/well-know.template';

const monitoredId = 'monitoredId:1234';

describe('PagerService (e2e)', () => {
  let fixture: Fixture;
  let mocks: Mocks;
  let sut: PagerService;

  beforeEach(() => {
    fixture = new Fixture();
    mocks = fixture.mocks;
    sut = fixture.sut;
    mocks.restart();
  });

  describe('alert operation', () => {
    describe('GIVEN a Monitored Service in a Healthy State', () => {
      describe('WHEN the Pager receives an Alert related to this Monitored Service', () => {
        test(`THEN the Monitored Service becomes Unhealthy,
            the Pager notifies all targets of the first level of the escalation policy,
            and sets a 15-minutes acknowledgement delay`, async () => {
          arrangeMonitoredServiceState(mocks.persistencePortMonitoredServiceStateMock, MonitoredServiceStates.health);

          const expectedEscalationPolicy = arrangeEscalationPolicy(mocks.escalationPolicyPortMock);

          const alert = new Alert(monitoredId, WellKnown.AlertMessage());
          await sut.alert(alert);

          assetMonitoredServiceStateCalled(
            mocks.persistencePortMonitoredServiceStateMock,
            MonitoredServiceStates.unhealth,
          );

          assertTimerCalled(mocks.timerPortMock, monitoredId, expectedEscalationPolicy.level.targets, 2);

          assertNotificationCalled(mocks.emailNotificationPortMock, WellKnown.AlertMessage(), {
            email: WellKnown.EscalationEmailTargetEmail1().payload.email,
          });

          assertNotificationCalled(mocks.smsNotificationPortMock, WellKnown.AlertMessage(), {
            phoneNumber: WellKnown.EscalationLevelTargetSMS1().payload.phoneNumber,
          });

          assetAlertStateCalled(mocks.persistencePortAlertStateMock, monitoredId);
        });
      });
    });

    describe(`GIVEN a Monitored Service in an Unhealthy State`, () => {
      describe(`WHEN the Pager receives an Alert related to this Monitored Service`, () => {
        test(`THEN the Pager doesn't notify any Target
            and doesn't set an acknowledgement delay`, async () => {
          arrangeMonitoredServiceState(mocks.persistencePortMonitoredServiceStateMock, MonitoredServiceStates.unhealth);

          const alertState = new AlertState(monitoredId, 'v1', WellKnown.AlertMessage(), WellKnown.EscalationLevel1());

          // It means receive the ACK
          alertState.escalationLevel.targets[0].isNotified = true;

          arrangeAlertState(mocks.persistencePortAlertStateMock, alertState);

          const alert = new Alert(monitoredId, WellKnown.AlertMessage());
          await sut.alert(alert);

          assertTimerIsNotCalled(mocks.timerPortMock);

          assertNotificationIsNotCalled(mocks.smsNotificationPortMock);
          assertNotificationIsNotCalled(mocks.emailNotificationPortMock);

          assetAlertStateIsNotCalled(mocks.persistencePortAlertStateMock);
        });
      });
    });
  });

  describe('setAcknowledgementTimeout operation', () => {
    describe(`GIVEN a Monitored Service in an Unhealthy State
      the corresponding Alert is not Acknowledged
      and the next level has not been notified`, () => {
      describe('WHEN the Pager receives the Acknowledgement Timeout', () => {
        test(`THEN the Pager notifies all targets of the next level of the escalation policy
            and sets a 15-minutes acknowledgement delay`, async () => {
          arrangeMonitoredServiceState(mocks.persistencePortMonitoredServiceStateMock, MonitoredServiceStates.unhealth);

          const alertState = new AlertState(monitoredId, 'v1', WellKnown.AlertMessage(), WellKnown.EscalationLevel1());
          const expectedAlertState = clone(alertState);
          arrangeAlertState(mocks.persistencePortAlertStateMock, alertState);

          const anyLevel1TargetId = WellKnown.EscalationLevelTargetSMS1().identifier;
          const ack = new AcknowledgementTimeout(monitoredId, anyLevel1TargetId);
          await sut.setAcknowledgementTimeout(ack);

          assertTimerCalled(mocks.timerPortMock, monitoredId, expectedAlertState.escalationLevel.nextLevel.targets, 1);

          assertNotificationCalled(mocks.smsNotificationPortMock, WellKnown.AlertMessage(), {
            phoneNumber: WellKnown.EscalationLevelTargetSMS2().payload.phoneNumber,
          });
          assertNotificationIsNotCalled(mocks.emailNotificationPortMock);

          assetAlertStateCalled(mocks.persistencePortAlertStateMock, monitoredId);
        });
      });
    });

    describe(`GIVEN a Monitored Service in an Unhealthy State
        the corresponding Alert is not Acknowledged
        and there is not next level`, () => {
      describe('WHEN the Pager receives the Acknowledgement Timeout', () => {
        test(`THEN the Pager throws an error`, async () => {
          arrangeMonitoredServiceState(mocks.persistencePortMonitoredServiceStateMock, MonitoredServiceStates.unhealth);

          const alertState = new AlertState(monitoredId, 'v1', WellKnown.AlertMessage(), WellKnown.EscalationLevel2());
          arrangeAlertState(mocks.persistencePortAlertStateMock, alertState);

          const anyLevel1TargetId = WellKnown.EscalationLevelTargetSMS1().identifier;
          const ack = new AcknowledgementTimeout(monitoredId, anyLevel1TargetId);

          try {
            await sut.setAcknowledgementTimeout(ack);
          } catch (err) {
            expect(err).toBeInstanceOf(NotFoundError);
          } finally {
            assertTimerIsNotCalled(mocks.timerPortMock);

            assertNotificationIsNotCalled(mocks.smsNotificationPortMock);
            assertNotificationIsNotCalled(mocks.emailNotificationPortMock);

            assetAlertStateIsNotCalled(mocks.persistencePortAlertStateMock);
          }
        });
      });
    });

    describe(`GIVEN a Monitored Service in an Unhealthy State`, () => {
      describe(`WHEN the Pager receives the Acknowledgement 
        and later receives the Acknowledgement Timeout`, () => {
        test(`THEN the Pager doesn't notify any Target
            and doesn't set an acknowledgement delay`, async () => {
          arrangeMonitoredServiceState(mocks.persistencePortMonitoredServiceStateMock, MonitoredServiceStates.unhealth);

          const alertState = new AlertState(monitoredId, 'v1', WellKnown.AlertMessage(), WellKnown.EscalationLevel1());

          // It means receive the ACK
          alertState.escalationLevel.targets[0].isNotified = true;

          arrangeAlertState(mocks.persistencePortAlertStateMock, alertState);

          const anyLevel1TargetId = WellKnown.EscalationLevelTargetSMS1().identifier;
          const ack = new AcknowledgementTimeout(monitoredId, anyLevel1TargetId);
          await sut.setAcknowledgementTimeout(ack);

          assertTimerIsNotCalled(mocks.timerPortMock);

          assertNotificationIsNotCalled(mocks.smsNotificationPortMock);
          assertNotificationIsNotCalled(mocks.emailNotificationPortMock);

          assetAlertStateIsNotCalled(mocks.persistencePortAlertStateMock);
        });
      });
    });

    describe(`GIVEN a Monitored Service in a Healthy State`, () => {
      describe(`WHEN the Pager receives the Acknowledgement Timeout`, () => {
        test(`THEN the Pager doesn't notify any Target
            and doesn't set an acknowledgement delay`, async () => {
          arrangeMonitoredServiceState(mocks.persistencePortMonitoredServiceStateMock, MonitoredServiceStates.health);

          const alertState = new AlertState(monitoredId, 'v1', WellKnown.AlertMessage(), WellKnown.EscalationLevel1());
          arrangeAlertState(mocks.persistencePortAlertStateMock, alertState);

          const anyLevel1TargetId = WellKnown.EscalationLevelTargetSMS1().identifier;
          const ack = new AcknowledgementTimeout(monitoredId, anyLevel1TargetId);
          await sut.setAcknowledgementTimeout(ack);

          assertTimerIsNotCalled(mocks.timerPortMock);

          assertNotificationIsNotCalled(mocks.smsNotificationPortMock);
          assertNotificationIsNotCalled(mocks.emailNotificationPortMock);

          assetAlertStateIsNotCalled(mocks.persistencePortAlertStateMock);
        });
      });
    });
  });
});

function arrangeMonitoredServiceState(persistencePortMonitoredServiceStateMock, state: MonitoredServiceStates): void {
  persistencePortMonitoredServiceStateMock.get = jest.fn().mockImplementationOnce((id: string) => {
    expect(id).toBe(monitoredId);
    return new MonitoredServiceState(monitoredId, 'v1', state);
  });
}

function arrangeAlertState(persistencePortAlertStateMock, alertState: AlertState): void {
  persistencePortAlertStateMock.get = jest.fn().mockImplementationOnce((id: string) => {
    expect(id).toBe(monitoredId);
    return alertState;
  });
}

function arrangeEscalationPolicy(escalationPolicyPortMock): EscalationPolicy {
  const escalationPolicy: EscalationPolicy = WellKnown.EscalationPolicyTemplateFactory(monitoredId);

  escalationPolicyPortMock.get = jest.fn().mockImplementationOnce((id: string) => {
    expect(id).toBe(monitoredId);
    return escalationPolicy;
  });

  return clone(escalationPolicy);
}

function assetAlertStateCalled(mock: PersistencePort<AlertState>, id: string): void {
  const setAlertStateSpy = jest.spyOn(mock, 'set');
  expect(setAlertStateSpy).toBeCalledTimes(1);
  expect(setAlertStateSpy.mock.calls[0][0].identifier).toBe(id);
}

function assetAlertStateIsNotCalled(mock: PersistencePort<AlertState>): void {
  const setAlertStateSpy = jest.spyOn(mock, 'set');
  expect(setAlertStateSpy).not.toBeCalled();
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
  monitoredId: string,
  escalationTargets: EscalationTarget<any>[],
  times: number,
): void {
  type TimerPortArgs = { acknowledgementTimeout: AcknowledgementTimeout; delay: string };

  function mapTimerCall(timerPortStartSpy): TimerPortArgs[] {
    return timerPortStartSpy.mock.calls.map((call: [acknowledgementTimeout: AcknowledgementTimeout, delay: string]) => {
      return { acknowledgementTimeout: call[0], delay: call[1] };
    });
  }

  const timerPortStartSpy = jest.spyOn(timerPort, 'start');
  expect(timerPortStartSpy).toBeCalledTimes(times);

  const timerPortStartCalls: TimerPortArgs[] = mapTimerCall(timerPortStartSpy);

  escalationTargets.forEach((target) => {
    const timerPortStartCall = timerPortStartCalls.find(
      (startCall) => startCall.acknowledgementTimeout.targetId === target.identifier,
    );

    const expectedMonitoredServiceId: TimerPortArgs = {
      acknowledgementTimeout: { monitoredServiceId: monitoredId, targetId: target.identifier },
      delay: '15',
    };
    expect(timerPortStartCall).toEqual(expectedMonitoredServiceId);
  });
}

function assertTimerIsNotCalled(timerPort: TimerPort): void {
  const timerPortStartSpy = jest.spyOn(timerPort, 'start');
  expect(timerPortStartSpy).not.toBeCalled();
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

function assertNotificationIsNotCalled(notificationPortMock: NotificationPort<any>): void {
  const notificationNotifySpy = jest.spyOn(notificationPortMock, 'notify');
  expect(notificationNotifySpy).not.toBeCalled();
}

function clone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input));
}
