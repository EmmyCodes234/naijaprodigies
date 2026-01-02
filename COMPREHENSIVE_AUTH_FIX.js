// COMPREHENSIVE AUTHENTICATION FIX
// This script comprehensively addresses authentication issues

console.log('=== Comprehensive Authentication Fix ===');

async function runComprehensiveAuthFix() {
  console.log('1. Checking if we\'re in the application context...');
  
  // Check if we have access to the application's Supabase client
  let supabaseClient;
  try {
    // Try different ways to access the Supabase client
    if (typeof window !== 'undefined') {
      if (window.supabase) {
        supabaseClient = window.supabase;
        console.log('✅ Found Supabase client in window.supabase');
      } else {
        console.log('⚠️ No Supabase client found in window.supabase');
        console.log('This script needs to be run from within the application context');
        return;
      }
    } else {
      console.log('⚠️ Not running in a browser environment');
      return;
    }
  } catch (e) {
    console.error('❌ Error accessing Supabase client:', e.message);
    return;
  }
  
  console.log('\n2. Checking current authentication state...');
  
  try {
    // Get current session
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check error:', sessionError.message);
      return;
    }
    
    const session = sessionData?.session;
    
    if (!session) {
      console.log('❌ No active session found');
      console.log('Attempting to restore session...');
      
      // Try to get user directly
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError || !userData?.user) {
        console.log('❌ No authenticated user found');
        console.log('You may need to sign in again');
        return;
      } else {
        console.log('✅ User is authenticated but session may be expired');
        console.log('User ID:', userData.user.id);
      }
    } else {
      console.log('✅ Active session found');
      console.log('User ID:', session.user.id);
      console.log('Session expires:', new Date(session.expires_at * 1000));
    }
    
    console.log('\n3. Attempting to refresh session...');
    
    try {
      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession();
      
      if (refreshError) {
        console.error('❌ Session refresh failed:', refreshError.message);
      } else if (refreshData?.session) {
        console.log('✅ Session successfully refreshed');
        console.log('New expiration:', new Date(refreshData.session.expires_at * 1000));
      } else {
        console.log('ℹ️ No refresh needed or possible');
      }
    } catch (refreshEx) {
      console.error('❌ Exception during session refresh:', refreshEx.message);
    }
    
    console.log('\n4. Testing database connectivity...');
    
    // Test with a simple select query that requires authentication
    try {
      const { data: testUserData, error: testUserError } = await supabaseClient
        .from('users')
        .select('id')
        .limit(1);
      
      if (testUserError) {
        console.error('❌ Database connectivity test failed:', testUserError.message);
        if (testUserError.message.includes('401') || testUserError.message.includes('Unauthorized')) {
          console.log('🔍 This indicates an authentication issue');
        }
      } else {
        console.log('✅ Database connectivity test passed');
      }
    } catch (testEx) {
      console.error('❌ Exception during database test:', testEx.message);
    }
    
    console.log('\n5. Providing manual fix instructions...');
    
    console.log('\n🔧 MANUAL FIX INSTRUCTIONS:');
    console.log('1. Sign out and sign back in to refresh your session');
    console.log('2. If that doesn\'t work, try these steps:');
    console.log('   a. Clear browser cache and cookies for this site');
    console.log('   b. Restart the development server');
    console.log('   c. Check that your environment variables are correct');
    console.log('   d. Verify RLS policies are properly configured');
    
    console.log('\n📋 DEBUG INFORMATION:');
    console.log('- Current time:', new Date().toISOString());
    console.log('- Supabase client available:', !!supabaseClient);
    console.log('- Session active:', !!session);
    
    if (session) {
      console.log('- Session expires in:', Math.max(0, Math.floor((session.expires_at * 1000 - Date.now()) / 1000)), 'seconds');
    }
    
    console.log('\n=== Comprehensive Auth Fix Complete ===');
    console.log('If issues persist, try the manual fix instructions above');
    
  } catch (error) {
    console.error('❌ Unexpected error during auth fix:', error.message);
    console.log('\n=== Comprehensive Auth Fix Failed ===');
    return;
  }
}

// Run the comprehensive fix
runComprehensiveAuthFix();

// Export for manual use
window.runComprehensiveAuthFix = runComprehensiveAuthFix;

console.log('\nTo run again, type: runComprehensiveAuthFix()');