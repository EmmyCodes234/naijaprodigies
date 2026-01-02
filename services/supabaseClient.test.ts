import { describe, it, expect } from 'vitest';
import { supabase } from './supabaseClient'

/**
 * Basic test to verify Supabase client is configured correctly
 * This will only work after you've set up your Supabase project
 * and added the credentials to .env.local
 */
describe('Supabase Client', () => {
  it('should be initialized', () => {
    expect(supabase).toBeDefined();
  });
});

export async function testSupabaseConnection() {
  try {
    // Test basic connection by querying the users table
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Supabase connection test failed:', error.message)
      return false
    }

    console.log('✓ Supabase connection successful!')
    return true
  } catch (error) {
    console.error('Supabase connection test error:', error)
    return false
  }
}

// Uncomment to run the test
// testSupabaseConnection()
