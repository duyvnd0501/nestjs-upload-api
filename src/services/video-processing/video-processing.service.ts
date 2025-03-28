import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import { promises as fsPromises, unlinkSync } from 'fs';
import * as fs from 'fs';
import * as util from 'util';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class VideoProcessingService {
  constructor(private s3Service: S3Service) {}

  async uploadVideo(file: Express.Multer.File, fileName: string) {
    try {
      const uploadFolder = './uploads';
      const frameFolder = './uploads/' + fileName;
      await fsPromises.mkdir(uploadFolder, { recursive: true });
      const videoPath = path.join(uploadFolder, 'v_' + fileName);
      // Save video locally to process it
      // Note: for large files, handle persistence properly
      await util.promisify(fs.writeFile)(videoPath, file.buffer);
      await this.splitVideo(videoPath, frameFolder);
      const frameFiles = fs.readdirSync(frameFolder);
      unlinkSync(videoPath); // Remove local video file after processing
      return frameFiles;
    } catch (error) {
      console.log(error);
      throw new Error('Failed to process video frames');
    }
  }
  async readAndSplitVideo(videoPath: string, frameFolder: string) {
    try {
      await this.splitVideo(videoPath, frameFolder);
      const frameFiles = fs.readdirSync(frameFolder);
      unlinkSync(videoPath); // Remove local video file after processing
      return frameFiles;
    } catch (error) {
      console.log(error);
      throw new Error('Failed to process video frames');
    }
  }

  async splitVideo(videoPath: string, frameFolder: string) {
    try {
      await fsPromises.mkdir(frameFolder, { recursive: true });
      return new Promise((resolve, reject) => {
        const frames: string[] = [];
        ffmpeg(videoPath)
          .on('end', () => resolve(frames))
          .on('error', (err) => reject(err))
          .output(`${frameFolder}/frame%03d.jpg`)
          .outputOptions('-vf', 'fps=1/10') // Extract one frame every 10 seconds
          .run();
      });
    } catch (e) {
      console.log(e);
      throw new Error('Failed to split video to frames');
    }
  }
}
