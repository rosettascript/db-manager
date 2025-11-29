import { Module } from '@nestjs/common';
import { QueriesController } from './queries.controller';
import { QueriesService } from './queries.service';
import { ConnectionsModule } from '../connections/connections.module';
import { QueryHistoryModule } from '../query-history/query-history.module';

@Module({
  imports: [ConnectionsModule, QueryHistoryModule],
  controllers: [QueriesController],
  providers: [QueriesService],
  exports: [QueriesService],
})
export class QueriesModule {}

