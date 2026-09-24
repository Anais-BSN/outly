import { EventItem } from '../types';

/**
 * Format a Date object or ISO string into Google Calendar format: YYYYMMDDTHHmmssZ
 */
function formatIsoForGoogle(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Format a Date object or ISO string into iCal / .ics format: YYYYMMDDTHHmmssZ
 */
function formatIsoForIcs(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Open Google Calendar web interface with prefilled event details
 */
export function exportToGoogleCalendar(event: EventItem) {
  const start = formatIsoForGoogle(event.startDateTime);
  const end = event.endDateTime
    ? formatIsoForGoogle(event.endDateTime)
    : formatIsoForGoogle(new Date(new Date(event.startDateTime).getTime() + 3600000).toISOString());

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || 'Organisé avec Outlys',
    location: event.location || '',
  });

  const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Generate and download an .ics iCalendar file for Apple Calendar, Outlook, etc.
 */
export function downloadIcsFile(event: EventItem) {
  const start = formatIsoForIcs(event.startDateTime);
  const end = event.endDateTime
    ? formatIsoForIcs(event.endDateTime)
    : formatIsoForIcs(new Date(new Date(event.startDateTime).getTime() + 3600000).toISOString());

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Outlys//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:outly-event-${event.id}@outlys.app`,
    `DTSTAMP:${formatIsoForIcs(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${(event.description || 'Organisé avec Outlys').replace(/\n/g, '\\n')}`,
    `LOCATION:${(event.location || '').replace(/\n/g, ' ')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', `${event.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
