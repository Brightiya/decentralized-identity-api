import Sequencer from '@jest/test-sequencer';

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Run auth & consent tests **sequentially first**
    const authTests = tests.filter(t => 
      t.path.includes('auth.test.js') || 
      t.path.includes('consent.test.js')
    );
    const others = tests.filter(t => !authTests.includes(t));

    // Return auth tests in order, then everything else
    return [...authTests, ...others];
  }
}

export default CustomSequencer;