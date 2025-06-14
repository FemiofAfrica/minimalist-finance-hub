import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ExplanationCard from '@/components/dashboard/ExplanationCard';
import type { FinancialExplanation } from '@/types/chartData';

const mockExplanations: FinancialExplanation[] = [
  {
    id: 'income-1',
    type: 'positive',
    significance: 'significant',
    title: 'Income increased significantly',
    description: 'Your income showed a 25.0% increase compared to May 2025.',
    recommendation: 'Great progress! Consider allocating some of this increase to your savings goals.',
    confidence: 0.9,
    category: 'income',
    metadata: {
      changePercentage: 25.0,
      previousValue: 4000,
      currentValue: 5000,
      timeframe: 'May 2025 to June 2025'
    }
  },
  {
    id: 'expenses-1',
    type: 'positive',
    significance: 'moderate',
    title: 'Expenses decreased moderately',
    description: 'Your expenses showed a 14.3% decrease compared to May 2025.',
    confidence: 0.85,
    category: 'expenses'
  }
];

describe('ExplanationCard', () => {
  it('should render with explanations', () => {
    render(<ExplanationCard explanations={mockExplanations} />);
    
    expect(screen.getByText('Financial Insights')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should expand when clicked', async () => {
    render(<ExplanationCard explanations={mockExplanations} />);
    
    const header = screen.getByRole('button');
    fireEvent.click(header);
    
    await waitFor(() => {
      expect(screen.getByText('Income increased significantly')).toBeInTheDocument();
    });
  });

  it('should not render when explanations array is empty', () => {
    const { container } = render(<ExplanationCard explanations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should show confidence when enabled', () => {
    render(
      <ExplanationCard 
        explanations={mockExplanations} 
        defaultExpanded={true}
        showConfidence={true}
      />
    );
    
    expect(screen.getByText('90% confidence')).toBeInTheDocument();
  });

  it('should limit visible explanations', () => {
    render(
      <ExplanationCard 
        explanations={mockExplanations} 
        defaultExpanded={true}
        maxVisible={1}
      />
    );
    
    expect(screen.getByText('Income increased significantly')).toBeInTheDocument();
    expect(screen.queryByText('Expenses decreased moderately')).not.toBeInTheDocument();
    expect(screen.getByText('Show 1 More')).toBeInTheDocument();
  });
}); 