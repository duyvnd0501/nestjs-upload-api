import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../services/s3/s3.service';
import { VideoProcessingService } from '../services/video-processing/video-processing.service';
import { ImageAnalysisService } from '../services/image-analysis/image-analysis.service';
import * as path from 'path';
import { rmSync } from 'fs';
import * as formidable from 'formidable';
import { Observable } from 'rxjs';

@Controller('upload')
export class UploadsController {
  constructor(
    private s3Service: S3Service,
    private videoProcessingService: VideoProcessingService,
    private imageAnalysisService: ImageAnalysisService,
  ) {}
  @Get()
  getHello(): string {
    return 'This is upload controller';
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 10000 * 1024 }),
          new FileTypeValidator({ fileType: /^image/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Upload image to S3
    console.log(file, 'file');
    const filePath = path.resolve(__dirname, file.originalname);
    const fileName = `${Date.now()}_${file.originalname}`;
    const s3Url = await this.s3Service.uploadFile(filePath, fileName);
    // Simulate image analysis
    const analysisResult : any = await this.imageAnalysisService.analyzeBrand(filePath);

    return {
      message: 'Image uploaded and analyzed successfully',
      s3Url,
      analysisResult,
    };
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    try {
      const fileName = Date.now() + file.originalname;
      const frames = await this.videoProcessingService.uploadVideo(
        file,
        fileName,
      );
      console.log(frames);
      const frameFolder = './uploads/' + fileName;
      // Upload image to S3
      await Promise.all(
        frames.map((frame) => {
          this.s3Service.uploadFile(frameFolder + '/' + frame, frame);
        }),
      );
      // Assume analyze the frames, then sum exposure times.
      const exposureResults = await Promise.all(
        frames.map((frame) => this.imageAnalysisService.analyzeBrand(frame)),
      );
      rmSync(frameFolder, { recursive: true, force: true }); // Remove local frames folder after processing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const totalExposureTime = exposureResults.reduce(
        (sum, result) => sum + result.exposureTime,
        0,
      );

      return { exposureTime: totalExposureTime };
    } catch (error) {
      console.log(error);
      return { exposureTime: null };
    }
  }
  // This action for testing upload large file
  @Post('large-video')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File): Observable<any> {
    return new Observable((observer) => {
      const form = new formidable.IncomingForm();

      // Set limits for the file upload, like max file size
      form.maxFileSize = 500 * 1024 * 1024; // 500MB (Adjust this based on your needs)

      form.parse(file, async (err, fields, files) => {
        if (err) {
          observer.error(err);
          return {};
        }
        // Handle the file here
        console.log('Uploaded file:', files);
        const fileName = Date.now() + file.originalname;
        const frames = await this.videoProcessingService.uploadVideo(
          file,
          fileName,
        );
        console.log(frames);
        const frameFolder = './uploads/' + fileName;
        // Upload image to S3
        await Promise.all(
          frames.map((frame) => {
            this.s3Service.uploadFile(frameFolder + '/' + frame, frame);
          }),
        );
        // Assume analyze the frames, then sum exposure times.
        const exposureResults = await Promise.all(
          frames.map((frame) => this.imageAnalysisService.analyzeBrand(frame)),
        );
        rmSync(frameFolder, { recursive: true, force: true }); // Remove local frames folder after processing
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const totalExposureTime = exposureResults.reduce(
          (sum, result) => sum + result.exposureTime,
          0,
        );
        observer.next({
          message: 'File uploaded successfully!',
          exposureTime: totalExposureTime,
        });
        observer.complete();
      });
    });
  }
}
