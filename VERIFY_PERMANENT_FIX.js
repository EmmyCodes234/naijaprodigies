// VERIFY PERMANENT FIX
// Run this script to verify the RLS fix is working

console.log('=== Verifying Permanent Fix ===');

async function verifyPermanentFix() {
  console.log('1. Checking Supabase client...');
  
  // Check if we have access to the application's Supabase client
  let supabaseClient;
  try {
    if (typeof window !== 'undefined' && window.supabase) {
      supabaseClient = window.supabase;
      console.log('✅ Found Supabase client');
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
    
    console.log('\n3. Testing database access...');
    
    // Test reading from conversations (should work if RLS is properly configured)
    try {
      const { data: conversations, error: conversationsError } = await supabaseClient
        .from('conversations')
        .select('id')
        .limit(1);
      
      if (conversationsError) {
        console.error('❌ Conversations read failed:', conversationsError.message);
      } else {
        console.log('✅ Conversations read successful');
      }
    } catch (readError) {
      console.error('❌ Exception during conversations read:', readError.message);
    }
    
    console.log('\n4. Testing conversation creation...');
    
    // Test creating a conversation
    try {
      const { data: newConversation, error: createError } = await supabaseClient
        .from('conversations')
        .insert({})
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Conversation creation failed:', createError.message);
        if (createError.message.includes('403') || createError.message.includes('row-level security')) {
          console.log('🔍 This indicates the RLS policy issue is still present');
        }
      } else {
        console.log('✅ Conversation created successfully');
        console.log('Conversation ID:', newConversation.id);
        
        // Clean up - delete the test conversation
        try {
          const { error: deleteError } = await supabaseClient
            .from('conversations')
            .delete()
            .eq('id', newConversation.id);
          
          if (deleteError) {
            console.log('⚠️ Could not clean up test conversation:', deleteError.message);
          } else {
            console.log('✅ Test conversation cleaned up');
          }
        } catch (deleteEx) {
          console.log('⚠️ Exception during cleanup:', deleteEx.message);
        }
        
        console.log('\n=== Verification Complete ===');
        console.log('✅ Permanent fix appears to be working correctly');
        return true;
      }
    } catch (createEx) {
      console.error('❌ Exception during conversation creation:', createEx.message);
    }
    
    console.log('\n=== Verification Complete ===');
    console.log('❌ Permanent fix verification failed');
    return false;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.log('\n=== Verification Complete ===');
    console.log('❌ Permanent fix verification failed');
    return false;
  }
}

// Run the verification
verifyPermanentFix();

// Export for manual use
window.verifyPermanentFix = verifyPermanentFix;

console.log('\nTo run again, type: verifyPermanentFix()');