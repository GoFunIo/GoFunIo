import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @ApiOperation({ summary: 'Get backend status' })
  @ApiOkResponse({ description: 'Backend is connected' })
  @Get('status')
  getStatus() {
    return { message: 'backend is connected' };
  }
}
