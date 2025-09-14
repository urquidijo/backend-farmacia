import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser' 

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api'); // <--- agrega esta línea
  app.use(cookieParser())                      

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }))

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://frontend-farmacia-iota.vercel.app',
    ],
    credentials: true,
  })

  await app.listen(process.env.PORT ?? 3001)
}
bootstrap()
