// FORCE AUTHENTICATION FIX
// This script forces proper authentication for database requests

// First, try to get the supabase client from the application
let supabase;
try {
  // Try to get supabase from the global scope (if exported)
  if (typeof window !== 'undefined' && window.supabase) {
    supabase = window.supabase;
  } else {
    // If not available, inform the user they need to run this from the app context
    console.log('⚠️ Supabase client not found in global scope');
    console.log('Please run this script from within the application context where supabase is available');
    console.log('Or manually assign the supabase client to window.supabase before running this script');
    throw new Error('Supabase client not accessible');
  }
} catch (e) {
  console.error('Error accessing Supabase client:', e.message);
  console.log('\nTo use this script, first assign your Supabase client to window.supabase:');
  console.log('window.supabase = yourSupabaseClientInstance;');
  return;
}

console.log('=== Force Authentication Fix ===');

async function forceAuthFix() {
  console.log('1. Getting current session...');
  
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return false;
    }
    
    if (!session) {
      console.log('❌ No active session');
      return false;
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
      return false;
    }
    
    console.log('✅ Session set successfully');
    
    // Test with explicit authorization header
    console.log('\n4. Testing with explicit auth header...');
    
    // Get Supabase URL and key from environment or client
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || supabase.supabaseUrl || 'https://kmeporfxbvyqrtukovlk.supabase.co';
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || supabase.supabaseKey || '';
    
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
      
      return true;
    } else {
      const errorText = await testResponse.text();
      console.error('❌ Direct API call failed:', testResponse.status, errorText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the fix
forceAuthFix().then(success => {
  console.log('\n=== Force Auth Fix Complete ===');
  if (success) {
    console.log('✅ Authentication should now be working properly');
    console.log('Try creating a conversation again');
  } else {
    console.log('❌ Authentication fix failed');
    console.log('Check the error messages above');
  }
});

// Export for manual use
window.forceAuthFix = forceAuthFix;