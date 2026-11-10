import {
  Controller,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiSessionAuth } from '../common/swagger';
import { Serialize } from '../interceptors/serialize.interceptor';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import { VinLookupParamsDto } from './dtos/vin-lookup-params.dto';
import { VinLookupDto } from './dtos/vin-lookup.dto';
import {
  VIN_DECODER,
  VinDecoderUnavailableError,
  type DecodedVin,
  type VinDecoder,
} from './vin-decoder';

@ApiTags('Vehicles')
@ApiSessionAuth()
@Controller('vehicles/vin-lookup')
@UseGuards(SessionAuthGuard)
export class VinLookupController {
  private readonly logger = new Logger(VinLookupController.name);

  constructor(@Inject(VIN_DECODER) private readonly decoder: VinDecoder) {}

  @ApiOperation({
    summary: 'Look up vehicle data by VIN',
    description:
      'Returns only what the provider identifies, other fields are null. European vehicles often have no model or fuel type.',
  })
  @ApiOkResponse({ type: VinLookupDto })
  @ApiBadRequestResponse({ description: 'VIN format is invalid' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Provider does not recognize this VIN' })
  @ApiServiceUnavailableResponse({ description: 'VIN provider unavailable' })
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':vin')
  @Serialize(VinLookupDto)
  async lookup(@Param() { vin }: VinLookupParamsDto): Promise<VinLookupDto> {
    const decoded = await this.decode(vin);
    if (!decoded) throw new NotFoundException('VIN not recognized');
    return { vin, ...decoded };
  }

  private async decode(vin: string): Promise<DecodedVin | null> {
    try {
      return await this.decoder.decode(vin);
    } catch (error) {
      if (!(error instanceof VinDecoderUnavailableError)) throw error;
      this.logger.warn(`VIN lookup failed: ${String(error.reason)}`);
      throw new ServiceUnavailableException('VIN lookup is unavailable');
    }
  }
}
