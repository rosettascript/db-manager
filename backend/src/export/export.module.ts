import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { DataModule } from '../data/data.module';
import { QueriesModule } from '../queries/queries.module';
import { ConnectionsModule } from '../connections/connections.module';
import { SchemasModule } from '../schemas/schemas.module';

@Module({
  imports: [DataModule, QueriesModule, ConnectionsModule, SchemasModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}

