"use client";

import { Card } from "@repo/ui/card";
import React, { useState } from "react";
import { BookmarkInterface } from "../../types/bookmarks";

export function BookmarkCard({ 
    bookmark, 
    onEdit, 
    onDelete, 
    onViewDetails,
    isSelected = false,
    onSelect,
    showCheckbox = false 
}: { 
    bookmark: BookmarkInterface;
    onEdit?: (bookmark: BookmarkInterface) => void;
    onDelete?: (bookmark: BookmarkInterface) => void;
    onViewDetails?: (bookmark: BookmarkInterface) => void;
    isSelected?: boolean;
    onSelect?: (bookmarkId: number, selected: boolean) => void;
    showCheckbox?: boolean;
}) {
    const handleSelect = () => {
        if (onSelect) {
            onSelect(bookmark.id, !isSelected);
        }
    };

    const handleOpenLink = () => {
        window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow ${isSelected ? 'bg-gray-50 border-gray-300' : ''}`}>
            {/* Checkbox for bulk selection */}
            {showCheckbox && (
                <div className="flex justify-end mb-2">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                    />
                </div>
            )}
            
            {/* Header with favicon and title */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0">
                        {bookmark.favicon ? (
                            <img 
                                src={bookmark.favicon} 
                                alt={`${bookmark.title} favicon`}
                                className="w-6 h-6 rounded"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">{bookmark.title}</h3>
                        <p className="text-sm text-gray-600 hover:underline cursor-pointer truncate" onClick={handleOpenLink}>
                            {bookmark.url}
                        </p>
                    </div>
                </div>
                
                {bookmark.category && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full flex-shrink-0">
                        {bookmark.category}
                    </span>
                )}
            </div>

            {/* Description */}
            {bookmark.description && (
                <div className="mb-4">
                    <p className="text-sm text-gray-600 line-clamp-2">{bookmark.description}</p>
                </div>
            )}

            {/* Tags */}
            {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                        {bookmark.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {tag}
                            </span>
                        ))}
                        {bookmark.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                                +{bookmark.tags.length - 3} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Footer with date and actions */}
            <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-gray-500">
                    Added {formatDate(bookmark.createdAt)}
                </div>
                
                <div className="flex space-x-2">
                    <button
                        onClick={handleOpenLink}
                        className="px-3 py-1 text-sm bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                    >
                        Visit
                    </button>
                    
                    {onViewDetails && (
                        <button
                            onClick={() => onViewDetails(bookmark)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
                        >
                            Details
                        </button>
                    )}
                    
                    {onEdit && (
                        <button
                            onClick={() => onEdit(bookmark)}
                            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    
                    {onDelete && (
                        <button
                            onClick={() => onDelete(bookmark)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function BookmarkGrid({ 
    bookmarks, 
    onEdit, 
    onDelete, 
    onViewDetails,
    selectedBookmarks = new Set(),
    onBookmarkSelect,
    showBulkActions = false 
}: { 
    bookmarks: BookmarkInterface[];
    onEdit?: (bookmark: BookmarkInterface) => void;
    onDelete?: (bookmark: BookmarkInterface) => void;
    onViewDetails?: (bookmark: BookmarkInterface) => void;
    selectedBookmarks?: Set<number>;
    onBookmarkSelect?: (bookmarkId: number, selected: boolean) => void;
    showBulkActions?: boolean;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-full w-full">
            {bookmarks.map((bookmark, idx) => (
                <BookmarkCard 
                    key={bookmark.id} 
                    bookmark={bookmark} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                    onViewDetails={onViewDetails}
                    isSelected={selectedBookmarks.has(bookmark.id)}
                    onSelect={onBookmarkSelect}
                    showCheckbox={showBulkActions}
                />
            ))}
        </div>
    );
} 