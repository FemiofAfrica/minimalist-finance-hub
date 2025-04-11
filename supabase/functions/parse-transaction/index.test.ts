import { parseTransaction } from './index';

describe('parseTransaction', () => {
  it('should parse an expense transaction with a simple description', () => {
    const result = parseTransaction('Spent $50 on groceries');
    expect(result.description).toBe('Groceries');
    expect(result.amount).toBe(50);
    expect(result.type).toBe('EXPENSE');
  });

  it('should parse an income transaction', () => {
    const result = parseTransaction('Received $1000 salary');
    expect(result.description).toBe('Salary');
    expect(result.amount).toBe(1000);
    expect(result.type).toBe('INCOME');
  });

    it('should parse a transfer transaction', () => {
        const result = parseTransaction('Transfered 100$ to account');
        expect(result.description).toBe('Transfer');
        expect(result.amount).toBe(100);
        expect(result.type).toBe('EXPENSE');
    });

  it('should parse an expense transaction with date yesterday', () => {
    const result = parseTransaction('Spent $20 on lunch yesterday');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(result.description).toBe('Lunch');
    expect(result.amount).toBe(20);
    expect(result.type).toBe('EXPENSE');
    expect(new Date(result.date).toDateString()).toBe(yesterday.toDateString());
  });

  it('should parse a transaction with a different currency symbol', () => {
    const result = parseTransaction('Bought €75 at the store');
    expect(result.description).toBe('Store');
    expect(result.amount).toBe(75);
    expect(result.type).toBe('EXPENSE');
  });

  it('should parse a transaction with a different number format', () => {
    const result = parseTransaction('Spent $1,234.56 on a new gadget');
    expect(result.description).toBe('Gadget');
    expect(result.amount).toBe(1234.56);
    expect(result.type).toBe('EXPENSE');
  });

  it('should parse a transaction with a date in MM/DD/YYYY format', () => {
    const result = parseTransaction('Spent $30 on coffee 11/25/2023');
    expect(result.description).toBe('Coffee');
    expect(result.amount).toBe(30);
    expect(result.type).toBe('EXPENSE');
    expect(new Date(result.date).toDateString()).toBe(new Date('11/25/2023').toDateString());
  });
  it('should parse a transaction in spanish', () => {
    const result = parseTransaction('Gané 500$ por mi trabajo');
    expect(result.description).toBe('Work');
    expect(result.amount).toBe(500);
    expect(result.type).toBe('INCOME');
  });

  it('should parse a transaction in portuguese', () => {
    const result = parseTransaction('Gastei 1000R$ em comida');
    expect(result.description).toBe('Food');
    expect(result.amount).toBe(1000);
    expect(result.type).toBe('EXPENSE');
  });

  it('should parse an income transaction in portuguese with last month date', () => {
    const result = parseTransaction('Recebi 1000R$ por meu salário mês passado');
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    expect(result.description).toBe('Salary');
    expect(result.amount).toBe(1000);
    expect(result.type).toBe('INCOME');
    expect(new Date(result.date).getMonth()).toBe(lastMonth.getMonth());
  });

});