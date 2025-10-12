import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { json, urlencoded } from 'express'
import { NestExpressApplication } from '@nestjs/platform-express' // ✅ importante

async function bootstrap() {
  // ✅ Cambiamos a NestExpressApplication para habilitar .set()
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.setGlobalPrefix('api')
  app.use(cookieParser())
  app.set('trust proxy', 1) // ahora sí funciona correctamente

  // ⚙️ Stripe necesita el cuerpo crudo en el webhook
  app.use(
    '/api/pagos/webhook',
    json({ verify: (req: any, res, buf) => (req.rawBody = buf.toString()) })
  )

  // El resto del body se parsea normalmente
  app.use(json())
  app.use(urlencoded({ extended: true }))

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
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
