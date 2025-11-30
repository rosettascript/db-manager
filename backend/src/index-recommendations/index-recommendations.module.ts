import { Module } from '@nestjs/common';
import { IndexRecommendationsController } from './index-recommendations.controller';
import { IndexRecommendationsService } from './index-recommendations.service';
import { ConnectionsModule } from '../connections/connections.module';
import { QueryHistoryModule } from '../query-history/query-history.module';

@Module({
  imports: [ConnectionsModule, QueryHistoryModule],
  controllers: [IndexRecommendationsController],
  providers: [IndexRecommendationsService],
  exports: [IndexRecommendationsService],
})
export class IndexRecommendationsModule {}

