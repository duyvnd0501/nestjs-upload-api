import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Increase body size limit to handle large video files
  app.use(bodyParser.json({ limit: '15gb' }));
  app.use(bodyParser.urlencoded({ limit: '15gb', extended: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
