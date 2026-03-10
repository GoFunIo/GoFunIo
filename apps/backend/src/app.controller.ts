import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('status')
  getStatus() {
    return { message: 'backend is connected' };
  }
}
