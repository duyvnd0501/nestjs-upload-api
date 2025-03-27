import { Test, TestingModule } from '@nestjs/testing';
import { ImageAnalysisService } from './image-analysis.service';

describe('ImageAnalysisService', () => {
  let service: ImageAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageAnalysisService],
    }).compile();

    service = module.get<ImageAnalysisService>(ImageAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
