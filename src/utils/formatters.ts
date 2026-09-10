export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateOnly(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatTimeOnly(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'À l\'instant';
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 172800) return 'Hier';
  
  return formatDateTime(isoString);
}

function formatShortDateWithHour(date: Date): string {
  const day = date.getDate();
  const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
  const month = months[date.getMonth()];
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeStr = minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, '0')}`;
  return `${day} ${month}, ${timeStr}`;
}

export function formatEventCardDate(startIso: string, endIso?: string): string {
  if (!startIso) return '';
  const startDate = new Date(startIso);
  if (isNaN(startDate.getTime())) return startIso;
  const startStr = formatShortDateWithHour(startDate);

  if (!endIso) return startStr;
  const endDate = new Date(endIso);
  if (isNaN(endDate.getTime())) return startStr;

  const endStr = formatShortDateWithHour(endDate);
  return `${startStr} – ${endStr}`;
}

export function parseIsoToLocalDate(isoString?: string | null): { date: string; time: string } {
  if (!isoString) {
    const now = new Date();
    return {
      date: getLocalDateString(now),
      time: '10:00',
    };
  }
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    return { date: '', time: '' };
  }
  return {
    date: getLocalDateString(d),
    time: getLocalTimeString(d),
  };
}

export function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function createIsoFromLocalDateAndTime(dateStr: string, timeStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
  return localDate.toISOString();
}

