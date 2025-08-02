"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, Loader2 } from "lucide-react";
import { Income, Expense } from "../types/financial";
import { InvestmentInterface } from "../types/investments";
import { DebtInterface } from "../types/debts";
import { useCurrency } from "../providers/CurrencyProvider";
import { useChartData } from "../hooks/useChartDataContext";
import { useOptimizedInvestments } from "../hooks/useOptimizedInvestments";
import { useOptimizedDebts } from "../hooks/useOptimizedDebts";
import { useOptimizedWorth } from "../hooks/useOptimizedWorth";
// @ts-ignore
import html2canvas from "html2canvas";

interface SimplePDFReportGeneratorProps {
    startDate?: string;
    endDate?: string;
}

interface FinancialSummary {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    savingsRate: number;
    expenseCategories: Record<string, number>;
    incomeCategories: Record<string, number>;
}

interface InvestmentSummary {
    totalInvested: number;
    totalCurrentValue: number;
    totalGainLoss: number;
    totalGainLossPercentage: number;
    investmentsByType: Record<string, { count: number; invested: number; currentValue: number; }>;
    performanceMetrics: {
        gainersCount: number;
        losersCount: number;
        breakEvenCount: number;
    };
}

interface DebtSummary {
    totalLent: number;
    totalRemaining: number;
    totalRepaid: number;
    totalInterestEarned: number;
    debtsByStatus: Record<string, { count: number; amount: number; }>;
    averageInterestRate: number;
}

interface NetWorthData {
    totalNetWorth: number;
    totalAssets: number;
    totalAccountBalance: number;
    totalInvestmentValue: number;
    totalMoneyLent: number;
    savingsRate: number;
    investmentAllocation: number;
    liquidityRatio: number;
    monthlyGrowthRate: number;
}

export function SimplePDFReportGenerator({
    startDate,
    endDate
}: SimplePDFReportGeneratorProps) {
    const { data: session } = useSession();
    const { currency } = useCurrency();
    const { filteredIncomes, filteredExpenses } = useChartData();
    const [isGenerating, setIsGenerating] = useState(false);

    // Use data from chart context
    const incomes = filteredIncomes;
    const expenses = filteredExpenses;

    // Get additional financial data
    const investmentData = useOptimizedInvestments();
    const debtData = useOptimizedDebts();
    const worthData = useOptimizedWorth();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const formatPercentage = (value: number) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const formatDate = (date: string) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getDateRangeText = () => {
        if (!startDate && !endDate) return 'All Time';
        if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`;
        if (startDate) return `From ${formatDate(startDate)}`;
        if (endDate) return `Until ${formatDate(endDate)}`;
        return 'All Time';
    };

    // Calculate financial summaries
    const calculateFinancialSummary = (): FinancialSummary => {
        const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const netIncome = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

        const expenseCategories = expenses.reduce((acc, expense) => {
            const categoryName = expense.category.name;
            acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
            return acc;
        }, {} as Record<string, number>);

        const incomeCategories = incomes.reduce((acc, income) => {
            const categoryName = income.category.name;
            acc[categoryName] = (acc[categoryName] || 0) + income.amount;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalIncome,
            totalExpenses,
            netIncome,
            savingsRate,
            expenseCategories,
            incomeCategories
        };
    };

    const calculateInvestmentSummary = (): InvestmentSummary => {
        const investments = investmentData.investments || [];
        
        const totalInvested = investments.reduce((sum, inv) => sum + (inv.quantity * inv.purchasePrice), 0);
        const totalCurrentValue = investments.reduce((sum, inv) => sum + (inv.quantity * inv.currentPrice), 0);
        const totalGainLoss = totalCurrentValue - totalInvested;
        const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

        const investmentsByType = investments.reduce((acc, inv) => {
            const type = inv.type;
            const invested = inv.quantity * inv.purchasePrice;
            const currentValue = inv.quantity * inv.currentPrice;
            
            if (!acc[type]) {
                acc[type] = { count: 0, invested: 0, currentValue: 0 };
            }
            acc[type].count += 1;
            acc[type].invested += invested;
            acc[type].currentValue += currentValue;
            return acc;
        }, {} as Record<string, { count: number; invested: number; currentValue: number; }>);

        let gainersCount = 0;
        let losersCount = 0;
        let breakEvenCount = 0;

        investments.forEach(inv => {
            const gainLoss = (inv.quantity * inv.currentPrice) - (inv.quantity * inv.purchasePrice);
            if (gainLoss > 0) gainersCount++;
            else if (gainLoss < 0) losersCount++;
            else breakEvenCount++;
        });

        return {
            totalInvested,
            totalCurrentValue,
            totalGainLoss,
            totalGainLossPercentage,
            investmentsByType,
            performanceMetrics: {
                gainersCount,
                losersCount,
                breakEvenCount
            }
        };
    };

    const calculateDebtSummary = (): DebtSummary => {
        const debts = debtData.debts || [];
        
        const totalLent = debts.reduce((sum, debt) => sum + debt.amount, 0);
        const totalRepaid = debts.reduce((sum, debt) => {
            return sum + (debt.repayments?.reduce((repSum, rep) => repSum + rep.amount, 0) || 0);
        }, 0);
        const totalRemaining = totalLent - totalRepaid;

        // Calculate interest earned
        const totalInterestEarned = debts.reduce((sum, debt) => {
            const principal = debt.amount;
            const repaidAmount = debt.repayments?.reduce((repSum, rep) => repSum + rep.amount, 0) || 0;
            // Simple interest calculation based on what's been repaid
            return sum + Math.max(0, repaidAmount - principal);
        }, 0);

        const debtsByStatus = debts.reduce((acc, debt) => {
            const status = debt.status;
            if (!acc[status]) {
                acc[status] = { count: 0, amount: 0 };
            }
            acc[status].count += 1;
            acc[status].amount += debt.amount;
            return acc;
        }, {} as Record<string, { count: number; amount: number; }>);

        const averageInterestRate = debts.length > 0 
            ? debts.reduce((sum, debt) => sum + debt.interestRate, 0) / debts.length 
            : 0;

        return {
            totalLent,
            totalRemaining,
            totalRepaid,
            totalInterestEarned,
            debtsByStatus,
            averageInterestRate
        };
    };

    const getNetWorthData = (): NetWorthData => {
        const stats = worthData.netWorthStats;
        return {
            totalNetWorth: stats?.netWorth || 0,
            totalAssets: stats?.totalAssets || 0,
            totalAccountBalance: stats?.totalAccountBalance || 0,
            totalInvestmentValue: stats?.totalInvestmentValue || 0,
            totalMoneyLent: stats?.totalMoneyLent || 0,
            savingsRate: stats?.savingsRate || 0,
            investmentAllocation: stats?.investmentAllocation || 0,
            liquidityRatio: stats?.liquidityRatio || 0,
            monthlyGrowthRate: stats?.monthlyGrowthRate || 0
        };
    };

    // Simple chart capture without DOM manipulation
    const captureChartElementSimple = async (selector: string): Promise<string | null> => {
        try {
            const element = document.querySelector(selector) as HTMLElement;
            if (!element) {
                return null;
            }
            
            // Wait a bit for rendering
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Simple capture without too much DOM manipulation
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: false,
                logging: true, // Enable logging to see what's happening
                width: element.offsetWidth,
                height: element.offsetHeight,
            });
            
            return canvas.toDataURL('image/jpeg', 0.9);
        } catch (error) {
            console.error(`Simple capture failed for ${selector}:`, error);
            return null;
        }
    };

    // Safe chart capture with improved error handling and better rendering
    const captureChartElement = async (selector: string): Promise<string | null> => {
        try {
            const element = document.querySelector(selector) as HTMLElement;
            if (!element) {
                console.warn(`Chart element not found: ${selector}`);
                return null;
            }
            
            // Ensure element is visible and has rendered content
            if (element.offsetWidth === 0 || element.offsetHeight === 0) {
                console.warn(`Chart element has no dimensions: ${selector}`);
                return null;
            }
            
            // Verify that the chart has actual content (SVG with paths/shapes)
            const svgElement = element.querySelector('svg');
            if (!svgElement) {
                console.warn(`No SVG found in chart element: ${selector}`);
                return null;
            }
            
            const chartPaths = svgElement.querySelectorAll('path, rect, circle, line, polygon');
            if (chartPaths.length === 0) {
                console.warn(`No chart content found in SVG: ${selector}`);
                return null;
            }
            
            console.log(`Chart verification passed for ${selector}: Found ${chartPaths.length} chart elements`);
            
            // Wait for charts to fully render and any animations to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Scroll element into view to ensure it's rendered
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get actual dimensions including padding and margins
            const rect = element.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(element);
            
            // Calculate total dimensions including margins
            const marginTop = parseInt(computedStyle.marginTop) || 0;
            const marginBottom = parseInt(computedStyle.marginBottom) || 0;
            const marginLeft = parseInt(computedStyle.marginLeft) || 0;
            const marginRight = parseInt(computedStyle.marginRight) || 0;
            
            const totalWidth = Math.ceil(rect.width + marginLeft + marginRight);
            const totalHeight = Math.ceil(rect.height + marginTop + marginBottom);
            
            // Force minimum dimensions for better chart capture
            const captureWidth = Math.max(totalWidth, 2000);
            const captureHeight = Math.max(totalHeight, 1200);
            
            console.log(`Capturing ${selector}: ${captureWidth}x${captureHeight} (original: ${totalWidth}x${totalHeight})`);
            
                         const canvas = await html2canvas(element, {
                 scale: 3, // Maximum scale for highest quality and largest charts
                 backgroundColor: '#ffffff',
                 useCORS: true,
                 allowTaint: false,
                 logging: false,
                 width: captureWidth,
                 height: captureHeight,
                 scrollX: 0,
                 scrollY: 0,
                 windowWidth: window.innerWidth,
                 windowHeight: window.innerHeight,
                onclone: (clonedDoc, clonedElement) => {
                    // Fix styling issues in cloned document
                    const clonedTarget = clonedDoc.querySelector(selector) as HTMLElement;
                    if (clonedTarget) {
                        // Ensure proper sizing
                        clonedTarget.style.width = `${captureWidth}px`;
                        clonedTarget.style.height = `${captureHeight}px`;
                        clonedTarget.style.overflow = 'visible';
                        clonedTarget.style.position = 'static';
                        clonedTarget.style.transform = 'none';
                        clonedTarget.style.padding = '50px';
                        
                        // Fix any SVG elements that might be cut off
                        const svgElements = clonedTarget.querySelectorAll('svg');
                        svgElements.forEach(svg => {
                            svg.style.overflow = 'visible';
                            svg.style.width = '100%';
                            svg.style.height = '100%';
                            svg.style.minWidth = '1200px';
                            svg.style.minHeight = '600px';
                            
                            // Ensure SVG has proper viewBox
                            if (!svg.getAttribute('viewBox')) {
                                const width = svg.clientWidth || 1200;
                                const height = svg.clientHeight || 600;
                                svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
                            }
                            
                            // Make sure SVG is properly sized
                            svg.setAttribute('width', '100%');
                            svg.setAttribute('height', '100%');
                        });
                        
                        // Fix text elements that might be cut off
                        const textElements = clonedTarget.querySelectorAll('text, tspan');
                        textElements.forEach(textEl => {
                            const textElement = textEl as SVGTextElement;
                            textElement.style.fontSize = window.getComputedStyle(textElement).fontSize;
                            textElement.style.fontFamily = window.getComputedStyle(textElement).fontFamily;
                        });
                        
                                                 // Ensure chart containers have proper dimensions and fill container
                         const chartContainers = clonedTarget.querySelectorAll('.recharts-wrapper');
                         chartContainers.forEach(container => {
                             const containerEl = container as HTMLElement;
                             containerEl.style.width = '100%';
                             containerEl.style.height = '1000px';
                             containerEl.style.minHeight = '1000px';
                             containerEl.style.minWidth = '1800px';
                             containerEl.style.display = 'block';
                         });
                         
                         // Also ensure the main chart container is sized properly
                         const mainContainer = clonedTarget.querySelector('.recharts-responsive-container');
                         if (mainContainer) {
                             const mainEl = mainContainer as HTMLElement;
                             mainEl.style.width = '100%';
                             mainEl.style.height = '1000px';
                             mainEl.style.minHeight = '1000px';
                             mainEl.style.minWidth = '1800px';
                             mainEl.style.display = 'block';
                         }
                         
                         // Ensure all SVG charts fill their containers
                         const svgCharts = clonedTarget.querySelectorAll('svg');
                         svgCharts.forEach(svg => {
                             svg.style.width = '100%';
                             svg.style.height = '1000px';
                             svg.style.maxWidth = 'none';
                             svg.style.maxHeight = 'none';
                         });
                         
                         // Force recharts to use full dimensions
                         const rechartsContainers = clonedTarget.querySelectorAll('.recharts-responsive-container');
                         rechartsContainers.forEach(container => {
                             const containerEl = container as HTMLElement;
                             containerEl.style.setProperty('width', '100%', 'important');
                             containerEl.style.setProperty('height', '700px', 'important');
                             containerEl.style.setProperty('min-width', '1400px', 'important');
                             containerEl.style.setProperty('min-height', '700px', 'important');
                         });
                         
                         // Also target any chart content areas
                         const chartAreas = clonedTarget.querySelectorAll('.recharts-surface');
                         chartAreas.forEach(area => {
                             const areaEl = area as HTMLElement;
                             areaEl.style.width = '100%';
                             areaEl.style.height = '1000px';
                         });
                         
                         // Hide chart control buttons that might interfere
                         const controlButtons = clonedTarget.querySelectorAll('button, .cursor-pointer');
                         controlButtons.forEach(button => {
                             const buttonEl = button as HTMLElement;
                             buttonEl.style.display = 'none';
                         });
                         
                         // Hide chart controls section
                         const chartControls = clonedTarget.querySelectorAll('[class*="ChartControls"], .flex.items-center.justify-between');
                         chartControls.forEach(control => {
                             const controlEl = control as HTMLElement;
                             controlEl.style.display = 'none';
                         });
                         
                         // Ensure the main chart wrapper fills the space
                         const chartWrapper = clonedTarget.querySelector('.bg-white.rounded-lg.shadow');
                         if (chartWrapper) {
                             const wrapperEl = chartWrapper as HTMLElement;
                             wrapperEl.style.width = '100%';
                             wrapperEl.style.minWidth = '1400px';
                             wrapperEl.style.padding = '50px';
                         }
                         
                         // Focus on the chart content area specifically
                         const chartContentArea = clonedTarget.querySelector('[role="img"], .recharts-responsive-container');
                         if (chartContentArea) {
                             const contentEl = chartContentArea as HTMLElement;
                             contentEl.style.width = '100%';
                             contentEl.style.height = '1000px';
                             contentEl.style.minHeight = '1000px';
                         }
                    }
                },
                imageTimeout: 15000, // Increase timeout for image loading
                removeContainer: true
            });
            
            return canvas.toDataURL('image/jpeg', 0.95); // Use JPEG format for better compatibility
        } catch (error) {
            console.warn(`Error capturing chart ${selector}:`, error);
            return null;
        }
    };

    // Enhanced chart capture with retry mechanism
    const captureChartWithRetry = async (selector: string, maxRetries: number = 3): Promise<string | null> => {
        // First try the simple method
        console.log(`Attempting simple capture for ${selector}`);
        const simpleResult = await captureChartElementSimple(selector);
        if (simpleResult) {
            console.log(`Successfully captured chart with simple method: ${selector}`);
            return simpleResult;
        }
        
        // If simple method fails, try the complex method with retries
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempting complex capture for ${selector}, attempt ${attempt + 1}/${maxRetries + 1}`);
                const result = await captureChartElement(selector);
                if (result) {
                    console.log(`Successfully captured chart with complex method: ${selector}`);
                    return result;
                }
                if (attempt < maxRetries) {
                    console.log(`Retrying chart capture for ${selector}, attempt ${attempt + 2}/${maxRetries + 1}`);
                    // Wait longer between retries to allow charts to fully render
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Scroll to the element again and wait
                    const element = document.querySelector(selector);
                    if (element) {
                        element.scrollIntoView({ behavior: 'auto', block: 'center' });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } catch (error) {
                console.warn(`Attempt ${attempt + 1} failed for ${selector}:`, error);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        console.error(`Failed to capture chart after trying both methods: ${selector}`);
        return null;
    };

    const generateReport = async () => {
        setIsGenerating(true);
        
        try {
            // Show a more detailed progress indicator
            console.log('Starting report generation...');
            // Calculate all summaries
            const financialSummary = calculateFinancialSummary();
            const investmentSummary = calculateInvestmentSummary();
            const debtSummary = calculateDebtSummary();
            const netWorthData = getNetWorthData();

            // Capture charts with improved error handling and better waiting
            console.log('Capturing charts...');
            
            // Log what charts are available on the page
            const allChartElements = document.querySelectorAll('[data-chart-type]');
            console.log('Found chart elements on page:', Array.from(allChartElements).map(el => el.getAttribute('data-chart-type')));
            
            // First, ensure all charts are visible by scrolling through them
            const chartSelectors = [
                '[data-chart-type="waterfall"]',
                '[data-chart-type="savings-rate"]',
                '[data-chart-type="monthly-trend"]',
                '[data-chart-type="expense-pie"]',
                '[data-chart-type="income-pie"]'
            ];

            // Pre-process: scroll to each chart to ensure they're rendered
            for (const selector of chartSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    element.scrollIntoView({ behavior: 'auto', block: 'center' });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Check if the chart has actually rendered by looking for SVG content
                    const svgContent = element.querySelector('svg');
                    if (!svgContent) {
                        console.warn(`Chart SVG not found for ${selector}, waiting longer...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            // Wait much longer for all charts to be fully rendered and animations to complete
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Try alternative selectors if primary ones don't work
            const alternativeSelectors = [
                '.recharts-responsive-container', // Generic recharts container
                '[role="img"]', // Chart areas with role attribute
                'svg[width][height]' // Any SVG with width and height
            ];
            
            // Check if we found any charts with primary selectors
            const foundCharts = chartSelectors.filter(selector => document.querySelector(selector));
            console.log('Charts found with primary selectors:', foundCharts);
            
            // If no charts found with primary selectors, try alternatives
            let selectorsToUse = chartSelectors;
            if (foundCharts.length === 0) {
                console.log('No charts found with primary selectors, trying alternatives...');
                const alternativeFound = alternativeSelectors.filter(selector => document.querySelector(selector));
                console.log('Alternative selectors found:', alternativeFound);
                
                if (alternativeFound.length > 0) {
                    selectorsToUse = alternativeFound.slice(0, 5); // Limit to 5 charts
                } else {
                    // Last resort: try to find any chart-like elements
                    console.log('No alternatives found, searching for any chart elements...');
                    const anyCharts = Array.from(document.querySelectorAll('svg, canvas, .chart')).slice(0, 5);
                    console.log(`Found ${anyCharts.length} generic chart elements`);
                    selectorsToUse = anyCharts.map((_, index) => `svg:nth-of-type(${index + 1}), canvas:nth-of-type(${index + 1}), .chart:nth-of-type(${index + 1})`);
                }
            }

            // Now capture each chart with retry mechanism
            const chartPromises = selectorsToUse.map(selector => captureChartWithRetry(selector, 3));

            const chartCaptures = await Promise.allSettled(chartPromises);
            const [waterfallChart, savingsRateChart, monthlyTrendChart, expensePieChart, incomePieChart] = 
                chartCaptures.map(result => result.status === 'fulfilled' ? result.value : null);

            console.log('Chart capture results:', {
                waterfall: !!waterfallChart,
                savingsRate: !!savingsRateChart,
                monthlyTrend: !!monthlyTrendChart,
                expensePie: !!expensePieChart,
                incomePie: !!incomePieChart
            });

            // Log detailed results for debugging
            chartCaptures.forEach((result, index) => {
                const selectorUsed = selectorsToUse[index];
                if (result.status === 'fulfilled' && result.value) {
                    console.log(`✅ Chart ${index} (${selectorUsed}): Captured successfully (${result.value.length} chars)`);
                } else {
                    console.log(`❌ Chart ${index} (${selectorUsed}): Failed to capture`);
                    if (result.status === 'rejected') {
                        console.error(`Error for ${selectorUsed}:`, result.reason);
                    }
                }
            });

            // Sort categories for display
            const sortedExpenseCategories = Object.entries(financialSummary.expenseCategories)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);

            const sortedIncomeCategories = Object.entries(financialSummary.incomeCategories)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);

            const sortedInvestmentTypes = Object.entries(investmentSummary.investmentsByType)
                .sort(([,a], [,b]) => b.currentValue - a.currentValue);

            const sortedDebtStatuses = Object.entries(debtSummary.debtsByStatus)
                .sort(([,a], [,b]) => b.amount - a.amount);

            // Generate comprehensive HTML report
            const reportHTML = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Comprehensive Financial Report</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; 
                            line-height: 1.6;
                            color: #1f2937;
                            background-color: #f9fafb;
                            font-size: 14px;
                        }
                        
                                                 .container {
                             max-width: 2200px;
                             margin: 0 auto;
                             padding: 40px;
                         }
                        
                                                 .header { 
                             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                             color: white;
                             border-radius: 16px;
                             padding: 50px;
                             margin-bottom: 40px;
                             text-align: center;
                         }
                        
                                                 .report-title { 
                             font-size: 42px; 
                             font-weight: 700; 
                             margin-bottom: 15px;
                         }
                        
                                                 .report-subtitle { 
                             font-size: 22px;
                             opacity: 0.9;
                             margin-bottom: 8px;
                         }
                        
                                                 .section { 
                             background: white; 
                             border-radius: 16px;
                             padding: 50px; 
                             margin-bottom: 40px; 
                             box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                             page-break-inside: avoid;
                         }
                        
                                                 .section-title { 
                             font-size: 32px; 
                             font-weight: 600; 
                             color: #1f2937;
                             margin-bottom: 30px;
                             padding-bottom: 15px;
                             border-bottom: 3px solid #e5e7eb;
                         }
                        
                                                 .subsection-title {
                             font-size: 24px;
                             font-weight: 600;
                             color: #374151;
                             margin: 30px 0 20px 0;
                         }
                        
                                                 .metrics-grid {
                             display: grid;
                             grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                             gap: 35px;
                             margin-bottom: 40px;
                         }
                        
                                                 .metric-card {
                             background: #f8fafc;
                             border-radius: 12px;
                             padding: 35px;
                             text-align: center;
                             min-height: 180px;
                             display: flex;
                             flex-direction: column;
                             justify-content: center;
                         }
                        
                                                 .metric-label {
                             font-size: 16px;
                             font-weight: 500;
                             color: #6b7280;
                             text-transform: uppercase;
                             letter-spacing: 0.5px;
                             margin-bottom: 12px;
                         }
                        
                                                 .metric-value {
                             font-size: 36px;
                             font-weight: 700;
                             color: #1f2937;
                             margin-bottom: 8px;
                         }
                        
                                                 .metric-change {
                             font-size: 16px;
                             font-weight: 500;
                         }
                        
                        .positive { color: #10b981; }
                        .negative { color: #ef4444; }
                        .neutral { color: #6b7280; }
                        
                                                 .category-grid {
                             display: grid;
                             grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
                             gap: 30px;
                             margin: 30px 0;
                         }
                        
                                                 .category-item {
                             background: #f8fafc;
                             border-radius: 12px;
                             padding: 25px;
                             border-left: 6px solid #3b82f6;
                             min-height: 120px;
                             display: flex;
                             flex-direction: column;
                             justify-content: center;
                         }
                        
                                                 .category-name {
                             font-weight: 500;
                             color: #374151;
                             margin-bottom: 8px;
                             font-size: 18px;
                         }
                        
                                                 .category-amount {
                             font-size: 24px;
                             font-weight: 600;
                             margin-bottom: 6px;
                         }
                        
                                                 .category-percentage {
                             font-size: 16px;
                             color: #6b7280;
                         }
                        
                                                 .chart-container {
                             text-align: center;
                             margin: 40px 0;
                             padding: 20px;
                             background: #f8fafc;
                             border-radius: 16px;
                             border: 1px solid #e5e7eb;
                             min-height: 900px;
                             display: flex;
                             flex-direction: column;
                             justify-content: center;
                         }
                        
                                                 .chart-title {
                             font-size: 28px;
                             font-weight: 600;
                             color: #374151;
                             margin-bottom: 30px;
                         }
                        
                                                 .chart-image {
                             width: 100%;
                             height: 850px;
                             max-width: none;
                             max-height: none;
                             border-radius: 12px;
                             box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                             display: block;
                             margin: 0 auto;
                             object-fit: contain;
                             image-rendering: -webkit-optimize-contrast;
                             image-rendering: crisp-edges;
                         }
                        
                                                 .chart-placeholder {
                             background: #f3f4f6;
                             border: 3px dashed #d1d5db;
                             border-radius: 12px;
                             padding: 80px;
                             color: #6b7280;
                             font-style: italic;
                             text-align: center;
                             min-height: 600px;
                             display: flex;
                             align-items: center;
                             justify-content: center;
                             flex-direction: column;
                             font-size: 20px;
                         }
                         
                         .chart-placeholder::before {
                             content: "📊";
                             font-size: 48px;
                             margin-bottom: 20px;
                             display: block;
                         }
                        
                                                 .summary-table {
                             width: 100%;
                             border-collapse: collapse;
                             margin: 25px 0;
                             font-size: 18px;
                         }
                         
                         .summary-table th,
                         .summary-table td {
                             padding: 20px;
                             text-align: left;
                             border-bottom: 2px solid #e5e7eb;
                         }
                         
                         .summary-table th {
                             background-color: #f9fafb;
                             font-weight: 600;
                             color: #374151;
                             font-size: 20px;
                         }
                        
                                                 .footer { 
                             margin-top: 60px; 
                             padding: 40px;
                             background: #f9fafb;
                             border-radius: 16px;
                             text-align: center; 
                             color: #6b7280; 
                             font-size: 18px;
                             line-height: 1.8;
                         }
                        
                                                 .two-column {
                             display: grid;
                             grid-template-columns: 1fr 1fr;
                             gap: 50px;
                         }
                        
                        @media print {
                            body { 
                                background: white;
                                font-size: 12px;
                            }
                            .container {
                                padding: 10px;
                            }
                            .section { 
                                page-break-inside: avoid;
                                box-shadow: none;
                                border: 1px solid #e5e7eb;
                            }
                            .chart-container {
                                page-break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <!-- Header -->
                        <div class="header">
                            <h1 class="report-title">Comprehensive Financial Report</h1>
                            <div class="report-subtitle">Prepared for: ${session?.user?.name || 'User'}</div>
                            <div class="report-subtitle">Report Period: ${getDateRangeText()}</div>
                            <div class="report-subtitle">Generated on: ${new Date().toLocaleDateString('en-US', { 
                                year: 'numeric', month: 'long', day: 'numeric', 
                                hour: '2-digit', minute: '2-digit'
                            })}</div>
                        </div>

                        <!-- Executive Summary -->
                        <div class="section">
                            <h2 class="section-title">Executive Summary</h2>
                            <div class="metrics-grid">
                                <div class="metric-card">
                                    <div class="metric-label">Net Worth</div>
                                    <div class="metric-value">${formatCurrency(netWorthData.totalNetWorth)}</div>
                                    <div class="metric-change ${netWorthData.monthlyGrowthRate >= 0 ? 'positive' : 'negative'}">
                                        ${formatPercentage(netWorthData.monthlyGrowthRate)} monthly growth
                                    </div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Total Income</div>
                                    <div class="metric-value positive">${formatCurrency(financialSummary.totalIncome)}</div>
                                    <div class="metric-change neutral">${incomes.length} transactions</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Total Expenses</div>
                                    <div class="metric-value negative">${formatCurrency(financialSummary.totalExpenses)}</div>
                                    <div class="metric-change neutral">${expenses.length} transactions</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Net Savings</div>
                                    <div class="metric-value ${financialSummary.netIncome >= 0 ? 'positive' : 'negative'}">
                                        ${formatCurrency(financialSummary.netIncome)}
                                    </div>
                                    <div class="metric-change ${financialSummary.savingsRate >= 0 ? 'positive' : 'negative'}">
                                        ${formatPercentage(financialSummary.savingsRate)} savings rate
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Net Worth Analysis -->
                        <div class="section">
                            <h2 class="section-title">Net Worth Analysis</h2>
                            <div class="metrics-grid">
                                <div class="metric-card">
                                    <div class="metric-label">Total Assets</div>
                                    <div class="metric-value">${formatCurrency(netWorthData.totalAssets)}</div>
                                    <div class="metric-change neutral">All asset classes</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Bank Accounts</div>
                                    <div class="metric-value">${formatCurrency(netWorthData.totalAccountBalance)}</div>
                                    <div class="metric-change neutral">${formatPercentage(netWorthData.liquidityRatio)} liquidity</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Investments</div>
                                    <div class="metric-value">${formatCurrency(netWorthData.totalInvestmentValue)}</div>
                                    <div class="metric-change neutral">${formatPercentage(netWorthData.investmentAllocation)} allocation</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Money Lent</div>
                                    <div class="metric-value">${formatCurrency(netWorthData.totalMoneyLent)}</div>
                                    <div class="metric-change neutral">Outstanding debt</div>
                                </div>
                            </div>
                        </div>

                        <!-- Investment Portfolio -->
                        <div class="section">
                            <h2 class="section-title">Investment Portfolio</h2>
                            <div class="metrics-grid">
                                <div class="metric-card">
                                    <div class="metric-label">Total Invested</div>
                                    <div class="metric-value">${formatCurrency(investmentSummary.totalInvested)}</div>
                                    <div class="metric-change neutral">Principal amount</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Current Value</div>
                                    <div class="metric-value">${formatCurrency(investmentSummary.totalCurrentValue)}</div>
                                    <div class="metric-change neutral">Market value</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Total Gain/Loss</div>
                                    <div class="metric-value ${investmentSummary.totalGainLoss >= 0 ? 'positive' : 'negative'}">
                                        ${formatCurrency(investmentSummary.totalGainLoss)}
                                    </div>
                                    <div class="metric-change ${investmentSummary.totalGainLossPercentage >= 0 ? 'positive' : 'negative'}">
                                        ${formatPercentage(investmentSummary.totalGainLossPercentage)}
                                    </div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Performance</div>
                                    <div class="metric-value">${investmentSummary.performanceMetrics.gainersCount}</div>
                                    <div class="metric-change positive">winners vs ${investmentSummary.performanceMetrics.losersCount} losers</div>
                                </div>
                            </div>

                            ${sortedInvestmentTypes.length > 0 ? `
                                <h3 class="subsection-title">Investment Breakdown by Type</h3>
                                <div class="category-grid">
                                    ${sortedInvestmentTypes.map(([type, data]) => `
                                        <div class="category-item">
                                            <div class="category-name">${type.replace('_', ' ')}</div>
                                            <div class="category-amount ${data.currentValue - data.invested >= 0 ? 'positive' : 'negative'}">
                                                ${formatCurrency(data.currentValue)}
                                            </div>
                                            <div class="category-percentage">
                                                ${data.count} positions • ${formatCurrency(data.currentValue - data.invested)} P&L
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>

                        <!-- Lending Portfolio -->
                        <div class="section">
                            <h2 class="section-title">Lending Portfolio</h2>
                            <div class="metrics-grid">
                                <div class="metric-card">
                                    <div class="metric-label">Total Lent</div>
                                    <div class="metric-value">${formatCurrency(debtSummary.totalLent)}</div>
                                    <div class="metric-change neutral">Principal amount</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Amount Repaid</div>
                                    <div class="metric-value positive">${formatCurrency(debtSummary.totalRepaid)}</div>
                                    <div class="metric-change neutral">Received back</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Outstanding</div>
                                    <div class="metric-value">${formatCurrency(debtSummary.totalRemaining)}</div>
                                    <div class="metric-change neutral">Still owed</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Avg Interest Rate</div>
                                    <div class="metric-value">${debtSummary.averageInterestRate.toFixed(1)}%</div>
                                    <div class="metric-change positive">${formatCurrency(debtSummary.totalInterestEarned)} earned</div>
                                </div>
                            </div>

                            ${sortedDebtStatuses.length > 0 ? `
                                <h3 class="subsection-title">Lending Status Breakdown</h3>
                                <div class="category-grid">
                                    ${sortedDebtStatuses.map(([status, data]) => `
                                        <div class="category-item">
                                            <div class="category-name">${status.replace('_', ' ')}</div>
                                            <div class="category-amount">${formatCurrency(data.amount)}</div>
                                            <div class="category-percentage">${data.count} loans</div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>

                        <!-- Income & Expense Analysis -->
                        <div class="section">
                            <h2 class="section-title">Income & Expense Analysis</h2>
                            
                            <div class="two-column">
                                <div>
                                    <h3 class="subsection-title">Top Expense Categories</h3>
                                    <div class="category-grid">
                                        ${sortedExpenseCategories.slice(0, 6).map(([category, amount]) => `
                                            <div class="category-item">
                                                <div class="category-name">${category}</div>
                                                <div class="category-amount negative">${formatCurrency(amount)}</div>
                                                <div class="category-percentage">
                                                    ${financialSummary.totalExpenses > 0 ? ((amount / financialSummary.totalExpenses) * 100).toFixed(1) : '0.0'}% of expenses
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>

                                <div>
                                    <h3 class="subsection-title">Top Income Sources</h3>
                                    <div class="category-grid">
                                        ${sortedIncomeCategories.slice(0, 6).map(([category, amount]) => `
                                            <div class="category-item">
                                                <div class="category-name">${category}</div>
                                                <div class="category-amount positive">${formatCurrency(amount)}</div>
                                                <div class="category-percentage">
                                                    ${financialSummary.totalIncome > 0 ? ((amount / financialSummary.totalIncome) * 100).toFixed(1) : '0.0'}% of income
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Visual Charts -->
                        ${waterfallChart || savingsRateChart || monthlyTrendChart ? `
                            <div class="section">
                                <h2 class="section-title">Financial Trends & Visualizations</h2>
                                
                                                                 ${waterfallChart ? `
                                     <div class="chart-container">
                                         <img src="${waterfallChart}" alt="Financial Waterfall Chart" class="chart-image" />
                                     </div>
                                 ` : `
                                     <div class="chart-container">
                                         <div class="chart-title">Financial Waterfall</div>
                                         <div class="chart-placeholder">Chart visualization temporarily unavailable</div>
                                     </div>
                                 `}

                                                                 ${savingsRateChart ? `
                                     <div class="chart-container">
                                         <img src="${savingsRateChart}" alt="Savings Rate Chart" class="chart-image" />
                                     </div>
                                 ` : `
                                     <div class="chart-container">
                                         <div class="chart-title">Savings Rate Trend</div>
                                         <div class="chart-placeholder">Chart visualization temporarily unavailable</div>
                                     </div>
                                 `}

                                                                 ${monthlyTrendChart ? `
                                     <div class="chart-container">
                                         <img src="${monthlyTrendChart}" alt="Monthly Trend Chart" class="chart-image" />
                                     </div>
                                 ` : `
                                     <div class="chart-container">
                                         <div class="chart-title">Monthly Financial Trends</div>
                                         <div class="chart-placeholder">Chart visualization temporarily unavailable</div>
                                     </div>
                                 `}

                                <div class="two-column">
                                                                         ${expensePieChart ? `
                                         <div class="chart-container">
                                             <img src="${expensePieChart}" alt="Expense Distribution" class="chart-image" />
                                         </div>
                                     ` : `
                                         <div class="chart-container">
                                             <div class="chart-title">Expense Distribution</div>
                                             <div class="chart-placeholder">Chart visualization temporarily unavailable</div>
                                         </div>
                                     `}

                                     ${incomePieChart ? `
                                         <div class="chart-container">
                                             <img src="${incomePieChart}" alt="Income Distribution" class="chart-image" />
                                         </div>
                                     ` : `
                                         <div class="chart-container">
                                             <div class="chart-title">Income Distribution</div>
                                             <div class="chart-placeholder">Chart visualization temporarily unavailable</div>
                                         </div>
                                     `}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Financial Health Summary -->
                        <div class="section">
                            <h2 class="section-title">Financial Health Assessment</h2>
                            
                            <table class="summary-table">
                                <thead>
                                    <tr>
                                        <th>Metric</th>
                                        <th>Value</th>
                                        <th>Assessment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Savings Rate</td>
                                        <td class="${financialSummary.savingsRate >= 0 ? 'positive' : 'negative'}">
                                            ${formatPercentage(financialSummary.savingsRate)}
                                        </td>
                                        <td>
                                            ${financialSummary.savingsRate >= 20 ? 'Excellent' : 
                                              financialSummary.savingsRate >= 10 ? 'Good' : 
                                              financialSummary.savingsRate >= 0 ? 'Fair' : 'Needs Improvement'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Investment Allocation</td>
                                        <td>${formatPercentage(netWorthData.investmentAllocation)}</td>
                                        <td>
                                            ${netWorthData.investmentAllocation >= 20 ? 'Well Diversified' : 
                                              netWorthData.investmentAllocation >= 10 ? 'Moderate' : 'Conservative'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Liquidity Ratio</td>
                                        <td>${formatPercentage(netWorthData.liquidityRatio)}</td>
                                        <td>
                                            ${netWorthData.liquidityRatio >= 50 ? 'High Liquidity' : 
                                              netWorthData.liquidityRatio >= 30 ? 'Adequate' : 'Low Liquidity'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Investment Performance</td>
                                        <td class="${investmentSummary.totalGainLossPercentage >= 0 ? 'positive' : 'negative'}">
                                            ${formatPercentage(investmentSummary.totalGainLossPercentage)}
                                        </td>
                                        <td>
                                            ${investmentSummary.totalGainLossPercentage >= 10 ? 'Strong Performance' : 
                                              investmentSummary.totalGainLossPercentage >= 0 ? 'Positive Growth' : 'Needs Review'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Footer -->
                        <div class="footer">
                            <div><strong>Comprehensive Financial Report</strong></div>
                            <div>Generated by Financial Dashboard • ${new Date().toLocaleString()}</div>
                            <div>
                                Report Period: ${getDateRangeText()} • 
                                ${incomes.length + expenses.length} transactions • 
                                ${investmentData.investments?.length || 0} investments • 
                                ${debtData.debts?.length || 0} lendings
                            </div>
                            <div style="margin-top: 10px; font-style: italic;">
                                This report provides a comprehensive overview of your financial position. 
                                Please consult with a financial advisor for investment decisions.
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Create and download the report
            const blob = new Blob([reportHTML], { type: 'text/html;charset=utf-8' });
            const link = document.createElement('a');
            const dateRange = getDateRangeText().replace(/\s+/g, '-').toLowerCase();
            const fileName = `comprehensive-financial-report-${dateRange}-${new Date().toISOString().split('T')[0]}.html`;
            
            link.download = fileName;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            console.log('Report generated successfully');

        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <button
                onClick={generateReport}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <FileText size={15} />
                        Generate Report
                    </>
                )}
            </button>
        </div>
    );
} 