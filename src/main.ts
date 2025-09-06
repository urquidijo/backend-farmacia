import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
app.enableCors({
  origin: [
    'http://localhost:3000', // desarrollo local
    'https://frontend-farmacia-iota.vercel.app', // frontend en Vercel
  ],
  credentials: true,
});


  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
