// TEST AUTHENTICATION FLOW
// Run this in your browser console to test authentication

console.log('=== Authentication Flow Test ===');

// 1. Check current session
supabase.auth.getSession().then(({ data, error }) => {
  console.log('1. Current session:', data.session);
  console.log('1. Session error:', error);
  
  if (data.session) {
    console.log('✅ User is authenticated');
    console.log('User ID:', data.session.user.id);
    
    // 2. Test database access with auth
    console.log('\\n2. Testing database access...');
    
    // Test conversations table access
    supabase
      .from('conversations')
      .select('id')
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          console.log('❌ Database access failed:', error.message);
        } else {
          console.log('✅ Database access successful');
        }
      });
  } else {
    console.log('❌ User is NOT authenticated');
    console.log('Please sign in to continue');
  }
});

// 3. Check auth state change listener
const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
  console.log('3. Auth state change detected:', event);
  if (session) {
    console.log('User signed in:', session.user.id);
  } else {
    console.log('User signed out');
  }
});

// Clean up listener
// subscription.subscription.unsubscribe();