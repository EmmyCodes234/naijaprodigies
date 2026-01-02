// ENSURE AUTHENTICATION SYNCHRONIZATION
// This script ensures proper session synchronization between frontend and database

console.log('=== Ensuring Authentication Synchronization ===');

// Function to ensure proper auth sync
async function ensureAuthSync() {
  console.log('1. Getting current session...');
  
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return false;
    }
    
    if (!session) {
      console.log('❌ No active session');
      return false;
    }
    
    console.log('✅ Session found:', {
      user_id: session.user.id,
      expires_at: session.expires_at,
      has_access_token: !!session.access_token
    });
    
    // Explicitly set the session to ensure token is attached to requests
    console.log('2. Setting session explicitly...');
    const { error: setSessionError } = await supabase.auth.setSession(session);
    
    if (setSessionError) {
      console.error('Set session error:', setSessionError);
      return false;
    }
    
    console.log('✅ Session set successfully');
    
    // Verify the session is active
    console.log('3. Verifying session...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('User error:', userError);
      return false;
    }
    
    if (!user) {
      console.log('❌ No user found');
      return false;
    }
    
    console.log('✅ User verified:', user.id);
    return true;
    
  } catch (error) {
    console.error('Unexpected error in auth sync:', error);
    return false;
  }
}

// Function to test conversation creation with synced auth
async function testConversationCreation() {
  console.log('\\n=== Testing Conversation Creation ===');
  
  // Ensure auth is synced
  const isSynced = await ensureAuthSync();
  
  if (!isSynced) {
    console.log('❌ Authentication not synced, aborting test');
    return;
  }
  
  // Try to create a conversation
  console.log('4. Attempting conversation creation...');
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();
      
    if (error) {
      console.log('❌ Conversation creation failed:', error.message);
      
      // Detailed error analysis
      if (error.message.includes('row-level security')) {
        console.log('🔍 RLS policy violation detected');
        console.log('This indicates the database request lacks proper authentication');
      }
      
      return { success: false, error };
    }
    
    console.log('✅ Conversation created successfully:', data.id);
    
    // Cleanup: delete the test conversation
    await supabase
      .from('conversations')
      .delete()
      .eq('id', data.id);
      
    console.log('🧹 Test conversation cleaned up');
    
    return { success: true, conversationId: data.id };
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error };
  }
}

// Run the test
testConversationCreation().then(result => {
  console.log('\\n=== Test Complete ===');
  console.log('Result:', result);
});

// Export for manual use
window.ensureAuthSync = ensureAuthSync;
window.testConversationCreation = testConversationCreation;