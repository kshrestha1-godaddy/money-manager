"use client";

import { useEffect, useMemo, useState } from "react";
import { Income, Expense, TransactionImage, TransactionImageType } from "../../../types/financial";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../../../utils/date";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { CurrencyAmount } from "../../../components/shared/CurrencyAmount";
import { getTransactionImages } from "../../../actions/transaction-images";
import { Map, MapMarker, MarkerContent } from "@/components/ui/map";

type Transaction = Income | Expense;

export interface MobileTransactionViewSheetProps {
  transaction: Transaction | null;
  transactionType: Extract<TransactionImageType, "INCOME" | "EXPENSE">;
  isOpen: boolean;
  onClose: () => void;
}

function parseDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

export function MobileTransactionViewSheet({
  transaction,
  transactionType,
  isOpen,
  onClose,
}: MobileTransactionViewSheetProps) {
  const { currency: userCurrency } = useCurrency();
  const [images, setImages] = useState<TransactionImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const theme =
    transactionType === "EXPENSE"
      ? {
          bgClass: "bg-red-50",
          textClass: "text-red-700",
          textClassDark: "text-red-900",
          textClassMedium: "text-red-600",
          spinnerClass: "border-red-600",
          label: "Expense amount",
          entityName: "expense",
          imageLabel: "Receipt images",
        }
      : {
          bgClass: "bg-emerald-50",
          textClass: "text-emerald-700",
          textClassDark: "text-emerald-900",
          textClassMedium: "text-emerald-600",
          spinnerClass: "border-emerald-600",
          label: "Income amount",
          entityName: "income",
          imageLabel: "Document images",
        };

  const displayImages = useMemo(() => {
    if (!transaction) return images;
    const url = typeof transaction.receipt === "string" ? transaction.receipt.trim() : "";
    if (!url) return images;
    if (images.some((img) => (img.imageUrl || "").trim() === url)) return images;
    const uploadedAt =
      transaction.createdAt instanceof Date ? transaction.createdAt : new Date(transaction.createdAt);
    const synthetic: TransactionImage = {
      id: -1,
      imageUrl: url,
      fileName: "receipt",
      transactionType,
      transactionId: transaction.id,
      description: "",
      isActive: true,
      uploadedAt,
      userId: 0,
      createdAt: uploadedAt,
      updatedAt: uploadedAt,
    };
    return [synthetic, ...images];
  }, [images, transaction, transactionType]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !transaction?.transactionLocation) return;
    const tid = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 120);
    return () => window.clearTimeout(tid);
  }, [isOpen, transaction?.id, transaction?.transactionLocation]);

  useEffect(() => {
    if (!isOpen || !transaction) {
      setImages([]);
      setSelectedImageIndex(null);
      setIsLoadingImages(false);
      return;
    }

    const id = transaction.id;
    let cancelled = false;
    setIsLoadingImages(true);
    setImages([]);

    void (async () => {
      try {
        const result = await getTransactionImages(transactionType, id);
        if (cancelled) return;
        if (result.success && Array.isArray(result.data)) {
          setImages(result.data);
        }
      } catch (e) {
        console.error("Failed to fetch transaction images:", e);
      } finally {
        if (!cancelled) setIsLoadingImages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, transaction, transactionType]);

  useEffect(() => {
    if (selectedImageIndex === null) return;

    function handleKeyPress(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedImageIndex(null);
      if (event.key === "ArrowLeft" && selectedImageIndex > 0) {
        setSelectedImageIndex(selectedImageIndex - 1);
      }
      if (event.key === "ArrowRight" && selectedImageIndex < displayImages.length - 1) {
        setSelectedImageIndex(selectedImageIndex + 1);
      }
    }

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [selectedImageIndex, displayImages.length]);

  if (!isOpen || !transaction) return null;

  const txDate = parseDate(transaction.date);
  const coordinates = transaction.transactionLocation
    ? {
        latitude: Number(transaction.transactionLocation.latitude),
        longitude: Number(transaction.transactionLocation.longitude),
      }
    : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-tx-title"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 pr-2">
          <h1 id="mobile-tx-title" className="text-base font-semibold leading-tight text-gray-900">
            {transaction.title}
          </h1>
          <p className="truncate text-xs text-gray-500">{transaction.category.name}</p>
        </div>
        {transaction.isRecurring && (
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
              transactionType === "EXPENSE"
                ? "bg-blue-100 text-blue-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            Recurring
          </span>
        )}
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <section className={`mt-4 rounded-2xl ${theme.bgClass} px-4 py-5`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${theme.textClass}`}>{theme.label}</p>
          <p className={`mt-1 break-words text-3xl font-bold tabular-nums leading-tight ${theme.textClassDark}`}>
            <CurrencyAmount
              amount={transaction.amount}
              storedCurrency={transaction.currency}
              userCurrency={userCurrency}
              showOriginal={false}
            />
          </p>
          {transaction.currency !== userCurrency && (
            <p className={`mt-2 text-sm ${theme.textClass}`}>
              Original: {formatCurrency(transaction.amount, transaction.currency)}
            </p>
          )}
          <p className={`mt-3 text-sm ${theme.textClassMedium}`}>Stored in {transaction.currency}</p>
          <p className={`mt-1 text-sm ${theme.textClassMedium}`}>{formatDate(txDate)}</p>
        </section>

        <section className="mt-6 space-y-0 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm">
          <h2 className="border-b border-gray-100 py-3 text-sm font-semibold text-gray-900">
            {transactionType === "EXPENSE" ? "Expense details" : "Income details"}
          </h2>
          <DetailRow label="Title">{transaction.title}</DetailRow>
          <DetailRow label="Category">
            <span className="inline-flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: transaction.category.color }}
              />
              {transaction.category.name}
            </span>
          </DetailRow>
          <DetailRow label="Date">{formatDate(txDate)}</DetailRow>
          {transaction.description ? (
            <DetailRow label="Description">{transaction.description}</DetailRow>
          ) : null}
        </section>

        <section className="mt-4 space-y-0 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm">
          <h2 className="border-b border-gray-100 py-3 text-sm font-semibold text-gray-900">
            Additional information
          </h2>
          <DetailRow label="Account">
            {transaction.account ? (
              <span className="block">
                <span className="font-medium">
                  {transaction.account.bankName} — {transaction.account.accountType}
                </span>
                {transaction.account.holderName ? (
                  <span className="mt-1 block text-sm text-gray-600">{transaction.account.holderName}</span>
                ) : null}
              </span>
            ) : (
              <span>Cash payment</span>
            )}
          </DetailRow>
          {transaction.isRecurring ? (
            <DetailRow label="Recurring">
              Yes
              {transaction.recurringFrequency ? ` · ${transaction.recurringFrequency}` : ""}
            </DetailRow>
          ) : null}
          {transaction.tags && transaction.tags.length > 0 ? (
            <DetailRow label="Tags">
              <div className="flex flex-wrap gap-2">
                {transaction.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </DetailRow>
          ) : null}
          {transaction.location && transaction.location.length > 0 ? (
            <DetailRow label="Location labels">
              <div className="flex flex-wrap gap-2">
                {transaction.location.map((loc, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800"
                  >
                    {loc}
                  </span>
                ))}
              </div>
            </DetailRow>
          ) : null}
        </section>

        {coordinates ? (
          <section className="mt-4 min-w-0 w-full max-w-full">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Map location</h2>
            <div className="relative isolate w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
              <div className="relative h-[200px] w-full min-w-0 max-w-full sm:h-[240px] [&_.maplibregl-canvas]:max-w-full [&_.maplibregl-canvas]:!w-full">
                <Map center={[coordinates.longitude, coordinates.latitude]} zoom={15}>
                  <MapMarker longitude={coordinates.longitude} latitude={coordinates.latitude}>
                    <MarkerContent>
                      <div className="h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                    </MarkerContent>
                  </MapMarker>
                </Map>
              </div>
            </div>
            <p className="mt-2 break-all text-xs text-gray-500">
              {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </p>
          </section>
        ) : null}

        {transaction.notes ? (
          <section className="mt-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Notes</h2>
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm text-gray-800">{transaction.notes}</p>
            </div>
          </section>
        ) : null}

        <section className="mt-4 pb-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">{theme.imageLabel}</h2>
          {isLoadingImages ? (
            <div className="flex items-center gap-2 py-6">
              <div
                className={`h-8 w-8 animate-spin rounded-full border-2 border-gray-200 ${theme.spinnerClass} border-t-transparent`}
              />
              <span className="text-sm text-gray-600">Loading images…</span>
            </div>
          ) : displayImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {displayImages.map((image, index) => (
                <button
                  key={image.id === -1 ? `receipt-url-${image.imageUrl}` : image.id}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className="relative block overflow-hidden rounded-xl bg-gray-100 text-left ring-1 ring-gray-200"
                >
                  <div className="aspect-square w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.imageUrl}
                      alt={image.description || `${theme.imageLabel} ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {image.description ? (
                    <p className="truncate p-1.5 text-center text-xs text-gray-600">{image.description}</p>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-600">
              No {theme.imageLabel.toLowerCase()} for this {theme.entityName}.
            </div>
          )}
        </section>

        <p className="py-4 text-center text-xs text-gray-400">
          Recorded on {formatDate(txDate)}
        </p>
      </div>

      {selectedImageIndex !== null && displayImages[selectedImageIndex] ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setSelectedImageIndex(null)}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close image"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {displayImages.length > 1 ? (
            <>
              <button
                type="button"
                disabled={selectedImageIndex === 0}
                onClick={() => setSelectedImageIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white disabled:opacity-30"
                aria-label="Previous image"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                disabled={selectedImageIndex === displayImages.length - 1}
                onClick={() =>
                  setSelectedImageIndex((i) =>
                    i !== null && i < displayImages.length - 1 ? i + 1 : i
                  )
                }
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white disabled:opacity-30"
                aria-label="Next image"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                {selectedImageIndex + 1} / {displayImages.length}
              </div>
            </>
          ) : null}
          <div className="flex max-h-[85vh] w-full max-w-4xl items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImages[selectedImageIndex].imageUrl}
              alt=""
              className="max-h-[85vh] max-w-full object-contain"
            />
          </div>
          {displayImages[selectedImageIndex].description ? (
            <div className="absolute bottom-6 left-1/2 max-w-md -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-center text-sm text-white">
              {displayImages[selectedImageIndex].description}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 py-3 last:border-b-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-1 text-base text-gray-900">{children}</div>
    </div>
  );
}
