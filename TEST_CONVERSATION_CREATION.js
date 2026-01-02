// TEST CONVERSATION CREATION WITH EXPLICIT AUTH
// This script tests conversation creation with explicit authentication headers

console.log('=== Test Conversation Creation ===');

async function testConversationCreation() {
  console.log('1. Checking Supabase client availability...');
  
  // Check if we have access to the application's Supabase client
  let supabaseClient;
  try {
    if (typeof window !== 'undefined' && window.supabase) {
      supabaseClient = window.supabase;
      console.log('✅ Found Supabase client in window.supabase');
    } else {
      console.log('❌ No Supabase client found');
      return;
    }
  } catch (e) {
    console.error('❌ Error accessing Supabase client:', e.message);
    return;
  }
  
  console.log('\n2. Checking authentication state...');
  
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
      return;
    }
    
    console.log('✅ Active session found');
    console.log('User ID:', session.user.id);
    console.log('Token expires:', new Date(session.expires_at * 1000));
    
    // Test conversation creation with explicit auth header
    console.log('\n3. Testing conversation creation with explicit auth...');
    
    const accessToken = session.access_token;
    const supabaseUrl = 'https://kmeporfxbvyqrtukovlk.supabase.co';
    
    // Test creating a conversation directly with fetch
    console.log('   a. Creating conversation with fetch API...');
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
        method: 'POST',
        headers: {
          'apikey': accessToken,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversation created successfully with fetch');
        console.log('Conversation ID:', data[0]?.id);
        
        // Clean up - delete the test conversation
        if (data[0]?.id) {
          const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/conversations?id=eq.${data[0].id}`, {
            method: 'DELETE',
            headers: {
              'apikey': accessToken,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (deleteResponse.ok) {
            console.log('✅ Test conversation cleaned up');
          } else {
            console.log('⚠️ Could not clean up test conversation');
          }
        }
        
        console.log('\n=== Test Complete ===');
        console.log('✅ Conversation creation with explicit auth works');
        console.log('Try creating a conversation in the app again');
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Conversation creation failed with fetch:', response.status, errorText);
        
        if (response.status === 403) {
          console.log('🔍 This is the same RLS policy violation we\'re trying to fix');
        }
        
        console.log('\n=== Test Complete ===');
        console.log('❌ Conversation creation with explicit auth failed');
        return false;
      }
    } catch (fetchError) {
      console.error('❌ Exception during fetch test:', fetchError.message);
      console.log('\n=== Test Complete ===');
      console.log('❌ Conversation creation test failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.log('\n=== Test Complete ===');
    console.log('❌ Conversation creation test failed');
    return false;
  }
}

// Run the test
testConversationCreation();

// Export for manual use
window.testConversationCreation = testConversationCreation;

console.log('\nTo run again, type: testConversationCreation()');