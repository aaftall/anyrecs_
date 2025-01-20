import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic, X, Square } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const DynamicWaveform = ({ audioBlob }) => {
  const [waveformData, setWaveformData] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    const processAudioData = async () => {
      if (!audioBlob) return;

      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);

        const dataPoints = 5000;
        const blockSize = Math.floor(channelData.length / dataPoints);
        const waveform = [];

        for (let i = 0; i < dataPoints; i++) {
          const start = i * blockSize;
          const end = start + blockSize;
          const chunk = channelData.slice(start, end);
          const amplitude = Math.max(...chunk.map(Math.abs));
          waveform.push(amplitude);
        }

        setWaveformData(waveform);
      } catch (error) {
        console.error('Error processing audio data:', error);
      }
    };

    processAudioData();
  }, [audioBlob]);

  useEffect(() => {
    if (canvasRef.current && waveformData.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;

      const stepSize = width / waveformData.length;

      ctx.beginPath();
      waveformData.forEach((amplitude, index) => {
        const x = index * stepSize;
        const y = (1 - amplitude) * height / 2;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }
  }, [waveformData]);

  return (
    <canvas ref={canvasRef} width="300" height="30" className="ml-2" />
  );
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Tool = ({ tool, userId, isAuthenticated, onRemove }) => {
  const [hasAudio, setHasAudio] = useState(false);
  const [isCheckingAudio, setIsCheckingAudio] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [stream, setStream] = useState(null);

  const audioRef = useRef(new Audio());
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const checkToolForAudio = async () => {
    setIsCheckingAudio(true);
    try {
      const response = await axios.get(`${API_URL}/tool/${tool.id}/review`, {
        responseType: 'blob',
        withCredentials: true,
        params: {
          user_id: userId,
          data: true
        },
      });
      const blob = new Blob([response.data], { type: 'audio/webm' });
      setAudioBlob(blob);
      setHasAudio(true);
    } catch (error) {
      if (error.response && error.response.status !== 404) {
        console.error(`Error checking audio for tool ${tool.id}:`, error);
      }
      setHasAudio(false);
    }
    setIsCheckingAudio(false);
  };

  useEffect(() => {
    checkToolForAudio();
  }, [tool.id, userId]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prevTime) => {
          if (prevTime >= 10) {
            stopRecording();
            return 10; // FIXME: use env var
          }
          return prevTime + 0.1;
        });
      }, 100);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const playRecommendation = async () => {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);

        audioRef.current.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };
      } catch (error) {
        console.error('Error playing review:', error);
      }
    }
  };

  const startRecording = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(newStream);
      mediaRecorderRef.current = new MediaRecorder(newStream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        sendAudioToServer(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Automatically stop recording after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 10000); // FIXME: use env var
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks in the stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  // Cleanup function to ensure the stream is stopped when the component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const sendAudioToServer = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'review.webm');
      await axios.post(`${API_URL}/tool/${tool.id}/review`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setHasAudio(true);
    } catch (error) {
      console.error('Error sending audio to server:', error);
    }
  };

  const deleteAudio = async () => {
    try {
      await axios.delete(`${API_URL}/tool/${tool.id}/review`, {
        withCredentials: true,
        params: { user_id: userId }
      });
      setHasAudio(false);
      setAudioBlob(null);
    } catch (error) {
      console.error('Error deleting audio:', error);
    }
  };

  const RecordingProgressBar = () => (
    <div className="flex items-center ml-2">
      <div className="text-sm mr-2">
        {10 - Math.floor(recordingTime)}s left
      </div>
      <div className="w-20 h-2 bg-gray-300 rounded-full">
        <div
          className="h-full bg-red-500 rounded-full"
          style={{ width: `${(recordingTime / 10) * 100}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-600 rounded-lg p-4 text-white relative">
      <div className="flex items-center pr-16">
        <div className="flex items-center w-48 flex-shrink-0">
          <img className="text-3xl mr-3 w-8 text-center" alt="tool icon" src={tool.logo} />
          <div>
            <span className="text-sm block">{tool.category || "Tool"}</span>
            <span className="text-xl font-semibold">{tool.name}</span>
          </div>
        </div>
        <div className="flex items-center flex-grow">
          {isCheckingAudio ? (
            <div className="text-sm">Checking audio...</div>
          ) : hasAudio ? (
            <>
              <button
                onClick={playRecommendation}
                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors duration-200 flex-shrink-0"
                aria-label={`${isPlaying ? 'Pause' : 'Play'} recommendation for ${tool.name}`}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <div className="flex-grow">
                <DynamicWaveform audioBlob={audioBlob} />
              </div>
              <div className="ml-2 text-sm">
                {formatTime(currentTime)}
              </div>
            </>
          ) : (
            <div className="flex items-center">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="bg-red-500 hover:bg-red-700 rounded-full p-2 transition-colors duration-200 flex-shrink-0 mr-2"
                  aria-label={`Stop recording for ${tool.name}`}
                >
                  <Square size={20} />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors duration-200 flex-shrink-0"
                  aria-label={`Record audio for ${tool.name}`}
                >
                  <Mic size={20} />
                </button>
              )}
              {isRecording && <RecordingProgressBar />}
            </div>
          )}
        </div>
      </div>
      {isAuthenticated && (
        <div className="absolute top-2 right-2 flex items-center space-x-2">
          {hasAudio && !isRecording && (
            <button
              onClick={startRecording}
              className="text-yellow-500 hover:text-yellow-700 transition-colors duration-200"
              aria-label={`Re-record audio for ${tool.name}`}
            >
              <Mic size={14} />
            </button>
          )}
          {isRecording &&
          <>
            <RecordingProgressBar />
            <button
              onClick={stopRecording}
              className="text-red-500 hover:text-red-700 transition-colors duration-200"
              aria-label={`Stop recording for ${tool.name}`}
            >
              <Square size={14} />
            </button>
          </>
          }
          <button
            onClick={() => onRemove(tool.id)}
            className="text-red-500 hover:text-red-700 transition-colors duration-200"
            aria-label={`Remove ${tool.name}`}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Tool;