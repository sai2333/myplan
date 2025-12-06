import { format, isSameDay, subDays, isBefore, startOfDay, getDay, differenceInDays } from 'date-fns';
import { Habit, HabitLog } from '../types';

export interface HabitStats {
  totalDays: number;
  currentStreak: number;
  bestStreak: number;
  completionRate: number; // 0-100
  completedDates: Record<string, number>; // Date string -> Total Value
}

/**
 * Calculate statistics for a habit based on its logs
 */
export const calculateHabitStats = (habit: Habit, logs: HabitLog[]): HabitStats => {
  // 1. Aggregate logs by date
  const logsByDate: Record<string, number> = {};
  logs.forEach(log => {
    const dateStr = format(new Date(log.timestamp), 'yyyy-MM-dd');
    logsByDate[dateStr] = (logsByDate[dateStr] || 0) + log.value;
  });

  // 2. Identify completed dates
  const completedDates = Object.keys(logsByDate).filter(dateStr => {
    return logsByDate[dateStr] >= (habit.targetValue || 1);
  }).sort();

  const totalDays = completedDates.length;

  // 3. Calculate Streaks
  // Logic depends on frequency
  let currentStreak = 0;
  let bestStreak = 0;

  if (habit.frequency === 'daily' || habit.frequency === 'specific_days') {
    // Get all valid dates in reverse chronological order (from today backwards) to find current streak
    // And also forward to find max streak.
    // Actually, easier to just iterate sorted dates and check gaps based on expected schedule.

    const sortedDates = [...completedDates].sort(); // Ascending
    if (sortedDates.length === 0) {
      return { totalDays: 0, currentStreak: 0, bestStreak: 0, completionRate: 0, completedDates: logsByDate };
    }

    // Calculate Best Streak
    let tempStreak = 0;
    let lastDate: Date | null = null;

    // For 'daily', gap > 1 day breaks streak.
    // For 'specific_days', we need to check if the gap contains any *scheduled* days.
    // If the gap contains scheduled days that were missed, streak breaks.

    for (const dateStr of sortedDates) {
      const currentDate = new Date(dateStr);
      
      if (!lastDate) {
        tempStreak = 1;
      } else {
        if (isStreakContinuous(lastDate, currentDate, habit)) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
      lastDate = currentDate;
    }

    // Calculate Current Streak
    // Check from today (or yesterday) backwards
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    
    // Check if today or yesterday is completed
    const lastCompletedDateStr = sortedDates[sortedDates.length - 1];
    const lastCompletedDate = new Date(lastCompletedDateStr);
    
    const isTodayCompleted = isSameDay(lastCompletedDate, today);
    const isYesterdayCompleted = isSameDay(lastCompletedDate, yesterday);

    // Special handling: if today is not completed yet, but we are on a streak from yesterday, 
    // OR if today is not a scheduled day, we look back to the last scheduled day.
    
    // Simplified Current Streak Logic:
    // 1. Find the most recent completed date.
    // 2. Check if the gap between NOW and that date contains any MISSED scheduled days.
    // 3. If no missed scheduled days in between, the streak is alive.
    // 4. But "Current Streak" usually implies "Active Run". 
    //    If I haven't done it today (and today is scheduled), is the streak broken? No, usually it breaks tomorrow.
    //    However, typical app logic: 
    //    - If done today: Streak = Streak up to today.
    //    - If not done today: Streak = Streak up to yesterday (if yesterday was done/scheduled).
    
    // Let's use the 'tempStreak' logic but applied to the end of the array
    // And verify the "connection" to today.
    
    // Re-calculate streak ending at the last completed date
    let runningStreak = 1;
    for (let i = sortedDates.length - 1; i > 0; i--) {
      const curr = new Date(sortedDates[i]);
      const prev = new Date(sortedDates[i-1]);
      if (isStreakContinuous(prev, curr, habit)) {
        runningStreak++;
      } else {
        break;
      }
    }

    // Now validate if this runningStreak is "current"
    // It is current if the last completed date is "connected" to today.
    // i.e., no missed scheduled days between lastCompletedDate and Today.
    if (isStreakAlive(lastCompletedDate, today, habit)) {
      currentStreak = runningStreak;
    } else {
      currentStreak = 0;
    }

  } else {
    // For 'weekly', simpler logic or treat as daily for now
    // Weekly is hard to define "streak" without defined start of week.
    // Fallback: Count total weeks? 
    // Let's just treat it as "Count of completed days" for now or similar to daily.
    currentStreak = 0; // TODO: Weekly logic
    bestStreak = 0;
  }
  
  // Completion Rate (Last 30 days?)
  // Let's calculate based on last 30 days
  const last30DaysStart = subDays(new Date(), 29);
  let scheduledDaysCount = 0;
  let completedDaysCount = 0;
  
  for (let i = 0; i < 30; i++) {
    const d = subDays(new Date(), i);
    if (isScheduled(d, habit)) {
      scheduledDaysCount++;
      const dStr = format(d, 'yyyy-MM-dd');
      if (logsByDate[dStr] && logsByDate[dStr] >= (habit.targetValue || 1)) {
        completedDaysCount++;
      }
    }
  }
  
  const completionRate = scheduledDaysCount > 0 ? Math.round((completedDaysCount / scheduledDaysCount) * 100) : 0;

  return {
    totalDays,
    currentStreak,
    bestStreak,
    completionRate,
    completedDates: logsByDate
  };
};

// Helper: Check if a day is scheduled for the habit
const isScheduled = (date: Date, habit: Habit): boolean => {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'specific_days') {
    const dayIndex = getDay(date); // 0 = Sunday
    return (habit.frequencyDays || []).includes(dayIndex);
  }
  // Weekly: Assume always scheduled for now (flexible)
  return true; 
};

// Helper: Check if two completed dates are consecutive in terms of schedule
const isStreakContinuous = (prevDate: Date, currDate: Date, habit: Habit): boolean => {
  // Iterate days between prev and curr (exclusive)
  // If any day in between was SCHEDULED, then the streak is broken.
  const diff = differenceInDays(currDate, prevDate);
  if (diff <= 0) return false; // Should not happen if sorted
  if (diff === 1) return true; // Consecutive days

  for (let i = 1; i < diff; i++) {
    const d = subDays(currDate, i); // Check days in between
    if (isScheduled(d, habit)) {
      return false; // Found a scheduled day that was missed
    }
  }
  return true;
};

// Helper: Check if the streak is still alive relative to today
const isStreakAlive = (lastCompletedDate: Date, today: Date, habit: Habit): boolean => {
  // If last completed is today, yes.
  if (isSameDay(lastCompletedDate, today)) return true;
  
  // If last completed is before today, check if we missed any scheduled days in between.
  // We check days from Today down to (but not including) LastCompletedDate.
  // Note: If Today is scheduled and NOT done, the streak is technically "at risk" or "pending".
  // But usually, "Current Streak" is displayed even if I haven't done it TODAY yet (as long as I didn't miss Yesterday).
  // EXCEPT: If today is scheduled, and I haven't done it, my streak count shouldn't increase, but it shouldn't reset to 0 yet until tomorrow.
  // HOWEVER, standard logic: "Current Streak" is the count of *completed* sequence.
  // If I haven't done today, the sequence ends at yesterday.
  // So we just check if there are missed days between LastCompleted and Yesterday.
  
  // Let's check gap between LastCompleted and Today.
  // If there is a scheduled day strictly between LastCompleted and Today, then streak is broken.
  // (If Today is scheduled, it doesn't break the streak yet, it's just not added to it).
  
  const diff = differenceInDays(today, lastCompletedDate);
  if (diff === 0) return true; 
  
  for (let i = 1; i < diff; i++) {
    const d = subDays(today, i); // Check days strictly between today and lastCompleted
    if (isScheduled(d, habit)) {
      return false; // Missed a day!
    }
  }
  
  return true;
};
