"use client";

import { useState, useEffect } from "react";
import { Income, Expense, TransactionImage, TransactionImageType } from "../../types/financial";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { useCurrency } from "../../providers/CurrencyProvider";
import { CurrencyAmount } from "./CurrencyAmount";
import { getTransactionImages } from "../../actions/transaction-images";

type Transaction = Income | Expense;

interface TransactionViewModalProps {
    transaction: Transaction | null;
    transactionType: TransactionImageType;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: (transaction: Transaction) => void;
}

export function TransactionViewModal({ 
    transaction, 
    transactionType,
    isOpen, 
    onClose, 
    onEdit 
}: TransactionViewModalProps) {
    const { currency: userCurrency } = useCurrency();
    const [images, setImages] = useState<TransactionImage[]>([]);
    const [isLoadingImages, setIsLoadingImages] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    // Get theme colors based on transaction type
    const theme = transactionType === 'EXPENSE' ? {
        color: 'red',
        bgClass: 'bg-red-50',
        textClass: 'text-red-700',
        textClassDark: 'text-red-900',
        textClassMedium: 'text-red-600',
        spinnerClass: 'border-red-600',
        label: 'Expense Amount',
        entityName: transactionType.toLowerCase(),
        imageLabel: 'Receipt Images'
    } : {
        color: 'green',
        bgClass: 'bg-green-50',
        textClass: 'text-green-700',
        textClassDark: 'text-green-900',
        textClassMedium: 'text-green-600',
        spinnerClass: 'border-green-600',
        label: 'Income Amount',
        entityName: transactionType.toLowerCase(),
        imageLabel: 'Document Images'
    };

    // Fetch transaction images when modal opens and transaction changes
    useEffect(() => {
        if (isOpen && transaction) {
            fetchTransactionImages();
        }
    }, [isOpen, transaction?.id]);

    // Handle keyboard navigation for image lightbox
    useEffect(() => {
        if (selectedImageIndex === null) return;

        const handleKeyPress = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'Escape':
                    closeImageModal();
                    break;
                case 'ArrowLeft':
                    prevImage();
                    break;
                case 'ArrowRight':
                    nextImage();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [selectedImageIndex, images.length]);

    const fetchTransactionImages = async () => {
        if (!transaction) return;
        
        setIsLoadingImages(true);
        try {
            const result = await getTransactionImages(transactionType, transaction.id);
            if (result.success && Array.isArray(result.data)) {
                setImages(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch transaction images:', error);
        } finally {
            setIsLoadingImages(false);
        }
    };

    const openImageModal = (index: number) => {
        setSelectedImageIndex(index);
    };

    const closeImageModal = () => {
        setSelectedImageIndex(null);
    };

    const nextImage = () => {
        if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
            setSelectedImageIndex(selectedImageIndex + 1);
        }
    };

    const prevImage = () => {
        if (selectedImageIndex !== null && selectedImageIndex > 0) {
            setSelectedImageIndex(selectedImageIndex - 1);
        }
    };

    if (!isOpen || !transaction) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{transaction.title}</h2>
                            <p className="text-gray-600">{transaction.category.name}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {transaction.isRecurring && (
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    transactionType === 'EXPENSE' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-green-100 text-green-800'
                                }`}>
                                    Recurring
                                </span>
                            )}
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                    {/* Summary Card */}
                    <div className={`${theme.bgClass} p-6 rounded-lg mb-8`}>
                        <h3 className={`text-lg font-medium ${theme.textClass} mb-2`}>{theme.label}</h3>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className={`text-4xl font-bold ${theme.textClassDark}`}>
                                    <CurrencyAmount
                                        amount={transaction.amount}
                                        storedCurrency={transaction.currency}
                                        userCurrency={userCurrency}
                                        showOriginal={false}
                                    />
                                </p>
                                {transaction.currency !== userCurrency && (
                                    <p className={`text-lg ${theme.textClass} mt-1`}>
                                        Original: {formatCurrency(transaction.amount, transaction.currency)}
                                    </p>
                                )}
                                <p className={`text-sm ${theme.textClassMedium} mt-2`}>
                                    Stored in: {transaction.currency}
                                </p>
                            </div>
                        </div>
                        <p className={`text-sm ${theme.textClassMedium} mt-2`}>
                            {formatDate(transaction.date)}
                        </p>
                    </div>

                    {/* Transaction Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Basic Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                {transactionType === 'EXPENSE' ? 'Expense Details' : 'Income Details'}
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm text-gray-600">Title:</span>
                                    <p className="font-medium text-gray-900">{transaction.title}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Category:</span>
                                    <div className="flex items-center mt-1">
                                        <div 
                                            className="w-3 h-3 rounded-full mr-2"
                                            style={{ backgroundColor: transaction.category.color }}
                                        ></div>
                                        <span className="font-medium text-gray-900">{transaction.category.name}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Date:</span>
                                    <p className="font-medium text-gray-900">{formatDate(transaction.date)}</p>
                                </div>
                                {transaction.description && (
                                    <div>
                                        <span className="text-sm text-gray-600">Description:</span>
                                        <p className="font-medium text-gray-900">{transaction.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm text-gray-600">Account:</span>
                                    <p className="font-medium text-gray-900">
                                        {transaction.account ? (
                                            <span>
                                                {transaction.account.bankName} - {transaction.account.accountType}
                                                <br />
                                                <span className="text-sm text-gray-500">
                                                    {transaction.account.holderName}
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center">
                                                Cash Payment
                                            </span>
                                        )}
                                    </p>
                                </div>
                                {transaction.isRecurring && (
                                    <div>
                                        <span className="text-sm text-gray-600">Recurring:</span>
                                        <p className="font-medium text-gray-900">
                                            Yes{transaction.recurringFrequency && ` - ${transaction.recurringFrequency}`}
                                        </p>
                                    </div>
                                )}
                                {transaction.tags && transaction.tags.length > 0 && (
                                    <div>
                                        <span className="text-sm text-gray-600">Tags:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {transaction.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {transaction.location && transaction.location.length > 0 && (
                                    <div>
                                        <span className="text-sm text-gray-600">Location:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {transaction.location.map((loc, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                                >
                                                    {loc}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {transaction.notes && (
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-gray-700 whitespace-pre-wrap">{transaction.notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Images */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">{theme.imageLabel}</h3>
                        {isLoadingImages ? (
                            <div className="flex items-center justify-center p-8">
                                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme.spinnerClass}`}></div>
                                <span className="ml-2 text-gray-600">Loading images...</span>
                            </div>
                        ) : images.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {images.map((image, index) => (
                                    <div key={image.id} className="relative group">
                                        <div 
                                            className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                                            onClick={() => openImageModal(index)}
                                        >
                                            <img
                                                src={image.imageUrl}
                                                alt={image.description || `${theme.imageLabel} ${index + 1}`}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                            />
                                        </div>
                                        {image.description && (
                                            <p className="text-xs text-gray-600 mt-1 text-center truncate">
                                                {image.description}
                                            </p>
                                        )}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                                Click to view
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <div className="text-gray-400 mb-2">
                                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                                        <path
                                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                                <p className="text-gray-600">
                                    No {theme.imageLabel.toLowerCase()} available for this {theme.entityName}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            Created: {formatDate(transaction.date)}
                        </div>
                        <div className="flex space-x-3">
                            {onEdit && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onEdit(transaction);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    Edit {transactionType === 'EXPENSE' ? 'Expense' : 'Income'}
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Lightbox Modal */}
            {selectedImageIndex !== null && images[selectedImageIndex] && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[60]">
                    <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
                        {/* Navigation buttons */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={prevImage}
                                    disabled={selectedImageIndex === 0}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={nextImage}
                                    disabled={selectedImageIndex === images.length - 1}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}

                        {/* Close button */}
                        <button
                            onClick={closeImageModal}
                            className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 z-10"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Image counter */}
                        {images.length > 1 && (
                            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm z-10">
                                {selectedImageIndex + 1} of {images.length}
                            </div>
                        )}

                        {/* Main image */}
                        <div className="relative flex items-center justify-center w-full h-full">
                            <img
                                src={images[selectedImageIndex].imageUrl}
                                alt={images[selectedImageIndex].description || `${theme.imageLabel} ${selectedImageIndex + 1}`}
                                className="max-w-full max-h-full object-contain rounded-lg"
                                onClick={closeImageModal}
                            />
                        </div>

                        {/* Image info */}
                        {images[selectedImageIndex].description && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg max-w-md text-center">
                                <p className="text-sm">{images[selectedImageIndex].description}</p>
                                <p className="text-xs text-gray-300 mt-1">
                                    Uploaded: {formatDate(images[selectedImageIndex].uploadedAt)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}