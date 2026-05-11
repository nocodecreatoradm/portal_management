import { format as dateFnsFormat } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Gets the current date/time adjusted to America/Lima (UTC-5)
 */
export const getLimaNow = (): Date => {
  // Create a date object for the current moment
  const now = new Date();
  
  // Use Intl.DateTimeFormat to get the time in Lima
  const limaTimeString = now.toLocaleString('en-US', { timeZone: 'America/Lima' });
  return new Date(limaTimeString);
};

/**
 * Formats a date using America/Lima timezone as default
 */
export const formatLima = (date: Date | string | number, formatStr: string): string => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return dateFnsFormat(d, formatStr, { locale: es });
};

/**
 * Gets the current date string in YYYYMMDD format for correlatives
 */
export const getLimaCorrelativeDate = (): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}${month}${day}`;
};
