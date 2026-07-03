import{r as uo,_ as lo,W as ho}from"./firebase-auth-BR0mv8MV.js";const fo=()=>{};var Gr={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Si=function(e){const n=[];let r=0;for(let s=0;s<e.length;s++){let a=e.charCodeAt(s);a<128?n[r++]=a:a<2048?(n[r++]=a>>6|192,n[r++]=a&63|128):(a&64512)===55296&&s+1<e.length&&(e.charCodeAt(s+1)&64512)===56320?(a=65536+((a&1023)<<10)+(e.charCodeAt(++s)&1023),n[r++]=a>>18|240,n[r++]=a>>12&63|128,n[r++]=a>>6&63|128,n[r++]=a&63|128):(n[r++]=a>>12|224,n[r++]=a>>6&63|128,n[r++]=a&63|128)}return n},po=function(e){const n=[];let r=0,s=0;for(;r<e.length;){const a=e[r++];if(a<128)n[s++]=String.fromCharCode(a);else if(a>191&&a<224){const l=e[r++];n[s++]=String.fromCharCode((a&31)<<6|l&63)}else if(a>239&&a<365){const l=e[r++],u=e[r++],_=e[r++],E=((a&7)<<18|(l&63)<<12|(u&63)<<6|_&63)-65536;n[s++]=String.fromCharCode(55296+(E>>10)),n[s++]=String.fromCharCode(56320+(E&1023))}else{const l=e[r++],u=e[r++];n[s++]=String.fromCharCode((a&15)<<12|(l&63)<<6|u&63)}}return n.join("")},Ii={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(e,n){if(!Array.isArray(e))throw Error("encodeByteArray takes an array as a parameter");this.init_();const r=n?this.byteToCharMapWebSafe_:this.byteToCharMap_,s=[];for(let a=0;a<e.length;a+=3){const l=e[a],u=a+1<e.length,_=u?e[a+1]:0,E=a+2<e.length,v=E?e[a+2]:0,S=l>>2,I=(l&3)<<4|_>>4;let A=(_&15)<<2|v>>6,k=v&63;E||(k=64,u||(A=64)),s.push(r[S],r[I],r[A],r[k])}return s.join("")},encodeString(e,n){return this.HAS_NATIVE_SUPPORT&&!n?btoa(e):this.encodeByteArray(Si(e),n)},decodeString(e,n){return this.HAS_NATIVE_SUPPORT&&!n?atob(e):po(this.decodeStringToByteArray(e,n))},decodeStringToByteArray(e,n){this.init_();const r=n?this.charToByteMapWebSafe_:this.charToByteMap_,s=[];for(let a=0;a<e.length;){const l=r[e.charAt(a++)],_=a<e.length?r[e.charAt(a)]:0;++a;const v=a<e.length?r[e.charAt(a)]:64;++a;const I=a<e.length?r[e.charAt(a)]:64;if(++a,l==null||_==null||v==null||I==null)throw new go;const A=l<<2|_>>4;if(s.push(A),v!==64){const k=_<<4&240|v>>2;if(s.push(k),I!==64){const R=v<<6&192|I;s.push(R)}}}return s},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let e=0;e<this.ENCODED_VALS.length;e++)this.byteToCharMap_[e]=this.ENCODED_VALS.charAt(e),this.charToByteMap_[this.byteToCharMap_[e]]=e,this.byteToCharMapWebSafe_[e]=this.ENCODED_VALS_WEBSAFE.charAt(e),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]]=e,e>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)]=e,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)]=e)}}};class go extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const mo=function(e){const n=Si(e);return Ii.encodeByteArray(n,!0)},Se=function(e){return mo(e).replace(/\./g,"")},yo=function(e){try{return Ii.decodeString(e,!0)}catch(n){console.error("base64Decode failed: ",n)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wo(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bo=()=>wo().__FIREBASE_DEFAULTS__,vo=()=>{if(typeof process>"u"||typeof Gr>"u")return;const e=Gr.__FIREBASE_DEFAULTS__;if(e)return JSON.parse(e)},_o=()=>{if(typeof document>"u")return;let e;try{e=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const n=e&&yo(e[1]);return n&&JSON.parse(n)},De=()=>{try{return fo()||bo()||vo()||_o()}catch(e){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);return}},Eo=e=>{var n,r;return(r=(n=De())==null?void 0:n.emulatorHosts)==null?void 0:r[e]},Ci=e=>{const n=Eo(e);if(!n)return;const r=n.lastIndexOf(":");if(r<=0||r+1===n.length)throw new Error(`Invalid host ${n} with no separate hostname and port!`);const s=parseInt(n.substring(r+1),10);return n[0]==="["?[n.substring(1,r-1),s]:[n.substring(0,r),s]},ki=()=>{var e;return(e=De())==null?void 0:e.config},oh=e=>{var n;return(n=De())==null?void 0:n[`_${e}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class To{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((n,r)=>{this.resolve=n,this.reject=r})}wrapCallback(n){return(r,s)=>{r?this.reject(r):this.resolve(s),typeof n=="function"&&(this.promise.catch(()=>{}),n.length===1?n(r):n(r,s))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function se(e){try{return(e.startsWith("http://")||e.startsWith("https://")?new URL(e).hostname:e).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Ri(e){return(await fetch(e,{credentials:"include"})).ok}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ao(e,n){if(e.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const r={alg:"none",type:"JWT"},s=n||"demo-project",a=e.iat||0,l=e.sub||e.user_id;if(!l)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const u={iss:`https://securetoken.google.com/${s}`,aud:s,iat:a,exp:a+3600,auth_time:a,sub:l,user_id:l,firebase:{sign_in_provider:"custom",identities:{}},...e};return[Se(JSON.stringify(r)),Se(JSON.stringify(u)),""].join(".")}const ee={};function So(){const e={prod:[],emulator:[]};for(const n of Object.keys(ee))ee[n]?e.emulator.push(n):e.prod.push(n);return e}function Io(e){let n=document.getElementById(e),r=!1;return n||(n=document.createElement("div"),n.setAttribute("id",e),r=!0),{created:r,element:n}}let Xr=!1;function Di(e,n){if(typeof window>"u"||typeof document>"u"||!se(window.location.host)||ee[e]===n||ee[e]||Xr)return;ee[e]=n;function r(A){return`__firebase__banner__${A}`}const s="__firebase__banner",l=So().prod.length>0;function u(){const A=document.getElementById(s);A&&A.remove()}function _(A){A.style.display="flex",A.style.background="#7faaf0",A.style.position="fixed",A.style.bottom="5px",A.style.left="5px",A.style.padding=".5em",A.style.borderRadius="5px",A.style.alignItems="center"}function E(A,k){A.setAttribute("width","24"),A.setAttribute("id",k),A.setAttribute("height","24"),A.setAttribute("viewBox","0 0 24 24"),A.setAttribute("fill","none"),A.style.marginLeft="-6px"}function v(){const A=document.createElement("span");return A.style.cursor="pointer",A.style.marginLeft="16px",A.style.fontSize="24px",A.innerHTML=" &times;",A.onclick=()=>{Xr=!0,u()},A}function S(A,k){A.setAttribute("id",k),A.innerText="Learn more",A.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",A.setAttribute("target","__blank"),A.style.paddingLeft="5px",A.style.textDecoration="underline"}function I(){const A=Io(s),k=r("text"),R=document.getElementById(k)||document.createElement("span"),O=r("learnmore"),D=document.getElementById(O)||document.createElement("a"),W=r("preprendIcon"),F=document.getElementById(W)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(A.created){const M=A.element;_(M),S(D,O);const L=v();E(F,W),M.append(F,R,D,L),document.body.appendChild(M)}l?(R.innerText="Preview backend disconnected.",F.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(F.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,R.innerText="Preview backend running in this workspace."),R.setAttribute("id",k)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",I):I()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Oi(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function ah(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Oi())}function Ni(){var n;const e=(n=De())==null?void 0:n.forceEnvironment;if(e==="node")return!0;if(e==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function ch(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function uh(){const e=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof e=="object"&&e.id!==void 0}function lh(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function hh(){const e=Oi();return e.indexOf("MSIE ")>=0||e.indexOf("Trident/")>=0}function fh(){return!Ni()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function dh(){return!Ni()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Pi(){try{return typeof indexedDB=="object"}catch{return!1}}function xi(){return new Promise((e,n)=>{try{let r=!0;const s="validate-browser-context-for-indexeddb-analytics-module",a=self.indexedDB.open(s);a.onsuccess=()=>{a.result.close(),r||self.indexedDB.deleteDatabase(s),e(!0)},a.onupgradeneeded=()=>{r=!1},a.onerror=()=>{var l;n(((l=a.error)==null?void 0:l.message)||"")}}catch(r){n(r)}})}function Co(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ko="FirebaseError";class bt extends Error{constructor(n,r,s){super(r),this.code=n,this.customData=s,this.name=ko,Object.setPrototypeOf(this,bt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Oe.prototype.create)}}class Oe{constructor(n,r,s){this.service=n,this.serviceName=r,this.errors=s}create(n,...r){const s=r[0]||{},a=`${this.service}/${n}`,l=this.errors[n],u=l?Ro(l,s):"Error",_=`${this.serviceName}: ${u} (${a}).`;return new bt(a,_,s)}}function Ro(e,n){return e.replace(Do,(r,s)=>{const a=n[s];return a!=null?String(a):`<${s}?>`})}const Do=/\{\$([^}]+)}/g;function ph(e){for(const n in e)if(Object.prototype.hasOwnProperty.call(e,n))return!1;return!0}function _n(e,n){if(e===n)return!0;const r=Object.keys(e),s=Object.keys(n);for(const a of r){if(!s.includes(a))return!1;const l=e[a],u=n[a];if(Jr(l)&&Jr(u)){if(!_n(l,u))return!1}else if(l!==u)return!1}for(const a of s)if(!r.includes(a))return!1;return!0}function Jr(e){return e!==null&&typeof e=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gh(e){const n=[];for(const[r,s]of Object.entries(e))Array.isArray(s)?s.forEach(a=>{n.push(encodeURIComponent(r)+"="+encodeURIComponent(a))}):n.push(encodeURIComponent(r)+"="+encodeURIComponent(s));return n.length?"&"+n.join("&"):""}function mh(e){const n={};return e.replace(/^\?/,"").split("&").forEach(s=>{if(s){const[a,l]=s.split("=");n[decodeURIComponent(a)]=decodeURIComponent(l)}}),n}function yh(e){const n=e.indexOf("?");if(!n)return"";const r=e.indexOf("#",n);return e.substring(n,r>0?r:void 0)}function wh(e,n){const r=new Oo(e,n);return r.subscribe.bind(r)}class Oo{constructor(n,r){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=r,this.task.then(()=>{n(this)}).catch(s=>{this.error(s)})}next(n){this.forEachObserver(r=>{r.next(n)})}error(n){this.forEachObserver(r=>{r.error(n)}),this.close(n)}complete(){this.forEachObserver(n=>{n.complete()}),this.close()}subscribe(n,r,s){let a;if(n===void 0&&r===void 0&&s===void 0)throw new Error("Missing Observer.");No(n,["next","error","complete"])?a=n:a={next:n,error:r,complete:s},a.next===void 0&&(a.next=an),a.error===void 0&&(a.error=an),a.complete===void 0&&(a.complete=an);const l=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?a.error(this.finalError):a.complete()}catch{}}),this.observers.push(a),l}unsubscribeOne(n){this.observers===void 0||this.observers[n]===void 0||(delete this.observers[n],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(n){if(!this.finalized)for(let r=0;r<this.observers.length;r++)this.sendOne(r,n)}sendOne(n,r){this.task.then(()=>{if(this.observers!==void 0&&this.observers[n]!==void 0)try{r(this.observers[n])}catch(s){typeof console<"u"&&console.error&&console.error(s)}})}close(n){this.finalized||(this.finalized=!0,n!==void 0&&(this.finalError=n),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function No(e,n){if(typeof e!="object"||e===null)return!1;for(const r of n)if(r in e&&typeof e[r]=="function")return!0;return!1}function an(){}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nt(e){return e&&e._delegate?e._delegate:e}class ot{constructor(n,r,s){this.name=n,this.instanceFactory=r,this.type=s,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(n){return this.instantiationMode=n,this}setMultipleInstances(n){return this.multipleInstances=n,this}setServiceProps(n){return this.serviceProps=n,this}setInstanceCreatedCallback(n){return this.onInstanceCreated=n,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const It="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Po{constructor(n,r){this.name=n,this.container=r,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(n){const r=this.normalizeInstanceIdentifier(n);if(!this.instancesDeferred.has(r)){const s=new To;if(this.instancesDeferred.set(r,s),this.isInitialized(r)||this.shouldAutoInitialize())try{const a=this.getOrInitializeService({instanceIdentifier:r});a&&s.resolve(a)}catch{}}return this.instancesDeferred.get(r).promise}getImmediate(n){const r=this.normalizeInstanceIdentifier(n==null?void 0:n.identifier),s=(n==null?void 0:n.optional)??!1;if(this.isInitialized(r)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:r})}catch(a){if(s)return null;throw a}else{if(s)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(n){if(n.name!==this.name)throw Error(`Mismatching Component ${n.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=n,!!this.shouldAutoInitialize()){if(Mo(n))try{this.getOrInitializeService({instanceIdentifier:It})}catch{}for(const[r,s]of this.instancesDeferred.entries()){const a=this.normalizeInstanceIdentifier(r);try{const l=this.getOrInitializeService({instanceIdentifier:a});s.resolve(l)}catch{}}}}clearInstance(n=It){this.instancesDeferred.delete(n),this.instancesOptions.delete(n),this.instances.delete(n)}async delete(){const n=Array.from(this.instances.values());await Promise.all([...n.filter(r=>"INTERNAL"in r).map(r=>r.INTERNAL.delete()),...n.filter(r=>"_delete"in r).map(r=>r._delete())])}isComponentSet(){return this.component!=null}isInitialized(n=It){return this.instances.has(n)}getOptions(n=It){return this.instancesOptions.get(n)||{}}initialize(n={}){const{options:r={}}=n,s=this.normalizeInstanceIdentifier(n.instanceIdentifier);if(this.isInitialized(s))throw Error(`${this.name}(${s}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const a=this.getOrInitializeService({instanceIdentifier:s,options:r});for(const[l,u]of this.instancesDeferred.entries()){const _=this.normalizeInstanceIdentifier(l);s===_&&u.resolve(a)}return a}onInit(n,r){const s=this.normalizeInstanceIdentifier(r),a=this.onInitCallbacks.get(s)??new Set;a.add(n),this.onInitCallbacks.set(s,a);const l=this.instances.get(s);return l&&n(l,s),()=>{a.delete(n)}}invokeOnInitCallbacks(n,r){const s=this.onInitCallbacks.get(r);if(s)for(const a of s)try{a(n,r)}catch{}}getOrInitializeService({instanceIdentifier:n,options:r={}}){let s=this.instances.get(n);if(!s&&this.component&&(s=this.component.instanceFactory(this.container,{instanceIdentifier:xo(n),options:r}),this.instances.set(n,s),this.instancesOptions.set(n,r),this.invokeOnInitCallbacks(s,n),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,n,s)}catch{}return s||null}normalizeInstanceIdentifier(n=It){return this.component?this.component.multipleInstances?n:It:n}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function xo(e){return e===It?void 0:e}function Mo(e){return e.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lo{constructor(n){this.name=n,this.providers=new Map}addComponent(n){const r=this.getProvider(n.name);if(r.isComponentSet())throw new Error(`Component ${n.name} has already been registered with ${this.name}`);r.setComponent(n)}addOrOverwriteComponent(n){this.getProvider(n.name).isComponentSet()&&this.providers.delete(n.name),this.addComponent(n)}getProvider(n){if(this.providers.has(n))return this.providers.get(n);const r=new Po(n,this);return this.providers.set(n,r),r}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var x;(function(e){e[e.DEBUG=0]="DEBUG",e[e.VERBOSE=1]="VERBOSE",e[e.INFO=2]="INFO",e[e.WARN=3]="WARN",e[e.ERROR=4]="ERROR",e[e.SILENT=5]="SILENT"})(x||(x={}));const Bo={debug:x.DEBUG,verbose:x.VERBOSE,info:x.INFO,warn:x.WARN,error:x.ERROR,silent:x.SILENT},Uo=x.INFO,jo={[x.DEBUG]:"log",[x.VERBOSE]:"log",[x.INFO]:"info",[x.WARN]:"warn",[x.ERROR]:"error"},Fo=(e,n,...r)=>{if(n<e.logLevel)return;const s=new Date().toISOString(),a=jo[n];if(a)console[a](`[${s}]  ${e.name}:`,...r);else throw new Error(`Attempted to log a message with an invalid logType (value: ${n})`)};class $o{constructor(n){this.name=n,this._logLevel=Uo,this._logHandler=Fo,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(n){if(!(n in x))throw new TypeError(`Invalid value "${n}" assigned to \`logLevel\``);this._logLevel=n}setLogLevel(n){this._logLevel=typeof n=="string"?Bo[n]:n}get logHandler(){return this._logHandler}set logHandler(n){if(typeof n!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=n}get userLogHandler(){return this._userLogHandler}set userLogHandler(n){this._userLogHandler=n}debug(...n){this._userLogHandler&&this._userLogHandler(this,x.DEBUG,...n),this._logHandler(this,x.DEBUG,...n)}log(...n){this._userLogHandler&&this._userLogHandler(this,x.VERBOSE,...n),this._logHandler(this,x.VERBOSE,...n)}info(...n){this._userLogHandler&&this._userLogHandler(this,x.INFO,...n),this._logHandler(this,x.INFO,...n)}warn(...n){this._userLogHandler&&this._userLogHandler(this,x.WARN,...n),this._logHandler(this,x.WARN,...n)}error(...n){this._userLogHandler&&this._userLogHandler(this,x.ERROR,...n),this._logHandler(this,x.ERROR,...n)}}const Ho=(e,n)=>n.some(r=>e instanceof r);let Yr,Zr;function Vo(){return Yr||(Yr=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Wo(){return Zr||(Zr=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Mi=new WeakMap,En=new WeakMap,Li=new WeakMap,cn=new WeakMap,Dn=new WeakMap;function Ko(e){const n=new Promise((r,s)=>{const a=()=>{e.removeEventListener("success",l),e.removeEventListener("error",u)},l=()=>{r(ct(e.result)),a()},u=()=>{s(e.error),a()};e.addEventListener("success",l),e.addEventListener("error",u)});return n.then(r=>{r instanceof IDBCursor&&Mi.set(r,e)}).catch(()=>{}),Dn.set(n,e),n}function qo(e){if(En.has(e))return;const n=new Promise((r,s)=>{const a=()=>{e.removeEventListener("complete",l),e.removeEventListener("error",u),e.removeEventListener("abort",u)},l=()=>{r(),a()},u=()=>{s(e.error||new DOMException("AbortError","AbortError")),a()};e.addEventListener("complete",l),e.addEventListener("error",u),e.addEventListener("abort",u)});En.set(e,n)}let Tn={get(e,n,r){if(e instanceof IDBTransaction){if(n==="done")return En.get(e);if(n==="objectStoreNames")return e.objectStoreNames||Li.get(e);if(n==="store")return r.objectStoreNames[1]?void 0:r.objectStore(r.objectStoreNames[0])}return ct(e[n])},set(e,n,r){return e[n]=r,!0},has(e,n){return e instanceof IDBTransaction&&(n==="done"||n==="store")?!0:n in e}};function zo(e){Tn=e(Tn)}function Go(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(n,...r){const s=e.call(un(this),n,...r);return Li.set(s,n.sort?n.sort():[n]),ct(s)}:Wo().includes(e)?function(...n){return e.apply(un(this),n),ct(Mi.get(this))}:function(...n){return ct(e.apply(un(this),n))}}function Xo(e){return typeof e=="function"?Go(e):(e instanceof IDBTransaction&&qo(e),Ho(e,Vo())?new Proxy(e,Tn):e)}function ct(e){if(e instanceof IDBRequest)return Ko(e);if(cn.has(e))return cn.get(e);const n=Xo(e);return n!==e&&(cn.set(e,n),Dn.set(n,e)),n}const un=e=>Dn.get(e);function Ne(e,n,{blocked:r,upgrade:s,blocking:a,terminated:l}={}){const u=indexedDB.open(e,n),_=ct(u);return s&&u.addEventListener("upgradeneeded",E=>{s(ct(u.result),E.oldVersion,E.newVersion,ct(u.transaction),E)}),r&&u.addEventListener("blocked",E=>r(E.oldVersion,E.newVersion,E)),_.then(E=>{l&&E.addEventListener("close",()=>l()),a&&E.addEventListener("versionchange",v=>a(v.oldVersion,v.newVersion,v))}).catch(()=>{}),_}function ln(e,{blocked:n}={}){const r=indexedDB.deleteDatabase(e);return n&&r.addEventListener("blocked",s=>n(s.oldVersion,s)),ct(r).then(()=>{})}const Jo=["get","getKey","getAll","getAllKeys","count"],Yo=["put","add","delete","clear"],hn=new Map;function Qr(e,n){if(!(e instanceof IDBDatabase&&!(n in e)&&typeof n=="string"))return;if(hn.get(n))return hn.get(n);const r=n.replace(/FromIndex$/,""),s=n!==r,a=Yo.includes(r);if(!(r in(s?IDBIndex:IDBObjectStore).prototype)||!(a||Jo.includes(r)))return;const l=async function(u,..._){const E=this.transaction(u,a?"readwrite":"readonly");let v=E.store;return s&&(v=v.index(_.shift())),(await Promise.all([v[r](..._),a&&E.done]))[0]};return hn.set(n,l),l}zo(e=>({...e,get:(n,r,s)=>Qr(n,r)||e.get(n,r,s),has:(n,r)=>!!Qr(n,r)||e.has(n,r)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zo{constructor(n){this.container=n}getPlatformInfoString(){return this.container.getProviders().map(r=>{if(Qo(r)){const s=r.getImmediate();return`${s.library}/${s.version}`}else return null}).filter(r=>r).join(" ")}}function Qo(e){const n=e.getComponent();return(n==null?void 0:n.type)==="VERSION"}const An="@firebase/app",ti="0.14.7";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ut=new $o("@firebase/app"),ta="@firebase/app-compat",ea="@firebase/analytics-compat",na="@firebase/analytics",ra="@firebase/app-check-compat",ia="@firebase/app-check",sa="@firebase/auth",oa="@firebase/auth-compat",aa="@firebase/database",ca="@firebase/data-connect",ua="@firebase/database-compat",la="@firebase/functions",ha="@firebase/functions-compat",fa="@firebase/installations",da="@firebase/installations-compat",pa="@firebase/messaging",ga="@firebase/messaging-compat",ma="@firebase/performance",ya="@firebase/performance-compat",wa="@firebase/remote-config",ba="@firebase/remote-config-compat",va="@firebase/storage",_a="@firebase/storage-compat",Ea="@firebase/firestore",Ta="@firebase/ai",Aa="@firebase/firestore-compat",Sa="firebase",Ia="12.8.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Sn="[DEFAULT]",Ca={[An]:"fire-core",[ta]:"fire-core-compat",[na]:"fire-analytics",[ea]:"fire-analytics-compat",[ia]:"fire-app-check",[ra]:"fire-app-check-compat",[sa]:"fire-auth",[oa]:"fire-auth-compat",[aa]:"fire-rtdb",[ca]:"fire-data-connect",[ua]:"fire-rtdb-compat",[la]:"fire-fn",[ha]:"fire-fn-compat",[fa]:"fire-iid",[da]:"fire-iid-compat",[pa]:"fire-fcm",[ga]:"fire-fcm-compat",[ma]:"fire-perf",[ya]:"fire-perf-compat",[wa]:"fire-rc",[ba]:"fire-rc-compat",[va]:"fire-gcs",[_a]:"fire-gcs-compat",[Ea]:"fire-fst",[Aa]:"fire-fst-compat",[Ta]:"fire-vertex","fire-js":"fire-js",[Sa]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ie=new Map,ka=new Map,In=new Map;function ei(e,n){try{e.container.addComponent(n)}catch(r){ut.debug(`Component ${n.name} failed to register with FirebaseApp ${e.name}`,r)}}function lt(e){const n=e.name;if(In.has(n))return ut.debug(`There were multiple attempts to register component ${n}.`),!1;In.set(n,e);for(const r of Ie.values())ei(r,e);for(const r of ka.values())ei(r,e);return!0}function oe(e,n){const r=e.container.getProvider("heartbeat").getImmediate({optional:!0});return r&&r.triggerHeartbeat(),e.container.getProvider(n)}function Bi(e){return e==null?!1:e.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ra={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},wt=new Oe("app","Firebase",Ra);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Da{constructor(n,r,s){this._isDeleted=!1,this._options={...n},this._config={...r},this._name=r.name,this._automaticDataCollectionEnabled=r.automaticDataCollectionEnabled,this._container=s,this.container.addComponent(new ot("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(n){this.checkDestroyed(),this._automaticDataCollectionEnabled=n}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(n){this._isDeleted=n}checkDestroyed(){if(this.isDeleted)throw wt.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Oa=Ia;function Na(e,n={}){let r=e;typeof n!="object"&&(n={name:n});const s={name:Sn,automaticDataCollectionEnabled:!0,...n},a=s.name;if(typeof a!="string"||!a)throw wt.create("bad-app-name",{appName:String(a)});if(r||(r=ki()),!r)throw wt.create("no-options");const l=Ie.get(a);if(l){if(_n(r,l.options)&&_n(s,l.config))return l;throw wt.create("duplicate-app",{appName:a})}const u=new Lo(a);for(const E of In.values())u.addComponent(E);const _=new Da(r,s,u);return Ie.set(a,_),_}function On(e=Sn){const n=Ie.get(e);if(!n&&e===Sn&&ki())return Na();if(!n)throw wt.create("no-app",{appName:e});return n}function et(e,n,r){let s=Ca[e]??e;r&&(s+=`-${r}`);const a=s.match(/\s|\//),l=n.match(/\s|\//);if(a||l){const u=[`Unable to register library "${s}" with version "${n}":`];a&&u.push(`library name "${s}" contains illegal characters (whitespace or "/")`),a&&l&&u.push("and"),l&&u.push(`version name "${n}" contains illegal characters (whitespace or "/")`),ut.warn(u.join(" "));return}lt(new ot(`${s}-version`,()=>({library:s,version:n}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pa="firebase-heartbeat-database",xa=1,re="firebase-heartbeat-store";let fn=null;function Ui(){return fn||(fn=Ne(Pa,xa,{upgrade:(e,n)=>{switch(n){case 0:try{e.createObjectStore(re)}catch(r){console.warn(r)}}}}).catch(e=>{throw wt.create("idb-open",{originalErrorMessage:e.message})})),fn}async function Ma(e){try{const r=(await Ui()).transaction(re),s=await r.objectStore(re).get(ji(e));return await r.done,s}catch(n){if(n instanceof bt)ut.warn(n.message);else{const r=wt.create("idb-get",{originalErrorMessage:n==null?void 0:n.message});ut.warn(r.message)}}}async function ni(e,n){try{const s=(await Ui()).transaction(re,"readwrite");await s.objectStore(re).put(n,ji(e)),await s.done}catch(r){if(r instanceof bt)ut.warn(r.message);else{const s=wt.create("idb-set",{originalErrorMessage:r==null?void 0:r.message});ut.warn(s.message)}}}function ji(e){return`${e.name}!${e.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const La=1024,Ba=30;class Ua{constructor(n){this.container=n,this._heartbeatsCache=null;const r=this.container.getProvider("app").getImmediate();this._storage=new Fa(r),this._heartbeatsCachePromise=this._storage.read().then(s=>(this._heartbeatsCache=s,s))}async triggerHeartbeat(){var n,r;try{const a=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),l=ri();if(((n=this._heartbeatsCache)==null?void 0:n.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((r=this._heartbeatsCache)==null?void 0:r.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===l||this._heartbeatsCache.heartbeats.some(u=>u.date===l))return;if(this._heartbeatsCache.heartbeats.push({date:l,agent:a}),this._heartbeatsCache.heartbeats.length>Ba){const u=$a(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(u,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(s){ut.warn(s)}}async getHeartbeatsHeader(){var n;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((n=this._heartbeatsCache)==null?void 0:n.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const r=ri(),{heartbeatsToSend:s,unsentEntries:a}=ja(this._heartbeatsCache.heartbeats),l=Se(JSON.stringify({version:2,heartbeats:s}));return this._heartbeatsCache.lastSentHeartbeatDate=r,a.length>0?(this._heartbeatsCache.heartbeats=a,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),l}catch(r){return ut.warn(r),""}}}function ri(){return new Date().toISOString().substring(0,10)}function ja(e,n=La){const r=[];let s=e.slice();for(const a of e){const l=r.find(u=>u.agent===a.agent);if(l){if(l.dates.push(a.date),ii(r)>n){l.dates.pop();break}}else if(r.push({agent:a.agent,dates:[a.date]}),ii(r)>n){r.pop();break}s=s.slice(1)}return{heartbeatsToSend:r,unsentEntries:s}}class Fa{constructor(n){this.app=n,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Pi()?xi().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const r=await Ma(this.app);return r!=null&&r.heartbeats?r:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(n){if(await this._canUseIndexedDBPromise){const s=await this.read();return ni(this.app,{lastSentHeartbeatDate:n.lastSentHeartbeatDate??s.lastSentHeartbeatDate,heartbeats:n.heartbeats})}else return}async add(n){if(await this._canUseIndexedDBPromise){const s=await this.read();return ni(this.app,{lastSentHeartbeatDate:n.lastSentHeartbeatDate??s.lastSentHeartbeatDate,heartbeats:[...s.heartbeats,...n.heartbeats]})}else return}}function ii(e){return Se(JSON.stringify({version:2,heartbeats:e})).length}function $a(e){if(e.length===0)return-1;let n=0,r=e[0].date;for(let s=1;s<e.length;s++)e[s].date<r&&(r=e[s].date,n=s);return n}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ha(e){lt(new ot("platform-logger",n=>new Zo(n),"PRIVATE")),lt(new ot("heartbeat",n=>new Ua(n),"PRIVATE")),et(An,ti,e),et(An,ti,"esm2020"),et("fire-js","")}Ha("");var Va="firebase",Wa="12.8.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */et(Va,Wa,"app");var si=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Ka,qa;(function(){var e;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function n(g,h){function d(){}d.prototype=h.prototype,g.F=h.prototype,g.prototype=new d,g.prototype.constructor=g,g.D=function(m,p,w){for(var f=Array(arguments.length-2),J=2;J<arguments.length;J++)f[J-2]=arguments[J];return h.prototype[p].apply(m,f)}}function r(){this.blockSize=-1}function s(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}n(s,r),s.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function a(g,h,d){d||(d=0);const m=Array(16);if(typeof h=="string")for(var p=0;p<16;++p)m[p]=h.charCodeAt(d++)|h.charCodeAt(d++)<<8|h.charCodeAt(d++)<<16|h.charCodeAt(d++)<<24;else for(p=0;p<16;++p)m[p]=h[d++]|h[d++]<<8|h[d++]<<16|h[d++]<<24;h=g.g[0],d=g.g[1],p=g.g[2];let w=g.g[3],f;f=h+(w^d&(p^w))+m[0]+3614090360&4294967295,h=d+(f<<7&4294967295|f>>>25),f=w+(p^h&(d^p))+m[1]+3905402710&4294967295,w=h+(f<<12&4294967295|f>>>20),f=p+(d^w&(h^d))+m[2]+606105819&4294967295,p=w+(f<<17&4294967295|f>>>15),f=d+(h^p&(w^h))+m[3]+3250441966&4294967295,d=p+(f<<22&4294967295|f>>>10),f=h+(w^d&(p^w))+m[4]+4118548399&4294967295,h=d+(f<<7&4294967295|f>>>25),f=w+(p^h&(d^p))+m[5]+1200080426&4294967295,w=h+(f<<12&4294967295|f>>>20),f=p+(d^w&(h^d))+m[6]+2821735955&4294967295,p=w+(f<<17&4294967295|f>>>15),f=d+(h^p&(w^h))+m[7]+4249261313&4294967295,d=p+(f<<22&4294967295|f>>>10),f=h+(w^d&(p^w))+m[8]+1770035416&4294967295,h=d+(f<<7&4294967295|f>>>25),f=w+(p^h&(d^p))+m[9]+2336552879&4294967295,w=h+(f<<12&4294967295|f>>>20),f=p+(d^w&(h^d))+m[10]+4294925233&4294967295,p=w+(f<<17&4294967295|f>>>15),f=d+(h^p&(w^h))+m[11]+2304563134&4294967295,d=p+(f<<22&4294967295|f>>>10),f=h+(w^d&(p^w))+m[12]+1804603682&4294967295,h=d+(f<<7&4294967295|f>>>25),f=w+(p^h&(d^p))+m[13]+4254626195&4294967295,w=h+(f<<12&4294967295|f>>>20),f=p+(d^w&(h^d))+m[14]+2792965006&4294967295,p=w+(f<<17&4294967295|f>>>15),f=d+(h^p&(w^h))+m[15]+1236535329&4294967295,d=p+(f<<22&4294967295|f>>>10),f=h+(p^w&(d^p))+m[1]+4129170786&4294967295,h=d+(f<<5&4294967295|f>>>27),f=w+(d^p&(h^d))+m[6]+3225465664&4294967295,w=h+(f<<9&4294967295|f>>>23),f=p+(h^d&(w^h))+m[11]+643717713&4294967295,p=w+(f<<14&4294967295|f>>>18),f=d+(w^h&(p^w))+m[0]+3921069994&4294967295,d=p+(f<<20&4294967295|f>>>12),f=h+(p^w&(d^p))+m[5]+3593408605&4294967295,h=d+(f<<5&4294967295|f>>>27),f=w+(d^p&(h^d))+m[10]+38016083&4294967295,w=h+(f<<9&4294967295|f>>>23),f=p+(h^d&(w^h))+m[15]+3634488961&4294967295,p=w+(f<<14&4294967295|f>>>18),f=d+(w^h&(p^w))+m[4]+3889429448&4294967295,d=p+(f<<20&4294967295|f>>>12),f=h+(p^w&(d^p))+m[9]+568446438&4294967295,h=d+(f<<5&4294967295|f>>>27),f=w+(d^p&(h^d))+m[14]+3275163606&4294967295,w=h+(f<<9&4294967295|f>>>23),f=p+(h^d&(w^h))+m[3]+4107603335&4294967295,p=w+(f<<14&4294967295|f>>>18),f=d+(w^h&(p^w))+m[8]+1163531501&4294967295,d=p+(f<<20&4294967295|f>>>12),f=h+(p^w&(d^p))+m[13]+2850285829&4294967295,h=d+(f<<5&4294967295|f>>>27),f=w+(d^p&(h^d))+m[2]+4243563512&4294967295,w=h+(f<<9&4294967295|f>>>23),f=p+(h^d&(w^h))+m[7]+1735328473&4294967295,p=w+(f<<14&4294967295|f>>>18),f=d+(w^h&(p^w))+m[12]+2368359562&4294967295,d=p+(f<<20&4294967295|f>>>12),f=h+(d^p^w)+m[5]+4294588738&4294967295,h=d+(f<<4&4294967295|f>>>28),f=w+(h^d^p)+m[8]+2272392833&4294967295,w=h+(f<<11&4294967295|f>>>21),f=p+(w^h^d)+m[11]+1839030562&4294967295,p=w+(f<<16&4294967295|f>>>16),f=d+(p^w^h)+m[14]+4259657740&4294967295,d=p+(f<<23&4294967295|f>>>9),f=h+(d^p^w)+m[1]+2763975236&4294967295,h=d+(f<<4&4294967295|f>>>28),f=w+(h^d^p)+m[4]+1272893353&4294967295,w=h+(f<<11&4294967295|f>>>21),f=p+(w^h^d)+m[7]+4139469664&4294967295,p=w+(f<<16&4294967295|f>>>16),f=d+(p^w^h)+m[10]+3200236656&4294967295,d=p+(f<<23&4294967295|f>>>9),f=h+(d^p^w)+m[13]+681279174&4294967295,h=d+(f<<4&4294967295|f>>>28),f=w+(h^d^p)+m[0]+3936430074&4294967295,w=h+(f<<11&4294967295|f>>>21),f=p+(w^h^d)+m[3]+3572445317&4294967295,p=w+(f<<16&4294967295|f>>>16),f=d+(p^w^h)+m[6]+76029189&4294967295,d=p+(f<<23&4294967295|f>>>9),f=h+(d^p^w)+m[9]+3654602809&4294967295,h=d+(f<<4&4294967295|f>>>28),f=w+(h^d^p)+m[12]+3873151461&4294967295,w=h+(f<<11&4294967295|f>>>21),f=p+(w^h^d)+m[15]+530742520&4294967295,p=w+(f<<16&4294967295|f>>>16),f=d+(p^w^h)+m[2]+3299628645&4294967295,d=p+(f<<23&4294967295|f>>>9),f=h+(p^(d|~w))+m[0]+4096336452&4294967295,h=d+(f<<6&4294967295|f>>>26),f=w+(d^(h|~p))+m[7]+1126891415&4294967295,w=h+(f<<10&4294967295|f>>>22),f=p+(h^(w|~d))+m[14]+2878612391&4294967295,p=w+(f<<15&4294967295|f>>>17),f=d+(w^(p|~h))+m[5]+4237533241&4294967295,d=p+(f<<21&4294967295|f>>>11),f=h+(p^(d|~w))+m[12]+1700485571&4294967295,h=d+(f<<6&4294967295|f>>>26),f=w+(d^(h|~p))+m[3]+2399980690&4294967295,w=h+(f<<10&4294967295|f>>>22),f=p+(h^(w|~d))+m[10]+4293915773&4294967295,p=w+(f<<15&4294967295|f>>>17),f=d+(w^(p|~h))+m[1]+2240044497&4294967295,d=p+(f<<21&4294967295|f>>>11),f=h+(p^(d|~w))+m[8]+1873313359&4294967295,h=d+(f<<6&4294967295|f>>>26),f=w+(d^(h|~p))+m[15]+4264355552&4294967295,w=h+(f<<10&4294967295|f>>>22),f=p+(h^(w|~d))+m[6]+2734768916&4294967295,p=w+(f<<15&4294967295|f>>>17),f=d+(w^(p|~h))+m[13]+1309151649&4294967295,d=p+(f<<21&4294967295|f>>>11),f=h+(p^(d|~w))+m[4]+4149444226&4294967295,h=d+(f<<6&4294967295|f>>>26),f=w+(d^(h|~p))+m[11]+3174756917&4294967295,w=h+(f<<10&4294967295|f>>>22),f=p+(h^(w|~d))+m[2]+718787259&4294967295,p=w+(f<<15&4294967295|f>>>17),f=d+(w^(p|~h))+m[9]+3951481745&4294967295,g.g[0]=g.g[0]+h&4294967295,g.g[1]=g.g[1]+(p+(f<<21&4294967295|f>>>11))&4294967295,g.g[2]=g.g[2]+p&4294967295,g.g[3]=g.g[3]+w&4294967295}s.prototype.v=function(g,h){h===void 0&&(h=g.length);const d=h-this.blockSize,m=this.C;let p=this.h,w=0;for(;w<h;){if(p==0)for(;w<=d;)a(this,g,w),w+=this.blockSize;if(typeof g=="string"){for(;w<h;)if(m[p++]=g.charCodeAt(w++),p==this.blockSize){a(this,m),p=0;break}}else for(;w<h;)if(m[p++]=g[w++],p==this.blockSize){a(this,m),p=0;break}}this.h=p,this.o+=h},s.prototype.A=function(){var g=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);g[0]=128;for(var h=1;h<g.length-8;++h)g[h]=0;h=this.o*8;for(var d=g.length-8;d<g.length;++d)g[d]=h&255,h/=256;for(this.v(g),g=Array(16),h=0,d=0;d<4;++d)for(let m=0;m<32;m+=8)g[h++]=this.g[d]>>>m&255;return g};function l(g,h){var d=_;return Object.prototype.hasOwnProperty.call(d,g)?d[g]:d[g]=h(g)}function u(g,h){this.h=h;const d=[];let m=!0;for(let p=g.length-1;p>=0;p--){const w=g[p]|0;m&&w==h||(d[p]=w,m=!1)}this.g=d}var _={};function E(g){return-128<=g&&g<128?l(g,function(h){return new u([h|0],h<0?-1:0)}):new u([g|0],g<0?-1:0)}function v(g){if(isNaN(g)||!isFinite(g))return I;if(g<0)return D(v(-g));const h=[];let d=1;for(let m=0;g>=d;m++)h[m]=g/d|0,d*=4294967296;return new u(h,0)}function S(g,h){if(g.length==0)throw Error("number format error: empty string");if(h=h||10,h<2||36<h)throw Error("radix out of range: "+h);if(g.charAt(0)=="-")return D(S(g.substring(1),h));if(g.indexOf("-")>=0)throw Error('number format error: interior "-" character');const d=v(Math.pow(h,8));let m=I;for(let w=0;w<g.length;w+=8){var p=Math.min(8,g.length-w);const f=parseInt(g.substring(w,w+p),h);p<8?(p=v(Math.pow(h,p)),m=m.j(p).add(v(f))):(m=m.j(d),m=m.add(v(f)))}return m}var I=E(0),A=E(1),k=E(16777216);e=u.prototype,e.m=function(){if(O(this))return-D(this).m();let g=0,h=1;for(let d=0;d<this.g.length;d++){const m=this.i(d);g+=(m>=0?m:4294967296+m)*h,h*=4294967296}return g},e.toString=function(g){if(g=g||10,g<2||36<g)throw Error("radix out of range: "+g);if(R(this))return"0";if(O(this))return"-"+D(this).toString(g);const h=v(Math.pow(g,6));var d=this;let m="";for(;;){const p=L(d,h).g;d=W(d,p.j(h));let w=((d.g.length>0?d.g[0]:d.h)>>>0).toString(g);if(d=p,R(d))return w+m;for(;w.length<6;)w="0"+w;m=w+m}},e.i=function(g){return g<0?0:g<this.g.length?this.g[g]:this.h};function R(g){if(g.h!=0)return!1;for(let h=0;h<g.g.length;h++)if(g.g[h]!=0)return!1;return!0}function O(g){return g.h==-1}e.l=function(g){return g=W(this,g),O(g)?-1:R(g)?0:1};function D(g){const h=g.g.length,d=[];for(let m=0;m<h;m++)d[m]=~g.g[m];return new u(d,~g.h).add(A)}e.abs=function(){return O(this)?D(this):this},e.add=function(g){const h=Math.max(this.g.length,g.g.length),d=[];let m=0;for(let p=0;p<=h;p++){let w=m+(this.i(p)&65535)+(g.i(p)&65535),f=(w>>>16)+(this.i(p)>>>16)+(g.i(p)>>>16);m=f>>>16,w&=65535,f&=65535,d[p]=f<<16|w}return new u(d,d[d.length-1]&-2147483648?-1:0)};function W(g,h){return g.add(D(h))}e.j=function(g){if(R(this)||R(g))return I;if(O(this))return O(g)?D(this).j(D(g)):D(D(this).j(g));if(O(g))return D(this.j(D(g)));if(this.l(k)<0&&g.l(k)<0)return v(this.m()*g.m());const h=this.g.length+g.g.length,d=[];for(var m=0;m<2*h;m++)d[m]=0;for(m=0;m<this.g.length;m++)for(let p=0;p<g.g.length;p++){const w=this.i(m)>>>16,f=this.i(m)&65535,J=g.i(p)>>>16,vt=g.i(p)&65535;d[2*m+2*p]+=f*vt,F(d,2*m+2*p),d[2*m+2*p+1]+=w*vt,F(d,2*m+2*p+1),d[2*m+2*p+1]+=f*J,F(d,2*m+2*p+1),d[2*m+2*p+2]+=w*J,F(d,2*m+2*p+2)}for(g=0;g<h;g++)d[g]=d[2*g+1]<<16|d[2*g];for(g=h;g<2*h;g++)d[g]=0;return new u(d,0)};function F(g,h){for(;(g[h]&65535)!=g[h];)g[h+1]+=g[h]>>>16,g[h]&=65535,h++}function M(g,h){this.g=g,this.h=h}function L(g,h){if(R(h))throw Error("division by zero");if(R(g))return new M(I,I);if(O(g))return h=L(D(g),h),new M(D(h.g),D(h.h));if(O(h))return h=L(g,D(h)),new M(D(h.g),h.h);if(g.g.length>30){if(O(g)||O(h))throw Error("slowDivide_ only works with positive integers.");for(var d=A,m=h;m.l(g)<=0;)d=Z(d),m=Z(m);var p=K(d,1),w=K(m,1);for(m=K(m,2),d=K(d,2);!R(m);){var f=w.add(m);f.l(g)<=0&&(p=p.add(d),w=f),m=K(m,1),d=K(d,1)}return h=W(g,p.j(h)),new M(p,h)}for(p=I;g.l(h)>=0;){for(d=Math.max(1,Math.floor(g.m()/h.m())),m=Math.ceil(Math.log(d)/Math.LN2),m=m<=48?1:Math.pow(2,m-48),w=v(d),f=w.j(h);O(f)||f.l(g)>0;)d-=m,w=v(d),f=w.j(h);R(w)&&(w=A),p=p.add(w),g=W(g,f)}return new M(p,g)}e.B=function(g){return L(this,g).h},e.and=function(g){const h=Math.max(this.g.length,g.g.length),d=[];for(let m=0;m<h;m++)d[m]=this.i(m)&g.i(m);return new u(d,this.h&g.h)},e.or=function(g){const h=Math.max(this.g.length,g.g.length),d=[];for(let m=0;m<h;m++)d[m]=this.i(m)|g.i(m);return new u(d,this.h|g.h)},e.xor=function(g){const h=Math.max(this.g.length,g.g.length),d=[];for(let m=0;m<h;m++)d[m]=this.i(m)^g.i(m);return new u(d,this.h^g.h)};function Z(g){const h=g.g.length+1,d=[];for(let m=0;m<h;m++)d[m]=g.i(m)<<1|g.i(m-1)>>>31;return new u(d,g.h)}function K(g,h){const d=h>>5;h%=32;const m=g.g.length-d,p=[];for(let w=0;w<m;w++)p[w]=h>0?g.i(w+d)>>>h|g.i(w+d+1)<<32-h:g.i(w+d);return new u(p,g.h)}s.prototype.digest=s.prototype.A,s.prototype.reset=s.prototype.u,s.prototype.update=s.prototype.v,qa=s,u.prototype.add=u.prototype.add,u.prototype.multiply=u.prototype.j,u.prototype.modulo=u.prototype.B,u.prototype.compare=u.prototype.l,u.prototype.toNumber=u.prototype.m,u.prototype.toString=u.prototype.toString,u.prototype.getBits=u.prototype.i,u.fromNumber=v,u.fromString=S,Ka=u}).apply(typeof si<"u"?si:typeof self<"u"?self:typeof window<"u"?window:{});var Ee=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var za,Ga,Xa,Ja,Ya,Za,Qa,tc;(function(){var e,n=Object.defineProperty;function r(t){t=[typeof globalThis=="object"&&globalThis,t,typeof window=="object"&&window,typeof self=="object"&&self,typeof Ee=="object"&&Ee];for(var i=0;i<t.length;++i){var o=t[i];if(o&&o.Math==Math)return o}throw Error("Cannot find global object")}var s=r(this);function a(t,i){if(i)t:{var o=s;t=t.split(".");for(var c=0;c<t.length-1;c++){var y=t[c];if(!(y in o))break t;o=o[y]}t=t[t.length-1],c=o[t],i=i(c),i!=c&&i!=null&&n(o,t,{configurable:!0,writable:!0,value:i})}}a("Symbol.dispose",function(t){return t||Symbol("Symbol.dispose")}),a("Array.prototype.values",function(t){return t||function(){return this[Symbol.iterator]()}}),a("Object.entries",function(t){return t||function(i){var o=[],c;for(c in i)Object.prototype.hasOwnProperty.call(i,c)&&o.push([c,i[c]]);return o}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var l=l||{},u=this||self;function _(t){var i=typeof t;return i=="object"&&t!=null||i=="function"}function E(t,i,o){return t.call.apply(t.bind,arguments)}function v(t,i,o){return v=E,v.apply(null,arguments)}function S(t,i){var o=Array.prototype.slice.call(arguments,1);return function(){var c=o.slice();return c.push.apply(c,arguments),t.apply(this,c)}}function I(t,i){function o(){}o.prototype=i.prototype,t.Z=i.prototype,t.prototype=new o,t.prototype.constructor=t,t.Ob=function(c,y,b){for(var T=Array(arguments.length-2),C=2;C<arguments.length;C++)T[C-2]=arguments[C];return i.prototype[y].apply(c,T)}}var A=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?t=>t&&AsyncContext.Snapshot.wrap(t):t=>t;function k(t){const i=t.length;if(i>0){const o=Array(i);for(let c=0;c<i;c++)o[c]=t[c];return o}return[]}function R(t,i){for(let c=1;c<arguments.length;c++){const y=arguments[c];var o=typeof y;if(o=o!="object"?o:y?Array.isArray(y)?"array":o:"null",o=="array"||o=="object"&&typeof y.length=="number"){o=t.length||0;const b=y.length||0;t.length=o+b;for(let T=0;T<b;T++)t[o+T]=y[T]}else t.push(y)}}class O{constructor(i,o){this.i=i,this.j=o,this.h=0,this.g=null}get(){let i;return this.h>0?(this.h--,i=this.g,this.g=i.next,i.next=null):i=this.i(),i}}function D(t){u.setTimeout(()=>{throw t},0)}function W(){var t=g;let i=null;return t.g&&(i=t.g,t.g=t.g.next,t.g||(t.h=null),i.next=null),i}class F{constructor(){this.h=this.g=null}add(i,o){const c=M.get();c.set(i,o),this.h?this.h.next=c:this.g=c,this.h=c}}var M=new O(()=>new L,t=>t.reset());class L{constructor(){this.next=this.g=this.h=null}set(i,o){this.h=i,this.g=o,this.next=null}reset(){this.next=this.g=this.h=null}}let Z,K=!1,g=new F,h=()=>{const t=Promise.resolve(void 0);Z=()=>{t.then(d)}};function d(){for(var t;t=W();){try{t.h.call(t.g)}catch(o){D(o)}var i=M;i.j(t),i.h<100&&(i.h++,t.next=i.g,i.g=t)}K=!1}function m(){this.u=this.u,this.C=this.C}m.prototype.u=!1,m.prototype.dispose=function(){this.u||(this.u=!0,this.N())},m.prototype[Symbol.dispose]=function(){this.dispose()},m.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function p(t,i){this.type=t,this.g=this.target=i,this.defaultPrevented=!1}p.prototype.h=function(){this.defaultPrevented=!0};var w=function(){if(!u.addEventListener||!Object.defineProperty)return!1;var t=!1,i=Object.defineProperty({},"passive",{get:function(){t=!0}});try{const o=()=>{};u.addEventListener("test",o,i),u.removeEventListener("test",o,i)}catch{}return t}();function f(t){return/^[\s\xa0]*$/.test(t)}function J(t,i){p.call(this,t?t.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,t&&this.init(t,i)}I(J,p),J.prototype.init=function(t,i){const o=this.type=t.type,c=t.changedTouches&&t.changedTouches.length?t.changedTouches[0]:null;this.target=t.target||t.srcElement,this.g=i,i=t.relatedTarget,i||(o=="mouseover"?i=t.fromElement:o=="mouseout"&&(i=t.toElement)),this.relatedTarget=i,c?(this.clientX=c.clientX!==void 0?c.clientX:c.pageX,this.clientY=c.clientY!==void 0?c.clientY:c.pageY,this.screenX=c.screenX||0,this.screenY=c.screenY||0):(this.clientX=t.clientX!==void 0?t.clientX:t.pageX,this.clientY=t.clientY!==void 0?t.clientY:t.pageY,this.screenX=t.screenX||0,this.screenY=t.screenY||0),this.button=t.button,this.key=t.key||"",this.ctrlKey=t.ctrlKey,this.altKey=t.altKey,this.shiftKey=t.shiftKey,this.metaKey=t.metaKey,this.pointerId=t.pointerId||0,this.pointerType=t.pointerType,this.state=t.state,this.i=t,t.defaultPrevented&&J.Z.h.call(this)},J.prototype.h=function(){J.Z.h.call(this);const t=this.i;t.preventDefault?t.preventDefault():t.returnValue=!1};var vt="closure_listenable_"+(Math.random()*1e6|0),Os=0;function Ns(t,i,o,c,y){this.listener=t,this.proxy=null,this.src=i,this.type=o,this.capture=!!c,this.ha=y,this.key=++Os,this.da=this.fa=!1}function ae(t){t.da=!0,t.listener=null,t.proxy=null,t.src=null,t.ha=null}function ce(t,i,o){for(const c in t)i.call(o,t[c],c,t)}function Ps(t,i){for(const o in t)i.call(void 0,t[o],o,t)}function zn(t){const i={};for(const o in t)i[o]=t[o];return i}const Gn="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Xn(t,i){let o,c;for(let y=1;y<arguments.length;y++){c=arguments[y];for(o in c)t[o]=c[o];for(let b=0;b<Gn.length;b++)o=Gn[b],Object.prototype.hasOwnProperty.call(c,o)&&(t[o]=c[o])}}function ue(t){this.src=t,this.g={},this.h=0}ue.prototype.add=function(t,i,o,c,y){const b=t.toString();t=this.g[b],t||(t=this.g[b]=[],this.h++);const T=Be(t,i,c,y);return T>-1?(i=t[T],o||(i.fa=!1)):(i=new Ns(i,this.src,b,!!c,y),i.fa=o,t.push(i)),i};function Le(t,i){const o=i.type;if(o in t.g){var c=t.g[o],y=Array.prototype.indexOf.call(c,i,void 0),b;(b=y>=0)&&Array.prototype.splice.call(c,y,1),b&&(ae(i),t.g[o].length==0&&(delete t.g[o],t.h--))}}function Be(t,i,o,c){for(let y=0;y<t.length;++y){const b=t[y];if(!b.da&&b.listener==i&&b.capture==!!o&&b.ha==c)return y}return-1}var Ue="closure_lm_"+(Math.random()*1e6|0),je={};function Jn(t,i,o,c,y){if(Array.isArray(i)){for(let b=0;b<i.length;b++)Jn(t,i[b],o,c,y);return null}return o=Qn(o),t&&t[vt]?t.J(i,o,_(c)?!!c.capture:!1,y):xs(t,i,o,!1,c,y)}function xs(t,i,o,c,y,b){if(!i)throw Error("Invalid event type");const T=_(y)?!!y.capture:!!y;let C=$e(t);if(C||(t[Ue]=C=new ue(t)),o=C.add(i,o,c,T,b),o.proxy)return o;if(c=Ms(),o.proxy=c,c.src=t,c.listener=o,t.addEventListener)w||(y=T),y===void 0&&(y=!1),t.addEventListener(i.toString(),c,y);else if(t.attachEvent)t.attachEvent(Zn(i.toString()),c);else if(t.addListener&&t.removeListener)t.addListener(c);else throw Error("addEventListener and attachEvent are unavailable.");return o}function Ms(){function t(o){return i.call(t.src,t.listener,o)}const i=Ls;return t}function Yn(t,i,o,c,y){if(Array.isArray(i))for(var b=0;b<i.length;b++)Yn(t,i[b],o,c,y);else c=_(c)?!!c.capture:!!c,o=Qn(o),t&&t[vt]?(t=t.i,b=String(i).toString(),b in t.g&&(i=t.g[b],o=Be(i,o,c,y),o>-1&&(ae(i[o]),Array.prototype.splice.call(i,o,1),i.length==0&&(delete t.g[b],t.h--)))):t&&(t=$e(t))&&(i=t.g[i.toString()],t=-1,i&&(t=Be(i,o,c,y)),(o=t>-1?i[t]:null)&&Fe(o))}function Fe(t){if(typeof t!="number"&&t&&!t.da){var i=t.src;if(i&&i[vt])Le(i.i,t);else{var o=t.type,c=t.proxy;i.removeEventListener?i.removeEventListener(o,c,t.capture):i.detachEvent?i.detachEvent(Zn(o),c):i.addListener&&i.removeListener&&i.removeListener(c),(o=$e(i))?(Le(o,t),o.h==0&&(o.src=null,i[Ue]=null)):ae(t)}}}function Zn(t){return t in je?je[t]:je[t]="on"+t}function Ls(t,i){if(t.da)t=!0;else{i=new J(i,this);const o=t.listener,c=t.ha||t.src;t.fa&&Fe(t),t=o.call(c,i)}return t}function $e(t){return t=t[Ue],t instanceof ue?t:null}var He="__closure_events_fn_"+(Math.random()*1e9>>>0);function Qn(t){return typeof t=="function"?t:(t[He]||(t[He]=function(i){return t.handleEvent(i)}),t[He])}function q(){m.call(this),this.i=new ue(this),this.M=this,this.G=null}I(q,m),q.prototype[vt]=!0,q.prototype.removeEventListener=function(t,i,o,c){Yn(this,t,i,o,c)};function z(t,i){var o,c=t.G;if(c)for(o=[];c;c=c.G)o.push(c);if(t=t.M,c=i.type||i,typeof i=="string")i=new p(i,t);else if(i instanceof p)i.target=i.target||t;else{var y=i;i=new p(c,t),Xn(i,y)}y=!0;let b,T;if(o)for(T=o.length-1;T>=0;T--)b=i.g=o[T],y=le(b,c,!0,i)&&y;if(b=i.g=t,y=le(b,c,!0,i)&&y,y=le(b,c,!1,i)&&y,o)for(T=0;T<o.length;T++)b=i.g=o[T],y=le(b,c,!1,i)&&y}q.prototype.N=function(){if(q.Z.N.call(this),this.i){var t=this.i;for(const i in t.g){const o=t.g[i];for(let c=0;c<o.length;c++)ae(o[c]);delete t.g[i],t.h--}}this.G=null},q.prototype.J=function(t,i,o,c){return this.i.add(String(t),i,!1,o,c)},q.prototype.K=function(t,i,o,c){return this.i.add(String(t),i,!0,o,c)};function le(t,i,o,c){if(i=t.i.g[String(i)],!i)return!0;i=i.concat();let y=!0;for(let b=0;b<i.length;++b){const T=i[b];if(T&&!T.da&&T.capture==o){const C=T.listener,$=T.ha||T.src;T.fa&&Le(t.i,T),y=C.call($,c)!==!1&&y}}return y&&!c.defaultPrevented}function Bs(t,i){if(typeof t!="function")if(t&&typeof t.handleEvent=="function")t=v(t.handleEvent,t);else throw Error("Invalid listener argument");return Number(i)>2147483647?-1:u.setTimeout(t,i||0)}function tr(t){t.g=Bs(()=>{t.g=null,t.i&&(t.i=!1,tr(t))},t.l);const i=t.h;t.h=null,t.m.apply(null,i)}class Us extends m{constructor(i,o){super(),this.m=i,this.l=o,this.h=null,this.i=!1,this.g=null}j(i){this.h=arguments,this.g?this.i=!0:tr(this)}N(){super.N(),this.g&&(u.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Bt(t){m.call(this),this.h=t,this.g={}}I(Bt,m);var er=[];function nr(t){ce(t.g,function(i,o){this.g.hasOwnProperty(o)&&Fe(i)},t),t.g={}}Bt.prototype.N=function(){Bt.Z.N.call(this),nr(this)},Bt.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Ve=u.JSON.stringify,js=u.JSON.parse,Fs=class{stringify(t){return u.JSON.stringify(t,void 0)}parse(t){return u.JSON.parse(t,void 0)}};function rr(){}function ir(){}var Ut={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function We(){p.call(this,"d")}I(We,p);function Ke(){p.call(this,"c")}I(Ke,p);var _t={},sr=null;function he(){return sr=sr||new q}_t.Ia="serverreachability";function or(t){p.call(this,_t.Ia,t)}I(or,p);function jt(t){const i=he();z(i,new or(i))}_t.STAT_EVENT="statevent";function ar(t,i){p.call(this,_t.STAT_EVENT,t),this.stat=i}I(ar,p);function G(t){const i=he();z(i,new ar(i,t))}_t.Ja="timingevent";function cr(t,i){p.call(this,_t.Ja,t),this.size=i}I(cr,p);function Ft(t,i){if(typeof t!="function")throw Error("Fn must not be null and must be a function");return u.setTimeout(function(){t()},i)}function $t(){this.g=!0}$t.prototype.ua=function(){this.g=!1};function $s(t,i,o,c,y,b){t.info(function(){if(t.g)if(b){var T="",C=b.split("&");for(let N=0;N<C.length;N++){var $=C[N].split("=");if($.length>1){const H=$[0];$=$[1];const it=H.split("_");T=it.length>=2&&it[1]=="type"?T+(H+"="+$+"&"):T+(H+"=redacted&")}}}else T=null;else T=b;return"XMLHTTP REQ ("+c+") [attempt "+y+"]: "+i+`
`+o+`
`+T})}function Hs(t,i,o,c,y,b,T){t.info(function(){return"XMLHTTP RESP ("+c+") [ attempt "+y+"]: "+i+`
`+o+`
`+b+" "+T})}function Pt(t,i,o,c){t.info(function(){return"XMLHTTP TEXT ("+i+"): "+Ws(t,o)+(c?" "+c:"")})}function Vs(t,i){t.info(function(){return"TIMEOUT: "+i})}$t.prototype.info=function(){};function Ws(t,i){if(!t.g)return i;if(!i)return null;try{const b=JSON.parse(i);if(b){for(t=0;t<b.length;t++)if(Array.isArray(b[t])){var o=b[t];if(!(o.length<2)){var c=o[1];if(Array.isArray(c)&&!(c.length<1)){var y=c[0];if(y!="noop"&&y!="stop"&&y!="close")for(let T=1;T<c.length;T++)c[T]=""}}}}return Ve(b)}catch{return i}}var fe={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},ur={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},lr;function qe(){}I(qe,rr),qe.prototype.g=function(){return new XMLHttpRequest},lr=new qe;function Ht(t){return encodeURIComponent(String(t))}function Ks(t){var i=1;t=t.split(":");const o=[];for(;i>0&&t.length;)o.push(t.shift()),i--;return t.length&&o.push(t.join(":")),o}function ht(t,i,o,c){this.j=t,this.i=i,this.l=o,this.S=c||1,this.V=new Bt(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new hr}function hr(){this.i=null,this.g="",this.h=!1}var fr={},ze={};function Ge(t,i,o){t.M=1,t.A=pe(rt(i)),t.u=o,t.R=!0,dr(t,null)}function dr(t,i){t.F=Date.now(),de(t),t.B=rt(t.A);var o=t.B,c=t.S;Array.isArray(c)||(c=[String(c)]),Ir(o.i,"t",c),t.C=0,o=t.j.L,t.h=new hr,t.g=Wr(t.j,o?i:null,!t.u),t.P>0&&(t.O=new Us(v(t.Y,t,t.g),t.P)),i=t.V,o=t.g,c=t.ba;var y="readystatechange";Array.isArray(y)||(y&&(er[0]=y.toString()),y=er);for(let b=0;b<y.length;b++){const T=Jn(o,y[b],c||i.handleEvent,!1,i.h||i);if(!T)break;i.g[T.key]=T}i=t.J?zn(t.J):{},t.u?(t.v||(t.v="POST"),i["Content-Type"]="application/x-www-form-urlencoded",t.g.ea(t.B,t.v,t.u,i)):(t.v="GET",t.g.ea(t.B,t.v,null,i)),jt(),$s(t.i,t.v,t.B,t.l,t.S,t.u)}ht.prototype.ba=function(t){t=t.target;const i=this.O;i&&pt(t)==3?i.j():this.Y(t)},ht.prototype.Y=function(t){try{if(t==this.g)t:{const C=pt(this.g),$=this.g.ya(),N=this.g.ca();if(!(C<3)&&(C!=3||this.g&&(this.h.h||this.g.la()||Pr(this.g)))){this.K||C!=4||$==7||($==8||N<=0?jt(3):jt(2)),Xe(this);var i=this.g.ca();this.X=i;var o=qs(this);if(this.o=i==200,Hs(this.i,this.v,this.B,this.l,this.S,C,i),this.o){if(this.U&&!this.L){e:{if(this.g){var c,y=this.g;if((c=y.g?y.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!f(c)){var b=c;break e}}b=null}if(t=b)Pt(this.i,this.l,t,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,Je(this,t);else{this.o=!1,this.m=3,G(12),Et(this),Vt(this);break t}}if(this.R){t=!0;let H;for(;!this.K&&this.C<o.length;)if(H=zs(this,o),H==ze){C==4&&(this.m=4,G(14),t=!1),Pt(this.i,this.l,null,"[Incomplete Response]");break}else if(H==fr){this.m=4,G(15),Pt(this.i,this.l,o,"[Invalid Chunk]"),t=!1;break}else Pt(this.i,this.l,H,null),Je(this,H);if(pr(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),C!=4||o.length!=0||this.h.h||(this.m=1,G(16),t=!1),this.o=this.o&&t,!t)Pt(this.i,this.l,o,"[Invalid Chunked Response]"),Et(this),Vt(this);else if(o.length>0&&!this.W){this.W=!0;var T=this.j;T.g==this&&T.aa&&!T.P&&(T.j.info("Great, no buffering proxy detected. Bytes received: "+o.length),sn(T),T.P=!0,G(11))}}else Pt(this.i,this.l,o,null),Je(this,o);C==4&&Et(this),this.o&&!this.K&&(C==4?Fr(this.j,this):(this.o=!1,de(this)))}else ao(this.g),i==400&&o.indexOf("Unknown SID")>0?(this.m=3,G(12)):(this.m=0,G(13)),Et(this),Vt(this)}}}catch{}finally{}};function qs(t){if(!pr(t))return t.g.la();const i=Pr(t.g);if(i==="")return"";let o="";const c=i.length,y=pt(t.g)==4;if(!t.h.i){if(typeof TextDecoder>"u")return Et(t),Vt(t),"";t.h.i=new u.TextDecoder}for(let b=0;b<c;b++)t.h.h=!0,o+=t.h.i.decode(i[b],{stream:!(y&&b==c-1)});return i.length=0,t.h.g+=o,t.C=0,t.h.g}function pr(t){return t.g?t.v=="GET"&&t.M!=2&&t.j.Aa:!1}function zs(t,i){var o=t.C,c=i.indexOf(`
`,o);return c==-1?ze:(o=Number(i.substring(o,c)),isNaN(o)?fr:(c+=1,c+o>i.length?ze:(i=i.slice(c,c+o),t.C=c+o,i)))}ht.prototype.cancel=function(){this.K=!0,Et(this)};function de(t){t.T=Date.now()+t.H,gr(t,t.H)}function gr(t,i){if(t.D!=null)throw Error("WatchDog timer not null");t.D=Ft(v(t.aa,t),i)}function Xe(t){t.D&&(u.clearTimeout(t.D),t.D=null)}ht.prototype.aa=function(){this.D=null;const t=Date.now();t-this.T>=0?(Vs(this.i,this.B),this.M!=2&&(jt(),G(17)),Et(this),this.m=2,Vt(this)):gr(this,this.T-t)};function Vt(t){t.j.I==0||t.K||Fr(t.j,t)}function Et(t){Xe(t);var i=t.O;i&&typeof i.dispose=="function"&&i.dispose(),t.O=null,nr(t.V),t.g&&(i=t.g,t.g=null,i.abort(),i.dispose())}function Je(t,i){try{var o=t.j;if(o.I!=0&&(o.g==t||Ye(o.h,t))){if(!t.L&&Ye(o.h,t)&&o.I==3){try{var c=o.Ba.g.parse(i)}catch{c=null}if(Array.isArray(c)&&c.length==3){var y=c;if(y[0]==0){t:if(!o.v){if(o.g)if(o.g.F+3e3<t.F)be(o),ye(o);else break t;rn(o),G(18)}}else o.xa=y[1],0<o.xa-o.K&&y[2]<37500&&o.F&&o.A==0&&!o.C&&(o.C=Ft(v(o.Va,o),6e3));wr(o.h)<=1&&o.ta&&(o.ta=void 0)}else At(o,11)}else if((t.L||o.g==t)&&be(o),!f(i))for(y=o.Ba.g.parse(i),i=0;i<y.length;i++){let N=y[i];const H=N[0];if(!(H<=o.K))if(o.K=H,N=N[1],o.I==2)if(N[0]=="c"){o.M=N[1],o.ba=N[2];const it=N[3];it!=null&&(o.ka=it,o.j.info("VER="+o.ka));const St=N[4];St!=null&&(o.za=St,o.j.info("SVER="+o.za));const gt=N[5];gt!=null&&typeof gt=="number"&&gt>0&&(c=1.5*gt,o.O=c,o.j.info("backChannelRequestTimeoutMs_="+c)),c=o;const mt=t.g;if(mt){const _e=mt.g?mt.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(_e){var b=c.h;b.g||_e.indexOf("spdy")==-1&&_e.indexOf("quic")==-1&&_e.indexOf("h2")==-1||(b.j=b.l,b.g=new Set,b.h&&(Ze(b,b.h),b.h=null))}if(c.G){const on=mt.g?mt.g.getResponseHeader("X-HTTP-Session-Id"):null;on&&(c.wa=on,P(c.J,c.G,on))}}o.I=3,o.l&&o.l.ra(),o.aa&&(o.T=Date.now()-t.F,o.j.info("Handshake RTT: "+o.T+"ms")),c=o;var T=t;if(c.na=Vr(c,c.L?c.ba:null,c.W),T.L){br(c.h,T);var C=T,$=c.O;$&&(C.H=$),C.D&&(Xe(C),de(C)),c.g=T}else Ur(c);o.i.length>0&&we(o)}else N[0]!="stop"&&N[0]!="close"||At(o,7);else o.I==3&&(N[0]=="stop"||N[0]=="close"?N[0]=="stop"?At(o,7):nn(o):N[0]!="noop"&&o.l&&o.l.qa(N),o.A=0)}}jt(4)}catch{}}var Gs=class{constructor(t,i){this.g=t,this.map=i}};function mr(t){this.l=t||10,u.PerformanceNavigationTiming?(t=u.performance.getEntriesByType("navigation"),t=t.length>0&&(t[0].nextHopProtocol=="hq"||t[0].nextHopProtocol=="h2")):t=!!(u.chrome&&u.chrome.loadTimes&&u.chrome.loadTimes()&&u.chrome.loadTimes().wasFetchedViaSpdy),this.j=t?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function yr(t){return t.h?!0:t.g?t.g.size>=t.j:!1}function wr(t){return t.h?1:t.g?t.g.size:0}function Ye(t,i){return t.h?t.h==i:t.g?t.g.has(i):!1}function Ze(t,i){t.g?t.g.add(i):t.h=i}function br(t,i){t.h&&t.h==i?t.h=null:t.g&&t.g.has(i)&&t.g.delete(i)}mr.prototype.cancel=function(){if(this.i=vr(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const t of this.g.values())t.cancel();this.g.clear()}};function vr(t){if(t.h!=null)return t.i.concat(t.h.G);if(t.g!=null&&t.g.size!==0){let i=t.i;for(const o of t.g.values())i=i.concat(o.G);return i}return k(t.i)}var _r=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Xs(t,i){if(t){t=t.split("&");for(let o=0;o<t.length;o++){const c=t[o].indexOf("=");let y,b=null;c>=0?(y=t[o].substring(0,c),b=t[o].substring(c+1)):y=t[o],i(y,b?decodeURIComponent(b.replace(/\+/g," ")):"")}}}function ft(t){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let i;t instanceof ft?(this.l=t.l,Wt(this,t.j),this.o=t.o,this.g=t.g,Kt(this,t.u),this.h=t.h,Qe(this,Cr(t.i)),this.m=t.m):t&&(i=String(t).match(_r))?(this.l=!1,Wt(this,i[1]||"",!0),this.o=qt(i[2]||""),this.g=qt(i[3]||"",!0),Kt(this,i[4]),this.h=qt(i[5]||"",!0),Qe(this,i[6]||"",!0),this.m=qt(i[7]||"")):(this.l=!1,this.i=new Gt(null,this.l))}ft.prototype.toString=function(){const t=[];var i=this.j;i&&t.push(zt(i,Er,!0),":");var o=this.g;return(o||i=="file")&&(t.push("//"),(i=this.o)&&t.push(zt(i,Er,!0),"@"),t.push(Ht(o).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),o=this.u,o!=null&&t.push(":",String(o))),(o=this.h)&&(this.g&&o.charAt(0)!="/"&&t.push("/"),t.push(zt(o,o.charAt(0)=="/"?Zs:Ys,!0))),(o=this.i.toString())&&t.push("?",o),(o=this.m)&&t.push("#",zt(o,to)),t.join("")},ft.prototype.resolve=function(t){const i=rt(this);let o=!!t.j;o?Wt(i,t.j):o=!!t.o,o?i.o=t.o:o=!!t.g,o?i.g=t.g:o=t.u!=null;var c=t.h;if(o)Kt(i,t.u);else if(o=!!t.h){if(c.charAt(0)!="/")if(this.g&&!this.h)c="/"+c;else{var y=i.h.lastIndexOf("/");y!=-1&&(c=i.h.slice(0,y+1)+c)}if(y=c,y==".."||y==".")c="";else if(y.indexOf("./")!=-1||y.indexOf("/.")!=-1){c=y.lastIndexOf("/",0)==0,y=y.split("/");const b=[];for(let T=0;T<y.length;){const C=y[T++];C=="."?c&&T==y.length&&b.push(""):C==".."?((b.length>1||b.length==1&&b[0]!="")&&b.pop(),c&&T==y.length&&b.push("")):(b.push(C),c=!0)}c=b.join("/")}else c=y}return o?i.h=c:o=t.i.toString()!=="",o?Qe(i,Cr(t.i)):o=!!t.m,o&&(i.m=t.m),i};function rt(t){return new ft(t)}function Wt(t,i,o){t.j=o?qt(i,!0):i,t.j&&(t.j=t.j.replace(/:$/,""))}function Kt(t,i){if(i){if(i=Number(i),isNaN(i)||i<0)throw Error("Bad port number "+i);t.u=i}else t.u=null}function Qe(t,i,o){i instanceof Gt?(t.i=i,eo(t.i,t.l)):(o||(i=zt(i,Qs)),t.i=new Gt(i,t.l))}function P(t,i,o){t.i.set(i,o)}function pe(t){return P(t,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),t}function qt(t,i){return t?i?decodeURI(t.replace(/%25/g,"%2525")):decodeURIComponent(t):""}function zt(t,i,o){return typeof t=="string"?(t=encodeURI(t).replace(i,Js),o&&(t=t.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),t):null}function Js(t){return t=t.charCodeAt(0),"%"+(t>>4&15).toString(16)+(t&15).toString(16)}var Er=/[#\/\?@]/g,Ys=/[#\?:]/g,Zs=/[#\?]/g,Qs=/[#\?@]/g,to=/#/g;function Gt(t,i){this.h=this.g=null,this.i=t||null,this.j=!!i}function Tt(t){t.g||(t.g=new Map,t.h=0,t.i&&Xs(t.i,function(i,o){t.add(decodeURIComponent(i.replace(/\+/g," ")),o)}))}e=Gt.prototype,e.add=function(t,i){Tt(this),this.i=null,t=xt(this,t);let o=this.g.get(t);return o||this.g.set(t,o=[]),o.push(i),this.h+=1,this};function Tr(t,i){Tt(t),i=xt(t,i),t.g.has(i)&&(t.i=null,t.h-=t.g.get(i).length,t.g.delete(i))}function Ar(t,i){return Tt(t),i=xt(t,i),t.g.has(i)}e.forEach=function(t,i){Tt(this),this.g.forEach(function(o,c){o.forEach(function(y){t.call(i,y,c,this)},this)},this)};function Sr(t,i){Tt(t);let o=[];if(typeof i=="string")Ar(t,i)&&(o=o.concat(t.g.get(xt(t,i))));else for(t=Array.from(t.g.values()),i=0;i<t.length;i++)o=o.concat(t[i]);return o}e.set=function(t,i){return Tt(this),this.i=null,t=xt(this,t),Ar(this,t)&&(this.h-=this.g.get(t).length),this.g.set(t,[i]),this.h+=1,this},e.get=function(t,i){return t?(t=Sr(this,t),t.length>0?String(t[0]):i):i};function Ir(t,i,o){Tr(t,i),o.length>0&&(t.i=null,t.g.set(xt(t,i),k(o)),t.h+=o.length)}e.toString=function(){if(this.i)return this.i;if(!this.g)return"";const t=[],i=Array.from(this.g.keys());for(let c=0;c<i.length;c++){var o=i[c];const y=Ht(o);o=Sr(this,o);for(let b=0;b<o.length;b++){let T=y;o[b]!==""&&(T+="="+Ht(o[b])),t.push(T)}}return this.i=t.join("&")};function Cr(t){const i=new Gt;return i.i=t.i,t.g&&(i.g=new Map(t.g),i.h=t.h),i}function xt(t,i){return i=String(i),t.j&&(i=i.toLowerCase()),i}function eo(t,i){i&&!t.j&&(Tt(t),t.i=null,t.g.forEach(function(o,c){const y=c.toLowerCase();c!=y&&(Tr(this,c),Ir(this,y,o))},t)),t.j=i}function no(t,i){const o=new $t;if(u.Image){const c=new Image;c.onload=S(dt,o,"TestLoadImage: loaded",!0,i,c),c.onerror=S(dt,o,"TestLoadImage: error",!1,i,c),c.onabort=S(dt,o,"TestLoadImage: abort",!1,i,c),c.ontimeout=S(dt,o,"TestLoadImage: timeout",!1,i,c),u.setTimeout(function(){c.ontimeout&&c.ontimeout()},1e4),c.src=t}else i(!1)}function ro(t,i){const o=new $t,c=new AbortController,y=setTimeout(()=>{c.abort(),dt(o,"TestPingServer: timeout",!1,i)},1e4);fetch(t,{signal:c.signal}).then(b=>{clearTimeout(y),b.ok?dt(o,"TestPingServer: ok",!0,i):dt(o,"TestPingServer: server error",!1,i)}).catch(()=>{clearTimeout(y),dt(o,"TestPingServer: error",!1,i)})}function dt(t,i,o,c,y){try{y&&(y.onload=null,y.onerror=null,y.onabort=null,y.ontimeout=null),c(o)}catch{}}function io(){this.g=new Fs}function tn(t){this.i=t.Sb||null,this.h=t.ab||!1}I(tn,rr),tn.prototype.g=function(){return new ge(this.i,this.h)};function ge(t,i){q.call(this),this.H=t,this.o=i,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}I(ge,q),e=ge.prototype,e.open=function(t,i){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=t,this.D=i,this.readyState=1,Jt(this)},e.send=function(t){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const i={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};t&&(i.body=t),(this.H||u).fetch(new Request(this.D,i)).then(this.Pa.bind(this),this.ga.bind(this))},e.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Xt(this)),this.readyState=0},e.Pa=function(t){if(this.g&&(this.l=t,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=t.headers,this.readyState=2,Jt(this)),this.g&&(this.readyState=3,Jt(this),this.g)))if(this.responseType==="arraybuffer")t.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof u.ReadableStream<"u"&&"body"in t){if(this.j=t.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;kr(this)}else t.text().then(this.Oa.bind(this),this.ga.bind(this))};function kr(t){t.j.read().then(t.Ma.bind(t)).catch(t.ga.bind(t))}e.Ma=function(t){if(this.g){if(this.o&&t.value)this.response.push(t.value);else if(!this.o){var i=t.value?t.value:new Uint8Array(0);(i=this.B.decode(i,{stream:!t.done}))&&(this.response=this.responseText+=i)}t.done?Xt(this):Jt(this),this.readyState==3&&kr(this)}},e.Oa=function(t){this.g&&(this.response=this.responseText=t,Xt(this))},e.Na=function(t){this.g&&(this.response=t,Xt(this))},e.ga=function(){this.g&&Xt(this)};function Xt(t){t.readyState=4,t.l=null,t.j=null,t.B=null,Jt(t)}e.setRequestHeader=function(t,i){this.A.append(t,i)},e.getResponseHeader=function(t){return this.h&&this.h.get(t.toLowerCase())||""},e.getAllResponseHeaders=function(){if(!this.h)return"";const t=[],i=this.h.entries();for(var o=i.next();!o.done;)o=o.value,t.push(o[0]+": "+o[1]),o=i.next();return t.join(`\r
`)};function Jt(t){t.onreadystatechange&&t.onreadystatechange.call(t)}Object.defineProperty(ge.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(t){this.m=t?"include":"same-origin"}});function Rr(t){let i="";return ce(t,function(o,c){i+=c,i+=":",i+=o,i+=`\r
`}),i}function en(t,i,o){t:{for(c in o){var c=!1;break t}c=!0}c||(o=Rr(o),typeof t=="string"?o!=null&&Ht(o):P(t,i,o))}function B(t){q.call(this),this.headers=new Map,this.L=t||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}I(B,q);var so=/^https?$/i,oo=["POST","PUT"];e=B.prototype,e.Fa=function(t){this.H=t},e.ea=function(t,i,o,c){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+t);i=i?i.toUpperCase():"GET",this.D=t,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():lr.g(),this.g.onreadystatechange=A(v(this.Ca,this));try{this.B=!0,this.g.open(i,String(t),!0),this.B=!1}catch(b){Dr(this,b);return}if(t=o||"",o=new Map(this.headers),c)if(Object.getPrototypeOf(c)===Object.prototype)for(var y in c)o.set(y,c[y]);else if(typeof c.keys=="function"&&typeof c.get=="function")for(const b of c.keys())o.set(b,c.get(b));else throw Error("Unknown input type for opt_headers: "+String(c));c=Array.from(o.keys()).find(b=>b.toLowerCase()=="content-type"),y=u.FormData&&t instanceof u.FormData,!(Array.prototype.indexOf.call(oo,i,void 0)>=0)||c||y||o.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[b,T]of o)this.g.setRequestHeader(b,T);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(t),this.v=!1}catch(b){Dr(this,b)}};function Dr(t,i){t.h=!1,t.g&&(t.j=!0,t.g.abort(),t.j=!1),t.l=i,t.o=5,Or(t),me(t)}function Or(t){t.A||(t.A=!0,z(t,"complete"),z(t,"error"))}e.abort=function(t){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=t||7,z(this,"complete"),z(this,"abort"),me(this))},e.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),me(this,!0)),B.Z.N.call(this)},e.Ca=function(){this.u||(this.B||this.v||this.j?Nr(this):this.Xa())},e.Xa=function(){Nr(this)};function Nr(t){if(t.h&&typeof l<"u"){if(t.v&&pt(t)==4)setTimeout(t.Ca.bind(t),0);else if(z(t,"readystatechange"),pt(t)==4){t.h=!1;try{const b=t.ca();t:switch(b){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var i=!0;break t;default:i=!1}var o;if(!(o=i)){var c;if(c=b===0){let T=String(t.D).match(_r)[1]||null;!T&&u.self&&u.self.location&&(T=u.self.location.protocol.slice(0,-1)),c=!so.test(T?T.toLowerCase():"")}o=c}if(o)z(t,"complete"),z(t,"success");else{t.o=6;try{var y=pt(t)>2?t.g.statusText:""}catch{y=""}t.l=y+" ["+t.ca()+"]",Or(t)}}finally{me(t)}}}}function me(t,i){if(t.g){t.m&&(clearTimeout(t.m),t.m=null);const o=t.g;t.g=null,i||z(t,"ready");try{o.onreadystatechange=null}catch{}}}e.isActive=function(){return!!this.g};function pt(t){return t.g?t.g.readyState:0}e.ca=function(){try{return pt(this)>2?this.g.status:-1}catch{return-1}},e.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},e.La=function(t){if(this.g){var i=this.g.responseText;return t&&i.indexOf(t)==0&&(i=i.substring(t.length)),js(i)}};function Pr(t){try{if(!t.g)return null;if("response"in t.g)return t.g.response;switch(t.F){case"":case"text":return t.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in t.g)return t.g.mozResponseArrayBuffer}return null}catch{return null}}function ao(t){const i={};t=(t.g&&pt(t)>=2&&t.g.getAllResponseHeaders()||"").split(`\r
`);for(let c=0;c<t.length;c++){if(f(t[c]))continue;var o=Ks(t[c]);const y=o[0];if(o=o[1],typeof o!="string")continue;o=o.trim();const b=i[y]||[];i[y]=b,b.push(o)}Ps(i,function(c){return c.join(", ")})}e.ya=function(){return this.o},e.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function Yt(t,i,o){return o&&o.internalChannelParams&&o.internalChannelParams[t]||i}function xr(t){this.za=0,this.i=[],this.j=new $t,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=Yt("failFast",!1,t),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=Yt("baseRetryDelayMs",5e3,t),this.Za=Yt("retryDelaySeedMs",1e4,t),this.Ta=Yt("forwardChannelMaxRetries",2,t),this.va=Yt("forwardChannelRequestTimeoutMs",2e4,t),this.ma=t&&t.xmlHttpFactory||void 0,this.Ua=t&&t.Rb||void 0,this.Aa=t&&t.useFetchStreams||!1,this.O=void 0,this.L=t&&t.supportsCrossDomainXhr||!1,this.M="",this.h=new mr(t&&t.concurrentRequestLimit),this.Ba=new io,this.S=t&&t.fastHandshake||!1,this.R=t&&t.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=t&&t.Pb||!1,t&&t.ua&&this.j.ua(),t&&t.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&t&&t.detectBufferingProxy||!1,this.ia=void 0,t&&t.longPollingTimeout&&t.longPollingTimeout>0&&(this.ia=t.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}e=xr.prototype,e.ka=8,e.I=1,e.connect=function(t,i,o,c){G(0),this.W=t,this.H=i||{},o&&c!==void 0&&(this.H.OSID=o,this.H.OAID=c),this.F=this.X,this.J=Vr(this,null,this.W),we(this)};function nn(t){if(Mr(t),t.I==3){var i=t.V++,o=rt(t.J);if(P(o,"SID",t.M),P(o,"RID",i),P(o,"TYPE","terminate"),Zt(t,o),i=new ht(t,t.j,i),i.M=2,i.A=pe(rt(o)),o=!1,u.navigator&&u.navigator.sendBeacon)try{o=u.navigator.sendBeacon(i.A.toString(),"")}catch{}!o&&u.Image&&(new Image().src=i.A,o=!0),o||(i.g=Wr(i.j,null),i.g.ea(i.A)),i.F=Date.now(),de(i)}Hr(t)}function ye(t){t.g&&(sn(t),t.g.cancel(),t.g=null)}function Mr(t){ye(t),t.v&&(u.clearTimeout(t.v),t.v=null),be(t),t.h.cancel(),t.m&&(typeof t.m=="number"&&u.clearTimeout(t.m),t.m=null)}function we(t){if(!yr(t.h)&&!t.m){t.m=!0;var i=t.Ea;Z||h(),K||(Z(),K=!0),g.add(i,t),t.D=0}}function co(t,i){return wr(t.h)>=t.h.j-(t.m?1:0)?!1:t.m?(t.i=i.G.concat(t.i),!0):t.I==1||t.I==2||t.D>=(t.Sa?0:t.Ta)?!1:(t.m=Ft(v(t.Ea,t,i),$r(t,t.D)),t.D++,!0)}e.Ea=function(t){if(this.m)if(this.m=null,this.I==1){if(!t){this.V=Math.floor(Math.random()*1e5),t=this.V++;const y=new ht(this,this.j,t);let b=this.o;if(this.U&&(b?(b=zn(b),Xn(b,this.U)):b=this.U),this.u!==null||this.R||(y.J=b,b=null),this.S)t:{for(var i=0,o=0;o<this.i.length;o++){e:{var c=this.i[o];if("__data__"in c.map&&(c=c.map.__data__,typeof c=="string")){c=c.length;break e}c=void 0}if(c===void 0)break;if(i+=c,i>4096){i=o;break t}if(i===4096||o===this.i.length-1){i=o+1;break t}}i=1e3}else i=1e3;i=Br(this,y,i),o=rt(this.J),P(o,"RID",t),P(o,"CVER",22),this.G&&P(o,"X-HTTP-Session-Id",this.G),Zt(this,o),b&&(this.R?i="headers="+Ht(Rr(b))+"&"+i:this.u&&en(o,this.u,b)),Ze(this.h,y),this.Ra&&P(o,"TYPE","init"),this.S?(P(o,"$req",i),P(o,"SID","null"),y.U=!0,Ge(y,o,null)):Ge(y,o,i),this.I=2}}else this.I==3&&(t?Lr(this,t):this.i.length==0||yr(this.h)||Lr(this))};function Lr(t,i){var o;i?o=i.l:o=t.V++;const c=rt(t.J);P(c,"SID",t.M),P(c,"RID",o),P(c,"AID",t.K),Zt(t,c),t.u&&t.o&&en(c,t.u,t.o),o=new ht(t,t.j,o,t.D+1),t.u===null&&(o.J=t.o),i&&(t.i=i.G.concat(t.i)),i=Br(t,o,1e3),o.H=Math.round(t.va*.5)+Math.round(t.va*.5*Math.random()),Ze(t.h,o),Ge(o,c,i)}function Zt(t,i){t.H&&ce(t.H,function(o,c){P(i,c,o)}),t.l&&ce({},function(o,c){P(i,c,o)})}function Br(t,i,o){o=Math.min(t.i.length,o);const c=t.l?v(t.l.Ka,t.l,t):null;t:{var y=t.i;let C=-1;for(;;){const $=["count="+o];C==-1?o>0?(C=y[0].g,$.push("ofs="+C)):C=0:$.push("ofs="+C);let N=!0;for(let H=0;H<o;H++){var b=y[H].g;const it=y[H].map;if(b-=C,b<0)C=Math.max(0,y[H].g-100),N=!1;else try{b="req"+b+"_"||"";try{var T=it instanceof Map?it:Object.entries(it);for(const[St,gt]of T){let mt=gt;_(gt)&&(mt=Ve(gt)),$.push(b+St+"="+encodeURIComponent(mt))}}catch(St){throw $.push(b+"type="+encodeURIComponent("_badmap")),St}}catch{c&&c(it)}}if(N){T=$.join("&");break t}}T=void 0}return t=t.i.splice(0,o),i.G=t,T}function Ur(t){if(!t.g&&!t.v){t.Y=1;var i=t.Da;Z||h(),K||(Z(),K=!0),g.add(i,t),t.A=0}}function rn(t){return t.g||t.v||t.A>=3?!1:(t.Y++,t.v=Ft(v(t.Da,t),$r(t,t.A)),t.A++,!0)}e.Da=function(){if(this.v=null,jr(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var t=4*this.T;this.j.info("BP detection timer enabled: "+t),this.B=Ft(v(this.Wa,this),t)}},e.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,G(10),ye(this),jr(this))};function sn(t){t.B!=null&&(u.clearTimeout(t.B),t.B=null)}function jr(t){t.g=new ht(t,t.j,"rpc",t.Y),t.u===null&&(t.g.J=t.o),t.g.P=0;var i=rt(t.na);P(i,"RID","rpc"),P(i,"SID",t.M),P(i,"AID",t.K),P(i,"CI",t.F?"0":"1"),!t.F&&t.ia&&P(i,"TO",t.ia),P(i,"TYPE","xmlhttp"),Zt(t,i),t.u&&t.o&&en(i,t.u,t.o),t.O&&(t.g.H=t.O);var o=t.g;t=t.ba,o.M=1,o.A=pe(rt(i)),o.u=null,o.R=!0,dr(o,t)}e.Va=function(){this.C!=null&&(this.C=null,ye(this),rn(this),G(19))};function be(t){t.C!=null&&(u.clearTimeout(t.C),t.C=null)}function Fr(t,i){var o=null;if(t.g==i){be(t),sn(t),t.g=null;var c=2}else if(Ye(t.h,i))o=i.G,br(t.h,i),c=1;else return;if(t.I!=0){if(i.o)if(c==1){o=i.u?i.u.length:0,i=Date.now()-i.F;var y=t.D;c=he(),z(c,new cr(c,o)),we(t)}else Ur(t);else if(y=i.m,y==3||y==0&&i.X>0||!(c==1&&co(t,i)||c==2&&rn(t)))switch(o&&o.length>0&&(i=t.h,i.i=i.i.concat(o)),y){case 1:At(t,5);break;case 4:At(t,10);break;case 3:At(t,6);break;default:At(t,2)}}}function $r(t,i){let o=t.Qa+Math.floor(Math.random()*t.Za);return t.isActive()||(o*=2),o*i}function At(t,i){if(t.j.info("Error code "+i),i==2){var o=v(t.bb,t),c=t.Ua;const y=!c;c=new ft(c||"//www.google.com/images/cleardot.gif"),u.location&&u.location.protocol=="http"||Wt(c,"https"),pe(c),y?no(c.toString(),o):ro(c.toString(),o)}else G(2);t.I=0,t.l&&t.l.pa(i),Hr(t),Mr(t)}e.bb=function(t){t?(this.j.info("Successfully pinged google.com"),G(2)):(this.j.info("Failed to ping google.com"),G(1))};function Hr(t){if(t.I=0,t.ja=[],t.l){const i=vr(t.h);(i.length!=0||t.i.length!=0)&&(R(t.ja,i),R(t.ja,t.i),t.h.i.length=0,k(t.i),t.i.length=0),t.l.oa()}}function Vr(t,i,o){var c=o instanceof ft?rt(o):new ft(o);if(c.g!="")i&&(c.g=i+"."+c.g),Kt(c,c.u);else{var y=u.location;c=y.protocol,i=i?i+"."+y.hostname:y.hostname,y=+y.port;const b=new ft(null);c&&Wt(b,c),i&&(b.g=i),y&&Kt(b,y),o&&(b.h=o),c=b}return o=t.G,i=t.wa,o&&i&&P(c,o,i),P(c,"VER",t.ka),Zt(t,c),c}function Wr(t,i,o){if(i&&!t.L)throw Error("Can't create secondary domain capable XhrIo object.");return i=t.Aa&&!t.ma?new B(new tn({ab:o})):new B(t.ma),i.Fa(t.L),i}e.isActive=function(){return!!this.l&&this.l.isActive(this)};function Kr(){}e=Kr.prototype,e.ra=function(){},e.qa=function(){},e.pa=function(){},e.oa=function(){},e.isActive=function(){return!0},e.Ka=function(){};function ve(){}ve.prototype.g=function(t,i){return new Q(t,i)};function Q(t,i){q.call(this),this.g=new xr(i),this.l=t,this.h=i&&i.messageUrlParams||null,t=i&&i.messageHeaders||null,i&&i.clientProtocolHeaderRequired&&(t?t["X-Client-Protocol"]="webchannel":t={"X-Client-Protocol":"webchannel"}),this.g.o=t,t=i&&i.initMessageHeaders||null,i&&i.messageContentType&&(t?t["X-WebChannel-Content-Type"]=i.messageContentType:t={"X-WebChannel-Content-Type":i.messageContentType}),i&&i.sa&&(t?t["X-WebChannel-Client-Profile"]=i.sa:t={"X-WebChannel-Client-Profile":i.sa}),this.g.U=t,(t=i&&i.Qb)&&!f(t)&&(this.g.u=t),this.A=i&&i.supportsCrossDomainXhr||!1,this.v=i&&i.sendRawJson||!1,(i=i&&i.httpSessionIdParam)&&!f(i)&&(this.g.G=i,t=this.h,t!==null&&i in t&&(t=this.h,i in t&&delete t[i])),this.j=new Mt(this)}I(Q,q),Q.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},Q.prototype.close=function(){nn(this.g)},Q.prototype.o=function(t){var i=this.g;if(typeof t=="string"){var o={};o.__data__=t,t=o}else this.v&&(o={},o.__data__=Ve(t),t=o);i.i.push(new Gs(i.Ya++,t)),i.I==3&&we(i)},Q.prototype.N=function(){this.g.l=null,delete this.j,nn(this.g),delete this.g,Q.Z.N.call(this)};function qr(t){We.call(this),t.__headers__&&(this.headers=t.__headers__,this.statusCode=t.__status__,delete t.__headers__,delete t.__status__);var i=t.__sm__;if(i){t:{for(const o in i){t=o;break t}t=void 0}(this.i=t)&&(t=this.i,i=i!==null&&t in i?i[t]:void 0),this.data=i}else this.data=t}I(qr,We);function zr(){Ke.call(this),this.status=1}I(zr,Ke);function Mt(t){this.g=t}I(Mt,Kr),Mt.prototype.ra=function(){z(this.g,"a")},Mt.prototype.qa=function(t){z(this.g,new qr(t))},Mt.prototype.pa=function(t){z(this.g,new zr)},Mt.prototype.oa=function(){z(this.g,"b")},ve.prototype.createWebChannel=ve.prototype.g,Q.prototype.send=Q.prototype.o,Q.prototype.open=Q.prototype.m,Q.prototype.close=Q.prototype.close,tc=function(){return new ve},Qa=function(){return he()},Za=_t,Ya={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},fe.NO_ERROR=0,fe.TIMEOUT=8,fe.HTTP_ERROR=6,Ja=fe,ur.COMPLETE="complete",Xa=ur,ir.EventType=Ut,Ut.OPEN="a",Ut.CLOSE="b",Ut.ERROR="c",Ut.MESSAGE="d",q.prototype.listen=q.prototype.J,Ga=ir,B.prototype.listenOnce=B.prototype.K,B.prototype.getLastError=B.prototype.Ha,B.prototype.getLastErrorCode=B.prototype.ya,B.prototype.getStatus=B.prototype.ca,B.prototype.getResponseJson=B.prototype.La,B.prototype.getResponseText=B.prototype.la,B.prototype.send=B.prototype.ea,B.prototype.setWithCredentials=B.prototype.Fa,za=B}).apply(typeof Ee<"u"?Ee:typeof self<"u"?self:typeof window<"u"?window:{});/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fi="firebasestorage.googleapis.com",$i="storageBucket",ec=2*60*1e3,nc=10*60*1e3;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class j extends bt{constructor(n,r,s=0){super(dn(n),`Firebase Storage: ${r} (${dn(n)})`),this.status_=s,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,j.prototype)}get status(){return this.status_}set status(n){this.status_=n}_codeEquals(n){return dn(n)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(n){this.customData.serverResponse=n,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var U;(function(e){e.UNKNOWN="unknown",e.OBJECT_NOT_FOUND="object-not-found",e.BUCKET_NOT_FOUND="bucket-not-found",e.PROJECT_NOT_FOUND="project-not-found",e.QUOTA_EXCEEDED="quota-exceeded",e.UNAUTHENTICATED="unauthenticated",e.UNAUTHORIZED="unauthorized",e.UNAUTHORIZED_APP="unauthorized-app",e.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",e.INVALID_CHECKSUM="invalid-checksum",e.CANCELED="canceled",e.INVALID_EVENT_NAME="invalid-event-name",e.INVALID_URL="invalid-url",e.INVALID_DEFAULT_BUCKET="invalid-default-bucket",e.NO_DEFAULT_BUCKET="no-default-bucket",e.CANNOT_SLICE_BLOB="cannot-slice-blob",e.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",e.NO_DOWNLOAD_URL="no-download-url",e.INVALID_ARGUMENT="invalid-argument",e.INVALID_ARGUMENT_COUNT="invalid-argument-count",e.APP_DELETED="app-deleted",e.INVALID_ROOT_OPERATION="invalid-root-operation",e.INVALID_FORMAT="invalid-format",e.INTERNAL_ERROR="internal-error",e.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(U||(U={}));function dn(e){return"storage/"+e}function Nn(){const e="An unknown error occurred, please check the error payload for server response.";return new j(U.UNKNOWN,e)}function rc(e){return new j(U.OBJECT_NOT_FOUND,"Object '"+e+"' does not exist.")}function ic(e){return new j(U.QUOTA_EXCEEDED,"Quota for bucket '"+e+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function sc(){const e="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new j(U.UNAUTHENTICATED,e)}function oc(){return new j(U.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function ac(e){return new j(U.UNAUTHORIZED,"User does not have permission to access '"+e+"'.")}function cc(){return new j(U.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function uc(){return new j(U.CANCELED,"User canceled the upload/download.")}function lc(e){return new j(U.INVALID_URL,"Invalid URL '"+e+"'.")}function hc(e){return new j(U.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+e+"'.")}function fc(){return new j(U.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+$i+"' property when initializing the app?")}function dc(){return new j(U.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function pc(){return new j(U.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function gc(e){return new j(U.UNSUPPORTED_ENVIRONMENT,`${e} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function Cn(e){return new j(U.INVALID_ARGUMENT,e)}function Hi(){return new j(U.APP_DELETED,"The Firebase app was deleted.")}function mc(e){return new j(U.INVALID_ROOT_OPERATION,"The operation '"+e+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function ne(e,n){return new j(U.INVALID_FORMAT,"String does not match format '"+e+"': "+n)}function Qt(e){throw new j(U.INTERNAL_ERROR,"Internal error: "+e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tt{constructor(n,r){this.bucket=n,this.path_=r}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const n=encodeURIComponent;return"/b/"+n(this.bucket)+"/o/"+n(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(n,r){let s;try{s=tt.makeFromUrl(n,r)}catch{return new tt(n,"")}if(s.path==="")return s;throw hc(n)}static makeFromUrl(n,r){let s=null;const a="([A-Za-z0-9.\\-_]+)";function l(L){L.path.charAt(L.path.length-1)==="/"&&(L.path_=L.path_.slice(0,-1))}const u="(/(.*))?$",_=new RegExp("^gs://"+a+u,"i"),E={bucket:1,path:3};function v(L){L.path_=decodeURIComponent(L.path)}const S="v[A-Za-z0-9_]+",I=r.replace(/[.]/g,"\\."),A="(/([^?#]*).*)?$",k=new RegExp(`^https?://${I}/${S}/b/${a}/o${A}`,"i"),R={bucket:1,path:3},O=r===Fi?"(?:storage.googleapis.com|storage.cloud.google.com)":r,D="([^?#]*)",W=new RegExp(`^https?://${O}/${a}/${D}`,"i"),M=[{regex:_,indices:E,postModify:l},{regex:k,indices:R,postModify:v},{regex:W,indices:{bucket:1,path:2},postModify:v}];for(let L=0;L<M.length;L++){const Z=M[L],K=Z.regex.exec(n);if(K){const g=K[Z.indices.bucket];let h=K[Z.indices.path];h||(h=""),s=new tt(g,h),Z.postModify(s);break}}if(s==null)throw lc(n);return s}}class yc{constructor(n){this.promise_=Promise.reject(n)}getPromise(){return this.promise_}cancel(n=!1){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wc(e,n,r){let s=1,a=null,l=null,u=!1,_=0;function E(){return _===2}let v=!1;function S(...D){v||(v=!0,n.apply(null,D))}function I(D){a=setTimeout(()=>{a=null,e(k,E())},D)}function A(){l&&clearTimeout(l)}function k(D,...W){if(v){A();return}if(D){A(),S.call(null,D,...W);return}if(E()||u){A(),S.call(null,D,...W);return}s<64&&(s*=2);let M;_===1?(_=2,M=0):M=(s+Math.random())*1e3,I(M)}let R=!1;function O(D){R||(R=!0,A(),!v&&(a!==null?(D||(_=2),clearTimeout(a),I(0)):D||(_=1)))}return I(0),l=setTimeout(()=>{u=!0,O(!0)},r),O}function bc(e){e(!1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vc(e){return e!==void 0}function _c(e){return typeof e=="object"&&!Array.isArray(e)}function Pn(e){return typeof e=="string"||e instanceof String}function oi(e){return xn()&&e instanceof Blob}function xn(){return typeof Blob<"u"}function ai(e,n,r,s){if(s<n)throw Cn(`Invalid value for '${e}'. Expected ${n} or greater.`);if(s>r)throw Cn(`Invalid value for '${e}'. Expected ${r} or less.`)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Mn(e,n,r){let s=n;return r==null&&(s=`https://${n}`),`${r}://${s}/v0${e}`}function Vi(e){const n=encodeURIComponent;let r="?";for(const s in e)if(e.hasOwnProperty(s)){const a=n(s)+"="+n(e[s]);r=r+a+"&"}return r=r.slice(0,-1),r}var kt;(function(e){e[e.NO_ERROR=0]="NO_ERROR",e[e.NETWORK_ERROR=1]="NETWORK_ERROR",e[e.ABORT=2]="ABORT"})(kt||(kt={}));/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ec(e,n){const r=e>=500&&e<600,a=[408,429].indexOf(e)!==-1,l=n.indexOf(e)!==-1;return r||a||l}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tc{constructor(n,r,s,a,l,u,_,E,v,S,I,A=!0,k=!1){this.url_=n,this.method_=r,this.headers_=s,this.body_=a,this.successCodes_=l,this.additionalRetryCodes_=u,this.callback_=_,this.errorCallback_=E,this.timeout_=v,this.progressCallback_=S,this.connectionFactory_=I,this.retry=A,this.isUsingEmulator=k,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((R,O)=>{this.resolve_=R,this.reject_=O,this.start_()})}start_(){const n=(s,a)=>{if(a){s(!1,new Te(!1,null,!0));return}const l=this.connectionFactory_();this.pendingConnection_=l;const u=_=>{const E=_.loaded,v=_.lengthComputable?_.total:-1;this.progressCallback_!==null&&this.progressCallback_(E,v)};this.progressCallback_!==null&&l.addUploadProgressListener(u),l.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&l.removeUploadProgressListener(u),this.pendingConnection_=null;const _=l.getErrorCode()===kt.NO_ERROR,E=l.getStatus();if(!_||Ec(E,this.additionalRetryCodes_)&&this.retry){const S=l.getErrorCode()===kt.ABORT;s(!1,new Te(!1,null,S));return}const v=this.successCodes_.indexOf(E)!==-1;s(!0,new Te(v,l))})},r=(s,a)=>{const l=this.resolve_,u=this.reject_,_=a.connection;if(a.wasSuccessCode)try{const E=this.callback_(_,_.getResponse());vc(E)?l(E):l()}catch(E){u(E)}else if(_!==null){const E=Nn();E.serverResponse=_.getErrorText(),this.errorCallback_?u(this.errorCallback_(_,E)):u(E)}else if(a.canceled){const E=this.appDelete_?Hi():uc();u(E)}else{const E=cc();u(E)}};this.canceled_?r(!1,new Te(!1,null,!0)):this.backoffId_=wc(n,r,this.timeout_)}getPromise(){return this.promise_}cancel(n){this.canceled_=!0,this.appDelete_=n||!1,this.backoffId_!==null&&bc(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class Te{constructor(n,r,s){this.wasSuccessCode=n,this.connection=r,this.canceled=!!s}}function Ac(e,n){n!==null&&n.length>0&&(e.Authorization="Firebase "+n)}function Sc(e,n){e["X-Firebase-Storage-Version"]="webjs/"+(n??"AppManager")}function Ic(e,n){n&&(e["X-Firebase-GMPID"]=n)}function Cc(e,n){n!==null&&(e["X-Firebase-AppCheck"]=n)}function kc(e,n,r,s,a,l,u=!0,_=!1){const E=Vi(e.urlParams),v=e.url+E,S=Object.assign({},e.headers);return Ic(S,n),Ac(S,r),Sc(S,l),Cc(S,s),new Tc(v,e.method,S,e.body,e.successCodes,e.additionalRetryCodes,e.handler,e.errorHandler,e.timeout,e.progressCallback,a,u,_)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rc(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function Dc(...e){const n=Rc();if(n!==void 0){const r=new n;for(let s=0;s<e.length;s++)r.append(e[s]);return r.getBlob()}else{if(xn())return new Blob(e);throw new j(U.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function Oc(e,n,r){return e.webkitSlice?e.webkitSlice(n,r):e.mozSlice?e.mozSlice(n,r):e.slice?e.slice(n,r):null}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nc(e){if(typeof atob>"u")throw gc("base-64");return atob(e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const st={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class pn{constructor(n,r){this.data=n,this.contentType=r||null}}function Pc(e,n){switch(e){case st.RAW:return new pn(Wi(n));case st.BASE64:case st.BASE64URL:return new pn(Ki(e,n));case st.DATA_URL:return new pn(Mc(n),Lc(n))}throw Nn()}function Wi(e){const n=[];for(let r=0;r<e.length;r++){let s=e.charCodeAt(r);if(s<=127)n.push(s);else if(s<=2047)n.push(192|s>>6,128|s&63);else if((s&64512)===55296)if(!(r<e.length-1&&(e.charCodeAt(r+1)&64512)===56320))n.push(239,191,189);else{const l=s,u=e.charCodeAt(++r);s=65536|(l&1023)<<10|u&1023,n.push(240|s>>18,128|s>>12&63,128|s>>6&63,128|s&63)}else(s&64512)===56320?n.push(239,191,189):n.push(224|s>>12,128|s>>6&63,128|s&63)}return new Uint8Array(n)}function xc(e){let n;try{n=decodeURIComponent(e)}catch{throw ne(st.DATA_URL,"Malformed data URL.")}return Wi(n)}function Ki(e,n){switch(e){case st.BASE64:{const a=n.indexOf("-")!==-1,l=n.indexOf("_")!==-1;if(a||l)throw ne(e,"Invalid character '"+(a?"-":"_")+"' found: is it base64url encoded?");break}case st.BASE64URL:{const a=n.indexOf("+")!==-1,l=n.indexOf("/")!==-1;if(a||l)throw ne(e,"Invalid character '"+(a?"+":"/")+"' found: is it base64 encoded?");n=n.replace(/-/g,"+").replace(/_/g,"/");break}}let r;try{r=Nc(n)}catch(a){throw a.message.includes("polyfill")?a:ne(e,"Invalid character found")}const s=new Uint8Array(r.length);for(let a=0;a<r.length;a++)s[a]=r.charCodeAt(a);return s}class qi{constructor(n){this.base64=!1,this.contentType=null;const r=n.match(/^data:([^,]+)?,/);if(r===null)throw ne(st.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const s=r[1]||null;s!=null&&(this.base64=Bc(s,";base64"),this.contentType=this.base64?s.substring(0,s.length-7):s),this.rest=n.substring(n.indexOf(",")+1)}}function Mc(e){const n=new qi(e);return n.base64?Ki(st.BASE64,n.rest):xc(n.rest)}function Lc(e){return new qi(e).contentType}function Bc(e,n){return e.length>=n.length?e.substring(e.length-n.length)===n:!1}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yt{constructor(n,r){let s=0,a="";oi(n)?(this.data_=n,s=n.size,a=n.type):n instanceof ArrayBuffer?(r?this.data_=new Uint8Array(n):(this.data_=new Uint8Array(n.byteLength),this.data_.set(new Uint8Array(n))),s=this.data_.length):n instanceof Uint8Array&&(r?this.data_=n:(this.data_=new Uint8Array(n.length),this.data_.set(n)),s=n.length),this.size_=s,this.type_=a}size(){return this.size_}type(){return this.type_}slice(n,r){if(oi(this.data_)){const s=this.data_,a=Oc(s,n,r);return a===null?null:new yt(a)}else{const s=new Uint8Array(this.data_.buffer,n,r-n);return new yt(s,!0)}}static getBlob(...n){if(xn()){const r=n.map(s=>s instanceof yt?s.data_:s);return new yt(Dc.apply(null,r))}else{const r=n.map(u=>Pn(u)?Pc(st.RAW,u).data:u.data_);let s=0;r.forEach(u=>{s+=u.byteLength});const a=new Uint8Array(s);let l=0;return r.forEach(u=>{for(let _=0;_<u.length;_++)a[l++]=u[_]}),new yt(a,!0)}}uploadData(){return this.data_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zi(e){let n;try{n=JSON.parse(e)}catch{return null}return _c(n)?n:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Uc(e){if(e.length===0)return null;const n=e.lastIndexOf("/");return n===-1?"":e.slice(0,n)}function jc(e,n){const r=n.split("/").filter(s=>s.length>0).join("/");return e.length===0?r:e+"/"+r}function Gi(e){const n=e.lastIndexOf("/",e.length-2);return n===-1?e:e.slice(n+1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Fc(e,n){return n}class X{constructor(n,r,s,a){this.server=n,this.local=r||n,this.writable=!!s,this.xform=a||Fc}}let Ae=null;function $c(e){return!Pn(e)||e.length<2?e:Gi(e)}function Xi(){if(Ae)return Ae;const e=[];e.push(new X("bucket")),e.push(new X("generation")),e.push(new X("metageneration")),e.push(new X("name","fullPath",!0));function n(l,u){return $c(u)}const r=new X("name");r.xform=n,e.push(r);function s(l,u){return u!==void 0?Number(u):u}const a=new X("size");return a.xform=s,e.push(a),e.push(new X("timeCreated")),e.push(new X("updated")),e.push(new X("md5Hash",null,!0)),e.push(new X("cacheControl",null,!0)),e.push(new X("contentDisposition",null,!0)),e.push(new X("contentEncoding",null,!0)),e.push(new X("contentLanguage",null,!0)),e.push(new X("contentType",null,!0)),e.push(new X("metadata","customMetadata",!0)),Ae=e,Ae}function Hc(e,n){function r(){const s=e.bucket,a=e.fullPath,l=new tt(s,a);return n._makeStorageReference(l)}Object.defineProperty(e,"ref",{get:r})}function Vc(e,n,r){const s={};s.type="file";const a=r.length;for(let l=0;l<a;l++){const u=r[l];s[u.local]=u.xform(s,n[u.server])}return Hc(s,e),s}function Ji(e,n,r){const s=zi(n);return s===null?null:Vc(e,s,r)}function Wc(e,n,r,s){const a=zi(n);if(a===null||!Pn(a.downloadTokens))return null;const l=a.downloadTokens;if(l.length===0)return null;const u=encodeURIComponent;return l.split(",").map(v=>{const S=e.bucket,I=e.fullPath,A="/b/"+u(S)+"/o/"+u(I),k=Mn(A,r,s),R=Vi({alt:"media",token:v});return k+R})[0]}function Kc(e,n){const r={},s=n.length;for(let a=0;a<s;a++){const l=n[a];l.writable&&(r[l.server]=e[l.local])}return JSON.stringify(r)}class Yi{constructor(n,r,s,a){this.url=n,this.method=r,this.handler=s,this.timeout=a,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zi(e){if(!e)throw Nn()}function qc(e,n){function r(s,a){const l=Ji(e,a,n);return Zi(l!==null),l}return r}function zc(e,n){function r(s,a){const l=Ji(e,a,n);return Zi(l!==null),Wc(l,a,e.host,e._protocol)}return r}function Qi(e){function n(r,s){let a;return r.getStatus()===401?r.getErrorText().includes("Firebase App Check token is invalid")?a=oc():a=sc():r.getStatus()===402?a=ic(e.bucket):r.getStatus()===403?a=ac(e.path):a=s,a.status=r.getStatus(),a.serverResponse=s.serverResponse,a}return n}function Gc(e){const n=Qi(e);function r(s,a){let l=n(s,a);return s.getStatus()===404&&(l=rc(e.path)),l.serverResponse=a.serverResponse,l}return r}function Xc(e,n,r){const s=n.fullServerUrl(),a=Mn(s,e.host,e._protocol),l="GET",u=e.maxOperationRetryTime,_=new Yi(a,l,zc(e,r),u);return _.errorHandler=Gc(n),_}function Jc(e,n){return e&&e.contentType||n&&n.type()||"application/octet-stream"}function Yc(e,n,r){const s=Object.assign({},r);return s.fullPath=e.path,s.size=n.size(),s.contentType||(s.contentType=Jc(null,n)),s}function Zc(e,n,r,s,a){const l=n.bucketOnlyServerUrl(),u={"X-Goog-Upload-Protocol":"multipart"};function _(){let M="";for(let L=0;L<2;L++)M=M+Math.random().toString().slice(2);return M}const E=_();u["Content-Type"]="multipart/related; boundary="+E;const v=Yc(n,s,a),S=Kc(v,r),I="--"+E+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+S+`\r
--`+E+`\r
Content-Type: `+v.contentType+`\r
\r
`,A=`\r
--`+E+"--",k=yt.getBlob(I,s,A);if(k===null)throw dc();const R={name:v.fullPath},O=Mn(l,e.host,e._protocol),D="POST",W=e.maxUploadRetryTime,F=new Yi(O,D,qc(e,r),W);return F.urlParams=R,F.headers=u,F.body=k.uploadData(),F.errorHandler=Qi(n),F}class Qc{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=kt.NO_ERROR,this.sendPromise_=new Promise(n=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=kt.ABORT,n()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=kt.NETWORK_ERROR,n()}),this.xhr_.addEventListener("load",()=>{n()})})}send(n,r,s,a,l){if(this.sent_)throw Qt("cannot .send() more than once");if(se(n)&&s&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(r,n,!0),l!==void 0)for(const u in l)l.hasOwnProperty(u)&&this.xhr_.setRequestHeader(u,l[u].toString());return a!==void 0?this.xhr_.send(a):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw Qt("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw Qt("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw Qt("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw Qt("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(n){return this.xhr_.getResponseHeader(n)}addUploadProgressListener(n){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",n)}removeUploadProgressListener(n){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",n)}}class tu extends Qc{initXhr(){this.xhr_.responseType="text"}}function ts(){return new tu}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rt{constructor(n,r){this._service=n,r instanceof tt?this._location=r:this._location=tt.makeFromUrl(r,n.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(n,r){return new Rt(n,r)}get root(){const n=new tt(this._location.bucket,"");return this._newRef(this._service,n)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return Gi(this._location.path)}get storage(){return this._service}get parent(){const n=Uc(this._location.path);if(n===null)return null;const r=new tt(this._location.bucket,n);return new Rt(this._service,r)}_throwIfRoot(n){if(this._location.path==="")throw mc(n)}}function eu(e,n,r){e._throwIfRoot("uploadBytes");const s=Zc(e.storage,e._location,Xi(),new yt(n,!0),r);return e.storage.makeRequestWithTokens(s,ts).then(a=>({metadata:a,ref:e}))}function nu(e){e._throwIfRoot("getDownloadURL");const n=Xc(e.storage,e._location,Xi());return e.storage.makeRequestWithTokens(n,ts).then(r=>{if(r===null)throw pc();return r})}function ru(e,n){const r=jc(e._location.path,n),s=new tt(e._location.bucket,r);return new Rt(e.storage,s)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function iu(e){return/^[A-Za-z]+:\/\//.test(e)}function su(e,n){return new Rt(e,n)}function es(e,n){if(e instanceof Ln){const r=e;if(r._bucket==null)throw fc();const s=new Rt(r,r._bucket);return n!=null?es(s,n):s}else return n!==void 0?ru(e,n):e}function ou(e,n){if(n&&iu(n)){if(e instanceof Ln)return su(e,n);throw Cn("To use ref(service, url), the first argument must be a Storage instance.")}else return es(e,n)}function ci(e,n){const r=n==null?void 0:n[$i];return r==null?null:tt.makeFromBucketSpec(r,e)}function au(e,n,r,s={}){e.host=`${n}:${r}`;const a=se(n);a&&(Ri(`https://${e.host}/b`),Di("Storage",!0)),e._isUsingEmulator=!0,e._protocol=a?"https":"http";const{mockUserToken:l}=s;l&&(e._overrideAuthToken=typeof l=="string"?l:Ao(l,e.app.options.projectId))}class Ln{constructor(n,r,s,a,l,u=!1){this.app=n,this._authProvider=r,this._appCheckProvider=s,this._url=a,this._firebaseVersion=l,this._isUsingEmulator=u,this._bucket=null,this._host=Fi,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=ec,this._maxUploadRetryTime=nc,this._requests=new Set,a!=null?this._bucket=tt.makeFromBucketSpec(a,this._host):this._bucket=ci(this._host,this.app.options)}get host(){return this._host}set host(n){this._host=n,this._url!=null?this._bucket=tt.makeFromBucketSpec(this._url,n):this._bucket=ci(n,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(n){ai("time",0,Number.POSITIVE_INFINITY,n),this._maxUploadRetryTime=n}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(n){ai("time",0,Number.POSITIVE_INFINITY,n),this._maxOperationRetryTime=n}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const n=this._authProvider.getImmediate({optional:!0});if(n){const r=await n.getToken();if(r!==null)return r.accessToken}return null}async _getAppCheckToken(){if(Bi(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const n=this._appCheckProvider.getImmediate({optional:!0});return n?(await n.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(n=>n.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(n){return new Rt(this,n)}_makeRequest(n,r,s,a,l=!0){if(this._deleted)return new yc(Hi());{const u=kc(n,this._appId,s,a,r,this._firebaseVersion,l,this._isUsingEmulator);return this._requests.add(u),u.getPromise().then(()=>this._requests.delete(u),()=>this._requests.delete(u)),u}}async makeRequestWithTokens(n,r){const[s,a]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(n,r,s,a).getPromise()}}const ui="@firebase/storage",li="0.14.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ns="storage";function bh(e,n,r){return e=nt(e),eu(e,n,r)}function vh(e){return e=nt(e),nu(e)}function _h(e,n){return e=nt(e),ou(e,n)}function Eh(e=On(),n){e=nt(e);const s=oe(e,ns).getImmediate({identifier:n}),a=Ci("storage");return a&&cu(s,...a),s}function cu(e,n,r,s={}){au(e,n,r,s)}function uu(e,{instanceIdentifier:n}){const r=e.getProvider("app").getImmediate(),s=e.getProvider("auth-internal"),a=e.getProvider("app-check-internal");return new Ln(r,s,a,n,Oa)}function lu(){lt(new ot(ns,uu,"PUBLIC").setMultipleInstances(!0)),et(ui,li,""),et(ui,li,"esm2020")}lu();/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hu="type.googleapis.com/google.protobuf.Int64Value",fu="type.googleapis.com/google.protobuf.UInt64Value";function rs(e,n){const r={};for(const s in e)e.hasOwnProperty(s)&&(r[s]=n(e[s]));return r}function Ce(e){if(e==null)return null;if(e instanceof Number&&(e=e.valueOf()),typeof e=="number"&&isFinite(e)||e===!0||e===!1||Object.prototype.toString.call(e)==="[object String]")return e;if(e instanceof Date)return e.toISOString();if(Array.isArray(e))return e.map(n=>Ce(n));if(typeof e=="function"||typeof e=="object")return rs(e,n=>Ce(n));throw new Error("Data cannot be encoded in JSON: "+e)}function Lt(e){if(e==null)return e;if(e["@type"])switch(e["@type"]){case hu:case fu:{const n=Number(e.value);if(isNaN(n))throw new Error("Data cannot be decoded from JSON: "+e);return n}default:throw new Error("Data cannot be decoded from JSON: "+e)}return Array.isArray(e)?e.map(n=>Lt(n)):typeof e=="function"||typeof e=="object"?rs(e,n=>Lt(n)):e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bn="functions";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hi={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class Y extends bt{constructor(n,r,s){super(`${Bn}/${n}`,r||""),this.details=s,Object.setPrototypeOf(this,Y.prototype)}}function du(e){if(e>=200&&e<300)return"ok";switch(e){case 0:return"internal";case 400:return"invalid-argument";case 401:return"unauthenticated";case 403:return"permission-denied";case 404:return"not-found";case 409:return"aborted";case 429:return"resource-exhausted";case 499:return"cancelled";case 500:return"internal";case 501:return"unimplemented";case 503:return"unavailable";case 504:return"deadline-exceeded"}return"unknown"}function ke(e,n){let r=du(e),s=r,a;try{const l=n&&n.error;if(l){const u=l.status;if(typeof u=="string"){if(!hi[u])return new Y("internal","internal");r=hi[u],s=u}const _=l.message;typeof _=="string"&&(s=_),a=l.details,a!==void 0&&(a=Lt(a))}}catch{}return r==="ok"?null:new Y(r,s,a)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pu{constructor(n,r,s,a){this.app=n,this.auth=null,this.messaging=null,this.appCheck=null,this.serverAppAppCheckToken=null,Bi(n)&&n.settings.appCheckToken&&(this.serverAppAppCheckToken=n.settings.appCheckToken),this.auth=r.getImmediate({optional:!0}),this.messaging=s.getImmediate({optional:!0}),this.auth||r.get().then(l=>this.auth=l,()=>{}),this.messaging||s.get().then(l=>this.messaging=l,()=>{}),this.appCheck||a==null||a.get().then(l=>this.appCheck=l,()=>{})}async getAuthToken(){if(this.auth)try{const n=await this.auth.getToken();return n==null?void 0:n.accessToken}catch{return}}async getMessagingToken(){if(!(!this.messaging||!("Notification"in self)||Notification.permission!=="granted"))try{return await this.messaging.getToken()}catch{return}}async getAppCheckToken(n){if(this.serverAppAppCheckToken)return this.serverAppAppCheckToken;if(this.appCheck){const r=n?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return r.error?null:r.token}return null}async getContext(n){const r=await this.getAuthToken(),s=await this.getMessagingToken(),a=await this.getAppCheckToken(n);return{authToken:r,messagingToken:s,appCheckToken:a}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kn="us-central1",gu=/^data: (.*?)(?:\n|$)/;function mu(e){let n=null;return{promise:new Promise((r,s)=>{n=setTimeout(()=>{s(new Y("deadline-exceeded","deadline-exceeded"))},e)}),cancel:()=>{n&&clearTimeout(n)}}}class yu{constructor(n,r,s,a,l=kn,u=(..._)=>fetch(..._)){this.app=n,this.fetchImpl=u,this.emulatorOrigin=null,this.contextProvider=new pu(n,r,s,a),this.cancelAllRequests=new Promise(_=>{this.deleteService=()=>Promise.resolve(_())});try{const _=new URL(l);this.customDomain=_.origin+(_.pathname==="/"?"":_.pathname),this.region=kn}catch{this.customDomain=null,this.region=l}}_delete(){return this.deleteService()}_url(n){const r=this.app.options.projectId;return this.emulatorOrigin!==null?`${this.emulatorOrigin}/${r}/${this.region}/${n}`:this.customDomain!==null?`${this.customDomain}/${n}`:`https://${this.region}-${r}.cloudfunctions.net/${n}`}}function wu(e,n,r){const s=se(n);e.emulatorOrigin=`http${s?"s":""}://${n}:${r}`,s&&(Ri(e.emulatorOrigin+"/backends"),Di("Functions",!0))}function bu(e,n,r){const s=a=>_u(e,n,a,{});return s.stream=(a,l)=>Tu(e,n,a,l),s}function is(e){return e.emulatorOrigin&&se(e.emulatorOrigin)?"include":void 0}async function vu(e,n,r,s,a){r["Content-Type"]="application/json";let l;try{l=await s(e,{method:"POST",body:JSON.stringify(n),headers:r,credentials:is(a)})}catch{return{status:0,json:null}}let u=null;try{u=await l.json()}catch{}return{status:l.status,json:u}}async function ss(e,n){const r={},s=await e.contextProvider.getContext(n.limitedUseAppCheckTokens);return s.authToken&&(r.Authorization="Bearer "+s.authToken),s.messagingToken&&(r["Firebase-Instance-ID-Token"]=s.messagingToken),s.appCheckToken!==null&&(r["X-Firebase-AppCheck"]=s.appCheckToken),r}function _u(e,n,r,s){const a=e._url(n);return Eu(e,a,r,s)}async function Eu(e,n,r,s){r=Ce(r);const a={data:r},l=await ss(e,s),u=s.timeout||7e4,_=mu(u),E=await Promise.race([vu(n,a,l,e.fetchImpl,e),_.promise,e.cancelAllRequests]);if(_.cancel(),!E)throw new Y("cancelled","Firebase Functions instance was deleted.");const v=ke(E.status,E.json);if(v)throw v;if(!E.json)throw new Y("internal","Response is not valid JSON object.");let S=E.json.data;if(typeof S>"u"&&(S=E.json.result),typeof S>"u")throw new Y("internal","Response is missing data field.");return{data:Lt(S)}}function Tu(e,n,r,s){const a=e._url(n);return Au(e,a,r,s||{})}async function Au(e,n,r,s){var A;r=Ce(r);const a={data:r},l=await ss(e,s);l["Content-Type"]="application/json",l.Accept="text/event-stream";let u;try{u=await e.fetchImpl(n,{method:"POST",body:JSON.stringify(a),headers:l,signal:s==null?void 0:s.signal,credentials:is(e)})}catch(k){if(k instanceof Error&&k.name==="AbortError"){const O=new Y("cancelled","Request was cancelled.");return{data:Promise.reject(O),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(O)}}}}}}const R=ke(0,null);return{data:Promise.reject(R),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(R)}}}}}}let _,E;const v=new Promise((k,R)=>{_=k,E=R});(A=s==null?void 0:s.signal)==null||A.addEventListener("abort",()=>{const k=new Y("cancelled","Request was cancelled.");E(k)});const S=u.body.getReader(),I=Su(S,_,E,s==null?void 0:s.signal);return{stream:{[Symbol.asyncIterator](){const k=I.getReader();return{async next(){const{value:R,done:O}=await k.read();return{value:R,done:O}},async return(){return await k.cancel(),{done:!0,value:void 0}}}}},data:v}}function Su(e,n,r,s){const a=(u,_)=>{const E=u.match(gu);if(!E)return;const v=E[1];try{const S=JSON.parse(v);if("result"in S){n(Lt(S.result));return}if("message"in S){_.enqueue(Lt(S.message));return}if("error"in S){const I=ke(0,S);_.error(I),r(I);return}}catch(S){if(S instanceof Y){_.error(S),r(S);return}}},l=new TextDecoder;return new ReadableStream({start(u){let _="";return E();async function E(){if(s!=null&&s.aborted){const v=new Y("cancelled","Request was cancelled");return u.error(v),r(v),Promise.resolve()}try{const{value:v,done:S}=await e.read();if(S){_.trim()&&a(_.trim(),u),u.close();return}if(s!=null&&s.aborted){const A=new Y("cancelled","Request was cancelled");u.error(A),r(A),await e.cancel();return}_+=l.decode(v,{stream:!0});const I=_.split(`
`);_=I.pop()||"";for(const A of I)A.trim()&&a(A.trim(),u);return E()}catch(v){const S=v instanceof Y?v:ke(0,null);u.error(S),r(S)}}},cancel(){return e.cancel()}})}const fi="@firebase/functions",di="0.13.1";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Iu="auth-internal",Cu="app-check-internal",ku="messaging-internal";function Ru(e){const n=(r,{instanceIdentifier:s})=>{const a=r.getProvider("app").getImmediate(),l=r.getProvider(Iu),u=r.getProvider(ku),_=r.getProvider(Cu);return new yu(a,l,u,_,s)};lt(new ot(Bn,n,"PUBLIC").setMultipleInstances(!0)),et(fi,di,e),et(fi,di,"esm2020")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Th(e=On(),n=kn){const s=oe(nt(e),Bn).getImmediate({identifier:n}),a=Ci("functions");return a&&Du(s,...a),s}function Du(e,n,r){wu(nt(e),n,r)}function Ah(e,n,r){return bu(nt(e),n)}Ru();var pi;(function(e){e[e.Min=1]="Min",e[e.Low=2]="Low",e[e.Default=3]="Default",e[e.High=4]="High",e[e.Max=5]="Max"})(pi||(pi={}));var gi;(function(e){e[e.Secret=-1]="Secret",e[e.Private=0]="Private",e[e.Public=1]="Public"})(gi||(gi={}));const Sh=uo("FirebaseMessaging",{web:()=>lo(()=>Promise.resolve().then(()=>ih),void 0).then(e=>new e.FirebaseMessagingWeb)}),os="@firebase/installations",Un="0.6.19";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const as=1e4,cs=`w:${Un}`,us="FIS_v2",Ou="https://firebaseinstallations.googleapis.com/v1",Nu=60*60*1e3,Pu="installations",xu="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mu={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},Dt=new Oe(Pu,xu,Mu);function ls(e){return e instanceof bt&&e.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hs({projectId:e}){return`${Ou}/projects/${e}/installations`}function fs(e){return{token:e.token,requestStatus:2,expiresIn:Bu(e.expiresIn),creationTime:Date.now()}}async function ds(e,n){const s=(await n.json()).error;return Dt.create("request-failed",{requestName:e,serverCode:s.code,serverMessage:s.message,serverStatus:s.status})}function ps({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}function Lu(e,{refreshToken:n}){const r=ps(e);return r.append("Authorization",Uu(n)),r}async function gs(e){const n=await e();return n.status>=500&&n.status<600?e():n}function Bu(e){return Number(e.replace("s","000"))}function Uu(e){return`${us} ${e}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ju({appConfig:e,heartbeatServiceProvider:n},{fid:r}){const s=hs(e),a=ps(e),l=n.getImmediate({optional:!0});if(l){const v=await l.getHeartbeatsHeader();v&&a.append("x-firebase-client",v)}const u={fid:r,authVersion:us,appId:e.appId,sdkVersion:cs},_={method:"POST",headers:a,body:JSON.stringify(u)},E=await gs(()=>fetch(s,_));if(E.ok){const v=await E.json();return{fid:v.fid||r,registrationStatus:2,refreshToken:v.refreshToken,authToken:fs(v.authToken)}}else throw await ds("Create Installation",E)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ms(e){return new Promise(n=>{setTimeout(n,e)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Fu(e){return btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $u=/^[cdef][\w-]{21}$/,Rn="";function Hu(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const r=Vu(e);return $u.test(r)?r:Rn}catch{return Rn}}function Vu(e){return Fu(e).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pe(e){return`${e.appName}!${e.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ys=new Map;function ws(e,n){const r=Pe(e);bs(r,n),Wu(r,n)}function bs(e,n){const r=ys.get(e);if(r)for(const s of r)s(n)}function Wu(e,n){const r=Ku();r&&r.postMessage({key:e,fid:n}),qu()}let Ct=null;function Ku(){return!Ct&&"BroadcastChannel"in self&&(Ct=new BroadcastChannel("[Firebase] FID Change"),Ct.onmessage=e=>{bs(e.data.key,e.data.fid)}),Ct}function qu(){ys.size===0&&Ct&&(Ct.close(),Ct=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zu="firebase-installations-database",Gu=1,Ot="firebase-installations-store";let gn=null;function jn(){return gn||(gn=Ne(zu,Gu,{upgrade:(e,n)=>{switch(n){case 0:e.createObjectStore(Ot)}}})),gn}async function Re(e,n){const r=Pe(e),a=(await jn()).transaction(Ot,"readwrite"),l=a.objectStore(Ot),u=await l.get(r);return await l.put(n,r),await a.done,(!u||u.fid!==n.fid)&&ws(e,n.fid),n}async function vs(e){const n=Pe(e),s=(await jn()).transaction(Ot,"readwrite");await s.objectStore(Ot).delete(n),await s.done}async function xe(e,n){const r=Pe(e),a=(await jn()).transaction(Ot,"readwrite"),l=a.objectStore(Ot),u=await l.get(r),_=n(u);return _===void 0?await l.delete(r):await l.put(_,r),await a.done,_&&(!u||u.fid!==_.fid)&&ws(e,_.fid),_}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Fn(e){let n;const r=await xe(e.appConfig,s=>{const a=Xu(s),l=Ju(e,a);return n=l.registrationPromise,l.installationEntry});return r.fid===Rn?{installationEntry:await n}:{installationEntry:r,registrationPromise:n}}function Xu(e){const n=e||{fid:Hu(),registrationStatus:0};return _s(n)}function Ju(e,n){if(n.registrationStatus===0){if(!navigator.onLine){const a=Promise.reject(Dt.create("app-offline"));return{installationEntry:n,registrationPromise:a}}const r={fid:n.fid,registrationStatus:1,registrationTime:Date.now()},s=Yu(e,r);return{installationEntry:r,registrationPromise:s}}else return n.registrationStatus===1?{installationEntry:n,registrationPromise:Zu(e)}:{installationEntry:n}}async function Yu(e,n){try{const r=await ju(e,n);return Re(e.appConfig,r)}catch(r){throw ls(r)&&r.customData.serverCode===409?await vs(e.appConfig):await Re(e.appConfig,{fid:n.fid,registrationStatus:0}),r}}async function Zu(e){let n=await mi(e.appConfig);for(;n.registrationStatus===1;)await ms(100),n=await mi(e.appConfig);if(n.registrationStatus===0){const{installationEntry:r,registrationPromise:s}=await Fn(e);return s||r}return n}function mi(e){return xe(e,n=>{if(!n)throw Dt.create("installation-not-found");return _s(n)})}function _s(e){return Qu(e)?{fid:e.fid,registrationStatus:0}:e}function Qu(e){return e.registrationStatus===1&&e.registrationTime+as<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function tl({appConfig:e,heartbeatServiceProvider:n},r){const s=el(e,r),a=Lu(e,r),l=n.getImmediate({optional:!0});if(l){const v=await l.getHeartbeatsHeader();v&&a.append("x-firebase-client",v)}const u={installation:{sdkVersion:cs,appId:e.appId}},_={method:"POST",headers:a,body:JSON.stringify(u)},E=await gs(()=>fetch(s,_));if(E.ok){const v=await E.json();return fs(v)}else throw await ds("Generate Auth Token",E)}function el(e,{fid:n}){return`${hs(e)}/${n}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function $n(e,n=!1){let r;const s=await xe(e.appConfig,l=>{if(!Es(l))throw Dt.create("not-registered");const u=l.authToken;if(!n&&il(u))return l;if(u.requestStatus===1)return r=nl(e,n),l;{if(!navigator.onLine)throw Dt.create("app-offline");const _=ol(l);return r=rl(e,_),_}});return r?await r:s.authToken}async function nl(e,n){let r=await yi(e.appConfig);for(;r.authToken.requestStatus===1;)await ms(100),r=await yi(e.appConfig);const s=r.authToken;return s.requestStatus===0?$n(e,n):s}function yi(e){return xe(e,n=>{if(!Es(n))throw Dt.create("not-registered");const r=n.authToken;return al(r)?{...n,authToken:{requestStatus:0}}:n})}async function rl(e,n){try{const r=await tl(e,n),s={...n,authToken:r};return await Re(e.appConfig,s),r}catch(r){if(ls(r)&&(r.customData.serverCode===401||r.customData.serverCode===404))await vs(e.appConfig);else{const s={...n,authToken:{requestStatus:0}};await Re(e.appConfig,s)}throw r}}function Es(e){return e!==void 0&&e.registrationStatus===2}function il(e){return e.requestStatus===2&&!sl(e)}function sl(e){const n=Date.now();return n<e.creationTime||e.creationTime+e.expiresIn<n+Nu}function ol(e){const n={requestStatus:1,requestTime:Date.now()};return{...e,authToken:n}}function al(e){return e.requestStatus===1&&e.requestTime+as<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function cl(e){const n=e,{installationEntry:r,registrationPromise:s}=await Fn(n);return s?s.catch(console.error):$n(n).catch(console.error),r.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ul(e,n=!1){const r=e;return await ll(r),(await $n(r,n)).token}async function ll(e){const{registrationPromise:n}=await Fn(e);n&&await n}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hl(e){if(!e||!e.options)throw mn("App Configuration");if(!e.name)throw mn("App Name");const n=["projectId","apiKey","appId"];for(const r of n)if(!e.options[r])throw mn(r);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}function mn(e){return Dt.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ts="installations",fl="installations-internal",dl=e=>{const n=e.getProvider("app").getImmediate(),r=hl(n),s=oe(n,"heartbeat");return{app:n,appConfig:r,heartbeatServiceProvider:s,_delete:()=>Promise.resolve()}},pl=e=>{const n=e.getProvider("app").getImmediate(),r=oe(n,Ts).getImmediate();return{getId:()=>cl(r),getToken:a=>ul(r,a)}};function gl(){lt(new ot(Ts,dl,"PUBLIC")),lt(new ot(fl,pl,"PRIVATE"))}gl();et(os,Un);et(os,Un,"esm2020");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ml="/firebase-messaging-sw.js",yl="/firebase-cloud-messaging-push-scope",As="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",wl="https://fcmregistrations.googleapis.com/v1",Ss="google.c.a.c_id",bl="google.c.a.c_l",vl="google.c.a.ts",_l="google.c.a.e",wi=1e4;var bi;(function(e){e[e.DATA_MESSAGE=1]="DATA_MESSAGE",e[e.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION"})(bi||(bi={}));/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */var ie;(function(e){e.PUSH_RECEIVED="push-received",e.NOTIFICATION_CLICKED="notification-clicked"})(ie||(ie={}));/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function at(e){const n=new Uint8Array(e);return btoa(String.fromCharCode(...n)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function El(e){const n="=".repeat((4-e.length%4)%4),r=(e+n).replace(/\-/g,"+").replace(/_/g,"/"),s=atob(r),a=new Uint8Array(s.length);for(let l=0;l<s.length;++l)a[l]=s.charCodeAt(l);return a}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yn="fcm_token_details_db",Tl=5,vi="fcm_token_object_Store";async function Al(e){if("databases"in indexedDB&&!(await indexedDB.databases()).map(l=>l.name).includes(yn))return null;let n=null;return(await Ne(yn,Tl,{upgrade:async(s,a,l,u)=>{if(a<2||!s.objectStoreNames.contains(vi))return;const _=u.objectStore(vi),E=await _.index("fcmSenderId").get(e);if(await _.clear(),!!E){if(a===2){const v=E;if(!v.auth||!v.p256dh||!v.endpoint)return;n={token:v.fcmToken,createTime:v.createTime??Date.now(),subscriptionOptions:{auth:v.auth,p256dh:v.p256dh,endpoint:v.endpoint,swScope:v.swScope,vapidKey:typeof v.vapidKey=="string"?v.vapidKey:at(v.vapidKey)}}}else if(a===3){const v=E;n={token:v.fcmToken,createTime:v.createTime,subscriptionOptions:{auth:at(v.auth),p256dh:at(v.p256dh),endpoint:v.endpoint,swScope:v.swScope,vapidKey:at(v.vapidKey)}}}else if(a===4){const v=E;n={token:v.fcmToken,createTime:v.createTime,subscriptionOptions:{auth:at(v.auth),p256dh:at(v.p256dh),endpoint:v.endpoint,swScope:v.swScope,vapidKey:at(v.vapidKey)}}}}}})).close(),await ln(yn),await ln("fcm_vapid_details_db"),await ln("undefined"),Sl(n)?n:null}function Sl(e){if(!e||!e.subscriptionOptions)return!1;const{subscriptionOptions:n}=e;return typeof e.createTime=="number"&&e.createTime>0&&typeof e.token=="string"&&e.token.length>0&&typeof n.auth=="string"&&n.auth.length>0&&typeof n.p256dh=="string"&&n.p256dh.length>0&&typeof n.endpoint=="string"&&n.endpoint.length>0&&typeof n.swScope=="string"&&n.swScope.length>0&&typeof n.vapidKey=="string"&&n.vapidKey.length>0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Il="firebase-messaging-database",Cl=1,Nt="firebase-messaging-store";let wn=null;function Hn(){return wn||(wn=Ne(Il,Cl,{upgrade:(e,n)=>{switch(n){case 0:e.createObjectStore(Nt)}}})),wn}async function Is(e){const n=Wn(e),s=await(await Hn()).transaction(Nt).objectStore(Nt).get(n);if(s)return s;{const a=await Al(e.appConfig.senderId);if(a)return await Vn(e,a),a}}async function Vn(e,n){const r=Wn(e),a=(await Hn()).transaction(Nt,"readwrite");return await a.objectStore(Nt).put(n,r),await a.done,n}async function kl(e){const n=Wn(e),s=(await Hn()).transaction(Nt,"readwrite");await s.objectStore(Nt).delete(n),await s.done}function Wn({appConfig:e}){return e.appId}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rl={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."},V=new Oe("messaging","Messaging",Rl);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Dl(e,n){const r=await qn(e),s=ks(n),a={method:"POST",headers:r,body:JSON.stringify(s)};let l;try{l=await(await fetch(Kn(e.appConfig),a)).json()}catch(u){throw V.create("token-subscribe-failed",{errorInfo:u==null?void 0:u.toString()})}if(l.error){const u=l.error.message;throw V.create("token-subscribe-failed",{errorInfo:u})}if(!l.token)throw V.create("token-subscribe-no-token");return l.token}async function Ol(e,n){const r=await qn(e),s=ks(n.subscriptionOptions),a={method:"PATCH",headers:r,body:JSON.stringify(s)};let l;try{l=await(await fetch(`${Kn(e.appConfig)}/${n.token}`,a)).json()}catch(u){throw V.create("token-update-failed",{errorInfo:u==null?void 0:u.toString()})}if(l.error){const u=l.error.message;throw V.create("token-update-failed",{errorInfo:u})}if(!l.token)throw V.create("token-update-no-token");return l.token}async function Cs(e,n){const s={method:"DELETE",headers:await qn(e)};try{const l=await(await fetch(`${Kn(e.appConfig)}/${n}`,s)).json();if(l.error){const u=l.error.message;throw V.create("token-unsubscribe-failed",{errorInfo:u})}}catch(a){throw V.create("token-unsubscribe-failed",{errorInfo:a==null?void 0:a.toString()})}}function Kn({projectId:e}){return`${wl}/projects/${e}/registrations`}async function qn({appConfig:e,installations:n}){const r=await n.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e.apiKey,"x-goog-firebase-installations-auth":`FIS ${r}`})}function ks({p256dh:e,auth:n,endpoint:r,vapidKey:s}){const a={web:{endpoint:r,auth:n,p256dh:e}};return s!==As&&(a.web.applicationPubKey=s),a}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nl=7*24*60*60*1e3;async function Pl(e){const n=await Ll(e.swRegistration,e.vapidKey),r={vapidKey:e.vapidKey,swScope:e.swRegistration.scope,endpoint:n.endpoint,auth:at(n.getKey("auth")),p256dh:at(n.getKey("p256dh"))},s=await Is(e.firebaseDependencies);if(s){if(Bl(s.subscriptionOptions,r))return Date.now()>=s.createTime+Nl?Ml(e,{token:s.token,createTime:Date.now(),subscriptionOptions:r}):s.token;try{await Cs(e.firebaseDependencies,s.token)}catch(a){console.warn(a)}return _i(e.firebaseDependencies,r)}else return _i(e.firebaseDependencies,r)}async function xl(e){const n=await Is(e.firebaseDependencies);n&&(await Cs(e.firebaseDependencies,n.token),await kl(e.firebaseDependencies));const r=await e.swRegistration.pushManager.getSubscription();return r?r.unsubscribe():!0}async function Ml(e,n){try{const r=await Ol(e.firebaseDependencies,n),s={...n,token:r,createTime:Date.now()};return await Vn(e.firebaseDependencies,s),r}catch(r){throw r}}async function _i(e,n){const s={token:await Dl(e,n),createTime:Date.now(),subscriptionOptions:n};return await Vn(e,s),s.token}async function Ll(e,n){const r=await e.pushManager.getSubscription();return r||e.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:El(n)})}function Bl(e,n){const r=n.vapidKey===e.vapidKey,s=n.endpoint===e.endpoint,a=n.auth===e.auth,l=n.p256dh===e.p256dh;return r&&s&&a&&l}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ei(e){const n={from:e.from,collapseKey:e.collapse_key,messageId:e.fcmMessageId};return Ul(n,e),jl(n,e),Fl(n,e),n}function Ul(e,n){if(!n.notification)return;e.notification={};const r=n.notification.title;r&&(e.notification.title=r);const s=n.notification.body;s&&(e.notification.body=s);const a=n.notification.image;a&&(e.notification.image=a);const l=n.notification.icon;l&&(e.notification.icon=l)}function jl(e,n){n.data&&(e.data=n.data)}function Fl(e,n){var a,l,u,_;if(!n.fcmOptions&&!((a=n.notification)!=null&&a.click_action))return;e.fcmOptions={};const r=((l=n.fcmOptions)==null?void 0:l.link)??((u=n.notification)==null?void 0:u.click_action);r&&(e.fcmOptions.link=r);const s=(_=n.fcmOptions)==null?void 0:_.analytics_label;s&&(e.fcmOptions.analyticsLabel=s)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $l(e){return typeof e=="object"&&!!e&&Ss in e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Hl(e){if(!e||!e.options)throw bn("App Configuration Object");if(!e.name)throw bn("App Name");const n=["projectId","apiKey","appId","messagingSenderId"],{options:r}=e;for(const s of n)if(!r[s])throw bn(s);return{appName:e.name,projectId:r.projectId,apiKey:r.apiKey,appId:r.appId,senderId:r.messagingSenderId}}function bn(e){return V.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vl{constructor(n,r,s){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const a=Hl(n);this.firebaseDependencies={app:n,appConfig:a,installations:r,analyticsProvider:s}}_delete(){return Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Rs(e){try{e.swRegistration=await navigator.serviceWorker.register(ml,{scope:yl}),e.swRegistration.update().catch(()=>{}),await Wl(e.swRegistration)}catch(n){throw V.create("failed-service-worker-registration",{browserErrorMessage:n==null?void 0:n.message})}}async function Wl(e){return new Promise((n,r)=>{const s=setTimeout(()=>r(new Error(`Service worker not registered after ${wi} ms`)),wi),a=e.installing||e.waiting;e.active?(clearTimeout(s),n()):a?a.onstatechange=l=>{var u;((u=l.target)==null?void 0:u.state)==="activated"&&(a.onstatechange=null,clearTimeout(s),n())}:(clearTimeout(s),r(new Error("No incoming service worker found.")))})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Kl(e,n){if(!n&&!e.swRegistration&&await Rs(e),!(!n&&e.swRegistration)){if(!(n instanceof ServiceWorkerRegistration))throw V.create("invalid-sw-registration");e.swRegistration=n}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ql(e,n){n?e.vapidKey=n:e.vapidKey||(e.vapidKey=As)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ds(e,n){if(!navigator)throw V.create("only-available-in-window");if(Notification.permission==="default"&&await Notification.requestPermission(),Notification.permission!=="granted")throw V.create("permission-blocked");return await ql(e,n==null?void 0:n.vapidKey),await Kl(e,n==null?void 0:n.serviceWorkerRegistration),Pl(e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function zl(e,n,r){const s=Gl(n);(await e.firebaseDependencies.analyticsProvider.get()).logEvent(s,{message_id:r[Ss],message_name:r[bl],message_time:r[vl],message_device_time:Math.floor(Date.now()/1e3)})}function Gl(e){switch(e){case ie.NOTIFICATION_CLICKED:return"notification_open";case ie.PUSH_RECEIVED:return"notification_foreground";default:throw new Error}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Xl(e,n){const r=n.data;if(!r.isFirebaseMessaging)return;e.onMessageHandler&&r.messageType===ie.PUSH_RECEIVED&&(typeof e.onMessageHandler=="function"?e.onMessageHandler(Ei(r)):e.onMessageHandler.next(Ei(r)));const s=r.data;$l(s)&&s[_l]==="1"&&await zl(e,r.messageType,s)}const Ti="@firebase/messaging",Ai="0.12.23";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jl=e=>{const n=new Vl(e.getProvider("app").getImmediate(),e.getProvider("installations-internal").getImmediate(),e.getProvider("analytics-internal"));return navigator.serviceWorker.addEventListener("message",r=>Xl(n,r)),n},Yl=e=>{const n=e.getProvider("messaging").getImmediate();return{getToken:s=>Ds(n,s)}};function Zl(){lt(new ot("messaging",Jl,"PUBLIC")),lt(new ot("messaging-internal",Yl,"PRIVATE")),et(Ti,Ai),et(Ti,Ai,"esm2020")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function te(){try{await xi()}catch{return!1}return typeof window<"u"&&Pi()&&Co()&&"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&"fetch"in window&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ql(e){if(!navigator)throw V.create("only-available-in-window");return e.swRegistration||await Rs(e),xl(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function th(e,n){if(!navigator)throw V.create("only-available-in-window");return e.onMessageHandler=n,()=>{e.onMessageHandler=null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vn(e=On()){return te().then(n=>{if(!n)throw V.create("unsupported-browser")},n=>{throw V.create("indexed-db-unsupported")}),oe(nt(e),"messaging").getImmediate()}async function eh(e,n){return e=nt(e),Ds(e,n)}function nh(e){return e=nt(e),Ql(e)}function rh(e,n){return e=nt(e),th(e,n)}Zl();class Me extends ho{constructor(){super(),te().then(n=>{if(!n)return;const r=vn();rh(r,s=>this.handleNotificationReceived(s))})}async checkPermissions(){return await te()?{receive:this.convertNotificationPermissionToPermissionState(Notification.permission)}:{receive:"denied"}}async requestPermissions(){if(!await te())return{receive:"denied"};const r=await Notification.requestPermission();return{receive:this.convertNotificationPermissionToPermissionState(r)}}async isSupported(){return{isSupported:await te()}}async getToken(n){const r=vn();return{token:await eh(r,{vapidKey:n.vapidKey,serviceWorkerRegistration:n.serviceWorkerRegistration})}}async deleteToken(){const n=vn();await nh(n)}async getDeliveredNotifications(){this.throwUnimplementedError()}async removeDeliveredNotifications(n){this.throwUnimplementedError()}async removeAllDeliveredNotifications(){this.throwUnimplementedError()}async subscribeToTopic(n){this.throwUnimplementedError()}async unsubscribeFromTopic(n){this.throwUnimplementedError()}async createChannel(n){this.throwUnimplementedError()}async deleteChannel(n){this.throwUnimplementedError()}async listChannels(){this.throwUnimplementedError()}handleNotificationReceived(n){const s={notification:this.createNotificationResult(n)};this.notifyListeners(Me.notificationReceivedEvent,s)}createNotificationResult(n){var r,s,a;return{body:(r=n.notification)===null||r===void 0?void 0:r.body,data:n.data,id:n.messageId,image:(s=n.notification)===null||s===void 0?void 0:s.image,title:(a=n.notification)===null||a===void 0?void 0:a.title}}convertNotificationPermissionToPermissionState(n){let r="prompt";switch(n){case"granted":r="granted";break;case"denied":r="denied";break}return r}throwUnimplementedError(){throw this.unimplemented("Not implemented on web.")}}Me.notificationReceivedEvent="notificationReceived";const ih=Object.freeze(Object.defineProperty({__proto__:null,FirebaseMessagingWeb:Me},Symbol.toStringTag,{value:"Module"}));export{Eo as A,On as B,ot as C,Di as D,Za as E,bt as F,mh as G,yh as H,Ka as I,hh as J,ph as K,$o as L,qa as M,ch as N,Na as O,Eh as P,Th as Q,Sh as R,Ya as S,Ah as T,_h as U,bh as V,Ga as W,za as X,vh as Y,Bi as _,x as a,oe as b,fh as c,_n as d,Qa as e,Xa as f,nt as g,Ja as h,se as i,tc as j,Oi as k,wo as l,Pi as m,dh as n,lt as o,Ri as p,Oa as q,et as r,oh as s,ah as t,lh as u,uh as v,Oe as w,wh as x,yo as y,gh as z};
