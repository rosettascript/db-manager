import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { QueryBuilderService } from '../common/database/query-builder.service';
import { ConnectionsModule } from '../connections/connections.module';
import { SchemasModule } from '../schemas/schemas.module';

@Module({
  imports: [ConnectionsModule, SchemasModule],
  controllers: [DataController],
  providers: [DataService, QueryBuilderService],
  exports: [DataService],
})
export class DataModule {}

