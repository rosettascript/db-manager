import { Module } from '@nestjs/common';
import { QuerySnippetsController } from './query-snippets.controller';
import { QuerySnippetsService } from './query-snippets.service';

@Module({
  controllers: [QuerySnippetsController],
  providers: [QuerySnippetsService],
  exports: [QuerySnippetsService],
})
export class QuerySnippetsModule {}

