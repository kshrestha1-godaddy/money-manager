"use client";

import React, { useState, useEffect } from "react";
import { PasswordInterface } from "../../types/passwords";
import { getPasswords, createPassword, updatePassword, deletePassword } from "../../actions/passwords";
import { PasswordGrid } from "../../components/passwords/PasswordCard";
import { PasswordTable } from "../../components/passwords/PasswordTable";
import { AddPasswordModal } from "../../components/passwords/AddPasswordModal";
import { Button } from "@repo/ui/button";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";

export default function PasswordsPage() {
    const [passwords, setPasswords] = useState<PasswordInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPasswords, setSelectedPasswords] = useState<Set<number>>(new Set());
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    
    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPassword, setEditingPassword] = useState<PasswordInterface | null>(null);
    const [deletingPassword, setDeletingPassword] = useState<PasswordInterface | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Load passwords on component mount
    useEffect(() => {
        loadPasswords();
    }, []);

    const loadPasswords = async () => {
        try {
            setLoading(true);
            const data = await getPasswords();
            setPasswords(data);
        } catch (error) {
            console.error("Error loading passwords:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPassword = async (data: any) => {
        try {
            const newPassword = await createPassword(data);
            setPasswords(prev => [newPassword, ...prev]);
        } catch (error) {
            console.error("Error adding password:", error);
            throw error;
        }
    };

    const handleEditPassword = (password: PasswordInterface) => {
        setEditingPassword(password);
        setShowAddModal(true);
    };

    const handleUpdatePassword = async (data: any) => {
        try {
            if (!editingPassword) return;
            
            const updatedPassword = await updatePassword({
                id: editingPassword.id,
                ...data
            });
            
            setPasswords(prev => prev.map(p => p.id === updatedPassword.id ? updatedPassword : p));
            setEditingPassword(null);
        } catch (error) {
            console.error("Error updating password:", error);
            throw error;
        }
    };

    const handleDeletePassword = (password: PasswordInterface) => {
        setDeletingPassword(password);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deletingPassword) return;
        
        try {
            await deletePassword(deletingPassword.id);
            setPasswords(prev => prev.filter(p => p.id !== deletingPassword.id));
            setDeletingPassword(null);
            setShowDeleteModal(false);
        } catch (error) {
            console.error("Error deleting password:", error);
        }
    };

    const handlePasswordSelect = (passwordId: number, selected: boolean) => {
        setSelectedPasswords(prev => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(passwordId);
            } else {
                newSet.delete(passwordId);
            }
            return newSet;
        });
    };

    const selectAllPasswords = (selected: boolean) => {
        if (selected) {
            setSelectedPasswords(new Set(passwords.map(p => p.id)));
        } else {
            setSelectedPasswords(new Set());
        }
    };

    const clearSelection = () => {
        setSelectedPasswords(new Set());
    };

    const deleteBulkPasswords = async () => {
        if (selectedPasswords.size === 0) return;
        
        try {
            await Promise.all(Array.from(selectedPasswords).map(id => deletePassword(id)));
            setPasswords(prev => prev.filter(p => !selectedPasswords.has(p.id)));
            setSelectedPasswords(new Set());
        } catch (error) {
            console.error("Error deleting passwords:", error);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Passwords</h1>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading passwords...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Passwords</h1>
                    <p className="text-gray-600 mt-1">Securely manage your website passwords</p>
                </div>
                <div className="flex items-center">
                    <div className="inline-flex rounded-md shadow-sm mr-3">
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`relative inline-flex items-center h-10 px-4 text-sm font-medium border border-gray-300 rounded-l-md ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            Table
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`relative inline-flex items-center h-10 px-4 text-sm font-medium border border-gray-300 rounded-r-md ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} -ml-px`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            Cards
                        </button>
                    </div>
                    <button
                        onClick={() => { 
                            setEditingPassword(null); 
                            setShowAddModal(true); 
                        }}
                        className="h-10 px-4 text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 rounded-md"
                    >
                        Add Password
                    </button>
                </div>
            </div>

            {/* Password Count */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                        {passwords.length} password{passwords.length !== 1 ? 's' : ''} stored
                    </span>
                </div>
            </div>

            {/* Bulk actions - Only show in grid view */}
            {viewMode === 'grid' && passwords.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <input
                                type="checkbox"
                                checked={selectedPasswords.size === passwords.length && passwords.length > 0}
                                onChange={(e) => selectAllPasswords(e.target.checked)}
                                className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                                {selectedPasswords.size > 0 ? `${selectedPasswords.size} selected` : 'Select all'}
                            </span>
                        </div>
                        {selectedPasswords.size > 0 && (
                            <div className="flex space-x-2">
                                <button
                                    onClick={clearSelection}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                                >
                                    Clear Selection
                                </button>
                                <button
                                    onClick={deleteBulkPasswords}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                >
                                    Delete Selected ({selectedPasswords.size})
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Passwords View (Grid or Table) */}
            {passwords.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No passwords found</h3>
                    <p className="text-gray-600 mb-6">
                        Start by adding your first password
                    </p>
                    <Button onClick={() => { 
                        setEditingPassword(null); 
                        setShowAddModal(true); 
                    }}>
                        Add Your First Password
                    </Button>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <PasswordGrid
                            passwords={passwords}
                            onEdit={handleEditPassword}
                            onDelete={handleDeletePassword}
                            selectedPasswords={selectedPasswords}
                            onPasswordSelect={handlePasswordSelect}
                            showBulkActions={true}
                        />
                    ) : (
                        <PasswordTable
                            passwords={passwords}
                            onEdit={handleEditPassword}
                            onDelete={handleDeletePassword}
                            selectedPasswords={selectedPasswords}
                            onPasswordSelect={handlePasswordSelect}
                            onSelectAll={selectAllPasswords}
                            showBulkActions={true}
                            onBulkDelete={deleteBulkPasswords}
                            onClearSelection={clearSelection}
                        />
                    )}
                </>
            )}

            {/* Add/Edit Password Modal */}
            {showAddModal && (
                <AddPasswordModal
                    key={editingPassword ? `edit-${editingPassword.id}` : 'add-new'}
                    isOpen={showAddModal}
                    onClose={() => { 
                        setShowAddModal(false); 
                        setEditingPassword(null); 
                    }}
                    onSubmit={editingPassword ? handleUpdatePassword : handleAddPassword}
                    initialData={editingPassword ? {
                        websiteName: editingPassword.websiteName,
                        websiteUrl: editingPassword.websiteUrl,
                        username: editingPassword.username,
                        password: "",
                        secretKey: "",
                        notes: editingPassword.notes || undefined,
                        category: editingPassword.category || undefined,
                        tags: editingPassword.tags
                    } : undefined}
                />
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Delete Password"
                message={`Are you sure you want to delete the password for "${deletingPassword?.websiteName}"? This action cannot be undone.`}
            />
        </div>
    );
} 