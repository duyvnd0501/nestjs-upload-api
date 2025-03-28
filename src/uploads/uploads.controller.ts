import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator, Req, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../services/s3/s3.service';
import { VideoProcessingService } from '../services/video-processing/video-processing.service';
import { ImageAnalysisService } from '../services/image-analysis/image-analysis.service';
import * as path from 'path';
import { rmSync, unlinkSync } from 'fs';
import formidable from 'formidable';
import { Observable } from 'rxjs';
import { diskStorage } from 'multer';
import { Request, Response } from 'express';

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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          callback(null, Date.now() + file.originalname);
        },
      }),
    }),
  )
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
    const filePath = path.resolve('./uploads', file.filename);
    const s3Url = await this.s3Service.uploadFile(filePath, file.filename);
    // Simulate image analysis
    const analysisResult : any = await this.imageAnalysisService.analyzeBrand(filePath);
    unlinkSync(filePath); // Remove local file after processing
    return {
      message: 'Image uploaded and analyzed successfully',
      s3Url,
      analysisResult,
    };
  }
  // This action for testing upload normal video file
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
        frames.map((frame) =>
          this.imageAnalysisService.analyzeBrand(frameFolder + '/' + frame),
        ),
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
  uploadFile(@Req() req: Request, @Res() res: Response) {
    let frameFolder = './uploads';
    try {
      const form = formidable({
        uploadDir: './uploads', // Temporary directory for uploads
        keepExtensions: true,
        maxTotalFileSize: 15 * 1024 * 1024 * 1024,
        // filename: true,
      });

      form.parse(req, (err, fields, files) => {
        if (err) {
          rmSync(frameFolder, { recursive: true, force: true }); // Remove local frames folder after processing
          console.log(err);
          res.status(400).json({
            message: 'Error during file upload',
            error: err,
          });
          return;
        }

        const file: any = files.file || [];
        let totalExposureTime = 0;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        file.map(async (f) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          frameFolder = './uploads/fr_' + f.newFilename;
          const frames = await this.videoProcessingService.readAndSplitVideo(
            f.filepath,
            frameFolder,
          );
          console.log('frames:', frames);
          // Upload image to S3
          await Promise.all(
            frames.map((frame) => {
              this.s3Service.uploadFile(frameFolder + '/' + frame, frame);
            }),
          );
          // Assume analyze the frames, then sum exposure times.
          const exposureResults = await Promise.all(
            frames.map((frame) =>
              this.imageAnalysisService.analyzeBrand(frameFolder + '/' + frame),
            ),
          );
          rmSync(frameFolder, { recursive: true, force: true }); // Remove local frames folder after processing
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          totalExposureTime = exposureResults.reduce(
            (sum, result) => sum + result.exposureTime,
            0,
          );
        });
        // Respond with a success message
        res.status(200).json({ totalExposureTime });
      });
    } catch (e) {
      console.log(e);
      rmSync(frameFolder, { recursive: true, force: true }); // Remove local frames folder after processing
      res.status(200).json({ totalExposureTime: 0 });
    }
  }
}
