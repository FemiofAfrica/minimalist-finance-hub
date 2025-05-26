"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import StructuredReceiptUploader from '@/components/transactions/StructuredReceiptUploader';
import { ReceiptData } from '@/utils/structuredOcr';

export default function StructuredOcrExamplePage() {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const handleDataExtracted = (data: ReceiptData) => {
    setReceiptData(data);
    console.log('Extracted Receipt Data:', data);
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Structured OCR Demo</h1>
        <p className="text-muted-foreground">
          This example demonstrates extracting structured data from receipts using OCR.space and Groq AI.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Receipt</CardTitle>
            <CardDescription>
              Upload a receipt image to extract structured data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StructuredReceiptUploader onDataExtracted={handleDataExtracted} />
          </CardContent>
        </Card>

        {receiptData && (
          <Card>
            <CardHeader>
              <CardTitle>Raw Structured Data</CardTitle>
              <CardDescription>
                The complete JSON data extracted from the receipt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap text-xs">
                {JSON.stringify(receiptData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 