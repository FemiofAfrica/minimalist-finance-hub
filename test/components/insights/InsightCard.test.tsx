import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InsightCard, type InsightCardData } from '@/components/insights/InsightCard';

const mockInsight: InsightCardData = {
  id: 'test-insight-1',
  type: 'alert',
  title: 'Test Alert',
  description: 'This is a test alert description',
  severity: 'high',
  category: 'spending',
  actionable: true,
  actionText: 'Take Action',
  actionUrl: '/test-action',
  dismissible: true,
  createdAt: new Date('2025-01-01')
};

describe('InsightCard', () => {
  it('renders insight content correctly', () => {
    render(<InsightCard insight={mockInsight} />);
    
    expect(screen.getByText('Test Alert')).toBeInTheDocument();
    expect(screen.getByText('This is a test alert description')).toBeInTheDocument();
    expect(screen.getByText('alert')).toBeInTheDocument();
    expect(screen.getByText('Take Action')).toBeInTheDocument();
  });

  it('renders different insight types with correct styling', () => {
    const tipInsight = { ...mockInsight, type: 'tip' as const };
    render(<InsightCard insight={tipInsight} />);
    
    const card = screen.getByRole('article');
    expect(card).toHaveClass('border-blue-200', 'bg-blue-50');
  });

  it('renders achievement type with correct styling', () => {
    const achievementInsight = { ...mockInsight, type: 'achievement' as const };
    render(<InsightCard insight={achievementInsight} />);
    
    const card = screen.getByRole('article');
    expect(card).toHaveClass('border-green-200', 'bg-green-50');
  });

  it('renders recommendation type with correct styling', () => {
    const recommendationInsight = { ...mockInsight, type: 'recommendation' as const };
    render(<InsightCard insight={recommendationInsight} />);
    
    const card = screen.getByRole('article');
    expect(card).toHaveClass('border-purple-200', 'bg-purple-50');
  });

  it('handles different severity levels for alerts', () => {
    const mediumAlert = { ...mockInsight, severity: 'medium' as const };
    render(<InsightCard insight={mediumAlert} />);
    
    const card = screen.getByRole('article');
    expect(card).toHaveClass('border-orange-200', 'bg-orange-50');
  });

  it('shows dismiss button when insight is dismissible', () => {
    render(<InsightCard insight={mockInsight} />);
    
    const dismissButton = screen.getByLabelText('Dismiss Test Alert insight');
    expect(dismissButton).toBeInTheDocument();
  });

  it('hides dismiss button when insight is not dismissible', () => {
    const nonDismissibleInsight = { ...mockInsight, dismissible: false };
    render(<InsightCard insight={nonDismissibleInsight} />);
    
    const dismissButton = screen.queryByLabelText('Dismiss Test Alert insight');
    expect(dismissButton).not.toBeInTheDocument();
  });

  it('shows action button when insight is actionable', () => {
    render(<InsightCard insight={mockInsight} />);
    
    const actionButton = screen.getByRole('button', { name: 'Take Action for Test Alert' });
    expect(actionButton).toBeInTheDocument();
  });

  it('hides action button when insight is not actionable', () => {
    const nonActionableInsight = { ...mockInsight, actionable: false, actionText: undefined };
    render(<InsightCard insight={nonActionableInsight} />);
    
    const actionButton = screen.queryByRole('button', { name: /take action/i });
    expect(actionButton).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<InsightCard insight={mockInsight} onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByLabelText('Dismiss Test Alert insight');
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledWith('test-insight-1');
  });

  it('calls onAction when action button is clicked', () => {
    const onAction = vi.fn();
    render(<InsightCard insight={mockInsight} onAction={onAction} />);
    
    const actionButton = screen.getByRole('button', { name: 'Take Action for Test Alert' });
    fireEvent.click(actionButton);
    
    expect(onAction).toHaveBeenCalledWith('test-insight-1', '/test-action');
  });

  it('has proper accessibility attributes', () => {
    render(<InsightCard insight={mockInsight} />);
    
    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-labelledby', 'insight-title-test-insight-1');
    expect(card).toHaveAttribute('aria-describedby', 'insight-description-test-insight-1');
    
    const title = screen.getByText('Test Alert');
    expect(title).toHaveAttribute('id', 'insight-title-test-insight-1');
    
    const description = screen.getByText('This is a test alert description');
    expect(description).toHaveAttribute('id', 'insight-description-test-insight-1');
    
    const badge = screen.getByText('alert');
    expect(badge).toHaveAttribute('aria-label', 'Insight type: alert');
  });

  it('applies custom className when provided', () => {
    render(<InsightCard insight={mockInsight} className="custom-class" />);
    
    const card = screen.getByRole('article');
    expect(card).toHaveClass('custom-class');
  });
}); 