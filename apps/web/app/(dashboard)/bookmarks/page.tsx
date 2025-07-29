"use client";

import React, { useState, useEffect } from "react";
import { BookmarkInterface } from "../../types/bookmarks";
import { getBookmarks, createBookmark, updateBookmark, deleteBookmark, searchBookmarks } from "../../actions/bookmarks";
import { BookmarkGrid } from "../../components/bookmarks/BookmarkCard";
import { AddBookmarkModal } from "../../components/bookmarks/AddBookmarkModal";
import { Button } from "@repo/ui/button";

export default function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState<BookmarkInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBookmarks, setSelectedBookmarks] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkInterface[]>([]);
    
    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingBookmark, setEditingBookmark] = useState<BookmarkInterface | null>(null);
    const [deletingBookmark, setDeletingBookmark] = useState<BookmarkInterface | null>(null);
    const [viewingBookmark, setViewingBookmark] = useState<BookmarkInterface | null>(null);

    // Load bookmarks on component mount
    useEffect(() => {
        loadBookmarks();
    }, []);

    // Filter bookmarks based on search query
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredBookmarks(bookmarks);
        } else {
            const filtered = bookmarks.filter(bookmark =>
                bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bookmark.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bookmark.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bookmark.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            setFilteredBookmarks(filtered);
        }
    }, [bookmarks, searchQuery]);

    const loadBookmarks = async () => {
        try {
            setLoading(true);
            const data = await getBookmarks();
            setBookmarks(data);
        } catch (error) {
            console.error("Error loading bookmarks:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBookmark = async (data: any) => {
        try {
            const newBookmark = await createBookmark(data);
            setBookmarks(prev => [newBookmark, ...prev]);
        } catch (error) {
            console.error("Error adding bookmark:", error);
            throw error;
        }
    };

    const handleEditBookmark = (bookmark: BookmarkInterface) => {
        setEditingBookmark(bookmark);
    };

    const handleDeleteBookmark = (bookmark: BookmarkInterface) => {
        setDeletingBookmark(bookmark);
    };

    const handleViewDetails = (bookmark: BookmarkInterface) => {
        setViewingBookmark(bookmark);
    };

    const confirmDelete = async () => {
        if (!deletingBookmark) return;
        
        try {
            await deleteBookmark(deletingBookmark.id);
            setBookmarks(prev => prev.filter(b => b.id !== deletingBookmark.id));
            setDeletingBookmark(null);
        } catch (error) {
            console.error("Error deleting bookmark:", error);
        }
    };

    const handleBookmarkSelect = (bookmarkId: number, selected: boolean) => {
        setSelectedBookmarks(prev => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(bookmarkId);
            } else {
                newSet.delete(bookmarkId);
            }
            return newSet;
        });
    };

    const selectAllBookmarks = () => {
        setSelectedBookmarks(new Set(filteredBookmarks.map(b => b.id)));
    };

    const clearSelection = () => {
        setSelectedBookmarks(new Set());
    };

    const deleteBulkBookmarks = async () => {
        if (selectedBookmarks.size === 0) return;
        
        try {
            await Promise.all(Array.from(selectedBookmarks).map(id => deleteBookmark(id)));
            setBookmarks(prev => prev.filter(b => !selectedBookmarks.has(b.id)));
            setSelectedBookmarks(new Set());
        } catch (error) {
            console.error("Error deleting bookmarks:", error);
        }
    };

    const getUniqueCategories = () => {
        const categories = bookmarks
            .map(b => b.category)
            .filter(Boolean)
            .filter((category, index, arr) => arr.indexOf(category) === index);
        return categories as string[];
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Bookmarks</h1>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading bookmarks...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Bookmarks</h1>
                    <p className="text-gray-600 mt-1">Manage your saved website links</p>
                </div>
                <div className="flex space-x-3">
                    <Button onClick={() => setShowAddModal(true)}>
                        Add Bookmark
                    </Button>
                </div>
            </div>

            {/* Search and filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search bookmarks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                            {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bulk actions */}
            {filteredBookmarks.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <input
                                type="checkbox"
                                checked={selectedBookmarks.size === filteredBookmarks.length && filteredBookmarks.length > 0}
                                onChange={(e) => e.target.checked ? selectAllBookmarks() : clearSelection()}
                                className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                                {selectedBookmarks.size > 0 ? `${selectedBookmarks.size} selected` : 'Select all'}
                            </span>
                        </div>
                        {selectedBookmarks.size > 0 && (
                            <div className="flex space-x-2">
                                <button
                                    onClick={clearSelection}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                                >
                                    Clear Selection
                                </button>
                                <button
                                    onClick={deleteBulkBookmarks}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                >
                                    Delete Selected ({selectedBookmarks.size})
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bookmarks Grid */}
            {filteredBookmarks.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No bookmarks found</h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery ? "Try adjusting your search criteria" : "Start by adding your first bookmark"}
                    </p>
                    {!searchQuery && (
                        <Button onClick={() => setShowAddModal(true)}>
                            Add Your First Bookmark
                        </Button>
                    )}
                </div>
            ) : (
                <BookmarkGrid
                    bookmarks={filteredBookmarks}
                    onEdit={handleEditBookmark}
                    onDelete={handleDeleteBookmark}
                    onViewDetails={handleViewDetails}
                    selectedBookmarks={selectedBookmarks}
                    onBookmarkSelect={handleBookmarkSelect}
                    showBulkActions={true}
                />
            )}

            {/* Add Bookmark Modal */}
            <AddBookmarkModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSubmit={handleAddBookmark}
            />

            {/* Delete Confirmation Modal */}
            {deletingBookmark && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold mb-4">Delete Bookmark</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete "{deletingBookmark.title}"? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setDeletingBookmark(null)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {viewingBookmark && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold">Bookmark Details</h3>
                            <button
                                onClick={() => setViewingBookmark(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-gray-900">{viewingBookmark.title}</h4>
                                <a 
                                    href={viewingBookmark.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline break-all"
                                >
                                    {viewingBookmark.url}
                                </a>
                            </div>
                            
                            {viewingBookmark.description && (
                                <div>
                                    <span className="font-medium text-gray-700">Description:</span>
                                    <p className="text-gray-600 mt-1">{viewingBookmark.description}</p>
                                </div>
                            )}
                            
                            {viewingBookmark.category && (
                                <div>
                                    <span className="font-medium text-gray-700">Category:</span>
                                    <span className="ml-2 text-gray-600">{viewingBookmark.category}</span>
                                </div>
                            )}
                            
                            {viewingBookmark.tags && viewingBookmark.tags.length > 0 && (
                                                                 <div>
                                     <span className="font-medium text-gray-700">Tags:</span>
                                     <div className="flex flex-wrap gap-1 mt-1">
                                         {viewingBookmark.tags.map((tag, index) => (
                                             <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                                 {tag}
                                             </span>
                                         ))}
                                     </div>
                                 </div>
                            )}
                            
                            <div className="text-sm text-gray-500">
                                <p>Added: {new Date(viewingBookmark.createdAt).toLocaleDateString()}</p>
                                <p>Updated: {new Date(viewingBookmark.updatedAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        
                        <div className="flex justify-end mt-6">
                            <Button onClick={() => window.open(viewingBookmark.url, '_blank')}>
                                Visit Website
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 