import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneState } from '../../types/voice';
import { VoiceService } from '../../services/voice/VoiceService';
import { VoiceCommandService } from '../../services/voice/VoiceCommandService';
import { 
  Mic, 
  MicOff, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Keyboard, 
  Send, 
  Volume2, 
  VolumeX,
  X,
  Sparkles
} from 'lucide-react';

export const VoiceButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [micState, setMicState] = useState<MicrophoneState>('idle');
  const [transcript, setTranscript] = useState('');
  const [commandResponse, setCommandResponse] = useState('');
  const [typedCommand, setTypedCommand] = useState('');
  const [isSTTSupported, setIsSTTSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setIsSTTSupported(VoiceService.isRecognitionSupported());
  }, []);

  const handleStartRecognition = () => {
    if (!isSTTSupported) {
      setMicState('error');
      setCommandResponse('Speech recognition is not supported on this browser. Please use the text input below.');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = VoiceService.getPreferences().language || 'en-US';

      recognition.onstart = () => {
        setMicState('listening');
        setTranscript('');
        setCommandResponse('');
      };

      recognition.onresult = async (event: any) => {
        setMicState('processing');
        const text = event.results[0][0].transcript;
        setTranscript(text);
        await executeCommand(text);
      };

      recognition.onerror = (event: any) => {
        console.error('[VoiceButton] Speech recognition error:', event.error);
        setMicState('error');
        if (event.error === 'not-allowed') {
          setCommandResponse('Microphone access denied. Please verify your browser site settings.');
        } else {
          setCommandResponse(`Speech error: ${event.error}. Please retry.`);
        }
      };

      recognition.onend = () => {
        if (micState === 'listening') {
          setMicState('idle');
        }
      };

      recognition.start();
    } catch (err) {
      console.error('[VoiceButton] Failed to start recognition:', err);
      setMicState('error');
      setCommandResponse('Failed to initialize microphone stream.');
    }
  };

  const handleStopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping recognition:', err);
      }
    }
    setMicState('idle');
  };

  const executeCommand = async (text: string) => {
    setMicState('processing');
    try {
      const result = await VoiceCommandService.processTranscript(text);
      
      // Log command execution metadata
      VoiceService.logVoiceCommand(result.actionDetected, text, result.success, result.message);

      if (result.success) {
        setMicState('success');
        setCommandResponse(result.message);
        
        // Speak response message back to user if voice is enabled!
        await VoiceService.speak(result.message, true);
        
        // Auto close after successful action in 4 seconds
        setTimeout(() => {
          setMicState('idle');
          setIsOpen(false);
        }, 4000);
      } else {
        setMicState('error');
        setCommandResponse(result.message);
        await VoiceService.speak(result.message, true);
      }
    } catch (err: any) {
      setMicState('error');
      const errText = err.message || 'Error processing speech command.';
      setCommandResponse(errText);
      VoiceService.logVoiceCommand('ERROR', text, false, errText);
    }
  };

  const handleSendTextCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedCommand.trim()) return;
    const commandText = typedCommand;
    setTypedCommand('');
    setTranscript(commandText);
    await executeCommand(commandText);
  };

  return (
    <div className="relative inline-block" id="voice-layer-widget">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
          isOpen
            ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
        }`}
        title="Nick OS Voice Command Panel"
      >
        <Mic className="w-4 h-4" />
        <span className="text-xs font-mono font-medium hidden md:inline">Voice</span>
      </button>

      {/* Dropdown / Modal Overlay */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-850 mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-neutral-200">
                Voice Pilot Cockpit
              </span>
            </div>
            <button
              onClick={() => {
                handleStopRecognition();
                setIsOpen(false);
              }}
              className="text-neutral-500 hover:text-neutral-300 p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core Mic UI Visualizer */}
          <div className="flex flex-col items-center justify-center p-4 bg-neutral-950 rounded-lg border border-neutral-850 mb-3 text-center min-h-[140px] relative overflow-hidden">
            {micState === 'idle' && (
              <div className="space-y-3 flex flex-col items-center">
                <button
                  onClick={handleStartRecognition}
                  className="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-850 flex items-center justify-center text-neutral-400 hover:text-amber-400 hover:border-amber-500/40 active:scale-95 transition-all cursor-pointer shadow-inner group"
                >
                  <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
                <p className="text-[10px] font-mono text-neutral-400">
                  {isSTTSupported ? "Tap microphone to speak command" : "Speech Recognition unsupported"}
                </p>
              </div>
            )}

            {micState === 'listening' && (
              <div className="space-y-3 flex flex-col items-center">
                <button
                  onClick={handleStopRecognition}
                  className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 active:scale-95 transition-all cursor-pointer animate-pulse"
                >
                  <Mic className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <p className="text-[10px] font-mono font-bold text-rose-400 tracking-wider uppercase">
                    Listening to Nick...
                  </p>
                </div>
              </div>
            )}

            {micState === 'processing' && (
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <p className="text-[10px] font-mono text-amber-400 animate-pulse">
                  Analyzing semantic intent...
                </p>
              </div>
            )}

            {micState === 'success' && (
              <div className="space-y-3 flex flex-col items-center animate-in zoom-in-95 duration-150">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-mono text-emerald-400 font-bold">
                  Command Executed
                </p>
              </div>
            )}

            {micState === 'error' && (
              <div className="space-y-3 flex flex-col items-center">
                <button
                  onClick={handleStartRecognition}
                  className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400 hover:text-rose-300 active:scale-95 transition-all cursor-pointer"
                >
                  <MicOff className="w-6 h-6" />
                </button>
                <p className="text-[10px] font-mono text-rose-400 font-bold">
                  Command Unresolved
                </p>
              </div>
            )}

            {/* Transcript Display inside visualizer */}
            {transcript && (
              <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-neutral-900/60 rounded border border-neutral-850/40 max-h-12 overflow-y-auto">
                <p className="text-[10px] font-mono text-neutral-300 italic text-left">
                  "{transcript}"
                </p>
              </div>
            )}
          </div>

          {/* Action response text */}
          {commandResponse && (
            <div className={`p-2.5 rounded text-xs font-mono mb-3 leading-relaxed border ${
              micState === 'error' 
                ? 'bg-rose-500/5 border-rose-500/20 text-rose-300' 
                : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
            }`}>
              {commandResponse}
            </div>
          )}

          {/* Text Command Input (Mandatory Fallback) */}
          <form onSubmit={handleSendTextCommand} className="flex gap-1.5">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-2.5 text-neutral-500">
                <Keyboard className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Type command (e.g. 'What's next?')"
                value={typedCommand}
                onChange={(e) => setTypedCommand(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={!typedCommand.trim()}
              className="p-2 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-neutral-950 rounded-lg active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Helper Guidelines list */}
          <div className="mt-3 pt-2 border-t border-neutral-850 flex justify-between items-center text-[9px] font-mono text-neutral-500">
            <span>Commands: "What's next", "Pause", "Resume", "Done"</span>
          </div>
        </div>
      )}
    </div>
  );
};
