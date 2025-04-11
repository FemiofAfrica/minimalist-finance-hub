import { supabase } from '@/integrations/supabase/client';

import { useEffect, useState } from 'react';

function Budgeting() {
  // Sample data for demonstration
  const [budgets, setBudgets] = useState([
    { id: 1, category: 'Groceries', amount: 300 },
    { id: 2, category: 'Entertainment', amount: 150 },
  ]);

  useEffect(() => {
    async function fetchBudgets() {
      // In a real application, you would fetch the budgets from Supabase here
      // For example:
      // const { data, error } = await supabase.from('budgets').select('*');
      // if (data) setBudgets(data);
    }

    fetchBudgets();
  }, []);

  return (
    <div className="container">
      <h1>Budgeting Page</h1>
      {budgets.map(budget => (
        <div key={budget.id}>
          <span>{budget.category}: ${budget.amount}</span>
        </div>
      ))}
    </div>
  );
}

export default Budgeting;
