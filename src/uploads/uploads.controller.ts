import { Controller, Post, Req, Res } from '@nestjs/common';
import formidable from 'formidable';
import { Request, Response } from 'express';
import { MediaQueueService } from '../queues/media-queue/media-queue.service';
import { unlinkSync } from 'fs';

@Controller('upload')
export class UploadsController {
  constructor(private mediaQueueService: MediaQueueService) {}

  @Post('media')
  receiveFile(@Req() req: Request, @Res() res: Response) {
    let filePath = null;
    try {
      const form = formidable({
        uploadDir: './uploads', // Temporary directory for uploads
        keepExtensions: true,
        maxTotalFileSize: 15 * 1024 * 1024 * 1024,
        // filename: true,
      });
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.log(err);
          res.status(400).json({
            message: 'Error during file upload',
            error: err,
          });
          return;
        }

        const file: any = files.file || [];
        file.map(async (f) => {
          const mimeType:string = f.mimetype; // Detect file type
          // Check file type (image or video)
          let fileType = mimeType.startsWith('image/')
            ? 'IMAGE'
            : mimeType.startsWith('video/')
              ? 'VIDEO'
              : 'Unknown';
          fileType =
            mimeType === 'application/octet-stream' ? 'VIDEO' : fileType;
          console.log('mimeType:', mimeType, fileType);
          filePath = f.filepath;
          await this.mediaQueueService.addToQueue({
            filePath: filePath,
            fileName: f.newFilename,
            type: fileType,
          });
        });
        // Respond with a success message
        res.status(200).json({
          success: true,
          message: 'File uploaded and added to queue.',
        });
      });
    } catch (e) {
      console.log(e);
      // Remove uploaded file if system has error
      if (filePath) {
        unlinkSync(filePath);
      }
      res.status(200).json({ success: false });
    }
  }
}
