import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QuerySnippet, CreateQuerySnippetDto, UpdateQuerySnippetDto } from './interfaces/query-snippets.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class QuerySnippetsService {
  private readonly logger = new Logger(QuerySnippetsService.name);
  private readonly snippetsDir = path.join(process.cwd(), 'database', 'query-snippets');

  constructor() {
    this.ensureSnippetsDirectory();
  }

  /**
   * Ensure snippets directory exists
   */
  private async ensureSnippetsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.snippetsDir, { recursive: true });
    } catch (error: any) {
      this.logger.warn(`Failed to create snippets directory: ${error.message}`);
    }
  }

  /**
   * Get snippets file path
   */
  private getSnippetsFilePath(): string {
    return path.join(this.snippetsDir, 'snippets.json');
  }

  /**
   * Load all snippets
   */
  private async loadSnippets(): Promise<QuerySnippet[]> {
    try {
      const filePath = this.getSnippetsFilePath();
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      this.logger.error(`Failed to load snippets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save snippets to file
   */
  private async saveSnippets(snippets: QuerySnippet[]): Promise<void> {
    try {
      const filePath = this.getSnippetsFilePath();
      await fs.writeFile(filePath, JSON.stringify(snippets, null, 2), 'utf-8');
    } catch (error: any) {
      this.logger.error(`Failed to save snippets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `snippet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all snippets
   */
  async getAllSnippets(options: {
    category?: string;
    search?: string;
  } = {}): Promise<QuerySnippet[]> {
    let snippets = await this.loadSnippets();

    // Filter by category
    if (options.category) {
      snippets = snippets.filter(
        (s) => s.category?.toLowerCase() === options.category.toLowerCase(),
      );
    }

    // Search in name, description, and tags
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      snippets = snippets.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          s.description?.toLowerCase().includes(searchLower) ||
          s.tags?.some((tag) => tag.toLowerCase().includes(searchLower)),
      );
    }

    return snippets.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get snippet by ID
   */
  async getSnippetById(id: string): Promise<QuerySnippet> {
    const snippets = await this.loadSnippets();
    const snippet = snippets.find((s) => s.id === id);

    if (!snippet) {
      throw new NotFoundException(`Snippet ${id} not found`);
    }

    return snippet;
  }

  /**
   * Get snippets by category
   */
  async getSnippetsByCategory(category: string): Promise<QuerySnippet[]> {
    return this.getAllSnippets({ category });
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    const snippets = await this.loadSnippets();
    const categories = new Set<string>();

    snippets.forEach((s) => {
      if (s.category) {
        categories.add(s.category);
      }
    });

    return Array.from(categories).sort();
  }

  /**
   * Create a new snippet
   */
  async createSnippet(dto: CreateQuerySnippetDto): Promise<QuerySnippet> {
    if (!dto.name || !dto.snippet) {
      throw new BadRequestException('Name and snippet are required');
    }

    const snippets = await this.loadSnippets();

    // Check for duplicate name
    if (snippets.some((s) => s.name.toLowerCase() === dto.name.toLowerCase())) {
      throw new BadRequestException(`Snippet with name "${dto.name}" already exists`);
    }

    const snippet: QuerySnippet = {
      id: this.generateId(),
      name: dto.name,
      snippet: dto.snippet,
      description: dto.description,
      category: dto.category || 'Uncategorized',
      tags: dto.tags || [],
      createdAt: new Date(),
    };

    snippets.push(snippet);
    await this.saveSnippets(snippets);

    this.logger.log(`Created snippet: ${snippet.id}`);
    return snippet;
  }

  /**
   * Update a snippet
   */
  async updateSnippet(
    id: string,
    dto: UpdateQuerySnippetDto,
  ): Promise<QuerySnippet> {
    const snippets = await this.loadSnippets();
    const index = snippets.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new NotFoundException(`Snippet ${id} not found`);
    }

    // Check for duplicate name if name is being updated
    if (dto.name && snippets.some((s, i) => i !== index && s.name.toLowerCase() === dto.name.toLowerCase())) {
      throw new BadRequestException(`Snippet with name "${dto.name}" already exists`);
    }

    snippets[index] = {
      ...snippets[index],
      ...dto,
      updatedAt: new Date(),
    };

    await this.saveSnippets(snippets);

    this.logger.log(`Updated snippet: ${id}`);
    return snippets[index];
  }

  /**
   * Delete a snippet
   */
  async deleteSnippet(id: string): Promise<void> {
    const snippets = await this.loadSnippets();
    const index = snippets.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new NotFoundException(`Snippet ${id} not found`);
    }

    snippets.splice(index, 1);
    await this.saveSnippets(snippets);

    this.logger.log(`Deleted snippet: ${id}`);
  }

  /**
   * Insert snippet into query at cursor position
   * This is a helper method that returns the snippet text
   */
  getSnippetText(id: string): string {
    // This will be called after getSnippetById, so we'll handle it in the controller
    return '';
  }
}

