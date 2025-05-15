import React from 'react';
import { Button } from '@/components/ui/button';
import { MixpanelService } from '@/integrations/mixpanel';

export function MixpanelExample() {
  // Example function to track button click
  const trackButtonClick = () => {
    MixpanelService.trackEvent('Button Clicked', {
      buttonName: 'Example Button',
      page: 'Example Component'
    });
    console.log('Button click tracked in Mixpanel');
  };

  // Example function to track feature usage
  const trackFeatureUsage = (featureName: string) => {
    MixpanelService.trackEvent('Feature Used', {
      featureName,
      timestamp: new Date().toISOString()
    });
    console.log(`Feature "${featureName}" usage tracked in Mixpanel`);
  };

  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-lg font-medium mb-4">Mixpanel Tracking Example</h2>
      
      <div className="flex flex-col gap-2">
        <Button 
          onClick={trackButtonClick}
          className="w-full"
        >
          Track Button Click
        </Button>
        
        <Button 
          onClick={() => trackFeatureUsage('Example Feature')}
          variant="outline"
          className="w-full"
        >
          Track Feature Usage
        </Button>
      </div>
    </div>
  );
} 