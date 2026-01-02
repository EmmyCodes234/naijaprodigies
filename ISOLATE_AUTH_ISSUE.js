// ISOLATE AUTHENTICATION ISSUE
// Run this in your browser console to test isolated database calls

console.log('=== Isolating Authentication Issue ===');

// Test 1: Check current auth state
console.log('1. Checking current auth state...');
supabase.auth.getUser().then(({ data, error }) => {
  console.log('Current user:', data.user);
  console.log('Auth error:', error);
  
  if (data.user) {
    console.log('✅ Frontend is authenticated');
    
    // Test 2: Try to create a conversation directly
    console.log('\\n2. Attempting to create conversation...');
    supabase
      .from('conversations')
      .insert({})
      .select()
      .single()
      .then(({ data, error }) => {
        console.log('Conversation creation result:', { data, error });
        
        if (error) {
          console.log('❌ Conversation creation failed');
          
          // Test 3: Check if it's an RLS issue
          if (error.message.includes('row-level security')) {
            console.log('🔍 Confirmed: RLS policy violation');
            
            // Test 4: Check auth context in database
            console.log('\\n3. Checking database auth context...');
            // This would normally be run in SQL editor:
            // SELECT auth.uid() as current_user_id;
          }
        } else {
          console.log('✅ Conversation created successfully');
          console.log('Conversation ID:', data.id);
        }
      });
  } else {
    console.log('❌ Frontend is NOT authenticated');
  }
});

// Test 5: Manual token setting
setTimeout(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      console.log('\\n4. Manually setting session token...');
      supabase.auth.setSession(session).then(() => {
        console.log('✅ Session token set manually');
        
        // Try again after manual token setting
        console.log('\\n5. Retrying conversation creation...');
        supabase
          .from('conversations')
          .insert({})
          .select()
          .single()
          .then(({ data, error }) => {
            console.log('Retry result:', { data, error });
          });
      });
    }
  });
}, 1000);