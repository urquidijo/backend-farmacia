import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { RecsService } from './recs.service';

@Controller('recs')
export class RecsController {
  constructor(private readonly recs: RecsService) {}

  // GET /recs/home?userId=123
  @Get('home')
  async home(@Query('userId') userId?: string) {
    const uid = userId ? Number(userId) : undefined;
    const data = await this.recs.recsForHome(uid);
    return { ok: true, items: data };
  }

  // GET /recs/product/:id
  @Get('product/:id')
  async product(@Param('id') id: string, @Query('take') take?: string) {
    const items = await this.recs.recsForProduct(Number(id), take ? Number(take) : 12);
    return { ok: true, items };
  }

  // POST /recs/cart  { items: number[] }
  @Post('cart')
  async cart(@Body() body: { items: number[]; take?: number }) {
    const { items, take } = body;
    const data = await this.recs.recsForCart(items ?? [], take ?? 16);
    return { ok: true, items: data };
  }
}
