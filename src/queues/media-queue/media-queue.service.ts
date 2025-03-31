import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MediaQueueService {
  constructor(@InjectQueue('mediaQueue') private queue: Queue) {}

  async addToQueue(fileInfo: any) {
    await this.queue.add('processMedia', fileInfo);
  }
}
