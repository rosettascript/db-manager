import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { Connection } from './interfaces/connection.interface';

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  /**
   * Get all connections
   * GET /api/connections
   */
  @Get()
  async findAll(): Promise<Connection[]> {
    return this.connectionsService.findAll();
  }

  /**
   * Create a new connection
   * POST /api/connections
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateConnectionDto): Promise<Connection> {
    return this.connectionsService.create(createDto);
  }

  /**
   * Get connection status
   * GET /api/connections/:id/status
   * IMPORTANT: This must come before @Get(':id') to avoid route conflicts
   */
  @Get(':id/status')
  async getStatus(
    @Param('id') id: string,
  ): Promise<{
    status: Connection['status'];
    lastConnected?: Date;
    error?: string;
    health?: boolean;
  }> {
    return this.connectionsService.getStatus(id);
  }

  /**
   * Test a connection
   * POST /api/connections/:id/test
   * IMPORTANT: This must come before generic routes to avoid route conflicts
   */
  @Post(':id/test')
  async testConnection(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message?: string; connectionTime?: number }> {
    return this.connectionsService.testConnection(id);
  }

  /**
   * Connect to a database
   * POST /api/connections/:id/connect
   * IMPORTANT: This must come before generic routes to avoid route conflicts
   */
  @Post(':id/connect')
  async connect(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message?: string }> {
    return this.connectionsService.connect(id);
  }

  /**
   * Disconnect from a database
   * POST /api/connections/:id/disconnect
   * IMPORTANT: This must come before generic routes to avoid route conflicts
   */
  @Post(':id/disconnect')
  async disconnect(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message?: string }> {
    return this.connectionsService.disconnect(id);
  }

  /**
   * Get a single connection by ID
   * GET /api/connections/:id
   * IMPORTANT: This generic route must come LAST to avoid catching nested routes
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Connection> {
    return this.connectionsService.findOne(id);
  }

  /**
   * Update a connection
   * PUT /api/connections/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateConnectionDto,
  ): Promise<Connection> {
    return this.connectionsService.update(id, updateDto);
  }

  /**
   * Delete a connection
   * DELETE /api/connections/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.connectionsService.remove(id);
  }
}

