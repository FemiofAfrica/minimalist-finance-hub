import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Steps } from '@/components/ui/steps';
import { X } from 'lucide-react';

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

  const steps = ["Welcome", "Features", "Ready!"];

  useEffect(() => {
    // Auto-rotate through features every 4 seconds in the Features step
    let interval: NodeJS.Timeout;
    if (currentStep === 1) {
      interval = setInterval(() => {
        setCurrentFeature((prev) => (prev + 1) % featureHighlights.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
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
    completeOnboarding();
    setOpen(false);
    // Navigate to dashboard
    navigate('/');
  };

  const handleSkip = () => {
    completeOnboarding();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-gradient-to-br from-[#004D40] to-[#00695C] text-white border-none">
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
        
        <div className="p-6">
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
                  Welcome to SayFin! 🎉
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
                      <span>Lagos today and London tomorrow? Use Live Currency Conversion to track your finances in your local currency</span>
                    </li>
                  </ul>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="bg-black/20 p-6 flex flex-row justify-between">
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