import { parseCSV } from './csvUtils';

export interface ParsedInvestmentTargetData {
    investmentType: 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'FIXED_DEPOSIT' | 'PROVIDENT_FUNDS' | 'SAFE_KEEPINGS' | 'EMERGENCY_FUND' | 'MARRIAGE' | 'VACATION' | 'OTHER';
    targetAmount: number;
    targetCompletionDate?: Date;
    nickname?: string;
}

export interface ImportResult {
    success: boolean;
    importedCount: number;
    errors: Array<{ row: number; error: string }>;
    skippedCount: number;
    data?: ParsedInvestmentTargetData[];
}

/**
 * Parse investment targets CSV content
 */
export function parseInvestmentTargetsCSV(csvContent: string): ImportResult {
    try {
        const rows = parseCSV(csvContent);
        
        if (rows.length < 2) {
            return {
                success: false,
                importedCount: 0,
                errors: [{ row: 1, error: "CSV must contain at least a header row and one data row" }],
                skippedCount: 0
            };
        }

        const headers = rows[0].map(h => h.toLowerCase().trim());
        const dataRows = rows.slice(1);
        
        // Required headers
        const requiredHeaders = ['investment type', 'target amount'];
        const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
        
        if (missingHeaders.length > 0) {
            return {
                success: false,
                importedCount: 0,
                errors: [{ row: 1, error: `Missing required columns: ${missingHeaders.join(', ')}` }],
                skippedCount: 0
            };
        }

        // Get column indices
        const investmentTypeIndex = headers.indexOf('investment type');
        const targetAmountIndex = headers.indexOf('target amount');
        const targetDateIndex = headers.indexOf('target completion date');
        const nicknameIndex = headers.indexOf('nickname');

        const validTargets: ParsedInvestmentTargetData[] = [];
        const errors: Array<{ row: number; error: string }> = [];

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowNumber = i + 2; // Account for header row and 0-based index

            try {
                // Validate investment type
                const investmentTypeRaw = row[investmentTypeIndex]?.trim();
                if (!investmentTypeRaw) {
                    errors.push({ row: rowNumber, error: "Investment type is required" });
                    continue;
                }

                // Normalize investment type
                const investmentType = normalizeInvestmentType(investmentTypeRaw);
                if (!investmentType) {
                    errors.push({ 
                        row: rowNumber, 
                        error: `Invalid investment type: ${investmentTypeRaw}. Valid types: STOCKS, CRYPTO, MUTUAL_FUNDS, BONDS, REAL_ESTATE, GOLD, FIXED_DEPOSIT, PROVIDENT_FUNDS, SAFE_KEEPINGS, EMERGENCY_FUND, MARRIAGE, VACATION, OTHER` 
                    });
                    continue;
                }

                // Validate target amount
                const targetAmountRaw = row[targetAmountIndex]?.trim();
                if (!targetAmountRaw) {
                    errors.push({ row: rowNumber, error: "Target amount is required" });
                    continue;
                }

                const targetAmount = parseFloat(targetAmountRaw);
                if (isNaN(targetAmount) || targetAmount <= 0) {
                    errors.push({ row: rowNumber, error: `Invalid target amount: ${targetAmountRaw}. Must be a positive number` });
                    continue;
                }

                // Parse optional target completion date
                let targetCompletionDate: Date | undefined;
                if (targetDateIndex >= 0 && row[targetDateIndex]?.trim()) {
                    const dateStr = row[targetDateIndex].trim();
                    const parsedDate = new Date(dateStr);
                    if (isNaN(parsedDate.getTime())) {
                        errors.push({ row: rowNumber, error: `Invalid target completion date: ${dateStr}. Use YYYY-MM-DD format` });
                        continue;
                    }
                    targetCompletionDate = parsedDate;
                }

                // Get optional nickname
                const nickname = nicknameIndex >= 0 ? row[nicknameIndex]?.trim() || undefined : undefined;

                validTargets.push({
                    investmentType,
                    targetAmount,
                    targetCompletionDate,
                    nickname
                });

            } catch (error) {
                errors.push({ 
                    row: rowNumber, 
                    error: error instanceof Error ? error.message : 'Unknown error processing row' 
                });
            }
        }

        return {
            success: validTargets.length > 0,
            importedCount: validTargets.length,
            errors,
            skippedCount: errors.length,
            data: validTargets
        };

    } catch (error) {
        return {
            success: false,
            importedCount: 0,
            errors: [{ row: 1, error: `Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}` }],
            skippedCount: 0
        };
    }
}

/**
 * Normalize investment type string to valid enum value
 */
function normalizeInvestmentType(type: string): ParsedInvestmentTargetData['investmentType'] | null {
    const normalized = type.toUpperCase().replace(/[^A-Z]/g, '_');
    
    const typeMap: Record<string, ParsedInvestmentTargetData['investmentType']> = {
        'STOCKS': 'STOCKS',
        'STOCK': 'STOCKS',
        'EQUITY': 'STOCKS',
        'SHARES': 'STOCKS',
        'CRYPTO': 'CRYPTO',
        'CRYPTOCURRENCY': 'CRYPTO',
        'BITCOIN': 'CRYPTO',
        'MUTUAL_FUNDS': 'MUTUAL_FUNDS',
        'MUTUAL_FUND': 'MUTUAL_FUNDS',
        'MF': 'MUTUAL_FUNDS',
        'BONDS': 'BONDS',
        'BOND': 'BONDS',
        'TREASURY': 'BONDS',
        'REAL_ESTATE': 'REAL_ESTATE',
        'REAL_ESTATE': 'REAL_ESTATE',
        'PROPERTY': 'REAL_ESTATE',
        'REALTY': 'REAL_ESTATE',
        'GOLD': 'GOLD',
        'PRECIOUS_METALS': 'GOLD',
        'FIXED_DEPOSIT': 'FIXED_DEPOSIT',
        'FD': 'FIXED_DEPOSIT',
        'DEPOSIT': 'FIXED_DEPOSIT',
        'PROVIDENT_FUNDS': 'PROVIDENT_FUNDS',
        'PROVIDENT_FUND': 'PROVIDENT_FUNDS',
        'PF': 'PROVIDENT_FUNDS',
        'SAFE_KEEPINGS': 'SAFE_KEEPINGS',
        'SAFE_KEEPING': 'SAFE_KEEPINGS',
        'SAVINGS': 'SAFE_KEEPINGS',
        'EMERGENCY_FUND': 'EMERGENCY_FUND',
        'EMERGENCY': 'EMERGENCY_FUND',
        'MARRIAGE': 'MARRIAGE',
        'WEDDING': 'MARRIAGE',
        'VACATION': 'VACATION',
        'TRAVEL': 'VACATION',
        'HOLIDAY': 'VACATION',
        'OTHER': 'OTHER'
    };

    return typeMap[normalized] || null;
}

/**
 * Download investment targets import template
 */
export function downloadInvestmentTargetsImportTemplate(): void {
    const headers = [
        'Investment Type',
        'Target Amount',
        'Target Completion Date',
        'Nickname'
    ];

    const sampleData = [
        ['STOCKS', '50000', '2024-12-31', 'Retirement Portfolio'],
        ['CRYPTO', '10000', '2025-06-30', 'Digital Assets'],
        ['REAL_ESTATE', '200000', '2026-01-01', 'Property Investment'],
        ['EMERGENCY_FUND', '25000', '', 'Emergency Savings']
    ];

    const csvContent = [headers, ...sampleData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'investment_targets_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
