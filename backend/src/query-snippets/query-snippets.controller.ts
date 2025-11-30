import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { QuerySnippetsService } from './query-snippets.service';
import {
  QuerySnippet,
  CreateQuerySnippetDto,
  UpdateQuerySnippetDto,
} from './interfaces/query-snippets.interface';

@Controller('query-snippets')
export class QuerySnippetsController {
  constructor(private readonly querySnippetsService: QuerySnippetsService) {}

  /**
   * Get all snippets
   * GET /api/query-snippets
   */
  @Get()
  async getAllSnippets(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ): Promise<QuerySnippet[]> {
    return this.querySnippetsService.getAllSnippets({ category, search });
  }

  /**
   * Get snippet by ID
   * GET /api/query-snippets/:id
   */
  @Get(':id')
  async getSnippetById(@Param('id') id: string): Promise<QuerySnippet> {
    return this.querySnippetsService.getSnippetById(id);
  }

  /**
   * Get snippets by category
   * GET /api/query-snippets/category/:category
   */
  @Get('category/:category')
  async getSnippetsByCategory(
    @Param('category') category: string,
  ): Promise<QuerySnippet[]> {
    return this.querySnippetsService.getSnippetsByCategory(category);
  }

  /**
   * Get all categories
   * GET /api/query-snippets/categories
   */
  @Get('categories/list')
  async getCategories(): Promise<string[]> {
    return this.querySnippetsService.getCategories();
  }

  /**
   * Create a new snippet
   * POST /api/query-snippets
   */
  @Post()
  async createSnippet(
    @Body() dto: CreateQuerySnippetDto,
  ): Promise<QuerySnippet> {
    return this.querySnippetsService.createSnippet(dto);
  }

  /**
   * Update a snippet
   * PUT /api/query-snippets/:id
   */
  @Put(':id')
  async updateSnippet(
    @Param('id') id: string,
    @Body() dto: UpdateQuerySnippetDto,
  ): Promise<QuerySnippet> {
    return this.querySnippetsService.updateSnippet(id, dto);
  }

  /**
   * Delete a snippet
   * DELETE /api/query-snippets/:id
   */
  @Delete(':id')
  async deleteSnippet(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.querySnippetsService.deleteSnippet(id);
    return { success: true };
  }
}

