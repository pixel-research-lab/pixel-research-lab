import {GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'firebase/auth';
import {getFirestore,collection,onSnapshot} from 'firebase/firestore';
import {app,auth} from './identity.js';
import {unpack} from './transport.js';
export {flush} from './transport.js';
export {auth, onAuthStateChanged, signOut};
export function login(){return signInWithPopup(auth,new GoogleAuthProvider());}
const store=getFirestore(app);
export function listen(uid,changed,error){
  let first=true;
  return onSnapshot(collection(store,'players',uid,'records'),{includeMetadataChanges:true},snap=>{
    if(snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
    try{const docs=first?snap.docs:snap.docChanges().filter(x=>x.type!=='removed').map(x=>x.doc);
      first=false;changed(docs.map(unpack));}
    catch(e){error(e);}
  },error);
}
