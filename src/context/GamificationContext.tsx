import React, { createContext, useContext, useState, useEffect } from 'react';

interface GamificationState {
  streak: number;
  totalCompletedTasks: number;
  lastCompletedDate: string | null;
}

interface GamificationContextType {
  gamification: GamificationState;
  recordTaskCompletion: () => void;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gamification, setGamification] = useState<GamificationState>(() => {
    const saved = localStorage.getItem('nickos_gamification');
    return saved ? JSON.parse(saved) : { streak: 0, totalCompletedTasks: 0, lastCompletedDate: null };
  });

  useEffect(() => {
    localStorage.setItem('nickos_gamification', JSON.stringify(gamification));
  }, [gamification]);

  const recordTaskCompletion = () => {
    const today = new Date().toISOString().split('T')[0];
    setGamification(prev => {
      let newStreak = prev.streak;
      if (prev.lastCompletedDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (prev.lastCompletedDate === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }
      
      return {
        streak: newStreak,
        totalCompletedTasks: prev.totalCompletedTasks + 1,
        lastCompletedDate: today,
      };
    });
  };

  return (
    <GamificationContext.Provider value={{ gamification, recordTaskCompletion }}>
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (!context) throw new Error('useGamification must be used within GamificationProvider');
  return context;
};
