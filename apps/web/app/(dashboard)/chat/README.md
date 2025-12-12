# Financial Data Chat Integration

This feature allows users to include their financial data (income and expenses) as context in chat conversations with the AI assistant. The AI can then analyze the data and provide insights, answer questions, and give personalized financial advice.

## How It Works

### 1. **Financial Data Selection**
- Users can click the chart/analytics button in the chat input area
- A modal opens allowing them to select:
  - Date range (presets like "Last Month", "This Quarter", or custom range)
  - Data types (Income, Expenses, or both)
  - All amounts are converted to the user's preferred currency

### 2. **Data Processing**
- The system fetches financial transactions for the selected period
- Data is formatted into markdown tables with:
  - Transaction details (date, title, category, account, amount, tags, notes)
  - Summary statistics (total income, expenses, net amount)
  - Category breakdowns
- A comprehensive financial context is created for the AI

### 3. **AI Integration**
- Financial data is sent as a system message to OpenAI
- The AI receives structured financial information and can:
  - Analyze spending patterns
  - Identify trends and insights
  - Provide budgeting advice
  - Answer specific questions about transactions
  - Compare income vs expenses
  - Suggest optimizations

## Example Use Cases

### Sample Questions Users Can Ask:

1. **Performance Analysis**
   - "Summarize my financial performance for last month"
   - "What are my top spending categories?"
   - "How does my income compare to my expenses?"

2. **Trend Analysis**
   - "Which categories am I spending the most on?"
   - "Are there any unusual transactions I should review?"
   - "What's my average daily spending?"

3. **Budgeting Advice**
   - "Where can I cut expenses to save more money?"
   - "Is my spending pattern healthy?"
   - "What percentage of my income goes to each category?"

4. **Specific Insights**
   - "How much did I spend on dining out?"
   - "What was my largest expense this month?"
   - "Which account do I use most for expenses?"

## Technical Implementation

### Backend Components

1. **Financial Data Action** (`financial-data.ts`)
   - `getFinancialDataForChat()` - Fetches and formats financial data
   - `formatFinancialDataAsMarkdown()` - Converts data to AI-readable format
   - `getDateRangePresets()` - Provides common date range options

2. **Chat API Enhancement** (`/api/chat/stream/route.ts`)
   - Accepts optional `financialContext` parameter
   - Injects financial data as system message to OpenAI
   - Maintains existing streaming functionality

### Frontend Components

1. **FinancialDataSelector** (`FinancialDataSelector.tsx`)
   - Modal interface for selecting financial data parameters
   - Date range selection (presets + custom)
   - Data type checkboxes (income/expenses)
   - Currency display information

2. **Chat Page Integration** (`page.tsx`)
   - Financial data button in input area
   - Context banner showing active financial data
   - Integration with existing chat flow

## Data Format Example

The AI receives financial data in this structured format:

```markdown
# Financial Data Summary

## Summary for Oct 1, 2024 to Oct 31, 2024
- **Total Income**: $5,200.00 USD
- **Total Expenses**: $3,850.00 USD
- **Net Amount**: $1,350.00 USD
- **Total Transactions**: 47
- **Currency**: USD

## Income Transactions (12 items)
| Date | Title | Category | Account | Amount | Tags | Notes |
|------|-------|----------|---------|---------|------|-------|
| 2024-10-31 | Salary | Employment | Chase Checking | $4,500.00 USD | salary, monthly | Regular monthly salary |
| 2024-10-15 | Freelance Project | Freelance | PayPal | $700.00 USD | freelance, web-dev | Website development project |

## Expense Transactions (35 items)
| Date | Title | Category | Account | Amount | Tags | Notes |
|------|-------|----------|---------|---------|------|-------|
| 2024-10-30 | Grocery Shopping | Food & Dining | Chase Checking | $127.50 USD | groceries, weekly | Weekly grocery run |
| 2024-10-29 | Gas Station | Transportation | Chase Checking | $45.20 USD | gas, commute | Fill up for the week |

## Category Breakdown

### Income by Category
- **Employment**: $4,500.00 USD
- **Freelance**: $700.00 USD

### Expenses by Category
- **Food & Dining**: $890.00 USD
- **Transportation**: $320.00 USD
- **Utilities**: $280.00 USD
- **Entertainment**: $180.00 USD
```

## Security & Privacy

- Financial data is only sent when explicitly requested by the user
- Data is processed server-side and not stored in chat history
- Each request requires fresh authentication
- Users can clear financial context at any time
- Data is converted to user's preferred currency for consistency

## Future Enhancements

Potential improvements could include:
- Investment data integration
- Budget comparison features
- Goal tracking integration
- Multi-period comparisons
- Export capabilities for AI-generated insights
