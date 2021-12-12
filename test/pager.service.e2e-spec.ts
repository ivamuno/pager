import { Acknowledgement, Alert, AlertState, MonitoredServiceStates, NotFoundError } from '../src/domain/model';

import { PagerService } from '../src/domain/services';
import { Fixture } from './fixture/fixture';
import { Mocks } from './fixture/mocks';
import { WellKnown } from './fixture/well-know.template';
import { PagerServiceTestHelper } from './pager-service.test-helper';

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
          PagerServiceTestHelper.ArrangeMonitoredServiceState(mocks.persistencePortMock, MonitoredServiceStates.health);

          const expectedEscalationPolicy = PagerServiceTestHelper.ArrangeEscalationPolicy(
            mocks.escalationPolicyPortMock,
          );

          const alert = new Alert(WellKnown.MonitoredId(), WellKnown.AlertMessage());
          await sut.alert(alert);

          PagerServiceTestHelper.AssertTimerCalled(
            mocks.timerPortMock,
            WellKnown.MonitoredId(),
            expectedEscalationPolicy.level.targets,
            2,
          );

          PagerServiceTestHelper.AssertNotificationCalled(mocks.emailNotificationPortMock, WellKnown.AlertMessage(), {
            email: WellKnown.EscalationEmailTargetEmail1().payload.email,
          });

          PagerServiceTestHelper.AssertNotificationCalled(mocks.smsNotificationPortMock, WellKnown.AlertMessage(), {
            phoneNumber: WellKnown.EscalationLevelTargetSMS1().payload.phoneNumber,
          });

          PagerServiceTestHelper.AssetPersistencePortCalled(mocks.persistencePortMock, MonitoredServiceStates.unhealth);
        });
      });
    });

    describe(`GIVEN a Monitored Service in an Unhealthy State`, () => {
      describe(`WHEN the Pager receives an Alert related to this Monitored Service`, () => {
        test(`THEN the Pager doesn't notify any Target
            and doesn't set an acknowledgement delay`, async () => {
          const alertState = new AlertState(
            WellKnown.MonitoredId(),
            WellKnown.AlertMessage(),
            WellKnown.EscalationLevel1(),
          );
          alertState.escalationLevel.targets[0].isAckReceived = true;
          PagerServiceTestHelper.ArrangeMonitoredServiceState(
            mocks.persistencePortMock,
            MonitoredServiceStates.unhealth,
            alertState,
          );

          const alert = new Alert(WellKnown.MonitoredId(), WellKnown.AlertMessage());
          await sut.alert(alert);

          PagerServiceTestHelper.AssertTimerIsNotCalled(mocks.timerPortMock);

          PagerServiceTestHelper.AssertNotificationIsNotCalled(mocks.smsNotificationPortMock);
          PagerServiceTestHelper.AssertNotificationIsNotCalled(mocks.emailNotificationPortMock);

          PagerServiceTestHelper.AssetPersistencePortIsNotCalled(mocks.persistencePortMock);
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
          const alertState = new AlertState(
            WellKnown.MonitoredId(),
            WellKnown.AlertMessage(),
            WellKnown.EscalationLevel1(),
          );
          const expectedAlertState = PagerServiceTestHelper.Clone(alertState);
          PagerServiceTestHelper.ArrangeMonitoredServiceState(
            mocks.persistencePortMock,
            MonitoredServiceStates.unhealth,
            alertState,
          );

          const anyLevel1TargetId = WellKnown.EscalationLevelTargetSMS1().identifier;
          const ack = new Acknowledgement(WellKnown.MonitoredId(), anyLevel1TargetId);
          await sut.setAcknowledgementTimeout(ack);

          PagerServiceTestHelper.AssertTimerCalled(
            mocks.timerPortMock,
            WellKnown.MonitoredId(),
            expectedAlertState.escalationLevel.nextLevel.targets,
            1,
          );

          PagerServiceTestHelper.AssertNotificationCalled(mocks.smsNotificationPortMock, WellKnown.AlertMessage(), {
            phoneNumber: WellKnown.EscalationLevelTargetSMS2().payload.phoneNumber,
          });
          PagerServiceTestHelper.AssertNotificationIsNotCalled(mocks.emailNotificationPortMock);

          PagerServiceTestHelper.AssetPersistencePortCalled(mocks.persistencePortMock, MonitoredServiceStates.unhealth);
        });
      });
    });

    describe(`GIVEN a Monitored Service in an Unhealthy State
        the corresponding Alert is not Acknowledged
        and there is not next level`, () => {
      describe('WHEN the Pager receives the Acknowledgement Timeout', () => {
        test(`THEN the Pager throws an error`, async () => {
          const alertState = new AlertState(
            WellKnown.MonitoredId(),
            WellKnown.AlertMessage(),
            WellKnown.EscalationLevel2(),
          );
          PagerServiceTestHelper.ArrangeMonitoredServiceState(
            mocks.persistencePortMock,
            MonitoredServiceStates.unhealth,
            alertState,
          );

          const anyLevel1TargetId = WellKnown.EscalationLevelTargetSMS1().identifier;
          const ack = new Acknowledgement(WellKnown.MonitoredId(), anyLevel1TargetId);

          try {
            await sut.setAcknowledgementTimeout(ack);
          } catch (err) {
            expect(err).toBeInstanceOf(NotFoundError);
          } finally {
            PagerServiceTestHelper.AssertTimerIsNotCalled(mocks.timerPortMock);

            PagerServiceTestHelper.AssertNotificationIsNotCalled(mocks.smsNotificationPortMock);
            PagerServiceTestHelper.AssertNotificationIsNotCalled(mocks.emailNotificationPortMock);

            PagerServiceTestHelper.AssetPersistencePortIsNotCalled(mocks.persistencePortMock);
          }
        });
      });
    });

    describe(`GIVEN a Monitored Service in an Unhealthy State`, () => {
      describe(`WHEN the Pager receives the Acknowledgement 
        and later receives the Acknowledgement Timeout`, () => {
        test(`THEN the Pager doesn't notify any Target
            and doesn't set an acknowledgement delay`, async () => {
          const alertState = new AlertState(
            WellKnown.MonitoredId(),
            WellKnown.AlertMessage(),
            WellKnown.EscalationLevel1(),
          );
          // It means receive the ACK
          alertState.escalationLevel.targets[0].isAckReceived = true;
          PagerServiceTestHelper.ArrangeMonitoredServiceState(
            mocks.persistencePortMock,
            MonitoredServiceStates.unhealth,
            alertState,
          );

          const anyLevel1TargetId = WellKnown.EscalationLevelTargetSMS1().identifier;
          const ack = new Acknowledgement(WellKnown.MonitoredId(), anyLevel1TargetId);
          await sut.setAcknowledgementTimeout(ack);

          PagerServiceTestHelper.AssertTimerIsNotCalled(mocks.timerPortMock);

          PagerServiceTestHelper.AssertNotificationIsNotCalled(mocks.smsNotificationPortMock);
          PagerServiceTestHelper.AssertNotificationIsNotCalled(mocks.emailNotificationPortMock);

          PagerServiceTestHelper.AssetPersistencePortIsNotCalled(mocks.persistencePortMock);
        });
      });
    });

    describe(`GIVEN a Monitored Service in a Healthy State`, () => {
      describe(`WHEN the Pager receives the Acknowledgement Timeout`, () => {
        test(`THEN the Pager doesn't notify any Target
            and doesn't set an acknowledgement delay`, async () => {
          PagerServiceTestHelper.ArrangeMonitoredServiceState(mocks.persistencePortMock, MonitoredServiceStates.health);

          const anyLevel1TargetId = WellKnown.EscalationLevelTargetSMS1().identifier;
          const ack = new Acknowledgement(WellKnown.MonitoredId(), anyLevel1TargetId);
          await sut.setAcknowledgementTimeout(ack);

          PagerServiceTestHelper.AssertTimerIsNotCalled(mocks.timerPortMock);

          PagerServiceTestHelper.AssertNotificationIsNotCalled(mocks.smsNotificationPortMock);
          PagerServiceTestHelper.AssertNotificationIsNotCalled(mocks.emailNotificationPortMock);

          PagerServiceTestHelper.AssetPersistencePortIsNotCalled(mocks.persistencePortMock);
        });
      });
    });
  });

  describe('setHealthy operation', () => {
    describe('GIVEN a Monitored Service in a Unhealthy State', () => {
      describe('WHEN the Pager receives a Healthy event related to this Monitored Service', () => {
        test(`THEN the Monitored Service ignore the event`, async () => {
          PagerServiceTestHelper.ArrangeMonitoredServiceState(
            mocks.persistencePortMock,
            MonitoredServiceStates.unhealth,
          );

          await sut.setHealthy(WellKnown.MonitoredId());

          PagerServiceTestHelper.AssetPersistencePortCalled(mocks.persistencePortMock, MonitoredServiceStates.health);
        });
      });
    });

    describe('GIVEN a Monitored Service in a Healthy State', () => {
      describe('WHEN the Pager receives a Healthy event related to this Monitored Service', () => {
        test(`THEN the Monitored Service becomes Unhealthy`, async () => {
          PagerServiceTestHelper.ArrangeMonitoredServiceState(mocks.persistencePortMock, MonitoredServiceStates.health);

          await sut.setHealthy(WellKnown.MonitoredId());

          PagerServiceTestHelper.AssetPersistencePortIsNotCalled(mocks.persistencePortMock);
        });
      });
    });
  });

  describe('setAcknowledgement operation', () => {
    describe('GIVEN a Monitored Service in a Unhealthy State', () => {
      describe('WHEN a target acknowledges the alert within 15-minutes', () => {
        test(`THEN alert is flagged as acknowledged`, async () => {
          const alertState = new AlertState(
            WellKnown.MonitoredId(),
            WellKnown.AlertMessage(),
            WellKnown.EscalationLevel1(),
          );
          PagerServiceTestHelper.ArrangeMonitoredServiceState(
            mocks.persistencePortMock,
            MonitoredServiceStates.unhealth,
            alertState,
          );

          const anyLevel1TargetId = WellKnown.EscalationLevelTargetSMS1().identifier;
          const ack = new Acknowledgement(WellKnown.MonitoredId(), anyLevel1TargetId);
          await sut.setAcknowledgement(ack);

          const isAckRecevided: boolean = true;
          PagerServiceTestHelper.AssetPersistencePortCalled(
            mocks.persistencePortMock,
            MonitoredServiceStates.unhealth,
            isAckRecevided,
          );
        });
      });
    });

    describe('GIVEN a Monitored Service in a Unhealthy State', () => {
      describe('WHEN a target acknowledges the alert out 15-minutes', () => {
        test(`THEN the Monitored Service ignore the event`, async () => {
          const alertState = new AlertState(
            WellKnown.MonitoredId(),
            WellKnown.AlertMessage(),
            WellKnown.EscalationLevel1(),
          );
          PagerServiceTestHelper.ArrangeMonitoredServiceState(
            mocks.persistencePortMock,
            MonitoredServiceStates.unhealth,
            alertState,
          );

          const ack = new Acknowledgement(WellKnown.MonitoredId(), 'inventedACK');
          await sut.setAcknowledgement(ack);

          PagerServiceTestHelper.AssetPersistencePortIsNotCalled(mocks.persistencePortMock);
        });
      });
    });

    describe('GIVEN a Monitored Service in a Healthy State', () => {
      describe('WHEN a target acknowledges the alert', () => {
        test(`THEN the Monitored Service ignore the event`, async () => {
          PagerServiceTestHelper.ArrangeMonitoredServiceState(mocks.persistencePortMock, MonitoredServiceStates.health);

          const anyLevel1TargetId = WellKnown.EscalationLevelTargetSMS1().identifier;
          const ack = new Acknowledgement(WellKnown.MonitoredId(), anyLevel1TargetId);
          await sut.setAcknowledgement(ack);

          PagerServiceTestHelper.AssetPersistencePortIsNotCalled(mocks.persistencePortMock);
        });
      });
    });
  });
});
