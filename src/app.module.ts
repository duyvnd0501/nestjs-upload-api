import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadsController } from './uploads/uploads.controller';
import { S3Service } from './services/s3/s3.service';
import { VideoProcessingService } from './services/video-processing/video-processing.service';
import { ImageAnalysisService } from './services/image-analysis/image-analysis.service';
import { FileUploadController } from './file-upload/file-upload.controller';

@Module({
  controllers: [AppController, UploadsController, FileUploadController],
  providers: [
    AppService,
    S3Service,
    VideoProcessingService,
    ImageAnalysisService,
  ],
})
export class AppModule {}
