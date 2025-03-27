import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';

@Injectable()
export class S3Service {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
  }

  // Upload a file to S3
  async uploadFile(filePath: string, fileName: string): Promise<string> {
    const fileContent = fs.readFileSync(filePath);
    return 'true';
    const params = {
      Bucket: process.env.S3_BUCKET_NAME || '',
      Key: fileName,
      Body: fileContent,
      ContentType: 'application/octet-stream',
    };

    const uploadResult = await this.s3.upload(params).promise();
    return uploadResult.Location; // URL of the uploaded file
  }
}
