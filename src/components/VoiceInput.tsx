import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Square, Check, CircleSlash, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Azure Speech SDK type
type SpeechSDKType = any;

interface VoiceInputProps {
  onTextCaptured: (text: string) => void;
  disabled?: boolean;
}

const VoiceInput = ({ onTextCaptured, disabled = false }: VoiceInputProps) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [useBrowserFallback, setUseBrowserFallback] = useState(false);
  const [azureKeyValid, setAzureKeyValid] = useState<boolean | null>(null);
  const [networkConnected, setNetworkConnected] = useState(navigator.onLine);
  const [speechServiceConnected, setSpeechServiceConnected] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const recognizerRef = useRef<any>(null);
  const speechSDKRef = useRef<SpeechSDKType | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveTimeoutCountRef = useRef(0);
  const isIntentionalAbortRef = useRef(false);
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [provisionalText, setProvisionalText] = useState<string | null>(null);

  // Azure Speech API key - This should be moved to environment variables in production
  const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY || '';
  const AZURE_SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastus';

  // --- MODIFIED: loadSpeechSDK returns load status --- 
  type LoadSdkResult = {
    sdkLoaded: boolean;
    keyValid: boolean;
    useFallback: boolean;
  };
  
  const loadSpeechSDK = async (): Promise<LoadSdkResult> => {
    let localSdkLoaded = false;
    let localKeyValid = false;
    let localUseFallback = false;

    if (speechSDKRef.current) {
      // If already loaded, check existing state (which should be reliable by now)
      return {
        sdkLoaded: sdkReady,
        keyValid: azureKeyValid ?? false, // Handle null case
        useFallback: useBrowserFallback
      };
    }

    try {
      setIsLoading(true);
      
      // First check network connectivity
      console.log('[loadSpeechSDK] Checking initial network connectivity...');
      const isConnected = await checkNetworkConnectivity();
      setNetworkConnected(isConnected);
      
      if (!isConnected) {
        console.warn('[loadSpeechSDK] Initial network check failed. Setting useBrowserFallback=true.');
        setUseBrowserFallback(true);
        localUseFallback = true;
        return { sdkLoaded: false, keyValid: false, useFallback: true };
      }
      
      // Dynamically import the Speech SDK with explicit error handling
      try {
        // Add a console log to track SDK loading attempt
        console.log(`[loadSpeechSDK] Attempting dynamic import of 'microsoft-cognitiveservices-speech-sdk'...`);
        const speechModule = await import('microsoft-cognitiveservices-speech-sdk');
        
        // The SDK doesn't have a default export, so we use the module directly
        if (!speechModule) {
          console.error('[loadSpeechSDK] Dynamic import returned null/undefined.');
          throw new Error('Speech SDK module failed to load');
        }
        
        // Store in ref and update state
        speechSDKRef.current = speechModule;
        console.log('[loadSpeechSDK] SDK module loaded successfully. speechSDKRef.current set.');
        setSdkReady(true); // Still set state for other component logic
        localSdkLoaded = true;
        
        console.log(`[loadSpeechSDK] Validating Azure Key (length: ${AZURE_SPEECH_KEY?.length}) and Region: ${AZURE_SPEECH_REGION}`);
        // Extremely lenient validation for Azure key format
        // Azure Speech Service keys can have various formats including:
        // - 32-character hex strings
        // - Base64-encoded strings with special characters
        // - JWT-like formats with periods as separators
        const isValidKey = AZURE_SPEECH_KEY && 
          // Check for minimum reasonable length (some valid keys can be shorter)
          AZURE_SPEECH_KEY.length >= 10 && 
          // Only check for whitespace and a few obviously invalid characters
          // Allow most special characters that could be part of valid keys
          !/\s/.test(AZURE_SPEECH_KEY);
        
        setAzureKeyValid(isValidKey); // Still set state
        localKeyValid = isValidKey;
        
        if (!isValidKey) {
          console.warn(`[loadSpeechSDK] Azure Key validation FAILED. Length: ${AZURE_SPEECH_KEY?.length}. Setting useBrowserFallback=true.`);
          setUseBrowserFallback(true); // Still set state
          localUseFallback = true;
        } else {
          console.log('[loadSpeechSDK] Azure Key validation PASSED.');
        }

        return {
          sdkLoaded: localSdkLoaded,
          keyValid: localKeyValid,
          useFallback: localUseFallback || useBrowserFallback // Combine local flag with state
        };
      } catch (sdkError) {
        console.error('[loadSpeechSDK] Error during dynamic import or processing:', sdkError);
        console.warn('[loadSpeechSDK] Setting useBrowserFallback=true due to SDK load error.');
        setUseBrowserFallback(true);
        localUseFallback = true;
        // Don't re-throw here, return status instead
        // throw sdkError; 
      }
    } catch (error) {
      console.error('[loadSpeechSDK] Overall error during SDK loading:', error);
      toast({
        title: 'Speech Recognition Fallback',
        description: 'Using browser speech recognition as fallback.',
      });
      console.warn('[loadSpeechSDK] Setting useBrowserFallback=true due to overall error.');
      setUseBrowserFallback(true);
      localUseFallback = true;
      // return null;
    } finally {
      setIsLoading(false);
    }
    
    return {
      sdkLoaded: localSdkLoaded,
      keyValid: localKeyValid,
      useFallback: localUseFallback || useBrowserFallback // Combine local flag with state
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
      if (recognizerRef.current) {
        try {
          // Try different methods to stop recognition based on what's available
          if (recognizerRef.current.stopContinuousRecognitionAsync) {
            recognizerRef.current.stopContinuousRecognitionAsync();
          } else if (recognizerRef.current.close) {
            recognizerRef.current.close();
          } else {
            // Last resort for browser SpeechRecognition
            recognizerRef.current.abort?.();
          }
        } catch (error) {
          console.warn('Error stopping recognition during cleanup:', error);
        }
        recognizerRef.current = null;
      }
      
      // Remove event listeners
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  // Enhanced network connectivity check with multiple endpoints
  const checkNetworkConnectivity = async (): Promise<boolean> => {
    // First check navigator.onLine
    const isOnline = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' 
      ? navigator.onLine 
      : true; // Assume online if we can't detect status
    
    if (!isOnline) {
      console.log('Device reports offline status');
      return false;
    }
    
    // Try multiple endpoints to verify actual connectivity
    // This helps bypass potential CORS or firewall issues with a single endpoint
    const testUrls = [
      // Google's connectivity test endpoint
      `https://www.google.com/generate_204?nocache=${Date.now()}`,
      // Microsoft's connectivity test endpoint (relevant for Azure services)
      `https://www.microsoft.com/favicon.ico?nocache=${Date.now()}`,
      // Cloudflare's connectivity test
      `https://www.cloudflare.com/favicon.ico?nocache=${Date.now()}`
    ];
    
    // Try each URL in sequence until one succeeds
    for (const testUrl of testUrls) {
      try {
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          mode: 'no-cors', // Important for cross-origin requests
          cache: 'no-store',
          credentials: 'omit', // Don't send cookies
          // Short timeout to avoid hanging
          signal: AbortSignal.timeout(2000)
        });
        
        console.log(`Network connectivity test successful with ${testUrl}`);
        return true;
      } catch (error) {
        console.warn(`Network connectivity test failed for ${testUrl}:`, error);
        // Continue to the next URL
      }
    }
    
    // If all tests failed, we're likely offline
    console.error('All network connectivity tests failed');
    return false;
  };
  
  // Check specifically for speech recognition service connectivity
  const checkSpeechServiceConnectivity = async (): Promise<boolean> => {
    // First check general connectivity
    const hasGeneralConnectivity = await checkNetworkConnectivity();
    if (!hasGeneralConnectivity) {
      return false;
    }
    
    // For Azure Speech service, we can try to ping a Microsoft endpoint
    // This doesn't guarantee the speech service is available but is a better check
    try {
      // Use a more reliable endpoint for testing connectivity
      // The favicon.ico endpoint returns 404 but that's actually fine for connectivity testing
      // We just need to know if we can reach the Azure service domain
      const testUrl = `https://${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/favicon.ico?nocache=${Date.now()}`;
      
      try {
        // First try with no-cors mode which is more permissive but doesn't give us response details
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          credentials: 'omit',
          signal: AbortSignal.timeout(3000)
        });
        
        // If we get here, the request didn't throw an error, which means we reached the server
        // Even if we get a 404, that's actually fine - it means we reached the server
        console.log('Speech service connectivity test successful (no-cors mode)');
        return true;
      } catch (fetchError) {
        // The no-cors request failed, but this could be due to CORS issues rather than connectivity
        // Let's try a different approach with cors mode and handle the 404 explicitly
        console.warn('First connectivity test attempt failed, trying alternative approach:', fetchError);
        
        try {
          // Try a regular fetch that will give us more response details
          const corsResponse = await fetch(testUrl, {
            method: 'HEAD',
            cache: 'no-store',
            credentials: 'omit',
            signal: AbortSignal.timeout(3000)
          });
          
          // For the favicon.ico endpoint, a 404 is expected and means the server is reachable
          // Any response (even an error status) means we successfully contacted the server
          console.log('Speech service connectivity test successful with status:', corsResponse.status);
          return true;
        } catch (corsError) {
          // Try one more approach - sometimes the HEAD method is blocked but GET works
          try {
            const getResponse = await fetch(`https://${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken?nocache=${Date.now()}`, {
              method: 'GET',
              cache: 'no-store',
              credentials: 'omit',
              // We expect this to fail with 401 Unauthorized, but that means the server is reachable
              signal: AbortSignal.timeout(3000)
            });
            
            // If we get here with any status code, the server is reachable
            console.log('Speech service connectivity test successful with token endpoint, status:', getResponse.status);
            return true;
          } catch (getError) {
            // All three attempts failed, rethrow to be caught by outer catch
            console.error('All connectivity test attempts failed:', getError);
            throw getError;
          }
        }
      }
    } catch (error) {
      console.warn('Speech service connectivity test failed:', error);
      // Even if this specific test fails, the service might still be available
      // So we'll return the general connectivity result
      return hasGeneralConnectivity;
    }
  };

  // Simplified online check for synchronous contexts
  const checkOnlineStatus = (): boolean => {
    return networkConnected;
  };

  const startAzureSpeechRecognition = async () => {
    // Perform a more thorough connectivity check specifically for speech services
    const isSpeechServiceAvailable = await checkSpeechServiceConnectivity();
    
    if (!isSpeechServiceAvailable) {
      console.error('Speech service connectivity check failed, cannot use Azure Speech recognition');
      toast({
        title: 'Speech Service Unavailable',
        description: 'Cannot connect to speech recognition service. Please try again later.',
        variant: 'destructive',
      });
      setIsListening(false);
      return;
    }
    
    // Log successful connectivity test
    console.log(`Successfully connected to Azure Speech service in region: ${AZURE_SPEECH_REGION}`);
    
    // Load the SDK if not already loaded
    const SpeechSDK = speechSDKRef.current; // Get from ref
    
    if (!SpeechSDK) {
      console.error('CRITICAL: startAzureSpeechRecognition called but SpeechSDK ref is null!');
      toast({ title: 'Internal Error', description: 'Speech SDK reference missing.', variant: 'destructive' });
      setIsListening(false);
      return;
    }
    
    console.log('Azure Speech SDK is ready and key is valid (checked by caller).');

    try {
      // Create speech config
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
      speechConfig.speechRecognitionLanguage = 'en-US';

      // Create audio config
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

      // Create recognizer
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      // Add overall timeout for the recognizeOnceAsync operation
      const recognitionTimeout = setTimeout(() => {
        try {
          if (recognizerRef.current) {
            // For recognizeOnceAsync, closing is usually sufficient
            recognizerRef.current.close();
            recognizerRef.current = null;
          }
          console.warn('Azure Speech recognition timed out');
          toast({
            title: 'Recognition Timeout',
            description: 'Speech recognition timed out. Please check your internet connection and try again.',
            variant: 'destructive',
          });
          setIsListening(false);
        } catch (e) {
          console.error('Error aborting Azure recognition on timeout:', e);
        }
      }, 10000); // 10 second timeout

      // Start recognition - recognizeOnceAsync handles silence detection internally
      recognizer.recognizeOnceAsync(
        (result: any) => {
          clearTimeout(recognitionTimeout);
          if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            const recognizedText = result.text;
            console.log(`Azure recognized: "${recognizedText}"`);
            handleProvisionalCapture(recognizedText);
          } else if (result.reason === SpeechSDK.ResultReason.NoMatch) {
            console.log('Azure NoMatch: Speech could not be recognized.');
            toast({
              title: 'Recognition Failed',
              description: 'Could not recognize speech.',
              variant: 'default',
            });
            setIsListening(false);
          } else {
            console.log(`Azure Canceled: Reason=${SpeechSDK.CancellationReason[result.reason]}`);
            if (result.reason === SpeechSDK.CancellationReason.Error) {
              console.error(`Azure ErrorDetails: ${result.errorDetails}`);
              toast({ title: 'Recognition Error', description: result.errorDetails, variant: 'destructive' });
            }
            setIsListening(false);
          }
          recognizerRef.current?.close();
        },
        (error: any) => {
          clearTimeout(recognitionTimeout);
          console.error('Azure Speech recognition error:', error);
          
          let errorMessage = 'An error occurred during speech recognition.';
          let errorTitle = 'Recognition Error';
          
          // Check if error is network-related
          if (error.message && (error.message.includes('network') || error.message.includes('connection'))) {
            errorTitle = 'Network Error';
            errorMessage = 'Unable to connect to Azure Speech service. Please check your internet connection.';
            // Update network status
            checkNetworkConnectivity().then(setNetworkConnected);
          }
          
          toast({
            title: errorTitle,
            description: errorMessage,
            variant: 'destructive',
          });
          
          recognizerRef.current?.close();
          recognizerRef.current = null;
          setIsListening(false);
          setProvisionalText(null);
        }
      );
    } catch (error) {
      console.error('Error initializing Azure speech recognition:', error);
      toast({
        title: 'Recognition Error',
        description: 'Failed to initialize Azure speech recognition.',
        variant: 'destructive',
      });
      recognizerRef.current?.close();
      recognizerRef.current = null;
      setIsListening(false);
      setProvisionalText(null);
    }
  };

  const startBrowserSpeechRecognition = async () => {
    // First check if we're online with a more thorough check
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      toast({
        title: 'Network Offline',
        description: 'You appear to be offline. Speech recognition requires an internet connection.',
        variant: 'destructive',
      });
      setIsListening(false);
      return;
    }
    
    // Use type assertion to properly type the SpeechRecognition API
    const SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition) as typeof window.SpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: 'Not Supported',
        description: 'Speech recognition is not supported in this browser.',
        variant: 'destructive',
      });
      setIsListening(false);
      return;
    }
    
    // Check for microphone permissions before starting
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately after permission check
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Microphone permission error:', error);
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access to use speech recognition.',
        variant: 'destructive',
      });
      setIsListening(false);
      return;
    }

    try {
      // Declare recognition with let instead of const so it can be accessed in nested functions
      let recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      // Add timeout to prevent hanging if network is unavailable
      const recognitionTimeout = setTimeout(() => {
        try {
          recognition.abort();
          console.warn('Speech recognition timed out');
          toast({
            title: 'Recognition Timeout',
            description: 'Speech recognition timed out. Please check your internet connection and try again.',
            variant: 'destructive',
          });
          setIsListening(false);
          // Update network status
          checkNetworkConnectivity().then(setNetworkConnected);
        } catch (e) {
          console.error('Error aborting recognition on timeout:', e);
        }
      }, 10000); // 10 second timeout

      // Variable to track silence detection timer
      // Variable to track silence detection state
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;
      let isSpeaking = false;
      
      // Function to reset silence timer
      const resetSilenceTimer = () => {
        // Clear existing timer if any
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
        
        // Only set a new timer if we've detected speech and now it's ended
        if (isSpeaking) {
          console.log('Speech ended, starting 3-second auto-submission timer');
          // Set new timer for 3 seconds of silence
          silenceTimer = setTimeout(() => {
            console.log('Auto-submitting after 3 seconds of silence');
            try {
              // Store the current recognition object in ref to ensure we can access it later
              recognizerRef.current = recognition;
              isIntentionalAbortRef.current = true;

              // Create a flag to track if we've already processed a result
              let resultProcessed = false;
              
              // Override the result handler to capture the final result
              // Web Speech API uses different event handlers than Azure SDK
              // This implementation is specific to Web Speech API
              
              // Stop recognition which will finalize results
              if (recognition) {
                recognition.abort();
              }
              
              // Set a backup timeout in case stop doesn't trigger events
              setTimeout(() => {
                if (!resultProcessed) {
                  console.log('Backup timeout triggered - forcing cleanup');
                  setIsListening(false);
                  if (recognizerRef.current) {
                    recognizerRef.current = null;
                  }
                }
              }, 1500);
            } catch (e) {
              console.error('Error stopping recognition during auto-submit:', e);
              setIsListening(false);
              recognizerRef.current = null;
            }
          }, 3000);
        }
      };
      
      // Start silence timer when recognition starts
      // We don't start the timer immediately, only after speech is detected and then ends
      
      // Handle speech detection events
      recognition.onspeechstart = () => {
        console.log('Speech detected, marking as speaking');
        isSpeaking = true;
        // Clear any existing silence timer when speech starts
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      };
      
      recognition.onspeechend = () => {
        console.log('Speech ended, starting silence timer');
        // Only start the silence timer if we've detected speech
        if (isSpeaking) {
          resetSilenceTimer();
        }
      };
      
      // Also reset timer when audio is detected
      recognition.onaudiostart = () => {
        console.log('Audio detected, resetting silence timer');
        resetSilenceTimer();
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        clearTimeout(recognitionTimeout);
        // Clear silence timer when we get a result
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
        
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          console.log('Browser recognized:', transcript);
          handleProvisionalCapture(transcript);
        } else {
          console.log('Browser NoMatch: No transcript available');
          toast({
            title: 'Recognition Failed',
            description: 'Could not recognize speech.',
            variant: 'default'
          });
          setIsListening(false);
        }
        setIsListening(false);
        setProvisionalText(null);
        setRetryCount(0);
      };

      recognition.onerror = async (event: SpeechRecognitionErrorEvent) => {
        clearTimeout(recognitionTimeout);
        
        // Check if the error was triggered by our own abort call
        if (isIntentionalAbortRef.current) {
          console.log('Ignoring error possibly triggered by intentional abort:', event.error);
          isIntentionalAbortRef.current = false;
          if (event.error !== 'aborted') {
            console.warn('Unexpected error type following intentional abort:', event.error, event.message);
          }
          setIsListening(false);
          return;
        }
        
        console.error('[Browser Recognition Error]', event.error, event.message);
        
        // Provide more specific error messages based on error type
        let errorMessage = `Error: ${event.error}`;
        let errorTitle = 'Recognition Error';
        
        // Handle specific error types
        if (event.error === 'network') {
          errorTitle = 'Network Error';
          errorMessage = 'Unable to connect to speech recognition service. Please check your internet connection and try again.';
          
          // Log additional details for debugging but remove retry logic
          console.log('Network error details:', navigator.onLine ? 'Browser reports online' : 'Browser reports offline');
          checkNetworkConnectivity().then(isConnected => {
            setNetworkConnected(isConnected);
            console.log(`Connectivity re-checked after network error: ${isConnected}`);
          });
          // No retry logic here anymore
        } else {
          if (event.error === 'not-allowed') {
            errorMessage = 'Microphone access was denied. Please allow microphone access and try again.';
          } else if (event.error === 'aborted') {
            errorMessage = 'Speech recognition was aborted.';
          } else if (event.error === 'audio-capture') {
            errorMessage = 'No microphone was found or microphone is not working properly.';
          } else if (event.error === 'no-speech') {
            errorMessage = 'No speech was detected. Please try again.';
          } else if (event.error === 'service-not-allowed') {
            errorMessage = 'The speech recognition service is not allowed. This may be due to network restrictions.';
          }
        }
        
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Always stop listening on any error now
        setIsListening(false);
        setProvisionalText(null);
        setRetryCount(0);
      };

      recognition.onend = () => {
        clearTimeout(recognitionTimeout);
        isIntentionalAbortRef.current = false;
        setIsListening(false);
        setProvisionalText(null);
      };

      isIntentionalAbortRef.current = false;
      recognition.start();
      console.log('[Browser Recognition] recognition.start() called');
    } catch (error) {
      console.error('Error initializing browser speech recognition:', error);
      toast({
        title: 'Recognition Error',
        description: 'Failed to initialize speech recognition.',
        variant: 'destructive',
      });
      setIsListening(false);
      setProvisionalText(null);
    }
  };

  const toggleListening = async () => {
    if (disabled) return;
    
    if (provisionalText !== null) {
      console.log('[toggleListening] Clicked while confirming. Submitting early.');
      confirmSubmission();
      return;
    }

    if (isListening) {
      console.log('[toggleListening] Clicked while listening. Stopping.');
      if (recognizerRef.current) {
        try {
          console.log('[toggleListening] Stopping Azure via stopContinuousRecognitionAsync...');
          await recognizerRef.current.stopContinuousRecognitionAsync();
        } catch (error) {
          console.warn('Error stopping recognition:', error);
        }
        recognizerRef.current = null;
      }
      console.log('[toggleListening] Stopping Azure/Browser via close()...');
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
      }
      setProvisionalText(null);
      setIsListening(false);
    } else {
      console.log('[toggleListening] Clicked while idle. Starting listening...');
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        toast({
          title: 'Network Offline',
          description: 'You appear to be offline. Speech recognition requires an internet connection.',
          variant: 'destructive',
        });
        return;
      }
      
      // Start listening
      setIsListening(true);
      toast({
        title: 'Listening...',
        description: 'Speak now to describe your transaction.',
      });

      try {
        // --- MODIFIED LOGIC: Use result from loadSpeechSDK --- 
        let loadResult: LoadSdkResult | null = null;
        if (!sdkReady && !useBrowserFallback) {
          console.log('[toggleListening] SDK not ready, attempting to load...');
          // loadSpeechSDK sets isLoading, sdkReady, azureKeyValid, useBrowserFallback
          loadResult = await loadSpeechSDK(); 
          // Re-check flags after load attempt
          console.log(`[toggleListening] SDK load attempt complete. Result:`, loadResult);
        }
        
        // Determine flags based on loadResult if available, otherwise use current state
        const finalUseFallback = loadResult ? loadResult.useFallback : useBrowserFallback;
        const finalSdkReady = loadResult ? loadResult.sdkLoaded : sdkReady;
        const finalKeyValid = loadResult ? loadResult.keyValid : (azureKeyValid ?? false);

        // Now decide which recognition to use based on potentially updated flags
        if (finalUseFallback || !finalSdkReady || !finalKeyValid) {
          console.log('[toggleListening] Using browser speech recognition (post-load check).');
          startBrowserSpeechRecognition();
        } else {
          console.log('[toggleListening] Attempting to use Azure speech recognition (post-load check).');
          // Double check SDK is properly loaded before attempting to use it
          if (!speechSDKRef.current || typeof speechSDKRef.current.SpeechConfig === 'undefined') {
            console.warn('Azure Speech SDK not properly initialized, falling back to browser recognition');
            setUseBrowserFallback(true);
            startBrowserSpeechRecognition();
          } else {
            // Log the Azure Speech key validity and region for debugging
            console.log(`Azure Speech configuration: Region=${AZURE_SPEECH_REGION}, Key valid=${finalKeyValid}`);
            startAzureSpeechRecognition();
          }
        }
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: 'Recognition Error',
          description: 'Failed to start speech recognition. Please try again.',
          variant: 'destructive',
        });
        setIsListening(false);
        
        // Try browser fallback as last resort
        if (!finalUseFallback) {
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

  const confirmSubmission = useCallback(() => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
    if (provisionalText !== null) {
      console.log('[confirmSubmission] Submitting text:', provisionalText);
      onTextCaptured(provisionalText);
      setProvisionalText(null);
      setIsListening(false);
    }
  }, [provisionalText, onTextCaptured]);

  const handleProvisionalCapture = useCallback((text: string) => {
    if (!text) return;
    console.log('[handleProvisionalCapture] Provisionally captured:', text);
    setProvisionalText(text);
    setIsListening(false);

    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
    }

    console.log('[handleProvisionalCapture] Starting 3-second auto-submit timer...');
    autoSubmitTimerRef.current = setTimeout(() => {
      console.log('[handleProvisionalCapture] Auto-submit timer expired.');
      confirmSubmission();
    }, 3000);
  }, [confirmSubmission]);

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