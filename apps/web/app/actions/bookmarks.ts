"use server";

import { BookmarkInterface, BookmarkFormData, BookmarkUpdateData } from "../types/bookmarks";
import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";

export async function getBookmarks(): Promise<BookmarkInterface[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        const bookmarks = await prisma.bookmark.findMany({
            where: {
                userId: userId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return bookmarks.map(bookmark => ({
            ...bookmark,
            userId: bookmark.userId.toString(),
            description: bookmark.description || undefined,
            category: bookmark.category || undefined,
            favicon: bookmark.favicon || undefined
        }));
    } catch (error) {
        console.error("Error fetching bookmarks:", error);
        throw new Error("Failed to fetch bookmarks");
    }
}

export async function createBookmark(data: BookmarkFormData): Promise<BookmarkInterface> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        const favicon = `https://www.google.com/s2/favicons?domain=${new URL(data.url).hostname}`;
        
        const bookmark = await prisma.bookmark.create({
            data: {
                title: data.title,
                url: data.url,
                description: data.description || null,
                category: data.category || null,
                tags: data.tags || [],
                favicon: favicon,
                userId: userId
            }
        });

        return {
            ...bookmark,
            userId: bookmark.userId.toString(),
            description: bookmark.description || undefined,
            category: bookmark.category || undefined,
            favicon: bookmark.favicon || undefined
        };
    } catch (error) {
        console.error("Error creating bookmark:", error);
        throw new Error("Failed to create bookmark");
    }
}

export async function updateBookmark(data: BookmarkUpdateData): Promise<BookmarkInterface> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        // Verify the bookmark belongs to the user
        const existingBookmark = await prisma.bookmark.findFirst({
            where: {
                id: data.id,
                userId: userId
            }
        });

        if (!existingBookmark) {
            throw new Error("Bookmark not found or unauthorized");
        }

        const updateData: any = {
            updatedAt: new Date()
        };

        if (data.title !== undefined) updateData.title = data.title;
        if (data.url !== undefined) {
            updateData.url = data.url;
            updateData.favicon = `https://www.google.com/s2/favicons?domain=${new URL(data.url).hostname}`;
        }
        if (data.description !== undefined) updateData.description = data.description;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.tags !== undefined) updateData.tags = data.tags;

        const updatedBookmark = await prisma.bookmark.update({
            where: {
                id: data.id
            },
            data: updateData
        });

        return {
            ...updatedBookmark,
            userId: updatedBookmark.userId.toString(),
            description: updatedBookmark.description || undefined,
            category: updatedBookmark.category || undefined,
            favicon: updatedBookmark.favicon || undefined
        };
    } catch (error) {
        console.error("Error updating bookmark:", error);
        throw new Error("Failed to update bookmark");
    }
}

export async function deleteBookmark(id: number): Promise<void> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        // Verify the bookmark belongs to the user
        const existingBookmark = await prisma.bookmark.findFirst({
            where: {
                id: id,
                userId: userId
            }
        });

        if (!existingBookmark) {
            throw new Error("Bookmark not found or unauthorized");
        }

        await prisma.bookmark.delete({
            where: {
                id: id
            }
        });
    } catch (error) {
        console.error("Error deleting bookmark:", error);
        throw new Error("Failed to delete bookmark");
    }
}

export async function getBookmarksByCategory(category: string): Promise<BookmarkInterface[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        const bookmarks = await prisma.bookmark.findMany({
            where: {
                userId: userId,
                category: category
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return bookmarks.map(bookmark => ({
            ...bookmark,
            userId: bookmark.userId.toString(),
            description: bookmark.description || undefined,
            category: bookmark.category || undefined,
            favicon: bookmark.favicon || undefined
        }));
    } catch (error) {
        console.error("Error fetching bookmarks by category:", error);
        throw new Error("Failed to fetch bookmarks by category");
    }
}

export async function searchBookmarks(query: string): Promise<BookmarkInterface[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        const searchTerm = query.toLowerCase();
        
        const bookmarks = await prisma.bookmark.findMany({
            where: {
                userId: userId,
                OR: [
                    {
                        title: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        description: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        category: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        tags: {
                            hasSome: [searchTerm]
                        }
                    }
                ]
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return bookmarks.map(bookmark => ({
            ...bookmark,
            userId: bookmark.userId.toString(),
            description: bookmark.description || undefined,
            category: bookmark.category || undefined,
            favicon: bookmark.favicon || undefined
        }));
    } catch (error) {
        console.error("Error searching bookmarks:", error);
        throw new Error("Failed to search bookmarks");
    }
}

export async function getBookmarkCategories(): Promise<string[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        const result = await prisma.bookmark.findMany({
            where: {
                userId: userId,
                category: {
                    not: null
                }
            },
            select: {
                category: true
            },
            distinct: ['category']
        });

        return result
            .map(item => item.category)
            .filter(Boolean) as string[];
    } catch (error) {
        console.error("Error fetching bookmark categories:", error);
        throw new Error("Failed to fetch bookmark categories");
    }
} 