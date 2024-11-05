'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProcessedResult {
  pageNumber: number;
  extractedText?: string;
  imageBase64?: string;
  isLoading?: boolean;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const processDocument = async () => {
    if (!url) return;
    setIsProcessing(true);
    setAnalysis('');
    setResults([]);

    try {
      const captureRes = await fetch('/api/browse', {
        method: 'POST',
        body: JSON.stringify({ url })
      });
      
      const { screenshots } = await captureRes.json();
      
      setResults(screenshots.map((s: { pageNumber: number; base64Image: string }) => ({
        pageNumber: s.pageNumber,
        imageBase64: s.base64Image,
        isLoading: true,
      })));

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        body: JSON.stringify({ screenshots })
      });

      const { results: extractedTexts } = await extractRes.json();
      
      setResults(prev => 
        prev.map(result => {
          const extractedData = extractedTexts.find(
            (e: { pageNumber: number }) => e.pageNumber === result.pageNumber
          );
          return {
            ...result,
            extractedText: extractedData?.text,
            isLoading: false,
          };
        })
      );
    } catch (error) {
      console.error('Error processing document:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeWithClaude = async () => {
    if (!results.length) return;
    
    setIsAnalyzing(true);
    try {
      const screenshots = results.map(r => ({
        pageNumber: r.pageNumber,
        base64Image: r.imageBase64
      }));

      const analysisRes = await fetch('/api/analyze-pdf', {
        method: 'POST',
        body: JSON.stringify({ screenshots })
      });

      const { analysis } = await analysisRes.json();
      setAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing with Claude:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-2xl font-bold text-center mb-6">Canva Presentation Processor</h1>
          <div className="flex gap-4 items-center justify-center">
            <div className="flex-grow max-w-xl">
              <Input
                placeholder="Paste your Canva presentation URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={processDocument}
              disabled={isProcessing || !url}
              className="whitespace-nowrap"
            >
              {isProcessing ? 'Processing...' : 'Process'}
            </Button>
            {results.length > 0 && (
              <Button
                onClick={analyzeWithClaude}
                disabled={isAnalyzing}
                className="whitespace-nowrap"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze with Claude'}
              </Button>
            )}
          </div>
        </div>

        {/* Analysis Section */}
        {isAnalyzing && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {analysis && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Presentation Analysis</h2>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap text-gray-600">
                {analysis}
              </pre>
            </div>
          </div>
        )}

        {/* Results Section */}
        <div className="space-y-8">
          {results.map((result, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-100 border-b">
                <h2 className="text-xl font-bold">Page {result.pageNumber}</h2>
              </div>
              <div className="p-6 flex flex-col gap-6">
                {result.imageBase64 && (
                  <div className="rounded-lg overflow-hidden border">
                    <Image
                      src={`data:image/png;base64,${result.imageBase64}`}
                      alt={`Screenshot ${result.pageNumber}`}
                      width={800}
                      height={600}
                      className="w-full h-auto"
                      unoptimized
                    />
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold mb-4 text-gray-700">Extracted Text:</h3>
                  {result.isLoading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-gray-600 font-mono text-sm">
                      {result.extractedText}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
