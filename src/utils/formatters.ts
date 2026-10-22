export function formatCurrency(amount?: number | string | null, currency: string = 'EUR'): string {
  if (amount === null || amount === undefined) {
    return '0,00 €';
  }
  const num = typeof amount === 'number' ? (isNaN(amount) ? 0 : amount) : (Number(amount) || 0);
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} €`;
  }
}

export function extractDateCandidate(value: any): string | Date | number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === 'number' && !isNaN(value) && value > 0) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed;
  }
  if (typeof value === 'object') {
    if (typeof value.date === 'string' && typeof value.time === 'string') {
      return `${value.date.trim()}T${value.time.trim()}`;
    }
    const candidate =
      value.startDateTime ||
      value.start_datetime ||
      value.startDate ||
      value.start_date ||
      value.date ||
      value.dateValue ||
      value.dateTime ||
      value.datetime ||
      value.timestamp ||
      value.start ||
      value.iso ||
      value.isoString;
    if (candidate) return extractDateCandidate(candidate);
  }
  return null;
}

export function parseToValidDate(candidate: any): Date | null {
  const extracted = extractDateCandidate(candidate);
  if (!extracted) return null;
  if (extracted instanceof Date) return isNaN(extracted.getTime()) ? null : extracted;
  if (typeof extracted === 'number') {
    const d = new Date(extracted);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof extracted === 'string') {
    const trimmed = extracted.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      const dt = new Date(y, m - 1, d, 12, 0, 0);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const direct = new Date(trimmed);
    if (!isNaN(direct.getTime())) return direct;
    if (trimmed.includes(' ') && !trimmed.includes('T')) {
      const dt = new Date(trimmed.replace(' ', 'T'));
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  return null;
}

export function formatDateTime(isoString: any, fallbackObj?: any): string {
  const date = parseToValidDate(isoString) || (fallbackObj ? parseToValidDate(fallbackObj) : null);
  if (!date) return '';

  const day = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Le ${day} à ${time}`;
}

export function formatDateOnly(isoString: any): string {
  const date = parseToValidDate(isoString);
  if (!date) return '';

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTimeOnly(isoString: any): string {
  const date = parseToValidDate(isoString);
  if (!date) return '';

  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(isoString: any): string {
  const date = parseToValidDate(isoString);
  if (!date) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'À l\'instant';
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 172800) return 'Hier';
  
  return formatDateTime(isoString);
}

export function formatEventCardDate(
  startIsoOrEvent?: any,
  maybeEndIso?: any,
  fallbackEvent?: any
): string {
  let startCandidate = extractDateCandidate(startIsoOrEvent);
  let endCandidate = extractDateCandidate(maybeEndIso);

  if (!startCandidate && fallbackEvent && typeof fallbackEvent === 'object') {
    startCandidate = extractDateCandidate(fallbackEvent);
    if (!endCandidate) {
      endCandidate = extractDateCandidate(
        fallbackEvent.endDateTime ||
        fallbackEvent.end_datetime ||
        fallbackEvent.endDate ||
        fallbackEvent.end_date ||
        fallbackEvent.end
      );
    }
  }

  if (!endCandidate && startIsoOrEvent && typeof startIsoOrEvent === 'object') {
    endCandidate = extractDateCandidate(
      startIsoOrEvent.endDateTime ||
      startIsoOrEvent.end_datetime ||
      startIsoOrEvent.endDate ||
      startIsoOrEvent.end_date ||
      startIsoOrEvent.end
    );
  }

  const startDate = parseToValidDate(startCandidate);
  if (!startDate) {
    return 'Date à préciser';
  }

  const startDay = startDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const startTime = startDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const endDate = parseToValidDate(endCandidate);
  if (!endDate || endDate.getTime() <= startDate.getTime()) {
    return `Le ${startDay} à ${startTime}`;
  }

  const endDay = endDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const endTime = endDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (startDay === endDay) {
    if (startTime === endTime) {
      return `Le ${startDay} à ${startTime}`;
    }
    return `Le ${startDay} de ${startTime} à ${endTime}`;
  }

  return `Du ${startDay} à ${startTime} au ${endDay} à ${endTime}`;
}

export function parseIsoToLocalDate(isoString?: any): { date: string; time: string } {
  if (!isoString) {
    const now = new Date();
    return {
      date: getLocalDateString(now),
      time: '10:00',
    };
  }
  const d = parseToValidDate(isoString);
  if (!d) {
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

