import { assertObjectMatch } from "https://deno.land/std@0.201.0/assert/mod.ts";
import { serve } from "./index.ts";

// Test setup with timezone mocking
function mockDate(year: number, month: number, day: number) {
  const realDate = Date;
  globalThis.Date = class extends Date {
    constructor() {
      super(year, month - 1, day); // Months are 0-based in Date
    }
  } as DateConstructor;
  return () => { globalThis.Date = realDate; };
}

Deno.test({
  name: "Date parsing with timezone awareness",
  async fn() {
    // Mock current date to 2024-03-15 (during DST in northern hemisphere)
    const restore = mockDate(2024, 3, 15);

    const testCases = [
      {
        input: "Spent ₦5000 on groceries yesterday",
        expected: {
          description: "Groceries",
          amount: 5000,
          date: "2024-03-14"
        }
      },
      {
        input: "Received salary of ₦250000 last week",
        expected: {
          description: "Salary",
          amount: 250000,
          date: "2024-03-08"
        }
      },
      {
        input: "Paid ₦15000 for utilities on 2024-02-29", // Leap day
        expected: {
          description: "Utilities",
          amount: 15000,
          date: "2024-02-29"
        }
      },
      {
        input: "Bought ₦7500 worth of fuel today",
        expected: {
          description: "Fuel",
          date: "2024-03-15"
        }
      }
    ];

    for (const tc of testCases) {
      const testReq = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ text: tc.input })
      });
      
      const response = await serve(testReq);
      const data = await response.json();
      
      assertObjectMatch(data, tc.expected);
    }

    restore();
  }
});

// Additional tests for daylight saving transitions
Deno.test({
  name: "Daylight saving time transition handling",
  async fn() {
    // Mock date during DST transition (March 10, 2024 in US)
    const restore = mockDate(2024, 3, 11);

    const testReq = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ text: "Paid ₦3000 for dinner yesterday" })
    });

    const response = await serve(testReq);
    const data = await response.json();
    
    assertObjectMatch(data, {
      description: "Dinner",
      amount: 3000,
      date: "2024-03-10"
    });

    restore();
  }
});