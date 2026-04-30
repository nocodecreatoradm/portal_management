
export const PERU_HOLIDAYS_2026 = [
  '2026-01-01', // Año Nuevo
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajo
  '2026-06-07', // Batalla de Arica
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-23', // Día de la Fuerza Aérea del Perú
  '2026-07-28', // Fiestas Patrias
  '2026-07-29', // Fiestas Patrias
  '2026-08-06', // Batalla de Junín
  '2026-08-30', // Santa Rosa de Lima
  '2026-10-08', // Combate de Angamos
  '2026-11-01', // Todos los Santos
  '2026-12-08', // Inmaculada Concepción
  '2026-12-09', // Batalla de Ayacucho
  '2026-12-25', // Navidad
];

export function isBusinessTime(date: Date): boolean {
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const isWeekend = day === 0 || day === 6;
  if (isWeekend) return false;

  const dateString = date.toISOString().split('T')[0];
  if (PERU_HOLIDAYS_2026.includes(dateString)) return false;

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentTimeInMinutes = hours * 60 + minutes;

  const startInMinutes = 7 * 60 + 15; // 07:15
  const endInMinutes = 17 * 60; // 17:00

  return currentTimeInMinutes >= startInMinutes && currentTimeInMinutes < endInMinutes;
}

export function getBusinessMsBetween(start: Date, end: Date): number {
  let totalMs = 0;
  let current = new Date(start);
  
  // If the gap is less than 2 minutes, use a 1-second step for precision
  // Otherwise use 1-minute steps for performance
  const stepMs = (end.getTime() - start.getTime()) < 120000 ? 1000 : 60000;

  while (current < end) {
    if (isBusinessTime(current)) {
      totalMs += stepMs;
    }
    current = new Date(current.getTime() + stepMs);
  }
  return totalMs;
}
