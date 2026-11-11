import {auth} from './identity.js';
import {flush} from './transport.js';
self.flushPixelResearchLab=async ()=>{
  await auth.authStateReady();
  if(auth.currentUser) await flush(auth.currentUser.uid);
};
