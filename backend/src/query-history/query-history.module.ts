import { Module } from '@nestjs/common';
import { QueryHistoryController } from './query-history.controller';
import { QueryHistoryService } from './query-history.service';
import { QueryHistoryRepository } from './repositories/query-history.repository';

@Module({
  controllers: [QueryHistoryController],
  providers: [QueryHistoryService, QueryHistoryRepository],
  exports: [QueryHistoryService],
})
export class QueryHistoryModule {}

