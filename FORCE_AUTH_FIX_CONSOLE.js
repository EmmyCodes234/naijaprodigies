// FORCE AUTHENTICATION FIX FOR CONSOLE
// This script forces proper authentication for database requests

console.log('=== Force Authentication Fix ===');

// Function to run the authentication fix
async function runForceAuthFix() {
  // First, try to get the supabase client from the application
  let supabase;
  try {
    // Try to get supabase from the global scope (if exported)
    if (typeof window !== 'undefined' && window.supabase) {
      supabase = window.supabase;
      console.log('✅ Supabase client found in global scope');
    } else {
      console.log('⚠️ Supabase client not found in global scope');
      console.log('Please make sure you\'re running this from within the application context');
      return;
    }
  } catch (e) {
    console.error('Error accessing Supabase client:', e.message);
    return;
  }

  console.log('1. Getting current session...');
  
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }
    
    if (!session) {
      console.log('❌ No active session');
      return;
    }
    
    console.log('✅ Session found');
    console.log('User ID:', session.user.id);
    console.log('Token expires at:', new Date(session.expires_at * 1000));
    
    // Force refresh the session
    console.log('\n2. Refreshing session...');
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('❌ Refresh error:', refreshError);
      // Continue with current session
    } else {
      console.log('✅ Session refreshed');
    }
    
    // Explicitly set the session
    console.log('\n3. Setting session explicitly...');
    const { error: setSessionError } = await supabase.auth.setSession(session);
    
    if (setSessionError) {
      console.error('❌ Set session error:', setSessionError);
      return;
    }
    
    console.log('✅ Session set successfully');
    
    // Test with explicit authorization header
    console.log('\n4. Testing with explicit auth header...');
    
    // Get Supabase URL and key from environment or client
    const supabaseUrl = 'https://kmeporfxbvyqrtukovlk.supabase.co';
    const supabaseKey = ''; // This will use the client's built-in key
    
    const testResponse = await fetch(
      `${supabaseUrl}/rest/v1/conversations?select=*`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({})
      }
    );
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ Direct API call successful');
      console.log('Test conversation ID:', testData[0]?.id);
      
      // Clean up test conversation
      if (testData[0]?.id) {
        await fetch(
          `${supabaseUrl}/rest/v1/conversations?id=eq.${testData[0].id}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('🧹 Test conversation cleaned up');
      }
      
      console.log('\n=== Force Auth Fix Complete ===');
      console.log('✅ Authentication should now be working properly');
      console.log('Try creating a conversation again');
      return true;
    } else {
      const errorText = await testResponse.text();
      console.error('❌ Direct API call failed:', testResponse.status, errorText);
      
      console.log('\n=== Force Auth Fix Complete ===');
      console.log('❌ Authentication fix completed but test failed');
      console.log('Check the error messages above');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    
    console.log('\n=== Force Auth Fix Complete ===');
    console.log('❌ Authentication fix failed');
    console.log('Check the error messages above');
    return;
  }
}

// Run the fix
runForceAuthFix();

// Export for manual use
window.runForceAuthFix = runForceAuthFix;

console.log('\nTo run again, type: runForceAuthFix()');