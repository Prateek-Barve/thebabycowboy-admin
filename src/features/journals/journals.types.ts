
export interface JournalImage {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
}

export interface Journal {
  id: string;
  title: string;
  content: string;
  mood: string | null;
  category: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  images: JournalImage[];
}

export interface JournalImageRequest {
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
}

export interface JournalRequest {
  title: string;
  content: string;
  mood: string | null;
  category: string;
  tags: string[];
  isPublic: boolean;
  images: JournalImageRequest[];
}
