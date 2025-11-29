import { Module } from '@nestjs/common';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { ConnectionsRepository } from './connections.repository';
import { ConnectionManagerService } from '../common/database/connection-manager.service';

@Module({
  controllers: [ConnectionsController],
  providers: [ConnectionsService, ConnectionsRepository, ConnectionManagerService],
  exports: [ConnectionsService, ConnectionManagerService],
})
export class ConnectionsModule {}

