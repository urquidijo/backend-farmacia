import { Module } from '@nestjs/common'
import { LotesService } from './lotes.service'
import { LotesController } from './lotes.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { AlertsModule } from '../alerts/alerts.module'

@Module({
  imports: [PrismaModule, AlertsModule],
  controllers: [LotesController],
  providers: [LotesService],
  exports: [LotesService],
})
export class LotesModule {}
