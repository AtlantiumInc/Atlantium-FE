// Article types
export interface ArticleSource {
  name: string;
  icon: string;
}

export interface ArticleAuthor {
  name: string;
  title: string;
}

export interface Article {
  id: string;
  thread_id: string;
  title: string;
  summary: string;
  content?: string;
  source: ArticleSource;
  author?: ArticleAuthor;
  tags: string[];
  key_takeaways?: string[];
  read_time_minutes: number;
  external_url?: string;
  is_bookmarked: boolean;
  sender_profile?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
}

export interface ArticlesListResponse {
  articles: Article[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface CreateArticleInput {
  thread_id: string;
  title: string;
  summary: string;
  content: string;
  source: ArticleSource;
  author?: ArticleAuthor;
  tags?: string[];
  key_takeaways?: string[];
  read_time_minutes?: number;
  external_url?: string;
}

export interface UpdateArticleInput {
  article_id: string;
  title?: string;
  summary?: string;
  content?: string;
  source?: ArticleSource;
  author?: ArticleAuthor;
  tags?: string[];
  key_takeaways?: string[];
  read_time_minutes?: number;
  external_url?: string;
}
