// Color configuration for dashboard pages
// Centralized color schemes for consistent theming across all pages

export const COLORS = {
  // Common UI colors
  common: {
    // Primary brand colors
    primary: {
      blue: {
        50: 'bg-blue-50',
        100: 'bg-blue-100',
        500: 'bg-blue-500',
        600: 'bg-blue-600',
        700: 'bg-blue-700',
      },
      text: {
        blue: {
          500: 'text-blue-500',
          600: 'text-blue-600',
          700: 'text-blue-700',
        }
      },
      border: {
        blue: {
          500: 'border-blue-500',
          600: 'border-blue-600',
        }
      }
    },

    // Gray colors for backgrounds and text
    gray: {
      background: {
        50: 'bg-gray-50',
        100: 'bg-gray-100',
        200: 'bg-gray-200',
        white: 'bg-white',
      },
      text: {
        400: 'text-gray-400',
        500: 'text-gray-500',
        600: 'text-gray-600',
        700: 'text-gray-700',
        900: 'text-gray-900',
      },
      border: {
        200: 'border-gray-200',
        300: 'border-gray-300',
        600: 'border-gray-600',
      }
    },

    // Status colors
    success: {
      background: {
        50: 'bg-green-50',
        100: 'bg-green-100',
        500: 'bg-green-500',
        600: 'bg-green-600',
      },
      text: {
        500: 'text-green-500',
        600: 'text-green-600',
        800: 'text-green-800',
      },
      hover: {
        100: 'hover:bg-green-100',
        700: 'hover:bg-green-700',
      }
    },

    danger: {
      background: {
        50: 'bg-red-50',
        100: 'bg-red-100',
        600: 'bg-red-600',
        700: 'bg-red-700',
      },
      text: {
        500: 'text-red-500',
        600: 'text-red-600',
        800: 'text-red-800',
      },
      hover: {
        100: 'hover:bg-red-100',
        700: 'hover:bg-red-700',
      },
      border: {
        200: 'border-red-200',
      }
    },

    warning: {
      background: {
        50: 'bg-yellow-50',
        100: 'bg-yellow-100',
        500: 'bg-yellow-500',
        600: 'bg-yellow-600',
      },
      text: {
        600: 'text-yellow-600',
        800: 'text-yellow-800',
      }
    },

    info: {
      background: {
        50: 'bg-indigo-50',
        100: 'bg-indigo-100',
      },
      text: {
        600: 'text-indigo-600',
        800: 'text-indigo-800',
      },
      hover: {
        100: 'hover:bg-indigo-100',
      }
    },

    // Hover states
    hover: {
      gray: {
        50: 'hover:bg-gray-50',
        100: 'hover:bg-gray-100',
        200: 'hover:bg-gray-200',
      },
      blue: {
        50: 'hover:bg-blue-50',
        500: 'hover:bg-blue-500',
        700: 'hover:bg-blue-700',
      }
    }
  },

  // Accounts page specific colors
  accounts: {
    summaryCards: {
      totalAccounts: {
        indicator: 'bg-blue-500',
        text: 'text-blue-600',
      },
      totalBalance: {
        indicator: 'bg-green-500',
        text: 'text-green-600',
      },
      selected: {
        indicator: 'bg-purple-500',
        text: 'text-purple-600',
      },
      bankTypes: {
        indicator: 'bg-orange-500',
        text: 'text-orange-600',
      }
    },
    
    actionButtons: {
      share: {
        background: 'bg-green-50',
        text: 'text-green-600',
        hover: {
          background: 'hover:bg-green-100',
          text: 'hover:text-green-800',
        }
      },
      view: {
        background: 'bg-indigo-50',
        text: 'text-indigo-600',
        hover: {
          background: 'hover:bg-indigo-100',
          text: 'hover:text-indigo-800',
        }
      },
      edit: {
        background: 'bg-blue-50',
        text: 'text-blue-600',
        hover: {
          background: 'hover:bg-blue-100',
          text: 'hover:text-blue-800',
        }
      },
      delete: {
        background: 'bg-red-50',
        text: 'text-red-600',
        hover: {
          background: 'hover:bg-red-100',
          text: 'hover:text-red-800',
        }
      }
    },

    nickname: {
      background: 'bg-blue-50',
      text: 'text-blue-600',
    },

    balance: {
      positive: 'text-green-600',
      empty: 'text-gray-400',
    }
  },

  // Debts page specific colors
  debts: {
    summaryCards: {
      totalDebts: {
        indicator: 'bg-blue-500',
        text: 'text-blue-600',
      },
      principalLent: {
        indicator: 'bg-purple-500',
        text: 'text-purple-600',
      },
      interestEarned: {
        indicator: 'bg-green-500',
        text: 'text-green-600',
      },
      totalRepaid: {
        indicator: 'bg-green-500',
        text: 'text-green-600',
      },
      outstanding: {
        indicator: 'bg-red-500',
        text: 'text-red-600',
      }
    },

    status: {
      active: {
        background: 'bg-blue-50',
        text: 'text-blue-600',
      },
      partiallyPaid: {
        background: 'bg-yellow-50',
        text: 'text-yellow-600',
      },
      fullyPaid: {
        background: 'bg-green-50',
        text: 'text-green-600',
      },
      overdue: {
        background: 'bg-red-50',
        text: 'text-red-600',
      },
      defaulted: {
        background: 'bg-gray-50',
        text: 'text-gray-600',
      }
    },

    actionButtons: {
      view: {
        background: 'bg-indigo-50',
        text: 'text-indigo-600',
        hover: {
          background: 'hover:bg-indigo-100',
          text: 'hover:text-indigo-800',
        }
      },
      repay: {
        background: 'bg-green-50',
        text: 'text-green-600',
        hover: {
          background: 'hover:bg-green-100',
          text: 'hover:text-green-800',
        }
      },
      edit: {
        background: 'bg-blue-50',
        text: 'text-blue-600',
        hover: {
          background: 'hover:bg-blue-100',
          text: 'hover:text-blue-800',
        }
      },
      delete: {
        background: 'bg-red-50',
        text: 'text-red-600',
        hover: {
          background: 'hover:bg-red-100',
          text: 'hover:text-red-800',
        }
      }
    },

    progress: {
      bar: 'bg-green-600',
      background: 'bg-gray-200',
    },

    remaining: {
      positive: 'text-red-600',
      zero: 'text-green-600',
    },

    interest: {
      text: 'text-orange-600',
    },

    overdue: {
      background: 'bg-red-50',
      text: 'text-red-600',
    }
  },

  // Investments page specific colors
  investments: {
    summaryCards: {
      totalInvestments: {
        icon: 'text-blue-500',
        text: 'text-blue-600',
      },
      gainers: {
        icon: 'text-green-500',
        text: 'text-green-600',
      },
      losers: {
        icon: 'text-red-500',
        text: 'text-red-600',
      },
      totalInvested: {
        icon: 'text-blue-500',
        text: 'text-blue-600',
      },
      currentValue: {
        icon: 'text-purple-500',
        text: 'text-purple-600',
      },
      totalGainLoss: {
        iconPositive: 'text-green-500',
        iconNegative: 'text-red-500',
        textPositive: 'text-green-600',
        textNegative: 'text-red-600',
      }
    },

    actionButtons: {
      view: {
        background: 'bg-indigo-50',
        text: 'text-indigo-600',
        hover: {
          background: 'hover:bg-indigo-100',
          text: 'hover:text-indigo-800',
        }
      },
      edit: {
        background: 'bg-blue-50',
        text: 'text-blue-600',
        hover: {
          background: 'hover:bg-blue-100',
          text: 'hover:text-blue-800',
        }
      },
      delete: {
        background: 'bg-red-50',
        text: 'text-red-600',
        hover: {
          background: 'hover:bg-red-100',
          text: 'hover:text-red-800',
        }
      }
    },

    gains: {
      positive: 'text-green-600',
      negative: 'text-red-600',
      neutral: 'text-gray-600',
    },

    types: {
      badge: {
        background: 'bg-blue-100',
        text: 'text-blue-800',
      }
    },

    sectionGains: {
      positive: 'text-green-600',
      negative: 'text-red-600',
    }
  },

  // Shared action button styles
  buttons: {
    primary: {
      background: 'bg-blue-600',
      text: 'text-white',
      hover: 'hover:bg-blue-700',
    },
    secondary: {
      background: 'bg-white',
      text: 'text-gray-700',
      border: 'border-gray-300',
      hover: 'hover:bg-gray-50',
    },
    success: {
      background: 'bg-green-600',
      text: 'text-white',
      hover: 'hover:bg-green-700',
    },
    danger: {
      background: 'bg-red-600',
      text: 'text-white',
      hover: 'hover:bg-red-700',
    },
    outline: {
      background: 'bg-transparent',
      border: 'border-gray-600',
      text: 'text-gray-600',
      hoverGreen: 'hover:bg-green-50',
      hoverBlue: 'hover:bg-blue-50',
    }
  },

  // Form and input colors
  forms: {
    input: {
      border: 'border-gray-300',
      focus: {
        ring: 'focus:ring-blue-500',
        border: 'focus:border-transparent',
      }
    },
    label: 'text-gray-700',
  },

  // Table colors
  table: {
    header: {
      background: 'bg-gray-50',
      text: 'text-gray-500',
      hover: 'hover:bg-gray-100',
      border: 'border-gray-200',
    },
    body: {
      background: 'bg-white',
      hover: 'hover:bg-gray-50',
      selected: 'bg-blue-50',
      divider: 'divide-gray-200',
    },
    resize: {
      hover: 'hover:bg-blue-500',
      opacity: 'hover:bg-opacity-50',
    },
    checkbox: {
      text: 'text-blue-600',
      focus: 'focus:ring-blue-500',
      border: 'border-gray-300',
    }
  }
} as const;

// ================================
// CENTRALIZED UI COMPONENT STYLES
// ================================

// Loading States
export const UI_STYLES = {
  // Loading spinner - minimal and clean, centered on screen
  loading: {
    container: 'flex flex-col items-center justify-center min-h-screen',
    spinner: `animate-spin h-8 w-8 border-2 ${COLORS.common.primary.blue[500]} border-t-transparent rounded-full`,
    text: `${COLORS.common.gray.text[600]} mt-4 text-sm`,
  },

  // Error states
  error: {
    container: `${COLORS.common.danger.background[50]} border ${COLORS.common.danger.border[200]} rounded-lg p-6`,
    title: `text-lg font-semibold ${COLORS.common.danger.text[800]} mb-2`,
    message: COLORS.common.danger.text[600],
    retryButton: `px-4 py-2 ${COLORS.buttons.primary.background} ${COLORS.buttons.primary.text} rounded-md ${COLORS.buttons.primary.hover}`,
    dismissButton: 'px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700',
  },

  // Empty states - minimal and clean
  empty: {
    container: `p-12 text-center m-50`,
    icon: `${COLORS.common.gray.text[400]} mb-4`,
    title: `text-lg font-medium ${COLORS.common.gray.text[900]} mb-2`,
    message: `${COLORS.common.gray.text[600]} mb-6`,
    clearButton: `px-4 py-2 border ${COLORS.buttons.secondary.border} rounded-md ${COLORS.common.hover.gray[50]}`,
    addButton: `px-4 py-2 ${COLORS.buttons.primary.background} ${COLORS.buttons.primary.text} rounded-md ${COLORS.buttons.primary.hover}`,
  },

  // Page containers
  page: {
    container: 'space-y-6',
    title: 'text-3xl font-bold',
    subtitle: COLORS.common.gray.text[600],
  },

  // Header sections
  header: {
    container: 'flex items-center justify-between',
    buttonGroup: 'flex gap-2',
    primaryButton: `px-4 py-2 ${COLORS.buttons.primary.background} ${COLORS.buttons.primary.hover} ${COLORS.buttons.primary.text} rounded-md`,
    secondaryButton: `px-4 py-2 border ${COLORS.buttons.outline.border} ${COLORS.buttons.outline.text} ${COLORS.buttons.outline.hoverBlue} rounded-md`,
    exportButton: `px-4 py-2 border ${COLORS.buttons.outline.border} ${COLORS.buttons.outline.text} ${COLORS.buttons.outline.hoverGreen} rounded-md disabled:opacity-50`,
  },

  // Summary cards
  summaryCard: {
    container: `${COLORS.common.gray.background.white} rounded-lg border p-4 text-center`,
    containerLarge: `${COLORS.common.gray.background.white} rounded-lg border p-6 text-center`,
    indicatorRow: 'flex items-center justify-center space-x-2 mb-2',
    indicatorRowLarge: 'flex items-center justify-center space-x-2 mb-3',
    indicator: 'w-3 h-3 rounded-full',
    title: `text-sm font-medium ${COLORS.common.gray.text[600]}`,
    value: 'text-2xl font-bold mb-1',
    valueLarge: 'text-3xl font-bold mb-1',
    subtitle: `text-sm ${COLORS.common.gray.text[500]}`,
  },

  // Filter sections
  filters: {
    container: `${COLORS.common.gray.background.white} rounded-lg shadow-sm border p-6`,
    containerWithMargin: `${COLORS.common.gray.background.white} rounded-lg border p-6 mb-6`,
    gridFive: 'grid grid-cols-5 gap-4',
    gridSix: 'grid grid-cols-6 gap-4',
    label: `block text-sm font-medium ${COLORS.forms.label} mb-2`,
    input: `w-full px-4 py-2 border ${COLORS.forms.input.border} rounded-lg focus:outline-none focus:ring-2 ${COLORS.forms.input.focus.ring} ${COLORS.forms.input.focus.border}`,
    clearButton: `w-full px-6 py-2 border ${COLORS.buttons.secondary.border} ${COLORS.buttons.secondary.background} ${COLORS.buttons.secondary.text} ${COLORS.buttons.secondary.hover} rounded-lg focus:outline-none focus:ring-2 ${COLORS.forms.input.focus.ring} disabled:opacity-50 disabled:cursor-not-allowed`,
    clearButtonContainer: 'flex items-center pt-6',
    resultText: `text-sm ${COLORS.common.gray.text[600]}`,
    resultContainer: 'flex justify-end mt-4',
  },

  // Balance chart section
  chart: {
    container: `${COLORS.common.gray.background.white} rounded-lg shadow-sm border p-6`,
    title: `text-lg font-semibold ${COLORS.common.gray.text[900]} mb-4`,
  },
} as const;

// ================================
// EXTRACTED COLOR VARIABLES
// ================================

// Button Colors
export const BUTTON_COLORS = {
  primary: `px-4 py-2 ${COLORS.buttons.primary.background} ${COLORS.buttons.primary.hover} ${COLORS.buttons.primary.text} rounded-md`,
  secondary: `px-4 py-2 border ${COLORS.buttons.outline.border} ${COLORS.buttons.outline.text} rounded-md`,
  secondaryBlue: `px-4 py-2 border ${COLORS.buttons.outline.border} ${COLORS.buttons.outline.text} ${COLORS.buttons.outline.hoverBlue} rounded-md`,
  secondaryGreen: `px-4 py-2 border ${COLORS.buttons.outline.border} ${COLORS.buttons.outline.text} ${COLORS.buttons.outline.hoverGreen} rounded-md disabled:opacity-50`,
  clear: `px-4 py-2 border ${COLORS.buttons.secondary.border} rounded-md ${COLORS.common.hover.gray[50]}`,
  clearFilter: `w-full px-6 py-2 border ${COLORS.buttons.secondary.border} ${COLORS.buttons.secondary.background} ${COLORS.buttons.secondary.text} ${COLORS.buttons.secondary.hover} rounded-lg focus:outline-none focus:ring-2 ${COLORS.forms.input.focus.ring} disabled:opacity-50 disabled:cursor-not-allowed`,
} as const;

// Text Colors
export const TEXT_COLORS = {
  title: 'text-3xl font-bold',
  subtitle: COLORS.common.gray.text[600],
  label: `block text-sm font-medium ${COLORS.forms.label} mb-2`,
  cardTitle: `text-sm font-medium ${COLORS.common.gray.text[600]}`,
  cardValue: 'text-2xl font-bold',
  cardValueLarge: 'text-3xl font-bold mb-1',
  cardSubtitle: `text-sm ${COLORS.common.gray.text[500]}`,
  loading: COLORS.common.gray.text[600],
  emptyTitle: `text-lg font-medium ${COLORS.common.gray.text[900]} mb-2`,
  emptyMessage: `${COLORS.common.gray.text[600]} mb-6`,
  errorTitle: `text-lg font-semibold ${COLORS.common.danger.text[800]} mb-2`,
  errorMessage: COLORS.common.danger.text[600],
  resultText: `text-sm ${COLORS.common.gray.text[600]}`,
  chartTitle: `text-lg font-semibold ${COLORS.common.gray.text[900]} mb-4`,
} as const;

// Container Colors
export const CONTAINER_COLORS = {
  page: 'space-y-6',
  white: `${COLORS.common.gray.background.white} rounded-lg shadow-sm border`,
  whiteWithPadding: `${COLORS.common.gray.background.white} rounded-lg shadow-sm border p-6`,
  whiteWithPaddingLarge: `${COLORS.common.gray.background.white} rounded-lg shadow-sm border p-12 text-center`,
  card: `${COLORS.common.gray.background.white} rounded-lg border p-4 text-center`,
  cardLarge: `${COLORS.common.gray.background.white} rounded-lg border p-6 text-center`,
  error: `${COLORS.common.danger.background[50]} border ${COLORS.common.danger.border[200]} rounded-lg p-6`,
  filtersWithMargin: `${COLORS.common.gray.background.white} rounded-lg border p-6 mb-6`,
} as const;

// Input Colors
export const INPUT_COLORS = {
  standard: `w-full px-4 py-2 border ${COLORS.forms.input.border} rounded-lg focus:outline-none focus:ring-2 ${COLORS.forms.input.focus.ring} ${COLORS.forms.input.focus.border}`,
} as const;

// Loading Colors - minimal and clean, centered on screen
export const LOADING_COLORS = {
  container: 'flex flex-col items-center justify-center min-h-screen',
  spinner: `animate-spin h-8 w-8 border-2 ${COLORS.common.primary.blue[500]} border-t-transparent rounded-full`,
  text: `${COLORS.common.gray.text[600]} mt-4 text-sm`,
} as const;

// Icon Colors
export const ICON_COLORS = {
  empty: `${COLORS.common.gray.text[400]} mb-4`,
  blue: COLORS.investments.summaryCards.totalInvestments.icon,
  green: COLORS.investments.summaryCards.gainers.icon,
  red: COLORS.investments.summaryCards.losers.icon,
  purple: COLORS.investments.summaryCards.totalInvested.icon,
  greenPositive: COLORS.investments.summaryCards.totalGainLoss.iconPositive,
  redNegative: COLORS.investments.summaryCards.totalGainLoss.iconNegative,
} as const;

// Helper functions to get color classes
export const getActionButtonClasses = (
  action: 'view' | 'edit' | 'delete' | 'share' | 'repay',
  page: 'accounts' | 'debts' | 'investments'
) => {
  const buttonConfig = COLORS[page].actionButtons[action as keyof typeof COLORS[typeof page]['actionButtons']];
  
  if (!buttonConfig) return '';
  
  return `inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${buttonConfig.background} ${buttonConfig.text} ${buttonConfig.hover.background} ${buttonConfig.hover.text} transition-colors`;
};

export const getStatusClasses = (status: string, page: 'debts') => {
  if (page === 'debts') {
    const statusMap: Record<string, keyof typeof COLORS.debts.status> = {
      'ACTIVE': 'active',
      'PARTIALLY_PAID': 'partiallyPaid',
      'FULLY_PAID': 'fullyPaid',
      'OVERDUE': 'overdue',
      'DEFAULTED': 'defaulted',
    };
    
    const statusKey = statusMap[status] || 'defaulted';
    const statusConfig = COLORS.debts.status[statusKey];
    
    return `inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig.background} ${statusConfig.text}`;
  }
  
  return '';
};

export const getSummaryCardClasses = (
  cardType: string,
  page: 'accounts' | 'debts' | 'investments'
) => {
  const pageConfig = COLORS[page].summaryCards;
  const cardConfig = pageConfig[cardType as keyof typeof pageConfig];
  
  if (!cardConfig || typeof cardConfig !== 'object') return { indicator: '', text: '' };
  
  return {
    indicator: (cardConfig as any).indicator || '',
    text: (cardConfig as any).text || '',
  };
};

export const getGainLossClasses = (value: number) => {
  if (value > 0) return COLORS.investments.gains.positive;
  if (value < 0) return COLORS.investments.gains.negative;
  return COLORS.investments.gains.neutral;
}; 