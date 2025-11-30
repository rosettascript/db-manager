import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ConnectionsModule } from '../connections/connections.module';
import { SchemasModule } from '../schemas/schemas.module';

@Module({
  imports: [ConnectionsModule, SchemasModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

