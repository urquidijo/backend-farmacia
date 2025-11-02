import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { json, urlencoded } from 'express'
import { NestExpressApplication } from '@nestjs/platform-express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.setGlobalPrefix('api')
  app.use(cookieParser())
  app.set('trust proxy', 1)

  // 1) Webhook de Stripe: cuerpo crudo + límite pequeño (no cambiar aquí)
  app.use(
    '/api/pagos/webhook',
    json({
      limit: '2mb', // opcional
      verify: (req: any, _res, buf) => (req.rawBody = buf.toString()),
    }),
  )

  // 2) Resto del body: SUBE el límite para permitir dataURL/base64 grandes
  app.use(json({ limit: '20mb' }))
  app.use(urlencoded({ extended: true, limit: '20mb' }))

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://frontend-farmacia-iota.vercel.app',
      'http://localhost:8081',
      'http://192.168.26.3:8081',
      'http://192.168.15.40:8081',
    ],
    credentials: true,
  })

  await app.listen(process.env.PORT ?? 3001)
}
bootstrap()
