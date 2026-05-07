export interface PageMetadata {
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface Page<T> {
  content: T[];
  page: PageMetadata;
}
