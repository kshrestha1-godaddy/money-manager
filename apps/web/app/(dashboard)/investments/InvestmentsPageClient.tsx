"use client";

import { FilterMultiselect } from "../../components/shared/FilterMultiselect";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from '@tanstack/react-query';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InvestmentTable } from "./components/InvestmentTable";
import { AddInvestmentModal } from "./components/AddInvestmentModal";
import { EditInvestmentModal } from "./components/EditInvestmentModal";
import { ViewInvestmentModal } from "./components/ViewInvestmentModal";
import { UnifiedBulkImportModal } from "../../components/shared/UnifiedBulkImportModal";
import { investmentImportConfig } from "../../config/bulkImportConfig";
import { InvestmentTargetModal } from "./components/InvestmentTargetModal";
import { BulkDeleteTargetsModal } from "./components/BulkDeleteTargetsModal";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import { useDisplayCurrency } from "../../hooks/useDisplayCurrency";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { useOptimizedInvestments } from "./hooks/useOptimizedInvestments";
import { useGatedAction } from "@repo/applock";
import { InvestmentInterface } from "../../types/investments";
import { useOptimizedInvestmentTargets } from "./hooks/useOptimizedInvestmentTargets";  
import { Plus, Upload, TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { getGainLossClasses, BUTTON_COLORS, TEXT_COLORS, CONTAINER_COLORS, INPUT_COLORS, LOADING_COLORS, ICON_COLORS, UI_STYLES } from "../../config/colorConfig";
import { ChartAnimationProvider } from "../../hooks/useChartAnimationContext";
import { InvestmentTypePolarChart } from "./charts/InvestmentTypePolarChart";
import { InvestmentTargetProgressChart } from "./charts/InvestmentTargetProgressChart";
import { InvestmentTargetTimelineChart } from "./charts/InvestmentTargetTimelineChart";
import { MetalSpotRateModal } from "./components/MetalSpotRateModal";
import { DEFAULT_GOLD_SPOT_INR_PER_UNIT } from "./utils/goldSpotStorage";
import { DEFAULT_SILVER_SPOT_INR_PER_UNIT } from "./utils/silverSpotStorage";
import { DisappearingNotification, NotificationData } from "../../components/DisappearingNotification";
import { exportInvestmentTargetsToCSV } from "../../utils/csvExportInvestmentTargets";
import { presentValueForPosition } from "./utils/stocksExpenseBasis";
import { INVESTMENT_GROUPING_OPTIONS, isInvestmentGrouping } from "./utils/investmentGrouping";
// import { InvestmentTypePieChart } from "./charts/InvestmentTypePieChart";

const pageContainer = CONTAINER_COLORS.page;
const errorContainer = CONTAINER_COLORS.error;
const cardLargeContainer = CONTAINER_COLORS.cardLarge;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

const pageSubtitle = TEXT_COLORS.subtitle;
const errorTitle = TEXT_COLORS.errorTitle;
const errorMessage = TEXT_COLORS.errorMessage;
const cardTitle = TEXT_COLORS.cardTitle;
const cardSubtitle = TEXT_COLORS.cardSubtitle;
const emptyTitle = TEXT_COLORS.emptyTitle;
const emptyMessage = TEXT_COLORS.emptyMessage;
const labelText = cn(TEXT_COLORS.label, "mb-1 text-xs");

const primaryButton = BUTTON_COLORS.primary;
const secondaryBlueButton = BUTTON_COLORS.secondaryBlue;
const secondaryGreenButton = BUTTON_COLORS.secondaryGreen;
const clearButton = BUTTON_COLORS.clear;
const clearFilterButton = cn(BUTTON_COLORS.clearFilter, "h-8 whitespace-nowrap rounded-md px-2 py-1 text-xs");

const standardInput = cn(INPUT_COLORS.standard, "h-8 min-w-0 rounded-md px-2 py-1 text-xs");

const blueIcon = ICON_COLORS.blue;
const greenIcon = ICON_COLORS.green;
const redIcon = ICON_COLORS.red;
const purpleIcon = ICON_COLORS.purple;
const greenPositiveIcon = ICON_COLORS.greenPositive;
const redNegativeIcon = ICON_COLORS.redNegative;

export default function InvestmentsPageClient() {
  const { currency: userCurrency } = useCurrency();
  const {
    displayCurrency,
    toDisplayAmount,
    toAccountAmount,
  } = useDisplayCurrency();

  const router = useRouter();
  const queryClient = useQueryClient();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isBulkDeleteTargetsModalOpen, setIsBulkDeleteTargetsModalOpen] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [metalRateModal, setMetalRateModal] = useState<null | "gold" | "silver">(null);

  const {
    targets: actualTargets,
    targetProgress,
    loading: targetsLoading,
    error: targetsError,
    modal: targetModal,
    openModal: openTargetModal,
    closeModal: closeTargetModal,
    handleCreateTargetsBatch,
    handleUpdateTarget,
    handleDeleteTarget,
    handleBulkDeleteAllTargets,
    isCreating: isCreatingTarget,
    isUpdating: isUpdatingTarget,
    isDeleting: isDeletingTarget,
    isBulkDeleting: isBulkDeletingTargets,
  } = useOptimizedInvestmentTargets();

  const {
    investments,
    filteredInvestments,
    loading,
    error,
    sections,
    groupBy,
    setGroupBy,
    uniqueTypes,
    uniqueBanks,
    hasActiveFilters,
    totalInvested,
    totalCurrentValue,
    totalGainLoss,
    totalGainLossPercentage,
    gainersCount,
    losersCount,
    breakEvenCount,
    modal,
    openModal,
    closeModal,
    searchTerm,
    setSearchTerm,
    selectedTypes,
    setSelectedTypes,
    selectedBanks,
    setSelectedBanks,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedTargets,
    setSelectedTargets,
    selectedInvestments,
    setSelectedInvestments,
    handleInvestmentSelect,
    handleSelectAll,
    handleAddInvestment,
    handleEditInvestment,
    handleDeleteInvestment,
    handleBulkDeleteIds,
    handleExportToCSV,
    clearFilters,
    clearError,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
    goldSpotPerUnitDisplay,
    goldSpotUpdatedAt,
    setGoldSpotRateFromDisplay,
    silverSpotPerUnitDisplay,
    silverSpotUpdatedAt,
    setSilverSpotRateFromDisplay,
  } = useOptimizedInvestments();

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  const debouncedSetSearchTerm = useCallback((value: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => setSearchTerm(value), 200);
  }, [setSearchTerm]);

  const debouncedSetStartDate = useCallback((value: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => setStartDate(value), 150);
  }, [setStartDate]);

  const debouncedSetEndDate = useCallback((value: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => setEndDate(value), 150);
  }, [setEndDate]);

  const formatType = (type: string) => type === 'SIP' ? 'SIP' : type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  function labelForInvestmentTarget(t: (typeof actualTargets)[number]): string {
    const typeLabel = formatType(t.investmentType);
    const nick = t.nickname?.trim();
    if (nick) return `${nick} (${typeLabel})`;
    return typeLabel;
  }

  const hasInvestmentsWithoutTarget = useMemo(
    () => investments.some((inv) => inv.investmentTargetId == null),
    [investments]
  );

  const handleInvestmentsRefresh = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ["investments"] });
  }, [queryClient]);

  const openAddTargetModal = useCallback(() => openTargetModal('create'), [openTargetModal]);
  const openEditTargetModal = useCallback((targetId: number) => {
    const actualTarget = actualTargets.find((t) => t.id === targetId);
    if (actualTarget) openTargetModal('edit', actualTarget);
  }, [actualTargets, openTargetModal]);

  // Fingerprint: type, quantity, purchase & current price — table/P&L need current price; polar/targets use cost basis.
  const investmentsStableKey = useMemo(
    () =>
      investments
        ?.map(
          (inv) =>
            `${inv.id}:${inv.type}:${inv.quantity}:${inv.purchasePrice}:${inv.currentPrice}`
        )
        .join("|") ?? "",
    [investments]
  );
  const stableInvestments = useMemo(() => investments, [investments, investmentsStableKey]);

  const handleGoldSpotSaved = useCallback(
    (rateInDisplayCurrency: number) => {
      setGoldSpotRateFromDisplay(rateInDisplayCurrency);
      setNotification({
        title: "Gold spot rate saved",
        message:
          "The rate is stored in this browser and is used for current gold values (grams × spot per gm).",
        type: "success",
        duration: 4000,
      });
    },
    [setGoldSpotRateFromDisplay]
  );

  const handleSilverSpotSaved = useCallback(
    (rateInDisplayCurrency: number) => {
      setSilverSpotRateFromDisplay(rateInDisplayCurrency);
      setNotification({
        title: "Silver spot rate saved",
        message:
          "The rate is stored in this browser and is used for current silver values (grams × spot per gm).",
        type: "success",
        duration: 4000,
      });
    },
    [setSilverSpotRateFromDisplay]
  );

  const filteredInvestmentsStableKey = useMemo(
    () =>
      filteredInvestments
        .map(
          (inv) =>
            `${inv.id}:${inv.type}:${inv.quantity}:${inv.purchasePrice}:${inv.currentPrice}`
        )
        .join("|"),
    [filteredInvestments]
  );
  const stableFilteredInvestments = useMemo(
    () => filteredInvestments,
    [filteredInvestments, filteredInvestmentsStableKey]
  );

  /**
   * Progress bars / timeline must match the investments table: same quantity × current price,
   * including browser gold/silver spot overrides. Server-only getInvestmentTargetProgress uses DB
   * currentPrice and was also stuck behind a stale memo when progress stayed at 100%.
   */
  const targetProgressForCharts = useMemo(() => {
    if (!targetProgress?.length) return targetProgress ?? [];
    if (!investments?.length) return targetProgress;
    const pvByTargetId = new Map<number, number>();
    for (const inv of investments) {
      if (inv.investmentTargetId == null) continue;
      const tid = inv.investmentTargetId;
      pvByTargetId.set(tid, (pvByTargetId.get(tid) || 0) + presentValueForPosition(inv));
    }
    return targetProgress.map((t) => {
      const pv = pvByTargetId.get(t.targetId) ?? 0;
      const rawProgress = t.targetAmount > 0 ? (pv / t.targetAmount) * 100 : 0;
      return {
        ...t,
        currentAmount: pv,
        progress: Math.min(rawProgress, 100),
        isComplete: rawProgress >= 100,
      };
    });
  }, [targetProgress, investments]);

  const timelineTargets = useMemo(() => targetProgressForCharts.map(target => ({
    ...target,
    targetAmount: convertForDisplaySync(target.targetAmount, userCurrency, displayCurrency),
    currentAmount: convertForDisplaySync(target.currentAmount, userCurrency, displayCurrency),
  })), [targetProgressForCharts, userCurrency, displayCurrency]);

  const polarChartProps = useMemo(() => ({ investments: stableFilteredInvestments, currency: displayCurrency, title: "Portfolio Distribution by Investment Type" }), [stableFilteredInvestments, displayCurrency]);
  // Bulk delete targets handlers
  const handleBulkDeleteTargetsClick = useCallback(() => {
    setIsBulkDeleteTargetsModalOpen(true);
  }, []);

  const handleExtendTarget = useCallback(async (targetId: number, date: Date) => {
    await handleUpdateTarget(targetId, { targetCompletionDate: date });
    await queryClient.invalidateQueries({ queryKey: ['investment-target-progress'] });
  }, [handleUpdateTarget, queryClient]);

  const targetChartProps = useMemo(() => ({ 
    targets: timelineTargets, 
    currency: displayCurrency, 
    title: "Investment Target Progress", 
    onEditTarget: openEditTargetModal,
    onExtendTarget: handleExtendTarget,
    onAddTarget: openAddTargetModal,
    onBulkDelete: handleBulkDeleteTargetsClick
  }), [timelineTargets, displayCurrency, openEditTargetModal, openAddTargetModal, handleBulkDeleteTargetsClick, handleExtendTarget]);

  const deleteSectionInvestments = async (
    appLockPassword: string,
    sectionInvestments: InvestmentInterface[],
  ) => {
    const investmentIds = sectionInvestments
      .filter(inv => selectedInvestments.has(inv.id))
      .map(inv => inv.id);
    if (investmentIds.length === 0) return;

    await handleBulkDeleteIds(investmentIds, appLockPassword);
    setSelectedInvestments(prev => {
      const newSet = new Set(prev);
      investmentIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  };

  // Combined export handler for both investments and targets
  const handleCombinedExportToCSV = useCallback(() => {
    let hasData = false;
    
    // Export investments if available
    if (filteredInvestments.length > 0) {
      handleExportToCSV();
      hasData = true;
    }
    
    // Export investment targets if available
    if (targetProgressForCharts && targetProgressForCharts.length > 0) {
      exportInvestmentTargetsToCSV(targetProgressForCharts);
      hasData = true;
    }
    
    if (!hasData) {
      alert("No data to export. Please add some investments or set investment targets first.");
    }
  }, [filteredInvestments, targetProgressForCharts, handleExportToCSV]);

  // Import success handler - refreshes both investments and targets data
  const handleImportSuccess = useCallback(() => {
    // Invalidate investments data
    queryClient.invalidateQueries({ queryKey: ['investments'] });
    
    // Invalidate investment targets data
    queryClient.invalidateQueries({ queryKey: ['investment-targets'] });
    queryClient.invalidateQueries({ queryKey: ['investment-target-progress'] });
    
    // Close the modal
    closeModal();
    
    // Show success notification
    setNotification({
      type: 'success',
      title: 'Import Successful',
      message: 'Import completed successfully!'
    });
  }, [queryClient, closeModal]);

  const bulkDeleteAllTargetsConfirm = useCallback(async () => {
    try {
      const result = await bulkDeleteAllTargets();
      setIsBulkDeleteTargetsModalOpen(false);
      setNotification({
        type: 'success',
        title: 'Targets Deleted',
        message: `Successfully deleted ${result?.deletedCount || 0} investment targets`
      });
    } catch (error) {
      console.error('Error bulk deleting targets:', error);
      setNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete investment targets. Please try again.'
      });
    }
  }, [handleBulkDeleteAllTargets]);


  // Investment deletions require the lock screen password, which the server
  // action re-verifies before deleting.
  const deleteInvestment = useGatedAction(
    (appLockPassword: string, investment: InvestmentInterface) =>
      handleDeleteInvestment(investment, appLockPassword),
    {
      title: 'Delete investment',
      description: 'This cannot be undone. Enter your lock screen password to delete this investment.',
      confirmLabel: 'Delete investment',
    },
  );

  const bulkDeleteSelectedInvestments = useGatedAction(
    (appLockPassword: string, sectionInvestments: InvestmentInterface[]) =>
      deleteSectionInvestments(appLockPassword, sectionInvestments),
    {
      title: 'Delete selected investments',
      description: 'This cannot be undone. Enter your lock screen password to delete the selected investments.',
      confirmLabel: 'Delete investments',
    },
  );

  const deleteTarget = useGatedAction(
    (appLockPassword: string, id: number) => handleDeleteTarget(id, appLockPassword),
    {
      title: 'Delete target',
      description: 'This cannot be undone. Enter your lock screen password to delete this investment target.',
      confirmLabel: 'Delete target',
    },
  );

  const bulkDeleteAllTargets = useGatedAction(
    (appLockPassword: string) => handleBulkDeleteAllTargets(appLockPassword),
    {
      title: 'Delete all targets',
      description: 'This cannot be undone. Enter your lock screen password to delete every investment target.',
      confirmLabel: 'Delete all targets',
    },
  );

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className={errorContainer}>
          <h3 className={errorTitle}>Error Loading Investments</h3>
          <p className={errorMessage}>{error}</p>
          <div className="flex gap-2 mt-4 justify-center">
            <button onClick={() => window.location.reload()} className={primaryButton}>Retry</button>
            <button onClick={clearError} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Dismiss</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner}></div>
        <p className={loadingText}>Loading investments...</p>
      </div>
    );
  }

  return (
    <ChartAnimationProvider>
      <div className={pageContainer}>
        <div className={UI_STYLES.header.container}>
          <div>
            <h1 className="sr-only">Investment</h1>
            <p className={pageSubtitle}>Track your investment portfolio and performance</p>
          </div>
          <div className={UI_STYLES.header.buttonGroup}>
                        <Link href="/stocks" className={secondaryBlueButton}>Stocks dashboard</Link>
            <Link href="/sip" className={secondaryBlueButton}>SIP dashboard</Link>
            <button onClick={() => openModal('add')} className={primaryButton}>Add Investment</button>
            <button style={{ display: "none" }} onClick={() => openModal('import')} className={secondaryBlueButton}>Import CSV</button>
            <button style={{ display: "none" }} onClick={handleCombinedExportToCSV} className={secondaryGreenButton} disabled={filteredInvestments.length === 0 && (!targetProgress || targetProgress.length === 0)}>Export CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-6">
          <div className={`${cardLargeContainer} relative`}>
            <Target className={`absolute top-4 left-4 h-4 w-4 ${blueIcon}`} />
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Total Investments</h3>
              <p className="text-2xl font-bold text-gray-900">{investments.length}</p>
              <p className={cardSubtitle}>positions</p>
            </div>
          </div>
          <div className={`${cardLargeContainer} relative`}>
            <TrendingUp className={`absolute top-4 left-4 h-4 w-4 ${greenIcon}`} />
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Gainers</h3>
              <p className="text-2xl font-bold text-gray-900">{gainersCount}</p>
              <p className={cardSubtitle}>profitable</p>
            </div>
          </div>
          <div className={`${cardLargeContainer} relative`}>
            <TrendingDown className={`absolute top-4 left-4 h-4 w-4 ${redIcon}`} />
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Losers</h3>
              <p className="text-2xl font-bold text-gray-900">{losersCount}</p>
              <p className={cardSubtitle}>at loss</p>
            </div>
          </div>
          <div className={`${cardLargeContainer} relative`}>
            <DollarSign className={`absolute top-4 left-4 h-4 w-4 ${purpleIcon}`} />
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Total Invested</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(convertForDisplaySync(totalInvested, userCurrency, displayCurrency), displayCurrency)}</p>
              <p className={cardSubtitle}>purchase cost</p>
            </div>
          </div>
          <div className={`${cardLargeContainer} relative`}>
            <DollarSign className={`absolute top-4 left-4 h-4 w-4 ${blueIcon}`} />
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Current Value</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(convertForDisplaySync(totalCurrentValue, userCurrency, displayCurrency), displayCurrency)}</p>
              <p className={cardSubtitle}>market value</p>
            </div>
          </div>
          <div className={`${cardLargeContainer} relative`}>
            {totalGainLoss >= 0 ? (
              <TrendingUp className={`absolute top-4 left-4 h-4 w-4 ${greenPositiveIcon}`} />
            ) : (
              <TrendingDown className={`absolute top-4 left-4 h-4 w-4 ${redNegativeIcon}`} />
            )}
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Total Gain/Loss</h3>
              <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(convertForDisplaySync(totalGainLoss, userCurrency, displayCurrency), displayCurrency)}</p>
              <p className={cardSubtitle}>{`${totalGainLossPercentage >= 0 ? '+' : ''}${totalGainLossPercentage.toFixed(2)}% return`}</p>
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <InvestmentTypePolarChart {...polarChartProps} />
          </div>
          <div>
            <InvestmentTargetProgressChart {...targetChartProps} />
          </div>
        </div>

        {/* Investment Target Timeline Chart - Full Width (min-w-0 so horizontal chart scroll works inside flex/grid ancestors) */}
        <div className="mt-6 min-w-0">
          <InvestmentTargetTimelineChart 
            targets={timelineTargets}
            currency={displayCurrency}
            title="Investment Target Timeline" 
          />
        </div>

        <div className={UI_STYLES.filters.containerWithMargin}>
          <div className="grid w-full grid-cols-1 items-end gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[minmax(0,2fr)_repeat(7,minmax(0,1fr))]">
            <div className="min-w-0">
              <label className={labelText}>Search Investments</label>
              <input type="text" placeholder="Search by name, symbol, notes..." value={searchTerm} onChange={e => debouncedSetSearchTerm(e.target.value)} className={standardInput} />
            </div>
            <FilterMultiselect
              label="Filter by Type"
              itemNamePlural="types"
              options={uniqueTypes.map(type => ({ value: type, label: formatType(type) }))}
              selected={selectedTypes}
              onChange={setSelectedTypes}
            />
            <FilterMultiselect
              label="Filter by Bank"
              itemNamePlural="banks"
              options={uniqueBanks.filter((bank): bank is string => Boolean(bank)).map(bank => ({
                value: bank === "No bank linked" ? "no-bank" : bank,
                label: bank,
              }))}
              selected={selectedBanks}
              onChange={setSelectedBanks}
            />
            <FilterMultiselect
              label="Filter by Target"
              itemNamePlural="targets"
              options={[
                ...(hasInvestmentsWithoutTarget ? [{ value: "none", label: "No target" }] : []),
                ...actualTargets.map(target => ({
                  value: String(target.id),
                  label: labelForInvestmentTarget(target),
                })),
              ]}
              selected={selectedTargets}
              onChange={setSelectedTargets}
            />
            <div className="min-w-0">
              <label className={labelText}>Start Date</label>
              <input type="date" value={startDate} onChange={e => debouncedSetStartDate(e.target.value)} className={standardInput} />
            </div>
            <div className="min-w-0">
              <label className={labelText}>End Date</label>
              <input type="date" value={endDate} onChange={e => debouncedSetEndDate(e.target.value)} className={standardInput} />
            </div>
            <div className="min-w-0">
              <label htmlFor="investment-group-by" className={labelText}>Group by</label>
              <select
                id="investment-group-by"
                value={groupBy}
                onChange={(e) => {
                  if (isInvestmentGrouping(e.target.value)) setGroupBy(e.target.value);
                }}
                className={standardInput}
              >
                {INVESTMENT_GROUPING_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className={`${labelText} pointer-events-none select-none text-transparent`} aria-hidden>
                Clear
              </label>
              <button type="button" onClick={clearFilters} className={clearFilterButton} disabled={!hasActiveFilters}>
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setMetalRateModal("gold")}
            title="Gold quantity is in grams. Present value = quantity (g) × this spot per gram. Purchase cost = quantity × your purchase price per gram. Click to update (saved in this browser)."
            className="inline-flex max-w-full flex-col items-end gap-0.5 rounded-md border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-right shadow-sm transition hover:bg-amber-100/80"
          >
            <span className="text-sm font-semibold tabular-nums text-amber-950">
              {formatCurrency(convertForDisplaySync(goldSpotPerUnitDisplay, userCurrency, displayCurrency), displayCurrency)}
              <span className="font-medium text-amber-900/80"> /gm</span>
            </span>
            <span className="text-xs font-normal text-amber-800/90">
              {goldSpotUpdatedAt
                ? new Date(goldSpotUpdatedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Gold · default · tap to save"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMetalRateModal("silver")}
            title="Silver quantity is in grams. Present value = quantity (g) × this spot per gram. Purchase cost = quantity × your purchase price per gram. Click to update (saved in this browser)."
            className="inline-flex max-w-full flex-col items-end gap-0.5 rounded-md border border-slate-300/90 bg-slate-50/95 px-3 py-2 text-right shadow-sm transition hover:bg-slate-100/90"
          >
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {formatCurrency(convertForDisplaySync(silverSpotPerUnitDisplay, userCurrency, displayCurrency), displayCurrency)}
              <span className="font-medium text-slate-700"> /gm</span>
            </span>
            <span className="text-xs font-normal text-slate-600">
              {silverSpotUpdatedAt
                ? new Date(silverSpotUpdatedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Silver · default · tap to save"}
            </span>
          </button>
        </div>

        {filteredInvestments.length === 0 ? (
          <div className={UI_STYLES.empty.container}>
            <div className={UI_STYLES.empty.icon}>
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <h3 className={emptyTitle}>{hasActiveFilters ? 'No investments match your filters' : 'No investments yet'}</h3>
            <p className={emptyMessage}>{hasActiveFilters ? 'Try adjusting your search criteria or clearing filters.' : 'Start building your investment portfolio by adding your first investment.'}</p>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className={clearButton}>Clear Filters</button>
            ) : (
              <button onClick={() => openModal('add')} className={primaryButton}>Add Your First Investment</button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={`${groupBy}:${section.key}`} className={CONTAINER_COLORS.white}>
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold ${TEXT_COLORS.title} ${TEXT_COLORS.chartTitle.replace('mb-4', '')}`}>{section.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>Invested: {formatCurrency(convertForDisplaySync(section.totalInvested, userCurrency, displayCurrency), displayCurrency)}</span>
                        <span>Current: {formatCurrency(convertForDisplaySync(section.currentValue, userCurrency, displayCurrency), displayCurrency)}</span>
                        <span className={`font-medium ${getGainLossClasses(section.gainLoss)}`}>{section.gainLoss >= 0 ? '+' : ''}{formatCurrency(convertForDisplaySync(section.gainLoss, userCurrency, displayCurrency), displayCurrency)} ({section.gainLossPercentage.toFixed(2)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {(() => {
                        const sectionSelectedIds = section.investments.filter(inv => selectedInvestments.has(inv.id));
                        return sectionSelectedIds.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <button onClick={() => { const newSelected = new Set(selectedInvestments); section.investments.forEach(inv => newSelected.delete(inv.id)); setSelectedInvestments(newSelected); }} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors">Clear ({sectionSelectedIds.length})</button>
                            <button onClick={() => void bulkDeleteSelectedInvestments(section.investments)} disabled={isBulkDeleting} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50">{isBulkDeleting ? 'Deleting...' : `Delete (${sectionSelectedIds.length})`}</button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <InvestmentTable
                  selectedCurrency={displayCurrency}
                  tableId={`${groupBy}:${section.key}`}
                  investments={section.investments}
                  selectedInvestments={selectedInvestments}
                  onInvestmentSelect={handleInvestmentSelect}
                  onEdit={(investment: InvestmentInterface) => openModal('edit', investment)}
                  onDelete={(investment: InvestmentInterface) => investment.id < 0 ? router.push(investment.type === 'SIP' ? '/sip' : '/stocks') : void deleteInvestment(investment)}
                  onViewDetails={(investment: InvestmentInterface) => openModal('view', investment)}
                  showBulkActions={true}
                  onRefresh={handleInvestmentsRefresh}
                />
              </div>
            ))}
          </div>
        )}

        <MetalSpotRateModal
          isOpen={metalRateModal !== null}
          onClose={() => setMetalRateModal(null)}
          currency={displayCurrency}
          spotPerUnitDisplay={
            toDisplayAmount(
              metalRateModal === "silver"
                ? silverSpotPerUnitDisplay
                : goldSpotPerUnitDisplay,
              userCurrency
            )
          }
          onApply={(displayRate) => {
            const accountRate = toAccountAmount(displayRate);
            if (metalRateModal === "silver") handleSilverSpotSaved(accountRate);
            else handleGoldSpotSaved(accountRate);
          }}
          metal={metalRateModal === "silver" ? "silver" : "gold"}
          defaultInrPerUnit={
            metalRateModal === "silver"
              ? DEFAULT_SILVER_SPOT_INR_PER_UNIT
              : DEFAULT_GOLD_SPOT_INR_PER_UNIT
          }
        />

        <AddInvestmentModal
          isOpen={modal.type === 'add'}
          onClose={closeModal}
          onAdd={(data) => handleModalAction('add', data)}
          hasExistingStocksInvestment={true}
        />
        <EditInvestmentModal
          key={modal.type === 'edit' && modal.investment ? `edit-investment-${modal.investment.id}` : 'edit-investment-closed'}
          investment={modal.investment || null}
          isOpen={modal.type === 'edit'}
          onClose={closeModal}
          onEdit={(id, data) => handleModalAction('edit', data)}
        />
        <ViewInvestmentModal investment={modal.investment || null} isOpen={modal.type === 'view'} onClose={closeModal} onEdit={(investment) => openModal('edit', investment)} />
        <UnifiedBulkImportModal 
          isOpen={modal.type === 'import'} 
          onClose={closeModal} 
          onSuccess={handleImportSuccess}
          config={investmentImportConfig}
        />
        <InvestmentTargetModal isOpen={targetModal.type !== null} onClose={closeModalTarget} onCreate={async (items) => { await handleCreateTargetsBatch(items); }} onUpdate={async (id, data) => { await handleUpdateTarget(id, data); }} onDelete={async (id) => { await deleteTarget(id); }} existingTarget={targetModal.target} mode={targetModal.type || 'create'} />
        <BulkDeleteTargetsModal 
          isOpen={isBulkDeleteTargetsModalOpen} 
          onClose={() => setIsBulkDeleteTargetsModalOpen(false)} 
          onConfirm={() => void bulkDeleteAllTargetsConfirm()}
          targetCount={actualTargets.length}
          isDeleting={isBulkDeletingTargets}
        />
        
        {/* Disappearing Notification */}
        <DisappearingNotification 
          notification={notification} 
          onHide={() => setNotification(null)} 
        />
      </div>
    </ChartAnimationProvider>
  );

  function handleModalAction(action: string, data?: any) {
    switch (action) {
      case 'add':
        return handleAddInvestmentWithNotification(data);
      case 'edit':
        return modal.investment ? handleEditInvestment(modal.investment.id, data) : undefined;
    }
  }
  
  // Custom wrapper to handle notifications without causing re-renders
  async function handleAddInvestmentWithNotification(data: any) {
    try {
      const result = await handleAddInvestment(data);
      
      // Show success notification
      const totalValue = data.quantity * data.purchasePrice;
      const formattedAmount = formatCurrency(
        convertForDisplaySync(totalValue, userCurrency, displayCurrency),
        displayCurrency
      );
      
      setNotification({
        title: 'Investment Added Successfully!',
        message: `${data.name} (${data.symbol || 'N/A'}) - ${formattedAmount} has been added to your portfolio`,
        type: "success",
        duration: 3000
      });
      
      return result;
    } catch (error) {
      // Show error notification
      setNotification({
        title: 'Failed to Add Investment',
        message: "Please try again or contact support if the issue persists",
        type: "error",
        duration: 4000
      });
      throw error;
    }
  }

  function closeModalTarget() {
    closeTargetModal();
  }
}

