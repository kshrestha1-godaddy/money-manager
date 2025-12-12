"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { getChatThreads, createChatThread, deleteChatThread, updateChatThread, deleteAllChatThreads } from "../actions/chat-threads";

interface ChatThread {
  id: number;
  title: string;
  description?: string | null;
  isPinned: boolean;
  lastMessageAt: Date;
  conversations?: Array<{
    content: string;
    sender: string;
    createdAt: Date;
  }>;
  _count?: {
    conversations: number;
  };
}

interface ThreadSidebarProps {
  currentThreadId?: number;
  onThreadSelect: (threadId: number) => void;
  onNewChat: () => void;
}

export interface ThreadSidebarRef {
  addThread: (thread: ChatThread) => void;
  updateThread: (threadId: number, updates: Partial<ChatThread>) => void;
  removeThread: (threadId: number) => void;
}

export const ThreadSidebar = forwardRef<ThreadSidebarRef, ThreadSidebarProps>(({ 
  currentThreadId, 
  onThreadSelect, 
  onNewChat
}, ref) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingThreadId, setEditingThreadId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  useEffect(() => {
    loadThreads();
  }, []);

  // Add new thread to the list
  const addThread = (newThread: ChatThread) => {
    setThreads(prev => [newThread, ...prev]);
  };

  // Update specific thread in the list
  const updateThread = (threadId: number, updates: Partial<ChatThread>) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId ? { ...thread, ...updates } : thread
    ));
  };

  // Remove thread from the list
  const removeThread = (threadId: number) => {
    setThreads(prev => prev.filter(thread => thread.id !== threadId));
  };

  // Expose functions to parent via ref
  useImperativeHandle(ref, () => ({
    addThread,
    updateThread,
    removeThread,
  }));

  const loadThreads = async () => {
    setIsLoading(true);
    try {
      const result = await getChatThreads();
      if (result.success && result.threads) {
        setThreads(result.threads);
      }
    } catch (error) {
      console.error("Error loading threads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    // Let the parent handle thread creation and sidebar refresh
    onNewChat();
  };

  const handleEditTitle = (threadId: number, currentTitle: string) => {
    setEditingThreadId(threadId);
    setEditingTitle(currentTitle);
  };

  const handleSaveTitle = async (threadId: number) => {
    if (editingTitle.trim() && editingTitle !== threads.find(t => t.id === threadId)?.title) {
      try {
        const result = await updateChatThread(threadId, { title: editingTitle.trim() });
        if (result.success) {
          updateThread(threadId, { title: editingTitle.trim() });
        } else {
          console.error("Failed to update thread title:", result.error);
        }
      } catch (error) {
        console.error("Error updating thread title:", error);
      }
    }
    setEditingThreadId(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingThreadId(null);
    setEditingTitle("");
  };

  const handleDeleteAllThreads = async () => {
    if (threads.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete all ${threads.length} threads? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      const result = await deleteAllChatThreads();
      
      if (result.success) {
        // Clear local state
        setThreads([]);
        // If current thread was deleted, create new chat
        if (currentThreadId) {
          onNewChat();
        }
        console.log(result.message);
      } else {
        console.error("Failed to delete all threads:", result.error);
      }
    } catch (error) {
      console.error("Error deleting all threads:", error);
    }
  };

  const handleDeleteThread = async (threadId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat? This action cannot be undone.")) {
      try {
        const result = await deleteChatThread(threadId);
        if (result.success) {
          // Remove thread from local state instead of reloading all
          removeThread(threadId);
          
          // If the deleted thread was currently selected, create a new chat
          if (currentThreadId === threadId) {
            onNewChat();
          }
        } else {
          console.error("Failed to delete thread:", result.error);
          alert("Failed to delete chat. Please try again.");
        }
      } catch (error) {
        console.error("Error deleting thread:", error);
        alert("An error occurred while deleting the chat.");
      }
    }
  };

  const handlePinThread = async (threadId: number, isPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await updateChatThread(threadId, { isPinned: !isPinned });
      if (result.success) {
        // Update thread in local state instead of reloading all
        updateThread(threadId, { isPinned: !isPinned });
      } else {
        console.error("Failed to pin thread:", result.error);
      }
    } catch (error) {
      console.error("Error pinning thread:", error);
    }
  };

  const filteredThreads = threads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: Date | string) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInHours < 168) { // 7 days
      return messageDate.toLocaleDateString([], { weekday: "short" });
    } else {
      return messageDate.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getLastMessagePreview = (thread: ChatThread) => {
    if (!thread.conversations || thread.conversations.length === 0) return "No messages yet";
    const lastMessage = thread.conversations[0];
    if (!lastMessage) return "No messages yet";
    const preview = lastMessage.content.length > 50 
      ? lastMessage.content.substring(0, 50) + "..."
      : lastMessage.content;
    return preview;
  };

  return (
    <div className="w-80 border-r border-gray-100 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
          <div className="flex gap-1">
            <button
              onClick={handleDeleteAllThreads}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete All Threads"
              disabled={threads.length === 0}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </button>
            <button
              onClick={handleNewChat}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="New Chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 absolute left-3 top-2.5 text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading chats...
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? "No chats found" : "No chats yet"}
          </div>
        ) : (
          <div className="p-2">
            {filteredThreads.map((thread, index) => (
              <div key={thread.id}>
                <div
                  className={`group relative p-3 transition-colors ${
                    currentThreadId === thread.id
                      ? "bg-gray-50 border-l-4 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {/* Thread Content */}
                  <div 
                    onClick={() => onThreadSelect(thread.id)}
                    className="cursor-pointer"
                  >
                    {/* Title Row with Time */}
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {thread.isPinned && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-3 h-3 text-blue-500 flex-shrink-0"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5Z"
                            />
                          </svg>
                        )}
                        {editingThreadId === thread.id ? (
                          <input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => handleSaveTitle(thread.id)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveTitle(thread.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            className="text-sm font-medium text-gray-900 bg-white border border-blue-500 rounded px-1 py-0.5 flex-1"
                            autoFocus
                          />
                        ) : (
                          <h3 
                            className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600 flex-1"
                            onDoubleClick={() => handleEditTitle(thread.id, thread.title)}
                            title="Double-click to rename"
                          >
                            {thread.title}
                          </h3>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {formatDate(thread.lastMessageAt)}
                      </span>
                    </div>
                    
                    {/* Preview and Count */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 truncate flex-1">
                        {getLastMessagePreview(thread)}
                      </p>
                      {thread._count?.conversations && thread._count.conversations > 0 && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full ml-2">
                          {thread._count.conversations}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons - compact inline */}
                  <div className="flex justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTitle(thread.id, thread.title);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="Rename"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-3 h-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handlePinThread(thread.id, thread.isPinned, e)}
                      className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title={thread.isPinned ? "Unpin" : "Pin"}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill={thread.isPinned ? "currentColor" : "none"}
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-3 h-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5Z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDeleteThread(thread.id, e)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-3 h-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Divider - show for all threads except the last one */}
                {index < filteredThreads.length - 1 && (
                  <div className="border-b border-gray-100 mx-3"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

ThreadSidebar.displayName = 'ThreadSidebar';
