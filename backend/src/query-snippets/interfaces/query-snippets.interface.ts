export interface QuerySnippet {
  id: string;
  name: string;
  snippet: string;
  description?: string;
  category?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateQuerySnippetDto {
  name: string;
  snippet: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateQuerySnippetDto {
  name?: string;
  snippet?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

