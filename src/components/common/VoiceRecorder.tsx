import React, { useState, useRef } from 'react';
import { Mic, Square, Save } from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '../../context/LanguageContext';

export const VoiceRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioURL(URL.createObjectURL(blob));
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
  };

  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isRecording ? 'danger' : 'secondary'}
        size="sm"
        onClick={isRecording ? stopRecording : startRecording}
        icon={isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      >
        {isRecording ? t('stopRec', 'STOP REC') : t('recMemo', 'REC MEMO')}
      </Button>
      {audioURL && (
        <a href={audioURL} download="memo.webm" className="text-xs text-emerald-400 underline">
          Download
        </a>
      )}
    </div>
  );
};
