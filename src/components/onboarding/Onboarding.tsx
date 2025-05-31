import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Steps } from '@/components/ui/steps';
import { X } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const featureHighlights = [
  {
    title: "Natural Language Transactions",
    description: "Chat simple transaction texts like 'I spent 200k on dinner with friends' in the text box on the dashboard page to add transactions.",
    icon: "💬"
  },
  {
    title: "Voice Input",
    description: "Speak simple transaction texts to add transactions. Just click the microphone icon and start talking.",
    icon: "🎤"
  },
  {
    title: "Smart Analytics (coming soon)",
    description: "Get AI-powered insights about your spending habits and suggestions to optimize your finances.",
    icon: "📊"
  },
  {
    title: "Automated Categorization",
    description: "Transactions are automatically categorized based on their description, saving you time and effort.",
    icon: "🏷️"
  }
];

const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.2,
      delayChildren: 0.3
    }
  }
};

export const Onboarding = () => {
  const [open, setOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentFeature, setCurrentFeature] = useState(0);
  const { completeOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const { supportedCurrencies, currentCurrency, setCurrentCurrency, isLiveConversionEnabled, toggleLiveConversion } = useCurrency();
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(currentCurrency.code);

  const steps = ["Welcome", "Features", "Currency", "Ready!"];

  useEffect(() => {
    // Auto-rotate through features every 4 seconds in the Features step
    let interval: NodeJS.Timeout;
    if (currentStep === 1) {
      interval = setInterval(() => {
        setCurrentFeature((prev) => (prev + 1) % featureHighlights.length);
      }, 6000);
    }
    return () => clearInterval(interval);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      
      // Apply currency selection when moving from the currency step
      if (currentStep === 2) {
        const selectedCurrency = supportedCurrencies.find(c => c.code === selectedCurrencyCode);
        if (selectedCurrency) {
          setCurrentCurrency(selectedCurrency);
        }
      }
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Ensure the selected currency is applied
    const selectedCurrency = supportedCurrencies.find(c => c.code === selectedCurrencyCode);
    if (selectedCurrency) {
      setCurrentCurrency(selectedCurrency);
    }
    
    completeOnboarding();
    setOpen(false);
    // Navigate to dashboard
    navigate('/dashboard');
  };

  const handleSkip = () => {
    completeOnboarding();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-gradient-to-br from-[#004D40] to-[#00695C] text-white border-none flex flex-col max-h-[90vh]">
        {/* Skip button */}
        <div className="absolute right-4 top-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Skip</span>
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto" id="onboarding-content">
          <Steps
            steps={steps}
            currentStep={currentStep}
            className="mb-8"
          />

          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="welcome"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={containerVariants}
                className="space-y-6 text-center py-4"
              >
                <motion.div variants={textVariants} className="text-4xl font-bold mb-6">
                  Welcome to Kpege! 🎉
                </motion.div>
                
                <motion.div variants={textVariants} className="text-xl mb-4">
                  Your AI-powered finance assistant
                </motion.div>
                
                <motion.div variants={textVariants} className="text-lg opacity-90">
                  We're excited to help you manage your finances more effortlessly than ever before.
                </motion.div>
                
                <motion.div variants={textVariants} className="py-2 px-4 bg-white/10 rounded-lg text-lg italic">
                  "No more spreadsheets, no more manual entry - just talk to your finance hub!"
                </motion.div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="features"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={containerVariants}
                className="min-h-[280px] flex flex-col items-center justify-center py-4"
              >
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentFeature}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                  >
                    <div className="text-5xl mb-4">
                      {featureHighlights[currentFeature].icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">
                      {featureHighlights[currentFeature].title}
                    </h3>
                    <p className="text-lg opacity-90 max-w-md">
                      {featureHighlights[currentFeature].description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div className="flex mt-8 space-x-2">
                  {featureHighlights.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentFeature(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === currentFeature ? 'bg-white w-4' : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="currency"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={containerVariants}
                className="space-y-6 text-center py-4"
              >
                <motion.div variants={textVariants} className="text-4xl font-bold mb-4">
                  Choose Your Currency
                </motion.div>
                
                <motion.div variants={textVariants} className="text-lg opacity-90 mb-6">
                  Select your primary currency for displaying amounts throughout the app.
                </motion.div>
                
                <motion.div variants={textVariants} className="bg-white/10 p-6 rounded-lg space-y-6">
                  <div className="flex flex-col items-start space-y-2">
                    <Label className="text-white text-lg" htmlFor="currency">
                      Display Currency
                    </Label>
                    <Select
                      value={selectedCurrencyCode}
                      onValueChange={setSelectedCurrencyCode}
                    >
                      <SelectTrigger className="w-full bg-white/20 border-white/20 text-white">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedCurrencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {`${currency.name} (${currency.symbol})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/20">
                    <div>
                      <Label className="text-white text-lg" htmlFor="live-conversion">
                        Live Currency Conversion
                      </Label>
                      <p className="text-sm text-white/70">
                        Convert amounts to your selected currency
                      </p>
                    </div>
                    <Switch
                      id="live-conversion"
                      checked={isLiveConversionEnabled}
                      onCheckedChange={toggleLiveConversion}
                      className="bg-white/20 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-500/50"
                    />
                  </div>
                </motion.div>
                
                <motion.div variants={textVariants} className="text-sm text-white/70 italic">
                  Note: For subscriptions, amounts will display in their original input currency.
                </motion.div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="ready"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={containerVariants}
                className="text-center py-8 space-y-6"
              >
                <motion.div variants={textVariants} className="text-5xl mb-6">
                  🚀
                </motion.div>
                <motion.h2 variants={textVariants} className="text-3xl font-bold mb-4">
                  You're All Set!
                </motion.h2>
                <motion.p variants={textVariants} className="text-lg">
                  Get started by adding your first transaction or exploring the dashboard.
                </motion.p>
                <motion.div 
                  variants={textVariants}
                  className="py-4 px-6 bg-white/10 rounded-lg mt-4 space-y-4"
                >
                  <h3 className="font-semibold text-lg mb-2">Key Benefits:</h3>
                  <ul className="text-left space-y-3">
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-1">💬</span>
                      <span>Chat or speak your transactions to manage your finances</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-1">💸</span>
                      <span>No more unnecessary spending on subscriptions. Manage them easily!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-1">🌍</span>
                      <span>Your selected currency ({supportedCurrencies.find(c => c.code === selectedCurrencyCode)?.name}) will be used throughout the app</span>
                    </li>
                  </ul>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Scroll indicator - only shows when content overflows */}
          <div className="scroll-indicator hidden justify-center items-center py-2 text-white/70 text-sm">
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex flex-col items-center"
            >
              <span className="sr-only">Scroll for more content</span>
              ↓
            </motion.div>
          </div>
        </div>

        <style>
          {`
            #onboarding-content {
              scrollbar-width: thin;
              scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
            }
            
            #onboarding-content::-webkit-scrollbar {
              width: 6px;
            }
            
            #onboarding-content::-webkit-scrollbar-track {
              background: transparent;
            }
            
            #onboarding-content::-webkit-scrollbar-thumb {
              background-color: rgba(255, 255, 255, 0.3);
              border-radius: 3px;
            }
            
            /* Show scroll indicator when content overflows */
            #onboarding-content.overflow-y-auto:not(.overflow-hidden) .scroll-indicator {
              display: flex;
            }
          `}
        </style>

        <DialogFooter className="bg-black/20 p-6 flex flex-row justify-between mt-auto sticky bottom-0 border-t border-white/10 shadow-[0_-4px_6px_rgba(0,0,0,0.1)]">
          {currentStep > 0 ? (
            <Button
              variant="outline"
              onClick={handleBack}
              className="bg-transparent border-white text-white hover:bg-white/10"
            >
              Back
            </Button>
          ) : (
            <div></div> // Empty div to maintain spacing
          )}
          <Button
            onClick={handleNext}
            className="bg-white text-[#004D40] hover:bg-white/90"
          >
            {currentStep < steps.length - 1 ? "Next" : "Get Started"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 