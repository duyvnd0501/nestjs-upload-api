import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as console from 'node:console';
import { rmSync } from 'fs';
import { S3Service } from '../../services/s3/s3.service';
import { VideoProcessingService } from '../../services/video-processing/video-processing.service';
import { ImageAnalysisService } from '../../services/image-analysis/image-analysis.service';

@Processor('mediaQueue')
export class MediaProcessor extends WorkerHost {
  constructor(
    private s3Service: S3Service,
    private readonly videoProcessingService: VideoProcessingService,
    private imageAnalysisService: ImageAnalysisService,
  ) {
    super();
  }
  async process(job: Job<any, any, string>): Promise<any> {
    const { filePath, fileName, type } = job.data;
    console.log(`Processing file with file path: ${filePath}`);
    let frameFolder = './uploads';
    try {
      if (type === 'VIDEO') {
        frameFolder = './uploads/fr_' + fileName;
        const frames = await this.videoProcessingService.readAndSplitVideo(
          filePath,
          frameFolder,
        );
        console.log('frames:', frames);
        // Upload image to S3
        await Promise.all(
          frames.map(async (frame) => {
            await this.s3Service.uploadFile(frameFolder + '/' + frame, frame);
          }),
        );
        // Assume analyze the frames, then sum exposure times.
        const exposureResults = await Promise.all(
          frames.map((frame) =>
            this.imageAnalysisService.analyzeBrand(frameFolder + '/' + frame),
          ),
        );
        // rmSync(frameFolder, { recursive: true, force: true }); // Remove local frames folder after processing
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const totalExposureTime = exposureResults.reduce(
          (sum, result) => sum + result.exposureTime,
          0,
        );
        return Promise.resolve({ totalExposureTime });
      } else if (type === 'IMAGE') {
        // Upload image to S3
        await this.s3Service.uploadFile(filePath, fileName);
        // Assume analyze the frames, then sum exposure times.
        await this.imageAnalysisService.analyzeBrand(filePath);
      } else {
        console.log('e');
      }
    } catch (e) {
      console.log(e);
      rmSync(frameFolder, { recursive: true, force: true }); // Remove local frames folder after processing
    }
    return Promise.resolve(true);
  }
}
