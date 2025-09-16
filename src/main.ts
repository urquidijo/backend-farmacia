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
      'http://localhost:8081',
      'http://192.168.26.3:8081',
      'http://192.168.15.40:8081',
    ],
    credentials: true,
  })

  await app.listen(process.env.PORT ?? 3001)
}
bootstrap()
