import {
  EscalationEmailTarget,
  EscalationLevel,
  EscalationPolicy,
  EscalationSMSTarget,
  MonitoredService,
} from '../../src/domain/model';

export class WellKnown {
  static AlertMessage = () => 'service down';

  static EscalationLevelTargetSMS2 = () =>
    new EscalationSMSTarget('targetSMS2', false, { phoneNumber: 'targetSMSNumber2' });

  static EscalationLevel2 = () => new EscalationLevel([WellKnown.EscalationLevelTargetSMS2()]);

  static EscalationLevelTargetSMS1 = () =>
    new EscalationSMSTarget('targetSMS1', false, {
      phoneNumber: 'targetSMSNumber1',
    });

  static EscalationEmailTargetEmail1 = () =>
    new EscalationEmailTarget('targetEmail1', false, {
      email: 'targetEmailEmail1',
    });

  static EscalationLevel1 = () =>
    new EscalationLevel(
      [WellKnown.EscalationLevelTargetSMS1(), WellKnown.EscalationEmailTargetEmail1()],
      WellKnown.EscalationLevel2(),
    );

  static EscalationPolicyTemplateFactory: (monitoredId: string) => EscalationPolicy = (monitoredId: string) =>
    new EscalationPolicy(new MonitoredService(monitoredId), WellKnown.EscalationLevel1());
}
