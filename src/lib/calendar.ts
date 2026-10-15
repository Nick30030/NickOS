export interface PeriodCountdown {
  title: string;
  endDate: Date;
  daysRemaining: number;
  hoursRemaining: number;
  percentageElapsed: number;
}

export function calculatePeriodCountdowns(timezone = 'Africa/Douala'): {
  month: PeriodCountdown;
  quarter: PeriodCountdown;
  semester: PeriodCountdown;
  year: PeriodCountdown;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 - 11
  const day = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // 1. Month calculation
  const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const daysPassedInMonth = day - 1 + hours / 24 + minutes / 1440;
  const monthElapsed = Math.min(100, Math.max(0, (daysPassedInMonth / totalDaysInMonth) * 100));
  const msMonthRemaining = lastDayOfMonth.getTime() - now.getTime();
  const daysMonthRem = Math.max(0, Math.floor(msMonthRemaining / (1000 * 60 * 60 * 24)));
  const hoursMonthRem = Math.max(0, Math.floor((msMonthRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  // 2. Quarter calculation (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
  const qIndex = Math.floor(month / 3); // 0, 1, 2, 3
  const qEndMonth = (qIndex + 1) * 3 - 1; // 2, 5, 8, 11
  const qStartMonth = qIndex * 3;
  const lastDayOfQ = new Date(year, qEndMonth + 1, 0, 23, 59, 59);
  const qStartDate = new Date(year, qStartMonth, 1);
  const totalDaysInQ = (lastDayOfQ.getTime() - qStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysPassedInQ = (now.getTime() - qStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const qElapsed = Math.min(100, Math.max(0, (daysPassedInQ / totalDaysInQ) * 100));
  const msQRem = lastDayOfQ.getTime() - now.getTime();
  const daysQRem = Math.max(0, Math.floor(msQRem / (1000 * 60 * 60 * 24)));
  const hoursQRem = Math.max(0, Math.floor((msQRem % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  // 3. Semester calculation (S1: Jan-Jun, S2: Jul-Dec)
  const isS2 = month >= 6;
  const sStartMonth = isS2 ? 6 : 0;
  const sEndMonth = isS2 ? 11 : 5;
  const lastDayOfS = new Date(year, sEndMonth + 1, 0, 23, 59, 59);
  const sStartDate = new Date(year, sStartMonth, 1);
  const totalDaysInS = (lastDayOfS.getTime() - sStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysPassedInS = (now.getTime() - sStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const sElapsed = Math.min(100, Math.max(0, (daysPassedInS / totalDaysInS) * 100));
  const msSRem = lastDayOfS.getTime() - now.getTime();
  const daysSRem = Math.max(0, Math.floor(msSRem / (1000 * 60 * 60 * 24)));
  const hoursSRem = Math.max(0, Math.floor((msSRem % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  // 4. Year calculation
  const lastDayOfYear = new Date(year, 11, 31, 23, 59, 59);
  const yStartDate = new Date(year, 0, 1);
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const totalDaysInYear = isLeap ? 366 : 365;
  const daysPassedInYear = (now.getTime() - yStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const yElapsed = Math.min(100, Math.max(0, (daysPassedInYear / totalDaysInYear) * 100));
  const msYRem = lastDayOfYear.getTime() - now.getTime();
  const daysYRem = Math.max(0, Math.floor(msYRem / (1000 * 60 * 60 * 24)));
  const hoursYRem = Math.max(0, Math.floor((msYRem % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  return {
    month: {
      title: 'Mois',
      endDate: lastDayOfMonth,
      daysRemaining: daysMonthRem,
      hoursRemaining: hoursMonthRem,
      percentageElapsed: Number(monthElapsed.toFixed(1)),
    },
    quarter: {
      title: `Trimestre Q${qIndex + 1}`,
      endDate: lastDayOfQ,
      daysRemaining: daysQRem,
      hoursRemaining: hoursQRem,
      percentageElapsed: Number(qElapsed.toFixed(1)),
    },
    semester: {
      title: isS2 ? 'Semestre S2' : 'Semestre S1',
      endDate: lastDayOfS,
      daysRemaining: daysSRem,
      hoursRemaining: hoursSRem,
      percentageElapsed: Number(sElapsed.toFixed(1)),
    },
    year: {
      title: `Année ${year}`,
      endDate: lastDayOfYear,
      daysRemaining: daysYRem,
      hoursRemaining: hoursYRem,
      percentageElapsed: Number(yElapsed.toFixed(1)),
    },
  };
}
