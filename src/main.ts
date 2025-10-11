import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser' 
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
   const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api'); // <--- agrega esta línea
  app.use(cookieParser())         
  app.set('trust proxy', 1); // si usas proxy/reverse-proxy             

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
