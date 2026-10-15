export const playSuccessChime = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const playNote = (freq: number, startTime: number, duration: number) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.1, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const now = audioContext.currentTime;
  playNote(523.25, now, 0.1); // C5
  playNote(659.25, now + 0.1, 0.1); // E5
  playNote(783.99, now + 0.2, 0.2); // G5
};
