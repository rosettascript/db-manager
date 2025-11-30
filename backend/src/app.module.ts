import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConnectionsModule } from './connections/connections.module';
import { SchemasModule } from './schemas/schemas.module';
import { DataModule } from './data/data.module';
import { QueriesModule } from './queries/queries.module';
import { QueryHistoryModule } from './query-history/query-history.module';
import { DiagramModule } from './diagram/diagram.module';
import { ExportModule } from './export/export.module';
import { ForeignKeysModule } from './foreign-keys/foreign-keys.module';
import { ChartsModule } from './charts/charts.module';
import { IndexRecommendationsModule } from './index-recommendations/index-recommendations.module';
import { SearchModule } from './search/search.module';
import { QuerySnippetsModule } from './query-snippets/query-snippets.module';
import { SchemaDumpModule } from './schema-dump/schema-dump.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ConnectionsModule,
    SchemasModule,
    DataModule,
    QueriesModule,
    QueryHistoryModule,
    DiagramModule,
    ExportModule,
    ForeignKeysModule,
    ChartsModule,
    IndexRecommendationsModule,
    SearchModule,
    QuerySnippetsModule,
    SchemaDumpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

