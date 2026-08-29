import { Global, Module } from '@nestjs/common';
import { CLOCK, SystemClock } from './clock';
import { WorkspaceCalendar } from './workspace-calendar';

@Global()
@Module({
  providers: [
    SystemClock,
    { provide: CLOCK, useExisting: SystemClock },
    WorkspaceCalendar,
  ],
  exports: [CLOCK, WorkspaceCalendar],
})
export class TimeModule {}
