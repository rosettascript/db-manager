import { Module } from '@nestjs/common';
import { ForeignKeysController } from './foreign-keys.controller';
import { ForeignKeysService } from './foreign-keys.service';
import { SchemasModule } from '../schemas/schemas.module';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [SchemasModule, ConnectionsModule],
  controllers: [ForeignKeysController],
  providers: [ForeignKeysService],
  exports: [ForeignKeysService],
})
export class ForeignKeysModule {}

