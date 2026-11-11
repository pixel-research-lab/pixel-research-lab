import {initializeApp} from 'firebase/app';
import {initializeAuth,indexedDBLocalPersistence,browserPopupRedirectResolver} from 'firebase/auth';
import config from './config.json';
const inPage=typeof document!=='undefined';
export const app=initializeApp(config,'pixel-research-lab');
export const auth=initializeAuth(app,{persistence:indexedDBLocalPersistence,...(inPage?{popupRedirectResolver:browserPopupRedirectResolver}:{})});
