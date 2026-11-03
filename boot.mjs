import {startApp} from './app.mjs';
try {const response=await fetch('./config.json',{cache:'no-store'});if(!response.ok)throw Error();await startApp({config:await response.json()});}catch{document.getElementById('account-status').textContent='Recipe entry is unavailable. Please return to the family site.';}
