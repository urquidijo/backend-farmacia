import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Controller()
export class MeController {
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: any) {
    // req.user viene de JwtStrategy.validate()
    return req.user
  }
}
