import { Controller, Get } from '@nestjs/common';

@Controller('file-upload')
export class FileUploadController {
  @Get()
  getHello(): string {
    return 'This is upload controller';
  }
}
