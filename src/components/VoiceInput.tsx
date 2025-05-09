/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Square, Check, CircleSlash, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Create a unified interface for speech recognition services
interface SpeechRecognitionService {
  start: () => void;
  stop: () => void;
  cleanup: () => void;
  isAzureService: boolean;
}

// Azure Speech specific types
interface SpeechConfig {
  speechRecognitionLanguage: string;
  [key: string]: any;
}

interface AudioConfig {
  [key: string]: any;
}

interface SpeechRecognitionResult {
  reason: number;
  text: string;
  errorDetails?: string;
  [key: string]: any;
}

interface AzureSpeechRecognizer {
  recognizeOnceAsync: (
    successCallback: (result: SpeechRecognitionResult) => void, 
    errorCallback: (error: unknown) => void
  ) => void;
  stopContinuousRecognitionAsync: () => void;
  close: () => void;
  [key: string]: any;
}

interface SpeechSDKType {
  SpeechConfig: {
    fromSubscription: (key: string, region: string) => SpeechConfig;
    [key: string]: any;
  };
  AudioConfig: {
    fromDefaultMicrophoneInput: () => AudioConfig;
    [key: string]: any;
  };
  SpeechRecognizer: {
    new (speechConfig: SpeechConfig, audioConfig: AudioConfig): AzureSpeechRecognizer;
    [key: string]: any;
  };
  ResultReason: {
    RecognizedSpeech: number;
    NoMatch: number;
    [key: string]: any;
  };
  CancellationReason: {
    [key: string]: string | number;
  };
  [key: string]: any;
}

// Voice input props
interface VoiceInputProps {
  onTextCaptured: (text: string) => void;
  disabled?: boolean;
  onProvisionalTextUpdate?: (text: string | null) => void;
}

// Azure Speech Recognition Service implementation
class AzureSpeechRecognitionService implements SpeechRecognitionService {
  private recognizer: AzureSpeechRecognizer | null = null;
  private speechSDK: SpeechSDKType;
  private timeout: NodeJS.Timeout | null = null;
  private azureKey: string;
  private azureRegion: string;
  private onResult: (text: string) => void;
  private onError: (error: any) => void;
  private toast: any;

  constructor(
    speechSDK: SpeechSDKType, 
    azureKey: string,
    azureRegion: string,
    onResult: (text: string) => void,
    onError: (error: any) => void,
    toast: any
  ) {
    this.speechSDK = speechSDK;
    this.azureKey = azureKey;
    this.azureRegion = azureRegion;
    this.onResult = onResult;
    this.onError = onError;
    this.toast = toast;
  }

  get isAzureService() {
    return true;
  }

  start() {
    try {
      // Create speech config
      const speechConfig = this.speechSDK.SpeechConfig.fromSubscription(this.azureKey, this.azureRegion);
      speechConfig.speechRecognitionLanguage = 'en-US';

      // Create audio config
      const audioConfig = this.speechSDK.AudioConfig.fromDefaultMicrophoneInput();

      // Create recognizer
      this.recognizer = new this.speechSDK.SpeechRecognizer(speechConfig, audioConfig);

      // Add timeout
      this.timeout = setTimeout(() => {
        this.handleTimeout();
      }, 10000);

      // Start recognition
      this.recognizer.recognizeOnceAsync(
        (result) => {
          this.clearTimeout();
          if (result.reason === this.speechSDK.ResultReason.RecognizedSpeech) {
            const recognizedText = result.text;
            this.onResult(recognizedText);
          } else if (result.reason === this.speechSDK.ResultReason.NoMatch) {
            this.toast({
              title: 'Recognition Failed',
              description: 'Could not recognize speech.',
              variant: 'default',
            });
            this.onError(new Error("No speech recognized"));
          } else {
            if (result.reason === this.speechSDK.CancellationReason.Error) {
              this.toast({ 
                title: 'Recognition Error', 
                description: result.errorDetails, 
                variant: 'destructive' 
              });
            }
            this.onError(new Error(`Azure recognition canceled: ${result.reason}`));
          }
          this.cleanup();
        },
        (error) => {
          this.clearTimeout();
          let errorMessage = 'An error occurred during speech recognition.';
          let errorTitle = 'Recognition Error';
          
          if (error instanceof Error && (error.message.includes('network') || error.message.includes('connection'))) {
            errorTitle = 'Network Error';
            errorMessage = 'Unable to connect to Azure Speech service. Please check your internet connection.';
          }
          
          this.toast({
            title: errorTitle,
            description: errorMessage,
            variant: 'destructive',
          });
          
          this.onError(error);
          this.cleanup();
        }
      );
    } catch (error) {
      this.clearTimeout();
      this.toast({
        title: 'Recognition Error',
        description: 'Failed to initialize Azure speech recognition.',
        variant: 'destructive',
      });
      this.onError(error);
      this.cleanup();
    }
  }

  stop() {
    this.cleanup();
  }

  cleanup() {
    this.clearTimeout();
    if (this.recognizer) {
      try {
        this.recognizer.close();
      } catch (error) {
        console.warn('Error closing Azure recognizer:', error);
      }
      this.recognizer = null;
    }
  }

  private clearTimeout() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  private handleTimeout() {
    if (this.recognizer) {
      try {
        this.recognizer.close();
        this.recognizer = null;
      } catch (e) {
        console.error('Error aborting Azure recognition on timeout:', e);
      }
      this.toast({
        title: 'Recognition Timeout',
        description: 'Speech recognition timed out. Please check your internet connection and try again.',
        variant: 'destructive',
      });
      this.onError(new Error("Recognition timeout"));
    }
  }
}

// Browser Speech Recognition Service implementation
class BrowserSpeechRecognitionService implements SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private timeout: NodeJS.Timeout | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private isSpeaking = false;
  private isIntentionalAbort = false;
  private onResult: (text: string) => void;
  private onError: (error: any) => void;
  private toast: any;

  constructor(
    onResult: (text: string) => void,
    onError: (error: any) => void,
    toast: any
  ) {
    this.onResult = onResult;
    this.onError = onError;
    this.toast = toast;
  }

  get isAzureService() {
    return false;
  }

  async start() {
    // Check microphone permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      this.toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access to use speech recognition.',
        variant: 'destructive',
      });
      this.onError(error);
      return;
    }

    try {
      // Use type assertion for SpeechRecognition
      const SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition) as typeof window.SpeechRecognition;
      
      if (!SpeechRecognition) {
        this.toast({
          title: 'Not Supported',
          description: 'Speech recognition is not supported in this browser.',
          variant: 'destructive',
        });
        this.onError(new Error("Speech recognition not supported"));
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      
      // Add timeout
      this.timeout = setTimeout(() => {
        this.handleTimeout();
      }, 10000);

      // Set up event handlers
      this.setupEventHandlers();
      
      // Start recognition
      this.isIntentionalAbort = false;
      this.recognition.start();
    } catch (error) {
      this.clearTimeout();
      this.toast({
        title: 'Recognition Error',
        description: 'Failed to initialize speech recognition.',
        variant: 'destructive',
      });
      this.onError(error);
    }
  }

  stop() {
    this.isIntentionalAbort = true;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (error) {
        console.warn('Error aborting browser recognition:', error);
      }
    }
    this.cleanup();
  }

  cleanup() {
    this.clearTimeout();
    this.clearSilenceTimer();
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (error) {
        console.warn('Error cleaning up browser recognition:', error);
      }
      this.recognition = null;
    }
  }

  private clearTimeout() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    
    if (this.isSpeaking) {
      this.silenceTimer = setTimeout(() => {
        console.log('Auto-submitting after 3 seconds of silence');
        this.isIntentionalAbort = true;
        if (this.recognition) {
          this.recognition.abort();
        }
      }, 3000);
    }
  }

  private handleTimeout() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        console.error('Error aborting recognition on timeout:', e);
      }
      this.toast({
        title: 'Recognition Timeout',
        description: 'Speech recognition timed out. Please check your internet connection and try again.',
        variant: 'destructive',
      });
      this.onError(new Error("Recognition timeout"));
    }
  }

  private setupEventHandlers() {
    if (!this.recognition) return;

    this.recognition.onspeechstart = () => {
      this.isSpeaking = true;
      this.clearSilenceTimer();
    };
    
    this.recognition.onspeechend = () => {
      if (this.isSpeaking) {
        this.resetSilenceTimer();
      }
    };
    
    this.recognition.onaudiostart = () => {
      this.resetSilenceTimer();
    };
    
    this.recognition.onresult = (event) => {
      this.clearTimeout();
      this.clearSilenceTimer();
      
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        this.onResult(transcript);
      } else {
        this.toast({
          title: 'Recognition Failed',
          description: 'Could not recognize speech.',
          variant: 'default'
        });
        this.onError(new Error("No speech recognized"));
      }
    };

    this.recognition.onerror = (event) => {
      this.clearTimeout();
      
      if (this.isIntentionalAbort) {
        if (event.error !== 'aborted') {
          console.warn('Unexpected error type following intentional abort:', event.error, event.message);
        }
        return;
      }
      
      let errorMessage = `Error: ${event.error}`;
      let errorTitle = 'Recognition Error';
      
      if (event.error === 'network') {
        errorTitle = 'Network Error';
        errorMessage = 'Unable to connect to speech recognition service. Please check your internet connection and try again.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone access was denied. Please allow microphone access and try again.';
      } else if (event.error === 'aborted') {
        errorMessage = 'Speech recognition was aborted.';
      } else if (event.error === 'audio-capture') {
        errorMessage = 'No microphone was found or microphone is not working properly.';
      } else if (event.error === 'no-speech') {
        errorMessage = 'No speech was detected. Please try again.';
      }
      
      this.toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
      
      this.onError(new Error(errorMessage));
    };

    this.recognition.onend = () => {
      this.clearTimeout();
      this.isIntentionalAbort = false;
    };
  }
}

// Factory function to create the appropriate speech recognition service
async function createSpeechRecognitionService(
  useBrowserFallback: boolean,
  azureKeyValid: boolean | null,
  sdkReady: boolean,
  speechSDKRef: React.RefObject<SpeechSDKType | null>,
  azureKey: string,
  azureRegion: string,
  onResult: (text: string) => void,
  onError: (error: any) => void,
  toast: any,
  networkConnected: boolean
): Promise<SpeechRecognitionService | null> {
  // If we're offline, can't use any service
  if (!networkConnected) {
    toast({
      title: 'Network Offline',
      description: 'You appear to be offline. Speech recognition requires an internet connection.',
      variant: 'destructive',
    });
    return null;
  }

  // If we should use browser fallback or Azure SDK isn't ready or key is invalid
  if (useBrowserFallback || !sdkReady || !azureKeyValid) {
    return new BrowserSpeechRecognitionService(onResult, onError, toast);
  }

  // Double check the SDK is properly initialized
  if (!speechSDKRef.current || typeof speechSDKRef.current.SpeechConfig === 'undefined') {
    return new BrowserSpeechRecognitionService(onResult, onError, toast);
  }

  // Use Azure service
  return new AzureSpeechRecognitionService(
    speechSDKRef.current,
    azureKey,
    azureRegion,
    onResult,
    onError,
    toast
  );
}

const VoiceInput = ({ onTextCaptured, disabled = false, onProvisionalTextUpdate }: VoiceInputProps) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [useBrowserFallback, setUseBrowserFallback] = useState(false);
  const [azureKeyValid, setAzureKeyValid] = useState<boolean | null>(null);
  const [networkConnected, setNetworkConnected] = useState(navigator.onLine);
  const [speechServiceConnected, setSpeechServiceConnected] = useState(true);
  const speechSDKRef = useRef<SpeechSDKType | null>(null);
  const recognitionServiceRef = useRef<SpeechRecognitionService | null>(null);
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [provisionalText, setProvisionalText] = useState<string | null>(null);

  // Azure Speech API key
  const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY || '';
  const AZURE_SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastus';

  // Utility type for loadSpeechSDK result
  type LoadSdkResult = {
    sdkLoaded: boolean;
    keyValid: boolean;
    useFallback: boolean;
  };
  
  // Function to load the Azure Speech SDK
  const loadSpeechSDK = async (): Promise<LoadSdkResult> => {
    let localSdkLoaded = false;
    let localKeyValid = false;
    let localUseFallback = false;

    if (speechSDKRef.current) {
      return {
        sdkLoaded: sdkReady,
        keyValid: azureKeyValid ?? false,
        useFallback: useBrowserFallback
      };
    }

    try {
      setIsLoading(true);
      
      // First check network connectivity
      const isConnected = await checkNetworkConnectivity();
      setNetworkConnected(isConnected);
      
      if (!isConnected) {
        setUseBrowserFallback(true);
        localUseFallback = true;
        return { sdkLoaded: false, keyValid: false, useFallback: true };
      }
      
      try {
        const speechModule = await import('microsoft-cognitiveservices-speech-sdk');
        
        if (!speechModule) {
          throw new Error('Speech SDK module failed to load');
        }
        
        speechSDKRef.current = speechModule;
        setSdkReady(true);
        localSdkLoaded = true;
        
        // Validate Azure key format
        const isValidKey = AZURE_SPEECH_KEY && 
          AZURE_SPEECH_KEY.length >= 10 && 
          !/\s/.test(AZURE_SPEECH_KEY);
        
        setAzureKeyValid(isValidKey);
        localKeyValid = isValidKey;
        
        if (!isValidKey) {
          setUseBrowserFallback(true);
          localUseFallback = true;
        }

        return {
          sdkLoaded: localSdkLoaded,
          keyValid: localKeyValid,
          useFallback: localUseFallback || useBrowserFallback
        };
      } catch (sdkError) {
        console.error('[loadSpeechSDK] Error during dynamic import:', sdkError);
        setUseBrowserFallback(true);
        localUseFallback = true;
      }
    } catch (error) {
      console.error('[loadSpeechSDK] Overall error during SDK loading:', error);
      toast({
        title: 'Speech Recognition Fallback',
        description: 'Using browser speech recognition as fallback.',
      });
      setUseBrowserFallback(true);
      localUseFallback = true;
    } finally {
      setIsLoading(false);
    }
    
    return {
      sdkLoaded: localSdkLoaded,
      keyValid: localKeyValid,
      useFallback: localUseFallback || useBrowserFallback
    };
  };

  // Set up network status listener
  useEffect(() => {
    const handleNetworkChange = () => {
      checkNetworkConnectivity().then(isConnected => {
        setNetworkConnected(isConnected);
        console.log(`Network status changed: ${isConnected ? 'online' : 'offline'}`);
      });
    };
    
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      // Clean up recognizer if active
      if (recognitionServiceRef.current) {
        recognitionServiceRef.current.cleanup();
        recognitionServiceRef.current = null;
      }
      
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  // Network connectivity check with multiple endpoints
  const checkNetworkConnectivity = async (): Promise<boolean> => {
    // First check navigator.onLine
    const isOnline = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' 
      ? navigator.onLine 
      : true;
    
    if (!isOnline) {
      return false;
    }
    
    // Try multiple endpoints to verify actual connectivity
    const testUrls = [
      `https://www.google.com/generate_204?nocache=${Date.now()}`,
      `https://www.microsoft.com/favicon.ico?nocache=${Date.now()}`,
      `https://www.cloudflare.com/favicon.ico?nocache=${Date.now()}`
    ];
    
    for (const testUrl of testUrls) {
      try {
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          credentials: 'omit',
          signal: AbortSignal.timeout(2000)
        });
        
        return true;
      } catch (error) {
        // Continue to the next URL
      }
    }
    
    return false;
  };
  
  // Define confirmSubmission first
  const confirmSubmission = useCallback(() => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
    if (provisionalText !== null) {
      onTextCaptured(provisionalText);
      setProvisionalText(null);
      onProvisionalTextUpdate?.(null);
      setIsListening(false);
    }
  }, [provisionalText, onTextCaptured, onProvisionalTextUpdate]);

  // Then define handleProvisionalCapture with confirmSubmission as a dependency
  const handleProvisionalCapture = useCallback((text: string) => {
    if (!text) return;
    console.log('[handleProvisionalCapture] Provisionally captured:', text);
    setProvisionalText(text);
    onProvisionalTextUpdate?.(text);
    setIsListening(false);

    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
    }

    autoSubmitTimerRef.current = setTimeout(() => {
      confirmSubmission();
    }, 3000);
  }, [onProvisionalTextUpdate, confirmSubmission]);

  const handleRecognitionError = useCallback((error: any) => {
    setIsListening(false);
    setProvisionalText(null);
    onProvisionalTextUpdate?.(null);
    
    if (recognitionServiceRef.current) {
      recognitionServiceRef.current.cleanup();
      recognitionServiceRef.current = null;
    }
  }, [onProvisionalTextUpdate]);

  const toggleListening = async () => {
    if (disabled) return;
    
    if (provisionalText !== null) {
      confirmSubmission();
      return;
    }

    if (isListening) {
      // Stop listening
      if (recognitionServiceRef.current) {
        recognitionServiceRef.current.stop();
        recognitionServiceRef.current = null;
      }
      
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
      }
      
      setProvisionalText(null);
      setIsListening(false);
    } else {
      // Start listening
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        toast({
          title: 'Network Offline',
          description: 'You appear to be offline. Speech recognition requires an internet connection.',
          variant: 'destructive',
        });
        return;
      }
      
      setIsListening(true);
      toast({
        title: 'Listening...',
        description: 'Speak now to describe your transaction.',
      });

      try {
        // Load SDK if needed
        let loadResult: LoadSdkResult | null = null;
        if (!sdkReady && !useBrowserFallback) {
          loadResult = await loadSpeechSDK();
        }
        
        // Create recognition service
        const service = await createSpeechRecognitionService(
          loadResult ? loadResult.useFallback : useBrowserFallback,
          loadResult ? loadResult.keyValid : azureKeyValid,
          loadResult ? loadResult.sdkLoaded : sdkReady,
          speechSDKRef,
          AZURE_SPEECH_KEY,
          AZURE_SPEECH_REGION,
          handleProvisionalCapture,
          handleRecognitionError,
          toast,
          networkConnected
        );
        
        if (!service) {
          setIsListening(false);
          return;
        }
        
        recognitionServiceRef.current = service;
        service.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: 'Recognition Error',
          description: 'Failed to start speech recognition. Please try again.',
          variant: 'destructive',
        });
        setIsListening(false);
        
        // Try browser fallback as last resort
        if (!useBrowserFallback) {
          setUseBrowserFallback(true);
          setTimeout(() => {
            if (!isListening) {
              toggleListening();
            }
          }, 1000);
        }
      }
    }
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={toggleListening}
      disabled={disabled || isLoading}
      className={`rounded-full transition-colors duration-200 
        ${provisionalText !== null 
          ? 'bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700'
          : isListening 
          ? 'bg-red-100 text-red-500 hover:bg-red-200 hover:text-red-600'
          : ''
        }`}
      aria-label={provisionalText !== null ? "Confirm Input" : isListening ? "Stop Listening" : "Start Listening"}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : provisionalText !== null ? (
        <Check className="h-5 w-5" />
      ) : isListening ? (
        <Square className="h-5 w-5" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
};

export default VoiceInput;