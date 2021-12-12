import {
  Acknowledgement,
  AlertState,
  EscalationPolicy,
  EscalationTarget,
  MonitoredServiceState,
  MonitoredServiceStates,
} from '../src/domain/model';

import { NotificationPort, PersistencePort, TimerPort } from '../src/domain/ports';

import { WellKnown } from './fixture/well-know.template';

export class PagerServiceTestHelper {
  static ArrangeMonitoredServiceState(
    persistencePortMock: PersistencePort,
    state: MonitoredServiceStates,
    alertState: AlertState = undefined,
  ): void {
    persistencePortMock.getMonitoredServiceState = jest.fn().mockImplementationOnce((id: string) => {
      expect(id).toBe(WellKnown.MonitoredId());
      return new MonitoredServiceState(WellKnown.MonitoredId(), state, alertState);
    });
  }

  static ArrangeEscalationPolicy(escalationPolicyPortMock): EscalationPolicy {
    const escalationPolicy: EscalationPolicy = WellKnown.EscalationPolicyTemplateFactory(WellKnown.MonitoredId());

    escalationPolicyPortMock.get = jest.fn().mockImplementationOnce((id: string) => {
      expect(id).toBe(WellKnown.MonitoredId());
      return escalationPolicy;
    });

    return PagerServiceTestHelper.Clone(escalationPolicy);
  }

  static AssetPersistencePortCalled(
    mock: PersistencePort,
    expectedState: MonitoredServiceStates,
    isAckReceived: boolean = undefined,
  ): void {
    const setMonitoredServiceStateSpy = jest.spyOn(mock, 'setMonitoredServiceState');
    expect(setMonitoredServiceStateSpy).toBeCalledTimes(1);
    expect(setMonitoredServiceStateSpy.mock.calls[0][0].state).toBe(expectedState);
    if (isAckReceived) {
      expect(setMonitoredServiceStateSpy.mock.calls[0][0].alertState.escalationLevel.isAckReceived()).toBe(
        isAckReceived,
      );
    }
  }

  static AssetPersistencePortIsNotCalled(mock: PersistencePort): void {
    const setMonitoredServiceStateSpy = jest.spyOn(mock, 'setMonitoredServiceState');
    expect(setMonitoredServiceStateSpy).not.toBeCalled();
  }

  static AssertTimerCalled(
    timerPort: TimerPort,
    monitoredId: string,
    escalationTargets: EscalationTarget<any>[],
    times: number,
  ): void {
    type TimerPortArgs = { acknowledgementTimeout: Acknowledgement; delay: string };

    function mapTimerCall(timerPortStartSpy): TimerPortArgs[] {
      return timerPortStartSpy.mock.calls.map((call: [acknowledgementTimeout: Acknowledgement, delay: string]) => {
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

  static AssertTimerIsNotCalled(timerPort: TimerPort): void {
    const timerPortStartSpy = jest.spyOn(timerPort, 'start');
    expect(timerPortStartSpy).not.toBeCalled();
  }

  static AssertNotificationCalled(notificationPortMock: NotificationPort<any>, message: string, to: any): void {
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

  static AssertNotificationIsNotCalled(notificationPortMock: NotificationPort<any>): void {
    const notificationNotifySpy = jest.spyOn(notificationPortMock, 'notify');
    expect(notificationNotifySpy).not.toBeCalled();
  }

  static Clone<T>(input: T): T {
    return JSON.parse(JSON.stringify(input));
  }
}
