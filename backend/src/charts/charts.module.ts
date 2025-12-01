import { Module } from '@nestjs/common';
import { ChartsController, QueryChartsController } from './charts.controller';
import { ChartsService } from './charts.service';
import { ConnectionsModule } from '../connections/connections.module';
import { SchemasModule } from '../schemas/schemas.module';

@Module({
  imports: [ConnectionsModule, SchemasModule],
  controllers: [ChartsController, QueryChartsController],
  providers: [ChartsService],
  exports: [ChartsService],
})
export class ChartsModule {}











