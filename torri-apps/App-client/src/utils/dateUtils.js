/**
 * @typedef {Object} DateOption
 * @property {string} day - Day of the week in Portuguese (abbreviated)
 * @property {string} date - Day of the month as string
 * @property {string} month - Month in Portuguese (abbreviated)
 * @property {string} fullDate - Full date in YYYY-MM-DD format
 */

/**
 * Generates an array of date options starting from today for the next 30 days
 * Each date option includes day of week, date number, month abbreviation, and full date
 * @param {number} [numberOfDays=30] - Number of days to generate (default: 30)
 * @returns {DateOption[]} Array of DateOption objects
 */
export const generateAvailableDates = (numberOfDays = 30) => {
  const dates = [];
  const today = new Date();

  // Portuguese day names (abbreviated)
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Portuguese month names (abbreviated)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                     'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  for (let i = 0; i < numberOfDays; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);

    const dayOfWeek = dayNames[currentDate.getDay()];
    const dayOfMonth = currentDate.getDate().toString();
    const month = monthNames[currentDate.getMonth()];
    const fullDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    dates.push({
      day: dayOfWeek,
      date: dayOfMonth,
      month: month,
      fullDate: fullDate
    });
  }

  return dates;
};

/**
 * Formats a date for display in Portuguese
 * @param {DateOption|null} date - DateOption object
 * @returns {string} Formatted date string
 */
export const formatDateForDisplay = (date) => {
  if (!date) return "";
  
  const monthFullNames = {
    Jan: "Janeiro", Fev: "Fevereiro", Mar: "Março", Abr: "Abril",
    Mai: "Maio", Jun: "Junho", Jul: "Julho", Ago: "Agosto",
    Set: "Setembro", Out: "Outubro", Nov: "Novembro", Dez: "Dezembro"
  };
  
  return `${date.day}, ${date.date} de ${monthFullNames[date.month] || date.month}`;
};

/**
 * Checks if a given date is today
 * @param {DateOption} dateOption - DateOption to check
 * @returns {boolean} boolean indicating if the date is today
 */
export const isToday = (dateOption) => {
  const today = new Date().toISOString().split('T')[0];
  return dateOption.fullDate === today;
};

/**
 * Checks if a given date is in the past
 * @param {DateOption} dateOption - DateOption to check
 * @returns {boolean} boolean indicating if the date is in the past
 */
export const isPastDate = (dateOption) => {
  const today = new Date().toISOString().split('T')[0];
  return dateOption.fullDate < today;
};

/**
 * Formats duration in minutes to hours and minutes format
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string (e.g., "1h 30min", "45min", "2h")
 */
export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}min`;
  }
};