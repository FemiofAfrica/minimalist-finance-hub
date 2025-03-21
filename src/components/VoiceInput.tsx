import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Azure Speech SDK
// Using a more specific type for the Speech SDK
interface SpeechSDKType {
  SpeechConfig: any;
  AudioConfig: any;
  SpeechRecognizer: any;
  ResultReason: {
    RecognizedSpeech: number;
    NoMatch: number;
    Canceled: number;
  };
  Diagnostics: {
    enableTelemetry: (enabled: boolean) => void;
    setLoggingLevel: (level: number) => void;
  } | typeof Diagnostics; // Allow both direct functions or the Diagnostics namespace
  LogLevel: {
    Debug: number;
    Info: number;
    Warning: number;
    Error: number;
  };
}

let SpeechSDK: SpeechSDKType;

interface VoiceInputProps {
  onTextCaptured: (text: string) => void;
  disabled?: boolean;
}

const VoiceInput = ({ onTextCaptured, disabled = false }: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [useBrowserFallback, setUseBrowserFallback] = useState(false);
  const [azureKeyValid, setAzureKeyValid] = useState(false);
  const [networkConnected, setNetworkConnected] = useState(true);
  // Define a type for the recognizer
interface SpeechRecognizerType {
  recognizeOnceAsync: (successCallback: (result: RecognitionResult) => void, errorCallback: (error: Error) => void) => void;
  close: () => void;
  stopContinuousRecognitionAsync?: () => void;
  abort?: () => void;
}

// Define a type for the recognition result
interface RecognitionResult {
  reason: string;
  text: string;
}

const recognizerRef = useRef<SpeechRecognizerType | null>(null);
  const { toast } = useToast();

  // Azure Speech API key - This should be moved to environment variables in production
  const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY || '';
  const AZURE_SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastus';

  // Load Azure Speech SDK
  useEffect(() => {
    const loadSpeechSDK = async () => {
      try {
        setIsLoading(true);
        
        // First check network connectivity
        const isConnected = await checkNetworkConnectivity();
        setNetworkConnected(isConnected);
        
        if (!isConnected) {
          console.warn('Network appears to be offline, will use browser fallback when connection is available');
          setUseBrowserFallback(true);
          return;
        }
        
        // Dynamically import the Speech SDK with explicit error handling
        try {
          // Add a console log to track SDK loading attempt
          console.log('Attempting to load Microsoft Cognitive Services Speech SDK...');
          const speechModule = await import('microsoft-cognitiveservices-speech-sdk');
          
          // The SDK doesn't have a default export, so we use the module directly
          if (!speechModule) {
            throw new Error('Speech SDK module failed to load');
          }
          
          // Assign to global variable and update state
          SpeechSDK = speechModule;
          console.log('Speech SDK loaded successfully');
          setSdkReady(true);
          
          // Improved validation for Azure key format
          // Azure Speech Service keys are typically 32-character strings
          // They should NOT contain special characters or be excessively long
          const isValidKey = AZURE_SPEECH_KEY && 
            // Check for reasonable length (Azure keys are typically 32 chars)
            AZURE_SPEECH_KEY.length >= 10 && AZURE_SPEECH_KEY.length <= 100 &&
            // Allow alphanumeric characters and dashes
            /^[a-zA-Z0-9-]+$/.test(AZURE_SPEECH_KEY) &&
            // No spaces allowed
            !/\s/.test(AZURE_SPEECH_KEY) &&
            // Reject placeholder keys (all zeros)
            !/^0+$/.test(AZURE_SPEECH_KEY);
          
          setAzureKeyValid(isValidKey);
          
          if (!isValidKey) {
            console.warn('Azure Speech key appears to be invalid or missing');
            console.warn('Key validation failed. Key length:', AZURE_SPEECH_KEY?.length);
            setUseBrowserFallback(true);
            
            // Show a toast notification to inform the user about the fallback
            toast({
              title: 'Using Browser Speech Recognition',
              description: 'Azure Speech key is invalid or missing. Using browser speech recognition instead.',
            });
          }
        } catch (sdkError) {
          console.error('Failed to load Speech SDK module:', sdkError);
          throw sdkError; // Re-throw to be caught by outer try/catch
        }
      } catch (error) {
        console.error('Failed to load Azure Speech SDK:', error);
        toast({
          title: 'Speech Recognition Fallback',
          description: 'Using browser speech recognition as fallback.',
        });
        setUseBrowserFallback(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadSpeechSDK();

    // Set up network status listener
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

  // Optimized network connectivity check with faster timeouts and parallel requests
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
    
    // Try all URLs in parallel with a race condition
    // This is faster than sequential requests
    try {
      // Create an array of fetch promises with shorter timeouts
      const fetchPromises = testUrls.map(testUrl => {
        return fetch(testUrl, { 
          method: 'HEAD',
          mode: 'no-cors', // Important for cross-origin requests
          cache: 'no-store',
          credentials: 'omit', // Don't send cookies
          // Shorter timeout to avoid hanging
          signal: AbortSignal.timeout(1500)
        })
        .then(() => {
          console.log(`Network connectivity test successful with ${testUrl}`);
          return true;
        })
        .catch(error => {
          console.warn(`Network connectivity test failed for ${testUrl}:`, error);
          return Promise.reject(error);
        });
      });
      
      // Use Promise.any to return as soon as any request succeeds
      // This is more efficient than waiting for all to fail
      await Promise.any(fetchPromises);
      return true;
    } catch (error) {
      // If all promises were rejected, we're likely offline
      console.error('All network connectivity tests failed');
      return false;
    }
  };
  
  // Optimized speech recognition service connectivity check
  const checkSpeechServiceConnectivity = async (): Promise<boolean> => {
    // First check general connectivity with a shorter timeout
    const hasGeneralConnectivity = await checkNetworkConnectivity();
    if (!hasGeneralConnectivity) {
      return false;
    }
    
    // For Azure Speech service, we'll try multiple approaches in parallel
    try {
      // Define the base URL for Azure Speech service
      const baseUrl = `https://${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com`;
      
      // Create an array of different test approaches
      const testApproaches = [
        // Approach 1: no-cors HEAD request to favicon
        fetch(`${baseUrl}/favicon.ico?nocache=${Date.now()}`, { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          credentials: 'omit',
          signal: AbortSignal.timeout(2000)
        }).then(() => {
          console.log('Speech service connectivity test successful (no-cors mode)');
          return true;
        }),
        
        // Approach 2: regular HEAD request to favicon
        fetch(`${baseUrl}/favicon.ico?nocache=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store',
          credentials: 'omit',
          signal: AbortSignal.timeout(2000)
        }).then(response => {
          console.log('Speech service connectivity test with status:', response.status);
          // Only consider 2xx and 3xx responses as successful
          return response.ok || (response.status >= 200 && response.status < 400);
        }),
        
        // Approach 3: GET request to token endpoint
        fetch(`${baseUrl}/sts/v1.0/issueToken?nocache=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'omit',
          signal: AbortSignal.timeout(2000)
        }).then(response => {
          console.log('Speech service connectivity test with token endpoint, status:', response.status);
          // Only consider 2xx and 3xx responses as successful
          return response.ok || (response.status >= 200 && response.status < 400);
        })
      ];
      
      // Use Promise.any to return as soon as any approach succeeds
      try {
        const results = await Promise.allSettled(testApproaches);
        // Check if any of the responses were successful
        const hasSuccessfulResponse = results.some(result => 
          result.status === 'fulfilled' && (
            // For no-cors requests, result.value will be true (not a Response object)
            result.value === true ||
            // For regular requests, check for 200 status
(result.value && typeof result.value === 'object' && 'status' in result.value && (result.value as { status: number }).status === 200)
          )
        );
        
        if (!hasSuccessfulResponse) {
          console.error('All speech service connectivity tests failed with non-200 responses');
          return false;
        }
        return true;
      } catch (aggregateError) {
        // All approaches failed
        console.error('All speech service connectivity test approaches failed');
        // Don't fall back to general connectivity - if Azure endpoints are unreachable, the service won't work
        return false;
      }
    } catch (error) {
      console.warn('Speech service connectivity test failed:', error);
      // Even if this specific test fails, the service might still be available
      // So we'll return the general connectivity result
      return hasGeneralConnectivity;
    }
  };

  // We're using the networkConnected state directly instead of a separate function

  const startAzureSpeechRecognition = async () => {
    // Perform a more thorough connectivity check specifically for speech services
    const isSpeechServiceAvailable = await checkSpeechServiceConnectivity();
    
    if (!isSpeechServiceAvailable) {
      console.error('Speech service connectivity check failed, cannot use Azure Speech recognition');
      toast({
        title: 'Speech Service Unavailable',
        description: 'Cannot connect to speech recognition service. Trying browser recognition instead.',
        variant: 'destructive',
      });
      setIsListening(false);
      setUseBrowserFallback(true);
      startBrowserSpeechRecognition();
      return;
    }
    
    // Log successful connectivity test
    console.log(`Successfully connected to Azure Speech service in region: ${AZURE_SPEECH_REGION}`);
    
    // Double-check SDK is loaded and ready
    if (!sdkReady || !SpeechSDK || typeof SpeechSDK.SpeechConfig === 'undefined') {
      console.error('Azure Speech SDK not ready or not properly initialized, falling back to browser recognition');
      toast({
        title: 'Speech SDK Not Ready',
        description: 'Speech recognition service is not ready yet. Using browser recognition instead.',
      });
      // Fall back to browser-based speech recognition
      setUseBrowserFallback(true);
      startBrowserSpeechRecognition();
      return;
    }
    
    // Log SDK readiness
    console.log('Azure Speech SDK is ready and properly initialized');
    
    if (!azureKeyValid) {
      console.error('Azure Speech key invalid, falling back to browser recognition');
      toast({
        title: 'Azure Configuration Error',
        description: 'Azure Speech key appears to be invalid or missing. Using browser recognition instead.',
      });
      setUseBrowserFallback(true);
      startBrowserSpeechRecognition();
      return;
    }
    
    // Log key validation success
    console.log('Azure Speech key validation passed')

    try {
      // Create speech config with detailed logging
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
      speechConfig.speechRecognitionLanguage = 'en-US';
      
      // Enable detailed logging for troubleshooting
      if (SpeechSDK.Diagnostics) {
        SpeechSDK.Diagnostics.enableTelemetry(true);
        SpeechSDK.Diagnostics.setLoggingLevel(SpeechSDK.LogLevel.Debug);
        console.log('Enhanced logging enabled for Azure Speech SDK');
      }

      // Create audio config
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

      // Create recognizer
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      // Add timeout to prevent hanging if network is unavailable
      const recognitionTimeout = setTimeout(() => {
        try {
          if (recognizerRef.current) {
            recognizerRef.current.stopContinuousRecognitionAsync?.() || recognizerRef.current.close();
            recognizerRef.current = null;
          }
          console.warn('Azure Speech recognition timed out');
          toast({
            title: 'Recognition Timeout',
            description: 'Speech recognition timed out. Please check your internet connection and try again.',
            variant: 'destructive',
          });
          setIsListening(false);
          
          // Try browser fallback on timeout
          setUseBrowserFallback(true);
          startBrowserSpeechRecognition();
        } catch (e) {
          console.error('Error aborting Azure recognition on timeout:', e);
        }
      }, 10000); // 10 second timeout

      // Set up silence detection for Azure Speech SDK
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
              // Store the current recognizer object in ref to ensure we can access it later
              // No need to reassign recognizerRef.current as it's already set to the recognizer
              
              // Create a flag to track if we've already processed a result
              let resultProcessed = false;
              
              // Override the result handler to capture the final result
              // Azure Speech SDK uses different methods than Web Speech API
              
              // Stop recognition which will finalize results
              if (recognizerRef.current) {
                // Use the appropriate method for Azure Speech SDK
                recognizerRef.current.stopContinuousRecognitionAsync?.() || recognizerRef.current.close?.();
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
      
      // Set up speech activity detection events
      recognizer.recognized = () => {
        console.log('Speech recognized, resetting silence timer');
        resetSilenceTimer();
      };
      
      recognizer.recognizing = () => {
        console.log('Speech being recognized, marking as speaking');
        isSpeaking = true;
        // Clear any existing silence timer when speech is being recognized
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      };
      
      recognizer.speechEndDetected = () => {
        console.log('Speech ended, starting silence timer');
        // Only start the silence timer if we've detected speech
        if (isSpeaking) {
          resetSilenceTimer();
        }
      };
      
      // Start recognition
      recognizer.recognizeOnceAsync(
        (result: RecognitionResult) => {
          clearTimeout(recognitionTimeout);
          // Clear silence timer when we get a result
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }
          
          if (result.reason === "RecognizedSpeech" || result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            const recognizedText = result.text;
            if (recognizedText.trim()) {
              onTextCaptured(recognizedText);
            } else {
              toast({
                title: 'No Speech Detected',
                description: 'No speech was detected. Please try again.',
                variant: 'destructive',
              });
            }
          } else {
            toast({
              title: 'Recognition Failed',
              description: 'Speech recognition failed or was canceled.',
              variant: 'destructive',
            });
          }
          setIsListening(false);
          if (recognizerRef.current) {
            recognizerRef.current.close();
            recognizerRef.current = null;
          }
        },
        (error: Error) => {
          clearTimeout(recognitionTimeout);
          console.error('Azure Speech recognition error:', error);
          
          let errorMessage = 'An error occurred during speech recognition. Trying browser fallback.';
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
          
          setIsListening(false);
          if (recognizerRef.current) {
            recognizerRef.current.close();
            recognizerRef.current = null;
          }
          
          // Try browser fallback on Azure error
          setUseBrowserFallback(true);
          startBrowserSpeechRecognition();
        }
      );
    } catch (error) {
      console.error('Error initializing Azure speech recognition:', error);
      toast({
        title: 'Recognition Error',
        description: 'Failed to initialize speech recognition. Trying browser fallback.',
        variant: 'destructive',
      });
      setIsListening(false);
      
      // Try browser fallback on Azure error
      setUseBrowserFallback(true);
      startBrowserSpeechRecognition();
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
      console.error('Browser speech recognition is not supported');
      toast({
        title: 'Speech Recognition Not Supported',
        description: 'Speech recognition is not supported in this browser. Please try using a different browser like Chrome.',
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
        description: 'Please allow microphone access in your browser settings to use speech recognition. You may need to refresh the page after granting permission.',
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
      
      // Create an adapter that implements SpeechRecognizerType interface
      const recognizerAdapter: SpeechRecognizerType = {
        recognizeOnceAsync: (successCallback, errorCallback) => {
          // Set up event handlers to map to the callback style
          recognition.onresult = (event) => {
            const result = {
              reason: 'RecognizedSpeech',
              text: event.results[0][0].transcript
            };
            successCallback(result);
          };
          recognition.onerror = (event) => {
            errorCallback(new Error(event.error));
          };
          recognition.start();
        },
        close: () => {
          recognition.abort();
        },
        abort: () => {
          recognition.abort();
        }
      };
      
      // Store the adapter in the ref
      recognizerRef.current = recognizerAdapter;
      
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
              // Create an adapter that implements SpeechRecognizerType interface
              const recognizerAdapter: SpeechRecognizerType = {
                recognizeOnceAsync: (successCallback, errorCallback) => {
                  // This is just a placeholder since we're stopping recognition
                  // The actual recognition is already happening
                },
                close: () => {
                  recognition.abort();
                },
                abort: () => {
                  recognition.abort();
                }
              };
              
              // Store the adapter in the ref
              recognizerRef.current = recognizerAdapter;
              
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
          onTextCaptured(transcript);
        } else {
          toast({
            title: 'No Speech Detected',
            description: 'No speech was detected. Please try again.',
            variant: 'destructive',
          });
        }
        setIsListening(false);
      };

      recognition.onerror = async (event: SpeechRecognitionErrorEvent) => {
        clearTimeout(recognitionTimeout);
        console.error('Speech recognition error:', event.error, event.message);
        
        // Provide more specific error messages based on error type
        let errorMessage = `Error: ${event.error}`;
        let errorTitle = 'Recognition Error';
        
        // Handle specific error types
        if (event.error === 'network') {
          errorTitle = 'Network Error';
          errorMessage = 'Unable to connect to speech recognition service. Please check your internet connection and try again.';
          
          // Log additional details for debugging
          console.log('Network error details:', navigator.onLine ? 'Browser reports online' : 'Browser reports offline');
          
          // Perform a more thorough network check
          const isConnected = await checkNetworkConnectivity();
          setNetworkConnected(isConnected);
          
          if (isConnected) {
            // If we're actually connected but still getting network errors,
            // it might be a CORS issue or browser security policy
            console.warn('Network appears connected but speech recognition reports network error');
            errorMessage = 'Unable to connect to speech recognition service despite network being available. This may be due to browser security settings or network configuration.';
            
            // Try restarting recognition after a short delay
            setTimeout(() => {
              if (isListening) {
                console.log('Attempting to restart speech recognition after network error');
                try {
                  recognition.abort();
                  setTimeout(() => {
                    const newRecognition = new SpeechRecognition();
                    newRecognition.lang = 'en-US';
                    newRecognition.interimResults = false;
                    newRecognition.maxAlternatives = 1;
                    // Copy event handlers from the original recognition object
                    newRecognition.onresult = recognition.onresult;
                    newRecognition.onerror = recognition.onerror;
                    newRecognition.onend = recognition.onend;
                    newRecognition.start();
                  }, 500);
                } catch (e) {
                  console.error('Failed to restart speech recognition:', e);
                }
              }
            }, 1000);
          }
        } else if (event.error === 'not-allowed') {
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
        
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Only set isListening to false for terminal errors
        // For network errors, we might try to recover
        if (event.error !== 'network' || !networkConnected) {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        clearTimeout(recognitionTimeout);
        setIsListening(false);
      };

      recognition.start();
    } catch (error) {
      console.error('Error initializing browser speech recognition:', error);
      toast({
        title: 'Recognition Error',
        description: 'Failed to initialize speech recognition.',
        variant: 'destructive',
      });
      setIsListening(false);
    }
  };

  const toggleListening = async () => {
    if (disabled) return;
    
    if (isListening) {
      // Stop listening
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
          console.warn('Error stopping recognition:', error);
        }
        recognizerRef.current = null;
      }
      setIsListening(false);
    } else {
      // Check network connectivity before starting with a thorough check
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
        description: useBrowserFallback ? 'Using browser speech recognition. Speak now.' : 'Speak now to describe your transaction.',
      });

      try {
        // Check if we should use browser fallback
        const shouldUseFallback = useBrowserFallback || !sdkReady || !azureKeyValid;
        
        // Always try browser recognition first if Azure key is invalid
        if (shouldUseFallback) {
          console.log('Using browser speech recognition (Azure key invalid or SDK not ready)');
          startBrowserSpeechRecognition();
        } else {
          console.log('Attempting to use Azure speech recognition');
          // Double check SDK is properly loaded before attempting to use it
          if (!SpeechSDK || typeof SpeechSDK.SpeechConfig === 'undefined') {
            console.warn('Azure Speech SDK not properly initialized, falling back to browser recognition');
            setUseBrowserFallback(true);
            startBrowserSpeechRecognition();
          } else {
            // Log the Azure Speech key validity and region for debugging
            console.log(`Azure Speech configuration: Region=${AZURE_SPEECH_REGION}, Key valid=${azureKeyValid}`);
            
            // Check if we can connect to Azure Speech service before attempting to use it
            const isSpeechServiceAvailable = await checkSpeechServiceConnectivity();
            if (!isSpeechServiceAvailable) {
              console.warn('Azure Speech service connectivity check failed, falling back to browser recognition');
              setUseBrowserFallback(true);
              startBrowserSpeechRecognition();
            } else {
              startAzureSpeechRecognition();
            }
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
      className={`rounded-full ${isListening ? 'bg-red-100 text-red-500 hover:bg-red-200 hover:text-red-600' : ''}`}
      title="Voice input"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isListening ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
};

export default VoiceInput;