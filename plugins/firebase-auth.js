export async function createFirebaseAuthPlugin({firebaseConfig,persistence='local'}={}){
  const [A,Auth]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js')
  ]);
  const app=A.getApps()[0]||A.initializeApp(firebaseConfig);
  const auth=Auth.getAuth(app);
  if(persistence==='local')await Auth.setPersistence(auth,Auth.browserLocalPersistence);
  await auth.authStateReady();
  const api={
    app,auth,
    currentUser:()=>auth.currentUser,
    isConnected:()=>!!auth.currentUser,
    onChange:fn=>Auth.onAuthStateChanged(auth,fn),
    signInEmail:(email,password)=>Auth.signInWithEmailAndPassword(auth,email,password),
    signInAnonymous:()=>Auth.signInAnonymously(auth),
    signOut:()=>Auth.signOut(auth)
  };
  window.AppPlatform?.register?.('firebase-auth',api);
  return api;
}
