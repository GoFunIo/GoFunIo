import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { NhtsaVinDecoder } from './nhtsa-vin-decoder';
import { VIN_DECODER } from './vin-decoder';
import { VinLookupController } from './vin-lookup.controller';

@Module({
  imports: [UsersModule],
  controllers: [VinLookupController],
  providers: [{ provide: VIN_DECODER, useClass: NhtsaVinDecoder }],
})
export class VinLookupModule {}
