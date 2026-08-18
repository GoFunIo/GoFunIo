import { Global, Module } from '@nestjs/common';
import { AllowedOriginGuard } from './allowed-origin.guard';
import {
  ConfiguredFrontendOrigins,
  FRONTEND_ORIGINS,
} from './frontend-origins';

@Global()
@Module({
  providers: [
    ConfiguredFrontendOrigins,
    { provide: FRONTEND_ORIGINS, useExisting: ConfiguredFrontendOrigins },
    AllowedOriginGuard,
  ],
  exports: [FRONTEND_ORIGINS, AllowedOriginGuard],
})
export class FrontendOriginsModule {}
