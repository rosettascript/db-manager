import { Module } from '@nestjs/common';
import { DiagramController } from './diagram.controller';
import { DiagramService } from './diagram.service';
import { SchemasModule } from '../schemas/schemas.module';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [SchemasModule, ConnectionsModule],
  controllers: [DiagramController],
  providers: [DiagramService],
  exports: [DiagramService],
})
export class DiagramModule {}

