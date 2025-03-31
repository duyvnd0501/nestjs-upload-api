import { Test, TestingModule } from '@nestjs/testing';
import { MediaQueueService } from './media-queue.service';

describe('MediaQueueService', () => {
  let service: MediaQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaQueueService],
    }).compile();

    service = module.get<MediaQueueService>(MediaQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
