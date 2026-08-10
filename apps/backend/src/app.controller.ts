import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @ApiOperation({ summary: 'Get backend status' })
  @Get('status')
  getStatus() {
    return { message: 'backend is connected' };
  }
}
