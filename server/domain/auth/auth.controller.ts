import { Controller, Get } from '@nestjs/common';

@Controller('/api/auth')
export class AuthController {
  @Get('me')
  static login(): Record<string, unknown> {
    return { user: 123, email: 'test@gmail.com' };
  }
}
