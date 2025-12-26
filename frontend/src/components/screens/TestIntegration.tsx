import { memo, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TestSuite {
  name: string;
  passed: number;
  failed: number;
  pending: number;
  duration: number;
}

interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'pending';
  duration: number;
  file: string;
  error?: string;
}

const testSuites: TestSuite[] = [
  { name: 'User Model', passed: 24, failed: 0, pending: 2, duration: 0.543 },
  { name: 'Post Model', passed: 18, failed: 2, pending: 0, duration: 0.892 },
  { name: 'Comments Controller', passed: 15, failed: 1, pending: 1, duration: 1.234 },
  { name: 'API Integration', passed: 32, failed: 0, pending: 0, duration: 2.145 },
];

const recentTests: TestResult[] = [
  { id: '1', name: 'User#create should validate email format', status: 'passed', duration: 0.023, file: 'spec/models/user_spec.rb:45' },
  { id: '2', name: 'Post#publish should update published_at timestamp', status: 'failed', duration: 0.156, file: 'spec/models/post_spec.rb:78', error: 'Expected published_at to be present, got nil' },
  { id: '3', name: 'CommentsController#create should increment comment count', status: 'failed', duration: 0.089, file: 'spec/controllers/comments_controller_spec.rb:23', error: 'Expected difference of 1, got 0' },
  { id: '4', name: 'API#users should return paginated results', status: 'passed', duration: 0.234, file: 'spec/requests/api/users_spec.rb:12' },
  { id: '5', name: 'User#avatar should process image uploads', status: 'pending', duration: 0, file: 'spec/models/user_spec.rb:89' },
];

const slowTests = [
  { name: 'Integration test for complete user workflow', duration: 3.456, file: 'spec/integration/user_workflow_spec.rb' },
  { name: 'API rate limiting with multiple requests', duration: 2.891, file: 'spec/requests/rate_limiting_spec.rb' },
  { name: 'Email delivery with attachments', duration: 2.145, file: 'spec/mailers/user_mailer_spec.rb' },
];

const TestSuiteCard = memo<{ suite: TestSuite }>(({ suite }) => {
  const total = suite.passed + suite.failed + suite.pending;
  const passRate = ((suite.passed / total) * 100).toFixed(1);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-white font-medium mb-1">{suite.name}</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-400">{suite.passed} passed</span>
            {suite.failed > 0 && <span className="text-red-400">{suite.failed} failed</span>}
            {suite.pending > 0 && <span className="text-yellow-400">{suite.pending} pending</span>}
            <span className="text-gray-500">• {suite.duration}s</span>
          </div>
        </div>
        <div className="text-right">
          <p className={cn('text-lg font-bold', suite.failed > 0 ? 'text-red-400' : 'text-green-400')}>
            {passRate}%
          </p>
          <p className="text-xs text-gray-500">pass rate</p>
        </div>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
        <div className="bg-green-500 h-full" style={{ width: `${(suite.passed / total) * 100}%` }} />
        <div className="bg-red-500 h-full" style={{ width: `${(suite.failed / total) * 100}%` }} />
        <div className="bg-yellow-500 h-full" style={{ width: `${(suite.pending / total) * 100}%` }} />
      </div>
    </div>
  );
});

TestSuiteCard.displayName = 'TestSuiteCard';

const TestResultCard = memo<{ test: TestResult }>(({ test }) => (
  <div className="p-4 border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
    <div className="flex items-start gap-3">
      {test.status === 'passed' && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />}
      {test.status === 'failed' && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
      {test.status === 'pending' && <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />}

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white mb-1">{test.name}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <code className="text-cyan-400">{test.file}</code>
          {test.duration > 0 && <span>{test.duration}s</span>}
        </div>
        {test.error && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
            {test.error}
          </div>
        )}
      </div>
    </div>
  </div>
));

TestResultCard.displayName = 'TestResultCard';

export const TestIntegration = memo(() => {
  const [isRunning, setIsRunning] = useState(false);

  const totalTests = testSuites.reduce((acc, suite) => acc + suite.passed + suite.failed + suite.pending, 0);
  const totalPassed = testSuites.reduce((acc, suite) => acc + suite.passed, 0);
  const totalFailed = testSuites.reduce((acc, suite) => acc + suite.failed, 0);
  const totalPending = testSuites.reduce((acc, suite) => acc + suite.pending, 0);
  const totalDuration = testSuites.reduce((acc, suite) => acc + suite.duration, 0);
  const coverage = 94.2;

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Test Integration</h1>
            <Badge variant="default">RSpec</Badge>
          </div>
          <p className="text-sm text-gray-400">Monitor test execution and coverage</p>
        </div>
        <Button onClick={() => setIsRunning(!isRunning)} variant={isRunning ? 'destructive' : 'success'}>
          <Play className="w-5 h-5" />
          {isRunning ? 'Running...' : 'Run All Tests'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { icon: CheckCircle, label: 'Total Tests', value: totalTests, iconColor: 'text-gray-400' },
          { icon: CheckCircle, label: 'Passed', value: totalPassed, iconColor: 'text-green-400', valueColor: 'text-green-400' },
          { icon: XCircle, label: 'Failed', value: totalFailed, iconColor: 'text-red-400', valueColor: 'text-red-400' },
          { icon: AlertCircle, label: 'Pending', value: totalPending, iconColor: 'text-yellow-400', valueColor: 'text-yellow-400' },
          { icon: Clock, label: 'Duration', value: `${totalDuration.toFixed(2)}s`, iconColor: 'text-cyan-400' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-gray-900 border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-4 h-4', stat.iconColor)} />
                <span className="text-sm text-gray-400">{stat.label}</span>
              </div>
              <p className={cn('text-2xl font-bold', stat.valueColor || 'text-white')}>{stat.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Coverage */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Test Coverage</h2>
          <span className="text-2xl font-bold text-cyan-400">{coverage}%</span>
        </div>
        <Progress value={coverage} className="h-3" indicatorClassName="from-cyan-500 to-green-500" />
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Lines', value: '94.2%' },
            { label: 'Branches', value: '89.7%' },
            { label: 'Functions', value: '96.5%' },
            { label: 'Statements', value: '93.8%' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-gray-400 mb-1">{item.label}</p>
              <p className="text-gray-300 font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Test Suites */}
      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Test Suites</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {testSuites.map((suite) => (
            <TestSuiteCard key={suite.name} suite={suite} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Test Results */}
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Recent Test Results</h2>
          </div>
          <ScrollArea className="h-96">
            {recentTests.map((test) => (
              <TestResultCard key={test.id} test={test} />
            ))}
          </ScrollArea>
        </Card>

        {/* Slow Tests */}
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Slowest Tests</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {slowTests.map((test, index) => (
              <div key={index} className="p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white mb-1">{test.name}</p>
                    <code className="text-xs text-cyan-400">{test.file}</code>
                  </div>
                  <p className={cn('text-lg font-bold', test.duration > 2 ? 'text-red-400' : 'text-yellow-400')}>
                    {test.duration}s
                  </p>
                </div>
                <Progress
                  value={Math.min((test.duration / 4) * 100, 100)}
                  className="h-1.5"
                  indicatorClassName={test.duration > 2 ? 'bg-red-500' : 'bg-yellow-500'}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
});

TestIntegration.displayName = 'TestIntegration';
