import { Body, Controller, Headers, Post } from '@nestjs/common';
import { RxVerifyService } from './rx-verify.service';

@Controller('rx')
export class RxVerifyController {
  constructor(private readonly svc: RxVerifyService) {}

  // 1) ¿el carrito necesita receta?
  @Post('needs')
  async needs(@Headers('x-user-id') userIdRaw: string) {
    const userId = Number(userIdRaw ?? 0);
    const r = await this.svc.cartNeedsRx(userId);
    return r; // { needsRx: boolean }
  }

  // 2) subir/validar receta (dataURL) y emitir verificationId
  @Post('verify')
  async verify(
    @Headers('x-user-id') userIdRaw: string,
    @Body() body: { imageBase64: string },
  ) {
    const userId = Number(userIdRaw ?? 0);
    const { imageBase64 } = body;
    const r = await this.svc.verifyPrescription(userId, imageBase64);
    return r; // { ok, matched, missing, ocr?, verificationId }
  }
}
