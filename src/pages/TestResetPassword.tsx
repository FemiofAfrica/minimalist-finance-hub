import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PublicLayout from '@/components/PublicLayout';

const TestResetPassword = () => {
  const [testUrl, setTestUrl] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const navigate = useNavigate();

  const testUrlParsing = () => {
    try {
      const url = new URL(testUrl);
      const urlParams = new URLSearchParams(url.search);
      const hash = url.hash;
      
      const results = {
        originalUrl: testUrl,
        pathname: url.pathname,
        search: url.search,
        hash: hash,
        urlParams: Object.fromEntries(urlParams),
        hashParams: {}
      };

      // Parse hash fragment
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        results.hashParams = Object.fromEntries(hashParams);
      }

      // Check what our logic would determine
      const type = results.hashParams.type || urlParams.get('type');
      const accessToken = results.hashParams.access_token || urlParams.get('access_token');
      const refreshToken = results.hashParams.refresh_token || urlParams.get('refresh_token');
      const token = urlParams.get('token');

      const analysis = {
        type,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasToken: !!token,
        isRecoveryType: type === 'recovery',
        wouldBeValid: type === 'recovery' || !!(accessToken && refreshToken) || !!token,
        hasAnyAuthParams: !!(type || accessToken || refreshToken || token || 
                            hash.includes('access_token') || 
                            hash.includes('recovery'))
      };

      setTestResults({ ...results, analysis });
    } catch (error) {
      setTestResults({ 
        error: error instanceof Error ? error.message : 'Invalid URL format',
        originalUrl: testUrl 
      });
    }
  };

  const testExampleUrls = [
    {
      name: "Modern Supabase Format",
      url: `${window.location.origin}/reset-password#access_token=example_token&refresh_token=example_refresh&type=recovery&expires_in=3600`
    },
    {
      name: "Legacy Format",
      url: `${window.location.origin}/reset-password?token=example_token&type=recovery`
    },
    {
      name: "Invalid URL (should fail)",
      url: `${window.location.origin}/reset-password`
    }
  ];

  if (!import.meta.env.DEV) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8f1df]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Test Page Not Available</h2>
            <p className="mb-4">This test page is only available in development mode.</p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8f1df] p-8">
        <div className="w-full max-w-4xl space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-2">Password Reset URL Testing</h1>
            <p className="text-gray-600">Test password reset URL parsing logic</p>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="space-y-4">
              <div>
                <Label htmlFor="testUrl">Test URL</Label>
                <Input
                  id="testUrl"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="Paste a password reset URL here"
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={testUrlParsing} disabled={!testUrl}>
                  Test URL Parsing
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setTestUrl('')}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium mb-4">Quick Test Examples</h3>
            <div className="space-y-2">
              {testExampleUrls.map((example, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestUrl(example.url)}
                  >
                    Load
                  </Button>
                  <span className="text-sm">{example.name}</span>
                </div>
              ))}
            </div>
          </div>

          {testResults && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-medium mb-4">Test Results</h3>
              
              {testResults.error ? (
                <div className="bg-red-50 p-4 rounded border text-red-700">
                  <strong>Error:</strong> {testResults.error}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-green-700">✅ URL Parsed Successfully</h4>
                    <p className="text-sm text-gray-600">
                      Would be considered: {testResults.analysis.wouldBeValid ? '✅ Valid' : '❌ Invalid'}
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">URL Components</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify({
                          pathname: testResults.pathname,
                          search: testResults.search,
                          hash: testResults.hash,
                          urlParams: testResults.urlParams,
                          hashParams: testResults.hashParams
                        }, null, 2)}
                      </pre>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Analysis</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(testResults.analysis, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium mb-2 text-blue-800">Current Environment</h3>
            <div className="text-sm space-y-1 text-blue-700">
              <p><strong>Origin:</strong> {window.location.origin}</p>
              <p><strong>Current URL:</strong> {window.location.href}</p>
              <p><strong>Expected Reset URL:</strong> {window.location.origin}/reset-password</p>
            </div>
          </div>

          <div className="text-center">
            <Button onClick={() => navigate('/login')} variant="outline">
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default TestResetPassword; 