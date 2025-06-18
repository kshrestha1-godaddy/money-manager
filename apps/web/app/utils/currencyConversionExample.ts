/**
 * Example usage of the Currency Conversion Utility
 * This file demonstrates how to use the currency conversion functions
 */

import { 
  convertCurrency, 
  convertCurrencyFormatted, 
  getAvailableCurrencies,
  clearCurrencyCache,
  getCacheStatus 
} from './currencyConversion';

/**
 * Example function demonstrating basic currency conversion
 */
export async function basicConversionExample() {
  try {
    // Convert 100 USD to EUR
    const usdToEur = await convertCurrency(100, 'usd', 'eur');
    console.log(`100 USD = ${usdToEur} EUR`);

    // Convert 1000 NPR to USD
    const nprToUsd = await convertCurrency(1000, 'npr', 'usd');
    console.log(`1000 NPR = ${nprToUsd} USD`);

    // Convert 50 EUR to GBP
    const eurToGbp = await convertCurrency(50, 'eur', 'gbp');
    console.log(`50 EUR = ${eurToGbp} GBP`);

  } catch (error) {
    console.error('Conversion failed:', error);
  }
}

/**
 * Example function demonstrating formatted currency conversion
 */
export async function formattedConversionExample() {
  try {
    // Convert with currency symbol
    const formattedWithSymbol = await convertCurrencyFormatted(
      100, 
      'usd', 
      'eur', 
      { 
        decimals: 2, 
        includeSymbol: true, 
        locale: 'en-US' 
      }
    );
    console.log(`100 USD formatted: ${formattedWithSymbol}`);

    // Convert without currency symbol
    const formattedWithoutSymbol = await convertCurrencyFormatted(
      100, 
      'usd', 
      'eur', 
      { 
        decimals: 4, 
        includeSymbol: false 
      }
    );
    console.log(`100 USD to EUR (4 decimals): ${formattedWithoutSymbol}`);

    // Convert with different locale
    const formattedEuropean = await convertCurrencyFormatted(
      100, 
      'usd', 
      'eur', 
      { 
        decimals: 2, 
        includeSymbol: true, 
        locale: 'de-DE' 
      }
    );
    console.log(`100 USD formatted (German locale): ${formattedEuropean}`);

  } catch (error) {
    console.error('Formatted conversion failed:', error);
  }
}

/**
 * Example function demonstrating available currencies
 */
export async function availableCurrenciesExample() {
  try {
    // Get all available currencies
    const currencies = await getAvailableCurrencies('usd');
    console.log(`Available currencies (${currencies.length}):`, currencies.slice(0, 10), '...');

    // Check if specific currencies are supported
    const supportedCurrencies = ['usd', 'eur', 'gbp', 'jpy', 'npr', 'inr'];
    supportedCurrencies.forEach(currency => {
      const isSupported = currencies.includes(currency);
      console.log(`${currency.toUpperCase()}: ${isSupported ? '✅ Supported' : '❌ Not supported'}`);
    });

  } catch (error) {
    console.error('Failed to get available currencies:', error);
  }
}

/**
 * Example function demonstrating cache management
 */
export async function cacheManagementExample() {
  try {
    console.log('Initial cache status:', getCacheStatus());

    // Perform some conversions to populate cache
    await convertCurrency(100, 'usd', 'eur');
    await convertCurrency(100, 'eur', 'gbp');
    
    console.log('Cache after conversions:', getCacheStatus());

    // Clear cache
    clearCurrencyCache();
    console.log('Cache after clearing:', getCacheStatus());

  } catch (error) {
    console.error('Cache management failed:', error);
  }
}

/**
 * Example function for real-world usage scenarios
 */
export async function realWorldUsageExample() {
  try {
    // E-commerce price conversion
    const productPriceUSD = 29.99;
    const priceInEUR = await convertCurrencyFormatted(productPriceUSD, 'usd', 'eur');
    const priceInGBP = await convertCurrencyFormatted(productPriceUSD, 'usd', 'gbp');
    const priceInNPR = await convertCurrencyFormatted(productPriceUSD, 'usd', 'npr');
    
    console.log('Product Price Conversions:');
    console.log(`Original: $${productPriceUSD} USD`);
    console.log(`EUR: ${priceInEUR}`);
    console.log(`GBP: ${priceInGBP}`);
    console.log(`NPR: ${priceInNPR}`);

    // Financial reporting - convert multiple amounts
    const expenses = [
      { description: 'Office Rent', amount: 2000, currency: 'usd' },
      { description: 'Software License', amount: 500, currency: 'eur' },
      { description: 'Marketing', amount: 800, currency: 'gbp' },
    ];

    console.log('\nExpense Report (converted to USD):');
    let totalUSD = 0;
    
    for (const expense of expenses) {
      const amountInUSD = await convertCurrency(expense.amount, expense.currency, 'usd');
      totalUSD += amountInUSD;
      
      console.log(`${expense.description}: ${expense.amount} ${expense.currency.toUpperCase()} = $${amountInUSD.toFixed(2)} USD`);
    }
    
    console.log(`Total: $${totalUSD.toFixed(2)} USD`);

  } catch (error) {
    console.error('Real-world usage example failed:', error);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('=== Currency Conversion Utility Examples ===\n');
  
  console.log('1. Basic Conversion:');
  await basicConversionExample();
  
  console.log('\n2. Formatted Conversion:');
  await formattedConversionExample();
  
  console.log('\n3. Available Currencies:');
  await availableCurrenciesExample();
  
  console.log('\n4. Cache Management:');
  await cacheManagementExample();
  
  console.log('\n5. Real-world Usage:');
  await realWorldUsageExample();
} 