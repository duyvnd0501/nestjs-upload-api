import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { promises as fsPromises, unlinkSync } from 'fs';
import * as fs from 'fs';

@Injectable()
export class VideoProcessingService {
  constructor() {}
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
