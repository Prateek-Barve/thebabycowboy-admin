
export interface Blog {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  coverImageUrl: string | null;
  externalUrl: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogRequest {
  title: string;
  description: string;
  category: string;
  tags: string[];
  coverImageUrl: string | null;
  externalUrl: string;
  publishedAt: string | null;
}
