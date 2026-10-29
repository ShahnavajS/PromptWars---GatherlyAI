/**
 * Gatherly AI — Indian Currency & Date Formatting
 *
 * Provides locale-aware Indian numbering (₹, Lakhs, Crores) and Asia/Kolkata date rendering.
 * Formatting functions never mutate underlying stored paise integers.
 */

/**
 * Formats integer paise into standard Indian Rupee string with Lakhs/Crores grouping.
 * Example: 120000000 paise -> "₹12,00,000"
 * Example: 125050 paise -> "₹1,250.50"
 */
export function formatINR(paise: number, options: { includePaise?: boolean } = {}): string {
  if (typeof paise !== 'number' || !Number.isFinite(paise)) {
    return '₹0';
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  // Format rupees with Indian comma grouping
  // Rule: Last 3 digits, then groups of 2 digits
  const rupeeStr = rupees.toString();
  let formattedRupees = '';

  if (rupeeStr.length <= 3) {
    formattedRupees = rupeeStr;
  } else {
    const lastThree = rupeeStr.slice(-3);
    const otherDigits = rupeeStr.slice(0, -3);
    const withCommas = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedRupees = `${withCommas},${lastThree}`;
  }

  let result = `₹${formattedRupees}`;

  // If remainder exists or explicitly requested
  if (options.includePaise && remainderPaise > 0) {
    result += `.${remainderPaise.toString().padStart(2, '0')}`;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Compact Indian currency formatting for high-level summaries and dashboards.
 * Example: 120000000 paise -> "₹12 Lakh"
 * Example: 2500000000 paise -> "₹2.5 Crore"
 * Example: 5000000 paise -> "₹50,000"
 */
export function formatCompactINR(paise: number): string {
  if (typeof paise !== 'number' || !Number.isFinite(paise)) {
    return '₹0';
  }

  const rupees = Math.round(paise / 100);

  if (rupees >= 10000000) {
    // 1 Crore = 10,000,000
    const cr = (rupees / 10000000).toFixed(2).replace(/\.?0+$/, '');
    return `₹${cr} Cr`;
  }
  if (rupees >= 100000) {
    // 1 Lakh = 100,000
    const lk = (rupees / 100000).toFixed(2).replace(/\.?0+$/, '');
    return `₹${lk} Lakh`;
  }
  return formatINR(paise);
}

/**
 * Formats ISO date string into readable Indian standard format.
 * Defaults to Asia/Kolkata timezone.
 */
export function formatDate(isoDate: string, options: { format?: 'short' | 'medium' | 'long' } = {}): string {
  if (!isoDate) return 'Date TBD';

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;

    const fmt = options.format || 'medium';

    if (fmt === 'short') {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      });
    }

    if (fmt === 'long') {
      return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
    }

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Calculates remaining days until event start date in Asia/Kolkata.
 */
export function calculateDaysRemaining(eventStartDate: string): {
  days: number;
  label: string;
  isPast: boolean;
} {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(eventStartDate);
    eventDate.setHours(0, 0, 0, 0);

    const diffMs = eventDate.getTime() - today.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return { days: Math.abs(days), label: `${Math.abs(days)} days ago`, isPast: true };
    }
    if (days === 0) {
      return { days: 0, label: 'Today', isPast: false };
    }
    if (days === 1) {
      return { days: 1, label: 'Tomorrow', isPast: false };
    }
    return { days, label: `${days} days to go`, isPast: false };
  } catch {
    return { days: 0, label: 'Date pending', isPast: false };
  }
}
