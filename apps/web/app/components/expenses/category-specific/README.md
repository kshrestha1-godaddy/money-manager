# Category-Specific Expense Fields

This feature adds dynamic, category-specific input fields to the expense creation modal without changing the database schema. The additional details are automatically converted into structured notes.

## Supported Categories

### ⚡ Electricity
When "Electricity" category is selected, additional fields appear:
- **Previous Units**: Previous meter reading
- **Current Units**: Current meter reading  
- **Rate per Unit**: Cost per unit (₹)
- **Connection Type**: Domestic/Commercial/Industrial
- **Meter Number**: Electricity meter number

**Auto-generated Notes Example:**
```
Previous Units: 1250, Current Units: 1350, Units Consumed: 100, Rate per Unit: ₹8.50, Connection Type: Domestic, Meter Number: EB12345678
```

### 🏅 Gold
When "Gold" category is selected, additional fields appear:
- **Weight**: Weight in grams
- **Purity**: 24K, 22K, 21K, 18K, 14K options
- **Rate per Gram**: Current gold rate (₹)
- **Making Charges**: Additional charges (₹)
- **Item Type**: Ring, Necklace, Earrings, etc.
- **Jeweler Name**: Store/jeweler name
- **Hallmark Number**: BIS hallmark number

**Auto-generated Notes Example:**
```
Weight: 10.50g, Purity: 22K (91.6%), Rate per Gram: ₹6250, Gold Value: ₹65625.00, Making Charges: ₹5000, Item Type: Ring, Jeweler: Tanishq, Hallmark No: BIS123456
```

## Notes Editing Feature

The notes field in category-specific expenses is now fully editable:

- **Auto-Generation**: Notes are initially generated from the category-specific fields
- **Manual Editing**: Users can modify the auto-generated notes as needed
- **Visual Indicator**: Category-specific forms show a light blue background to indicate auto-generation
- **Regenerate Button**: Click "Regenerate from details" to restore auto-generated content
- **Flexible Use**: Perfect for adding custom remarks while keeping structured data

**Example Use Cases:**
- Add payment method: "Weight: 10.50g, Purity: 22K, Rate: ₹6250 - Paid via Credit Card"
- Include additional details: "Previous: 1250, Current: 1350, Units: 100 - Includes security deposit"
- Personal notes: "Gold Value: ₹65625 - Anniversary gift for spouse"

## How It Works

1. **Category Selection**: When user selects a supported category, category-specific fields appear
2. **Auto-calculation**: Fields automatically calculate derived values (units consumed, gold value, etc.)
3. **Auto-notes**: All entered data is automatically formatted into the Notes field
4. **Editable Notes**: Users can manually edit auto-generated notes as needed
5. **Regenerate Option**: "Regenerate from details" button allows users to restore auto-generated notes
6. **Reset on Change**: Changing to a different category clears category-specific data

## Technical Implementation

- No database schema changes required
- Uses existing `notes` field to store structured information
- Component-based architecture for easy extension
- TypeScript interfaces for type safety
- Real-time calculations and updates

## Adding New Categories

To add a new category:

1. Create a new component in `category-specific/` folder
2. Define data interface and props
3. Implement auto-note generation logic
4. Add to `index.ts` exports
5. Update `ExpenseForm.tsx` to include the new category
6. Add category name check in the form logic

## Benefits

- **Rich Data Capture**: Collect detailed, category-specific information
- **No Schema Changes**: Works with existing database structure
- **Structured Notes**: Consistent formatting for easy parsing
- **Better UX**: Guided input fields for specific expense types
- **Calculations**: Automatic calculations reduce errors
- **Scalable**: Easy to add new categories 