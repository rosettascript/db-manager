import { Module } from '@nestjs/common';
import { SchemaDumpController } from './schema-dump.controller';
import { SchemaDumpService } from './schema-dump.service';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [ConnectionsModule],
  controllers: [SchemaDumpController],
  providers: [SchemaDumpService],
  exports: [SchemaDumpService],
})
export class SchemaDumpModule {}


