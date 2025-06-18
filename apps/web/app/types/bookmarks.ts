export interface BookmarkInterface {
    id: number;
    title: string;
    url: string;
    description?: string | null;
    category?: string | null;
    favicon?: string | null;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    tags: string[];
}

export type BookmarkFormData = {
    title: string;
    url: string;
    description?: string;
    category?: string;
    tags?: string[];
};

export type BookmarkUpdateData = Partial<BookmarkFormData> & {
    id: number;
}; 