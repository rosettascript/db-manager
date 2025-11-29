/**
 * Simple Test Framework
 * 
 * A minimal test framework for running tests in Node.js
 */

export interface TestResult {
  name: string;
  passed: boolean;
  error?: Error;
}

let currentDescribe: string = '';
let testResults: TestResult[] = [];

export function describe(name: string, fn: () => void) {
  const previousDescribe = currentDescribe;
  currentDescribe = previousDescribe ? `${previousDescribe} > ${name}` : name;
  try {
    fn();
  } catch (error) {
    console.error(`Error in describe "${name}":`, error);
  }
  currentDescribe = previousDescribe;
}

export function it(name: string, fn: () => void) {
  const testName = `${currentDescribe} > ${name}`;
  try {
    fn();
    testResults.push({ name: testName, passed: true });
    console.log(`✅ ${testName}`);
  } catch (error) {
    const err = error as Error;
    testResults.push({ name: testName, passed: false, error: err });
    console.error(`❌ ${testName}`);
    console.error(`   Error: ${err.message}`);
    if (err.stack) {
      console.error(`   Stack: ${err.stack.split('\n')[1]?.trim()}`);
    }
  }
}

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toContain(expected: any) {
      if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(String(expected))) {
          throw new Error(`Expected string to contain ${JSON.stringify(expected)}`);
        }
      } else {
        throw new Error('toContain can only be used with arrays or strings');
      }
    },
  };
}

export function getTestResults(): TestResult[] {
  return testResults;
}

export function resetTestResults() {
  testResults = [];
}

export function printSummary() {
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;

  console.log('\n' + '='.repeat(50));
  console.log('Test Summary');
  console.log('='.repeat(50));
  console.log(`Total: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\nFailed Tests:');
    testResults.filter(r => !r.passed).forEach(result => {
      console.log(`  ❌ ${result.name}`);
      if (result.error) {
        console.log(`     ${result.error.message}`);
      }
    });
  }

  return { passed, failed, total };
}

