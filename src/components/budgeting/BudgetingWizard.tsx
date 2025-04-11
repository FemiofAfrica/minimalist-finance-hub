import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

function BudgetingWizard() {
  const [step, setStep] = useState(1);

  const nextStep = () => {
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  return (
    <div>
      <h2>Budgeting Wizard</h2>
      {step === 1 && (
        <div>
          <h3>Step 1: Define Income</h3>
          <p>Enter your monthly income:</p>
          <button onClick={nextStep}>Next</button>
        </div>
      )}
      {step === 2 && (
        <div>
          <h3>Step 2: Set Budget Limits</h3>
          <p>Set limits for different categories:</p>
          <button onClick={prevStep}>Previous</button>
          <button onClick={nextStep}>Next</button>
        </div>
      )}
      {step === 3 && (
        <div>
          <h3>Step 3: Review and Save</h3>
          <p>Review your budgets and save:</p>
          <button onClick={prevStep}>Previous</button>
          <button onClick={() => alert('Saving budgets!')}>Save</button>
        </div>
      )}
    </div>
  );
}

export default BudgetingWizard;
