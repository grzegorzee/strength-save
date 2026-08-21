const KE=function(){const e=typeof document<"u"&&document.createElement("link").relList;return e&&e.supports&&e.supports("modulepreload")?"modulepreload":"preload"}(),QE=function(n){return"/"+n},zd={},Rm=function(e,t,r){let s=Promise.resolve();if(t&&t.length>0){document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),c=(o==null?void 0:o.nonce)||(o==null?void 0:o.getAttribute("nonce"));s=Promise.allSettled(t.map(u=>{if(u=QE(u),u in zd)return;zd[u]=!0;const l=u.endsWith(".css"),d=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${u}"]${d}`))return;const p=document.createElement("link");if(p.rel=l?"stylesheet":KE,l||(p.as="script"),p.crossOrigin="",p.href=u,c&&p.setAttribute("nonce",c),document.head.appendChild(p),l)return new Promise((m,T)=>{p.addEventListener("load",m),p.addEventListener("error",()=>T(new Error(`Unable to preload CSS for ${u}`)))})}))}function i(o){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=o,window.dispatchEvent(c),!c.defaultPrevented)throw o}return s.then(o=>{for(const c of o||[])c.status==="rejected"&&i(c.reason);return e().catch(i)})},JE=()=>{};var Wd={};/**
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
 */const bm=function(n){const e=[];let t=0;for(let r=0;r<n.length;r++){let s=n.charCodeAt(r);s<128?e[t++]=s:s<2048?(e[t++]=s>>6|192,e[t++]=s&63|128):(s&64512)===55296&&r+1<n.length&&(n.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(n.charCodeAt(++r)&1023),e[t++]=s>>18|240,e[t++]=s>>12&63|128,e[t++]=s>>6&63|128,e[t++]=s&63|128):(e[t++]=s>>12|224,e[t++]=s>>6&63|128,e[t++]=s&63|128)}return e},YE=function(n){const e=[];let t=0,r=0;for(;t<n.length;){const s=n[t++];if(s<128)e[r++]=String.fromCharCode(s);else if(s>191&&s<224){const i=n[t++];e[r++]=String.fromCharCode((s&31)<<6|i&63)}else if(s>239&&s<365){const i=n[t++],o=n[t++],c=n[t++],u=((s&7)<<18|(i&63)<<12|(o&63)<<6|c&63)-65536;e[r++]=String.fromCharCode(55296+(u>>10)),e[r++]=String.fromCharCode(56320+(u&1023))}else{const i=n[t++],o=n[t++];e[r++]=String.fromCharCode((s&15)<<12|(i&63)<<6|o&63)}}return e.join("")},ol={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<n.length;s+=3){const i=n[s],o=s+1<n.length,c=o?n[s+1]:0,u=s+2<n.length,l=u?n[s+2]:0,d=i>>2,p=(i&3)<<4|c>>4;let m=(c&15)<<2|l>>6,T=l&63;u||(T=64,o||(m=64)),r.push(t[d],t[p],t[m],t[T])}return r.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(bm(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):YE(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<n.length;){const i=t[n.charAt(s++)],c=s<n.length?t[n.charAt(s)]:0;++s;const l=s<n.length?t[n.charAt(s)]:64;++s;const p=s<n.length?t[n.charAt(s)]:64;if(++s,i==null||c==null||l==null||p==null)throw new XE;const m=i<<2|c>>4;if(r.push(m),l!==64){const T=c<<4&240|l>>2;if(r.push(T),p!==64){const C=l<<6&192|p;r.push(C)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class XE extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const ZE=function(n){const e=bm(n);return ol.encodeByteArray(e,!0)},Jo=function(n){return ZE(n).replace(/\./g,"")},Sm=function(n){try{return ol.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
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
 */function al(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const ew=()=>al().__FIREBASE_DEFAULTS__,tw=()=>{if(typeof process>"u"||typeof Wd>"u")return;const n=Wd.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},nw=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=n&&Sm(n[1]);return e&&JSON.parse(e)},Sa=()=>{try{return JE()||ew()||tw()||nw()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},Pm=n=>{var e,t;return(t=(e=Sa())==null?void 0:e.emulatorHosts)==null?void 0:t[n]},Cm=n=>{const e=Pm(n);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),r]:[e.substring(0,t),r]},km=()=>{var n;return(n=Sa())==null?void 0:n.config},Nm=n=>{var e;return(e=Sa())==null?void 0:e[`_${n}`]};/**
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
 */class pi{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,r))}}}/**
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
 */function At(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Mi(n){return(await fetch(n,{credentials:"include"})).ok}/**
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
 */function Dm(n,e){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},r=e||"demo-project",s=n.iat||0,i=n.sub||n.user_id;if(!i)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${r}`,aud:r,iat:s,exp:s+3600,auth_time:s,sub:i,user_id:i,firebase:{sign_in_provider:"custom",identities:{}},...n};return[Jo(JSON.stringify(t)),Jo(JSON.stringify(o)),""].join(".")}const ei={};function rw(){const n={prod:[],emulator:[]};for(const e of Object.keys(ei))ei[e]?n.emulator.push(e):n.prod.push(e);return n}function sw(n){let e=document.getElementById(n),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",n),t=!0),{created:t,element:e}}let Kd=!1;function Pa(n,e){if(typeof window>"u"||typeof document>"u"||!At(window.location.host)||ei[n]===e||ei[n]||Kd)return;ei[n]=e;function t(m){return`__firebase__banner__${m}`}const r="__firebase__banner",i=rw().prod.length>0;function o(){const m=document.getElementById(r);m&&m.remove()}function c(m){m.style.display="flex",m.style.background="#7faaf0",m.style.position="fixed",m.style.bottom="5px",m.style.left="5px",m.style.padding=".5em",m.style.borderRadius="5px",m.style.alignItems="center"}function u(m,T){m.setAttribute("width","24"),m.setAttribute("id",T),m.setAttribute("height","24"),m.setAttribute("viewBox","0 0 24 24"),m.setAttribute("fill","none"),m.style.marginLeft="-6px"}function l(){const m=document.createElement("span");return m.style.cursor="pointer",m.style.marginLeft="16px",m.style.fontSize="24px",m.innerHTML=" &times;",m.onclick=()=>{Kd=!0,o()},m}function d(m,T){m.setAttribute("id",T),m.innerText="Learn more",m.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",m.setAttribute("target","__blank"),m.style.paddingLeft="5px",m.style.textDecoration="underline"}function p(){const m=sw(r),T=t("text"),C=document.getElementById(T)||document.createElement("span"),N=t("learnmore"),k=document.getElementById(N)||document.createElement("a"),H=t("preprendIcon"),$=document.getElementById(H)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(m.created){const U=m.element;c(U),d(k,N);const G=l();u($,H),U.append($,C,k,G),document.body.appendChild(U)}i?(C.innerText="Preview backend disconnected.",$.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):($.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,C.innerText="Preview backend running in this workspace."),C.setAttribute("id",T)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",p):p()}/**
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
 */function Pe(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function iw(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Pe())}function Vm(){var e;const n=(e=Sa())==null?void 0:e.forceEnvironment;if(n==="node")return!0;if(n==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function ow(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function aw(){const n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function cw(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function uw(){const n=Pe();return n.indexOf("MSIE ")>=0||n.indexOf("Trident/")>=0}function Om(){return!Vm()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function xm(){return!Vm()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Li(){try{return typeof indexedDB=="object"}catch{return!1}}function Mm(){return new Promise((n,e)=>{try{let t=!0;const r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),t||self.indexedDB.deleteDatabase(r),n(!0)},s.onupgradeneeded=()=>{t=!1},s.onerror=()=>{var i;e(((i=s.error)==null?void 0:i.message)||"")}}catch(t){e(t)}})}function lw(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
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
 */const hw="FirebaseError";class It extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name=hw,Object.setPrototypeOf(this,It.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Vn.prototype.create)}}class Vn{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r}create(e,...t){const r=t[0]||{},s=`${this.service}/${e}`,i=this.errors[e],o=i?dw(i,r):"Error",c=`${this.serviceName}: ${o} (${s}).`;return new It(s,c,r)}}function dw(n,e){return n.replace(fw,(t,r)=>{const s=e[r];return s!=null?String(s):`<${r}?>`})}const fw=/\{\$([^}]+)}/g;function pw(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function Sn(n,e){if(n===e)return!0;const t=Object.keys(n),r=Object.keys(e);for(const s of t){if(!r.includes(s))return!1;const i=n[s],o=e[s];if(Qd(i)&&Qd(o)){if(!Sn(i,o))return!1}else if(i!==o)return!1}for(const s of r)if(!t.includes(s))return!1;return!0}function Qd(n){return n!==null&&typeof n=="object"}/**
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
 */function ls(n){const e=[];for(const[t,r]of Object.entries(n))Array.isArray(r)?r.forEach(s=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(s))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function zs(n){const e={};return n.replace(/^\?/,"").split("&").forEach(r=>{if(r){const[s,i]=r.split("=");e[decodeURIComponent(s)]=decodeURIComponent(i)}}),e}function Ws(n){const e=n.indexOf("?");if(!e)return"";const t=n.indexOf("#",e);return n.substring(e,t>0?t:void 0)}function mw(n,e){const t=new gw(n,e);return t.subscribe.bind(t)}class gw{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,r){let s;if(e===void 0&&t===void 0&&r===void 0)throw new Error("Missing Observer.");_w(e,["next","error","complete"])?s=e:s={next:e,error:t,complete:r},s.next===void 0&&(s.next=$c),s.error===void 0&&(s.error=$c),s.complete===void 0&&(s.complete=$c);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?s.error(this.finalError):s.complete()}catch{}}),this.observers.push(s),i}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function _w(n,e){if(typeof n!="object"||n===null)return!1;for(const t of e)if(t in n&&typeof n[t]=="function")return!0;return!1}function $c(){}/**
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
 */const yw=1e3,Iw=2,Ew=4*60*60*1e3,ww=.5;function Tw(n,e=yw,t=Iw){const r=e*Math.pow(t,n),s=Math.round(ww*r*(Math.random()-.5)*2);return Math.min(Ew,r+s)}/**
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
 */function q(n){return n&&n._delegate?n._delegate:n}class Ye{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const Hn="[DEFAULT]";/**
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
 */class vw{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const r=new pi;if(this.instancesDeferred.set(t,r),this.isInitialized(t)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:t});s&&r.resolve(s)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),r=(e==null?void 0:e.optional)??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(s){if(r)return null;throw s}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(Rw(e))try{this.getOrInitializeService({instanceIdentifier:Hn})}catch{}for(const[t,r]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(t);try{const i=this.getOrInitializeService({instanceIdentifier:s});r.resolve(i)}catch{}}}}clearInstance(e=Hn){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Hn){return this.instances.has(e)}getOptions(e=Hn){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:r,options:t});for(const[i,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(i);r===c&&o.resolve(s)}return s}onInit(e,t){const r=this.normalizeInstanceIdentifier(t),s=this.onInitCallbacks.get(r)??new Set;s.add(e),this.onInitCallbacks.set(r,s);const i=this.instances.get(r);return i&&e(i,r),()=>{s.delete(e)}}invokeOnInitCallbacks(e,t){const r=this.onInitCallbacks.get(t);if(r)for(const s of r)try{s(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:Aw(e),options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=Hn){return this.component?this.component.multipleInstances?e:Hn:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Aw(n){return n===Hn?void 0:n}function Rw(n){return n.instantiationMode==="EAGER"}/**
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
 */class bw{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new vw(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
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
 */var X;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(X||(X={}));const Sw={debug:X.DEBUG,verbose:X.VERBOSE,info:X.INFO,warn:X.WARN,error:X.ERROR,silent:X.SILENT},Pw=X.INFO,Cw={[X.DEBUG]:"log",[X.VERBOSE]:"log",[X.INFO]:"info",[X.WARN]:"warn",[X.ERROR]:"error"},kw=(n,e,...t)=>{if(e<n.logLevel)return;const r=new Date().toISOString(),s=Cw[e];if(s)console[s](`[${r}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Ca{constructor(e){this.name=e,this._logLevel=Pw,this._logHandler=kw,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in X))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Sw[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,X.DEBUG,...e),this._logHandler(this,X.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,X.VERBOSE,...e),this._logHandler(this,X.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,X.INFO,...e),this._logHandler(this,X.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,X.WARN,...e),this._logHandler(this,X.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,X.ERROR,...e),this._logHandler(this,X.ERROR,...e)}}const Nw=(n,e)=>e.some(t=>n instanceof t);let Jd,Yd;function Dw(){return Jd||(Jd=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Vw(){return Yd||(Yd=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Lm=new WeakMap,Iu=new WeakMap,Um=new WeakMap,jc=new WeakMap,cl=new WeakMap;function Ow(n){const e=new Promise((t,r)=>{const s=()=>{n.removeEventListener("success",i),n.removeEventListener("error",o)},i=()=>{t(Ht(n.result)),s()},o=()=>{r(n.error),s()};n.addEventListener("success",i),n.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&Lm.set(t,n)}).catch(()=>{}),cl.set(e,n),e}function xw(n){if(Iu.has(n))return;const e=new Promise((t,r)=>{const s=()=>{n.removeEventListener("complete",i),n.removeEventListener("error",o),n.removeEventListener("abort",o)},i=()=>{t(),s()},o=()=>{r(n.error||new DOMException("AbortError","AbortError")),s()};n.addEventListener("complete",i),n.addEventListener("error",o),n.addEventListener("abort",o)});Iu.set(n,e)}let Eu={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return Iu.get(n);if(e==="objectStoreNames")return n.objectStoreNames||Um.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return Ht(n[e])},set(n,e,t){return n[e]=t,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function Mw(n){Eu=n(Eu)}function Lw(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const r=n.call(Hc(this),e,...t);return Um.set(r,e.sort?e.sort():[e]),Ht(r)}:Vw().includes(n)?function(...e){return n.apply(Hc(this),e),Ht(Lm.get(this))}:function(...e){return Ht(n.apply(Hc(this),e))}}function Uw(n){return typeof n=="function"?Lw(n):(n instanceof IDBTransaction&&xw(n),Nw(n,Dw())?new Proxy(n,Eu):n)}function Ht(n){if(n instanceof IDBRequest)return Ow(n);if(jc.has(n))return jc.get(n);const e=Uw(n);return e!==n&&(jc.set(n,e),cl.set(e,n)),e}const Hc=n=>cl.get(n);function ka(n,e,{blocked:t,upgrade:r,blocking:s,terminated:i}={}){const o=indexedDB.open(n,e),c=Ht(o);return r&&o.addEventListener("upgradeneeded",u=>{r(Ht(o.result),u.oldVersion,u.newVersion,Ht(o.transaction),u)}),t&&o.addEventListener("blocked",u=>t(u.oldVersion,u.newVersion,u)),c.then(u=>{i&&u.addEventListener("close",()=>i()),s&&u.addEventListener("versionchange",l=>s(l.oldVersion,l.newVersion,l))}).catch(()=>{}),c}function Gc(n,{blocked:e}={}){const t=indexedDB.deleteDatabase(n);return e&&t.addEventListener("blocked",r=>e(r.oldVersion,r)),Ht(t).then(()=>{})}const Fw=["get","getKey","getAll","getAllKeys","count"],Bw=["put","add","delete","clear"],zc=new Map;function Xd(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(zc.get(e))return zc.get(e);const t=e.replace(/FromIndex$/,""),r=e!==t,s=Bw.includes(t);if(!(t in(r?IDBIndex:IDBObjectStore).prototype)||!(s||Fw.includes(t)))return;const i=async function(o,...c){const u=this.transaction(o,s?"readwrite":"readonly");let l=u.store;return r&&(l=l.index(c.shift())),(await Promise.all([l[t](...c),s&&u.done]))[0]};return zc.set(e,i),i}Mw(n=>({...n,get:(e,t,r)=>Xd(e,t)||n.get(e,t,r),has:(e,t)=>!!Xd(e,t)||n.has(e,t)}));/**
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
 */class qw{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if($w(t)){const r=t.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(t=>t).join(" ")}}function $w(n){const e=n.getComponent();return(e==null?void 0:e.type)==="VERSION"}const wu="@firebase/app",Zd="0.14.7";/**
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
 */const zt=new Ca("@firebase/app"),jw="@firebase/app-compat",Hw="@firebase/analytics-compat",Gw="@firebase/analytics",zw="@firebase/app-check-compat",Ww="@firebase/app-check",Kw="@firebase/auth",Qw="@firebase/auth-compat",Jw="@firebase/database",Yw="@firebase/data-connect",Xw="@firebase/database-compat",Zw="@firebase/functions",eT="@firebase/functions-compat",tT="@firebase/installations",nT="@firebase/installations-compat",rT="@firebase/messaging",sT="@firebase/messaging-compat",iT="@firebase/performance",oT="@firebase/performance-compat",aT="@firebase/remote-config",cT="@firebase/remote-config-compat",uT="@firebase/storage",lT="@firebase/storage-compat",hT="@firebase/firestore",dT="@firebase/ai",fT="@firebase/firestore-compat",pT="firebase",mT="12.8.0";/**
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
 */const Tu="[DEFAULT]",gT={[wu]:"fire-core",[jw]:"fire-core-compat",[Gw]:"fire-analytics",[Hw]:"fire-analytics-compat",[Ww]:"fire-app-check",[zw]:"fire-app-check-compat",[Kw]:"fire-auth",[Qw]:"fire-auth-compat",[Jw]:"fire-rtdb",[Yw]:"fire-data-connect",[Xw]:"fire-rtdb-compat",[Zw]:"fire-fn",[eT]:"fire-fn-compat",[tT]:"fire-iid",[nT]:"fire-iid-compat",[rT]:"fire-fcm",[sT]:"fire-fcm-compat",[iT]:"fire-perf",[oT]:"fire-perf-compat",[aT]:"fire-rc",[cT]:"fire-rc-compat",[uT]:"fire-gcs",[lT]:"fire-gcs-compat",[hT]:"fire-fst",[fT]:"fire-fst-compat",[dT]:"fire-vertex","fire-js":"fire-js",[pT]:"fire-js-all"};/**
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
 */const Yo=new Map,_T=new Map,vu=new Map;function ef(n,e){try{n.container.addComponent(e)}catch(t){zt.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function rt(n){const e=n.name;if(vu.has(e))return zt.debug(`There were multiple attempts to register component ${e}.`),!1;vu.set(e,n);for(const t of Yo.values())ef(t,n);for(const t of _T.values())ef(t,n);return!0}function Ut(n,e){const t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}function ye(n){return n==null?!1:n.settings!==void 0}/**
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
 */const yT={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},En=new Vn("app","Firebase",yT);/**
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
 */class IT{constructor(e,t,r){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new Ye("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw En.create("app-deleted",{appName:this._name})}}/**
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
 */const gr=mT;function ET(n,e={}){let t=n;typeof e!="object"&&(e={name:e});const r={name:Tu,automaticDataCollectionEnabled:!0,...e},s=r.name;if(typeof s!="string"||!s)throw En.create("bad-app-name",{appName:String(s)});if(t||(t=km()),!t)throw En.create("no-options");const i=Yo.get(s);if(i){if(Sn(t,i.options)&&Sn(r,i.config))return i;throw En.create("duplicate-app",{appName:s})}const o=new bw(s);for(const u of vu.values())o.addComponent(u);const c=new IT(t,r,o);return Yo.set(s,c),c}function Ui(n=Tu){const e=Yo.get(n);if(!e&&n===Tu&&km())return ET();if(!e)throw En.create("no-app",{appName:n});return e}function Fe(n,e,t){let r=gT[n]??n;t&&(r+=`-${t}`);const s=r.match(/\s|\//),i=e.match(/\s|\//);if(s||i){const o=[`Unable to register library "${r}" with version "${e}":`];s&&o.push(`library name "${r}" contains illegal characters (whitespace or "/")`),s&&i&&o.push("and"),i&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),zt.warn(o.join(" "));return}rt(new Ye(`${r}-version`,()=>({library:r,version:e}),"VERSION"))}/**
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
 */const wT="firebase-heartbeat-database",TT=1,mi="firebase-heartbeat-store";let Wc=null;function Fm(){return Wc||(Wc=ka(wT,TT,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(mi)}catch(t){console.warn(t)}}}}).catch(n=>{throw En.create("idb-open",{originalErrorMessage:n.message})})),Wc}async function vT(n){try{const t=(await Fm()).transaction(mi),r=await t.objectStore(mi).get(Bm(n));return await t.done,r}catch(e){if(e instanceof It)zt.warn(e.message);else{const t=En.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});zt.warn(t.message)}}}async function tf(n,e){try{const r=(await Fm()).transaction(mi,"readwrite");await r.objectStore(mi).put(e,Bm(n)),await r.done}catch(t){if(t instanceof It)zt.warn(t.message);else{const r=En.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});zt.warn(r.message)}}}function Bm(n){return`${n.name}!${n.options.appId}`}/**
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
 */const AT=1024,RT=30;class bT{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new PT(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,t;try{const s=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),i=nf();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===i||this._heartbeatsCache.heartbeats.some(o=>o.date===i))return;if(this._heartbeatsCache.heartbeats.push({date:i,agent:s}),this._heartbeatsCache.heartbeats.length>RT){const o=CT(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){zt.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=nf(),{heartbeatsToSend:r,unsentEntries:s}=ST(this._heartbeatsCache.heartbeats),i=Jo(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=t,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),i}catch(t){return zt.warn(t),""}}}function nf(){return new Date().toISOString().substring(0,10)}function ST(n,e=AT){const t=[];let r=n.slice();for(const s of n){const i=t.find(o=>o.agent===s.agent);if(i){if(i.dates.push(s.date),rf(t)>e){i.dates.pop();break}}else if(t.push({agent:s.agent,dates:[s.date]}),rf(t)>e){t.pop();break}r=r.slice(1)}return{heartbeatsToSend:t,unsentEntries:r}}class PT{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Li()?Mm().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await vT(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return tf(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return tf(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...e.heartbeats]})}else return}}function rf(n){return Jo(JSON.stringify({version:2,heartbeats:n})).length}function CT(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let r=1;r<n.length;r++)n[r].date<t&&(t=n[r].date,e=r);return e}/**
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
 */function kT(n){rt(new Ye("platform-logger",e=>new qw(e),"PRIVATE")),rt(new Ye("heartbeat",e=>new bT(e),"PRIVATE")),Fe(wu,Zd,n),Fe(wu,Zd,"esm2020"),Fe("fire-js","")}kT("");var sf=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var wn,qm;(function(){var n;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(E,_){function I(){}I.prototype=_.prototype,E.F=_.prototype,E.prototype=new I,E.prototype.constructor=E,E.D=function(v,w,R){for(var y=Array(arguments.length-2),Re=2;Re<arguments.length;Re++)y[Re-2]=arguments[Re];return _.prototype[w].apply(v,y)}}function t(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(r,t),r.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function s(E,_,I){I||(I=0);const v=Array(16);if(typeof _=="string")for(var w=0;w<16;++w)v[w]=_.charCodeAt(I++)|_.charCodeAt(I++)<<8|_.charCodeAt(I++)<<16|_.charCodeAt(I++)<<24;else for(w=0;w<16;++w)v[w]=_[I++]|_[I++]<<8|_[I++]<<16|_[I++]<<24;_=E.g[0],I=E.g[1],w=E.g[2];let R=E.g[3],y;y=_+(R^I&(w^R))+v[0]+3614090360&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(w^_&(I^w))+v[1]+3905402710&4294967295,R=_+(y<<12&4294967295|y>>>20),y=w+(I^R&(_^I))+v[2]+606105819&4294967295,w=R+(y<<17&4294967295|y>>>15),y=I+(_^w&(R^_))+v[3]+3250441966&4294967295,I=w+(y<<22&4294967295|y>>>10),y=_+(R^I&(w^R))+v[4]+4118548399&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(w^_&(I^w))+v[5]+1200080426&4294967295,R=_+(y<<12&4294967295|y>>>20),y=w+(I^R&(_^I))+v[6]+2821735955&4294967295,w=R+(y<<17&4294967295|y>>>15),y=I+(_^w&(R^_))+v[7]+4249261313&4294967295,I=w+(y<<22&4294967295|y>>>10),y=_+(R^I&(w^R))+v[8]+1770035416&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(w^_&(I^w))+v[9]+2336552879&4294967295,R=_+(y<<12&4294967295|y>>>20),y=w+(I^R&(_^I))+v[10]+4294925233&4294967295,w=R+(y<<17&4294967295|y>>>15),y=I+(_^w&(R^_))+v[11]+2304563134&4294967295,I=w+(y<<22&4294967295|y>>>10),y=_+(R^I&(w^R))+v[12]+1804603682&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(w^_&(I^w))+v[13]+4254626195&4294967295,R=_+(y<<12&4294967295|y>>>20),y=w+(I^R&(_^I))+v[14]+2792965006&4294967295,w=R+(y<<17&4294967295|y>>>15),y=I+(_^w&(R^_))+v[15]+1236535329&4294967295,I=w+(y<<22&4294967295|y>>>10),y=_+(w^R&(I^w))+v[1]+4129170786&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^w&(_^I))+v[6]+3225465664&4294967295,R=_+(y<<9&4294967295|y>>>23),y=w+(_^I&(R^_))+v[11]+643717713&4294967295,w=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(w^R))+v[0]+3921069994&4294967295,I=w+(y<<20&4294967295|y>>>12),y=_+(w^R&(I^w))+v[5]+3593408605&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^w&(_^I))+v[10]+38016083&4294967295,R=_+(y<<9&4294967295|y>>>23),y=w+(_^I&(R^_))+v[15]+3634488961&4294967295,w=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(w^R))+v[4]+3889429448&4294967295,I=w+(y<<20&4294967295|y>>>12),y=_+(w^R&(I^w))+v[9]+568446438&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^w&(_^I))+v[14]+3275163606&4294967295,R=_+(y<<9&4294967295|y>>>23),y=w+(_^I&(R^_))+v[3]+4107603335&4294967295,w=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(w^R))+v[8]+1163531501&4294967295,I=w+(y<<20&4294967295|y>>>12),y=_+(w^R&(I^w))+v[13]+2850285829&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^w&(_^I))+v[2]+4243563512&4294967295,R=_+(y<<9&4294967295|y>>>23),y=w+(_^I&(R^_))+v[7]+1735328473&4294967295,w=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(w^R))+v[12]+2368359562&4294967295,I=w+(y<<20&4294967295|y>>>12),y=_+(I^w^R)+v[5]+4294588738&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^w)+v[8]+2272392833&4294967295,R=_+(y<<11&4294967295|y>>>21),y=w+(R^_^I)+v[11]+1839030562&4294967295,w=R+(y<<16&4294967295|y>>>16),y=I+(w^R^_)+v[14]+4259657740&4294967295,I=w+(y<<23&4294967295|y>>>9),y=_+(I^w^R)+v[1]+2763975236&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^w)+v[4]+1272893353&4294967295,R=_+(y<<11&4294967295|y>>>21),y=w+(R^_^I)+v[7]+4139469664&4294967295,w=R+(y<<16&4294967295|y>>>16),y=I+(w^R^_)+v[10]+3200236656&4294967295,I=w+(y<<23&4294967295|y>>>9),y=_+(I^w^R)+v[13]+681279174&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^w)+v[0]+3936430074&4294967295,R=_+(y<<11&4294967295|y>>>21),y=w+(R^_^I)+v[3]+3572445317&4294967295,w=R+(y<<16&4294967295|y>>>16),y=I+(w^R^_)+v[6]+76029189&4294967295,I=w+(y<<23&4294967295|y>>>9),y=_+(I^w^R)+v[9]+3654602809&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^w)+v[12]+3873151461&4294967295,R=_+(y<<11&4294967295|y>>>21),y=w+(R^_^I)+v[15]+530742520&4294967295,w=R+(y<<16&4294967295|y>>>16),y=I+(w^R^_)+v[2]+3299628645&4294967295,I=w+(y<<23&4294967295|y>>>9),y=_+(w^(I|~R))+v[0]+4096336452&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~w))+v[7]+1126891415&4294967295,R=_+(y<<10&4294967295|y>>>22),y=w+(_^(R|~I))+v[14]+2878612391&4294967295,w=R+(y<<15&4294967295|y>>>17),y=I+(R^(w|~_))+v[5]+4237533241&4294967295,I=w+(y<<21&4294967295|y>>>11),y=_+(w^(I|~R))+v[12]+1700485571&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~w))+v[3]+2399980690&4294967295,R=_+(y<<10&4294967295|y>>>22),y=w+(_^(R|~I))+v[10]+4293915773&4294967295,w=R+(y<<15&4294967295|y>>>17),y=I+(R^(w|~_))+v[1]+2240044497&4294967295,I=w+(y<<21&4294967295|y>>>11),y=_+(w^(I|~R))+v[8]+1873313359&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~w))+v[15]+4264355552&4294967295,R=_+(y<<10&4294967295|y>>>22),y=w+(_^(R|~I))+v[6]+2734768916&4294967295,w=R+(y<<15&4294967295|y>>>17),y=I+(R^(w|~_))+v[13]+1309151649&4294967295,I=w+(y<<21&4294967295|y>>>11),y=_+(w^(I|~R))+v[4]+4149444226&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~w))+v[11]+3174756917&4294967295,R=_+(y<<10&4294967295|y>>>22),y=w+(_^(R|~I))+v[2]+718787259&4294967295,w=R+(y<<15&4294967295|y>>>17),y=I+(R^(w|~_))+v[9]+3951481745&4294967295,E.g[0]=E.g[0]+_&4294967295,E.g[1]=E.g[1]+(w+(y<<21&4294967295|y>>>11))&4294967295,E.g[2]=E.g[2]+w&4294967295,E.g[3]=E.g[3]+R&4294967295}r.prototype.v=function(E,_){_===void 0&&(_=E.length);const I=_-this.blockSize,v=this.C;let w=this.h,R=0;for(;R<_;){if(w==0)for(;R<=I;)s(this,E,R),R+=this.blockSize;if(typeof E=="string"){for(;R<_;)if(v[w++]=E.charCodeAt(R++),w==this.blockSize){s(this,v),w=0;break}}else for(;R<_;)if(v[w++]=E[R++],w==this.blockSize){s(this,v),w=0;break}}this.h=w,this.o+=_},r.prototype.A=function(){var E=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);E[0]=128;for(var _=1;_<E.length-8;++_)E[_]=0;_=this.o*8;for(var I=E.length-8;I<E.length;++I)E[I]=_&255,_/=256;for(this.v(E),E=Array(16),_=0,I=0;I<4;++I)for(let v=0;v<32;v+=8)E[_++]=this.g[I]>>>v&255;return E};function i(E,_){var I=c;return Object.prototype.hasOwnProperty.call(I,E)?I[E]:I[E]=_(E)}function o(E,_){this.h=_;const I=[];let v=!0;for(let w=E.length-1;w>=0;w--){const R=E[w]|0;v&&R==_||(I[w]=R,v=!1)}this.g=I}var c={};function u(E){return-128<=E&&E<128?i(E,function(_){return new o([_|0],_<0?-1:0)}):new o([E|0],E<0?-1:0)}function l(E){if(isNaN(E)||!isFinite(E))return p;if(E<0)return k(l(-E));const _=[];let I=1;for(let v=0;E>=I;v++)_[v]=E/I|0,I*=4294967296;return new o(_,0)}function d(E,_){if(E.length==0)throw Error("number format error: empty string");if(_=_||10,_<2||36<_)throw Error("radix out of range: "+_);if(E.charAt(0)=="-")return k(d(E.substring(1),_));if(E.indexOf("-")>=0)throw Error('number format error: interior "-" character');const I=l(Math.pow(_,8));let v=p;for(let R=0;R<E.length;R+=8){var w=Math.min(8,E.length-R);const y=parseInt(E.substring(R,R+w),_);w<8?(w=l(Math.pow(_,w)),v=v.j(w).add(l(y))):(v=v.j(I),v=v.add(l(y)))}return v}var p=u(0),m=u(1),T=u(16777216);n=o.prototype,n.m=function(){if(N(this))return-k(this).m();let E=0,_=1;for(let I=0;I<this.g.length;I++){const v=this.i(I);E+=(v>=0?v:4294967296+v)*_,_*=4294967296}return E},n.toString=function(E){if(E=E||10,E<2||36<E)throw Error("radix out of range: "+E);if(C(this))return"0";if(N(this))return"-"+k(this).toString(E);const _=l(Math.pow(E,6));var I=this;let v="";for(;;){const w=G(I,_).g;I=H(I,w.j(_));let R=((I.g.length>0?I.g[0]:I.h)>>>0).toString(E);if(I=w,C(I))return R+v;for(;R.length<6;)R="0"+R;v=R+v}},n.i=function(E){return E<0?0:E<this.g.length?this.g[E]:this.h};function C(E){if(E.h!=0)return!1;for(let _=0;_<E.g.length;_++)if(E.g[_]!=0)return!1;return!0}function N(E){return E.h==-1}n.l=function(E){return E=H(this,E),N(E)?-1:C(E)?0:1};function k(E){const _=E.g.length,I=[];for(let v=0;v<_;v++)I[v]=~E.g[v];return new o(I,~E.h).add(m)}n.abs=function(){return N(this)?k(this):this},n.add=function(E){const _=Math.max(this.g.length,E.g.length),I=[];let v=0;for(let w=0;w<=_;w++){let R=v+(this.i(w)&65535)+(E.i(w)&65535),y=(R>>>16)+(this.i(w)>>>16)+(E.i(w)>>>16);v=y>>>16,R&=65535,y&=65535,I[w]=y<<16|R}return new o(I,I[I.length-1]&-2147483648?-1:0)};function H(E,_){return E.add(k(_))}n.j=function(E){if(C(this)||C(E))return p;if(N(this))return N(E)?k(this).j(k(E)):k(k(this).j(E));if(N(E))return k(this.j(k(E)));if(this.l(T)<0&&E.l(T)<0)return l(this.m()*E.m());const _=this.g.length+E.g.length,I=[];for(var v=0;v<2*_;v++)I[v]=0;for(v=0;v<this.g.length;v++)for(let w=0;w<E.g.length;w++){const R=this.i(v)>>>16,y=this.i(v)&65535,Re=E.i(w)>>>16,dt=E.i(w)&65535;I[2*v+2*w]+=y*dt,$(I,2*v+2*w),I[2*v+2*w+1]+=R*dt,$(I,2*v+2*w+1),I[2*v+2*w+1]+=y*Re,$(I,2*v+2*w+1),I[2*v+2*w+2]+=R*Re,$(I,2*v+2*w+2)}for(E=0;E<_;E++)I[E]=I[2*E+1]<<16|I[2*E];for(E=_;E<2*_;E++)I[E]=0;return new o(I,0)};function $(E,_){for(;(E[_]&65535)!=E[_];)E[_+1]+=E[_]>>>16,E[_]&=65535,_++}function U(E,_){this.g=E,this.h=_}function G(E,_){if(C(_))throw Error("division by zero");if(C(E))return new U(p,p);if(N(E))return _=G(k(E),_),new U(k(_.g),k(_.h));if(N(_))return _=G(E,k(_)),new U(k(_.g),_.h);if(E.g.length>30){if(N(E)||N(_))throw Error("slowDivide_ only works with positive integers.");for(var I=m,v=_;v.l(E)<=0;)I=K(I),v=K(v);var w=W(I,1),R=W(v,1);for(v=W(v,2),I=W(I,2);!C(v);){var y=R.add(v);y.l(E)<=0&&(w=w.add(I),R=y),v=W(v,1),I=W(I,1)}return _=H(E,w.j(_)),new U(w,_)}for(w=p;E.l(_)>=0;){for(I=Math.max(1,Math.floor(E.m()/_.m())),v=Math.ceil(Math.log(I)/Math.LN2),v=v<=48?1:Math.pow(2,v-48),R=l(I),y=R.j(_);N(y)||y.l(E)>0;)I-=v,R=l(I),y=R.j(_);C(R)&&(R=m),w=w.add(R),E=H(E,y)}return new U(w,E)}n.B=function(E){return G(this,E).h},n.and=function(E){const _=Math.max(this.g.length,E.g.length),I=[];for(let v=0;v<_;v++)I[v]=this.i(v)&E.i(v);return new o(I,this.h&E.h)},n.or=function(E){const _=Math.max(this.g.length,E.g.length),I=[];for(let v=0;v<_;v++)I[v]=this.i(v)|E.i(v);return new o(I,this.h|E.h)},n.xor=function(E){const _=Math.max(this.g.length,E.g.length),I=[];for(let v=0;v<_;v++)I[v]=this.i(v)^E.i(v);return new o(I,this.h^E.h)};function K(E){const _=E.g.length+1,I=[];for(let v=0;v<_;v++)I[v]=E.i(v)<<1|E.i(v-1)>>>31;return new o(I,E.h)}function W(E,_){const I=_>>5;_%=32;const v=E.g.length-I,w=[];for(let R=0;R<v;R++)w[R]=_>0?E.i(R+I)>>>_|E.i(R+I+1)<<32-_:E.i(R+I);return new o(w,E.h)}r.prototype.digest=r.prototype.A,r.prototype.reset=r.prototype.u,r.prototype.update=r.prototype.v,qm=r,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=l,o.fromString=d,wn=o}).apply(typeof sf<"u"?sf:typeof self<"u"?self:typeof window<"u"?window:{});var wo=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var $m,Ks,jm,Oo,Au,Hm,Gm,zm;(function(){var n,e=Object.defineProperty;function t(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof wo=="object"&&wo];for(var h=0;h<a.length;++h){var f=a[h];if(f&&f.Math==Math)return f}throw Error("Cannot find global object")}var r=t(this);function s(a,h){if(h)e:{var f=r;a=a.split(".");for(var g=0;g<a.length-1;g++){var b=a[g];if(!(b in f))break e;f=f[b]}a=a[a.length-1],g=f[a],h=h(g),h!=g&&h!=null&&e(f,a,{configurable:!0,writable:!0,value:h})}}s("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),s("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),s("Object.entries",function(a){return a||function(h){var f=[],g;for(g in h)Object.prototype.hasOwnProperty.call(h,g)&&f.push([g,h[g]]);return f}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var i=i||{},o=this||self;function c(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function u(a,h,f){return a.call.apply(a.bind,arguments)}function l(a,h,f){return l=u,l.apply(null,arguments)}function d(a,h){var f=Array.prototype.slice.call(arguments,1);return function(){var g=f.slice();return g.push.apply(g,arguments),a.apply(this,g)}}function p(a,h){function f(){}f.prototype=h.prototype,a.Z=h.prototype,a.prototype=new f,a.prototype.constructor=a,a.Ob=function(g,b,P){for(var O=Array(arguments.length-2),Q=2;Q<arguments.length;Q++)O[Q-2]=arguments[Q];return h.prototype[b].apply(g,O)}}var m=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function T(a){const h=a.length;if(h>0){const f=Array(h);for(let g=0;g<h;g++)f[g]=a[g];return f}return[]}function C(a,h){for(let g=1;g<arguments.length;g++){const b=arguments[g];var f=typeof b;if(f=f!="object"?f:b?Array.isArray(b)?"array":f:"null",f=="array"||f=="object"&&typeof b.length=="number"){f=a.length||0;const P=b.length||0;a.length=f+P;for(let O=0;O<P;O++)a[f+O]=b[O]}else a.push(b)}}class N{constructor(h,f){this.i=h,this.j=f,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function k(a){o.setTimeout(()=>{throw a},0)}function H(){var a=E;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class ${constructor(){this.h=this.g=null}add(h,f){const g=U.get();g.set(h,f),this.h?this.h.next=g:this.g=g,this.h=g}}var U=new N(()=>new G,a=>a.reset());class G{constructor(){this.next=this.g=this.h=null}set(h,f){this.h=h,this.g=f,this.next=null}reset(){this.next=this.g=this.h=null}}let K,W=!1,E=new $,_=()=>{const a=Promise.resolve(void 0);K=()=>{a.then(I)}};function I(){for(var a;a=H();){try{a.h.call(a.g)}catch(f){k(f)}var h=U;h.j(a),h.h<100&&(h.h++,a.next=h.g,h.g=a)}W=!1}function v(){this.u=this.u,this.C=this.C}v.prototype.u=!1,v.prototype.dispose=function(){this.u||(this.u=!0,this.N())},v.prototype[Symbol.dispose]=function(){this.dispose()},v.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function w(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}w.prototype.h=function(){this.defaultPrevented=!0};var R=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const f=()=>{};o.addEventListener("test",f,h),o.removeEventListener("test",f,h)}catch{}return a}();function y(a){return/^[\s\xa0]*$/.test(a)}function Re(a,h){w.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,h)}p(Re,w),Re.prototype.init=function(a,h){const f=this.type=a.type,g=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget,h||(f=="mouseover"?h=a.fromElement:f=="mouseout"&&(h=a.toElement)),this.relatedTarget=h,g?(this.clientX=g.clientX!==void 0?g.clientX:g.pageX,this.clientY=g.clientY!==void 0?g.clientY:g.pageY,this.screenX=g.screenX||0,this.screenY=g.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&Re.Z.h.call(this)},Re.prototype.h=function(){Re.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var dt="closure_listenable_"+(Math.random()*1e6|0),gE=0;function _E(a,h,f,g,b){this.listener=a,this.proxy=null,this.src=h,this.type=f,this.capture=!!g,this.ha=b,this.key=++gE,this.da=this.fa=!1}function io(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function oo(a,h,f){for(const g in a)h.call(f,a[g],g,a)}function yE(a,h){for(const f in a)h.call(void 0,a[f],f,a)}function Gh(a){const h={};for(const f in a)h[f]=a[f];return h}const zh="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Wh(a,h){let f,g;for(let b=1;b<arguments.length;b++){g=arguments[b];for(f in g)a[f]=g[f];for(let P=0;P<zh.length;P++)f=zh[P],Object.prototype.hasOwnProperty.call(g,f)&&(a[f]=g[f])}}function ao(a){this.src=a,this.g={},this.h=0}ao.prototype.add=function(a,h,f,g,b){const P=a.toString();a=this.g[P],a||(a=this.g[P]=[],this.h++);const O=Ic(a,h,g,b);return O>-1?(h=a[O],f||(h.fa=!1)):(h=new _E(h,this.src,P,!!g,b),h.fa=f,a.push(h)),h};function yc(a,h){const f=h.type;if(f in a.g){var g=a.g[f],b=Array.prototype.indexOf.call(g,h,void 0),P;(P=b>=0)&&Array.prototype.splice.call(g,b,1),P&&(io(h),a.g[f].length==0&&(delete a.g[f],a.h--))}}function Ic(a,h,f,g){for(let b=0;b<a.length;++b){const P=a[b];if(!P.da&&P.listener==h&&P.capture==!!f&&P.ha==g)return b}return-1}var Ec="closure_lm_"+(Math.random()*1e6|0),wc={};function Kh(a,h,f,g,b){if(Array.isArray(h)){for(let P=0;P<h.length;P++)Kh(a,h[P],f,g,b);return null}return f=Yh(f),a&&a[dt]?a.J(h,f,c(g)?!!g.capture:!1,b):IE(a,h,f,!1,g,b)}function IE(a,h,f,g,b,P){if(!h)throw Error("Invalid event type");const O=c(b)?!!b.capture:!!b;let Q=vc(a);if(Q||(a[Ec]=Q=new ao(a)),f=Q.add(h,f,g,O,P),f.proxy)return f;if(g=EE(),f.proxy=g,g.src=a,g.listener=f,a.addEventListener)R||(b=O),b===void 0&&(b=!1),a.addEventListener(h.toString(),g,b);else if(a.attachEvent)a.attachEvent(Jh(h.toString()),g);else if(a.addListener&&a.removeListener)a.addListener(g);else throw Error("addEventListener and attachEvent are unavailable.");return f}function EE(){function a(f){return h.call(a.src,a.listener,f)}const h=wE;return a}function Qh(a,h,f,g,b){if(Array.isArray(h))for(var P=0;P<h.length;P++)Qh(a,h[P],f,g,b);else g=c(g)?!!g.capture:!!g,f=Yh(f),a&&a[dt]?(a=a.i,P=String(h).toString(),P in a.g&&(h=a.g[P],f=Ic(h,f,g,b),f>-1&&(io(h[f]),Array.prototype.splice.call(h,f,1),h.length==0&&(delete a.g[P],a.h--)))):a&&(a=vc(a))&&(h=a.g[h.toString()],a=-1,h&&(a=Ic(h,f,g,b)),(f=a>-1?h[a]:null)&&Tc(f))}function Tc(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[dt])yc(h.i,a);else{var f=a.type,g=a.proxy;h.removeEventListener?h.removeEventListener(f,g,a.capture):h.detachEvent?h.detachEvent(Jh(f),g):h.addListener&&h.removeListener&&h.removeListener(g),(f=vc(h))?(yc(f,a),f.h==0&&(f.src=null,h[Ec]=null)):io(a)}}}function Jh(a){return a in wc?wc[a]:wc[a]="on"+a}function wE(a,h){if(a.da)a=!0;else{h=new Re(h,this);const f=a.listener,g=a.ha||a.src;a.fa&&Tc(a),a=f.call(g,h)}return a}function vc(a){return a=a[Ec],a instanceof ao?a:null}var Ac="__closure_events_fn_"+(Math.random()*1e9>>>0);function Yh(a){return typeof a=="function"?a:(a[Ac]||(a[Ac]=function(h){return a.handleEvent(h)}),a[Ac])}function qe(){v.call(this),this.i=new ao(this),this.M=this,this.G=null}p(qe,v),qe.prototype[dt]=!0,qe.prototype.removeEventListener=function(a,h,f,g){Qh(this,a,h,f,g)};function ze(a,h){var f,g=a.G;if(g)for(f=[];g;g=g.G)f.push(g);if(a=a.M,g=h.type||h,typeof h=="string")h=new w(h,a);else if(h instanceof w)h.target=h.target||a;else{var b=h;h=new w(g,a),Wh(h,b)}b=!0;let P,O;if(f)for(O=f.length-1;O>=0;O--)P=h.g=f[O],b=co(P,g,!0,h)&&b;if(P=h.g=a,b=co(P,g,!0,h)&&b,b=co(P,g,!1,h)&&b,f)for(O=0;O<f.length;O++)P=h.g=f[O],b=co(P,g,!1,h)&&b}qe.prototype.N=function(){if(qe.Z.N.call(this),this.i){var a=this.i;for(const h in a.g){const f=a.g[h];for(let g=0;g<f.length;g++)io(f[g]);delete a.g[h],a.h--}}this.G=null},qe.prototype.J=function(a,h,f,g){return this.i.add(String(a),h,!1,f,g)},qe.prototype.K=function(a,h,f,g){return this.i.add(String(a),h,!0,f,g)};function co(a,h,f,g){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();let b=!0;for(let P=0;P<h.length;++P){const O=h[P];if(O&&!O.da&&O.capture==f){const Q=O.listener,be=O.ha||O.src;O.fa&&yc(a.i,O),b=Q.call(be,g)!==!1&&b}}return b&&!g.defaultPrevented}function TE(a,h){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=l(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(a,h||0)}function Xh(a){a.g=TE(()=>{a.g=null,a.i&&(a.i=!1,Xh(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class vE extends v{constructor(h,f){super(),this.m=h,this.l=f,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:Xh(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Ts(a){v.call(this),this.h=a,this.g={}}p(Ts,v);var Zh=[];function ed(a){oo(a.g,function(h,f){this.g.hasOwnProperty(f)&&Tc(h)},a),a.g={}}Ts.prototype.N=function(){Ts.Z.N.call(this),ed(this)},Ts.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Rc=o.JSON.stringify,AE=o.JSON.parse,RE=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function td(){}function nd(){}var vs={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function bc(){w.call(this,"d")}p(bc,w);function Sc(){w.call(this,"c")}p(Sc,w);var Un={},rd=null;function uo(){return rd=rd||new qe}Un.Ia="serverreachability";function sd(a){w.call(this,Un.Ia,a)}p(sd,w);function As(a){const h=uo();ze(h,new sd(h))}Un.STAT_EVENT="statevent";function id(a,h){w.call(this,Un.STAT_EVENT,a),this.stat=h}p(id,w);function We(a){const h=uo();ze(h,new id(h,a))}Un.Ja="timingevent";function od(a,h){w.call(this,Un.Ja,a),this.size=h}p(od,w);function Rs(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},h)}function bs(){this.g=!0}bs.prototype.ua=function(){this.g=!1};function bE(a,h,f,g,b,P){a.info(function(){if(a.g)if(P){var O="",Q=P.split("&");for(let oe=0;oe<Q.length;oe++){var be=Q[oe].split("=");if(be.length>1){const De=be[0];be=be[1];const St=De.split("_");O=St.length>=2&&St[1]=="type"?O+(De+"="+be+"&"):O+(De+"=redacted&")}}}else O=null;else O=P;return"XMLHTTP REQ ("+g+") [attempt "+b+"]: "+h+`
`+f+`
`+O})}function SE(a,h,f,g,b,P,O){a.info(function(){return"XMLHTTP RESP ("+g+") [ attempt "+b+"]: "+h+`
`+f+`
`+P+" "+O})}function Er(a,h,f,g){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+CE(a,f)+(g?" "+g:"")})}function PE(a,h){a.info(function(){return"TIMEOUT: "+h})}bs.prototype.info=function(){};function CE(a,h){if(!a.g)return h;if(!h)return null;try{const P=JSON.parse(h);if(P){for(a=0;a<P.length;a++)if(Array.isArray(P[a])){var f=P[a];if(!(f.length<2)){var g=f[1];if(Array.isArray(g)&&!(g.length<1)){var b=g[0];if(b!="noop"&&b!="stop"&&b!="close")for(let O=1;O<g.length;O++)g[O]=""}}}}return Rc(P)}catch{return h}}var lo={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},ad={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},cd;function Pc(){}p(Pc,td),Pc.prototype.g=function(){return new XMLHttpRequest},cd=new Pc;function Ss(a){return encodeURIComponent(String(a))}function kE(a){var h=1;a=a.split(":");const f=[];for(;h>0&&a.length;)f.push(a.shift()),h--;return a.length&&f.push(a.join(":")),f}function nn(a,h,f,g){this.j=a,this.i=h,this.l=f,this.S=g||1,this.V=new Ts(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new ud}function ud(){this.i=null,this.g="",this.h=!1}var ld={},Cc={};function kc(a,h,f){a.M=1,a.A=fo(bt(h)),a.u=f,a.R=!0,hd(a,null)}function hd(a,h){a.F=Date.now(),ho(a),a.B=bt(a.A);var f=a.B,g=a.S;Array.isArray(g)||(g=[String(g)]),Ad(f.i,"t",g),a.C=0,f=a.j.L,a.h=new ud,a.g=$d(a.j,f?h:null,!a.u),a.P>0&&(a.O=new vE(l(a.Y,a,a.g),a.P)),h=a.V,f=a.g,g=a.ba;var b="readystatechange";Array.isArray(b)||(b&&(Zh[0]=b.toString()),b=Zh);for(let P=0;P<b.length;P++){const O=Kh(f,b[P],g||h.handleEvent,!1,h.h||h);if(!O)break;h.g[O.key]=O}h=a.J?Gh(a.J):{},a.u?(a.v||(a.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,h)):(a.v="GET",a.g.ea(a.B,a.v,null,h)),As(),bE(a.i,a.v,a.B,a.l,a.S,a.u)}nn.prototype.ba=function(a){a=a.target;const h=this.O;h&&on(a)==3?h.j():this.Y(a)},nn.prototype.Y=function(a){try{if(a==this.g)e:{const Q=on(this.g),be=this.g.ya(),oe=this.g.ca();if(!(Q<3)&&(Q!=3||this.g&&(this.h.h||this.g.la()||Nd(this.g)))){this.K||Q!=4||be==7||(be==8||oe<=0?As(3):As(2)),Nc(this);var h=this.g.ca();this.X=h;var f=NE(this);if(this.o=h==200,SE(this.i,this.v,this.B,this.l,this.S,Q,h),this.o){if(this.U&&!this.L){t:{if(this.g){var g,b=this.g;if((g=b.g?b.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!y(g)){var P=g;break t}}P=null}if(a=P)Er(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,Dc(this,a);else{this.o=!1,this.m=3,We(12),Fn(this),Ps(this);break e}}if(this.R){a=!0;let De;for(;!this.K&&this.C<f.length;)if(De=DE(this,f),De==Cc){Q==4&&(this.m=4,We(14),a=!1),Er(this.i,this.l,null,"[Incomplete Response]");break}else if(De==ld){this.m=4,We(15),Er(this.i,this.l,f,"[Invalid Chunk]"),a=!1;break}else Er(this.i,this.l,De,null),Dc(this,De);if(dd(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),Q!=4||f.length!=0||this.h.h||(this.m=1,We(16),a=!1),this.o=this.o&&a,!a)Er(this.i,this.l,f,"[Invalid Chunked Response]"),Fn(this),Ps(this);else if(f.length>0&&!this.W){this.W=!0;var O=this.j;O.g==this&&O.aa&&!O.P&&(O.j.info("Great, no buffering proxy detected. Bytes received: "+f.length),Bc(O),O.P=!0,We(11))}}else Er(this.i,this.l,f,null),Dc(this,f);Q==4&&Fn(this),this.o&&!this.K&&(Q==4?Ud(this.j,this):(this.o=!1,ho(this)))}else zE(this.g),h==400&&f.indexOf("Unknown SID")>0?(this.m=3,We(12)):(this.m=0,We(13)),Fn(this),Ps(this)}}}catch{}finally{}};function NE(a){if(!dd(a))return a.g.la();const h=Nd(a.g);if(h==="")return"";let f="";const g=h.length,b=on(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return Fn(a),Ps(a),"";a.h.i=new o.TextDecoder}for(let P=0;P<g;P++)a.h.h=!0,f+=a.h.i.decode(h[P],{stream:!(b&&P==g-1)});return h.length=0,a.h.g+=f,a.C=0,a.h.g}function dd(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function DE(a,h){var f=a.C,g=h.indexOf(`
`,f);return g==-1?Cc:(f=Number(h.substring(f,g)),isNaN(f)?ld:(g+=1,g+f>h.length?Cc:(h=h.slice(g,g+f),a.C=g+f,h)))}nn.prototype.cancel=function(){this.K=!0,Fn(this)};function ho(a){a.T=Date.now()+a.H,fd(a,a.H)}function fd(a,h){if(a.D!=null)throw Error("WatchDog timer not null");a.D=Rs(l(a.aa,a),h)}function Nc(a){a.D&&(o.clearTimeout(a.D),a.D=null)}nn.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?(PE(this.i,this.B),this.M!=2&&(As(),We(17)),Fn(this),this.m=2,Ps(this)):fd(this,this.T-a)};function Ps(a){a.j.I==0||a.K||Ud(a.j,a)}function Fn(a){Nc(a);var h=a.O;h&&typeof h.dispose=="function"&&h.dispose(),a.O=null,ed(a.V),a.g&&(h=a.g,a.g=null,h.abort(),h.dispose())}function Dc(a,h){try{var f=a.j;if(f.I!=0&&(f.g==a||Vc(f.h,a))){if(!a.L&&Vc(f.h,a)&&f.I==3){try{var g=f.Ba.g.parse(h)}catch{g=null}if(Array.isArray(g)&&g.length==3){var b=g;if(b[0]==0){e:if(!f.v){if(f.g)if(f.g.F+3e3<a.F)yo(f),go(f);else break e;Fc(f),We(18)}}else f.xa=b[1],0<f.xa-f.K&&b[2]<37500&&f.F&&f.A==0&&!f.C&&(f.C=Rs(l(f.Va,f),6e3));gd(f.h)<=1&&f.ta&&(f.ta=void 0)}else qn(f,11)}else if((a.L||f.g==a)&&yo(f),!y(h))for(b=f.Ba.g.parse(h),h=0;h<b.length;h++){let oe=b[h];const De=oe[0];if(!(De<=f.K))if(f.K=De,oe=oe[1],f.I==2)if(oe[0]=="c"){f.M=oe[1],f.ba=oe[2];const St=oe[3];St!=null&&(f.ka=St,f.j.info("VER="+f.ka));const $n=oe[4];$n!=null&&(f.za=$n,f.j.info("SVER="+f.za));const an=oe[5];an!=null&&typeof an=="number"&&an>0&&(g=1.5*an,f.O=g,f.j.info("backChannelRequestTimeoutMs_="+g)),g=f;const cn=a.g;if(cn){const Eo=cn.g?cn.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Eo){var P=g.h;P.g||Eo.indexOf("spdy")==-1&&Eo.indexOf("quic")==-1&&Eo.indexOf("h2")==-1||(P.j=P.l,P.g=new Set,P.h&&(Oc(P,P.h),P.h=null))}if(g.G){const qc=cn.g?cn.g.getResponseHeader("X-HTTP-Session-Id"):null;qc&&(g.wa=qc,ue(g.J,g.G,qc))}}f.I=3,f.l&&f.l.ra(),f.aa&&(f.T=Date.now()-a.F,f.j.info("Handshake RTT: "+f.T+"ms")),g=f;var O=a;if(g.na=qd(g,g.L?g.ba:null,g.W),O.L){_d(g.h,O);var Q=O,be=g.O;be&&(Q.H=be),Q.D&&(Nc(Q),ho(Q)),g.g=O}else Md(g);f.i.length>0&&_o(f)}else oe[0]!="stop"&&oe[0]!="close"||qn(f,7);else f.I==3&&(oe[0]=="stop"||oe[0]=="close"?oe[0]=="stop"?qn(f,7):Uc(f):oe[0]!="noop"&&f.l&&f.l.qa(oe),f.A=0)}}As(4)}catch{}}var VE=class{constructor(a,h){this.g=a,this.map=h}};function pd(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function md(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function gd(a){return a.h?1:a.g?a.g.size:0}function Vc(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function Oc(a,h){a.g?a.g.add(h):a.h=h}function _d(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}pd.prototype.cancel=function(){if(this.i=yd(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function yd(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const f of a.g.values())h=h.concat(f.G);return h}return T(a.i)}var Id=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function OE(a,h){if(a){a=a.split("&");for(let f=0;f<a.length;f++){const g=a[f].indexOf("=");let b,P=null;g>=0?(b=a[f].substring(0,g),P=a[f].substring(g+1)):b=a[f],h(b,P?decodeURIComponent(P.replace(/\+/g," ")):"")}}}function rn(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;a instanceof rn?(this.l=a.l,Cs(this,a.j),this.o=a.o,this.g=a.g,ks(this,a.u),this.h=a.h,xc(this,Rd(a.i)),this.m=a.m):a&&(h=String(a).match(Id))?(this.l=!1,Cs(this,h[1]||"",!0),this.o=Ns(h[2]||""),this.g=Ns(h[3]||"",!0),ks(this,h[4]),this.h=Ns(h[5]||"",!0),xc(this,h[6]||"",!0),this.m=Ns(h[7]||"")):(this.l=!1,this.i=new Vs(null,this.l))}rn.prototype.toString=function(){const a=[];var h=this.j;h&&a.push(Ds(h,Ed,!0),":");var f=this.g;return(f||h=="file")&&(a.push("//"),(h=this.o)&&a.push(Ds(h,Ed,!0),"@"),a.push(Ss(f).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),f=this.u,f!=null&&a.push(":",String(f))),(f=this.h)&&(this.g&&f.charAt(0)!="/"&&a.push("/"),a.push(Ds(f,f.charAt(0)=="/"?LE:ME,!0))),(f=this.i.toString())&&a.push("?",f),(f=this.m)&&a.push("#",Ds(f,FE)),a.join("")},rn.prototype.resolve=function(a){const h=bt(this);let f=!!a.j;f?Cs(h,a.j):f=!!a.o,f?h.o=a.o:f=!!a.g,f?h.g=a.g:f=a.u!=null;var g=a.h;if(f)ks(h,a.u);else if(f=!!a.h){if(g.charAt(0)!="/")if(this.g&&!this.h)g="/"+g;else{var b=h.h.lastIndexOf("/");b!=-1&&(g=h.h.slice(0,b+1)+g)}if(b=g,b==".."||b==".")g="";else if(b.indexOf("./")!=-1||b.indexOf("/.")!=-1){g=b.lastIndexOf("/",0)==0,b=b.split("/");const P=[];for(let O=0;O<b.length;){const Q=b[O++];Q=="."?g&&O==b.length&&P.push(""):Q==".."?((P.length>1||P.length==1&&P[0]!="")&&P.pop(),g&&O==b.length&&P.push("")):(P.push(Q),g=!0)}g=P.join("/")}else g=b}return f?h.h=g:f=a.i.toString()!=="",f?xc(h,Rd(a.i)):f=!!a.m,f&&(h.m=a.m),h};function bt(a){return new rn(a)}function Cs(a,h,f){a.j=f?Ns(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function ks(a,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);a.u=h}else a.u=null}function xc(a,h,f){h instanceof Vs?(a.i=h,BE(a.i,a.l)):(f||(h=Ds(h,UE)),a.i=new Vs(h,a.l))}function ue(a,h,f){a.i.set(h,f)}function fo(a){return ue(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function Ns(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function Ds(a,h,f){return typeof a=="string"?(a=encodeURI(a).replace(h,xE),f&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function xE(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var Ed=/[#\/\?@]/g,ME=/[#\?:]/g,LE=/[#\?]/g,UE=/[#\?@]/g,FE=/#/g;function Vs(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function Bn(a){a.g||(a.g=new Map,a.h=0,a.i&&OE(a.i,function(h,f){a.add(decodeURIComponent(h.replace(/\+/g," ")),f)}))}n=Vs.prototype,n.add=function(a,h){Bn(this),this.i=null,a=wr(this,a);let f=this.g.get(a);return f||this.g.set(a,f=[]),f.push(h),this.h+=1,this};function wd(a,h){Bn(a),h=wr(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function Td(a,h){return Bn(a),h=wr(a,h),a.g.has(h)}n.forEach=function(a,h){Bn(this),this.g.forEach(function(f,g){f.forEach(function(b){a.call(h,b,g,this)},this)},this)};function vd(a,h){Bn(a);let f=[];if(typeof h=="string")Td(a,h)&&(f=f.concat(a.g.get(wr(a,h))));else for(a=Array.from(a.g.values()),h=0;h<a.length;h++)f=f.concat(a[h]);return f}n.set=function(a,h){return Bn(this),this.i=null,a=wr(this,a),Td(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},n.get=function(a,h){return a?(a=vd(this,a),a.length>0?String(a[0]):h):h};function Ad(a,h,f){wd(a,h),f.length>0&&(a.i=null,a.g.set(wr(a,h),T(f)),a.h+=f.length)}n.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(let g=0;g<h.length;g++){var f=h[g];const b=Ss(f);f=vd(this,f);for(let P=0;P<f.length;P++){let O=b;f[P]!==""&&(O+="="+Ss(f[P])),a.push(O)}}return this.i=a.join("&")};function Rd(a){const h=new Vs;return h.i=a.i,a.g&&(h.g=new Map(a.g),h.h=a.h),h}function wr(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function BE(a,h){h&&!a.j&&(Bn(a),a.i=null,a.g.forEach(function(f,g){const b=g.toLowerCase();g!=b&&(wd(this,g),Ad(this,b,f))},a)),a.j=h}function qE(a,h){const f=new bs;if(o.Image){const g=new Image;g.onload=d(sn,f,"TestLoadImage: loaded",!0,h,g),g.onerror=d(sn,f,"TestLoadImage: error",!1,h,g),g.onabort=d(sn,f,"TestLoadImage: abort",!1,h,g),g.ontimeout=d(sn,f,"TestLoadImage: timeout",!1,h,g),o.setTimeout(function(){g.ontimeout&&g.ontimeout()},1e4),g.src=a}else h(!1)}function $E(a,h){const f=new bs,g=new AbortController,b=setTimeout(()=>{g.abort(),sn(f,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:g.signal}).then(P=>{clearTimeout(b),P.ok?sn(f,"TestPingServer: ok",!0,h):sn(f,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(b),sn(f,"TestPingServer: error",!1,h)})}function sn(a,h,f,g,b){try{b&&(b.onload=null,b.onerror=null,b.onabort=null,b.ontimeout=null),g(f)}catch{}}function jE(){this.g=new RE}function Mc(a){this.i=a.Sb||null,this.h=a.ab||!1}p(Mc,td),Mc.prototype.g=function(){return new po(this.i,this.h)};function po(a,h){qe.call(this),this.H=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}p(po,qe),n=po.prototype,n.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=h,this.readyState=1,xs(this)},n.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(h.body=a),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},n.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Os(this)),this.readyState=0},n.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,xs(this)),this.g&&(this.readyState=3,xs(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;bd(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function bd(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}n.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?Os(this):xs(this),this.readyState==3&&bd(this)}},n.Oa=function(a){this.g&&(this.response=this.responseText=a,Os(this))},n.Na=function(a){this.g&&(this.response=a,Os(this))},n.ga=function(){this.g&&Os(this)};function Os(a){a.readyState=4,a.l=null,a.j=null,a.B=null,xs(a)}n.setRequestHeader=function(a,h){this.A.append(a,h)},n.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},n.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var f=h.next();!f.done;)f=f.value,a.push(f[0]+": "+f[1]),f=h.next();return a.join(`\r
`)};function xs(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(po.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function Sd(a){let h="";return oo(a,function(f,g){h+=g,h+=":",h+=f,h+=`\r
`}),h}function Lc(a,h,f){e:{for(g in f){var g=!1;break e}g=!0}g||(f=Sd(f),typeof a=="string"?f!=null&&Ss(f):ue(a,h,f))}function ge(a){qe.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}p(ge,qe);var HE=/^https?$/i,GE=["POST","PUT"];n=ge.prototype,n.Fa=function(a){this.H=a},n.ea=function(a,h,f,g){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():cd.g(),this.g.onreadystatechange=m(l(this.Ca,this));try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(P){Pd(this,P);return}if(a=f||"",f=new Map(this.headers),g)if(Object.getPrototypeOf(g)===Object.prototype)for(var b in g)f.set(b,g[b]);else if(typeof g.keys=="function"&&typeof g.get=="function")for(const P of g.keys())f.set(P,g.get(P));else throw Error("Unknown input type for opt_headers: "+String(g));g=Array.from(f.keys()).find(P=>P.toLowerCase()=="content-type"),b=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(GE,h,void 0)>=0)||g||b||f.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[P,O]of f)this.g.setRequestHeader(P,O);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(P){Pd(this,P)}};function Pd(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.o=5,Cd(a),mo(a)}function Cd(a){a.A||(a.A=!0,ze(a,"complete"),ze(a,"error"))}n.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,ze(this,"complete"),ze(this,"abort"),mo(this))},n.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),mo(this,!0)),ge.Z.N.call(this)},n.Ca=function(){this.u||(this.B||this.v||this.j?kd(this):this.Xa())},n.Xa=function(){kd(this)};function kd(a){if(a.h&&typeof i<"u"){if(a.v&&on(a)==4)setTimeout(a.Ca.bind(a),0);else if(ze(a,"readystatechange"),on(a)==4){a.h=!1;try{const P=a.ca();e:switch(P){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var f;if(!(f=h)){var g;if(g=P===0){let O=String(a.D).match(Id)[1]||null;!O&&o.self&&o.self.location&&(O=o.self.location.protocol.slice(0,-1)),g=!HE.test(O?O.toLowerCase():"")}f=g}if(f)ze(a,"complete"),ze(a,"success");else{a.o=6;try{var b=on(a)>2?a.g.statusText:""}catch{b=""}a.l=b+" ["+a.ca()+"]",Cd(a)}}finally{mo(a)}}}}function mo(a,h){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const f=a.g;a.g=null,h||ze(a,"ready");try{f.onreadystatechange=null}catch{}}}n.isActive=function(){return!!this.g};function on(a){return a.g?a.g.readyState:0}n.ca=function(){try{return on(this)>2?this.g.status:-1}catch{return-1}},n.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},n.La=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),AE(h)}};function Nd(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function zE(a){const h={};a=(a.g&&on(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let g=0;g<a.length;g++){if(y(a[g]))continue;var f=kE(a[g]);const b=f[0];if(f=f[1],typeof f!="string")continue;f=f.trim();const P=h[b]||[];h[b]=P,P.push(f)}yE(h,function(g){return g.join(", ")})}n.ya=function(){return this.o},n.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function Ms(a,h,f){return f&&f.internalChannelParams&&f.internalChannelParams[a]||h}function Dd(a){this.za=0,this.i=[],this.j=new bs,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=Ms("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=Ms("baseRetryDelayMs",5e3,a),this.Za=Ms("retryDelaySeedMs",1e4,a),this.Ta=Ms("forwardChannelMaxRetries",2,a),this.va=Ms("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new pd(a&&a.concurrentRequestLimit),this.Ba=new jE,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}n=Dd.prototype,n.ka=8,n.I=1,n.connect=function(a,h,f,g){We(0),this.W=a,this.H=h||{},f&&g!==void 0&&(this.H.OSID=f,this.H.OAID=g),this.F=this.X,this.J=qd(this,null,this.W),_o(this)};function Uc(a){if(Vd(a),a.I==3){var h=a.V++,f=bt(a.J);if(ue(f,"SID",a.M),ue(f,"RID",h),ue(f,"TYPE","terminate"),Ls(a,f),h=new nn(a,a.j,h),h.M=2,h.A=fo(bt(f)),f=!1,o.navigator&&o.navigator.sendBeacon)try{f=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!f&&o.Image&&(new Image().src=h.A,f=!0),f||(h.g=$d(h.j,null),h.g.ea(h.A)),h.F=Date.now(),ho(h)}Bd(a)}function go(a){a.g&&(Bc(a),a.g.cancel(),a.g=null)}function Vd(a){go(a),a.v&&(o.clearTimeout(a.v),a.v=null),yo(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function _o(a){if(!md(a.h)&&!a.m){a.m=!0;var h=a.Ea;K||_(),W||(K(),W=!0),E.add(h,a),a.D=0}}function WE(a,h){return gd(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=h.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=Rs(l(a.Ea,a,h),Fd(a,a.D)),a.D++,!0)}n.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const b=new nn(this,this.j,a);let P=this.o;if(this.U&&(P?(P=Gh(P),Wh(P,this.U)):P=this.U),this.u!==null||this.R||(b.J=P,P=null),this.S)e:{for(var h=0,f=0;f<this.i.length;f++){t:{var g=this.i[f];if("__data__"in g.map&&(g=g.map.__data__,typeof g=="string")){g=g.length;break t}g=void 0}if(g===void 0)break;if(h+=g,h>4096){h=f;break e}if(h===4096||f===this.i.length-1){h=f+1;break e}}h=1e3}else h=1e3;h=xd(this,b,h),f=bt(this.J),ue(f,"RID",a),ue(f,"CVER",22),this.G&&ue(f,"X-HTTP-Session-Id",this.G),Ls(this,f),P&&(this.R?h="headers="+Ss(Sd(P))+"&"+h:this.u&&Lc(f,this.u,P)),Oc(this.h,b),this.Ra&&ue(f,"TYPE","init"),this.S?(ue(f,"$req",h),ue(f,"SID","null"),b.U=!0,kc(b,f,null)):kc(b,f,h),this.I=2}}else this.I==3&&(a?Od(this,a):this.i.length==0||md(this.h)||Od(this))};function Od(a,h){var f;h?f=h.l:f=a.V++;const g=bt(a.J);ue(g,"SID",a.M),ue(g,"RID",f),ue(g,"AID",a.K),Ls(a,g),a.u&&a.o&&Lc(g,a.u,a.o),f=new nn(a,a.j,f,a.D+1),a.u===null&&(f.J=a.o),h&&(a.i=h.G.concat(a.i)),h=xd(a,f,1e3),f.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),Oc(a.h,f),kc(f,g,h)}function Ls(a,h){a.H&&oo(a.H,function(f,g){ue(h,g,f)}),a.l&&oo({},function(f,g){ue(h,g,f)})}function xd(a,h,f){f=Math.min(a.i.length,f);const g=a.l?l(a.l.Ka,a.l,a):null;e:{var b=a.i;let Q=-1;for(;;){const be=["count="+f];Q==-1?f>0?(Q=b[0].g,be.push("ofs="+Q)):Q=0:be.push("ofs="+Q);let oe=!0;for(let De=0;De<f;De++){var P=b[De].g;const St=b[De].map;if(P-=Q,P<0)Q=Math.max(0,b[De].g-100),oe=!1;else try{P="req"+P+"_"||"";try{var O=St instanceof Map?St:Object.entries(St);for(const[$n,an]of O){let cn=an;c(an)&&(cn=Rc(an)),be.push(P+$n+"="+encodeURIComponent(cn))}}catch($n){throw be.push(P+"type="+encodeURIComponent("_badmap")),$n}}catch{g&&g(St)}}if(oe){O=be.join("&");break e}}O=void 0}return a=a.i.splice(0,f),h.G=a,O}function Md(a){if(!a.g&&!a.v){a.Y=1;var h=a.Da;K||_(),W||(K(),W=!0),E.add(h,a),a.A=0}}function Fc(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=Rs(l(a.Da,a),Fd(a,a.A)),a.A++,!0)}n.Da=function(){if(this.v=null,Ld(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=Rs(l(this.Wa,this),a)}},n.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,We(10),go(this),Ld(this))};function Bc(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function Ld(a){a.g=new nn(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var h=bt(a.na);ue(h,"RID","rpc"),ue(h,"SID",a.M),ue(h,"AID",a.K),ue(h,"CI",a.F?"0":"1"),!a.F&&a.ia&&ue(h,"TO",a.ia),ue(h,"TYPE","xmlhttp"),Ls(a,h),a.u&&a.o&&Lc(h,a.u,a.o),a.O&&(a.g.H=a.O);var f=a.g;a=a.ba,f.M=1,f.A=fo(bt(h)),f.u=null,f.R=!0,hd(f,a)}n.Va=function(){this.C!=null&&(this.C=null,go(this),Fc(this),We(19))};function yo(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function Ud(a,h){var f=null;if(a.g==h){yo(a),Bc(a),a.g=null;var g=2}else if(Vc(a.h,h))f=h.G,_d(a.h,h),g=1;else return;if(a.I!=0){if(h.o)if(g==1){f=h.u?h.u.length:0,h=Date.now()-h.F;var b=a.D;g=uo(),ze(g,new od(g,f)),_o(a)}else Md(a);else if(b=h.m,b==3||b==0&&h.X>0||!(g==1&&WE(a,h)||g==2&&Fc(a)))switch(f&&f.length>0&&(h=a.h,h.i=h.i.concat(f)),b){case 1:qn(a,5);break;case 4:qn(a,10);break;case 3:qn(a,6);break;default:qn(a,2)}}}function Fd(a,h){let f=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(f*=2),f*h}function qn(a,h){if(a.j.info("Error code "+h),h==2){var f=l(a.bb,a),g=a.Ua;const b=!g;g=new rn(g||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||Cs(g,"https"),fo(g),b?qE(g.toString(),f):$E(g.toString(),f)}else We(2);a.I=0,a.l&&a.l.pa(h),Bd(a),Vd(a)}n.bb=function(a){a?(this.j.info("Successfully pinged google.com"),We(2)):(this.j.info("Failed to ping google.com"),We(1))};function Bd(a){if(a.I=0,a.ja=[],a.l){const h=yd(a.h);(h.length!=0||a.i.length!=0)&&(C(a.ja,h),C(a.ja,a.i),a.h.i.length=0,T(a.i),a.i.length=0),a.l.oa()}}function qd(a,h,f){var g=f instanceof rn?bt(f):new rn(f);if(g.g!="")h&&(g.g=h+"."+g.g),ks(g,g.u);else{var b=o.location;g=b.protocol,h=h?h+"."+b.hostname:b.hostname,b=+b.port;const P=new rn(null);g&&Cs(P,g),h&&(P.g=h),b&&ks(P,b),f&&(P.h=f),g=P}return f=a.G,h=a.wa,f&&h&&ue(g,f,h),ue(g,"VER",a.ka),Ls(a,g),g}function $d(a,h,f){if(h&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Aa&&!a.ma?new ge(new Mc({ab:f})):new ge(a.ma),h.Fa(a.L),h}n.isActive=function(){return!!this.l&&this.l.isActive(this)};function jd(){}n=jd.prototype,n.ra=function(){},n.qa=function(){},n.pa=function(){},n.oa=function(){},n.isActive=function(){return!0},n.Ka=function(){};function Io(){}Io.prototype.g=function(a,h){return new it(a,h)};function it(a,h){qe.call(this),this.g=new Dd(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(a?a["X-WebChannel-Client-Profile"]=h.sa:a={"X-WebChannel-Client-Profile":h.sa}),this.g.U=a,(a=h&&h.Qb)&&!y(a)&&(this.g.u=a),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!y(h)&&(this.g.G=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new Tr(this)}p(it,qe),it.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},it.prototype.close=function(){Uc(this.g)},it.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var f={};f.__data__=a,a=f}else this.v&&(f={},f.__data__=Rc(a),a=f);h.i.push(new VE(h.Ya++,a)),h.I==3&&_o(h)},it.prototype.N=function(){this.g.l=null,delete this.j,Uc(this.g),delete this.g,it.Z.N.call(this)};function Hd(a){bc.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const f in h){a=f;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}p(Hd,bc);function Gd(){Sc.call(this),this.status=1}p(Gd,Sc);function Tr(a){this.g=a}p(Tr,jd),Tr.prototype.ra=function(){ze(this.g,"a")},Tr.prototype.qa=function(a){ze(this.g,new Hd(a))},Tr.prototype.pa=function(a){ze(this.g,new Gd)},Tr.prototype.oa=function(){ze(this.g,"b")},Io.prototype.createWebChannel=Io.prototype.g,it.prototype.send=it.prototype.o,it.prototype.open=it.prototype.m,it.prototype.close=it.prototype.close,zm=function(){return new Io},Gm=function(){return uo()},Hm=Un,Au={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},lo.NO_ERROR=0,lo.TIMEOUT=8,lo.HTTP_ERROR=6,Oo=lo,ad.COMPLETE="complete",jm=ad,nd.EventType=vs,vs.OPEN="a",vs.CLOSE="b",vs.ERROR="c",vs.MESSAGE="d",qe.prototype.listen=qe.prototype.J,Ks=nd,ge.prototype.listenOnce=ge.prototype.K,ge.prototype.getLastError=ge.prototype.Ha,ge.prototype.getLastErrorCode=ge.prototype.ya,ge.prototype.getStatus=ge.prototype.ca,ge.prototype.getResponseJson=ge.prototype.La,ge.prototype.getResponseText=ge.prototype.la,ge.prototype.send=ge.prototype.ea,ge.prototype.setWithCredentials=ge.prototype.Fa,$m=ge}).apply(typeof wo<"u"?wo:typeof self<"u"?self:typeof window<"u"?window:{});/**
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
 */class Oe{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}Oe.UNAUTHENTICATED=new Oe(null),Oe.GOOGLE_CREDENTIALS=new Oe("google-credentials-uid"),Oe.FIRST_PARTY=new Oe("first-party-uid"),Oe.MOCK_USER=new Oe("mock-user");/**
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
 */let hs="12.8.0";function NT(n){hs=n}/**
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
 *//**
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
 */const nr=new Ca("@firebase/firestore");function kr(){return nr.logLevel}function D(n,...e){if(nr.logLevel<=X.DEBUG){const t=e.map(ul);nr.debug(`Firestore (${hs}): ${n}`,...t)}}function Ie(n,...e){if(nr.logLevel<=X.ERROR){const t=e.map(ul);nr.error(`Firestore (${hs}): ${n}`,...t)}}function Hr(n,...e){if(nr.logLevel<=X.WARN){const t=e.map(ul);nr.warn(`Firestore (${hs}): ${n}`,...t)}}function ul(n){if(typeof n=="string")return n;try{return function(t){return JSON.stringify(t)}(n)}catch{return n}}/**
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
 */function L(n,e,t){let r="Unexpected state";typeof e=="string"?r=e:t=e,Wm(n,r,t)}function Wm(n,e,t){let r=`FIRESTORE (${hs}) INTERNAL ASSERTION FAILED: ${e} (ID: ${n.toString(16)})`;if(t!==void 0)try{r+=" CONTEXT: "+JSON.stringify(t)}catch{r+=" CONTEXT: "+t}throw Ie(r),new Error(r)}function B(n,e,t,r){let s="Unexpected state";typeof t=="string"?s=t:r=t,n||Wm(e,s,r)}function F(n,e){return n}/**
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
 */const S={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class V extends It{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
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
 */class ut{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
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
 */class Km{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class DT{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(Oe.UNAUTHENTICATED))}shutdown(){}}class VT{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}}class OT{constructor(e){this.t=e,this.currentUser=Oe.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){B(this.o===void 0,42304);let r=this.i;const s=u=>this.i!==r?(r=this.i,t(u)):Promise.resolve();let i=new ut;this.o=()=>{this.i++,this.currentUser=this.u(),i.resolve(),i=new ut,e.enqueueRetryable(()=>s(this.currentUser))};const o=()=>{const u=i;e.enqueueRetryable(async()=>{await u.promise,await s(this.currentUser)})},c=u=>{D("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(u=>c(u)),setTimeout(()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?c(u):(D("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new ut)}},0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(r=>this.i!==e?(D("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(B(typeof r.accessToken=="string",31837,{l:r}),new Km(r.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return B(e===null||typeof e=="string",2055,{h:e}),new Oe(e)}}class xT{constructor(e,t,r){this.P=e,this.T=t,this.I=r,this.type="FirstParty",this.user=Oe.FIRST_PARTY,this.R=new Map}A(){return this.I?this.I():null}get headers(){this.R.set("X-Goog-AuthUser",this.P);const e=this.A();return e&&this.R.set("Authorization",e),this.T&&this.R.set("X-Goog-Iam-Authorization-Token",this.T),this.R}}class MT{constructor(e,t,r){this.P=e,this.T=t,this.I=r}getToken(){return Promise.resolve(new xT(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable(()=>t(Oe.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class of{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class LT{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,ye(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){B(this.o===void 0,3512);const r=i=>{i.error!=null&&D("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${i.error.message}`);const o=i.token!==this.m;return this.m=i.token,D("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(i.token):Promise.resolve()};this.o=i=>{e.enqueueRetryable(()=>r(i))};const s=i=>{D("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=i,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(i=>s(i)),setTimeout(()=>{if(!this.appCheck){const i=this.V.getImmediate({optional:!0});i?s(i):D("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new of(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?(B(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new of(t.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
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
 */function UT(n){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(n);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let r=0;r<n;r++)t[r]=Math.floor(256*Math.random());return t}/**
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
 */class ll{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let r="";for(;r.length<20;){const s=UT(40);for(let i=0;i<s.length;++i)r.length<20&&s[i]<t&&(r+=e.charAt(s[i]%62))}return r}}function z(n,e){return n<e?-1:n>e?1:0}function Ru(n,e){const t=Math.min(n.length,e.length);for(let r=0;r<t;r++){const s=n.charAt(r),i=e.charAt(r);if(s!==i)return Kc(s)===Kc(i)?z(s,i):Kc(s)?1:-1}return z(n.length,e.length)}const FT=55296,BT=57343;function Kc(n){const e=n.charCodeAt(0);return e>=FT&&e<=BT}function Gr(n,e,t){return n.length===e.length&&n.every((r,s)=>t(r,e[s]))}function Qm(n){return n+"\0"}/**
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
 */const bu="__name__";class Pt{constructor(e,t,r){t===void 0?t=0:t>e.length&&L(637,{offset:t,range:e.length}),r===void 0?r=e.length-t:r>e.length-t&&L(1746,{length:r,range:e.length-t}),this.segments=e,this.offset=t,this.len=r}get length(){return this.len}isEqual(e){return Pt.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof Pt?e.forEach(r=>{t.push(r)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,r=this.limit();t<r;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const r=Math.min(e.length,t.length);for(let s=0;s<r;s++){const i=Pt.compareSegments(e.get(s),t.get(s));if(i!==0)return i}return z(e.length,t.length)}static compareSegments(e,t){const r=Pt.isNumericId(e),s=Pt.isNumericId(t);return r&&!s?-1:!r&&s?1:r&&s?Pt.extractNumericId(e).compare(Pt.extractNumericId(t)):Ru(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return wn.fromString(e.substring(4,e.length-2))}}class ne extends Pt{construct(e,t,r){return new ne(e,t,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const r of e){if(r.indexOf("//")>=0)throw new V(S.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);t.push(...r.split("/").filter(s=>s.length>0))}return new ne(t)}static emptyPath(){return new ne([])}}const qT=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class me extends Pt{construct(e,t,r){return new me(e,t,r)}static isValidIdentifier(e){return qT.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),me.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===bu}static keyField(){return new me([bu])}static fromServerFormat(e){const t=[];let r="",s=0;const i=()=>{if(r.length===0)throw new V(S.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(r),r=""};let o=!1;for(;s<e.length;){const c=e[s];if(c==="\\"){if(s+1===e.length)throw new V(S.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[s+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new V(S.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=u,s+=2}else c==="`"?(o=!o,s++):c!=="."||o?(r+=c,s++):(i(),s++)}if(i(),o)throw new V(S.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new me(t)}static emptyPath(){return new me([])}}/**
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
 */class x{constructor(e){this.path=e}static fromPath(e){return new x(ne.fromString(e))}static fromName(e){return new x(ne.fromString(e).popFirst(5))}static empty(){return new x(ne.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&ne.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return ne.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new x(new ne(e.slice()))}}/**
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
 */function Jm(n,e,t){if(!t)throw new V(S.INVALID_ARGUMENT,`Function ${n}() cannot be called with an empty ${e}.`)}function $T(n,e,t,r){if(e===!0&&r===!0)throw new V(S.INVALID_ARGUMENT,`${n} and ${t} cannot be used together.`)}function af(n){if(!x.isDocumentKey(n))throw new V(S.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${n} has ${n.length}.`)}function cf(n){if(x.isDocumentKey(n))throw new V(S.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${n} has ${n.length}.`)}function Ym(n){return typeof n=="object"&&n!==null&&(Object.getPrototypeOf(n)===Object.prototype||Object.getPrototypeOf(n)===null)}function Na(n){if(n===void 0)return"undefined";if(n===null)return"null";if(typeof n=="string")return n.length>20&&(n=`${n.substring(0,20)}...`),JSON.stringify(n);if(typeof n=="number"||typeof n=="boolean")return""+n;if(typeof n=="object"){if(n instanceof Array)return"an array";{const e=function(r){return r.constructor?r.constructor.name:null}(n);return e?`a custom ${e} object`:"an object"}}return typeof n=="function"?"a function":L(12329,{type:typeof n})}function Ee(n,e){if("_delegate"in n&&(n=n._delegate),!(n instanceof e)){if(e.name===n.constructor.name)throw new V(S.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=Na(n);throw new V(S.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return n}function jT(n,e){if(e<=0)throw new V(S.INVALID_ARGUMENT,`Function ${n}() requires a positive number, but it was: ${e}.`)}/**
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
 */function Ae(n,e){const t={typeString:n};return e&&(t.value=e),t}function Fi(n,e){if(!Ym(n))throw new V(S.INVALID_ARGUMENT,"JSON must be an object");let t;for(const r in e)if(e[r]){const s=e[r].typeString,i="value"in e[r]?{value:e[r].value}:void 0;if(!(r in n)){t=`JSON missing required field: '${r}'`;break}const o=n[r];if(s&&typeof o!==s){t=`JSON field '${r}' must be a ${s}.`;break}if(i!==void 0&&o!==i.value){t=`Expected '${r}' field to equal '${i.value}'`;break}}if(t)throw new V(S.INVALID_ARGUMENT,t);return!0}/**
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
 */const uf=-62135596800,lf=1e6;class re{static now(){return re.fromMillis(Date.now())}static fromDate(e){return re.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),r=Math.floor((e-1e3*t)*lf);return new re(t,r)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new V(S.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new V(S.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<uf)throw new V(S.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new V(S.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/lf}_compareTo(e){return this.seconds===e.seconds?z(this.nanoseconds,e.nanoseconds):z(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:re._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Fi(e,re._jsonSchema))return new re(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-uf;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}re._jsonSchemaVersion="firestore/timestamp/1.0",re._jsonSchema={type:Ae("string",re._jsonSchemaVersion),seconds:Ae("number"),nanoseconds:Ae("number")};/**
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
 */class j{static fromTimestamp(e){return new j(e)}static min(){return new j(new re(0,0))}static max(){return new j(new re(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */const zr=-1;class Xo{constructor(e,t,r,s){this.indexId=e,this.collectionGroup=t,this.fields=r,this.indexState=s}}function Su(n){return n.fields.find(e=>e.kind===2)}function Gn(n){return n.fields.filter(e=>e.kind!==2)}Xo.UNKNOWN_ID=-1;class xo{constructor(e,t){this.fieldPath=e,this.kind=t}}class gi{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new gi(0,ht.min())}}function Xm(n,e){const t=n.toTimestamp().seconds,r=n.toTimestamp().nanoseconds+1,s=j.fromTimestamp(r===1e9?new re(t+1,0):new re(t,r));return new ht(s,x.empty(),e)}function Zm(n){return new ht(n.readTime,n.key,zr)}class ht{constructor(e,t,r){this.readTime=e,this.documentKey=t,this.largestBatchId=r}static min(){return new ht(j.min(),x.empty(),zr)}static max(){return new ht(j.max(),x.empty(),zr)}}function hl(n,e){let t=n.readTime.compareTo(e.readTime);return t!==0?t:(t=x.comparator(n.documentKey,e.documentKey),t!==0?t:z(n.largestBatchId,e.largestBatchId))}/**
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
 */const eg="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class tg{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
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
 */async function On(n){if(n.code!==S.FAILED_PRECONDITION||n.message!==eg)throw n;D("LocalStore","Unexpectedly lost primary lease")}/**
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
 */class A{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)},t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&L(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new A((r,s)=>{this.nextCallback=i=>{this.wrapSuccess(e,i).next(r,s)},this.catchCallback=i=>{this.wrapFailure(t,i).next(r,s)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof A?t:A.resolve(t)}catch(t){return A.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):A.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):A.reject(t)}static resolve(e){return new A((t,r)=>{t(e)})}static reject(e){return new A((t,r)=>{r(e)})}static waitFor(e){return new A((t,r)=>{let s=0,i=0,o=!1;e.forEach(c=>{++s,c.next(()=>{++i,o&&i===s&&t()},u=>r(u))}),o=!0,i===s&&t()})}static or(e){let t=A.resolve(!1);for(const r of e)t=t.next(s=>s?A.resolve(s):r());return t}static forEach(e,t){const r=[];return e.forEach((s,i)=>{r.push(t.call(this,s,i))}),this.waitFor(r)}static mapArray(e,t){return new A((r,s)=>{const i=e.length,o=new Array(i);let c=0;for(let u=0;u<i;u++){const l=u;t(e[l]).next(d=>{o[l]=d,++c,c===i&&r(o)},d=>s(d))}})}static doWhile(e,t){return new A((r,s)=>{const i=()=>{e()===!0?t().next(()=>{i()},s):r()};i()})}}/**
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
 */const ot="SimpleDb";class Da{static open(e,t,r,s){try{return new Da(t,e.transaction(s,r))}catch(i){throw new ti(t,i)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new ut,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new ti(e,t.error)):this.S.resolve()},this.transaction.onerror=r=>{const s=dl(r.target.error);this.S.reject(new ti(e,s))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||(D(ot,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}C(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new GT(t)}}class Tn{static delete(e){return D(ot,"Removing database:",e),Wn(al().indexedDB.deleteDatabase(e)).toPromise()}static v(){if(!Li())return!1;if(Tn.F())return!0;const e=Pe(),t=Tn.M(e),r=0<t&&t<10,s=ng(e),i=0<s&&s<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||r||i)}static F(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)==null?void 0:e.__PRIVATE_USE_MOCK_PERSISTENCE)==="YES"}static O(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),r=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(r)}constructor(e,t,r){this.name=e,this.version=t,this.N=r,this.B=null,Tn.M(Pe())===12.2&&Ie("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async L(e){return this.db||(D(ot,"Opening database:",this.name),this.db=await new Promise((t,r)=>{const s=indexedDB.open(this.name,this.version);s.onsuccess=i=>{const o=i.target.result;t(o)},s.onblocked=()=>{r(new ti(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},s.onerror=i=>{const o=i.target.error;o.name==="VersionError"?r(new V(S.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?r(new V(S.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):r(new ti(e,o))},s.onupgradeneeded=i=>{D(ot,'Database "'+this.name+'" requires upgrade from version:',i.oldVersion);const o=i.target.result;this.N.k(o,s.transaction,i.oldVersion,this.version).next(()=>{D(ot,"Database upgrade to version "+this.version+" complete")})}})),this.K&&(this.db.onversionchange=t=>this.K(t)),this.db}q(e){this.K=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,r,s){const i=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.L(e);const c=Da.open(this.db,e,i?"readonly":"readwrite",r),u=s(c).next(l=>(c.C(),l)).catch(l=>(c.abort(l),A.reject(l))).toPromise();return u.catch(()=>{}),await c.D,u}catch(c){const u=c,l=u.name!=="FirebaseError"&&o<3;if(D(ot,"Transaction failed with error:",u.message,"Retrying:",l),this.close(),!l)return Promise.reject(u)}}}close(){this.db&&this.db.close(),this.db=void 0}}function ng(n){const e=n.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class HT{constructor(e){this.U=e,this.$=!1,this.W=null}get isDone(){return this.$}get G(){return this.W}set cursor(e){this.U=e}done(){this.$=!0}j(e){this.W=e}delete(){return Wn(this.U.delete())}}class ti extends V{constructor(e,t){super(S.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function xn(n){return n.name==="IndexedDbTransactionError"}class GT{constructor(e){this.store=e}put(e,t){let r;return t!==void 0?(D(ot,"PUT",this.store.name,e,t),r=this.store.put(t,e)):(D(ot,"PUT",this.store.name,"<auto-key>",e),r=this.store.put(e)),Wn(r)}add(e){return D(ot,"ADD",this.store.name,e,e),Wn(this.store.add(e))}get(e){return Wn(this.store.get(e)).next(t=>(t===void 0&&(t=null),D(ot,"GET",this.store.name,e,t),t))}delete(e){return D(ot,"DELETE",this.store.name,e),Wn(this.store.delete(e))}count(){return D(ot,"COUNT",this.store.name),Wn(this.store.count())}H(e,t){const r=this.options(e,t),s=r.index?this.store.index(r.index):this.store;if(typeof s.getAll=="function"){const i=s.getAll(r.range);return new A((o,c)=>{i.onerror=u=>{c(u.target.error)},i.onsuccess=u=>{o(u.target.result)}})}{const i=this.cursor(r),o=[];return this.J(i,(c,u)=>{o.push(u)}).next(()=>o)}}Z(e,t){const r=this.store.getAll(e,t===null?void 0:t);return new A((s,i)=>{r.onerror=o=>{i(o.target.error)},r.onsuccess=o=>{s(o.target.result)}})}X(e,t){D(ot,"DELETE ALL",this.store.name);const r=this.options(e,t);r.Y=!1;const s=this.cursor(r);return this.J(s,(i,o,c)=>c.delete())}ee(e,t){let r;t?r=e:(r={},t=e);const s=this.cursor(r);return this.J(s,t)}te(e){const t=this.cursor({});return new A((r,s)=>{t.onerror=i=>{const o=dl(i.target.error);s(o)},t.onsuccess=i=>{const o=i.target.result;o?e(o.primaryKey,o.value).next(c=>{c?o.continue():r()}):r()}})}J(e,t){const r=[];return new A((s,i)=>{e.onerror=o=>{i(o.target.error)},e.onsuccess=o=>{const c=o.target.result;if(!c)return void s();const u=new HT(c),l=t(c.primaryKey,c.value,u);if(l instanceof A){const d=l.catch(p=>(u.done(),A.reject(p)));r.push(d)}u.isDone?s():u.G===null?c.continue():c.continue(u.G)}}).next(()=>A.waitFor(r))}options(e,t){let r;return e!==void 0&&(typeof e=="string"?r=e:t=e),{index:r,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const r=this.store.index(e.index);return e.Y?r.openKeyCursor(e.range,t):r.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function Wn(n){return new A((e,t)=>{n.onsuccess=r=>{const s=r.target.result;e(s)},n.onerror=r=>{const s=dl(r.target.error);t(s)}})}let hf=!1;function dl(n){const e=Tn.M(Pe());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(n.message.indexOf(t)>=0){const r=new V("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return hf||(hf=!0,setTimeout(()=>{throw r},0)),r}}return n}const ni="IndexBackfiller";class zT{constructor(e,t){this.asyncQueue=e,this.ne=t,this.task=null}start(){this.re(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}re(e){D(ni,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{const t=await this.ne.ie();D(ni,`Documents written: ${t}`)}catch(t){xn(t)?D(ni,"Ignoring IndexedDB error during index backfill: ",t):await On(t)}await this.re(6e4)})}}class WT{constructor(e,t){this.localStore=e,this.persistence=t}async ie(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.se(t,e))}se(e,t){const r=new Set;let s=t,i=!0;return A.doWhile(()=>i===!0&&s>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(o=>{if(o!==null&&!r.has(o))return D(ni,`Processing collection: ${o}`),this.oe(e,o,s).next(c=>{s-=c,r.add(o)});i=!1})).next(()=>t-s)}oe(e,t,r){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(s=>this.localStore.localDocuments.getNextDocuments(e,t,s,r).next(i=>{const o=i.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next(()=>this._e(s,i)).next(c=>(D(ni,`Updating offset: ${c}`),this.localStore.indexManager.updateCollectionGroup(e,t,c))).next(()=>o.size)}))}_e(e,t){let r=e;return t.changes.forEach((s,i)=>{const o=Zm(i);hl(o,r)>0&&(r=o)}),new ht(r.readTime,r.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
 * @license
 * Copyright 2018 Google LLC
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
 */class Xe{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=r=>this.ae(r),this.ue=r=>t.writeSequenceNumber(r))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}Xe.ce=-1;/**
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
 */const Zn=-1;function Bi(n){return n==null}function _i(n){return n===0&&1/n==-1/0}function rg(n){return typeof n=="number"&&Number.isInteger(n)&&!_i(n)&&n<=Number.MAX_SAFE_INTEGER&&n>=Number.MIN_SAFE_INTEGER}/**
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
 */const Zo="";function Ge(n){let e="";for(let t=0;t<n.length;t++)e.length>0&&(e=df(e)),e=KT(n.get(t),e);return df(e)}function KT(n,e){let t=e;const r=n.length;for(let s=0;s<r;s++){const i=n.charAt(s);switch(i){case"\0":t+="";break;case Zo:t+="";break;default:t+=i}}return t}function df(n){return n+Zo+""}function Nt(n){const e=n.length;if(B(e>=2,64408,{path:n}),e===2)return B(n.charAt(0)===Zo&&n.charAt(1)==="",56145,{path:n}),ne.emptyPath();const t=e-2,r=[];let s="";for(let i=0;i<e;){const o=n.indexOf(Zo,i);switch((o<0||o>t)&&L(50515,{path:n}),n.charAt(o+1)){case"":const c=n.substring(i,o);let u;s.length===0?u=c:(s+=c,u=s,s=""),r.push(u);break;case"":s+=n.substring(i,o),s+="\0";break;case"":s+=n.substring(i,o+1);break;default:L(61167,{path:n})}i=o+2}return new ne(r)}/**
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
 */const zn="remoteDocuments",qi="owner",vr="owner",yi="mutationQueues",QT="userId",Et="mutations",ff="batchId",Yn="userMutationsIndex",pf=["userId","batchId"];/**
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
 */function Mo(n,e){return[n,Ge(e)]}function sg(n,e,t){return[n,Ge(e),t]}const JT={},Wr="documentMutations",ea="remoteDocumentsV14",YT=["prefixPath","collectionGroup","readTime","documentId"],Lo="documentKeyIndex",XT=["prefixPath","collectionGroup","documentId"],ig="collectionGroupIndex",ZT=["collectionGroup","readTime","prefixPath","documentId"],Ii="remoteDocumentGlobal",Pu="remoteDocumentGlobalKey",Kr="targets",og="queryTargetsIndex",ev=["canonicalId","targetId"],Qr="targetDocuments",tv=["targetId","path"],fl="documentTargetsIndex",nv=["path","targetId"],ta="targetGlobalKey",er="targetGlobal",Ei="collectionParents",rv=["collectionId","parent"],Jr="clientMetadata",sv="clientId",Va="bundles",iv="bundleId",Oa="namedQueries",ov="name",pl="indexConfiguration",av="indexId",Cu="collectionGroupIndex",cv="collectionGroup",ri="indexState",uv=["indexId","uid"],ag="sequenceNumberIndex",lv=["uid","sequenceNumber"],si="indexEntries",hv=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],cg="documentKeyIndex",dv=["indexId","uid","orderedDocumentKey"],xa="documentOverlays",fv=["userId","collectionPath","documentId"],ku="collectionPathOverlayIndex",pv=["userId","collectionPath","largestBatchId"],ug="collectionGroupOverlayIndex",mv=["userId","collectionGroup","largestBatchId"],ml="globals",gv="name",lg=[yi,Et,Wr,zn,Kr,qi,er,Qr,Jr,Ii,Ei,Va,Oa],_v=[...lg,xa],hg=[yi,Et,Wr,ea,Kr,qi,er,Qr,Jr,Ii,Ei,Va,Oa,xa],dg=hg,gl=[...dg,pl,ri,si],yv=gl,fg=[...gl,ml],Iv=fg;/**
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
 */class Nu extends tg{constructor(e,t){super(),this.le=e,this.currentSequenceNumber=t}}function Ce(n,e){const t=F(n);return Tn.O(t.le,e)}/**
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
 */function mf(n){let e=0;for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e++;return e}function Mn(n,e){for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e(t,n[t])}function Ev(n,e){const t=[];for(const r in n)Object.prototype.hasOwnProperty.call(n,r)&&t.push(e(n[r],r,n));return t}function pg(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}/**
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
 */class ae{constructor(e,t){this.comparator=e,this.root=t||Ue.EMPTY}insert(e,t){return new ae(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,Ue.BLACK,null,null))}remove(e){return new ae(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Ue.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const r=this.comparator(e,t.key);if(r===0)return t.value;r<0?t=t.left:r>0&&(t=t.right)}return null}indexOf(e){let t=0,r=this.root;for(;!r.isEmpty();){const s=this.comparator(e,r.key);if(s===0)return t+r.left.size;s<0?r=r.left:(t+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,r)=>(e(t,r),!1))}toString(){const e=[];return this.inorderTraversal((t,r)=>(e.push(`${t}:${r}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new To(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new To(this.root,e,this.comparator,!1)}getReverseIterator(){return new To(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new To(this.root,e,this.comparator,!0)}}class To{constructor(e,t,r,s){this.isReverse=s,this.nodeStack=[];let i=1;for(;!e.isEmpty();)if(i=t?r(e.key,t):1,t&&s&&(i*=-1),i<0)e=this.isReverse?e.left:e.right;else{if(i===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Ue{constructor(e,t,r,s,i){this.key=e,this.value=t,this.color=r??Ue.RED,this.left=s??Ue.EMPTY,this.right=i??Ue.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,r,s,i){return new Ue(e??this.key,t??this.value,r??this.color,s??this.left,i??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,r){let s=this;const i=r(e,s.key);return s=i<0?s.copy(null,null,null,s.left.insert(e,t,r),null):i===0?s.copy(null,t,null,null,null):s.copy(null,null,null,null,s.right.insert(e,t,r)),s.fixUp()}removeMin(){if(this.left.isEmpty())return Ue.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let r,s=this;if(t(e,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(e,t),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),t(e,s.key)===0){if(s.right.isEmpty())return Ue.EMPTY;r=s.right.min(),s=s.copy(r.key,r.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(e,t))}return s.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Ue.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Ue.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw L(43730,{key:this.key,value:this.value});if(this.right.isRed())throw L(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw L(27949);return e+(this.isRed()?0:1)}}Ue.EMPTY=null,Ue.RED=!0,Ue.BLACK=!1;Ue.EMPTY=new class{constructor(){this.size=0}get key(){throw L(57766)}get value(){throw L(16141)}get color(){throw L(16727)}get left(){throw L(29726)}get right(){throw L(36894)}copy(e,t,r,s,i){return this}insert(e,t,r){return new Ue(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
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
 */class ie{constructor(e){this.comparator=e,this.data=new ae(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,r)=>(e(t),!1))}forEachInRange(e,t){const r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){const s=r.getNext();if(this.comparator(s.key,e[1])>=0)return;t(s.key)}}forEachWhile(e,t){let r;for(r=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new gf(this.data.getIterator())}getIteratorFrom(e){return new gf(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(r=>{t=t.add(r)}),t}isEqual(e){if(!(e instanceof ie)||this.size!==e.size)return!1;const t=this.data.getIterator(),r=e.data.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=r.getNext().key;if(this.comparator(s,i)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new ie(this.comparator);return t.data=e,t}}class gf{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function Ar(n){return n.hasNext()?n.getNext():void 0}/**
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
 */class Ze{constructor(e){this.fields=e,e.sort(me.comparator)}static empty(){return new Ze([])}unionWith(e){let t=new ie(me.comparator);for(const r of this.fields)t=t.add(r);for(const r of e)t=t.add(r);return new Ze(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return Gr(this.fields,e.fields,(t,r)=>t.isEqual(r))}}/**
 * @license
 * Copyright 2023 Google LLC
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
 */class mg extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
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
 */class we{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(s){try{return atob(s)}catch(i){throw typeof DOMException<"u"&&i instanceof DOMException?new mg("Invalid base64 string: "+i):i}}(e);return new we(t)}static fromUint8Array(e){const t=function(s){let i="";for(let o=0;o<s.length;++o)i+=String.fromCharCode(s[o]);return i}(e);return new we(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=t.charCodeAt(s);return r}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return z(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}we.EMPTY_BYTE_STRING=new we("");const wv=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Wt(n){if(B(!!n,39018),typeof n=="string"){let e=0;const t=wv.exec(n);if(B(!!t,46558,{timestamp:n}),t[1]){let s=t[1];s=(s+"000000000").substr(0,9),e=Number(s)}const r=new Date(n);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:le(n.seconds),nanos:le(n.nanos)}}function le(n){return typeof n=="number"?n:typeof n=="string"?Number(n):0}function Kt(n){return typeof n=="string"?we.fromBase64String(n):we.fromUint8Array(n)}/**
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
 */const gg="server_timestamp",_g="__type__",yg="__previous_value__",Ig="__local_write_time__";function Ma(n){var t,r;return((r=(((t=n==null?void 0:n.mapValue)==null?void 0:t.fields)||{})[_g])==null?void 0:r.stringValue)===gg}function La(n){const e=n.mapValue.fields[yg];return Ma(e)?La(e):e}function wi(n){const e=Wt(n.mapValue.fields[Ig].timestampValue);return new re(e.seconds,e.nanos)}/**
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
 */class Tv{constructor(e,t,r,s,i,o,c,u,l,d,p){this.databaseId=e,this.appId=t,this.persistenceKey=r,this.host=s,this.ssl=i,this.forceLongPolling=o,this.autoDetectLongPolling=c,this.longPollingOptions=u,this.useFetchStreams=l,this.isUsingEmulator=d,this.apiKey=p}}const na="(default)";class rr{constructor(e,t){this.projectId=e,this.database=t||na}static empty(){return new rr("","")}get isDefaultDatabase(){return this.database===na}isEqual(e){return e instanceof rr&&e.projectId===this.projectId&&e.database===this.database}}function vv(n,e){if(!Object.prototype.hasOwnProperty.apply(n.options,["projectId"]))throw new V(S.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new rr(n.options.projectId,e)}/**
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
 */const _l="__type__",Eg="__max__",gn={mapValue:{fields:{__type__:{stringValue:Eg}}}},yl="__vector__",Yr="value",Uo={nullValue:"NULL_VALUE"};function Pn(n){return"nullValue"in n?0:"booleanValue"in n?1:"integerValue"in n||"doubleValue"in n?2:"timestampValue"in n?3:"stringValue"in n?5:"bytesValue"in n?6:"referenceValue"in n?7:"geoPointValue"in n?8:"arrayValue"in n?9:"mapValue"in n?Ma(n)?4:wg(n)?9007199254740991:Ua(n)?10:11:L(28295,{value:n})}function xt(n,e){if(n===e)return!0;const t=Pn(n);if(t!==Pn(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return n.booleanValue===e.booleanValue;case 4:return wi(n).isEqual(wi(e));case 3:return function(s,i){if(typeof s.timestampValue=="string"&&typeof i.timestampValue=="string"&&s.timestampValue.length===i.timestampValue.length)return s.timestampValue===i.timestampValue;const o=Wt(s.timestampValue),c=Wt(i.timestampValue);return o.seconds===c.seconds&&o.nanos===c.nanos}(n,e);case 5:return n.stringValue===e.stringValue;case 6:return function(s,i){return Kt(s.bytesValue).isEqual(Kt(i.bytesValue))}(n,e);case 7:return n.referenceValue===e.referenceValue;case 8:return function(s,i){return le(s.geoPointValue.latitude)===le(i.geoPointValue.latitude)&&le(s.geoPointValue.longitude)===le(i.geoPointValue.longitude)}(n,e);case 2:return function(s,i){if("integerValue"in s&&"integerValue"in i)return le(s.integerValue)===le(i.integerValue);if("doubleValue"in s&&"doubleValue"in i){const o=le(s.doubleValue),c=le(i.doubleValue);return o===c?_i(o)===_i(c):isNaN(o)&&isNaN(c)}return!1}(n,e);case 9:return Gr(n.arrayValue.values||[],e.arrayValue.values||[],xt);case 10:case 11:return function(s,i){const o=s.mapValue.fields||{},c=i.mapValue.fields||{};if(mf(o)!==mf(c))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(c[u]===void 0||!xt(o[u],c[u])))return!1;return!0}(n,e);default:return L(52216,{left:n})}}function Ti(n,e){return(n.values||[]).find(t=>xt(t,e))!==void 0}function Cn(n,e){if(n===e)return 0;const t=Pn(n),r=Pn(e);if(t!==r)return z(t,r);switch(t){case 0:case 9007199254740991:return 0;case 1:return z(n.booleanValue,e.booleanValue);case 2:return function(i,o){const c=le(i.integerValue||i.doubleValue),u=le(o.integerValue||o.doubleValue);return c<u?-1:c>u?1:c===u?0:isNaN(c)?isNaN(u)?0:-1:1}(n,e);case 3:return _f(n.timestampValue,e.timestampValue);case 4:return _f(wi(n),wi(e));case 5:return Ru(n.stringValue,e.stringValue);case 6:return function(i,o){const c=Kt(i),u=Kt(o);return c.compareTo(u)}(n.bytesValue,e.bytesValue);case 7:return function(i,o){const c=i.split("/"),u=o.split("/");for(let l=0;l<c.length&&l<u.length;l++){const d=z(c[l],u[l]);if(d!==0)return d}return z(c.length,u.length)}(n.referenceValue,e.referenceValue);case 8:return function(i,o){const c=z(le(i.latitude),le(o.latitude));return c!==0?c:z(le(i.longitude),le(o.longitude))}(n.geoPointValue,e.geoPointValue);case 9:return yf(n.arrayValue,e.arrayValue);case 10:return function(i,o){var m,T,C,N;const c=i.fields||{},u=o.fields||{},l=(m=c[Yr])==null?void 0:m.arrayValue,d=(T=u[Yr])==null?void 0:T.arrayValue,p=z(((C=l==null?void 0:l.values)==null?void 0:C.length)||0,((N=d==null?void 0:d.values)==null?void 0:N.length)||0);return p!==0?p:yf(l,d)}(n.mapValue,e.mapValue);case 11:return function(i,o){if(i===gn.mapValue&&o===gn.mapValue)return 0;if(i===gn.mapValue)return 1;if(o===gn.mapValue)return-1;const c=i.fields||{},u=Object.keys(c),l=o.fields||{},d=Object.keys(l);u.sort(),d.sort();for(let p=0;p<u.length&&p<d.length;++p){const m=Ru(u[p],d[p]);if(m!==0)return m;const T=Cn(c[u[p]],l[d[p]]);if(T!==0)return T}return z(u.length,d.length)}(n.mapValue,e.mapValue);default:throw L(23264,{he:t})}}function _f(n,e){if(typeof n=="string"&&typeof e=="string"&&n.length===e.length)return z(n,e);const t=Wt(n),r=Wt(e),s=z(t.seconds,r.seconds);return s!==0?s:z(t.nanos,r.nanos)}function yf(n,e){const t=n.values||[],r=e.values||[];for(let s=0;s<t.length&&s<r.length;++s){const i=Cn(t[s],r[s]);if(i)return i}return z(t.length,r.length)}function Xr(n){return Du(n)}function Du(n){return"nullValue"in n?"null":"booleanValue"in n?""+n.booleanValue:"integerValue"in n?""+n.integerValue:"doubleValue"in n?""+n.doubleValue:"timestampValue"in n?function(t){const r=Wt(t);return`time(${r.seconds},${r.nanos})`}(n.timestampValue):"stringValue"in n?n.stringValue:"bytesValue"in n?function(t){return Kt(t).toBase64()}(n.bytesValue):"referenceValue"in n?function(t){return x.fromName(t).toString()}(n.referenceValue):"geoPointValue"in n?function(t){return`geo(${t.latitude},${t.longitude})`}(n.geoPointValue):"arrayValue"in n?function(t){let r="[",s=!0;for(const i of t.values||[])s?s=!1:r+=",",r+=Du(i);return r+"]"}(n.arrayValue):"mapValue"in n?function(t){const r=Object.keys(t.fields||{}).sort();let s="{",i=!0;for(const o of r)i?i=!1:s+=",",s+=`${o}:${Du(t.fields[o])}`;return s+"}"}(n.mapValue):L(61005,{value:n})}function Fo(n){switch(Pn(n)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=La(n);return e?16+Fo(e):16;case 5:return 2*n.stringValue.length;case 6:return Kt(n.bytesValue).approximateByteSize();case 7:return n.referenceValue.length;case 9:return function(r){return(r.values||[]).reduce((s,i)=>s+Fo(i),0)}(n.arrayValue);case 10:case 11:return function(r){let s=0;return Mn(r.fields,(i,o)=>{s+=i.length+Fo(o)}),s}(n.mapValue);default:throw L(13486,{value:n})}}function sr(n,e){return{referenceValue:`projects/${n.projectId}/databases/${n.database}/documents/${e.path.canonicalString()}`}}function Vu(n){return!!n&&"integerValue"in n}function vi(n){return!!n&&"arrayValue"in n}function If(n){return!!n&&"nullValue"in n}function Ef(n){return!!n&&"doubleValue"in n&&isNaN(Number(n.doubleValue))}function Bo(n){return!!n&&"mapValue"in n}function Ua(n){var t,r;return((r=(((t=n==null?void 0:n.mapValue)==null?void 0:t.fields)||{})[_l])==null?void 0:r.stringValue)===yl}function ii(n){if(n.geoPointValue)return{geoPointValue:{...n.geoPointValue}};if(n.timestampValue&&typeof n.timestampValue=="object")return{timestampValue:{...n.timestampValue}};if(n.mapValue){const e={mapValue:{fields:{}}};return Mn(n.mapValue.fields,(t,r)=>e.mapValue.fields[t]=ii(r)),e}if(n.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(n.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=ii(n.arrayValue.values[t]);return e}return{...n}}function wg(n){return(((n.mapValue||{}).fields||{}).__type__||{}).stringValue===Eg}const Tg={mapValue:{fields:{[_l]:{stringValue:yl},[Yr]:{arrayValue:{}}}}};function Av(n){return"nullValue"in n?Uo:"booleanValue"in n?{booleanValue:!1}:"integerValue"in n||"doubleValue"in n?{doubleValue:NaN}:"timestampValue"in n?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in n?{stringValue:""}:"bytesValue"in n?{bytesValue:""}:"referenceValue"in n?sr(rr.empty(),x.empty()):"geoPointValue"in n?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in n?{arrayValue:{}}:"mapValue"in n?Ua(n)?Tg:{mapValue:{}}:L(35942,{value:n})}function Rv(n){return"nullValue"in n?{booleanValue:!1}:"booleanValue"in n?{doubleValue:NaN}:"integerValue"in n||"doubleValue"in n?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in n?{stringValue:""}:"stringValue"in n?{bytesValue:""}:"bytesValue"in n?sr(rr.empty(),x.empty()):"referenceValue"in n?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in n?{arrayValue:{}}:"arrayValue"in n?Tg:"mapValue"in n?Ua(n)?{mapValue:{}}:gn:L(61959,{value:n})}function wf(n,e){const t=Cn(n.value,e.value);return t!==0?t:n.inclusive&&!e.inclusive?-1:!n.inclusive&&e.inclusive?1:0}function Tf(n,e){const t=Cn(n.value,e.value);return t!==0?t:n.inclusive&&!e.inclusive?1:!n.inclusive&&e.inclusive?-1:0}/**
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
 */class xe{constructor(e){this.value=e}static empty(){return new xe({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let r=0;r<e.length-1;++r)if(t=(t.mapValue.fields||{})[e.get(r)],!Bo(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=ii(t)}setAll(e){let t=me.emptyPath(),r={},s=[];e.forEach((o,c)=>{if(!t.isImmediateParentOf(c)){const u=this.getFieldsMap(t);this.applyChanges(u,r,s),r={},s=[],t=c.popLast()}o?r[c.lastSegment()]=ii(o):s.push(c.lastSegment())});const i=this.getFieldsMap(t);this.applyChanges(i,r,s)}delete(e){const t=this.field(e.popLast());Bo(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return xt(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let r=0;r<e.length;++r){let s=t.mapValue.fields[e.get(r)];Bo(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},t.mapValue.fields[e.get(r)]=s),t=s}return t.mapValue.fields}applyChanges(e,t,r){Mn(t,(s,i)=>e[s]=i);for(const s of r)delete e[s]}clone(){return new xe(ii(this.value))}}function vg(n){const e=[];return Mn(n.fields,(t,r)=>{const s=new me([t]);if(Bo(r)){const i=vg(r.mapValue).fields;if(i.length===0)e.push(s);else for(const o of i)e.push(s.child(o))}else e.push(s)}),new Ze(e)}/**
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
 */class he{constructor(e,t,r,s,i,o,c){this.key=e,this.documentType=t,this.version=r,this.readTime=s,this.createTime=i,this.data=o,this.documentState=c}static newInvalidDocument(e){return new he(e,0,j.min(),j.min(),j.min(),xe.empty(),0)}static newFoundDocument(e,t,r,s){return new he(e,1,t,j.min(),r,s,0)}static newNoDocument(e,t){return new he(e,2,t,j.min(),j.min(),xe.empty(),0)}static newUnknownDocument(e,t){return new he(e,3,t,j.min(),j.min(),xe.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(j.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=xe.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=xe.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=j.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof he&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new he(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class kn{constructor(e,t){this.position=e,this.inclusive=t}}function vf(n,e,t){let r=0;for(let s=0;s<n.position.length;s++){const i=e[s],o=n.position[s];if(i.field.isKeyField()?r=x.comparator(x.fromName(o.referenceValue),t.key):r=Cn(o,t.data.field(i.field)),i.dir==="desc"&&(r*=-1),r!==0)break}return r}function Af(n,e){if(n===null)return e===null;if(e===null||n.inclusive!==e.inclusive||n.position.length!==e.position.length)return!1;for(let t=0;t<n.position.length;t++)if(!xt(n.position[t],e.position[t]))return!1;return!0}/**
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
 */class Ai{constructor(e,t="asc"){this.field=e,this.dir=t}}function bv(n,e){return n.dir===e.dir&&n.field.isEqual(e.field)}/**
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
 */class Ag{}class Z extends Ag{constructor(e,t,r){super(),this.field=e,this.op=t,this.value=r}static create(e,t,r){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,r):new Sv(e,t,r):t==="array-contains"?new kv(e,r):t==="in"?new kg(e,r):t==="not-in"?new Nv(e,r):t==="array-contains-any"?new Dv(e,r):new Z(e,t,r)}static createKeyFieldInFilter(e,t,r){return t==="in"?new Pv(e,r):new Cv(e,r)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(Cn(t,this.value)):t!==null&&Pn(this.value)===Pn(t)&&this.matchesComparison(Cn(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return L(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class se extends Ag{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null}static create(e,t){return new se(e,t)}matches(e){return Zr(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function Zr(n){return n.op==="and"}function Ou(n){return n.op==="or"}function Il(n){return Rg(n)&&Zr(n)}function Rg(n){for(const e of n.filters)if(e instanceof se)return!1;return!0}function xu(n){if(n instanceof Z)return n.field.canonicalString()+n.op.toString()+Xr(n.value);if(Il(n))return n.filters.map(e=>xu(e)).join(",");{const e=n.filters.map(t=>xu(t)).join(",");return`${n.op}(${e})`}}function bg(n,e){return n instanceof Z?function(r,s){return s instanceof Z&&r.op===s.op&&r.field.isEqual(s.field)&&xt(r.value,s.value)}(n,e):n instanceof se?function(r,s){return s instanceof se&&r.op===s.op&&r.filters.length===s.filters.length?r.filters.reduce((i,o,c)=>i&&bg(o,s.filters[c]),!0):!1}(n,e):void L(19439)}function Sg(n,e){const t=n.filters.concat(e);return se.create(t,n.op)}function Pg(n){return n instanceof Z?function(t){return`${t.field.canonicalString()} ${t.op} ${Xr(t.value)}`}(n):n instanceof se?function(t){return t.op.toString()+" {"+t.getFilters().map(Pg).join(" ,")+"}"}(n):"Filter"}class Sv extends Z{constructor(e,t,r){super(e,t,r),this.key=x.fromName(r.referenceValue)}matches(e){const t=x.comparator(e.key,this.key);return this.matchesComparison(t)}}class Pv extends Z{constructor(e,t){super(e,"in",t),this.keys=Cg("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class Cv extends Z{constructor(e,t){super(e,"not-in",t),this.keys=Cg("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function Cg(n,e){var t;return(((t=e.arrayValue)==null?void 0:t.values)||[]).map(r=>x.fromName(r.referenceValue))}class kv extends Z{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return vi(t)&&Ti(t.arrayValue,this.value)}}class kg extends Z{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&Ti(this.value.arrayValue,t)}}class Nv extends Z{constructor(e,t){super(e,"not-in",t)}matches(e){if(Ti(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!Ti(this.value.arrayValue,t)}}class Dv extends Z{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!vi(t)||!t.arrayValue.values)&&t.arrayValue.values.some(r=>Ti(this.value.arrayValue,r))}}/**
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
 */class Vv{constructor(e,t=null,r=[],s=[],i=null,o=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=r,this.filters=s,this.limit=i,this.startAt=o,this.endAt=c,this.Te=null}}function Mu(n,e=null,t=[],r=[],s=null,i=null,o=null){return new Vv(n,e,t,r,s,i,o)}function ir(n){const e=F(n);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(r=>xu(r)).join(","),t+="|ob:",t+=e.orderBy.map(r=>function(i){return i.field.canonicalString()+i.dir}(r)).join(","),Bi(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(r=>Xr(r)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(r=>Xr(r)).join(",")),e.Te=t}return e.Te}function $i(n,e){if(n.limit!==e.limit||n.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<n.orderBy.length;t++)if(!bv(n.orderBy[t],e.orderBy[t]))return!1;if(n.filters.length!==e.filters.length)return!1;for(let t=0;t<n.filters.length;t++)if(!bg(n.filters[t],e.filters[t]))return!1;return n.collectionGroup===e.collectionGroup&&!!n.path.isEqual(e.path)&&!!Af(n.startAt,e.startAt)&&Af(n.endAt,e.endAt)}function ra(n){return x.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0}function sa(n,e){return n.filters.filter(t=>t instanceof Z&&t.field.isEqual(e))}function Rf(n,e,t){let r=Uo,s=!0;for(const i of sa(n,e)){let o=Uo,c=!0;switch(i.op){case"<":case"<=":o=Av(i.value);break;case"==":case"in":case">=":o=i.value;break;case">":o=i.value,c=!1;break;case"!=":case"not-in":o=Uo}wf({value:r,inclusive:s},{value:o,inclusive:c})<0&&(r=o,s=c)}if(t!==null){for(let i=0;i<n.orderBy.length;++i)if(n.orderBy[i].field.isEqual(e)){const o=t.position[i];wf({value:r,inclusive:s},{value:o,inclusive:t.inclusive})<0&&(r=o,s=t.inclusive);break}}return{value:r,inclusive:s}}function bf(n,e,t){let r=gn,s=!0;for(const i of sa(n,e)){let o=gn,c=!0;switch(i.op){case">=":case">":o=Rv(i.value),c=!1;break;case"==":case"in":case"<=":o=i.value;break;case"<":o=i.value,c=!1;break;case"!=":case"not-in":o=gn}Tf({value:r,inclusive:s},{value:o,inclusive:c})>0&&(r=o,s=c)}if(t!==null){for(let i=0;i<n.orderBy.length;++i)if(n.orderBy[i].field.isEqual(e)){const o=t.position[i];Tf({value:r,inclusive:s},{value:o,inclusive:t.inclusive})>0&&(r=o,s=t.inclusive);break}}return{value:r,inclusive:s}}/**
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
 */class _r{constructor(e,t=null,r=[],s=[],i=null,o="F",c=null,u=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=r,this.filters=s,this.limit=i,this.limitType=o,this.startAt=c,this.endAt=u,this.Ie=null,this.Ee=null,this.Re=null,this.startAt,this.endAt}}function Ng(n,e,t,r,s,i,o,c){return new _r(n,e,t,r,s,i,o,c)}function ji(n){return new _r(n)}function Sf(n){return n.filters.length===0&&n.limit===null&&n.startAt==null&&n.endAt==null&&(n.explicitOrderBy.length===0||n.explicitOrderBy.length===1&&n.explicitOrderBy[0].field.isKeyField())}function Ov(n){return x.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0}function El(n){return n.collectionGroup!==null}function Lr(n){const e=F(n);if(e.Ie===null){e.Ie=[];const t=new Set;for(const i of e.explicitOrderBy)e.Ie.push(i),t.add(i.field.canonicalString());const r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let c=new ie(me.comparator);return o.filters.forEach(u=>{u.getFlattenedFilters().forEach(l=>{l.isInequality()&&(c=c.add(l.field))})}),c})(e).forEach(i=>{t.has(i.canonicalString())||i.isKeyField()||e.Ie.push(new Ai(i,r))}),t.has(me.keyField().canonicalString())||e.Ie.push(new Ai(me.keyField(),r))}return e.Ie}function lt(n){const e=F(n);return e.Ee||(e.Ee=Dg(e,Lr(n))),e.Ee}function xv(n){const e=F(n);return e.Re||(e.Re=Dg(e,n.explicitOrderBy)),e.Re}function Dg(n,e){if(n.limitType==="F")return Mu(n.path,n.collectionGroup,e,n.filters,n.limit,n.startAt,n.endAt);{e=e.map(s=>{const i=s.dir==="desc"?"asc":"desc";return new Ai(s.field,i)});const t=n.endAt?new kn(n.endAt.position,n.endAt.inclusive):null,r=n.startAt?new kn(n.startAt.position,n.startAt.inclusive):null;return Mu(n.path,n.collectionGroup,e,n.filters,n.limit,t,r)}}function Lu(n,e){const t=n.filters.concat([e]);return new _r(n.path,n.collectionGroup,n.explicitOrderBy.slice(),t,n.limit,n.limitType,n.startAt,n.endAt)}function Mv(n,e){const t=n.explicitOrderBy.concat([e]);return new _r(n.path,n.collectionGroup,t,n.filters.slice(),n.limit,n.limitType,n.startAt,n.endAt)}function ia(n,e,t){return new _r(n.path,n.collectionGroup,n.explicitOrderBy.slice(),n.filters.slice(),e,t,n.startAt,n.endAt)}function Lv(n,e){return new _r(n.path,n.collectionGroup,n.explicitOrderBy.slice(),n.filters.slice(),n.limit,n.limitType,e,n.endAt)}function Fa(n,e){return $i(lt(n),lt(e))&&n.limitType===e.limitType}function Vg(n){return`${ir(lt(n))}|lt:${n.limitType}`}function Nr(n){return`Query(target=${function(t){let r=t.path.canonicalString();return t.collectionGroup!==null&&(r+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(r+=`, filters: [${t.filters.map(s=>Pg(s)).join(", ")}]`),Bi(t.limit)||(r+=", limit: "+t.limit),t.orderBy.length>0&&(r+=`, orderBy: [${t.orderBy.map(s=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(s)).join(", ")}]`),t.startAt&&(r+=", startAt: ",r+=t.startAt.inclusive?"b:":"a:",r+=t.startAt.position.map(s=>Xr(s)).join(",")),t.endAt&&(r+=", endAt: ",r+=t.endAt.inclusive?"a:":"b:",r+=t.endAt.position.map(s=>Xr(s)).join(",")),`Target(${r})`}(lt(n))}; limitType=${n.limitType})`}function Hi(n,e){return e.isFoundDocument()&&function(r,s){const i=s.key.path;return r.collectionGroup!==null?s.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(i):x.isDocumentKey(r.path)?r.path.isEqual(i):r.path.isImmediateParentOf(i)}(n,e)&&function(r,s){for(const i of Lr(r))if(!i.field.isKeyField()&&s.data.field(i.field)===null)return!1;return!0}(n,e)&&function(r,s){for(const i of r.filters)if(!i.matches(s))return!1;return!0}(n,e)&&function(r,s){return!(r.startAt&&!function(o,c,u){const l=vf(o,c,u);return o.inclusive?l<=0:l<0}(r.startAt,Lr(r),s)||r.endAt&&!function(o,c,u){const l=vf(o,c,u);return o.inclusive?l>=0:l>0}(r.endAt,Lr(r),s))}(n,e)}function Og(n){return n.collectionGroup||(n.path.length%2==1?n.path.lastSegment():n.path.get(n.path.length-2))}function xg(n){return(e,t)=>{let r=!1;for(const s of Lr(n)){const i=Uv(s,e,t);if(i!==0)return i;r=r||s.field.isKeyField()}return 0}}function Uv(n,e,t){const r=n.field.isKeyField()?x.comparator(e.key,t.key):function(i,o,c){const u=o.data.field(i),l=c.data.field(i);return u!==null&&l!==null?Cn(u,l):L(42886)}(n.field,e,t);switch(n.dir){case"asc":return r;case"desc":return-1*r;default:return L(19790,{direction:n.dir})}}/**
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
 */class Yt{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r!==void 0){for(const[s,i]of r)if(this.equalsFn(s,e))return i}}has(e){return this.get(e)!==void 0}set(e,t){const r=this.mapKeyFn(e),s=this.inner[r];if(s===void 0)return this.inner[r]=[[e,t]],void this.innerSize++;for(let i=0;i<s.length;i++)if(this.equalsFn(s[i][0],e))return void(s[i]=[e,t]);s.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r===void 0)return!1;for(let s=0;s<r.length;s++)if(this.equalsFn(r[s][0],e))return r.length===1?delete this.inner[t]:r.splice(s,1),this.innerSize--,!0;return!1}forEach(e){Mn(this.inner,(t,r)=>{for(const[s,i]of r)e(s,i)})}isEmpty(){return pg(this.inner)}size(){return this.innerSize}}/**
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
 */const Fv=new ae(x.comparator);function ct(){return Fv}const Mg=new ae(x.comparator);function Qs(...n){let e=Mg;for(const t of n)e=e.insert(t.key,t);return e}function Lg(n){let e=Mg;return n.forEach((t,r)=>e=e.insert(t,r.overlayedDocument)),e}function Dt(){return oi()}function Ug(){return oi()}function oi(){return new Yt(n=>n.toString(),(n,e)=>n.isEqual(e))}const Bv=new ae(x.comparator),qv=new ie(x.comparator);function J(...n){let e=qv;for(const t of n)e=e.add(t);return e}const $v=new ie(z);function wl(){return $v}/**
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
 */function Tl(n,e){if(n.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:_i(e)?"-0":e}}function Fg(n){return{integerValue:""+n}}function Bg(n,e){return rg(e)?Fg(e):Tl(n,e)}/**
 * @license
 * Copyright 2018 Google LLC
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
 */class Ba{constructor(){this._=void 0}}function jv(n,e,t){return n instanceof Ri?function(s,i){const o={fields:{[_g]:{stringValue:gg},[Ig]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return i&&Ma(i)&&(i=La(i)),i&&(o.fields[yg]=i),{mapValue:o}}(t,e):n instanceof es?$g(n,e):n instanceof ts?jg(n,e):function(s,i){const o=qg(s,i),c=Pf(o)+Pf(s.Ae);return Vu(o)&&Vu(s.Ae)?Fg(c):Tl(s.serializer,c)}(n,e)}function Hv(n,e,t){return n instanceof es?$g(n,e):n instanceof ts?jg(n,e):t}function qg(n,e){return n instanceof ns?function(r){return Vu(r)||function(i){return!!i&&"doubleValue"in i}(r)}(e)?e:{integerValue:0}:null}class Ri extends Ba{}class es extends Ba{constructor(e){super(),this.elements=e}}function $g(n,e){const t=Hg(e);for(const r of n.elements)t.some(s=>xt(s,r))||t.push(r);return{arrayValue:{values:t}}}class ts extends Ba{constructor(e){super(),this.elements=e}}function jg(n,e){let t=Hg(e);for(const r of n.elements)t=t.filter(s=>!xt(s,r));return{arrayValue:{values:t}}}class ns extends Ba{constructor(e,t){super(),this.serializer=e,this.Ae=t}}function Pf(n){return le(n.integerValue||n.doubleValue)}function Hg(n){return vi(n)&&n.arrayValue.values?n.arrayValue.values.slice():[]}/**
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
 */class Gg{constructor(e,t){this.field=e,this.transform=t}}function Gv(n,e){return n.field.isEqual(e.field)&&function(r,s){return r instanceof es&&s instanceof es||r instanceof ts&&s instanceof ts?Gr(r.elements,s.elements,xt):r instanceof ns&&s instanceof ns?xt(r.Ae,s.Ae):r instanceof Ri&&s instanceof Ri}(n.transform,e.transform)}class zv{constructor(e,t){this.version=e,this.transformResults=t}}class de{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new de}static exists(e){return new de(void 0,e)}static updateTime(e){return new de(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function qo(n,e){return n.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(n.updateTime):n.exists===void 0||n.exists===e.isFoundDocument()}class qa{}function zg(n,e){if(!n.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return n.isNoDocument()?new fs(n.key,de.none()):new ds(n.key,n.data,de.none());{const t=n.data,r=xe.empty();let s=new ie(me.comparator);for(let i of e.fields)if(!s.has(i)){let o=t.field(i);o===null&&i.length>1&&(i=i.popLast(),o=t.field(i)),o===null?r.delete(i):r.set(i,o),s=s.add(i)}return new Xt(n.key,r,new Ze(s.toArray()),de.none())}}function Wv(n,e,t){n instanceof ds?function(s,i,o){const c=s.value.clone(),u=kf(s.fieldTransforms,i,o.transformResults);c.setAll(u),i.convertToFoundDocument(o.version,c).setHasCommittedMutations()}(n,e,t):n instanceof Xt?function(s,i,o){if(!qo(s.precondition,i))return void i.convertToUnknownDocument(o.version);const c=kf(s.fieldTransforms,i,o.transformResults),u=i.data;u.setAll(Wg(s)),u.setAll(c),i.convertToFoundDocument(o.version,u).setHasCommittedMutations()}(n,e,t):function(s,i,o){i.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,t)}function ai(n,e,t,r){return n instanceof ds?function(i,o,c,u){if(!qo(i.precondition,o))return c;const l=i.value.clone(),d=Nf(i.fieldTransforms,u,o);return l.setAll(d),o.convertToFoundDocument(o.version,l).setHasLocalMutations(),null}(n,e,t,r):n instanceof Xt?function(i,o,c,u){if(!qo(i.precondition,o))return c;const l=Nf(i.fieldTransforms,u,o),d=o.data;return d.setAll(Wg(i)),d.setAll(l),o.convertToFoundDocument(o.version,d).setHasLocalMutations(),c===null?null:c.unionWith(i.fieldMask.fields).unionWith(i.fieldTransforms.map(p=>p.field))}(n,e,t,r):function(i,o,c){return qo(i.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):c}(n,e,t)}function Kv(n,e){let t=null;for(const r of n.fieldTransforms){const s=e.data.field(r.field),i=qg(r.transform,s||null);i!=null&&(t===null&&(t=xe.empty()),t.set(r.field,i))}return t||null}function Cf(n,e){return n.type===e.type&&!!n.key.isEqual(e.key)&&!!n.precondition.isEqual(e.precondition)&&!!function(r,s){return r===void 0&&s===void 0||!(!r||!s)&&Gr(r,s,(i,o)=>Gv(i,o))}(n.fieldTransforms,e.fieldTransforms)&&(n.type===0?n.value.isEqual(e.value):n.type!==1||n.data.isEqual(e.data)&&n.fieldMask.isEqual(e.fieldMask))}class ds extends qa{constructor(e,t,r,s=[]){super(),this.key=e,this.value=t,this.precondition=r,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class Xt extends qa{constructor(e,t,r,s,i=[]){super(),this.key=e,this.data=t,this.fieldMask=r,this.precondition=s,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function Wg(n){const e=new Map;return n.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){const r=n.data.field(t);e.set(t,r)}}),e}function kf(n,e,t){const r=new Map;B(n.length===t.length,32656,{Ve:t.length,de:n.length});for(let s=0;s<t.length;s++){const i=n[s],o=i.transform,c=e.data.field(i.field);r.set(i.field,Hv(o,c,t[s]))}return r}function Nf(n,e,t){const r=new Map;for(const s of n){const i=s.transform,o=t.data.field(s.field);r.set(s.field,jv(i,o,e))}return r}class fs extends qa{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class vl extends qa{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
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
 */class Al{constructor(e,t,r,s){this.batchId=e,this.localWriteTime=t,this.baseMutations=r,this.mutations=s}applyToRemoteDocument(e,t){const r=t.mutationResults;for(let s=0;s<this.mutations.length;s++){const i=this.mutations[s];i.key.isEqual(e.key)&&Wv(i,e,r[s])}}applyToLocalView(e,t){for(const r of this.baseMutations)r.key.isEqual(e.key)&&(t=ai(r,e,t,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(e.key)&&(t=ai(r,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const r=Ug();return this.mutations.forEach(s=>{const i=e.get(s.key),o=i.overlayedDocument;let c=this.applyToLocalView(o,i.mutatedFields);c=t.has(s.key)?null:c;const u=zg(o,c);u!==null&&r.set(s.key,u),o.isValidDocument()||o.convertToNoDocument(j.min())}),r}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),J())}isEqual(e){return this.batchId===e.batchId&&Gr(this.mutations,e.mutations,(t,r)=>Cf(t,r))&&Gr(this.baseMutations,e.baseMutations,(t,r)=>Cf(t,r))}}class Rl{constructor(e,t,r,s){this.batch=e,this.commitVersion=t,this.mutationResults=r,this.docVersions=s}static from(e,t,r){B(e.mutations.length===r.length,58842,{me:e.mutations.length,fe:r.length});let s=function(){return Bv}();const i=e.mutations;for(let o=0;o<i.length;o++)s=s.insert(i[o].key,r[o].version);return new Rl(e,t,r,s)}}/**
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
 */class bl{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2023 Google LLC
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
 */class Qv{constructor(e,t,r){this.alias=e,this.aggregateType=t,this.fieldPath=r}}/**
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
 */class Jv{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
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
 */var Te,ee;function Kg(n){switch(n){case S.OK:return L(64938);case S.CANCELLED:case S.UNKNOWN:case S.DEADLINE_EXCEEDED:case S.RESOURCE_EXHAUSTED:case S.INTERNAL:case S.UNAVAILABLE:case S.UNAUTHENTICATED:return!1;case S.INVALID_ARGUMENT:case S.NOT_FOUND:case S.ALREADY_EXISTS:case S.PERMISSION_DENIED:case S.FAILED_PRECONDITION:case S.ABORTED:case S.OUT_OF_RANGE:case S.UNIMPLEMENTED:case S.DATA_LOSS:return!0;default:return L(15467,{code:n})}}function Qg(n){if(n===void 0)return Ie("GRPC error has no .code"),S.UNKNOWN;switch(n){case Te.OK:return S.OK;case Te.CANCELLED:return S.CANCELLED;case Te.UNKNOWN:return S.UNKNOWN;case Te.DEADLINE_EXCEEDED:return S.DEADLINE_EXCEEDED;case Te.RESOURCE_EXHAUSTED:return S.RESOURCE_EXHAUSTED;case Te.INTERNAL:return S.INTERNAL;case Te.UNAVAILABLE:return S.UNAVAILABLE;case Te.UNAUTHENTICATED:return S.UNAUTHENTICATED;case Te.INVALID_ARGUMENT:return S.INVALID_ARGUMENT;case Te.NOT_FOUND:return S.NOT_FOUND;case Te.ALREADY_EXISTS:return S.ALREADY_EXISTS;case Te.PERMISSION_DENIED:return S.PERMISSION_DENIED;case Te.FAILED_PRECONDITION:return S.FAILED_PRECONDITION;case Te.ABORTED:return S.ABORTED;case Te.OUT_OF_RANGE:return S.OUT_OF_RANGE;case Te.UNIMPLEMENTED:return S.UNIMPLEMENTED;case Te.DATA_LOSS:return S.DATA_LOSS;default:return L(39323,{code:n})}}(ee=Te||(Te={}))[ee.OK=0]="OK",ee[ee.CANCELLED=1]="CANCELLED",ee[ee.UNKNOWN=2]="UNKNOWN",ee[ee.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",ee[ee.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",ee[ee.NOT_FOUND=5]="NOT_FOUND",ee[ee.ALREADY_EXISTS=6]="ALREADY_EXISTS",ee[ee.PERMISSION_DENIED=7]="PERMISSION_DENIED",ee[ee.UNAUTHENTICATED=16]="UNAUTHENTICATED",ee[ee.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",ee[ee.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",ee[ee.ABORTED=10]="ABORTED",ee[ee.OUT_OF_RANGE=11]="OUT_OF_RANGE",ee[ee.UNIMPLEMENTED=12]="UNIMPLEMENTED",ee[ee.INTERNAL=13]="INTERNAL",ee[ee.UNAVAILABLE=14]="UNAVAILABLE",ee[ee.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2023 Google LLC
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
 */function Yv(){return new TextEncoder}/**
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
 */const Xv=new wn([4294967295,4294967295],0);function Df(n){const e=Yv().encode(n),t=new qm;return t.update(e),new Uint8Array(t.digest())}function Vf(n){const e=new DataView(n.buffer),t=e.getUint32(0,!0),r=e.getUint32(4,!0),s=e.getUint32(8,!0),i=e.getUint32(12,!0);return[new wn([t,r],0),new wn([s,i],0)]}class Sl{constructor(e,t,r){if(this.bitmap=e,this.padding=t,this.hashCount=r,t<0||t>=8)throw new Js(`Invalid padding: ${t}`);if(r<0)throw new Js(`Invalid hash count: ${r}`);if(e.length>0&&this.hashCount===0)throw new Js(`Invalid hash count: ${r}`);if(e.length===0&&t!==0)throw new Js(`Invalid padding when bitmap length is 0: ${t}`);this.ge=8*e.length-t,this.pe=wn.fromNumber(this.ge)}ye(e,t,r){let s=e.add(t.multiply(wn.fromNumber(r)));return s.compare(Xv)===1&&(s=new wn([s.getBits(0),s.getBits(1)],0)),s.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const t=Df(e),[r,s]=Vf(t);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);if(!this.we(o))return!1}return!0}static create(e,t,r){const s=e%8==0?0:8-e%8,i=new Uint8Array(Math.ceil(e/8)),o=new Sl(i,s,t);return r.forEach(c=>o.insert(c)),o}insert(e){if(this.ge===0)return;const t=Df(e),[r,s]=Vf(t);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);this.be(o)}}be(e){const t=Math.floor(e/8),r=e%8;this.bitmap[t]|=1<<r}}class Js extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
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
 */class Gi{constructor(e,t,r,s,i){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=r,this.documentUpdates=s,this.resolvedLimboDocuments=i}static createSynthesizedRemoteEventForCurrentChange(e,t,r){const s=new Map;return s.set(e,zi.createSynthesizedTargetChangeForCurrentChange(e,t,r)),new Gi(j.min(),s,new ae(z),ct(),J())}}class zi{constructor(e,t,r,s,i){this.resumeToken=e,this.current=t,this.addedDocuments=r,this.modifiedDocuments=s,this.removedDocuments=i}static createSynthesizedTargetChangeForCurrentChange(e,t,r){return new zi(r,t,J(),J(),J())}}/**
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
 */class $o{constructor(e,t,r,s){this.Se=e,this.removedTargetIds=t,this.key=r,this.De=s}}class Jg{constructor(e,t){this.targetId=e,this.Ce=t}}class Yg{constructor(e,t,r=we.EMPTY_BYTE_STRING,s=null){this.state=e,this.targetIds=t,this.resumeToken=r,this.cause=s}}class Of{constructor(){this.ve=0,this.Fe=xf(),this.Me=we.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=J(),t=J(),r=J();return this.Fe.forEach((s,i)=>{switch(i){case 0:e=e.add(s);break;case 2:t=t.add(s);break;case 1:r=r.add(s);break;default:L(38017,{changeType:i})}}),new zi(this.Me,this.xe,e,t,r)}Ke(){this.Oe=!1,this.Fe=xf()}qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t)}Ue(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}$e(){this.ve+=1}We(){this.ve-=1,B(this.ve>=0,3241,{ve:this.ve})}Qe(){this.Oe=!0,this.xe=!0}}class Zv{constructor(e){this.Ge=e,this.ze=new Map,this.je=ct(),this.He=vo(),this.Je=vo(),this.Ze=new ae(z)}Xe(e){for(const t of e.Se)e.De&&e.De.isFoundDocument()?this.Ye(t,e.De):this.et(t,e.key,e.De);for(const t of e.removedTargetIds)this.et(t,e.key,e.De)}tt(e){this.forEachTarget(e,t=>{const r=this.nt(t);switch(e.state){case 0:this.rt(t)&&r.Le(e.resumeToken);break;case 1:r.We(),r.Ne||r.Ke(),r.Le(e.resumeToken);break;case 2:r.We(),r.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(r.Qe(),r.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),r.Le(e.resumeToken));break;default:L(56790,{state:e.state})}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach((r,s)=>{this.rt(s)&&t(s)})}st(e){const t=e.targetId,r=e.Ce.count,s=this.ot(t);if(s){const i=s.target;if(ra(i))if(r===0){const o=new x(i.path);this.et(t,o,he.newNoDocument(o,j.min()))}else B(r===1,20013,{expectedCount:r});else{const o=this._t(t);if(o!==r){const c=this.ut(e),u=c?this.ct(c,e,o):1;if(u!==0){this.it(t);const l=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ze=this.Ze.insert(t,l)}}}}}ut(e){const t=e.Ce.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:r="",padding:s=0},hashCount:i=0}=t;let o,c;try{o=Kt(r).toUint8Array()}catch(u){if(u instanceof mg)return Hr("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{c=new Sl(o,s,i)}catch(u){return Hr(u instanceof Js?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return c.ge===0?null:c}ct(e,t,r){return t.Ce.count===r-this.Pt(e,t.targetId)?0:2}Pt(e,t){const r=this.Ge.getRemoteKeysForTarget(t);let s=0;return r.forEach(i=>{const o=this.Ge.ht(),c=`projects/${o.projectId}/databases/${o.database}/documents/${i.path.canonicalString()}`;e.mightContain(c)||(this.et(t,i,null),s++)}),s}Tt(e){const t=new Map;this.ze.forEach((i,o)=>{const c=this.ot(o);if(c){if(i.current&&ra(c.target)){const u=new x(c.target.path);this.It(u).has(o)||this.Et(o,u)||this.et(o,u,he.newNoDocument(u,e))}i.Be&&(t.set(o,i.ke()),i.Ke())}});let r=J();this.Je.forEach((i,o)=>{let c=!0;o.forEachWhile(u=>{const l=this.ot(u);return!l||l.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)}),c&&(r=r.add(i))}),this.je.forEach((i,o)=>o.setReadTime(e));const s=new Gi(e,t,this.Ze,this.je,r);return this.je=ct(),this.He=vo(),this.Je=vo(),this.Ze=new ae(z),s}Ye(e,t){if(!this.rt(e))return;const r=this.Et(e,t.key)?2:0;this.nt(e).qe(t.key,r),this.je=this.je.insert(t.key,t),this.He=this.He.insert(t.key,this.It(t.key).add(e)),this.Je=this.Je.insert(t.key,this.Rt(t.key).add(e))}et(e,t,r){if(!this.rt(e))return;const s=this.nt(e);this.Et(e,t)?s.qe(t,1):s.Ue(t),this.Je=this.Je.insert(t,this.Rt(t).delete(e)),this.Je=this.Je.insert(t,this.Rt(t).add(e)),r&&(this.je=this.je.insert(t,r))}removeTarget(e){this.ze.delete(e)}_t(e){const t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}$e(e){this.nt(e).$e()}nt(e){let t=this.ze.get(e);return t||(t=new Of,this.ze.set(e,t)),t}Rt(e){let t=this.Je.get(e);return t||(t=new ie(z),this.Je=this.Je.insert(e,t)),t}It(e){let t=this.He.get(e);return t||(t=new ie(z),this.He=this.He.insert(e,t)),t}rt(e){const t=this.ot(e)!==null;return t||D("WatchChangeAggregator","Detected inactive target",e),t}ot(e){const t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new Of),this.Ge.getRemoteKeysForTarget(e).forEach(t=>{this.et(e,t,null)})}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t)}}function vo(){return new ae(x.comparator)}function xf(){return new ae(x.comparator)}const eA={asc:"ASCENDING",desc:"DESCENDING"},tA={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},nA={and:"AND",or:"OR"};class rA{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function Uu(n,e){return n.useProto3Json||Bi(e)?e:{value:e}}function rs(n,e){return n.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function Xg(n,e){return n.useProto3Json?e.toBase64():e.toUint8Array()}function sA(n,e){return rs(n,e.toTimestamp())}function Me(n){return B(!!n,49232),j.fromTimestamp(function(t){const r=Wt(t);return new re(r.seconds,r.nanos)}(n))}function Pl(n,e){return Fu(n,e).canonicalString()}function Fu(n,e){const t=function(s){return new ne(["projects",s.projectId,"databases",s.database])}(n).child("documents");return e===void 0?t:t.child(e)}function Zg(n){const e=ne.fromString(n);return B(a_(e),10190,{key:e.toString()}),e}function bi(n,e){return Pl(n.databaseId,e.path)}function Gt(n,e){const t=Zg(e);if(t.get(1)!==n.databaseId.projectId)throw new V(S.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+n.databaseId.projectId);if(t.get(3)!==n.databaseId.database)throw new V(S.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+n.databaseId.database);return new x(n_(t))}function e_(n,e){return Pl(n.databaseId,e)}function t_(n){const e=Zg(n);return e.length===4?ne.emptyPath():n_(e)}function Bu(n){return new ne(["projects",n.databaseId.projectId,"databases",n.databaseId.database]).canonicalString()}function n_(n){return B(n.length>4&&n.get(4)==="documents",29091,{key:n.toString()}),n.popFirst(5)}function Mf(n,e,t){return{name:bi(n,e),fields:t.value.mapValue.fields}}function iA(n,e,t){const r=Gt(n,e.name),s=Me(e.updateTime),i=e.createTime?Me(e.createTime):j.min(),o=new xe({mapValue:{fields:e.fields}}),c=he.newFoundDocument(r,s,i,o);return t&&c.setHasCommittedMutations(),t?c.setHasCommittedMutations():c}function oA(n,e){return"found"in e?function(r,s){B(!!s.found,43571),s.found.name,s.found.updateTime;const i=Gt(r,s.found.name),o=Me(s.found.updateTime),c=s.found.createTime?Me(s.found.createTime):j.min(),u=new xe({mapValue:{fields:s.found.fields}});return he.newFoundDocument(i,o,c,u)}(n,e):"missing"in e?function(r,s){B(!!s.missing,3894),B(!!s.readTime,22933);const i=Gt(r,s.missing),o=Me(s.readTime);return he.newNoDocument(i,o)}(n,e):L(7234,{result:e})}function aA(n,e){let t;if("targetChange"in e){e.targetChange;const r=function(l){return l==="NO_CHANGE"?0:l==="ADD"?1:l==="REMOVE"?2:l==="CURRENT"?3:l==="RESET"?4:L(39313,{state:l})}(e.targetChange.targetChangeType||"NO_CHANGE"),s=e.targetChange.targetIds||[],i=function(l,d){return l.useProto3Json?(B(d===void 0||typeof d=="string",58123),we.fromBase64String(d||"")):(B(d===void 0||d instanceof Buffer||d instanceof Uint8Array,16193),we.fromUint8Array(d||new Uint8Array))}(n,e.targetChange.resumeToken),o=e.targetChange.cause,c=o&&function(l){const d=l.code===void 0?S.UNKNOWN:Qg(l.code);return new V(d,l.message||"")}(o);t=new Yg(r,s,i,c||null)}else if("documentChange"in e){e.documentChange;const r=e.documentChange;r.document,r.document.name,r.document.updateTime;const s=Gt(n,r.document.name),i=Me(r.document.updateTime),o=r.document.createTime?Me(r.document.createTime):j.min(),c=new xe({mapValue:{fields:r.document.fields}}),u=he.newFoundDocument(s,i,o,c),l=r.targetIds||[],d=r.removedTargetIds||[];t=new $o(l,d,u.key,u)}else if("documentDelete"in e){e.documentDelete;const r=e.documentDelete;r.document;const s=Gt(n,r.document),i=r.readTime?Me(r.readTime):j.min(),o=he.newNoDocument(s,i),c=r.removedTargetIds||[];t=new $o([],c,o.key,o)}else if("documentRemove"in e){e.documentRemove;const r=e.documentRemove;r.document;const s=Gt(n,r.document),i=r.removedTargetIds||[];t=new $o([],i,s,null)}else{if(!("filter"in e))return L(11601,{Vt:e});{e.filter;const r=e.filter;r.targetId;const{count:s=0,unchangedNames:i}=r,o=new Jv(s,i),c=r.targetId;t=new Jg(c,o)}}return t}function Si(n,e){let t;if(e instanceof ds)t={update:Mf(n,e.key,e.value)};else if(e instanceof fs)t={delete:bi(n,e.key)};else if(e instanceof Xt)t={update:Mf(n,e.key,e.data),updateMask:pA(e.fieldMask)};else{if(!(e instanceof vl))return L(16599,{dt:e.type});t={verify:bi(n,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(r=>function(i,o){const c=o.transform;if(c instanceof Ri)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof es)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof ts)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof ns)return{fieldPath:o.field.canonicalString(),increment:c.Ae};throw L(20930,{transform:o.transform})}(0,r))),e.precondition.isNone||(t.currentDocument=function(s,i){return i.updateTime!==void 0?{updateTime:sA(s,i.updateTime)}:i.exists!==void 0?{exists:i.exists}:L(27497)}(n,e.precondition)),t}function qu(n,e){const t=e.currentDocument?function(i){return i.updateTime!==void 0?de.updateTime(Me(i.updateTime)):i.exists!==void 0?de.exists(i.exists):de.none()}(e.currentDocument):de.none(),r=e.updateTransforms?e.updateTransforms.map(s=>function(o,c){let u=null;if("setToServerValue"in c)B(c.setToServerValue==="REQUEST_TIME",16630,{proto:c}),u=new Ri;else if("appendMissingElements"in c){const d=c.appendMissingElements.values||[];u=new es(d)}else if("removeAllFromArray"in c){const d=c.removeAllFromArray.values||[];u=new ts(d)}else"increment"in c?u=new ns(o,c.increment):L(16584,{proto:c});const l=me.fromServerFormat(c.fieldPath);return new Gg(l,u)}(n,s)):[];if(e.update){e.update.name;const s=Gt(n,e.update.name),i=new xe({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=function(u){const l=u.fieldPaths||[];return new Ze(l.map(d=>me.fromServerFormat(d)))}(e.updateMask);return new Xt(s,i,o,t,r)}return new ds(s,i,t,r)}if(e.delete){const s=Gt(n,e.delete);return new fs(s,t)}if(e.verify){const s=Gt(n,e.verify);return new vl(s,t)}return L(1463,{proto:e})}function cA(n,e){return n&&n.length>0?(B(e!==void 0,14353),n.map(t=>function(s,i){let o=s.updateTime?Me(s.updateTime):Me(i);return o.isEqual(j.min())&&(o=Me(i)),new zv(o,s.transformResults||[])}(t,e))):[]}function r_(n,e){return{documents:[e_(n,e.path)]}}function Cl(n,e){const t={structuredQuery:{}},r=e.path;let s;e.collectionGroup!==null?(s=r,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(s=r.popLast(),t.structuredQuery.from=[{collectionId:r.lastSegment()}]),t.parent=e_(n,s);const i=function(l){if(l.length!==0)return o_(se.create(l,"and"))}(e.filters);i&&(t.structuredQuery.where=i);const o=function(l){if(l.length!==0)return l.map(d=>function(m){return{field:pn(m.field),direction:hA(m.dir)}}(d))}(e.orderBy);o&&(t.structuredQuery.orderBy=o);const c=Uu(n,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=function(l){return{before:l.inclusive,values:l.position}}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(l){return{before:!l.inclusive,values:l.position}}(e.endAt)),{ft:t,parent:s}}function uA(n,e,t,r){const{ft:s,parent:i}=Cl(n,e),o={},c=[];let u=0;return t.forEach(l=>{const d="aggregate_"+u++;o[d]=l.alias,l.aggregateType==="count"?c.push({alias:d,count:{}}):l.aggregateType==="avg"?c.push({alias:d,avg:{field:pn(l.fieldPath)}}):l.aggregateType==="sum"&&c.push({alias:d,sum:{field:pn(l.fieldPath)}})}),{request:{structuredAggregationQuery:{aggregations:c,structuredQuery:s.structuredQuery},parent:s.parent},gt:o,parent:i}}function s_(n){let e=t_(n.parent);const t=n.structuredQuery,r=t.from?t.from.length:0;let s=null;if(r>0){B(r===1,65062);const d=t.from[0];d.allDescendants?s=d.collectionId:e=e.child(d.collectionId)}let i=[];t.where&&(i=function(p){const m=i_(p);return m instanceof se&&Il(m)?m.getFilters():[m]}(t.where));let o=[];t.orderBy&&(o=function(p){return p.map(m=>function(C){return new Ai(Dr(C.field),function(k){switch(k){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(C.direction))}(m))}(t.orderBy));let c=null;t.limit&&(c=function(p){let m;return m=typeof p=="object"?p.value:p,Bi(m)?null:m}(t.limit));let u=null;t.startAt&&(u=function(p){const m=!!p.before,T=p.values||[];return new kn(T,m)}(t.startAt));let l=null;return t.endAt&&(l=function(p){const m=!p.before,T=p.values||[];return new kn(T,m)}(t.endAt)),Ng(e,s,o,i,c,"F",u,l)}function lA(n,e){const t=function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return L(28987,{purpose:s})}}(e.purpose);return t==null?null:{"goog-listen-tags":t}}function i_(n){return n.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":const r=Dr(t.unaryFilter.field);return Z.create(r,"==",{doubleValue:NaN});case"IS_NULL":const s=Dr(t.unaryFilter.field);return Z.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const i=Dr(t.unaryFilter.field);return Z.create(i,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Dr(t.unaryFilter.field);return Z.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return L(61313);default:return L(60726)}}(n):n.fieldFilter!==void 0?function(t){return Z.create(Dr(t.fieldFilter.field),function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return L(58110);default:return L(50506)}}(t.fieldFilter.op),t.fieldFilter.value)}(n):n.compositeFilter!==void 0?function(t){return se.create(t.compositeFilter.filters.map(r=>i_(r)),function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return L(1026)}}(t.compositeFilter.op))}(n):L(30097,{filter:n})}function hA(n){return eA[n]}function dA(n){return tA[n]}function fA(n){return nA[n]}function pn(n){return{fieldPath:n.canonicalString()}}function Dr(n){return me.fromServerFormat(n.fieldPath)}function o_(n){return n instanceof Z?function(t){if(t.op==="=="){if(Ef(t.value))return{unaryFilter:{field:pn(t.field),op:"IS_NAN"}};if(If(t.value))return{unaryFilter:{field:pn(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(Ef(t.value))return{unaryFilter:{field:pn(t.field),op:"IS_NOT_NAN"}};if(If(t.value))return{unaryFilter:{field:pn(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:pn(t.field),op:dA(t.op),value:t.value}}}(n):n instanceof se?function(t){const r=t.getFilters().map(s=>o_(s));return r.length===1?r[0]:{compositeFilter:{op:fA(t.op),filters:r}}}(n):L(54877,{filter:n})}function pA(n){const e=[];return n.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function a_(n){return n.length>=4&&n.get(0)==="projects"&&n.get(2)==="databases"}function c_(n){return!!n&&typeof n._toProto=="function"&&n._protoValueType==="ProtoValue"}/**
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
 */class qt{constructor(e,t,r,s,i=j.min(),o=j.min(),c=we.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=t,this.purpose=r,this.sequenceNumber=s,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=c,this.expectedCount=u}withSequenceNumber(e){return new qt(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new qt(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new qt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new qt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
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
 */class u_{constructor(e){this.yt=e}}function mA(n,e){let t;if(e.document)t=iA(n.yt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const r=x.fromSegments(e.noDocument.path),s=ar(e.noDocument.readTime);t=he.newNoDocument(r,s),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return L(56709);{const r=x.fromSegments(e.unknownDocument.path),s=ar(e.unknownDocument.version);t=he.newUnknownDocument(r,s)}}return e.readTime&&t.setReadTime(function(s){const i=new re(s[0],s[1]);return j.fromTimestamp(i)}(e.readTime)),t}function Lf(n,e){const t=e.key,r={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:oa(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())r.document=function(i,o){return{name:bi(i,o.key),fields:o.data.value.mapValue.fields,updateTime:rs(i,o.version.toTimestamp()),createTime:rs(i,o.createTime.toTimestamp())}}(n.yt,e);else if(e.isNoDocument())r.noDocument={path:t.path.toArray(),readTime:or(e.version)};else{if(!e.isUnknownDocument())return L(57904,{document:e});r.unknownDocument={path:t.path.toArray(),version:or(e.version)}}return r}function oa(n){const e=n.toTimestamp();return[e.seconds,e.nanoseconds]}function or(n){const e=n.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function ar(n){const e=new re(n.seconds,n.nanoseconds);return j.fromTimestamp(e)}function Kn(n,e){const t=(e.baseMutations||[]).map(i=>qu(n.yt,i));for(let i=0;i<e.mutations.length-1;++i){const o=e.mutations[i];if(i+1<e.mutations.length&&e.mutations[i+1].transform!==void 0){const c=e.mutations[i+1];o.updateTransforms=c.transform.fieldTransforms,e.mutations.splice(i+1,1),++i}}const r=e.mutations.map(i=>qu(n.yt,i)),s=re.fromMillis(e.localWriteTimeMs);return new Al(e.batchId,s,t,r)}function Ys(n){const e=ar(n.readTime),t=n.lastLimboFreeSnapshotVersion!==void 0?ar(n.lastLimboFreeSnapshotVersion):j.min();let r;return r=function(i){return i.documents!==void 0}(n.query)?function(i){const o=i.documents.length;return B(o===1,1966,{count:o}),lt(ji(t_(i.documents[0])))}(n.query):function(i){return lt(s_(i))}(n.query),new qt(r,n.targetId,"TargetPurposeListen",n.lastListenSequenceNumber,e,t,we.fromBase64String(n.resumeToken))}function l_(n,e){const t=or(e.snapshotVersion),r=or(e.lastLimboFreeSnapshotVersion);let s;s=ra(e.target)?r_(n.yt,e.target):Cl(n.yt,e.target).ft;const i=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:ir(e.target),readTime:t,resumeToken:i,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:r,query:s}}function h_(n){const e=s_({parent:n.parent,structuredQuery:n.structuredQuery});return n.limitType==="LAST"?ia(e,e.limit,"L"):e}function Qc(n,e){return new bl(e.largestBatchId,qu(n.yt,e.overlayMutation))}function Uf(n,e){const t=e.path.lastSegment();return[n,Ge(e.path.popLast()),t]}function Ff(n,e,t,r){return{indexId:n,uid:e,sequenceNumber:t,readTime:or(r.readTime),documentKey:Ge(r.documentKey.path),largestBatchId:r.largestBatchId}}/**
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
 */class gA{getBundleMetadata(e,t){return Bf(e).get(t).next(r=>{if(r)return function(i){return{id:i.bundleId,createTime:ar(i.createTime),version:i.version}}(r)})}saveBundleMetadata(e,t){return Bf(e).put(function(s){return{bundleId:s.id,createTime:or(Me(s.createTime)),version:s.version}}(t))}getNamedQuery(e,t){return qf(e).get(t).next(r=>{if(r)return function(i){return{name:i.name,query:h_(i.bundledQuery),readTime:ar(i.readTime)}}(r)})}saveNamedQuery(e,t){return qf(e).put(function(s){return{name:s.name,readTime:or(Me(s.readTime)),bundledQuery:s.bundledQuery}}(t))}}function Bf(n){return Ce(n,Va)}function qf(n){return Ce(n,Oa)}/**
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
 */class $a{constructor(e,t){this.serializer=e,this.userId=t}static wt(e,t){const r=t.uid||"";return new $a(e,r)}getOverlay(e,t){return Us(e).get(Uf(this.userId,t)).next(r=>r?Qc(this.serializer,r):null)}getOverlays(e,t){const r=Dt();return A.forEach(t,s=>this.getOverlay(e,s).next(i=>{i!==null&&r.set(s,i)})).next(()=>r)}saveOverlays(e,t,r){const s=[];return r.forEach((i,o)=>{const c=new bl(t,o);s.push(this.bt(e,c))}),A.waitFor(s)}removeOverlaysForBatchId(e,t,r){const s=new Set;t.forEach(o=>s.add(Ge(o.getCollectionPath())));const i=[];return s.forEach(o=>{const c=IDBKeyRange.bound([this.userId,o,r],[this.userId,o,r+1],!1,!0);i.push(Us(e).X(ku,c))}),A.waitFor(i)}getOverlaysForCollection(e,t,r){const s=Dt(),i=Ge(t),o=IDBKeyRange.bound([this.userId,i,r],[this.userId,i,Number.POSITIVE_INFINITY],!0);return Us(e).H(ku,o).next(c=>{for(const u of c){const l=Qc(this.serializer,u);s.set(l.getKey(),l)}return s})}getOverlaysForCollectionGroup(e,t,r,s){const i=Dt();let o;const c=IDBKeyRange.bound([this.userId,t,r],[this.userId,t,Number.POSITIVE_INFINITY],!0);return Us(e).ee({index:ug,range:c},(u,l,d)=>{const p=Qc(this.serializer,l);i.size()<s||p.largestBatchId===o?(i.set(p.getKey(),p),o=p.largestBatchId):d.done()}).next(()=>i)}bt(e,t){return Us(e).put(function(s,i,o){const[c,u,l]=Uf(i,o.mutation.key);return{userId:i,collectionPath:u,documentId:l,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:Si(s.yt,o.mutation)}}(this.serializer,this.userId,t))}}function Us(n){return Ce(n,xa)}/**
 * @license
 * Copyright 2024 Google LLC
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
 */class _A{St(e){return Ce(e,ml)}getSessionToken(e){return this.St(e).get("sessionToken").next(t=>{const r=t==null?void 0:t.value;return r?we.fromUint8Array(r):we.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.St(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
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
 */class Qn{constructor(){}Dt(e,t){this.Ct(e,t),t.vt()}Ct(e,t){if("nullValue"in e)this.Ft(t,5);else if("booleanValue"in e)this.Ft(t,10),t.Mt(e.booleanValue?1:0);else if("integerValue"in e)this.Ft(t,15),t.Mt(le(e.integerValue));else if("doubleValue"in e){const r=le(e.doubleValue);isNaN(r)?this.Ft(t,13):(this.Ft(t,15),_i(r)?t.Mt(0):t.Mt(r))}else if("timestampValue"in e){let r=e.timestampValue;this.Ft(t,20),typeof r=="string"&&(r=Wt(r)),t.xt(`${r.seconds||""}`),t.Mt(r.nanos||0)}else if("stringValue"in e)this.Ot(e.stringValue,t),this.Nt(t);else if("bytesValue"in e)this.Ft(t,30),t.Bt(Kt(e.bytesValue)),this.Nt(t);else if("referenceValue"in e)this.Lt(e.referenceValue,t);else if("geoPointValue"in e){const r=e.geoPointValue;this.Ft(t,45),t.Mt(r.latitude||0),t.Mt(r.longitude||0)}else"mapValue"in e?wg(e)?this.Ft(t,Number.MAX_SAFE_INTEGER):Ua(e)?this.kt(e.mapValue,t):(this.Kt(e.mapValue,t),this.Nt(t)):"arrayValue"in e?(this.qt(e.arrayValue,t),this.Nt(t)):L(19022,{Ut:e})}Ot(e,t){this.Ft(t,25),this.$t(e,t)}$t(e,t){t.xt(e)}Kt(e,t){const r=e.fields||{};this.Ft(t,55);for(const s of Object.keys(r))this.Ot(s,t),this.Ct(r[s],t)}kt(e,t){var o,c;const r=e.fields||{};this.Ft(t,53);const s=Yr,i=((c=(o=r[s].arrayValue)==null?void 0:o.values)==null?void 0:c.length)||0;this.Ft(t,15),t.Mt(le(i)),this.Ot(s,t),this.Ct(r[s],t)}qt(e,t){const r=e.values||[];this.Ft(t,50);for(const s of r)this.Ct(s,t)}Lt(e,t){this.Ft(t,37),x.fromName(e).path.forEach(r=>{this.Ft(t,60),this.$t(r,t)})}Ft(e,t){e.Mt(t)}Nt(e){e.Mt(2)}}Qn.Wt=new Qn;/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rr=255;function yA(n){if(n===0)return 8;let e=0;return n>>4||(e+=4,n<<=4),n>>6||(e+=2,n<<=2),n>>7||(e+=1),e}function $f(n){const e=64-function(r){let s=0;for(let i=0;i<8;++i){const o=yA(255&r[i]);if(s+=o,o!==8)break}return s}(n);return Math.ceil(e/8)}class IA{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Qt(e){const t=e[Symbol.iterator]();let r=t.next();for(;!r.done;)this.Gt(r.value),r=t.next();this.zt()}jt(e){const t=e[Symbol.iterator]();let r=t.next();for(;!r.done;)this.Ht(r.value),r=t.next();this.Jt()}Zt(e){for(const t of e){const r=t.charCodeAt(0);if(r<128)this.Gt(r);else if(r<2048)this.Gt(960|r>>>6),this.Gt(128|63&r);else if(t<"\uD800"||"\uDBFF"<t)this.Gt(480|r>>>12),this.Gt(128|63&r>>>6),this.Gt(128|63&r);else{const s=t.codePointAt(0);this.Gt(240|s>>>18),this.Gt(128|63&s>>>12),this.Gt(128|63&s>>>6),this.Gt(128|63&s)}}this.zt()}Xt(e){for(const t of e){const r=t.charCodeAt(0);if(r<128)this.Ht(r);else if(r<2048)this.Ht(960|r>>>6),this.Ht(128|63&r);else if(t<"\uD800"||"\uDBFF"<t)this.Ht(480|r>>>12),this.Ht(128|63&r>>>6),this.Ht(128|63&r);else{const s=t.codePointAt(0);this.Ht(240|s>>>18),this.Ht(128|63&s>>>12),this.Ht(128|63&s>>>6),this.Ht(128|63&s)}}this.Jt()}Yt(e){const t=this.en(e),r=$f(t);this.tn(1+r),this.buffer[this.position++]=255&r;for(let s=t.length-r;s<t.length;++s)this.buffer[this.position++]=255&t[s]}nn(e){const t=this.en(e),r=$f(t);this.tn(1+r),this.buffer[this.position++]=~(255&r);for(let s=t.length-r;s<t.length;++s)this.buffer[this.position++]=~(255&t[s])}rn(){this.sn(Rr),this.sn(255)}_n(){this.an(Rr),this.an(255)}reset(){this.position=0}seed(e){this.tn(e.length),this.buffer.set(e,this.position),this.position+=e.length}un(){return this.buffer.slice(0,this.position)}en(e){const t=function(i){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,i,!1),new Uint8Array(o.buffer)}(e),r=!!(128&t[0]);t[0]^=r?255:128;for(let s=1;s<t.length;++s)t[s]^=r?255:0;return t}Gt(e){const t=255&e;t===0?(this.sn(0),this.sn(255)):t===Rr?(this.sn(Rr),this.sn(0)):this.sn(t)}Ht(e){const t=255&e;t===0?(this.an(0),this.an(255)):t===Rr?(this.an(Rr),this.an(0)):this.an(e)}zt(){this.sn(0),this.sn(1)}Jt(){this.an(0),this.an(1)}sn(e){this.tn(1),this.buffer[this.position++]=e}an(e){this.tn(1),this.buffer[this.position++]=~e}tn(e){const t=e+this.position;if(t<=this.buffer.length)return;let r=2*this.buffer.length;r<t&&(r=t);const s=new Uint8Array(r);s.set(this.buffer),this.buffer=s}}class EA{constructor(e){this.cn=e}Bt(e){this.cn.Qt(e)}xt(e){this.cn.Zt(e)}Mt(e){this.cn.Yt(e)}vt(){this.cn.rn()}}class wA{constructor(e){this.cn=e}Bt(e){this.cn.jt(e)}xt(e){this.cn.Xt(e)}Mt(e){this.cn.nn(e)}vt(){this.cn._n()}}class Fs{constructor(){this.cn=new IA,this.ascending=new EA(this.cn),this.descending=new wA(this.cn)}seed(e){this.cn.seed(e)}ln(e){return e===0?this.ascending:this.descending}un(){return this.cn.un()}reset(){this.cn.reset()}}/**
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
 */class Jn{constructor(e,t,r,s){this.hn=e,this.Pn=t,this.Tn=r,this.In=s}En(){const e=this.In.length,t=e===0||this.In[e-1]===255?e+1:e,r=new Uint8Array(t);return r.set(this.In,0),t!==e?r.set([0],this.In.length):++r[r.length-1],new Jn(this.hn,this.Pn,this.Tn,r)}Rn(e,t,r){return{indexId:this.hn,uid:e,arrayValue:jo(this.Tn),directionalValue:jo(this.In),orderedDocumentKey:jo(t),documentKey:r.path.toArray()}}An(e,t,r){const s=this.Rn(e,t,r);return[s.indexId,s.uid,s.arrayValue,s.directionalValue,s.orderedDocumentKey,s.documentKey]}}function un(n,e){let t=n.hn-e.hn;return t!==0?t:(t=jf(n.Tn,e.Tn),t!==0?t:(t=jf(n.In,e.In),t!==0?t:x.comparator(n.Pn,e.Pn)))}function jf(n,e){for(let t=0;t<n.length&&t<e.length;++t){const r=n[t]-e[t];if(r!==0)return r}return n.length-e.length}function jo(n){return xm()?function(t){let r="";for(let s=0;s<t.length;s++)r+=String.fromCharCode(t[s]);return r}(n):n}function Hf(n){return typeof n!="string"?n:function(t){const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=t.charCodeAt(s);return r}(n)}class Gf{constructor(e){this.Vn=new ie((t,r)=>me.comparator(t.field,r.field)),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.dn=e.orderBy,this.mn=[];for(const t of e.filters){const r=t;r.isInequality()?this.Vn=this.Vn.add(r):this.mn.push(r)}}get fn(){return this.Vn.size>1}gn(e){if(B(e.collectionGroup===this.collectionId,49279),this.fn)return!1;const t=Su(e);if(t!==void 0&&!this.pn(t))return!1;const r=Gn(e);let s=new Set,i=0,o=0;for(;i<r.length&&this.pn(r[i]);++i)s=s.add(r[i].fieldPath.canonicalString());if(i===r.length)return!0;if(this.Vn.size>0){const c=this.Vn.getIterator().getNext();if(!s.has(c.field.canonicalString())){const u=r[i];if(!this.yn(c,u)||!this.wn(this.dn[o++],u))return!1}++i}for(;i<r.length;++i){const c=r[i];if(o>=this.dn.length||!this.wn(this.dn[o++],c))return!1}return!0}bn(){if(this.fn)return null;let e=new ie(me.comparator);const t=[];for(const r of this.mn)if(!r.field.isKeyField())if(r.op==="array-contains"||r.op==="array-contains-any")t.push(new xo(r.field,2));else{if(e.has(r.field))continue;e=e.add(r.field),t.push(new xo(r.field,0))}for(const r of this.dn)r.field.isKeyField()||e.has(r.field)||(e=e.add(r.field),t.push(new xo(r.field,r.dir==="asc"?0:1)));return new Xo(Xo.UNKNOWN_ID,this.collectionId,t,gi.empty())}pn(e){for(const t of this.mn)if(this.yn(t,e))return!0;return!1}yn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const r=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===r}wn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
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
 */function d_(n){var t,r;if(B(n instanceof Z||n instanceof se,20012),n instanceof Z){if(n instanceof kg){const s=((r=(t=n.value.arrayValue)==null?void 0:t.values)==null?void 0:r.map(i=>Z.create(n.field,"==",i)))||[];return se.create(s,"or")}return n}const e=n.filters.map(s=>d_(s));return se.create(e,n.op)}function TA(n){if(n.getFilters().length===0)return[];const e=Hu(d_(n));return B(f_(e),7391),$u(e)||ju(e)?[e]:e.getFilters()}function $u(n){return n instanceof Z}function ju(n){return n instanceof se&&Il(n)}function f_(n){return $u(n)||ju(n)||function(t){if(t instanceof se&&Ou(t)){for(const r of t.getFilters())if(!$u(r)&&!ju(r))return!1;return!0}return!1}(n)}function Hu(n){if(B(n instanceof Z||n instanceof se,34018),n instanceof Z)return n;if(n.filters.length===1)return Hu(n.filters[0]);const e=n.filters.map(r=>Hu(r));let t=se.create(e,n.op);return t=aa(t),f_(t)?t:(B(t instanceof se,64498),B(Zr(t),40251),B(t.filters.length>1,57927),t.filters.reduce((r,s)=>kl(r,s)))}function kl(n,e){let t;return B(n instanceof Z||n instanceof se,38388),B(e instanceof Z||e instanceof se,25473),t=n instanceof Z?e instanceof Z?function(s,i){return se.create([s,i],"and")}(n,e):zf(n,e):e instanceof Z?zf(e,n):function(s,i){if(B(s.filters.length>0&&i.filters.length>0,48005),Zr(s)&&Zr(i))return Sg(s,i.getFilters());const o=Ou(s)?s:i,c=Ou(s)?i:s,u=o.filters.map(l=>kl(l,c));return se.create(u,"or")}(n,e),aa(t)}function zf(n,e){if(Zr(e))return Sg(e,n.getFilters());{const t=e.filters.map(r=>kl(n,r));return se.create(t,"or")}}function aa(n){if(B(n instanceof Z||n instanceof se,11850),n instanceof Z)return n;const e=n.getFilters();if(e.length===1)return aa(e[0]);if(Rg(n))return n;const t=e.map(s=>aa(s)),r=[];return t.forEach(s=>{s instanceof Z?r.push(s):s instanceof se&&(s.op===n.op?r.push(...s.filters):r.push(s))}),r.length===1?r[0]:se.create(r,n.op)}/**
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
 */class vA{constructor(){this.Sn=new Nl}addToCollectionParentIndex(e,t){return this.Sn.add(t),A.resolve()}getCollectionParents(e,t){return A.resolve(this.Sn.getEntries(t))}addFieldIndex(e,t){return A.resolve()}deleteFieldIndex(e,t){return A.resolve()}deleteAllFieldIndexes(e){return A.resolve()}createTargetIndexes(e,t){return A.resolve()}getDocumentsMatchingTarget(e,t){return A.resolve(null)}getIndexType(e,t){return A.resolve(0)}getFieldIndexes(e,t){return A.resolve([])}getNextCollectionGroupToUpdate(e){return A.resolve(null)}getMinOffset(e,t){return A.resolve(ht.min())}getMinOffsetFromCollectionGroup(e,t){return A.resolve(ht.min())}updateCollectionGroup(e,t,r){return A.resolve()}updateIndexEntries(e,t){return A.resolve()}}class Nl{constructor(){this.index={}}add(e){const t=e.lastSegment(),r=e.popLast(),s=this.index[t]||new ie(ne.comparator),i=!s.has(r);return this.index[t]=s.add(r),i}has(e){const t=e.lastSegment(),r=e.popLast(),s=this.index[t];return s&&s.has(r)}getEntries(e){return(this.index[e]||new ie(ne.comparator)).toArray()}}/**
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
 */const Wf="IndexedDbIndexManager",Ao=new Uint8Array(0);class AA{constructor(e,t){this.databaseId=t,this.Dn=new Nl,this.Cn=new Yt(r=>ir(r),(r,s)=>$i(r,s)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.Dn.has(t)){const r=t.lastSegment(),s=t.popLast();e.addOnCommittedListener(()=>{this.Dn.add(t)});const i={collectionId:r,parent:Ge(s)};return Kf(e).put(i)}return A.resolve()}getCollectionParents(e,t){const r=[],s=IDBKeyRange.bound([t,""],[Qm(t),""],!1,!0);return Kf(e).H(s).next(i=>{for(const o of i){if(o.collectionId!==t)break;r.push(Nt(o.parent))}return r})}addFieldIndex(e,t){const r=Bs(e),s=function(c){return{indexId:c.indexId,collectionGroup:c.collectionGroup,fields:c.fields.map(u=>[u.fieldPath.canonicalString(),u.kind])}}(t);delete s.indexId;const i=r.add(s);if(t.indexState){const o=Sr(e);return i.next(c=>{o.put(Ff(c,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return i.next()}deleteFieldIndex(e,t){const r=Bs(e),s=Sr(e),i=br(e);return r.delete(t.indexId).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=Bs(e),r=br(e),s=Sr(e);return t.X().next(()=>r.X()).next(()=>s.X())}createTargetIndexes(e,t){return A.forEach(this.vn(t),r=>this.getIndexType(e,r).next(s=>{if(s===0||s===1){const i=new Gf(r).bn();if(i!=null)return this.addFieldIndex(e,i)}}))}getDocumentsMatchingTarget(e,t){const r=br(e);let s=!0;const i=new Map;return A.forEach(this.vn(t),o=>this.Fn(e,o).next(c=>{s&&(s=!!c),i.set(o,c)})).next(()=>{if(s){let o=J();const c=[];return A.forEach(i,(u,l)=>{D(Wf,`Using index ${function(U){return`id=${U.indexId}|cg=${U.collectionGroup}|f=${U.fields.map(G=>`${G.fieldPath}:${G.kind}`).join(",")}`}(u)} to execute ${ir(t)}`);const d=function(U,G){const K=Su(G);if(K===void 0)return null;for(const W of sa(U,K.fieldPath))switch(W.op){case"array-contains-any":return W.value.arrayValue.values||[];case"array-contains":return[W.value]}return null}(l,u),p=function(U,G){const K=new Map;for(const W of Gn(G))for(const E of sa(U,W.fieldPath))switch(E.op){case"==":case"in":K.set(W.fieldPath.canonicalString(),E.value);break;case"not-in":case"!=":return K.set(W.fieldPath.canonicalString(),E.value),Array.from(K.values())}return null}(l,u),m=function(U,G){const K=[];let W=!0;for(const E of Gn(G)){const _=E.kind===0?Rf(U,E.fieldPath,U.startAt):bf(U,E.fieldPath,U.startAt);K.push(_.value),W&&(W=_.inclusive)}return new kn(K,W)}(l,u),T=function(U,G){const K=[];let W=!0;for(const E of Gn(G)){const _=E.kind===0?bf(U,E.fieldPath,U.endAt):Rf(U,E.fieldPath,U.endAt);K.push(_.value),W&&(W=_.inclusive)}return new kn(K,W)}(l,u),C=this.Mn(u,l,m),N=this.Mn(u,l,T),k=this.xn(u,l,p),H=this.On(u.indexId,d,C,m.inclusive,N,T.inclusive,k);return A.forEach(H,$=>r.Z($,t.limit).next(U=>{U.forEach(G=>{const K=x.fromSegments(G.documentKey);o.has(K)||(o=o.add(K),c.push(K))})}))}).next(()=>c)}return A.resolve(null)})}vn(e){let t=this.Cn.get(e);return t||(e.filters.length===0?t=[e]:t=TA(se.create(e.filters,"and")).map(r=>Mu(e.path,e.collectionGroup,e.orderBy,r.getFilters(),e.limit,e.startAt,e.endAt)),this.Cn.set(e,t),t)}On(e,t,r,s,i,o,c){const u=(t!=null?t.length:1)*Math.max(r.length,i.length),l=u/(t!=null?t.length:1),d=[];for(let p=0;p<u;++p){const m=t?this.Nn(t[p/l]):Ao,T=this.Bn(e,m,r[p%l],s),C=this.Ln(e,m,i[p%l],o),N=c.map(k=>this.Bn(e,m,k,!0));d.push(...this.createRange(T,C,N))}return d}Bn(e,t,r,s){const i=new Jn(e,x.empty(),t,r);return s?i:i.En()}Ln(e,t,r,s){const i=new Jn(e,x.empty(),t,r);return s?i.En():i}Fn(e,t){const r=new Gf(t),s=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,s).next(i=>{let o=null;for(const c of i)r.gn(c)&&(!o||c.fields.length>o.fields.length)&&(o=c);return o})}getIndexType(e,t){let r=2;const s=this.vn(t);return A.forEach(s,i=>this.Fn(e,i).next(o=>{o?r!==0&&o.fields.length<function(u){let l=new ie(me.comparator),d=!1;for(const p of u.filters)for(const m of p.getFlattenedFilters())m.field.isKeyField()||(m.op==="array-contains"||m.op==="array-contains-any"?d=!0:l=l.add(m.field));for(const p of u.orderBy)p.field.isKeyField()||(l=l.add(p.field));return l.size+(d?1:0)}(i)&&(r=1):r=0})).next(()=>function(o){return o.limit!==null}(t)&&s.length>1&&r===2?1:r)}kn(e,t){const r=new Fs;for(const s of Gn(e)){const i=t.data.field(s.fieldPath);if(i==null)return null;const o=r.ln(s.kind);Qn.Wt.Dt(i,o)}return r.un()}Nn(e){const t=new Fs;return Qn.Wt.Dt(e,t.ln(0)),t.un()}Kn(e,t){const r=new Fs;return Qn.Wt.Dt(sr(this.databaseId,t),r.ln(function(i){const o=Gn(i);return o.length===0?0:o[o.length-1].kind}(e))),r.un()}xn(e,t,r){if(r===null)return[];let s=[];s.push(new Fs);let i=0;for(const o of Gn(e)){const c=r[i++];for(const u of s)if(this.qn(t,o.fieldPath)&&vi(c))s=this.Un(s,o,c);else{const l=u.ln(o.kind);Qn.Wt.Dt(c,l)}}return this.$n(s)}Mn(e,t,r){return this.xn(e,t,r.position)}$n(e){const t=[];for(let r=0;r<e.length;++r)t[r]=e[r].un();return t}Un(e,t,r){const s=[...e],i=[];for(const o of r.arrayValue.values||[])for(const c of s){const u=new Fs;u.seed(c.un()),Qn.Wt.Dt(o,u.ln(t.kind)),i.push(u)}return i}qn(e,t){return!!e.filters.find(r=>r instanceof Z&&r.field.isEqual(t)&&(r.op==="in"||r.op==="not-in"))}getFieldIndexes(e,t){const r=Bs(e),s=Sr(e);return(t?r.H(Cu,IDBKeyRange.bound(t,t)):r.H()).next(i=>{const o=[];return A.forEach(i,c=>s.get([c.indexId,this.uid]).next(u=>{o.push(function(d,p){const m=p?new gi(p.sequenceNumber,new ht(ar(p.readTime),new x(Nt(p.documentKey)),p.largestBatchId)):gi.empty(),T=d.fields.map(([C,N])=>new xo(me.fromServerFormat(C),N));return new Xo(d.indexId,d.collectionGroup,T,m)}(c,u))})).next(()=>o)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(t=>t.length===0?null:(t.sort((r,s)=>{const i=r.indexState.sequenceNumber-s.indexState.sequenceNumber;return i!==0?i:z(r.collectionGroup,s.collectionGroup)}),t[0].collectionGroup))}updateCollectionGroup(e,t,r){const s=Bs(e),i=Sr(e);return this.Wn(e).next(o=>s.H(Cu,IDBKeyRange.bound(t,t)).next(c=>A.forEach(c,u=>i.put(Ff(u.indexId,this.uid,o,r)))))}updateIndexEntries(e,t){const r=new Map;return A.forEach(t,(s,i)=>{const o=r.get(s.collectionGroup);return(o?A.resolve(o):this.getFieldIndexes(e,s.collectionGroup)).next(c=>(r.set(s.collectionGroup,c),A.forEach(c,u=>this.Qn(e,s,u).next(l=>{const d=this.Gn(i,u);return l.isEqual(d)?A.resolve():this.zn(e,i,u,l,d)}))))})}jn(e,t,r,s){return br(e).put(s.Rn(this.uid,this.Kn(r,t.key),t.key))}Hn(e,t,r,s){return br(e).delete(s.An(this.uid,this.Kn(r,t.key),t.key))}Qn(e,t,r){const s=br(e);let i=new ie(un);return s.ee({index:cg,range:IDBKeyRange.only([r.indexId,this.uid,jo(this.Kn(r,t))])},(o,c)=>{i=i.add(new Jn(r.indexId,t,Hf(c.arrayValue),Hf(c.directionalValue)))}).next(()=>i)}Gn(e,t){let r=new ie(un);const s=this.kn(t,e);if(s==null)return r;const i=Su(t);if(i!=null){const o=e.data.field(i.fieldPath);if(vi(o))for(const c of o.arrayValue.values||[])r=r.add(new Jn(t.indexId,e.key,this.Nn(c),s))}else r=r.add(new Jn(t.indexId,e.key,Ao,s));return r}zn(e,t,r,s,i){D(Wf,"Updating index entries for document '%s'",t.key);const o=[];return function(u,l,d,p,m){const T=u.getIterator(),C=l.getIterator();let N=Ar(T),k=Ar(C);for(;N||k;){let H=!1,$=!1;if(N&&k){const U=d(N,k);U<0?$=!0:U>0&&(H=!0)}else N!=null?$=!0:H=!0;H?(p(k),k=Ar(C)):$?(m(N),N=Ar(T)):(N=Ar(T),k=Ar(C))}}(s,i,un,c=>{o.push(this.jn(e,t,r,c))},c=>{o.push(this.Hn(e,t,r,c))}),A.waitFor(o)}Wn(e){let t=1;return Sr(e).ee({index:ag,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(r,s,i)=>{i.done(),t=s.sequenceNumber+1}).next(()=>t)}createRange(e,t,r){r=r.sort((o,c)=>un(o,c)).filter((o,c,u)=>!c||un(o,u[c-1])!==0);const s=[];s.push(e);for(const o of r){const c=un(o,e),u=un(o,t);if(c===0)s[0]=e.En();else if(c>0&&u<0)s.push(o),s.push(o.En());else if(u>0)break}s.push(t);const i=[];for(let o=0;o<s.length;o+=2){if(this.Jn(s[o],s[o+1]))return[];const c=s[o].An(this.uid,Ao,x.empty()),u=s[o+1].An(this.uid,Ao,x.empty());i.push(IDBKeyRange.bound(c,u))}return i}Jn(e,t){return un(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(Qf)}getMinOffset(e,t){return A.mapArray(this.vn(t),r=>this.Fn(e,r).next(s=>s||L(44426))).next(Qf)}}function Kf(n){return Ce(n,Ei)}function br(n){return Ce(n,si)}function Bs(n){return Ce(n,pl)}function Sr(n){return Ce(n,ri)}function Qf(n){B(n.length!==0,28825);let e=n[0].indexState.offset,t=e.largestBatchId;for(let r=1;r<n.length;r++){const s=n[r].indexState.offset;hl(s,e)<0&&(e=s),t<s.largestBatchId&&(t=s.largestBatchId)}return new ht(e.readTime,e.documentKey,t)}/**
 * @license
 * Copyright 2018 Google LLC
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
 */const Jf={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},p_=41943040;class je{static withCacheSize(e){return new je(e,je.DEFAULT_COLLECTION_PERCENTILE,je.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,r){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=r}}/**
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
 */function m_(n,e,t){const r=n.store(Et),s=n.store(Wr),i=[],o=IDBKeyRange.only(t.batchId);let c=0;const u=r.ee({range:o},(d,p,m)=>(c++,m.delete()));i.push(u.next(()=>{B(c===1,47070,{batchId:t.batchId})}));const l=[];for(const d of t.mutations){const p=sg(e,d.key.path,t.batchId);i.push(s.delete(p)),l.push(d.key)}return A.waitFor(i).next(()=>l)}function ca(n){if(!n)return 0;let e;if(n.document)e=n.document;else if(n.unknownDocument)e=n.unknownDocument;else{if(!n.noDocument)throw L(14731);e=n.noDocument}return JSON.stringify(e).length}/**
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
 */je.DEFAULT_COLLECTION_PERCENTILE=10,je.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,je.DEFAULT=new je(p_,je.DEFAULT_COLLECTION_PERCENTILE,je.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),je.DISABLED=new je(-1,0,0);class ja{constructor(e,t,r,s){this.userId=e,this.serializer=t,this.indexManager=r,this.referenceDelegate=s,this.Zn={}}static wt(e,t,r,s){B(e.uid!=="",64387);const i=e.isAuthenticated()?e.uid:"";return new ja(i,t,r,s)}checkEmpty(e){let t=!0;const r=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return ln(e).ee({index:Yn,range:r},(s,i,o)=>{t=!1,o.done()}).next(()=>t)}addMutationBatch(e,t,r,s){const i=Vr(e),o=ln(e);return o.add({}).next(c=>{B(typeof c=="number",49019);const u=new Al(c,t,r,s),l=function(T,C,N){const k=N.baseMutations.map($=>Si(T.yt,$)),H=N.mutations.map($=>Si(T.yt,$));return{userId:C,batchId:N.batchId,localWriteTimeMs:N.localWriteTime.toMillis(),baseMutations:k,mutations:H}}(this.serializer,this.userId,u),d=[];let p=new ie((m,T)=>z(m.canonicalString(),T.canonicalString()));for(const m of s){const T=sg(this.userId,m.key.path,c);p=p.add(m.key.path.popLast()),d.push(o.put(l)),d.push(i.put(T,JT))}return p.forEach(m=>{d.push(this.indexManager.addToCollectionParentIndex(e,m))}),e.addOnCommittedListener(()=>{this.Zn[c]=u.keys()}),A.waitFor(d).next(()=>u)})}lookupMutationBatch(e,t){return ln(e).get(t).next(r=>r?(B(r.userId===this.userId,48,"Unexpected user for mutation batch",{userId:r.userId,batchId:t}),Kn(this.serializer,r)):null)}Xn(e,t){return this.Zn[t]?A.resolve(this.Zn[t]):this.lookupMutationBatch(e,t).next(r=>{if(r){const s=r.keys();return this.Zn[t]=s,s}return null})}getNextMutationBatchAfterBatchId(e,t){const r=t+1,s=IDBKeyRange.lowerBound([this.userId,r]);let i=null;return ln(e).ee({index:Yn,range:s},(o,c,u)=>{c.userId===this.userId&&(B(c.batchId>=r,47524,{Yn:r}),i=Kn(this.serializer,c)),u.done()}).next(()=>i)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let r=Zn;return ln(e).ee({index:Yn,range:t,reverse:!0},(s,i,o)=>{r=i.batchId,o.done()}).next(()=>r)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,Zn],[this.userId,Number.POSITIVE_INFINITY]);return ln(e).H(Yn,t).next(r=>r.map(s=>Kn(this.serializer,s)))}getAllMutationBatchesAffectingDocumentKey(e,t){const r=Mo(this.userId,t.path),s=IDBKeyRange.lowerBound(r),i=[];return Vr(e).ee({range:s},(o,c,u)=>{const[l,d,p]=o,m=Nt(d);if(l===this.userId&&t.path.isEqual(m))return ln(e).get(p).next(T=>{if(!T)throw L(61480,{er:o,batchId:p});B(T.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:T.userId,batchId:p}),i.push(Kn(this.serializer,T))});u.done()}).next(()=>i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new ie(z);const s=[];return t.forEach(i=>{const o=Mo(this.userId,i.path),c=IDBKeyRange.lowerBound(o),u=Vr(e).ee({range:c},(l,d,p)=>{const[m,T,C]=l,N=Nt(T);m===this.userId&&i.path.isEqual(N)?r=r.add(C):p.done()});s.push(u)}),A.waitFor(s).next(()=>this.tr(e,r))}getAllMutationBatchesAffectingQuery(e,t){const r=t.path,s=r.length+1,i=Mo(this.userId,r),o=IDBKeyRange.lowerBound(i);let c=new ie(z);return Vr(e).ee({range:o},(u,l,d)=>{const[p,m,T]=u,C=Nt(m);p===this.userId&&r.isPrefixOf(C)?C.length===s&&(c=c.add(T)):d.done()}).next(()=>this.tr(e,c))}tr(e,t){const r=[],s=[];return t.forEach(i=>{s.push(ln(e).get(i).next(o=>{if(o===null)throw L(35274,{batchId:i});B(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:i}),r.push(Kn(this.serializer,o))}))}),A.waitFor(s).next(()=>r)}removeMutationBatch(e,t){return m_(e.le,this.userId,t).next(r=>(e.addOnCommittedListener(()=>{this.nr(t.batchId)}),A.forEach(r,s=>this.referenceDelegate.markPotentiallyOrphaned(e,s))))}nr(e){delete this.Zn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return A.resolve();const r=IDBKeyRange.lowerBound(function(o){return[o]}(this.userId)),s=[];return Vr(e).ee({range:r},(i,o,c)=>{if(i[0]===this.userId){const u=Nt(i[1]);s.push(u)}else c.done()}).next(()=>{B(s.length===0,56720,{rr:s.map(i=>i.canonicalString())})})})}containsKey(e,t){return g_(e,this.userId,t)}ir(e){return __(e).get(this.userId).next(t=>t||{userId:this.userId,lastAcknowledgedBatchId:Zn,lastStreamToken:""})}}function g_(n,e,t){const r=Mo(e,t.path),s=r[1],i=IDBKeyRange.lowerBound(r);let o=!1;return Vr(n).ee({range:i,Y:!0},(c,u,l)=>{const[d,p,m]=c;d===e&&p===s&&(o=!0),l.done()}).next(()=>o)}function ln(n){return Ce(n,Et)}function Vr(n){return Ce(n,Wr)}function __(n){return Ce(n,yi)}/**
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
 */class cr{constructor(e){this.sr=e}next(){return this.sr+=2,this.sr}static _r(){return new cr(0)}static ar(){return new cr(-1)}}/**
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
 */class RA{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.ur(e).next(t=>{const r=new cr(t.highestTargetId);return t.highestTargetId=r.next(),this.cr(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.ur(e).next(t=>j.fromTimestamp(new re(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.ur(e).next(t=>t.highestListenSequenceNumber)}setTargetsMetadata(e,t,r){return this.ur(e).next(s=>(s.highestListenSequenceNumber=t,r&&(s.lastRemoteSnapshotVersion=r.toTimestamp()),t>s.highestListenSequenceNumber&&(s.highestListenSequenceNumber=t),this.cr(e,s)))}addTargetData(e,t){return this.lr(e,t).next(()=>this.ur(e).next(r=>(r.targetCount+=1,this.hr(t,r),this.cr(e,r))))}updateTargetData(e,t){return this.lr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>Pr(e).delete(t.targetId)).next(()=>this.ur(e)).next(r=>(B(r.targetCount>0,8065),r.targetCount-=1,this.cr(e,r)))}removeTargets(e,t,r){let s=0;const i=[];return Pr(e).ee((o,c)=>{const u=Ys(c);u.sequenceNumber<=t&&r.get(u.targetId)===null&&(s++,i.push(this.removeTargetData(e,u)))}).next(()=>A.waitFor(i)).next(()=>s)}forEachTarget(e,t){return Pr(e).ee((r,s)=>{const i=Ys(s);t(i)})}ur(e){return Yf(e).get(ta).next(t=>(B(t!==null,2888),t))}cr(e,t){return Yf(e).put(ta,t)}lr(e,t){return Pr(e).put(l_(this.serializer,t))}hr(e,t){let r=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,r=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,r=!0),r}getTargetCount(e){return this.ur(e).next(t=>t.targetCount)}getTargetData(e,t){const r=ir(t),s=IDBKeyRange.bound([r,Number.NEGATIVE_INFINITY],[r,Number.POSITIVE_INFINITY]);let i=null;return Pr(e).ee({range:s,index:og},(o,c,u)=>{const l=Ys(c);$i(t,l.target)&&(i=l,u.done())}).next(()=>i)}addMatchingKeys(e,t,r){const s=[],i=mn(e);return t.forEach(o=>{const c=Ge(o.path);s.push(i.put({targetId:r,path:c})),s.push(this.referenceDelegate.addReference(e,r,o))}),A.waitFor(s)}removeMatchingKeys(e,t,r){const s=mn(e);return A.forEach(t,i=>{const o=Ge(i.path);return A.waitFor([s.delete([r,o]),this.referenceDelegate.removeReference(e,r,i)])})}removeMatchingKeysForTargetId(e,t){const r=mn(e),s=IDBKeyRange.bound([t],[t+1],!1,!0);return r.delete(s)}getMatchingKeysForTargetId(e,t){const r=IDBKeyRange.bound([t],[t+1],!1,!0),s=mn(e);let i=J();return s.ee({range:r,Y:!0},(o,c,u)=>{const l=Nt(o[1]),d=new x(l);i=i.add(d)}).next(()=>i)}containsKey(e,t){const r=Ge(t.path),s=IDBKeyRange.bound([r],[Qm(r)],!1,!0);let i=0;return mn(e).ee({index:fl,Y:!0,range:s},([o,c],u,l)=>{o!==0&&(i++,l.done())}).next(()=>i>0)}At(e,t){return Pr(e).get(t).next(r=>r?Ys(r):null)}}function Pr(n){return Ce(n,Kr)}function Yf(n){return Ce(n,er)}function mn(n){return Ce(n,Qr)}/**
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
 */const Xf="LruGarbageCollector",y_=1048576;function Zf([n,e],[t,r]){const s=z(n,t);return s===0?z(e,r):s}class bA{constructor(e){this.Pr=e,this.buffer=new ie(Zf),this.Tr=0}Ir(){return++this.Tr}Er(e){const t=[e,this.Ir()];if(this.buffer.size<this.Pr)this.buffer=this.buffer.add(t);else{const r=this.buffer.last();Zf(t,r)<0&&(this.buffer=this.buffer.delete(r).add(t))}}get maxValue(){return this.buffer.last()[0]}}class I_{constructor(e,t,r){this.garbageCollector=e,this.asyncQueue=t,this.localStore=r,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Ar(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Ar(e){D(Xf,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){xn(t)?D(Xf,"Ignoring IndexedDB error during garbage collection: ",t):await On(t)}await this.Ar(3e5)})}}class SA{constructor(e,t){this.Vr=e,this.params=t}calculateTargetCount(e,t){return this.Vr.dr(e).next(r=>Math.floor(t/100*r))}nthSequenceNumber(e,t){if(t===0)return A.resolve(Xe.ce);const r=new bA(t);return this.Vr.forEachTarget(e,s=>r.Er(s.sequenceNumber)).next(()=>this.Vr.mr(e,s=>r.Er(s))).next(()=>r.maxValue)}removeTargets(e,t,r){return this.Vr.removeTargets(e,t,r)}removeOrphanedDocuments(e,t){return this.Vr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(D("LruGarbageCollector","Garbage collection skipped; disabled"),A.resolve(Jf)):this.getCacheSize(e).next(r=>r<this.params.cacheSizeCollectionThreshold?(D("LruGarbageCollector",`Garbage collection skipped; Cache size ${r} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),Jf):this.gr(e,t))}getCacheSize(e){return this.Vr.getCacheSize(e)}gr(e,t){let r,s,i,o,c,u,l;const d=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(p=>(p>this.params.maximumSequenceNumbersToCollect?(D("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),s=this.params.maximumSequenceNumbersToCollect):s=p,o=Date.now(),this.nthSequenceNumber(e,s))).next(p=>(r=p,c=Date.now(),this.removeTargets(e,r,t))).next(p=>(i=p,u=Date.now(),this.removeOrphanedDocuments(e,r))).next(p=>(l=Date.now(),kr()<=X.DEBUG&&D("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-d}ms
	Determined least recently used ${s} in `+(c-o)+`ms
	Removed ${i} targets in `+(u-c)+`ms
	Removed ${p} documents in `+(l-u)+`ms
Total Duration: ${l-d}ms`),A.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:i,documentsRemoved:p})))}}function E_(n,e){return new SA(n,e)}/**
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
 */class PA{constructor(e,t){this.db=e,this.garbageCollector=E_(this,t)}dr(e){const t=this.pr(e);return this.db.getTargetCache().getTargetCount(e).next(r=>t.next(s=>r+s))}pr(e){let t=0;return this.mr(e,r=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}mr(e,t){return this.yr(e,(r,s)=>t(s))}addReference(e,t,r){return Ro(e,r)}removeReference(e,t,r){return Ro(e,r)}removeTargets(e,t,r){return this.db.getTargetCache().removeTargets(e,t,r)}markPotentiallyOrphaned(e,t){return Ro(e,t)}wr(e,t){return function(s,i){let o=!1;return __(s).te(c=>g_(s,c,i).next(u=>(u&&(o=!0),A.resolve(!u)))).next(()=>o)}(e,t)}removeOrphanedDocuments(e,t){const r=this.db.getRemoteDocumentCache().newChangeBuffer(),s=[];let i=0;return this.yr(e,(o,c)=>{if(c<=t){const u=this.wr(e,o).next(l=>{if(!l)return i++,r.getEntry(e,o).next(()=>(r.removeEntry(o,j.min()),mn(e).delete(function(p){return[0,Ge(p.path)]}(o))))});s.push(u)}}).next(()=>A.waitFor(s)).next(()=>r.apply(e)).next(()=>i)}removeTarget(e,t){const r=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,r)}updateLimboDocument(e,t){return Ro(e,t)}yr(e,t){const r=mn(e);let s,i=Xe.ce;return r.ee({index:fl},([o,c],{path:u,sequenceNumber:l})=>{o===0?(i!==Xe.ce&&t(new x(Nt(s)),i),i=l,s=u):i=Xe.ce}).next(()=>{i!==Xe.ce&&t(new x(Nt(s)),i)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function Ro(n,e){return mn(n).put(function(r,s){return{targetId:0,path:Ge(r.path),sequenceNumber:s}}(e,n.currentSequenceNumber))}/**
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
 */class w_{constructor(){this.changes=new Yt(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,he.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const r=this.changes.get(t);return r!==void 0?A.resolve(r):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
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
 */class CA{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,r){return jn(e).put(r)}removeEntry(e,t,r){return jn(e).delete(function(i,o){const c=i.path.toArray();return[c.slice(0,c.length-2),c[c.length-2],oa(o),c[c.length-1]]}(t,r))}updateMetadata(e,t){return this.getMetadata(e).next(r=>(r.byteSize+=t,this.br(e,r)))}getEntry(e,t){let r=he.newInvalidDocument(t);return jn(e).ee({index:Lo,range:IDBKeyRange.only(qs(t))},(s,i)=>{r=this.Sr(t,i)}).next(()=>r)}Dr(e,t){let r={size:0,document:he.newInvalidDocument(t)};return jn(e).ee({index:Lo,range:IDBKeyRange.only(qs(t))},(s,i)=>{r={document:this.Sr(t,i),size:ca(i)}}).next(()=>r)}getEntries(e,t){let r=ct();return this.Cr(e,t,(s,i)=>{const o=this.Sr(s,i);r=r.insert(s,o)}).next(()=>r)}vr(e,t){let r=ct(),s=new ae(x.comparator);return this.Cr(e,t,(i,o)=>{const c=this.Sr(i,o);r=r.insert(i,c),s=s.insert(i,ca(o))}).next(()=>({documents:r,Fr:s}))}Cr(e,t,r){if(t.isEmpty())return A.resolve();let s=new ie(np);t.forEach(u=>s=s.add(u));const i=IDBKeyRange.bound(qs(s.first()),qs(s.last())),o=s.getIterator();let c=o.getNext();return jn(e).ee({index:Lo,range:i},(u,l,d)=>{const p=x.fromSegments([...l.prefixPath,l.collectionGroup,l.documentId]);for(;c&&np(c,p)<0;)r(c,null),c=o.getNext();c&&c.isEqual(p)&&(r(c,l),c=o.hasNext()?o.getNext():null),c?d.j(qs(c)):d.done()}).next(()=>{for(;c;)r(c,null),c=o.hasNext()?o.getNext():null})}getDocumentsMatchingQuery(e,t,r,s,i){const o=t.path,c=[o.popLast().toArray(),o.lastSegment(),oa(r.readTime),r.documentKey.path.isEmpty()?"":r.documentKey.path.lastSegment()],u=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return jn(e).H(IDBKeyRange.bound(c,u,!0)).next(l=>{i==null||i.incrementDocumentReadCount(l.length);let d=ct();for(const p of l){const m=this.Sr(x.fromSegments(p.prefixPath.concat(p.collectionGroup,p.documentId)),p);m.isFoundDocument()&&(Hi(t,m)||s.has(m.key))&&(d=d.insert(m.key,m))}return d})}getAllFromCollectionGroup(e,t,r,s){let i=ct();const o=tp(t,r),c=tp(t,ht.max());return jn(e).ee({index:ig,range:IDBKeyRange.bound(o,c,!0)},(u,l,d)=>{const p=this.Sr(x.fromSegments(l.prefixPath.concat(l.collectionGroup,l.documentId)),l);i=i.insert(p.key,p),i.size===s&&d.done()}).next(()=>i)}newChangeBuffer(e){return new kA(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(t=>t.byteSize)}getMetadata(e){return ep(e).get(Pu).next(t=>(B(!!t,20021),t))}br(e,t){return ep(e).put(Pu,t)}Sr(e,t){if(t){const r=mA(this.serializer,t);if(!(r.isNoDocument()&&r.version.isEqual(j.min())))return r}return he.newInvalidDocument(e)}}function T_(n){return new CA(n)}class kA extends w_{constructor(e,t){super(),this.Mr=e,this.trackRemovals=t,this.Or=new Yt(r=>r.toString(),(r,s)=>r.isEqual(s))}applyChanges(e){const t=[];let r=0,s=new ie((i,o)=>z(i.canonicalString(),o.canonicalString()));return this.changes.forEach((i,o)=>{const c=this.Or.get(i);if(t.push(this.Mr.removeEntry(e,i,c.readTime)),o.isValidDocument()){const u=Lf(this.Mr.serializer,o);s=s.add(i.path.popLast());const l=ca(u);r+=l-c.size,t.push(this.Mr.addEntry(e,i,u))}else if(r-=c.size,this.trackRemovals){const u=Lf(this.Mr.serializer,o.convertToNoDocument(j.min()));t.push(this.Mr.addEntry(e,i,u))}}),s.forEach(i=>{t.push(this.Mr.indexManager.addToCollectionParentIndex(e,i))}),t.push(this.Mr.updateMetadata(e,r)),A.waitFor(t)}getFromCache(e,t){return this.Mr.Dr(e,t).next(r=>(this.Or.set(t,{size:r.size,readTime:r.document.readTime}),r.document))}getAllFromCache(e,t){return this.Mr.vr(e,t).next(({documents:r,Fr:s})=>(s.forEach((i,o)=>{this.Or.set(i,{size:o,readTime:r.get(i).readTime})}),r))}}function ep(n){return Ce(n,Ii)}function jn(n){return Ce(n,ea)}function qs(n){const e=n.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function tp(n,e){const t=e.documentKey.path.toArray();return[n,oa(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function np(n,e){const t=n.path.toArray(),r=e.path.toArray();let s=0;for(let i=0;i<t.length-2&&i<r.length-2;++i)if(s=z(t[i],r[i]),s)return s;return s=z(t.length,r.length),s||(s=z(t[t.length-2],r[r.length-2]),s||z(t[t.length-1],r[r.length-1]))}/**
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
 *//**
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
 */class NA{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
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
 */class v_{constructor(e,t,r,s){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=r,this.indexManager=s}getDocument(e,t){let r=null;return this.documentOverlayCache.getOverlay(e,t).next(s=>(r=s,this.remoteDocumentCache.getEntry(e,t))).next(s=>(r!==null&&ai(r.mutation,s,Ze.empty(),re.now()),s))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(r=>this.getLocalViewOfDocuments(e,r,J()).next(()=>r))}getLocalViewOfDocuments(e,t,r=J()){const s=Dt();return this.populateOverlays(e,s,t).next(()=>this.computeViews(e,t,s,r).next(i=>{let o=Qs();return i.forEach((c,u)=>{o=o.insert(c,u.overlayedDocument)}),o}))}getOverlayedDocuments(e,t){const r=Dt();return this.populateOverlays(e,r,t).next(()=>this.computeViews(e,t,r,J()))}populateOverlays(e,t,r){const s=[];return r.forEach(i=>{t.has(i)||s.push(i)}),this.documentOverlayCache.getOverlays(e,s).next(i=>{i.forEach((o,c)=>{t.set(o,c)})})}computeViews(e,t,r,s){let i=ct();const o=oi(),c=function(){return oi()}();return t.forEach((u,l)=>{const d=r.get(l.key);s.has(l.key)&&(d===void 0||d.mutation instanceof Xt)?i=i.insert(l.key,l):d!==void 0?(o.set(l.key,d.mutation.getFieldMask()),ai(d.mutation,l,d.mutation.getFieldMask(),re.now())):o.set(l.key,Ze.empty())}),this.recalculateAndSaveOverlays(e,i).next(u=>(u.forEach((l,d)=>o.set(l,d)),t.forEach((l,d)=>c.set(l,new NA(d,o.get(l)??null))),c))}recalculateAndSaveOverlays(e,t){const r=oi();let s=new ae((o,c)=>o-c),i=J();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(o=>{for(const c of o)c.keys().forEach(u=>{const l=t.get(u);if(l===null)return;let d=r.get(u)||Ze.empty();d=c.applyToLocalView(l,d),r.set(u,d);const p=(s.get(c.batchId)||J()).add(u);s=s.insert(c.batchId,p)})}).next(()=>{const o=[],c=s.getReverseIterator();for(;c.hasNext();){const u=c.getNext(),l=u.key,d=u.value,p=Ug();d.forEach(m=>{if(!i.has(m)){const T=zg(t.get(m),r.get(m));T!==null&&p.set(m,T),i=i.add(m)}}),o.push(this.documentOverlayCache.saveOverlays(e,l,p))}return A.waitFor(o)}).next(()=>r)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(r=>this.recalculateAndSaveOverlays(e,r))}getDocumentsMatchingQuery(e,t,r,s){return Ov(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):El(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,r,s):this.getDocumentsMatchingCollectionQuery(e,t,r,s)}getNextDocuments(e,t,r,s){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,r,s).next(i=>{const o=s-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,r.largestBatchId,s-i.size):A.resolve(Dt());let c=zr,u=i;return o.next(l=>A.forEach(l,(d,p)=>(c<p.largestBatchId&&(c=p.largestBatchId),i.get(d)?A.resolve():this.remoteDocumentCache.getEntry(e,d).next(m=>{u=u.insert(d,m)}))).next(()=>this.populateOverlays(e,l,i)).next(()=>this.computeViews(e,u,l,J())).next(d=>({batchId:c,changes:Lg(d)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new x(t)).next(r=>{let s=Qs();return r.isFoundDocument()&&(s=s.insert(r.key,r)),s})}getDocumentsMatchingCollectionGroupQuery(e,t,r,s){const i=t.collectionGroup;let o=Qs();return this.indexManager.getCollectionParents(e,i).next(c=>A.forEach(c,u=>{const l=function(p,m){return new _r(m,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)}(t,u.child(i));return this.getDocumentsMatchingCollectionQuery(e,l,r,s).next(d=>{d.forEach((p,m)=>{o=o.insert(p,m)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,t,r,s){let i;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,r.largestBatchId).next(o=>(i=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,r,i,s))).next(o=>{i.forEach((u,l)=>{const d=l.getKey();o.get(d)===null&&(o=o.insert(d,he.newInvalidDocument(d)))});let c=Qs();return o.forEach((u,l)=>{const d=i.get(u);d!==void 0&&ai(d.mutation,l,Ze.empty(),re.now()),Hi(t,l)&&(c=c.insert(u,l))}),c})}}/**
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
 */class DA{constructor(e){this.serializer=e,this.Nr=new Map,this.Br=new Map}getBundleMetadata(e,t){return A.resolve(this.Nr.get(t))}saveBundleMetadata(e,t){return this.Nr.set(t.id,function(s){return{id:s.id,version:s.version,createTime:Me(s.createTime)}}(t)),A.resolve()}getNamedQuery(e,t){return A.resolve(this.Br.get(t))}saveNamedQuery(e,t){return this.Br.set(t.name,function(s){return{name:s.name,query:h_(s.bundledQuery),readTime:Me(s.readTime)}}(t)),A.resolve()}}/**
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
 */class VA{constructor(){this.overlays=new ae(x.comparator),this.Lr=new Map}getOverlay(e,t){return A.resolve(this.overlays.get(t))}getOverlays(e,t){const r=Dt();return A.forEach(t,s=>this.getOverlay(e,s).next(i=>{i!==null&&r.set(s,i)})).next(()=>r)}saveOverlays(e,t,r){return r.forEach((s,i)=>{this.bt(e,t,i)}),A.resolve()}removeOverlaysForBatchId(e,t,r){const s=this.Lr.get(r);return s!==void 0&&(s.forEach(i=>this.overlays=this.overlays.remove(i)),this.Lr.delete(r)),A.resolve()}getOverlaysForCollection(e,t,r){const s=Dt(),i=t.length+1,o=new x(t.child("")),c=this.overlays.getIteratorFrom(o);for(;c.hasNext();){const u=c.getNext().value,l=u.getKey();if(!t.isPrefixOf(l.path))break;l.path.length===i&&u.largestBatchId>r&&s.set(u.getKey(),u)}return A.resolve(s)}getOverlaysForCollectionGroup(e,t,r,s){let i=new ae((l,d)=>l-d);const o=this.overlays.getIterator();for(;o.hasNext();){const l=o.getNext().value;if(l.getKey().getCollectionGroup()===t&&l.largestBatchId>r){let d=i.get(l.largestBatchId);d===null&&(d=Dt(),i=i.insert(l.largestBatchId,d)),d.set(l.getKey(),l)}}const c=Dt(),u=i.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach((l,d)=>c.set(l,d)),!(c.size()>=s)););return A.resolve(c)}bt(e,t,r){const s=this.overlays.get(r.key);if(s!==null){const o=this.Lr.get(s.largestBatchId).delete(r.key);this.Lr.set(s.largestBatchId,o)}this.overlays=this.overlays.insert(r.key,new bl(t,r));let i=this.Lr.get(t);i===void 0&&(i=J(),this.Lr.set(t,i)),this.Lr.set(t,i.add(r.key))}}/**
 * @license
 * Copyright 2024 Google LLC
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
 */class OA{constructor(){this.sessionToken=we.EMPTY_BYTE_STRING}getSessionToken(e){return A.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,A.resolve()}}/**
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
 */class Dl{constructor(){this.kr=new ie(Ve.Kr),this.qr=new ie(Ve.Ur)}isEmpty(){return this.kr.isEmpty()}addReference(e,t){const r=new Ve(e,t);this.kr=this.kr.add(r),this.qr=this.qr.add(r)}$r(e,t){e.forEach(r=>this.addReference(r,t))}removeReference(e,t){this.Wr(new Ve(e,t))}Qr(e,t){e.forEach(r=>this.removeReference(r,t))}Gr(e){const t=new x(new ne([])),r=new Ve(t,e),s=new Ve(t,e+1),i=[];return this.qr.forEachInRange([r,s],o=>{this.Wr(o),i.push(o.key)}),i}zr(){this.kr.forEach(e=>this.Wr(e))}Wr(e){this.kr=this.kr.delete(e),this.qr=this.qr.delete(e)}jr(e){const t=new x(new ne([])),r=new Ve(t,e),s=new Ve(t,e+1);let i=J();return this.qr.forEachInRange([r,s],o=>{i=i.add(o.key)}),i}containsKey(e){const t=new Ve(e,0),r=this.kr.firstAfterOrEqual(t);return r!==null&&e.isEqual(r.key)}}class Ve{constructor(e,t){this.key=e,this.Hr=t}static Kr(e,t){return x.comparator(e.key,t.key)||z(e.Hr,t.Hr)}static Ur(e,t){return z(e.Hr,t.Hr)||x.comparator(e.key,t.key)}}/**
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
 */class xA{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.Yn=1,this.Jr=new ie(Ve.Kr)}checkEmpty(e){return A.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,r,s){const i=this.Yn;this.Yn++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Al(i,t,r,s);this.mutationQueue.push(o);for(const c of s)this.Jr=this.Jr.add(new Ve(c.key,i)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return A.resolve(o)}lookupMutationBatch(e,t){return A.resolve(this.Zr(t))}getNextMutationBatchAfterBatchId(e,t){const r=t+1,s=this.Xr(r),i=s<0?0:s;return A.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return A.resolve(this.mutationQueue.length===0?Zn:this.Yn-1)}getAllMutationBatches(e){return A.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const r=new Ve(t,0),s=new Ve(t,Number.POSITIVE_INFINITY),i=[];return this.Jr.forEachInRange([r,s],o=>{const c=this.Zr(o.Hr);i.push(c)}),A.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new ie(z);return t.forEach(s=>{const i=new Ve(s,0),o=new Ve(s,Number.POSITIVE_INFINITY);this.Jr.forEachInRange([i,o],c=>{r=r.add(c.Hr)})}),A.resolve(this.Yr(r))}getAllMutationBatchesAffectingQuery(e,t){const r=t.path,s=r.length+1;let i=r;x.isDocumentKey(i)||(i=i.child(""));const o=new Ve(new x(i),0);let c=new ie(z);return this.Jr.forEachWhile(u=>{const l=u.key.path;return!!r.isPrefixOf(l)&&(l.length===s&&(c=c.add(u.Hr)),!0)},o),A.resolve(this.Yr(c))}Yr(e){const t=[];return e.forEach(r=>{const s=this.Zr(r);s!==null&&t.push(s)}),t}removeMutationBatch(e,t){B(this.ei(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let r=this.Jr;return A.forEach(t.mutations,s=>{const i=new Ve(s.key,t.batchId);return r=r.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,s.key)}).next(()=>{this.Jr=r})}nr(e){}containsKey(e,t){const r=new Ve(t,0),s=this.Jr.firstAfterOrEqual(r);return A.resolve(t.isEqual(s&&s.key))}performConsistencyCheck(e){return this.mutationQueue.length,A.resolve()}ei(e,t){return this.Xr(e)}Xr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Zr(e){const t=this.Xr(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
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
 */class MA{constructor(e){this.ti=e,this.docs=function(){return new ae(x.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const r=t.key,s=this.docs.get(r),i=s?s.size:0,o=this.ti(t);return this.docs=this.docs.insert(r,{document:t.mutableCopy(),size:o}),this.size+=o-i,this.indexManager.addToCollectionParentIndex(e,r.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const r=this.docs.get(t);return A.resolve(r?r.document.mutableCopy():he.newInvalidDocument(t))}getEntries(e,t){let r=ct();return t.forEach(s=>{const i=this.docs.get(s);r=r.insert(s,i?i.document.mutableCopy():he.newInvalidDocument(s))}),A.resolve(r)}getDocumentsMatchingQuery(e,t,r,s){let i=ct();const o=t.path,c=new x(o.child("__id-9223372036854775808__")),u=this.docs.getIteratorFrom(c);for(;u.hasNext();){const{key:l,value:{document:d}}=u.getNext();if(!o.isPrefixOf(l.path))break;l.path.length>o.length+1||hl(Zm(d),r)<=0||(s.has(d.key)||Hi(t,d))&&(i=i.insert(d.key,d.mutableCopy()))}return A.resolve(i)}getAllFromCollectionGroup(e,t,r,s){L(9500)}ni(e,t){return A.forEach(this.docs,r=>t(r))}newChangeBuffer(e){return new LA(this)}getSize(e){return A.resolve(this.size)}}class LA extends w_{constructor(e){super(),this.Mr=e}applyChanges(e){const t=[];return this.changes.forEach((r,s)=>{s.isValidDocument()?t.push(this.Mr.addEntry(e,s)):this.Mr.removeEntry(r)}),A.waitFor(t)}getFromCache(e,t){return this.Mr.getEntry(e,t)}getAllFromCache(e,t){return this.Mr.getEntries(e,t)}}/**
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
 */class UA{constructor(e){this.persistence=e,this.ri=new Yt(t=>ir(t),$i),this.lastRemoteSnapshotVersion=j.min(),this.highestTargetId=0,this.ii=0,this.si=new Dl,this.targetCount=0,this.oi=cr._r()}forEachTarget(e,t){return this.ri.forEach((r,s)=>t(s)),A.resolve()}getLastRemoteSnapshotVersion(e){return A.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return A.resolve(this.ii)}allocateTargetId(e){return this.highestTargetId=this.oi.next(),A.resolve(this.highestTargetId)}setTargetsMetadata(e,t,r){return r&&(this.lastRemoteSnapshotVersion=r),t>this.ii&&(this.ii=t),A.resolve()}lr(e){this.ri.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.oi=new cr(t),this.highestTargetId=t),e.sequenceNumber>this.ii&&(this.ii=e.sequenceNumber)}addTargetData(e,t){return this.lr(t),this.targetCount+=1,A.resolve()}updateTargetData(e,t){return this.lr(t),A.resolve()}removeTargetData(e,t){return this.ri.delete(t.target),this.si.Gr(t.targetId),this.targetCount-=1,A.resolve()}removeTargets(e,t,r){let s=0;const i=[];return this.ri.forEach((o,c)=>{c.sequenceNumber<=t&&r.get(c.targetId)===null&&(this.ri.delete(o),i.push(this.removeMatchingKeysForTargetId(e,c.targetId)),s++)}),A.waitFor(i).next(()=>s)}getTargetCount(e){return A.resolve(this.targetCount)}getTargetData(e,t){const r=this.ri.get(t)||null;return A.resolve(r)}addMatchingKeys(e,t,r){return this.si.$r(t,r),A.resolve()}removeMatchingKeys(e,t,r){this.si.Qr(t,r);const s=this.persistence.referenceDelegate,i=[];return s&&t.forEach(o=>{i.push(s.markPotentiallyOrphaned(e,o))}),A.waitFor(i)}removeMatchingKeysForTargetId(e,t){return this.si.Gr(t),A.resolve()}getMatchingKeysForTargetId(e,t){const r=this.si.jr(t);return A.resolve(r)}containsKey(e,t){return A.resolve(this.si.containsKey(t))}}/**
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
 */class Vl{constructor(e,t){this._i={},this.overlays={},this.ai=new Xe(0),this.ui=!1,this.ui=!0,this.ci=new OA,this.referenceDelegate=e(this),this.li=new UA(this),this.indexManager=new vA,this.remoteDocumentCache=function(s){return new MA(s)}(r=>this.referenceDelegate.hi(r)),this.serializer=new u_(t),this.Pi=new DA(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.ui=!1,Promise.resolve()}get started(){return this.ui}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new VA,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let r=this._i[e.toKey()];return r||(r=new xA(t,this.referenceDelegate),this._i[e.toKey()]=r),r}getGlobalsCache(){return this.ci}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Pi}runTransaction(e,t,r){D("MemoryPersistence","Starting transaction:",e);const s=new FA(this.ai.next());return this.referenceDelegate.Ti(),r(s).next(i=>this.referenceDelegate.Ii(s).next(()=>i)).toPromise().then(i=>(s.raiseOnCommittedEvent(),i))}Ei(e,t){return A.or(Object.values(this._i).map(r=>()=>r.containsKey(e,t)))}}class FA extends tg{constructor(e){super(),this.currentSequenceNumber=e}}class Ha{constructor(e){this.persistence=e,this.Ri=new Dl,this.Ai=null}static Vi(e){return new Ha(e)}get di(){if(this.Ai)return this.Ai;throw L(60996)}addReference(e,t,r){return this.Ri.addReference(r,t),this.di.delete(r.toString()),A.resolve()}removeReference(e,t,r){return this.Ri.removeReference(r,t),this.di.add(r.toString()),A.resolve()}markPotentiallyOrphaned(e,t){return this.di.add(t.toString()),A.resolve()}removeTarget(e,t){this.Ri.Gr(t.targetId).forEach(s=>this.di.add(s.toString()));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,t.targetId).next(s=>{s.forEach(i=>this.di.add(i.toString()))}).next(()=>r.removeTargetData(e,t))}Ti(){this.Ai=new Set}Ii(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return A.forEach(this.di,r=>{const s=x.fromPath(r);return this.mi(e,s).next(i=>{i||t.removeEntry(s,j.min())})}).next(()=>(this.Ai=null,t.apply(e)))}updateLimboDocument(e,t){return this.mi(e,t).next(r=>{r?this.di.delete(t.toString()):this.di.add(t.toString())})}hi(e){return 0}mi(e,t){return A.or([()=>A.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ei(e,t)])}}class ua{constructor(e,t){this.persistence=e,this.fi=new Yt(r=>Ge(r.path),(r,s)=>r.isEqual(s)),this.garbageCollector=E_(this,t)}static Vi(e,t){return new ua(e,t)}Ti(){}Ii(e){return A.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}dr(e){const t=this.pr(e);return this.persistence.getTargetCache().getTargetCount(e).next(r=>t.next(s=>r+s))}pr(e){let t=0;return this.mr(e,r=>{t++}).next(()=>t)}mr(e,t){return A.forEach(this.fi,(r,s)=>this.wr(e,r,s).next(i=>i?A.resolve():t(s)))}removeTargets(e,t,r){return this.persistence.getTargetCache().removeTargets(e,t,r)}removeOrphanedDocuments(e,t){let r=0;const s=this.persistence.getRemoteDocumentCache(),i=s.newChangeBuffer();return s.ni(e,o=>this.wr(e,o,t).next(c=>{c||(r++,i.removeEntry(o,j.min()))})).next(()=>i.apply(e)).next(()=>r)}markPotentiallyOrphaned(e,t){return this.fi.set(t,e.currentSequenceNumber),A.resolve()}removeTarget(e,t){const r=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,r)}addReference(e,t,r){return this.fi.set(r,e.currentSequenceNumber),A.resolve()}removeReference(e,t,r){return this.fi.set(r,e.currentSequenceNumber),A.resolve()}updateLimboDocument(e,t){return this.fi.set(t,e.currentSequenceNumber),A.resolve()}hi(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=Fo(e.data.value)),t}wr(e,t,r){return A.or([()=>this.persistence.Ei(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const s=this.fi.get(t);return A.resolve(s!==void 0&&s>r)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
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
 */class BA{constructor(e){this.serializer=e}k(e,t,r,s){const i=new Da("createOrUpgrade",t);r<1&&s>=1&&(function(u){u.createObjectStore(qi)}(e),function(u){u.createObjectStore(yi,{keyPath:QT}),u.createObjectStore(Et,{keyPath:ff,autoIncrement:!0}).createIndex(Yn,pf,{unique:!0}),u.createObjectStore(Wr)}(e),rp(e),function(u){u.createObjectStore(zn)}(e));let o=A.resolve();return r<3&&s>=3&&(r!==0&&(function(u){u.deleteObjectStore(Qr),u.deleteObjectStore(Kr),u.deleteObjectStore(er)}(e),rp(e)),o=o.next(()=>function(u){const l=u.store(er),d={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:j.min().toTimestamp(),targetCount:0};return l.put(ta,d)}(i))),r<4&&s>=4&&(r!==0&&(o=o.next(()=>function(u,l){return l.store(Et).H().next(p=>{u.deleteObjectStore(Et),u.createObjectStore(Et,{keyPath:ff,autoIncrement:!0}).createIndex(Yn,pf,{unique:!0});const m=l.store(Et),T=p.map(C=>m.put(C));return A.waitFor(T)})}(e,i))),o=o.next(()=>{(function(u){u.createObjectStore(Jr,{keyPath:sv})})(e)})),r<5&&s>=5&&(o=o.next(()=>this.gi(i))),r<6&&s>=6&&(o=o.next(()=>(function(u){u.createObjectStore(Ii)}(e),this.pi(i)))),r<7&&s>=7&&(o=o.next(()=>this.yi(i))),r<8&&s>=8&&(o=o.next(()=>this.wi(e,i))),r<9&&s>=9&&(o=o.next(()=>{(function(u){u.objectStoreNames.contains("remoteDocumentChanges")&&u.deleteObjectStore("remoteDocumentChanges")})(e)})),r<10&&s>=10&&(o=o.next(()=>this.bi(i))),r<11&&s>=11&&(o=o.next(()=>{(function(u){u.createObjectStore(Va,{keyPath:iv})})(e),function(u){u.createObjectStore(Oa,{keyPath:ov})}(e)})),r<12&&s>=12&&(o=o.next(()=>{(function(u){const l=u.createObjectStore(xa,{keyPath:fv});l.createIndex(ku,pv,{unique:!1}),l.createIndex(ug,mv,{unique:!1})})(e)})),r<13&&s>=13&&(o=o.next(()=>function(u){const l=u.createObjectStore(ea,{keyPath:YT});l.createIndex(Lo,XT),l.createIndex(ig,ZT)}(e)).next(()=>this.Si(e,i)).next(()=>e.deleteObjectStore(zn))),r<14&&s>=14&&(o=o.next(()=>this.Di(e,i))),r<15&&s>=15&&(o=o.next(()=>function(u){u.createObjectStore(pl,{keyPath:av,autoIncrement:!0}).createIndex(Cu,cv,{unique:!1}),u.createObjectStore(ri,{keyPath:uv}).createIndex(ag,lv,{unique:!1}),u.createObjectStore(si,{keyPath:hv}).createIndex(cg,dv,{unique:!1})}(e))),r<16&&s>=16&&(o=o.next(()=>{t.objectStore(ri).clear()}).next(()=>{t.objectStore(si).clear()})),r<17&&s>=17&&(o=o.next(()=>{(function(u){u.createObjectStore(ml,{keyPath:gv})})(e)})),r<18&&s>=18&&xm()&&(o=o.next(()=>{t.objectStore(ri).clear()}).next(()=>{t.objectStore(si).clear()})),o}pi(e){let t=0;return e.store(zn).ee((r,s)=>{t+=ca(s)}).next(()=>{const r={byteSize:t};return e.store(Ii).put(Pu,r)})}gi(e){const t=e.store(yi),r=e.store(Et);return t.H().next(s=>A.forEach(s,i=>{const o=IDBKeyRange.bound([i.userId,Zn],[i.userId,i.lastAcknowledgedBatchId]);return r.H(Yn,o).next(c=>A.forEach(c,u=>{B(u.userId===i.userId,18650,"Cannot process batch from unexpected user",{batchId:u.batchId});const l=Kn(this.serializer,u);return m_(e,i.userId,l).next(()=>{})}))}))}yi(e){const t=e.store(Qr),r=e.store(zn);return e.store(er).get(ta).next(s=>{const i=[];return r.ee((o,c)=>{const u=new ne(o),l=function(p){return[0,Ge(p)]}(u);i.push(t.get(l).next(d=>d?A.resolve():(p=>t.put({targetId:0,path:Ge(p),sequenceNumber:s.highestListenSequenceNumber}))(u)))}).next(()=>A.waitFor(i))})}wi(e,t){e.createObjectStore(Ei,{keyPath:rv});const r=t.store(Ei),s=new Nl,i=o=>{if(s.add(o)){const c=o.lastSegment(),u=o.popLast();return r.put({collectionId:c,parent:Ge(u)})}};return t.store(zn).ee({Y:!0},(o,c)=>{const u=new ne(o);return i(u.popLast())}).next(()=>t.store(Wr).ee({Y:!0},([o,c,u],l)=>{const d=Nt(c);return i(d.popLast())}))}bi(e){const t=e.store(Kr);return t.ee((r,s)=>{const i=Ys(s),o=l_(this.serializer,i);return t.put(o)})}Si(e,t){const r=t.store(zn),s=[];return r.ee((i,o)=>{const c=t.store(ea),u=function(p){return p.document?new x(ne.fromString(p.document.name).popFirst(5)):p.noDocument?x.fromSegments(p.noDocument.path):p.unknownDocument?x.fromSegments(p.unknownDocument.path):L(36783)}(o).path.toArray(),l={prefixPath:u.slice(0,u.length-2),collectionGroup:u[u.length-2],documentId:u[u.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};s.push(c.put(l))}).next(()=>A.waitFor(s))}Di(e,t){const r=t.store(Et),s=T_(this.serializer),i=new Vl(Ha.Vi,this.serializer.yt);return r.H().next(o=>{const c=new Map;return o.forEach(u=>{let l=c.get(u.userId)??J();Kn(this.serializer,u).keys().forEach(d=>l=l.add(d)),c.set(u.userId,l)}),A.forEach(c,(u,l)=>{const d=new Oe(l),p=$a.wt(this.serializer,d),m=i.getIndexManager(d),T=ja.wt(d,this.serializer,m,i.referenceDelegate);return new v_(s,T,p,m).recalculateAndSaveOverlaysForDocumentKeys(new Nu(t,Xe.ce),u).next()})})}}function rp(n){n.createObjectStore(Qr,{keyPath:tv}).createIndex(fl,nv,{unique:!0}),n.createObjectStore(Kr,{keyPath:"targetId"}).createIndex(og,ev,{unique:!0}),n.createObjectStore(er)}const hn="IndexedDbPersistence",Jc=18e5,Yc=5e3,Xc="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",qA="main";class Ol{constructor(e,t,r,s,i,o,c,u,l,d,p=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=r,this.Ci=i,this.window=o,this.document=c,this.Fi=l,this.Mi=d,this.xi=p,this.ai=null,this.ui=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Oi=null,this.inForeground=!1,this.Ni=null,this.Bi=null,this.Li=Number.NEGATIVE_INFINITY,this.ki=m=>Promise.resolve(),!Ol.v())throw new V(S.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new PA(this,s),this.Ki=t+qA,this.serializer=new u_(u),this.qi=new Tn(this.Ki,this.xi,new BA(this.serializer)),this.ci=new _A,this.li=new RA(this.referenceDelegate,this.serializer),this.remoteDocumentCache=T_(this.serializer),this.Pi=new gA,this.window&&this.window.localStorage?this.Ui=this.window.localStorage:(this.Ui=null,d===!1&&Ie(hn,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.$i().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new V(S.FAILED_PRECONDITION,Xc);return this.Wi(),this.Qi(),this.Gi(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.li.getHighestSequenceNumber(e))}).then(e=>{this.ai=new Xe(e,this.Fi)}).then(()=>{this.ui=!0}).catch(e=>(this.qi&&this.qi.close(),Promise.reject(e)))}zi(e){return this.ki=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.qi.q(async t=>{t.newVersion===null&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Ci.enqueueAndForget(async()=>{this.started&&await this.$i()}))}$i(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>bo(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.ji(e).next(t=>{t||(this.isPrimary=!1,this.Ci.enqueueRetryable(()=>this.ki(!1)))})}).next(()=>this.Hi(e)).next(t=>this.isPrimary&&!t?this.Ji(e).next(()=>!1):!!t&&this.Zi(e).next(()=>!0))).catch(e=>{if(xn(e))return D(hn,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return D(hn,"Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.Ci.enqueueRetryable(()=>this.ki(e)),this.isPrimary=e})}ji(e){return $s(e).get(vr).next(t=>A.resolve(this.Xi(t)))}Yi(e){return bo(e).delete(this.clientId)}async es(){if(this.isPrimary&&!this.ts(this.Li,Jc)){this.Li=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",t=>{const r=Ce(t,Jr);return r.H().next(s=>{const i=this.ns(s,Jc),o=s.filter(c=>i.indexOf(c)===-1);return A.forEach(o,c=>r.delete(c.clientId)).next(()=>o)})}).catch(()=>[]);if(this.Ui)for(const t of e)this.Ui.removeItem(this.rs(t.clientId))}}Gi(){this.Bi=this.Ci.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.$i().then(()=>this.es()).then(()=>this.Gi()))}Xi(e){return!!e&&e.ownerId===this.clientId}Hi(e){return this.Mi?A.resolve(!0):$s(e).get(vr).next(t=>{if(t!==null&&this.ts(t.leaseTimestampMs,Yc)&&!this.ss(t.ownerId)){if(this.Xi(t)&&this.networkEnabled)return!0;if(!this.Xi(t)){if(!t.allowTabSynchronization)throw new V(S.FAILED_PRECONDITION,Xc);return!1}}return!(!this.networkEnabled||!this.inForeground)||bo(e).H().next(r=>this.ns(r,Yc).find(s=>{if(this.clientId!==s.clientId){const i=!this.networkEnabled&&s.networkEnabled,o=!this.inForeground&&s.inForeground,c=this.networkEnabled===s.networkEnabled;if(i||o&&c)return!0}return!1})===void 0)}).next(t=>(this.isPrimary!==t&&D(hn,`Client ${t?"is":"is not"} eligible for a primary lease.`),t))}async shutdown(){this.ui=!1,this._s(),this.Bi&&(this.Bi.cancel(),this.Bi=null),this.us(),this.cs(),await this.qi.runTransaction("shutdown","readwrite",[qi,Jr],e=>{const t=new Nu(e,Xe.ce);return this.Ji(t).next(()=>this.Yi(t))}),this.qi.close(),this.ls()}ns(e,t){return e.filter(r=>this.ts(r.updateTimeMs,t)&&!this.ss(r.clientId))}hs(){return this.runTransaction("getActiveClients","readonly",e=>bo(e).H().next(t=>this.ns(t,Jc).map(r=>r.clientId)))}get started(){return this.ui}getGlobalsCache(){return this.ci}getMutationQueue(e,t){return ja.wt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new AA(e,this.serializer.yt.databaseId)}getDocumentOverlayCache(e){return $a.wt(this.serializer,e)}getBundleCache(){return this.Pi}runTransaction(e,t,r){D(hn,"Starting transaction:",e);const s=t==="readonly"?"readonly":"readwrite",i=function(u){return u===18?Iv:u===17?fg:u===16?yv:u===15?gl:u===14?dg:u===13?hg:u===12?_v:u===11?lg:void L(60245)}(this.xi);let o;return this.qi.runTransaction(e,s,i,c=>(o=new Nu(c,this.ai?this.ai.next():Xe.ce),t==="readwrite-primary"?this.ji(o).next(u=>!!u||this.Hi(o)).next(u=>{if(!u)throw Ie(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Ci.enqueueRetryable(()=>this.ki(!1)),new V(S.FAILED_PRECONDITION,eg);return r(o)}).next(u=>this.Zi(o).next(()=>u)):this.Ps(o).next(()=>r(o)))).then(c=>(o.raiseOnCommittedEvent(),c))}Ps(e){return $s(e).get(vr).next(t=>{if(t!==null&&this.ts(t.leaseTimestampMs,Yc)&&!this.ss(t.ownerId)&&!this.Xi(t)&&!(this.Mi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new V(S.FAILED_PRECONDITION,Xc)})}Zi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return $s(e).put(vr,t)}static v(){return Tn.v()}Ji(e){const t=$s(e);return t.get(vr).next(r=>this.Xi(r)?(D(hn,"Releasing primary lease."),t.delete(vr)):A.resolve())}ts(e,t){const r=Date.now();return!(e<r-t)&&(!(e>r)||(Ie(`Detected an update time that is in the future: ${e} > ${r}`),!1))}Wi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Ni=()=>{this.Ci.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.$i()))},this.document.addEventListener("visibilitychange",this.Ni),this.inForeground=this.document.visibilityState==="visible")}us(){this.Ni&&(this.document.removeEventListener("visibilitychange",this.Ni),this.Ni=null)}Qi(){var e;typeof((e=this.window)==null?void 0:e.addEventListener)=="function"&&(this.Oi=()=>{this._s();const t=/(?:Version|Mobile)\/1[456]/;Om()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.Ci.enterRestrictedMode(!0),this.Ci.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Oi))}cs(){this.Oi&&(this.window.removeEventListener("pagehide",this.Oi),this.Oi=null)}ss(e){var t;try{const r=((t=this.Ui)==null?void 0:t.getItem(this.rs(e)))!==null;return D(hn,`Client '${e}' ${r?"is":"is not"} zombied in LocalStorage`),r}catch(r){return Ie(hn,"Failed to get zombied client id.",r),!1}}_s(){if(this.Ui)try{this.Ui.setItem(this.rs(this.clientId),String(Date.now()))}catch(e){Ie("Failed to set zombie client id.",e)}}ls(){if(this.Ui)try{this.Ui.removeItem(this.rs(this.clientId))}catch{}}rs(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function $s(n){return Ce(n,qi)}function bo(n){return Ce(n,Jr)}function A_(n,e){let t=n.projectId;return n.isDefaultDatabase||(t+="."+n.database),"firestore/"+e+"/"+t+"/"}/**
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
 */class xl{constructor(e,t,r,s){this.targetId=e,this.fromCache=t,this.Ts=r,this.Is=s}static Es(e,t){let r=J(),s=J();for(const i of t.docChanges)switch(i.type){case 0:r=r.add(i.doc.key);break;case 1:s=s.add(i.doc.key)}return new xl(e,t.fromCache,r,s)}}/**
 * @license
 * Copyright 2023 Google LLC
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
 */class $A{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class R_{constructor(){this.Rs=!1,this.As=!1,this.Vs=100,this.ds=function(){return Om()?8:ng(Pe())>0?6:4}()}initialize(e,t){this.fs=e,this.indexManager=t,this.Rs=!0}getDocumentsMatchingQuery(e,t,r,s){const i={result:null};return this.gs(e,t).next(o=>{i.result=o}).next(()=>{if(!i.result)return this.ps(e,t,s,r).next(o=>{i.result=o})}).next(()=>{if(i.result)return;const o=new $A;return this.ys(e,t,o).next(c=>{if(i.result=c,this.As)return this.ws(e,t,o,c.size)})}).next(()=>i.result)}ws(e,t,r,s){return r.documentReadCount<this.Vs?(kr()<=X.DEBUG&&D("QueryEngine","SDK will not create cache indexes for query:",Nr(t),"since it only creates cache indexes for collection contains","more than or equal to",this.Vs,"documents"),A.resolve()):(kr()<=X.DEBUG&&D("QueryEngine","Query:",Nr(t),"scans",r.documentReadCount,"local documents and returns",s,"documents as results."),r.documentReadCount>this.ds*s?(kr()<=X.DEBUG&&D("QueryEngine","The SDK decides to create cache indexes for query:",Nr(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,lt(t))):A.resolve())}gs(e,t){if(Sf(t))return A.resolve(null);let r=lt(t);return this.indexManager.getIndexType(e,r).next(s=>s===0?null:(t.limit!==null&&s===1&&(t=ia(t,null,"F"),r=lt(t)),this.indexManager.getDocumentsMatchingTarget(e,r).next(i=>{const o=J(...i);return this.fs.getDocuments(e,o).next(c=>this.indexManager.getMinOffset(e,r).next(u=>{const l=this.bs(t,c);return this.Ss(t,l,o,u.readTime)?this.gs(e,ia(t,null,"F")):this.Ds(e,l,t,u)}))})))}ps(e,t,r,s){return Sf(t)||s.isEqual(j.min())?A.resolve(null):this.fs.getDocuments(e,r).next(i=>{const o=this.bs(t,i);return this.Ss(t,o,r,s)?A.resolve(null):(kr()<=X.DEBUG&&D("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),Nr(t)),this.Ds(e,o,t,Xm(s,zr)).next(c=>c))})}bs(e,t){let r=new ie(xg(e));return t.forEach((s,i)=>{Hi(e,i)&&(r=r.add(i))}),r}Ss(e,t,r,s){if(e.limit===null)return!1;if(r.size!==t.size)return!0;const i=e.limitType==="F"?t.last():t.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(s)>0)}ys(e,t,r){return kr()<=X.DEBUG&&D("QueryEngine","Using full collection scan to execute query:",Nr(t)),this.fs.getDocumentsMatchingQuery(e,t,ht.min(),r)}Ds(e,t,r,s){return this.fs.getDocumentsMatchingQuery(e,r,s).next(i=>(t.forEach(o=>{i=i.insert(o.key,o)}),i))}}/**
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
 */const Ml="LocalStore",jA=3e8;class HA{constructor(e,t,r,s){this.persistence=e,this.Cs=t,this.serializer=s,this.vs=new ae(z),this.Fs=new Yt(i=>ir(i),$i),this.Ms=new Map,this.xs=e.getRemoteDocumentCache(),this.li=e.getTargetCache(),this.Pi=e.getBundleCache(),this.Os(r)}Os(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new v_(this.xs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.xs.setIndexManager(this.indexManager),this.Cs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.vs))}}function b_(n,e,t,r){return new HA(n,e,t,r)}async function S_(n,e){const t=F(n);return await t.persistence.runTransaction("Handle user change","readonly",r=>{let s;return t.mutationQueue.getAllMutationBatches(r).next(i=>(s=i,t.Os(e),t.mutationQueue.getAllMutationBatches(r))).next(i=>{const o=[],c=[];let u=J();for(const l of s){o.push(l.batchId);for(const d of l.mutations)u=u.add(d.key)}for(const l of i){c.push(l.batchId);for(const d of l.mutations)u=u.add(d.key)}return t.localDocuments.getDocuments(r,u).next(l=>({Ns:l,removedBatchIds:o,addedBatchIds:c}))})})}function GA(n,e){const t=F(n);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",r=>{const s=e.batch.keys(),i=t.xs.newChangeBuffer({trackRemovals:!0});return function(c,u,l,d){const p=l.batch,m=p.keys();let T=A.resolve();return m.forEach(C=>{T=T.next(()=>d.getEntry(u,C)).next(N=>{const k=l.docVersions.get(C);B(k!==null,48541),N.version.compareTo(k)<0&&(p.applyToRemoteDocument(N,l),N.isValidDocument()&&(N.setReadTime(l.commitVersion),d.addEntry(N)))})}),T.next(()=>c.mutationQueue.removeMutationBatch(u,p))}(t,r,e,i).next(()=>i.apply(r)).next(()=>t.mutationQueue.performConsistencyCheck(r)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(r,s,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,function(c){let u=J();for(let l=0;l<c.mutationResults.length;++l)c.mutationResults[l].transformResults.length>0&&(u=u.add(c.batch.mutations[l].key));return u}(e))).next(()=>t.localDocuments.getDocuments(r,s))})}function P_(n){const e=F(n);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.li.getLastRemoteSnapshotVersion(t))}function zA(n,e){const t=F(n),r=e.snapshotVersion;let s=t.vs;return t.persistence.runTransaction("Apply remote event","readwrite-primary",i=>{const o=t.xs.newChangeBuffer({trackRemovals:!0});s=t.vs;const c=[];e.targetChanges.forEach((d,p)=>{const m=s.get(p);if(!m)return;c.push(t.li.removeMatchingKeys(i,d.removedDocuments,p).next(()=>t.li.addMatchingKeys(i,d.addedDocuments,p)));let T=m.withSequenceNumber(i.currentSequenceNumber);e.targetMismatches.get(p)!==null?T=T.withResumeToken(we.EMPTY_BYTE_STRING,j.min()).withLastLimboFreeSnapshotVersion(j.min()):d.resumeToken.approximateByteSize()>0&&(T=T.withResumeToken(d.resumeToken,r)),s=s.insert(p,T),function(N,k,H){return N.resumeToken.approximateByteSize()===0||k.snapshotVersion.toMicroseconds()-N.snapshotVersion.toMicroseconds()>=jA?!0:H.addedDocuments.size+H.modifiedDocuments.size+H.removedDocuments.size>0}(m,T,d)&&c.push(t.li.updateTargetData(i,T))});let u=ct(),l=J();if(e.documentUpdates.forEach(d=>{e.resolvedLimboDocuments.has(d)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(i,d))}),c.push(WA(i,o,e.documentUpdates).next(d=>{u=d.Bs,l=d.Ls})),!r.isEqual(j.min())){const d=t.li.getLastRemoteSnapshotVersion(i).next(p=>t.li.setTargetsMetadata(i,i.currentSequenceNumber,r));c.push(d)}return A.waitFor(c).next(()=>o.apply(i)).next(()=>t.localDocuments.getLocalViewOfDocuments(i,u,l)).next(()=>u)}).then(i=>(t.vs=s,i))}function WA(n,e,t){let r=J(),s=J();return t.forEach(i=>r=r.add(i)),e.getEntries(n,r).next(i=>{let o=ct();return t.forEach((c,u)=>{const l=i.get(c);u.isFoundDocument()!==l.isFoundDocument()&&(s=s.add(c)),u.isNoDocument()&&u.version.isEqual(j.min())?(e.removeEntry(c,u.readTime),o=o.insert(c,u)):!l.isValidDocument()||u.version.compareTo(l.version)>0||u.version.compareTo(l.version)===0&&l.hasPendingWrites?(e.addEntry(u),o=o.insert(c,u)):D(Ml,"Ignoring outdated watch update for ",c,". Current version:",l.version," Watch version:",u.version)}),{Bs:o,Ls:s}})}function KA(n,e){const t=F(n);return t.persistence.runTransaction("Get next mutation batch","readonly",r=>(e===void 0&&(e=Zn),t.mutationQueue.getNextMutationBatchAfterBatchId(r,e)))}function la(n,e){const t=F(n);return t.persistence.runTransaction("Allocate target","readwrite",r=>{let s;return t.li.getTargetData(r,e).next(i=>i?(s=i,A.resolve(s)):t.li.allocateTargetId(r).next(o=>(s=new qt(e,o,"TargetPurposeListen",r.currentSequenceNumber),t.li.addTargetData(r,s).next(()=>s))))}).then(r=>{const s=t.vs.get(r.targetId);return(s===null||r.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(t.vs=t.vs.insert(r.targetId,r),t.Fs.set(e,r.targetId)),r})}async function ss(n,e,t){const r=F(n),s=r.vs.get(e),i=t?"readwrite":"readwrite-primary";try{t||await r.persistence.runTransaction("Release target",i,o=>r.persistence.referenceDelegate.removeTarget(o,s))}catch(o){if(!xn(o))throw o;D(Ml,`Failed to update sequence numbers for target ${e}: ${o}`)}r.vs=r.vs.remove(e),r.Fs.delete(s.target)}function ha(n,e,t){const r=F(n);let s=j.min(),i=J();return r.persistence.runTransaction("Execute query","readwrite",o=>function(u,l,d){const p=F(u),m=p.Fs.get(d);return m!==void 0?A.resolve(p.vs.get(m)):p.li.getTargetData(l,d)}(r,o,lt(e)).next(c=>{if(c)return s=c.lastLimboFreeSnapshotVersion,r.li.getMatchingKeysForTargetId(o,c.targetId).next(u=>{i=u})}).next(()=>r.Cs.getDocumentsMatchingQuery(o,e,t?s:j.min(),t?i:J())).next(c=>(N_(r,Og(e),c),{documents:c,ks:i})))}function C_(n,e){const t=F(n),r=F(t.li),s=t.vs.get(e);return s?Promise.resolve(s.target):t.persistence.runTransaction("Get target data","readonly",i=>r.At(i,e).next(o=>o?o.target:null))}function k_(n,e){const t=F(n),r=t.Ms.get(e)||j.min();return t.persistence.runTransaction("Get new document changes","readonly",s=>t.xs.getAllFromCollectionGroup(s,e,Xm(r,zr),Number.MAX_SAFE_INTEGER)).then(s=>(N_(t,e,s),s))}function N_(n,e,t){let r=n.Ms.get(e)||j.min();t.forEach((s,i)=>{i.readTime.compareTo(r)>0&&(r=i.readTime)}),n.Ms.set(e,r)}/**
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
 */const D_="firestore_clients";function sp(n,e){return`${D_}_${n}_${e}`}const V_="firestore_mutations";function ip(n,e,t){let r=`${V_}_${n}_${t}`;return e.isAuthenticated()&&(r+=`_${e.uid}`),r}const O_="firestore_targets";function Zc(n,e){return`${O_}_${n}_${e}`}/**
 * @license
 * Copyright 2018 Google LLC
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
 */const Ct="SharedClientState";class da{constructor(e,t,r,s){this.user=e,this.batchId=t,this.state=r,this.error=s}static $s(e,t,r){const s=JSON.parse(r);let i,o=typeof s=="object"&&["pending","acknowledged","rejected"].indexOf(s.state)!==-1&&(s.error===void 0||typeof s.error=="object");return o&&s.error&&(o=typeof s.error.message=="string"&&typeof s.error.code=="string",o&&(i=new V(s.error.code,s.error.message))),o?new da(e,t,s.state,i):(Ie(Ct,`Failed to parse mutation state for ID '${t}': ${r}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class ci{constructor(e,t,r){this.targetId=e,this.state=t,this.error=r}static $s(e,t){const r=JSON.parse(t);let s,i=typeof r=="object"&&["not-current","current","rejected"].indexOf(r.state)!==-1&&(r.error===void 0||typeof r.error=="object");return i&&r.error&&(i=typeof r.error.message=="string"&&typeof r.error.code=="string",i&&(s=new V(r.error.code,r.error.message))),i?new ci(e,r.state,s):(Ie(Ct,`Failed to parse target state for ID '${e}': ${t}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class fa{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static $s(e,t){const r=JSON.parse(t);let s=typeof r=="object"&&r.activeTargetIds instanceof Array,i=wl();for(let o=0;s&&o<r.activeTargetIds.length;++o)s=rg(r.activeTargetIds[o]),i=i.add(r.activeTargetIds[o]);return s?new fa(e,i):(Ie(Ct,`Failed to parse client data for instance '${e}': ${t}`),null)}}class Ll{constructor(e,t){this.clientId=e,this.onlineState=t}static $s(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new Ll(t.clientId,t.onlineState):(Ie(Ct,`Failed to parse online state: ${e}`),null)}}class Gu{constructor(){this.activeTargetIds=wl()}Qs(e){this.activeTargetIds=this.activeTargetIds.add(e)}Gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Ws(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class eu{constructor(e,t,r,s,i){this.window=e,this.Ci=t,this.persistenceKey=r,this.zs=s,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.js=this.Hs.bind(this),this.Js=new ae(z),this.started=!1,this.Zs=[];const o=r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=i,this.Xs=sp(this.persistenceKey,this.zs),this.Ys=function(u){return`firestore_sequence_number_${u}`}(this.persistenceKey),this.Js=this.Js.insert(this.zs,new Gu),this.eo=new RegExp(`^${D_}_${o}_([^_]*)$`),this.no=new RegExp(`^${V_}_${o}_(\\d+)(?:_(.*))?$`),this.ro=new RegExp(`^${O_}_${o}_(\\d+)$`),this.io=function(u){return`firestore_online_state_${u}`}(this.persistenceKey),this.so=function(u){return`firestore_bundle_loaded_v2_${u}`}(this.persistenceKey),this.window.addEventListener("storage",this.js)}static v(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.hs();for(const r of e){if(r===this.zs)continue;const s=this.getItem(sp(this.persistenceKey,r));if(s){const i=fa.$s(r,s);i&&(this.Js=this.Js.insert(i.clientId,i))}}this.oo();const t=this.storage.getItem(this.io);if(t){const r=this._o(t);r&&this.ao(r)}for(const r of this.Zs)this.Hs(r);this.Zs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.Ys,JSON.stringify(e))}getAllActiveQueryTargets(){return this.uo(this.Js)}isActiveQueryTarget(e){let t=!1;return this.Js.forEach((r,s)=>{s.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.co(e,"pending")}updateMutationState(e,t,r){this.co(e,t,r),this.lo(e)}addLocalQueryTarget(e,t=!0){let r="not-current";if(this.isActiveQueryTarget(e)){const s=this.storage.getItem(Zc(this.persistenceKey,e));if(s){const i=ci.$s(e,s);i&&(r=i.state)}}return t&&this.ho.Qs(e),this.oo(),r}removeLocalQueryTarget(e){this.ho.Gs(e),this.oo()}isLocalQueryTarget(e){return this.ho.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(Zc(this.persistenceKey,e))}updateQueryState(e,t,r){this.Po(e,t,r)}handleUserChange(e,t,r){t.forEach(s=>{this.lo(s)}),this.currentUser=e,r.forEach(s=>{this.addPendingMutation(s)})}setOnlineState(e){this.To(e)}notifyBundleLoaded(e){this.Io(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.js),this.removeItem(this.Xs),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return D(Ct,"READ",e,t),t}setItem(e,t){D(Ct,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){D(Ct,"REMOVE",e),this.storage.removeItem(e)}Hs(e){const t=e;if(t.storageArea===this.storage){if(D(Ct,"EVENT",t.key,t.newValue),t.key===this.Xs)return void Ie("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Ci.enqueueRetryable(async()=>{if(this.started){if(t.key!==null){if(this.eo.test(t.key)){if(t.newValue==null){const r=this.Eo(t.key);return this.Ro(r,null)}{const r=this.Ao(t.key,t.newValue);if(r)return this.Ro(r.clientId,r)}}else if(this.no.test(t.key)){if(t.newValue!==null){const r=this.Vo(t.key,t.newValue);if(r)return this.mo(r)}}else if(this.ro.test(t.key)){if(t.newValue!==null){const r=this.fo(t.key,t.newValue);if(r)return this.po(r)}}else if(t.key===this.io){if(t.newValue!==null){const r=this._o(t.newValue);if(r)return this.ao(r)}}else if(t.key===this.Ys){const r=function(i){let o=Xe.ce;if(i!=null)try{const c=JSON.parse(i);B(typeof c=="number",30636,{yo:i}),o=c}catch(c){Ie(Ct,"Failed to read sequence number from WebStorage",c)}return o}(t.newValue);r!==Xe.ce&&this.sequenceNumberHandler(r)}else if(t.key===this.so){const r=this.wo(t.newValue);await Promise.all(r.map(s=>this.syncEngine.bo(s)))}}}else this.Zs.push(t)})}}get ho(){return this.Js.get(this.zs)}oo(){this.setItem(this.Xs,this.ho.Ws())}co(e,t,r){const s=new da(this.currentUser,e,t,r),i=ip(this.persistenceKey,this.currentUser,e);this.setItem(i,s.Ws())}lo(e){const t=ip(this.persistenceKey,this.currentUser,e);this.removeItem(t)}To(e){const t={clientId:this.zs,onlineState:e};this.storage.setItem(this.io,JSON.stringify(t))}Po(e,t,r){const s=Zc(this.persistenceKey,e),i=new ci(e,t,r);this.setItem(s,i.Ws())}Io(e){const t=JSON.stringify(Array.from(e));this.setItem(this.so,t)}Eo(e){const t=this.eo.exec(e);return t?t[1]:null}Ao(e,t){const r=this.Eo(e);return fa.$s(r,t)}Vo(e,t){const r=this.no.exec(e),s=Number(r[1]),i=r[2]!==void 0?r[2]:null;return da.$s(new Oe(i),s,t)}fo(e,t){const r=this.ro.exec(e),s=Number(r[1]);return ci.$s(s,t)}_o(e){return Ll.$s(e)}wo(e){return JSON.parse(e)}async mo(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.So(e.batchId,e.state,e.error);D(Ct,`Ignoring mutation for non-active user ${e.user.uid}`)}po(e){return this.syncEngine.Do(e.targetId,e.state,e.error)}Ro(e,t){const r=t?this.Js.insert(e,t):this.Js.remove(e),s=this.uo(this.Js),i=this.uo(r),o=[],c=[];return i.forEach(u=>{s.has(u)||o.push(u)}),s.forEach(u=>{i.has(u)||c.push(u)}),this.syncEngine.Co(o,c).then(()=>{this.Js=r})}ao(e){this.Js.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}uo(e){let t=wl();return e.forEach((r,s)=>{t=t.unionWith(s.activeTargetIds)}),t}}class x_{constructor(){this.vo=new Gu,this.Fo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,r){}addLocalQueryTarget(e,t=!0){return t&&this.vo.Qs(e),this.Fo[e]||"not-current"}updateQueryState(e,t,r){this.Fo[e]=t}removeLocalQueryTarget(e){this.vo.Gs(e)}isLocalQueryTarget(e){return this.vo.activeTargetIds.has(e)}clearQueryState(e){delete this.Fo[e]}getAllActiveQueryTargets(){return this.vo.activeTargetIds}isActiveQueryTarget(e){return this.vo.activeTargetIds.has(e)}start(){return this.vo=new Gu,Promise.resolve()}handleUserChange(e,t,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class QA{Mo(e){}shutdown(){}}/**
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
 */const op="ConnectivityMonitor";class ap{constructor(){this.xo=()=>this.Oo(),this.No=()=>this.Bo(),this.Lo=[],this.ko()}Mo(e){this.Lo.push(e)}shutdown(){window.removeEventListener("online",this.xo),window.removeEventListener("offline",this.No)}ko(){window.addEventListener("online",this.xo),window.addEventListener("offline",this.No)}Oo(){D(op,"Network connectivity changed: AVAILABLE");for(const e of this.Lo)e(0)}Bo(){D(op,"Network connectivity changed: UNAVAILABLE");for(const e of this.Lo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
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
 */let So=null;function zu(){return So===null?So=function(){return 268435456+Math.round(2147483648*Math.random())}():So++,"0x"+So.toString(16)}/**
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
 */const tu="RestConnection",JA={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery",ExecutePipeline:"executePipeline"};class YA{get Ko(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",r=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.qo=t+"://"+e.host,this.Uo=`projects/${r}/databases/${s}`,this.$o=this.databaseId.database===na?`project_id=${r}`:`project_id=${r}&database_id=${s}`}Wo(e,t,r,s,i){const o=zu(),c=this.Qo(e,t.toUriEncodedString());D(tu,`Sending RPC '${e}' ${o}:`,c,r);const u={"google-cloud-resource-prefix":this.Uo,"x-goog-request-params":this.$o};this.Go(u,s,i);const{host:l}=new URL(c),d=At(l);return this.zo(e,c,u,r,d).then(p=>(D(tu,`Received RPC '${e}' ${o}: `,p),p),p=>{throw Hr(tu,`RPC '${e}' ${o} failed with error: `,p,"url: ",c,"request:",r),p})}jo(e,t,r,s,i,o){return this.Wo(e,t,r,s,i)}Go(e,t,r){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+hs}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((s,i)=>e[i]=s),r&&r.headers.forEach((s,i)=>e[i]=s)}Qo(e,t){const r=JA[e];let s=`${this.qo}/v1/${t}:${r}`;return this.databaseInfo.apiKey&&(s=`${s}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`),s}terminate(){}}/**
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
 */class XA{constructor(e){this.Ho=e.Ho,this.Jo=e.Jo}Zo(e){this.Xo=e}Yo(e){this.e_=e}t_(e){this.n_=e}onMessage(e){this.r_=e}close(){this.Jo()}send(e){this.Ho(e)}i_(){this.Xo()}s_(){this.e_()}o_(e){this.n_(e)}__(e){this.r_(e)}}/**
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
 */const $e="WebChannelConnection",js=(n,e,t)=>{n.listen(e,r=>{try{t(r)}catch(s){setTimeout(()=>{throw s},0)}})};class Ur extends YA{constructor(e){super(e),this.a_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}static u_(){if(!Ur.c_){const e=Gm();js(e,Hm.STAT_EVENT,t=>{t.stat===Au.PROXY?D($e,"STAT_EVENT: detected buffering proxy"):t.stat===Au.NOPROXY&&D($e,"STAT_EVENT: detected no buffering proxy")}),Ur.c_=!0}}zo(e,t,r,s,i){const o=zu();return new Promise((c,u)=>{const l=new $m;l.setWithCredentials(!0),l.listenOnce(jm.COMPLETE,()=>{try{switch(l.getLastErrorCode()){case Oo.NO_ERROR:const p=l.getResponseJson();D($e,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(p)),c(p);break;case Oo.TIMEOUT:D($e,`RPC '${e}' ${o} timed out`),u(new V(S.DEADLINE_EXCEEDED,"Request time out"));break;case Oo.HTTP_ERROR:const m=l.getStatus();if(D($e,`RPC '${e}' ${o} failed with status:`,m,"response text:",l.getResponseText()),m>0){let T=l.getResponseJson();Array.isArray(T)&&(T=T[0]);const C=T==null?void 0:T.error;if(C&&C.status&&C.message){const N=function(H){const $=H.toLowerCase().replace(/_/g,"-");return Object.values(S).indexOf($)>=0?$:S.UNKNOWN}(C.status);u(new V(N,C.message))}else u(new V(S.UNKNOWN,"Server responded with status "+l.getStatus()))}else u(new V(S.UNAVAILABLE,"Connection failed."));break;default:L(9055,{l_:e,streamId:o,h_:l.getLastErrorCode(),P_:l.getLastError()})}}finally{D($e,`RPC '${e}' ${o} completed.`)}});const d=JSON.stringify(s);D($e,`RPC '${e}' ${o} sending request:`,s),l.send(t,"POST",d,r,15)})}T_(e,t,r){const s=zu(),i=[this.qo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=this.createWebChannelTransport(),c={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(c.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(c.useFetchStreams=!0),this.Go(c.initMessageHeaders,t,r),c.encodeInitMessageHeaders=!0;const l=i.join("");D($e,`Creating RPC '${e}' stream ${s}: ${l}`,c);const d=o.createWebChannel(l,c);this.I_(d);let p=!1,m=!1;const T=new XA({Ho:C=>{m?D($e,`Not sending because RPC '${e}' stream ${s} is closed:`,C):(p||(D($e,`Opening RPC '${e}' stream ${s} transport.`),d.open(),p=!0),D($e,`RPC '${e}' stream ${s} sending:`,C),d.send(C))},Jo:()=>d.close()});return js(d,Ks.EventType.OPEN,()=>{m||(D($e,`RPC '${e}' stream ${s} transport opened.`),T.i_())}),js(d,Ks.EventType.CLOSE,()=>{m||(m=!0,D($e,`RPC '${e}' stream ${s} transport closed`),T.o_(),this.E_(d))}),js(d,Ks.EventType.ERROR,C=>{m||(m=!0,Hr($e,`RPC '${e}' stream ${s} transport errored. Name:`,C.name,"Message:",C.message),T.o_(new V(S.UNAVAILABLE,"The operation could not be completed")))}),js(d,Ks.EventType.MESSAGE,C=>{var N;if(!m){const k=C.data[0];B(!!k,16349);const H=k,$=(H==null?void 0:H.error)||((N=H[0])==null?void 0:N.error);if($){D($e,`RPC '${e}' stream ${s} received error:`,$);const U=$.status;let G=function(E){const _=Te[E];if(_!==void 0)return Qg(_)}(U),K=$.message;G===void 0&&(G=S.INTERNAL,K="Unknown error status: "+U+" with message "+$.message),m=!0,T.o_(new V(G,K)),d.close()}else D($e,`RPC '${e}' stream ${s} received:`,k),T.__(k)}}),Ur.u_(),setTimeout(()=>{T.s_()},0),T}terminate(){this.a_.forEach(e=>e.close()),this.a_=[]}I_(e){this.a_.push(e)}E_(e){this.a_=this.a_.filter(t=>t===e)}Go(e,t,r){super.Go(e,t,r),this.databaseInfo.apiKey&&(e["x-goog-api-key"]=this.databaseInfo.apiKey)}createWebChannelTransport(){return zm()}}/**
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
 */function ZA(n){return new Ur(n)}/**
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
 */function M_(){return typeof window<"u"?window:null}function Ho(){return typeof document<"u"?document:null}/**
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
 */function Ga(n){return new rA(n,!0)}/**
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
 */Ur.c_=!1;class Ul{constructor(e,t,r=1e3,s=1.5,i=6e4){this.Ci=e,this.timerId=t,this.R_=r,this.A_=s,this.V_=i,this.d_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.d_=0}g_(){this.d_=this.V_}p_(e){this.cancel();const t=Math.floor(this.d_+this.y_()),r=Math.max(0,Date.now()-this.f_),s=Math.max(0,t-r);s>0&&D("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.d_} ms, delay with jitter: ${t} ms, last attempt: ${r} ms ago)`),this.m_=this.Ci.enqueueAfterDelay(this.timerId,s,()=>(this.f_=Date.now(),e())),this.d_*=this.A_,this.d_<this.R_&&(this.d_=this.R_),this.d_>this.V_&&(this.d_=this.V_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.d_}}/**
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
 */const cp="PersistentStream";class L_{constructor(e,t,r,s,i,o,c,u){this.Ci=e,this.b_=r,this.S_=s,this.connection=i,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=c,this.listener=u,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new Ul(e,t)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Ci.enqueueAfterDelay(this.b_,6e4,()=>this.k_()))}K_(e){this.q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===S.RESOURCE_EXHAUSTED?(Ie(t.toString()),Ie("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===S.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.W_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.t_(t)}W_(){}auth(){this.state=1;const e=this.Q_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([r,s])=>{this.D_===t&&this.G_(r,s)},r=>{e(()=>{const s=new V(S.UNKNOWN,"Fetching auth token failed: "+r.message);return this.z_(s)})})}G_(e,t){const r=this.Q_(this.D_);this.stream=this.j_(e,t),this.stream.Zo(()=>{r(()=>this.listener.Zo())}),this.stream.Yo(()=>{r(()=>(this.state=2,this.v_=this.Ci.enqueueAfterDelay(this.S_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.Yo()))}),this.stream.t_(s=>{r(()=>this.z_(s))}),this.stream.onMessage(s=>{r(()=>++this.F_==1?this.H_(s):this.onNext(s))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return D(cp,`close with error: ${e}`),this.stream=null,this.close(4,e)}Q_(e){return t=>{this.Ci.enqueueAndForget(()=>this.D_===e?t():(D(cp,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class eR extends L_{constructor(e,t,r,s,i,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,r,s,o),this.serializer=i}j_(e,t){return this.connection.T_("Listen",e,t)}H_(e){return this.onNext(e)}onNext(e){this.M_.reset();const t=aA(this.serializer,e),r=function(i){if(!("targetChange"in i))return j.min();const o=i.targetChange;return o.targetIds&&o.targetIds.length?j.min():o.readTime?Me(o.readTime):j.min()}(e);return this.listener.J_(t,r)}Z_(e){const t={};t.database=Bu(this.serializer),t.addTarget=function(i,o){let c;const u=o.target;if(c=ra(u)?{documents:r_(i,u)}:{query:Cl(i,u).ft},c.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){c.resumeToken=Xg(i,o.resumeToken);const l=Uu(i,o.expectedCount);l!==null&&(c.expectedCount=l)}else if(o.snapshotVersion.compareTo(j.min())>0){c.readTime=rs(i,o.snapshotVersion.toTimestamp());const l=Uu(i,o.expectedCount);l!==null&&(c.expectedCount=l)}return c}(this.serializer,e);const r=lA(this.serializer,e);r&&(t.labels=r),this.K_(t)}X_(e){const t={};t.database=Bu(this.serializer),t.removeTarget=e,this.K_(t)}}class tR extends L_{constructor(e,t,r,s,i,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,r,s,o),this.serializer=i}get Y_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}W_(){this.Y_&&this.ea([])}j_(e,t){return this.connection.T_("Write",e,t)}H_(e){return B(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,B(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){B(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const t=cA(e.writeResults,e.commitTime),r=Me(e.commitTime);return this.listener.na(r,t)}ra(){const e={};e.database=Bu(this.serializer),this.K_(e)}ea(e){const t={streamToken:this.lastStreamToken,writes:e.map(r=>Si(this.serializer,r))};this.K_(t)}}/**
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
 */class nR{}class rR extends nR{constructor(e,t,r,s){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=r,this.serializer=s,this.ia=!1}sa(){if(this.ia)throw new V(S.FAILED_PRECONDITION,"The client has already been terminated.")}Wo(e,t,r,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([i,o])=>this.connection.Wo(e,Fu(t,r),s,i,o)).catch(i=>{throw i.name==="FirebaseError"?(i.code===S.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),i):new V(S.UNKNOWN,i.toString())})}jo(e,t,r,s,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,c])=>this.connection.jo(e,Fu(t,r),s,o,c,i)).catch(o=>{throw o.name==="FirebaseError"?(o.code===S.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new V(S.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}function sR(n,e,t,r){return new rR(n,e,t,r)}class iR{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(Ie(t),this.aa=!1):D("OnlineStateTracker",t)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
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
 */const ur="RemoteStore";class oR{constructor(e,t,r,s,i){this.localStore=e,this.datastore=t,this.asyncQueue=r,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.Ra=[],this.Aa=i,this.Aa.Mo(o=>{r.enqueueAndForget(async()=>{yr(this)&&(D(ur,"Restarting streams for network reachability change."),await async function(u){const l=F(u);l.Ea.add(4),await Wi(l),l.Va.set("Unknown"),l.Ea.delete(4),await za(l)}(this))})}),this.Va=new iR(r,s)}}async function za(n){if(yr(n))for(const e of n.Ra)await e(!0)}async function Wi(n){for(const e of n.Ra)await e(!1)}function Wa(n,e){const t=F(n);t.Ia.has(e.targetId)||(t.Ia.set(e.targetId,e),ql(t)?Bl(t):ms(t).O_()&&Fl(t,e))}function is(n,e){const t=F(n),r=ms(t);t.Ia.delete(e),r.O_()&&U_(t,e),t.Ia.size===0&&(r.O_()?r.L_():yr(t)&&t.Va.set("Unknown"))}function Fl(n,e){if(n.da.$e(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(j.min())>0){const t=n.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}ms(n).Z_(e)}function U_(n,e){n.da.$e(e),ms(n).X_(e)}function Bl(n){n.da=new Zv({getRemoteKeysForTarget:e=>n.remoteSyncer.getRemoteKeysForTarget(e),At:e=>n.Ia.get(e)||null,ht:()=>n.datastore.serializer.databaseId}),ms(n).start(),n.Va.ua()}function ql(n){return yr(n)&&!ms(n).x_()&&n.Ia.size>0}function yr(n){return F(n).Ea.size===0}function F_(n){n.da=void 0}async function aR(n){n.Va.set("Online")}async function cR(n){n.Ia.forEach((e,t)=>{Fl(n,e)})}async function uR(n,e){F_(n),ql(n)?(n.Va.ha(e),Bl(n)):n.Va.set("Unknown")}async function lR(n,e,t){if(n.Va.set("Online"),e instanceof Yg&&e.state===2&&e.cause)try{await async function(s,i){const o=i.cause;for(const c of i.targetIds)s.Ia.has(c)&&(await s.remoteSyncer.rejectListen(c,o),s.Ia.delete(c),s.da.removeTarget(c))}(n,e)}catch(r){D(ur,"Failed to remove targets %s: %s ",e.targetIds.join(","),r),await pa(n,r)}else if(e instanceof $o?n.da.Xe(e):e instanceof Jg?n.da.st(e):n.da.tt(e),!t.isEqual(j.min()))try{const r=await P_(n.localStore);t.compareTo(r)>=0&&await function(i,o){const c=i.da.Tt(o);return c.targetChanges.forEach((u,l)=>{if(u.resumeToken.approximateByteSize()>0){const d=i.Ia.get(l);d&&i.Ia.set(l,d.withResumeToken(u.resumeToken,o))}}),c.targetMismatches.forEach((u,l)=>{const d=i.Ia.get(u);if(!d)return;i.Ia.set(u,d.withResumeToken(we.EMPTY_BYTE_STRING,d.snapshotVersion)),U_(i,u);const p=new qt(d.target,u,l,d.sequenceNumber);Fl(i,p)}),i.remoteSyncer.applyRemoteEvent(c)}(n,t)}catch(r){D(ur,"Failed to raise snapshot:",r),await pa(n,r)}}async function pa(n,e,t){if(!xn(e))throw e;n.Ea.add(1),await Wi(n),n.Va.set("Offline"),t||(t=()=>P_(n.localStore)),n.asyncQueue.enqueueRetryable(async()=>{D(ur,"Retrying IndexedDB access"),await t(),n.Ea.delete(1),await za(n)})}function B_(n,e){return e().catch(t=>pa(n,t,e))}async function ps(n){const e=F(n),t=Nn(e);let r=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:Zn;for(;hR(e);)try{const s=await KA(e.localStore,r);if(s===null){e.Ta.length===0&&t.L_();break}r=s.batchId,dR(e,s)}catch(s){await pa(e,s)}q_(e)&&$_(e)}function hR(n){return yr(n)&&n.Ta.length<10}function dR(n,e){n.Ta.push(e);const t=Nn(n);t.O_()&&t.Y_&&t.ea(e.mutations)}function q_(n){return yr(n)&&!Nn(n).x_()&&n.Ta.length>0}function $_(n){Nn(n).start()}async function fR(n){Nn(n).ra()}async function pR(n){const e=Nn(n);for(const t of n.Ta)e.ea(t.mutations)}async function mR(n,e,t){const r=n.Ta.shift(),s=Rl.from(r,e,t);await B_(n,()=>n.remoteSyncer.applySuccessfulWrite(s)),await ps(n)}async function gR(n,e){e&&Nn(n).Y_&&await async function(r,s){if(function(o){return Kg(o)&&o!==S.ABORTED}(s.code)){const i=r.Ta.shift();Nn(r).B_(),await B_(r,()=>r.remoteSyncer.rejectFailedWrite(i.batchId,s)),await ps(r)}}(n,e),q_(n)&&$_(n)}async function up(n,e){const t=F(n);t.asyncQueue.verifyOperationInProgress(),D(ur,"RemoteStore received new credentials");const r=yr(t);t.Ea.add(3),await Wi(t),r&&t.Va.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ea.delete(3),await za(t)}async function Wu(n,e){const t=F(n);e?(t.Ea.delete(2),await za(t)):e||(t.Ea.add(2),await Wi(t),t.Va.set("Unknown"))}function ms(n){return n.ma||(n.ma=function(t,r,s){const i=F(t);return i.sa(),new eR(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(n.datastore,n.asyncQueue,{Zo:aR.bind(null,n),Yo:cR.bind(null,n),t_:uR.bind(null,n),J_:lR.bind(null,n)}),n.Ra.push(async e=>{e?(n.ma.B_(),ql(n)?Bl(n):n.Va.set("Unknown")):(await n.ma.stop(),F_(n))})),n.ma}function Nn(n){return n.fa||(n.fa=function(t,r,s){const i=F(t);return i.sa(),new tR(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(n.datastore,n.asyncQueue,{Zo:()=>Promise.resolve(),Yo:fR.bind(null,n),t_:gR.bind(null,n),ta:pR.bind(null,n),na:mR.bind(null,n)}),n.Ra.push(async e=>{e?(n.fa.B_(),await ps(n)):(await n.fa.stop(),n.Ta.length>0&&(D(ur,`Stopping write stream with ${n.Ta.length} pending writes`),n.Ta=[]))})),n.fa}/**
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
 */class $l{constructor(e,t,r,s,i){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=r,this.op=s,this.removalCallback=i,this.deferred=new ut,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,r,s,i){const o=Date.now()+r,c=new $l(e,t,o,s,i);return c.start(r),c}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new V(S.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Ka(n,e){if(Ie("AsyncQueue",`${e}: ${n}`),xn(n))return new V(S.UNAVAILABLE,`${e}: ${n}`);throw n}/**
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
 */class Fr{static emptySet(e){return new Fr(e.comparator)}constructor(e){this.comparator=e?(t,r)=>e(t,r)||x.comparator(t.key,r.key):(t,r)=>x.comparator(t.key,r.key),this.keyedMap=Qs(),this.sortedSet=new ae(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,r)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof Fr)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=r.getNext().key;if(!s.isEqual(i))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const r=new Fr;return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=t,r}}/**
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
 */class lp{constructor(){this.ga=new ae(x.comparator)}track(e){const t=e.doc.key,r=this.ga.get(t);r?e.type!==0&&r.type===3?this.ga=this.ga.insert(t,e):e.type===3&&r.type!==1?this.ga=this.ga.insert(t,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.ga=this.ga.insert(t,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.ga=this.ga.remove(t):e.type===1&&r.type===2?this.ga=this.ga.insert(t,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):L(63341,{Vt:e,pa:r}):this.ga=this.ga.insert(t,e)}ya(){const e=[];return this.ga.inorderTraversal((t,r)=>{e.push(r)}),e}}class os{constructor(e,t,r,s,i,o,c,u,l){this.query=e,this.docs=t,this.oldDocs=r,this.docChanges=s,this.mutatedKeys=i,this.fromCache=o,this.syncStateChanged=c,this.excludesMetadataChanges=u,this.hasCachedResults=l}static fromInitialDocuments(e,t,r,s,i){const o=[];return t.forEach(c=>{o.push({type:0,doc:c})}),new os(e,t,Fr.emptySet(t),o,r,s,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&Fa(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,r=e.docChanges;if(t.length!==r.length)return!1;for(let s=0;s<t.length;s++)if(t[s].type!==r[s].type||!t[s].doc.isEqual(r[s].doc))return!1;return!0}}/**
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
 */class _R{constructor(){this.wa=void 0,this.ba=[]}Sa(){return this.ba.some(e=>e.Da())}}class yR{constructor(){this.queries=hp(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(t,r){const s=F(t),i=s.queries;s.queries=hp(),i.forEach((o,c)=>{for(const u of c.ba)u.onError(r)})})(this,new V(S.ABORTED,"Firestore shutting down"))}}function hp(){return new Yt(n=>Vg(n),Fa)}async function jl(n,e){const t=F(n);let r=3;const s=e.query;let i=t.queries.get(s);i?!i.Sa()&&e.Da()&&(r=2):(i=new _R,r=e.Da()?0:1);try{switch(r){case 0:i.wa=await t.onListen(s,!0);break;case 1:i.wa=await t.onListen(s,!1);break;case 2:await t.onFirstRemoteStoreListen(s)}}catch(o){const c=Ka(o,`Initialization of query '${Nr(e.query)}' failed`);return void e.onError(c)}t.queries.set(s,i),i.ba.push(e),e.va(t.onlineState),i.wa&&e.Fa(i.wa)&&Gl(t)}async function Hl(n,e){const t=F(n),r=e.query;let s=3;const i=t.queries.get(r);if(i){const o=i.ba.indexOf(e);o>=0&&(i.ba.splice(o,1),i.ba.length===0?s=e.Da()?0:1:!i.Sa()&&e.Da()&&(s=2))}switch(s){case 0:return t.queries.delete(r),t.onUnlisten(r,!0);case 1:return t.queries.delete(r),t.onUnlisten(r,!1);case 2:return t.onLastRemoteStoreUnlisten(r);default:return}}function IR(n,e){const t=F(n);let r=!1;for(const s of e){const i=s.query,o=t.queries.get(i);if(o){for(const c of o.ba)c.Fa(s)&&(r=!0);o.wa=s}}r&&Gl(t)}function ER(n,e,t){const r=F(n),s=r.queries.get(e);if(s)for(const i of s.ba)i.onError(t);r.queries.delete(e)}function Gl(n){n.Ca.forEach(e=>{e.next()})}var Ku,dp;(dp=Ku||(Ku={})).Ma="default",dp.Cache="cache";class zl{constructor(e,t,r){this.query=e,this.xa=t,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=r||{}}Fa(e){if(!this.options.includeMetadataChanges){const r=[];for(const s of e.docChanges)s.type!==3&&r.push(s);e=new os(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Oa?this.Ba(e)&&(this.xa.next(e),t=!0):this.La(e,this.onlineState)&&(this.ka(e),t=!0),this.Na=e,t}onError(e){this.xa.error(e)}va(e){this.onlineState=e;let t=!1;return this.Na&&!this.Oa&&this.La(this.Na,e)&&(this.ka(this.Na),t=!0),t}La(e,t){if(!e.fromCache||!this.Da())return!0;const r=t!=="Offline";return(!this.options.Ka||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Ba(e){if(e.docChanges.length>0)return!0;const t=this.Na&&this.Na.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}ka(e){e=os.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Oa=!0,this.xa.next(e)}Da(){return this.options.source!==Ku.Cache}}/**
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
 */class j_{constructor(e){this.key=e}}class H_{constructor(e){this.key=e}}class G_{constructor(e,t){this.query=e,this.Za=t,this.Xa=null,this.hasCachedResults=!1,this.current=!1,this.Ya=J(),this.mutatedKeys=J(),this.eu=xg(e),this.tu=new Fr(this.eu)}get nu(){return this.Za}ru(e,t){const r=t?t.iu:new lp,s=t?t.tu:this.tu;let i=t?t.mutatedKeys:this.mutatedKeys,o=s,c=!1;const u=this.query.limitType==="F"&&s.size===this.query.limit?s.last():null,l=this.query.limitType==="L"&&s.size===this.query.limit?s.first():null;if(e.inorderTraversal((d,p)=>{const m=s.get(d),T=Hi(this.query,p)?p:null,C=!!m&&this.mutatedKeys.has(m.key),N=!!T&&(T.hasLocalMutations||this.mutatedKeys.has(T.key)&&T.hasCommittedMutations);let k=!1;m&&T?m.data.isEqual(T.data)?C!==N&&(r.track({type:3,doc:T}),k=!0):this.su(m,T)||(r.track({type:2,doc:T}),k=!0,(u&&this.eu(T,u)>0||l&&this.eu(T,l)<0)&&(c=!0)):!m&&T?(r.track({type:0,doc:T}),k=!0):m&&!T&&(r.track({type:1,doc:m}),k=!0,(u||l)&&(c=!0)),k&&(T?(o=o.add(T),i=N?i.add(d):i.delete(d)):(o=o.delete(d),i=i.delete(d)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const d=this.query.limitType==="F"?o.last():o.first();o=o.delete(d.key),i=i.delete(d.key),r.track({type:1,doc:d})}return{tu:o,iu:r,Ss:c,mutatedKeys:i}}su(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,r,s){const i=this.tu;this.tu=e.tu,this.mutatedKeys=e.mutatedKeys;const o=e.iu.ya();o.sort((d,p)=>function(T,C){const N=k=>{switch(k){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return L(20277,{Vt:k})}};return N(T)-N(C)}(d.type,p.type)||this.eu(d.doc,p.doc)),this.ou(r),s=s??!1;const c=t&&!s?this._u():[],u=this.Ya.size===0&&this.current&&!s?1:0,l=u!==this.Xa;return this.Xa=u,o.length!==0||l?{snapshot:new os(this.query,e.tu,i,o,e.mutatedKeys,u===0,l,!1,!!r&&r.resumeToken.approximateByteSize()>0),au:c}:{au:c}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new lp,mutatedKeys:this.mutatedKeys,Ss:!1},!1)):{au:[]}}uu(e){return!this.Za.has(e)&&!!this.tu.has(e)&&!this.tu.get(e).hasLocalMutations}ou(e){e&&(e.addedDocuments.forEach(t=>this.Za=this.Za.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.Za=this.Za.delete(t)),this.current=e.current)}_u(){if(!this.current)return[];const e=this.Ya;this.Ya=J(),this.tu.forEach(r=>{this.uu(r.key)&&(this.Ya=this.Ya.add(r.key))});const t=[];return e.forEach(r=>{this.Ya.has(r)||t.push(new H_(r))}),this.Ya.forEach(r=>{e.has(r)||t.push(new j_(r))}),t}cu(e){this.Za=e.ks,this.Ya=J();const t=this.ru(e.documents);return this.applyChanges(t,!0)}lu(){return os.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Xa===0,this.hasCachedResults)}}const gs="SyncEngine";class wR{constructor(e,t,r){this.query=e,this.targetId=t,this.view=r}}class TR{constructor(e){this.key=e,this.hu=!1}}class vR{constructor(e,t,r,s,i,o){this.localStore=e,this.remoteStore=t,this.eventManager=r,this.sharedClientState=s,this.currentUser=i,this.maxConcurrentLimboResolutions=o,this.Pu={},this.Tu=new Yt(c=>Vg(c),Fa),this.Iu=new Map,this.Eu=new Set,this.Ru=new ae(x.comparator),this.Au=new Map,this.Vu=new Dl,this.du={},this.mu=new Map,this.fu=cr.ar(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function AR(n,e,t=!0){const r=Qa(n);let s;const i=r.Tu.get(e);return i?(r.sharedClientState.addLocalQueryTarget(i.targetId),s=i.view.lu()):s=await z_(r,e,t,!0),s}async function RR(n,e){const t=Qa(n);await z_(t,e,!0,!1)}async function z_(n,e,t,r){const s=await la(n.localStore,lt(e)),i=s.targetId,o=n.sharedClientState.addLocalQueryTarget(i,t);let c;return r&&(c=await Wl(n,e,i,o==="current",s.resumeToken)),n.isPrimaryClient&&t&&Wa(n.remoteStore,s),c}async function Wl(n,e,t,r,s){n.pu=(p,m,T)=>async function(N,k,H,$){let U=k.view.ru(H);U.Ss&&(U=await ha(N.localStore,k.query,!1).then(({documents:E})=>k.view.ru(E,U)));const G=$&&$.targetChanges.get(k.targetId),K=$&&$.targetMismatches.get(k.targetId)!=null,W=k.view.applyChanges(U,N.isPrimaryClient,G,K);return Qu(N,k.targetId,W.au),W.snapshot}(n,p,m,T);const i=await ha(n.localStore,e,!0),o=new G_(e,i.ks),c=o.ru(i.documents),u=zi.createSynthesizedTargetChangeForCurrentChange(t,r&&n.onlineState!=="Offline",s),l=o.applyChanges(c,n.isPrimaryClient,u);Qu(n,t,l.au);const d=new wR(e,t,o);return n.Tu.set(e,d),n.Iu.has(t)?n.Iu.get(t).push(e):n.Iu.set(t,[e]),l.snapshot}async function bR(n,e,t){const r=F(n),s=r.Tu.get(e),i=r.Iu.get(s.targetId);if(i.length>1)return r.Iu.set(s.targetId,i.filter(o=>!Fa(o,e))),void r.Tu.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(s.targetId),r.sharedClientState.isActiveQueryTarget(s.targetId)||await ss(r.localStore,s.targetId,!1).then(()=>{r.sharedClientState.clearQueryState(s.targetId),t&&is(r.remoteStore,s.targetId),as(r,s.targetId)}).catch(On)):(as(r,s.targetId),await ss(r.localStore,s.targetId,!0))}async function SR(n,e){const t=F(n),r=t.Tu.get(e),s=t.Iu.get(r.targetId);t.isPrimaryClient&&s.length===1&&(t.sharedClientState.removeLocalQueryTarget(r.targetId),is(t.remoteStore,r.targetId))}async function PR(n,e,t){const r=Yl(n);try{const s=await function(o,c){const u=F(o),l=re.now(),d=c.reduce((T,C)=>T.add(C.key),J());let p,m;return u.persistence.runTransaction("Locally write mutations","readwrite",T=>{let C=ct(),N=J();return u.xs.getEntries(T,d).next(k=>{C=k,C.forEach((H,$)=>{$.isValidDocument()||(N=N.add(H))})}).next(()=>u.localDocuments.getOverlayedDocuments(T,C)).next(k=>{p=k;const H=[];for(const $ of c){const U=Kv($,p.get($.key).overlayedDocument);U!=null&&H.push(new Xt($.key,U,vg(U.value.mapValue),de.exists(!0)))}return u.mutationQueue.addMutationBatch(T,l,H,c)}).next(k=>{m=k;const H=k.applyToLocalDocumentSet(p,N);return u.documentOverlayCache.saveOverlays(T,k.batchId,H)})}).then(()=>({batchId:m.batchId,changes:Lg(p)}))}(r.localStore,e);r.sharedClientState.addPendingMutation(s.batchId),function(o,c,u){let l=o.du[o.currentUser.toKey()];l||(l=new ae(z)),l=l.insert(c,u),o.du[o.currentUser.toKey()]=l}(r,s.batchId,t),await Ln(r,s.changes),await ps(r.remoteStore)}catch(s){const i=Ka(s,"Failed to persist write");t.reject(i)}}async function W_(n,e){const t=F(n);try{const r=await zA(t.localStore,e);e.targetChanges.forEach((s,i)=>{const o=t.Au.get(i);o&&(B(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1,22616),s.addedDocuments.size>0?o.hu=!0:s.modifiedDocuments.size>0?B(o.hu,14607):s.removedDocuments.size>0&&(B(o.hu,42227),o.hu=!1))}),await Ln(t,r,e)}catch(r){await On(r)}}function fp(n,e,t){const r=F(n);if(r.isPrimaryClient&&t===0||!r.isPrimaryClient&&t===1){const s=[];r.Tu.forEach((i,o)=>{const c=o.view.va(e);c.snapshot&&s.push(c.snapshot)}),function(o,c){const u=F(o);u.onlineState=c;let l=!1;u.queries.forEach((d,p)=>{for(const m of p.ba)m.va(c)&&(l=!0)}),l&&Gl(u)}(r.eventManager,e),s.length&&r.Pu.J_(s),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e)}}async function CR(n,e,t){const r=F(n);r.sharedClientState.updateQueryState(e,"rejected",t);const s=r.Au.get(e),i=s&&s.key;if(i){let o=new ae(x.comparator);o=o.insert(i,he.newNoDocument(i,j.min()));const c=J().add(i),u=new Gi(j.min(),new Map,new ae(z),o,c);await W_(r,u),r.Ru=r.Ru.remove(i),r.Au.delete(e),Jl(r)}else await ss(r.localStore,e,!1).then(()=>as(r,e,t)).catch(On)}async function kR(n,e){const t=F(n),r=e.batch.batchId;try{const s=await GA(t.localStore,e);Ql(t,r,null),Kl(t,r),t.sharedClientState.updateMutationState(r,"acknowledged"),await Ln(t,s)}catch(s){await On(s)}}async function NR(n,e,t){const r=F(n);try{const s=await function(o,c){const u=F(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",l=>{let d;return u.mutationQueue.lookupMutationBatch(l,c).next(p=>(B(p!==null,37113),d=p.keys(),u.mutationQueue.removeMutationBatch(l,p))).next(()=>u.mutationQueue.performConsistencyCheck(l)).next(()=>u.documentOverlayCache.removeOverlaysForBatchId(l,d,c)).next(()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(l,d)).next(()=>u.localDocuments.getDocuments(l,d))})}(r.localStore,e);Ql(r,e,t),Kl(r,e),r.sharedClientState.updateMutationState(e,"rejected",t),await Ln(r,s)}catch(s){await On(s)}}function Kl(n,e){(n.mu.get(e)||[]).forEach(t=>{t.resolve()}),n.mu.delete(e)}function Ql(n,e,t){const r=F(n);let s=r.du[r.currentUser.toKey()];if(s){const i=s.get(e);i&&(t?i.reject(t):i.resolve(),s=s.remove(e)),r.du[r.currentUser.toKey()]=s}}function as(n,e,t=null){n.sharedClientState.removeLocalQueryTarget(e);for(const r of n.Iu.get(e))n.Tu.delete(r),t&&n.Pu.yu(r,t);n.Iu.delete(e),n.isPrimaryClient&&n.Vu.Gr(e).forEach(r=>{n.Vu.containsKey(r)||K_(n,r)})}function K_(n,e){n.Eu.delete(e.path.canonicalString());const t=n.Ru.get(e);t!==null&&(is(n.remoteStore,t),n.Ru=n.Ru.remove(e),n.Au.delete(t),Jl(n))}function Qu(n,e,t){for(const r of t)r instanceof j_?(n.Vu.addReference(r.key,e),DR(n,r)):r instanceof H_?(D(gs,"Document no longer in limbo: "+r.key),n.Vu.removeReference(r.key,e),n.Vu.containsKey(r.key)||K_(n,r.key)):L(19791,{wu:r})}function DR(n,e){const t=e.key,r=t.path.canonicalString();n.Ru.get(t)||n.Eu.has(r)||(D(gs,"New document in limbo: "+t),n.Eu.add(r),Jl(n))}function Jl(n){for(;n.Eu.size>0&&n.Ru.size<n.maxConcurrentLimboResolutions;){const e=n.Eu.values().next().value;n.Eu.delete(e);const t=new x(ne.fromString(e)),r=n.fu.next();n.Au.set(r,new TR(t)),n.Ru=n.Ru.insert(t,r),Wa(n.remoteStore,new qt(lt(ji(t.path)),r,"TargetPurposeLimboResolution",Xe.ce))}}async function Ln(n,e,t){const r=F(n),s=[],i=[],o=[];r.Tu.isEmpty()||(r.Tu.forEach((c,u)=>{o.push(r.pu(u,e,t).then(l=>{var d;if((l||t)&&r.isPrimaryClient){const p=l?!l.fromCache:(d=t==null?void 0:t.targetChanges.get(u.targetId))==null?void 0:d.current;r.sharedClientState.updateQueryState(u.targetId,p?"current":"not-current")}if(l){s.push(l);const p=xl.Es(u.targetId,l);i.push(p)}}))}),await Promise.all(o),r.Pu.J_(s),await async function(u,l){const d=F(u);try{await d.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>A.forEach(l,m=>A.forEach(m.Ts,T=>d.persistence.referenceDelegate.addReference(p,m.targetId,T)).next(()=>A.forEach(m.Is,T=>d.persistence.referenceDelegate.removeReference(p,m.targetId,T)))))}catch(p){if(!xn(p))throw p;D(Ml,"Failed to update sequence numbers: "+p)}for(const p of l){const m=p.targetId;if(!p.fromCache){const T=d.vs.get(m),C=T.snapshotVersion,N=T.withLastLimboFreeSnapshotVersion(C);d.vs=d.vs.insert(m,N)}}}(r.localStore,i))}async function VR(n,e){const t=F(n);if(!t.currentUser.isEqual(e)){D(gs,"User change. New user:",e.toKey());const r=await S_(t.localStore,e);t.currentUser=e,function(i,o){i.mu.forEach(c=>{c.forEach(u=>{u.reject(new V(S.CANCELLED,o))})}),i.mu.clear()}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await Ln(t,r.Ns)}}function OR(n,e){const t=F(n),r=t.Au.get(e);if(r&&r.hu)return J().add(r.key);{let s=J();const i=t.Iu.get(e);if(!i)return s;for(const o of i){const c=t.Tu.get(o);s=s.unionWith(c.view.nu)}return s}}async function xR(n,e){const t=F(n),r=await ha(t.localStore,e.query,!0),s=e.view.cu(r);return t.isPrimaryClient&&Qu(t,e.targetId,s.au),s}async function MR(n,e){const t=F(n);return k_(t.localStore,e).then(r=>Ln(t,r))}async function LR(n,e,t,r){const s=F(n),i=await function(c,u){const l=F(c),d=F(l.mutationQueue);return l.persistence.runTransaction("Lookup mutation documents","readonly",p=>d.Xn(p,u).next(m=>m?l.localDocuments.getDocuments(p,m):A.resolve(null)))}(s.localStore,e);i!==null?(t==="pending"?await ps(s.remoteStore):t==="acknowledged"||t==="rejected"?(Ql(s,e,r||null),Kl(s,e),function(c,u){F(F(c).mutationQueue).nr(u)}(s.localStore,e)):L(6720,"Unknown batchState",{bu:t}),await Ln(s,i)):D(gs,"Cannot apply mutation batch with id: "+e)}async function UR(n,e){const t=F(n);if(Qa(t),Yl(t),e===!0&&t.gu!==!0){const r=t.sharedClientState.getAllActiveQueryTargets(),s=await pp(t,r.toArray());t.gu=!0,await Wu(t.remoteStore,!0);for(const i of s)Wa(t.remoteStore,i)}else if(e===!1&&t.gu!==!1){const r=[];let s=Promise.resolve();t.Iu.forEach((i,o)=>{t.sharedClientState.isLocalQueryTarget(o)?r.push(o):s=s.then(()=>(as(t,o),ss(t.localStore,o,!0))),is(t.remoteStore,o)}),await s,await pp(t,r),function(o){const c=F(o);c.Au.forEach((u,l)=>{is(c.remoteStore,l)}),c.Vu.zr(),c.Au=new Map,c.Ru=new ae(x.comparator)}(t),t.gu=!1,await Wu(t.remoteStore,!1)}}async function pp(n,e,t){const r=F(n),s=[],i=[];for(const o of e){let c;const u=r.Iu.get(o);if(u&&u.length!==0){c=await la(r.localStore,lt(u[0]));for(const l of u){const d=r.Tu.get(l),p=await xR(r,d);p.snapshot&&i.push(p.snapshot)}}else{const l=await C_(r.localStore,o);c=await la(r.localStore,l),await Wl(r,Q_(l),o,!1,c.resumeToken)}s.push(c)}return r.Pu.J_(i),s}function Q_(n){return Ng(n.path,n.collectionGroup,n.orderBy,n.filters,n.limit,"F",n.startAt,n.endAt)}function FR(n){return function(t){return F(F(t).persistence).hs()}(F(n).localStore)}async function BR(n,e,t,r){const s=F(n);if(s.gu)return void D(gs,"Ignoring unexpected query state notification.");const i=s.Iu.get(e);if(i&&i.length>0)switch(t){case"current":case"not-current":{const o=await k_(s.localStore,Og(i[0])),c=Gi.createSynthesizedRemoteEventForCurrentChange(e,t==="current",we.EMPTY_BYTE_STRING);await Ln(s,o,c);break}case"rejected":await ss(s.localStore,e,!0),as(s,e,r);break;default:L(64155,t)}}async function qR(n,e,t){const r=Qa(n);if(r.gu){for(const s of e){if(r.Iu.has(s)&&r.sharedClientState.isActiveQueryTarget(s)){D(gs,"Adding an already active target "+s);continue}const i=await C_(r.localStore,s),o=await la(r.localStore,i);await Wl(r,Q_(i),o.targetId,!1,o.resumeToken),Wa(r.remoteStore,o)}for(const s of t)r.Iu.has(s)&&await ss(r.localStore,s,!1).then(()=>{is(r.remoteStore,s),as(r,s)}).catch(On)}}function Qa(n){const e=F(n);return e.remoteStore.remoteSyncer.applyRemoteEvent=W_.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=OR.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=CR.bind(null,e),e.Pu.J_=IR.bind(null,e.eventManager),e.Pu.yu=ER.bind(null,e.eventManager),e}function Yl(n){const e=F(n);return e.remoteStore.remoteSyncer.applySuccessfulWrite=kR.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=NR.bind(null,e),e}class Pi{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Ga(e.databaseInfo.databaseId),this.sharedClientState=this.Du(e),this.persistence=this.Cu(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Fu(e,this.localStore),this.indexBackfillerScheduler=this.Mu(e,this.localStore)}Fu(e,t){return null}Mu(e,t){return null}vu(e){return b_(this.persistence,new R_,e.initialUser,this.serializer)}Cu(e){return new Vl(Ha.Vi,this.serializer)}Du(e){return new x_}async terminate(){var e,t;(e=this.gcScheduler)==null||e.stop(),(t=this.indexBackfillerScheduler)==null||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}Pi.provider={build:()=>new Pi};class $R extends Pi{constructor(e){super(),this.cacheSizeBytes=e}Fu(e,t){B(this.persistence.referenceDelegate instanceof ua,46915);const r=this.persistence.referenceDelegate.garbageCollector;return new I_(r,e.asyncQueue,t)}Cu(e){const t=this.cacheSizeBytes!==void 0?je.withCacheSize(this.cacheSizeBytes):je.DEFAULT;return new Vl(r=>ua.Vi(r,t),this.serializer)}}class J_ extends Pi{constructor(e,t,r){super(),this.xu=e,this.cacheSizeBytes=t,this.forceOwnership=r,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.xu.initialize(this,e),await Yl(this.xu.syncEngine),await ps(this.xu.remoteStore),await this.persistence.zi(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}vu(e){return b_(this.persistence,new R_,e.initialUser,this.serializer)}Fu(e,t){const r=this.persistence.referenceDelegate.garbageCollector;return new I_(r,e.asyncQueue,t)}Mu(e,t){const r=new WT(t,this.persistence);return new zT(e.asyncQueue,r)}Cu(e){const t=A_(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),r=this.cacheSizeBytes!==void 0?je.withCacheSize(this.cacheSizeBytes):je.DEFAULT;return new Ol(this.synchronizeTabs,t,e.clientId,r,e.asyncQueue,M_(),Ho(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Du(e){return new x_}}class jR extends J_{constructor(e,t){super(e,t,!1),this.xu=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.xu.syncEngine;this.sharedClientState instanceof eu&&(this.sharedClientState.syncEngine={So:LR.bind(null,t),Do:BR.bind(null,t),Co:qR.bind(null,t),hs:FR.bind(null,t),bo:MR.bind(null,t)},await this.sharedClientState.start()),await this.persistence.zi(async r=>{await UR(this.xu.syncEngine,r),this.gcScheduler&&(r&&!this.gcScheduler.started?this.gcScheduler.start():r||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(r&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():r||this.indexBackfillerScheduler.stop())})}Du(e){const t=M_();if(!eu.v(t))throw new V(S.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const r=A_(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new eu(t,e.asyncQueue,r,e.clientId,e.initialUser)}}class Ci{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>fp(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=VR.bind(null,this.syncEngine),await Wu(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new yR}()}createDatastore(e){const t=Ga(e.databaseInfo.databaseId),r=ZA(e.databaseInfo);return sR(e.authCredentials,e.appCheckCredentials,r,t)}createRemoteStore(e){return function(r,s,i,o,c){return new oR(r,s,i,o,c)}(this.localStore,this.datastore,e.asyncQueue,t=>fp(this.syncEngine,t,0),function(){return ap.v()?new ap:new QA}())}createSyncEngine(e,t){return function(s,i,o,c,u,l,d){const p=new vR(s,i,o,c,u,l);return d&&(p.gu=!0),p}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(s){const i=F(s);D(ur,"RemoteStore shutting down."),i.Ea.add(5),await Wi(i),i.Aa.shutdown(),i.Va.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(t=this.eventManager)==null||t.terminate()}}Ci.provider={build:()=>new Ci};/**
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
 *//**
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
 */class Xl{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ou(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ou(this.observer.error,e):Ie("Uncaught Error in snapshot listener:",e.toString()))}Nu(){this.muted=!0}Ou(e,t){setTimeout(()=>{this.muted||e(t)},0)}}/**
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
 */let HR=class{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new V(S.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await async function(s,i){const o=F(s),c={documents:i.map(p=>bi(o.serializer,p))},u=await o.jo("BatchGetDocuments",o.serializer.databaseId,ne.emptyPath(),c,i.length),l=new Map;u.forEach(p=>{const m=oA(o.serializer,p);l.set(m.key.toString(),m)});const d=[];return i.forEach(p=>{const m=l.get(p.toString());B(!!m,55234,{key:p}),d.push(m)}),d}(this.datastore,e);return t.forEach(r=>this.recordVersion(r)),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(r){this.lastTransactionError=r}this.writtenDocs.add(e.toString())}delete(e){this.write(new fs(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach(t=>{e.delete(t.key.toString())}),e.forEach((t,r)=>{const s=x.fromPath(r);this.mutations.push(new vl(s,this.precondition(s)))}),await async function(r,s){const i=F(r),o={writes:s.map(c=>Si(i.serializer,c))};await i.Wo("Commit",i.serializer.databaseId,ne.emptyPath(),o)}(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw L(50498,{Gu:e.constructor.name});t=j.min()}const r=this.readVersions.get(e.key.toString());if(r){if(!t.isEqual(r))throw new V(S.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(j.min())?de.exists(!1):de.updateTime(t):de.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(j.min()))throw new V(S.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return de.updateTime(t)}return de.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}};/**
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
 */class GR{constructor(e,t,r,s,i){this.asyncQueue=e,this.datastore=t,this.options=r,this.updateFunction=s,this.deferred=i,this.zu=r.maxAttempts,this.M_=new Ul(this.asyncQueue,"transaction_retry")}ju(){this.zu-=1,this.Hu()}Hu(){this.M_.p_(async()=>{const e=new HR(this.datastore),t=this.Ju(e);t&&t.then(r=>{this.asyncQueue.enqueueAndForget(()=>e.commit().then(()=>{this.deferred.resolve(r)}).catch(s=>{this.Zu(s)}))}).catch(r=>{this.Zu(r)})})}Ju(e){try{const t=this.updateFunction(e);return!Bi(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}Zu(e){this.zu>0&&this.Xu(e)?(this.zu-=1,this.asyncQueue.enqueueAndForget(()=>(this.Hu(),Promise.resolve()))):this.deferred.reject(e)}Xu(e){if((e==null?void 0:e.name)==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!Kg(t)}return!1}}/**
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
 */const Dn="FirestoreClient";class zR{constructor(e,t,r,s,i){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=r,this._databaseInfo=s,this.user=Oe.UNAUTHENTICATED,this.clientId=ll.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(r,async o=>{D(Dn,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(r,o=>(D(Dn,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this._databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new ut;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const r=Ka(t,"Failed to shutdown persistence");e.reject(r)}}),e.promise}}async function nu(n,e){n.asyncQueue.verifyOperationInProgress(),D(Dn,"Initializing OfflineComponentProvider");const t=n.configuration;await e.initialize(t);let r=t.initialUser;n.setCredentialChangeListener(async s=>{r.isEqual(s)||(await S_(e.localStore,s),r=s)}),e.persistence.setDatabaseDeletedListener(()=>n.terminate()),n._offlineComponents=e}async function mp(n,e){n.asyncQueue.verifyOperationInProgress();const t=await Y_(n);D(Dn,"Initializing OnlineComponentProvider"),await e.initialize(t,n.configuration),n.setCredentialChangeListener(r=>up(e.remoteStore,r)),n.setAppCheckTokenChangeListener((r,s)=>up(e.remoteStore,s)),n._onlineComponents=e}async function Y_(n){if(!n._offlineComponents)if(n._uninitializedComponentsProvider){D(Dn,"Using user provided OfflineComponentProvider");try{await nu(n,n._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!function(s){return s.name==="FirebaseError"?s.code===S.FAILED_PRECONDITION||s.code===S.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11}(t))throw t;Hr("Error using user provided cache. Falling back to memory cache: "+t),await nu(n,new Pi)}}else D(Dn,"Using default OfflineComponentProvider"),await nu(n,new $R(void 0));return n._offlineComponents}async function Zl(n){return n._onlineComponents||(n._uninitializedComponentsProvider?(D(Dn,"Using user provided OnlineComponentProvider"),await mp(n,n._uninitializedComponentsProvider._online)):(D(Dn,"Using default OnlineComponentProvider"),await mp(n,new Ci))),n._onlineComponents}function WR(n){return Y_(n).then(e=>e.localStore)}function KR(n){return Zl(n).then(e=>e.syncEngine)}function X_(n){return Zl(n).then(e=>e.datastore)}async function ma(n){const e=await Zl(n),t=e.eventManager;return t.onListen=AR.bind(null,e.syncEngine),t.onUnlisten=bR.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=RR.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=SR.bind(null,e.syncEngine),t}function QR(n,e,t,r){const s=new Xl(r),i=new zl(e,s,t);return n.asyncQueue.enqueueAndForget(async()=>jl(await ma(n),i)),()=>{s.Nu(),n.asyncQueue.enqueueAndForget(async()=>Hl(await ma(n),i))}}function Z_(n,e,t={}){const r=new ut;return n.asyncQueue.enqueueAndForget(async()=>function(i,o,c,u,l){const d=new Xl({next:m=>{d.Nu(),o.enqueueAndForget(()=>Hl(i,p));const T=m.docs.has(c);!T&&m.fromCache?l.reject(new V(S.UNAVAILABLE,"Failed to get document because the client is offline.")):T&&m.fromCache&&u&&u.source==="server"?l.reject(new V(S.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):l.resolve(m)},error:m=>l.reject(m)}),p=new zl(ji(c.path),d,{includeMetadataChanges:!0,Ka:!0});return jl(i,p)}(await ma(n),n.asyncQueue,e,t,r)),r.promise}function JR(n,e){const t=new ut;return n.asyncQueue.enqueueAndForget(async()=>async function(s,i,o){try{const c=await ha(s,i,!0),u=new G_(i,c.ks),l=u.ru(c.documents),d=u.applyChanges(l,!1);o.resolve(d.snapshot)}catch(c){const u=Ka(c,`Failed to execute query '${i} against cache`);o.reject(u)}}(await WR(n),e,t)),t.promise}function YR(n,e,t={}){const r=new ut;return n.asyncQueue.enqueueAndForget(async()=>function(i,o,c,u,l){const d=new Xl({next:m=>{d.Nu(),o.enqueueAndForget(()=>Hl(i,p)),m.fromCache&&u.source==="server"?l.reject(new V(S.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):l.resolve(m)},error:m=>l.reject(m)}),p=new zl(c,d,{includeMetadataChanges:!0,Ka:!0});return jl(i,p)}(await ma(n),n.asyncQueue,e,t,r)),r.promise}function XR(n,e,t){const r=new ut;return n.asyncQueue.enqueueAndForget(async()=>{try{const s=await X_(n);r.resolve(async function(o,c,u){var N;const l=F(o),{request:d,gt:p,parent:m}=uA(l.serializer,xv(c),u);l.connection.Ko||delete d.parent;const T=(await l.jo("RunAggregationQuery",l.serializer.databaseId,m,d,1)).filter(k=>!!k.result);B(T.length===1,64727);const C=(N=T[0].result)==null?void 0:N.aggregateFields;return Object.keys(C).reduce((k,H)=>(k[p[H]]=C[H],k),{})}(s,e,t))}catch(s){r.reject(s)}}),r.promise}function ZR(n,e){const t=new ut;return n.asyncQueue.enqueueAndForget(async()=>PR(await KR(n),e,t)),t.promise}function eb(n,e,t){const r=new ut;return n.asyncQueue.enqueueAndForget(async()=>{const s=await X_(n);new GR(n.asyncQueue,s,t,e,r).ju()}),r.promise}/**
 * @license
 * Copyright 2023 Google LLC
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
 */function ey(n){const e={};return n.timeoutSeconds!==void 0&&(e.timeoutSeconds=n.timeoutSeconds),e}/**
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
 */const tb="ComponentProvider",gp=new Map;function nb(n,e,t,r,s){return new Tv(n,e,t,s.host,s.ssl,s.experimentalForceLongPolling,s.experimentalAutoDetectLongPolling,ey(s.experimentalLongPollingOptions),s.useFetchStreams,s.isUsingEmulator,r)}/**
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
 */const ty="firestore.googleapis.com",_p=!0;class yp{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new V(S.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=ty,this.ssl=_p}else this.host=e.host,this.ssl=e.ssl??_p;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=p_;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<y_)throw new V(S.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}$T("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=ey(e.experimentalLongPollingOptions??{}),function(r){if(r.timeoutSeconds!==void 0){if(isNaN(r.timeoutSeconds))throw new V(S.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (must not be NaN)`);if(r.timeoutSeconds<5)throw new V(S.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (minimum allowed value is 5)`);if(r.timeoutSeconds>30)throw new V(S.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(r,s){return r.timeoutSeconds===s.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class Ja{constructor(e,t,r,s){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=r,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new yp({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new V(S.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new V(S.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new yp(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(r){if(!r)return new DT;switch(r.type){case"firstParty":return new MT(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new V(S.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const r=gp.get(t);r&&(D(tb,"Removing Datastore"),gp.delete(t),r.terminate())}(this),Promise.resolve()}}function iV(n,e,t,r={}){var l;n=Ee(n,Ja);const s=At(e),i=n._getSettings(),o={...i,emulatorOptions:n._getEmulatorOptions()},c=`${e}:${t}`;s&&(Mi(`https://${c}`),Pa("Firestore",!0)),i.host!==ty&&i.host!==c&&Hr("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const u={...i,host:c,ssl:s,emulatorOptions:r};if(!Sn(u,o)&&(n._setSettings(u),r.mockUserToken)){let d,p;if(typeof r.mockUserToken=="string")d=r.mockUserToken,p=Oe.MOCK_USER;else{d=Dm(r.mockUserToken,(l=n._app)==null?void 0:l.options.projectId);const m=r.mockUserToken.sub||r.mockUserToken.user_id;if(!m)throw new V(S.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");p=new Oe(m)}n._authCredentials=new VT(new Km(d,p))}}/**
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
 */class Rt{constructor(e,t,r){this.converter=t,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new Rt(this.firestore,e,this._query)}}class fe{constructor(e,t,r){this.converter=t,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new vn(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new fe(this.firestore,e,this._key)}toJSON(){return{type:fe._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,r){if(Fi(t,fe._jsonSchema))return new fe(e,r||null,new x(ne.fromString(t.referencePath)))}}fe._jsonSchemaVersion="firestore/documentReference/1.0",fe._jsonSchema={type:Ae("string",fe._jsonSchemaVersion),referencePath:Ae("string")};class vn extends Rt{constructor(e,t,r){super(e,t,ji(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new fe(this.firestore,null,new x(e))}withConverter(e){return new vn(this.firestore,e,this._path)}}function oV(n,e,...t){if(n=q(n),Jm("collection","path",e),n instanceof Ja){const r=ne.fromString(e,...t);return cf(r),new vn(n,null,r)}{if(!(n instanceof fe||n instanceof vn))throw new V(S.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(ne.fromString(e,...t));return cf(r),new vn(n.firestore,null,r)}}function rb(n,e,...t){if(n=q(n),arguments.length===1&&(e=ll.newId()),Jm("doc","path",e),n instanceof Ja){const r=ne.fromString(e,...t);return af(r),new fe(n,null,new x(r))}{if(!(n instanceof fe||n instanceof vn))throw new V(S.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(ne.fromString(e,...t));return af(r),new fe(n.firestore,n instanceof vn?n.converter:null,new x(r))}}/**
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
 */const Ip="AsyncQueue";class Ep{constructor(e=Promise.resolve()){this.Yu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new Ul(this,"async_queue_retry"),this._c=()=>{const r=Ho();r&&D(Ip,"Visibility state changed to "+r.visibilityState),this.M_.w_()},this.ac=e;const t=Ho();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const t=Ho();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise(()=>{});const t=new ut;return this.cc(()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Yu.push(e),this.lc()))}async lc(){if(this.Yu.length!==0){try{await this.Yu[0](),this.Yu.shift(),this.M_.reset()}catch(e){if(!xn(e))throw e;D(Ip,"Operation failed with retryable error: "+e)}this.Yu.length>0&&this.M_.p_(()=>this.lc())}}cc(e){const t=this.ac.then(()=>(this.rc=!0,e().catch(r=>{throw this.nc=r,this.rc=!1,Ie("INTERNAL UNHANDLED ERROR: ",wp(r)),r}).then(r=>(this.rc=!1,r))));return this.ac=t,t}enqueueAfterDelay(e,t,r){this.uc(),this.oc.indexOf(e)>-1&&(t=0);const s=$l.createAndSchedule(this,e,t,r,i=>this.hc(i));return this.tc.push(s),s}uc(){this.nc&&L(47125,{Pc:wp(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const t of this.tc)if(t.timerId===e)return!0;return!1}Ec(e){return this.Tc().then(()=>{this.tc.sort((t,r)=>t.targetTimeMs-r.targetTimeMs);for(const t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc()})}Rc(e){this.oc.push(e)}hc(e){const t=this.tc.indexOf(e);this.tc.splice(t,1)}}function wp(n){let e=n.message||"";return n.stack&&(e=n.stack.includes(n.message)?n.stack:n.message+`
`+n.stack),e}class st extends Ja{constructor(e,t,r,s){super(e,t,r,s),this.type="firestore",this._queue=new Ep,this._persistenceKey=(s==null?void 0:s.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new Ep(e),this._firestoreClient=void 0,await e}}}function aV(n,e,t){t||(t=na);const r=Ut(n,"firestore");if(r.isInitialized(t)){const s=r.getImmediate({identifier:t}),i=r.getOptions(t);if(Sn(i,e))return s;throw new V(S.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(e.cacheSizeBytes!==void 0&&e.localCache!==void 0)throw new V(S.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(e.cacheSizeBytes!==void 0&&e.cacheSizeBytes!==-1&&e.cacheSizeBytes<y_)throw new V(S.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return e.host&&At(e.host)&&Mi(e.host),r.initialize({options:e,instanceIdentifier:t})}function Zt(n){if(n._terminated)throw new V(S.FAILED_PRECONDITION,"The client has already been terminated.");return n._firestoreClient||sb(n),n._firestoreClient}function sb(n){var r,s,i,o;const e=n._freezeSettings(),t=nb(n._databaseId,((r=n._app)==null?void 0:r.options.appId)||"",n._persistenceKey,(s=n._app)==null?void 0:s.options.apiKey,e);n._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((o=e.localCache)!=null&&o._onlineComponentProvider)&&(n._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),n._firestoreClient=new zR(n._authCredentials,n._appCheckCredentials,n._queue,t,n._componentsProvider&&function(u){const l=u==null?void 0:u._online.build();return{_offline:u==null?void 0:u._offline.build(l),_online:l}}(n._componentsProvider))}/**
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
 */class at{constructor(e){this._byteString=e}static fromBase64String(e){try{return new at(we.fromBase64String(e))}catch(t){throw new V(S.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new at(we.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:at._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Fi(e,at._jsonSchema))return at.fromBase64String(e.bytes)}}at._jsonSchemaVersion="firestore/bytes/1.0",at._jsonSchema={type:Ae("string",at._jsonSchemaVersion),bytes:Ae("string")};/**
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
 */class _s{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new V(S.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new me(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}function cV(){return new _s(bu)}/**
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
 */class Ya{constructor(e){this._methodName=e}}/**
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
 */class Vt{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new V(S.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new V(S.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return z(this._lat,e._lat)||z(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:Vt._jsonSchemaVersion}}static fromJSON(e){if(Fi(e,Vt._jsonSchema))return new Vt(e.latitude,e.longitude)}}Vt._jsonSchemaVersion="firestore/geoPoint/1.0",Vt._jsonSchema={type:Ae("string",Vt._jsonSchemaVersion),latitude:Ae("number"),longitude:Ae("number")};/**
 * @license
 * Copyright 2024 Google LLC
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
 */class vt{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(r,s){if(r.length!==s.length)return!1;for(let i=0;i<r.length;++i)if(r[i]!==s[i])return!1;return!0}(this._values,e._values)}toJSON(){return{type:vt._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Fi(e,vt._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new vt(e.vectorValues);throw new V(S.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}vt._jsonSchemaVersion="firestore/vectorValue/1.0",vt._jsonSchema={type:Ae("string",vt._jsonSchemaVersion),vectorValues:Ae("object")};/**
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
 */const ib=/^__.*__$/;class ob{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return this.fieldMask!==null?new Xt(e,this.data,this.fieldMask,t,this.fieldTransforms):new ds(e,this.data,t,this.fieldTransforms)}}class ny{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return new Xt(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function ry(n){switch(n){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw L(40011,{dataSource:n})}}class eh{constructor(e,t,r,s,i,o){this.settings=e,this.databaseId=t,this.serializer=r,this.ignoreUndefinedProperties=s,i===void 0&&this.validatePath(),this.fieldTransforms=i||[],this.fieldMask=o||[]}get path(){return this.settings.path}get dataSource(){return this.settings.dataSource}contextWith(e){return new eh({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}childContextForField(e){var s;const t=(s=this.path)==null?void 0:s.child(e),r=this.contextWith({path:t,arrayElement:!1});return r.validatePathSegment(e),r}childContextForFieldPath(e){var s;const t=(s=this.path)==null?void 0:s.child(e),r=this.contextWith({path:t,arrayElement:!1});return r.validatePath(),r}childContextForArray(e){return this.contextWith({path:void 0,arrayElement:!0})}createError(e){return ga(e,this.settings.methodName,this.settings.hasConverter||!1,this.path,this.settings.targetDoc)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}validatePath(){if(this.path)for(let e=0;e<this.path.length;e++)this.validatePathSegment(this.path.get(e))}validatePathSegment(e){if(e.length===0)throw this.createError("Document fields must not be empty");if(ry(this.dataSource)&&ib.test(e))throw this.createError('Document fields cannot begin and end with "__"')}}class ab{constructor(e,t,r){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=r||Ga(e)}createContext(e,t,r,s=!1){return new eh({dataSource:e,methodName:t,targetDoc:r,path:me.emptyPath(),arrayElement:!1,hasConverter:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Ir(n){const e=n._freezeSettings(),t=Ga(n._databaseId);return new ab(n._databaseId,!!e.ignoreUndefinedProperties,t)}function Xa(n,e,t,r,s,i={}){const o=n.createContext(i.merge||i.mergeFields?2:0,e,t,s);sh("Data must be an object, but it was:",o,r);const c=iy(r,o);let u,l;if(i.merge)u=new Ze(o.fieldMask),l=o.fieldTransforms;else if(i.mergeFields){const d=[];for(const p of i.mergeFields){const m=lr(e,p,t);if(!o.contains(m))throw new V(S.INVALID_ARGUMENT,`Field '${m}' is specified in your field mask but missing from your input data.`);cy(d,m)||d.push(m)}u=new Ze(d),l=o.fieldTransforms.filter(p=>u.covers(p.field))}else u=null,l=o.fieldTransforms;return new ob(new xe(c),u,l)}class Ki extends Ya{_toFieldTransform(e){if(e.dataSource!==2)throw e.dataSource===1?e.createError(`${this._methodName}() can only appear at the top level of your update data`):e.createError(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof Ki}}class th extends Ya{constructor(e,t){super(e),this.Vc=t}_toFieldTransform(e){const t=new ns(e.serializer,Bg(e.serializer,this.Vc));return new Gg(e.path,t)}isEqual(e){return e instanceof th&&this.Vc===e.Vc}}function nh(n,e,t,r){const s=n.createContext(1,e,t);sh("Data must be an object, but it was:",s,r);const i=[],o=xe.empty();Mn(r,(u,l)=>{const d=ay(e,u,t);l=q(l);const p=s.childContextForFieldPath(d);if(l instanceof Ki)i.push(d);else{const m=Qi(l,p);m!=null&&(i.push(d),o.set(d,m))}});const c=new Ze(i);return new ny(o,c,s.fieldTransforms)}function rh(n,e,t,r,s,i){const o=n.createContext(1,e,t),c=[lr(e,r,t)],u=[s];if(i.length%2!=0)throw new V(S.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let m=0;m<i.length;m+=2)c.push(lr(e,i[m])),u.push(i[m+1]);const l=[],d=xe.empty();for(let m=c.length-1;m>=0;--m)if(!cy(l,c[m])){const T=c[m];let C=u[m];C=q(C);const N=o.childContextForFieldPath(T);if(C instanceof Ki)l.push(T);else{const k=Qi(C,N);k!=null&&(l.push(T),d.set(T,k))}}const p=new Ze(l);return new ny(d,p,o.fieldTransforms)}function sy(n,e,t,r=!1){return Qi(t,n.createContext(r?4:3,e))}function Qi(n,e){if(oy(n=q(n)))return sh("Unsupported field value:",e,n),iy(n,e);if(n instanceof Ya)return function(r,s){if(!ry(s.dataSource))throw s.createError(`${r._methodName}() can only be used with update() and set()`);if(!s.path)throw s.createError(`${r._methodName}() is not currently supported inside arrays`);const i=r._toFieldTransform(s);i&&s.fieldTransforms.push(i)}(n,e),null;if(n===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),n instanceof Array){if(e.settings.arrayElement&&e.dataSource!==4)throw e.createError("Nested arrays are not supported");return function(r,s){const i=[];let o=0;for(const c of r){let u=Qi(c,s.childContextForArray(o));u==null&&(u={nullValue:"NULL_VALUE"}),i.push(u),o++}return{arrayValue:{values:i}}}(n,e)}return function(r,s){if((r=q(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return Bg(s.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const i=re.fromDate(r);return{timestampValue:rs(s.serializer,i)}}if(r instanceof re){const i=new re(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:rs(s.serializer,i)}}if(r instanceof Vt)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof at)return{bytesValue:Xg(s.serializer,r._byteString)};if(r instanceof fe){const i=s.databaseId,o=r.firestore._databaseId;if(!o.isEqual(i))throw s.createError(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${i.projectId}/${i.database}`);return{referenceValue:Pl(r.firestore._databaseId||s.databaseId,r._key.path)}}if(r instanceof vt)return function(o,c){const u=o instanceof vt?o.toArray():o;return{mapValue:{fields:{[_l]:{stringValue:yl},[Yr]:{arrayValue:{values:u.map(d=>{if(typeof d!="number")throw c.createError("VectorValues must only contain numeric values.");return Tl(c.serializer,d)})}}}}}}(r,s);if(c_(r))return r._toProto(s.serializer);throw s.createError(`Unsupported field value: ${Na(r)}`)}(n,e)}function iy(n,e){const t={};return pg(n)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Mn(n,(r,s)=>{const i=Qi(s,e.childContextForField(r));i!=null&&(t[r]=i)}),{mapValue:{fields:t}}}function oy(n){return!(typeof n!="object"||n===null||n instanceof Array||n instanceof Date||n instanceof re||n instanceof Vt||n instanceof at||n instanceof fe||n instanceof Ya||n instanceof vt||c_(n))}function sh(n,e,t){if(!oy(t)||!Ym(t)){const r=Na(t);throw r==="an object"?e.createError(n+" a custom object"):e.createError(n+" "+r)}}function lr(n,e,t){if((e=q(e))instanceof _s)return e._internalPath;if(typeof e=="string")return ay(n,e);throw ga("Field path arguments must be of type string or ",n,!1,void 0,t)}const cb=new RegExp("[~\\*/\\[\\]]");function ay(n,e,t){if(e.search(cb)>=0)throw ga(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,n,!1,void 0,t);try{return new _s(...e.split("."))._internalPath}catch{throw ga(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,n,!1,void 0,t)}}function ga(n,e,t,r,s){const i=r&&!r.isEmpty(),o=s!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let u="";return(i||o)&&(u+=" (found",i&&(u+=` in field ${r}`),o&&(u+=` in document ${s}`),u+=")"),new V(S.INVALID_ARGUMENT,c+n+u)}function cy(n,e){return n.some(t=>t.isEqual(e))}/**
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
 */class uy{convertValue(e,t="none"){switch(Pn(e)){case 0:return null;case 1:return e.booleanValue;case 2:return le(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(Kt(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw L(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const r={};return Mn(e,(s,i)=>{r[s]=this.convertValue(i,t)}),r}convertVectorValue(e){var r,s,i;const t=(i=(s=(r=e.fields)==null?void 0:r[Yr].arrayValue)==null?void 0:s.values)==null?void 0:i.map(o=>le(o.doubleValue));return new vt(t)}convertGeoPoint(e){return new Vt(le(e.latitude),le(e.longitude))}convertArray(e,t){return(e.values||[]).map(r=>this.convertValue(r,t))}convertServerTimestamp(e,t){switch(t){case"previous":const r=La(e);return r==null?null:this.convertValue(r,t);case"estimate":return this.convertTimestamp(wi(e));default:return null}}convertTimestamp(e){const t=Wt(e);return new re(t.seconds,t.nanos)}convertDocumentKey(e,t){const r=ne.fromString(e);B(a_(r),9688,{name:e});const s=new rr(r.get(1),r.get(3)),i=new x(r.popFirst(5));return s.isEqual(t)||Ie(`Document ${i} contains a document reference within a different database (${s.projectId}/${s.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),i}}/**
 * @license
 * Copyright 2024 Google LLC
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
 */class ys extends uy{constructor(e){super(),this.firestore=e}convertBytes(e){return new at(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new fe(this.firestore,null,t)}}/**
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
 */function uV(){return new Ki("deleteField")}function lV(n){return new th("increment",n)}const Tp="@firebase/firestore",vp="4.10.0";/**
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
 */function Ap(n){return function(t,r){if(typeof t!="object"||t===null)return!1;const s=t;for(const i of r)if(i in s&&typeof s[i]=="function")return!0;return!1}(n,["next","error","complete"])}/**
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
 */class ub{constructor(e="count",t){this._internalFieldPath=t,this.type="AggregateField",this.aggregateType=e}}class lb{constructor(e,t,r){this._userDataWriter=t,this._data=r,this.type="AggregateQuerySnapshot",this.query=e}data(){return this._userDataWriter.convertObjectMap(this._data)}_fieldsProto(){return new xe({mapValue:{fields:this._data}}).clone().value.mapValue.fields}}/**
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
 */class ki{constructor(e,t,r,s,i){this._firestore=e,this._userDataWriter=t,this._key=r,this._document=s,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new fe(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new hb(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}_fieldsProto(){var e;return((e=this._document)==null?void 0:e.data.clone().value.mapValue.fields)??void 0}get(e){if(this._document){const t=this._document.data.field(lr("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class hb extends ki{data(){return super.data()}}/**
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
 */function ly(n){if(n.limitType==="L"&&n.explicitOrderBy.length===0)throw new V(S.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class ih{}class Za extends ih{}function hV(n,e,...t){let r=[];e instanceof ih&&r.push(e),r=r.concat(t),function(i){const o=i.filter(u=>u instanceof oh).length,c=i.filter(u=>u instanceof ec).length;if(o>1||o>0&&c>0)throw new V(S.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(r);for(const s of r)n=s._apply(n);return n}class ec extends Za{constructor(e,t,r){super(),this._field=e,this._op=t,this._value=r,this.type="where"}static _create(e,t,r){return new ec(e,t,r)}_apply(e){const t=this._parse(e);return hy(e._query,t),new Rt(e.firestore,e.converter,Lu(e._query,t))}_parse(e){const t=Ir(e.firestore);return function(i,o,c,u,l,d,p){let m;if(l.isKeyField()){if(d==="array-contains"||d==="array-contains-any")throw new V(S.INVALID_ARGUMENT,`Invalid Query. You can't perform '${d}' queries on documentId().`);if(d==="in"||d==="not-in"){bp(p,d);const C=[];for(const N of p)C.push(Rp(u,i,N));m={arrayValue:{values:C}}}else m=Rp(u,i,p)}else d!=="in"&&d!=="not-in"&&d!=="array-contains-any"||bp(p,d),m=sy(c,o,p,d==="in"||d==="not-in");return Z.create(l,d,m)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function dV(n,e,t){const r=e,s=lr("where",n);return ec._create(s,r,t)}class oh extends ih{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new oh(e,t)}_parse(e){const t=this._queryConstraints.map(r=>r._parse(e)).filter(r=>r.getFilters().length>0);return t.length===1?t[0]:se.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:(function(s,i){let o=s;const c=i.getFlattenedFilters();for(const u of c)hy(o,u),o=Lu(o,u)}(e._query,t),new Rt(e.firestore,e.converter,Lu(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class ah extends Za{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new ah(e,t)}_apply(e){const t=function(s,i,o){if(s.startAt!==null)throw new V(S.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(s.endAt!==null)throw new V(S.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new Ai(i,o)}(e._query,this._field,this._direction);return new Rt(e.firestore,e.converter,Mv(e._query,t))}}function fV(n,e="asc"){const t=e,r=lr("orderBy",n);return ah._create(r,t)}class ch extends Za{constructor(e,t,r){super(),this.type=e,this._limit=t,this._limitType=r}static _create(e,t,r){return new ch(e,t,r)}_apply(e){return new Rt(e.firestore,e.converter,ia(e._query,this._limit,this._limitType))}}function pV(n){return jT("limit",n),ch._create("limit",n,"F")}class uh extends Za{constructor(e,t,r){super(),this.type=e,this._docOrFields=t,this._inclusive=r}static _create(e,t,r){return new uh(e,t,r)}_apply(e){const t=db(e,this.type,this._docOrFields,this._inclusive);return new Rt(e.firestore,e.converter,Lv(e._query,t))}}function mV(...n){return uh._create("startAfter",n,!1)}function db(n,e,t,r){if(t[0]=q(t[0]),t[0]instanceof ki)return function(i,o,c,u,l){if(!u)throw new V(S.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${c}().`);const d=[];for(const p of Lr(i))if(p.field.isKeyField())d.push(sr(o,u.key));else{const m=u.data.field(p.field);if(Ma(m))throw new V(S.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+p.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(m===null){const T=p.field.canonicalString();throw new V(S.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${T}' (used as the orderBy) does not exist.`)}d.push(m)}return new kn(d,l)}(n._query,n.firestore._databaseId,e,t[0]._document,r);{const s=Ir(n.firestore);return function(o,c,u,l,d,p){const m=o.explicitOrderBy;if(d.length>m.length)throw new V(S.INVALID_ARGUMENT,`Too many arguments provided to ${l}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const T=[];for(let C=0;C<d.length;C++){const N=d[C];if(m[C].field.isKeyField()){if(typeof N!="string")throw new V(S.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${l}(), but got a ${typeof N}`);if(!El(o)&&N.indexOf("/")!==-1)throw new V(S.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by documentId(), the value passed to ${l}() must be a plain document ID, but '${N}' contains a slash.`);const k=o.path.child(ne.fromString(N));if(!x.isDocumentKey(k))throw new V(S.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${l}() must result in a valid document path, but '${k}' is not because it contains an odd number of segments.`);const H=new x(k);T.push(sr(c,H))}else{const k=sy(u,l,N);T.push(k)}}return new kn(T,p)}(n._query,n.firestore._databaseId,s,e,t,r)}}function Rp(n,e,t){if(typeof(t=q(t))=="string"){if(t==="")throw new V(S.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!El(e)&&t.indexOf("/")!==-1)throw new V(S.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const r=e.path.child(ne.fromString(t));if(!x.isDocumentKey(r))throw new V(S.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);return sr(n,new x(r))}if(t instanceof fe)return sr(n,t._key);throw new V(S.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${Na(t)}.`)}function bp(n,e){if(!Array.isArray(n)||n.length===0)throw new V(S.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function hy(n,e){const t=function(s,i){for(const o of s)for(const c of o.getFlattenedFilters())if(i.indexOf(c.op)>=0)return c.op;return null}(n.filters,function(s){switch(s){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(t!==null)throw t===e.op?new V(S.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new V(S.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}function tc(n,e,t){let r;return r=n?t&&(t.merge||t.mergeFields)?n.toFirestore(e,t):n.toFirestore(e):e,r}class fb extends uy{constructor(e){super(),this.firestore=e}convertBytes(e){return new at(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new fe(this.firestore,null,t)}}function pb(){return new ub("count")}/**
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
 */function gV(n){return mb(n,{count:pb()})}function mb(n,e){const t=Ee(n.firestore,st),r=Zt(t),s=Ev(e,(i,o)=>new Qv(o,i.aggregateType,i._internalFieldPath));return XR(r,n._query,s).then(i=>function(c,u,l){const d=new ys(c);return new lb(u,d,l)}(t,n,i))}class gb{constructor(e){let t;this.kind="persistent",e!=null&&e.tabManager?(e.tabManager._initialize(e),t=e.tabManager):(t=Ib(void 0),t._initialize(e)),this._onlineComponentProvider=t._onlineComponentProvider,this._offlineComponentProvider=t._offlineComponentProvider}toJSON(){return{kind:this.kind}}}function _V(n){return new gb(n)}class _b{constructor(e){this.forceOwnership=e,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=Ci.provider,this._offlineComponentProvider={build:t=>new J_(t,e==null?void 0:e.cacheSizeBytes,this.forceOwnership)}}}class yb{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=Ci.provider,this._offlineComponentProvider={build:t=>new jR(t,e==null?void 0:e.cacheSizeBytes)}}}function Ib(n){return new _b(n==null?void 0:n.forceOwnership)}function yV(){return new yb}class Or{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class An extends ki{constructor(e,t,r,s,i,o){super(e,t,r,s,o),this._firestore=e,this._firestoreImpl=e,this.metadata=i}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new Go(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const r=this._document.data.field(lr("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new V(S.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=An._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}}An._jsonSchemaVersion="firestore/documentSnapshot/1.0",An._jsonSchema={type:Ae("string",An._jsonSchemaVersion),bundleSource:Ae("string","DocumentSnapshot"),bundleName:Ae("string"),bundle:Ae("string")};class Go extends An{data(e={}){return super.data(e)}}class Rn{constructor(e,t,r,s){this._firestore=e,this._userDataWriter=t,this._snapshot=s,this.metadata=new Or(s.hasPendingWrites,s.fromCache),this.query=r}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach(r=>{e.call(t,new Go(this._firestore,this._userDataWriter,r.key,r,new Or(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new V(S.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(s,i){if(s._snapshot.oldDocs.isEmpty()){let o=0;return s._snapshot.docChanges.map(c=>{const u=new Go(s._firestore,s._userDataWriter,c.doc.key,c.doc,new Or(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter);return c.doc,{type:"added",doc:u,oldIndex:-1,newIndex:o++}})}{let o=s._snapshot.oldDocs;return s._snapshot.docChanges.filter(c=>i||c.type!==3).map(c=>{const u=new Go(s._firestore,s._userDataWriter,c.doc.key,c.doc,new Or(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter);let l=-1,d=-1;return c.type!==0&&(l=o.indexOf(c.doc.key),o=o.delete(c.doc.key)),c.type!==1&&(o=o.add(c.doc),d=o.indexOf(c.doc.key)),{type:Eb(c.type),doc:u,oldIndex:l,newIndex:d}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new V(S.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=Rn._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=ll.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],r=[],s=[];return this.docs.forEach(i=>{i._document!==null&&(t.push(i._document),r.push(this._userDataWriter.convertObjectMap(i._document.data.value.mapValue.fields,"previous")),s.push(i.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function Eb(n){switch(n){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return L(61501,{type:n})}}/**
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
 */Rn._jsonSchemaVersion="firestore/querySnapshot/1.0",Rn._jsonSchema={type:Ae("string",Rn._jsonSchemaVersion),bundleSource:Ae("string","QuerySnapshot"),bundleName:Ae("string"),bundle:Ae("string")};const wb={maxAttempts:5};/**
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
 */class Tb{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=Ir(e)}set(e,t,r){this._verifyNotCommitted();const s=_n(e,this._firestore),i=tc(s.converter,t,r),o=Xa(this._dataReader,"WriteBatch.set",s._key,i,s.converter!==null,r);return this._mutations.push(o.toMutation(s._key,de.none())),this}update(e,t,r,...s){this._verifyNotCommitted();const i=_n(e,this._firestore);let o;return o=typeof(t=q(t))=="string"||t instanceof _s?rh(this._dataReader,"WriteBatch.update",i._key,t,r,s):nh(this._dataReader,"WriteBatch.update",i._key,t),this._mutations.push(o.toMutation(i._key,de.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=_n(e,this._firestore);return this._mutations=this._mutations.concat(new fs(t._key,de.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new V(S.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function _n(n,e){if((n=q(n)).firestore!==e)throw new V(S.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return n}/**
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
 */class vb{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=Ir(e)}get(e){const t=_n(e,this._firestore),r=new fb(this._firestore);return this._transaction.lookup([t._key]).then(s=>{if(!s||s.length!==1)return L(24041);const i=s[0];if(i.isFoundDocument())return new ki(this._firestore,r,i.key,i,t.converter);if(i.isNoDocument())return new ki(this._firestore,r,t._key,null,t.converter);throw L(18433,{doc:i})})}set(e,t,r){const s=_n(e,this._firestore),i=tc(s.converter,t,r),o=Xa(this._dataReader,"Transaction.set",s._key,i,s.converter!==null,r);return this._transaction.set(s._key,o),this}update(e,t,r,...s){const i=_n(e,this._firestore);let o;return o=typeof(t=q(t))=="string"||t instanceof _s?rh(this._dataReader,"Transaction.update",i._key,t,r,s):nh(this._dataReader,"Transaction.update",i._key,t),this._transaction.update(i._key,o),this}delete(e){const t=_n(e,this._firestore);return this._transaction.delete(t._key),this}}/**
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
 */class Ab extends vb{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=_n(e,this._firestore),r=new ys(this._firestore);return super.get(e).then(s=>new An(this._firestore,r,t._key,s._document,new Or(!1,!1),t.converter))}}function IV(n,e,t){n=Ee(n,st);const r={...wb,...t};(function(o){if(o.maxAttempts<1)throw new V(S.INVALID_ARGUMENT,"Max attempts must be at least 1")})(r);const s=Zt(n);return eb(s,i=>e(new Ab(n,i)),r)}/**
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
 */function EV(n){n=Ee(n,fe);const e=Ee(n.firestore,st),t=Zt(e);return Z_(t,n._key).then(r=>lh(e,n,r))}function wV(n){n=Ee(n,fe);const e=Ee(n.firestore,st),t=Zt(e);return Z_(t,n._key,{source:"server"}).then(r=>lh(e,n,r))}function TV(n){n=Ee(n,Rt);const e=Ee(n.firestore,st),t=Zt(e),r=new ys(e);return ly(n._query),YR(t,n._query).then(s=>new Rn(e,r,n,s))}function vV(n){n=Ee(n,Rt);const e=Ee(n.firestore,st),t=Zt(e),r=new ys(e);return JR(t,n._query).then(s=>new Rn(e,r,n,s))}function AV(n,e,t){n=Ee(n,fe);const r=Ee(n.firestore,st),s=tc(n.converter,e,t),i=Ir(r);return Ji(r,[Xa(i,"setDoc",n._key,s,n.converter!==null,t).toMutation(n._key,de.none())])}function RV(n,e,t,...r){n=Ee(n,fe);const s=Ee(n.firestore,st),i=Ir(s);let o;return o=typeof(e=q(e))=="string"||e instanceof _s?rh(i,"updateDoc",n._key,e,t,r):nh(i,"updateDoc",n._key,e),Ji(s,[o.toMutation(n._key,de.exists(!0))])}function bV(n){return Ji(Ee(n.firestore,st),[new fs(n._key,de.none())])}function SV(n,e){const t=Ee(n.firestore,st),r=rb(n),s=tc(n.converter,e),i=Ir(n.firestore);return Ji(t,[Xa(i,"addDoc",r._key,s,n.converter!==null,{}).toMutation(r._key,de.exists(!1))]).then(()=>r)}function PV(n,...e){var l,d,p;n=q(n);let t={includeMetadataChanges:!1,source:"default"},r=0;typeof e[r]!="object"||Ap(e[r])||(t=e[r++]);const s={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(Ap(e[r])){const m=e[r];e[r]=(l=m.next)==null?void 0:l.bind(m),e[r+1]=(d=m.error)==null?void 0:d.bind(m),e[r+2]=(p=m.complete)==null?void 0:p.bind(m)}let i,o,c;if(n instanceof fe)o=Ee(n.firestore,st),c=ji(n._key.path),i={next:m=>{e[r]&&e[r](lh(o,n,m))},error:e[r+1],complete:e[r+2]};else{const m=Ee(n,Rt);o=Ee(m.firestore,st),c=m._query;const T=new ys(o);i={next:C=>{e[r]&&e[r](new Rn(o,T,m,C))},error:e[r+1],complete:e[r+2]},ly(n._query)}const u=Zt(o);return QR(u,c,s,i)}function Ji(n,e){const t=Zt(n);return ZR(t,e)}function lh(n,e,t){const r=t.docs.get(e._key),s=new ys(n);return new An(n,s,e._key,r,new Or(t.hasPendingWrites,t.fromCache),e.converter)}function CV(n){return n=Ee(n,st),Zt(n),new Tb(n,e=>Ji(n,e))}(function(e,t=!0){NT(gr),rt(new Ye("firestore",(r,{instanceIdentifier:s,options:i})=>{const o=r.getProvider("app").getImmediate(),c=new st(new OT(r.getProvider("auth-internal")),new LT(o,r.getProvider("app-check-internal")),vv(o,s),o);return i={useFetchStreams:t,...i},c._setSettings(i),c},"PUBLIC").setMultipleInstances(!0)),Fe(Tp,vp,e),Fe(Tp,vp,"esm2020")})();var Rb="firebase",bb="12.8.0";/**
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
 */Fe(Rb,bb,"app");/*! Capacitor: https://capacitorjs.com/ - MIT License */var cs;(function(n){n.Unimplemented="UNIMPLEMENTED",n.Unavailable="UNAVAILABLE"})(cs||(cs={}));class ru extends Error{constructor(e,t,r){super(e),this.message=e,this.code=t,this.data=r}}const Sb=n=>{var e,t;return n!=null&&n.androidBridge?"android":!((t=(e=n==null?void 0:n.webkit)===null||e===void 0?void 0:e.messageHandlers)===null||t===void 0)&&t.bridge?"ios":"web"},Pb=n=>{const e=n.CapacitorCustomPlatform||null,t=n.Capacitor||{},r=t.Plugins=t.Plugins||{},s=()=>e!==null?e.name:Sb(n),i=()=>s()!=="web",o=p=>{const m=l.get(p);return!!(m!=null&&m.platforms.has(s())||c(p))},c=p=>{var m;return(m=t.PluginHeaders)===null||m===void 0?void 0:m.find(T=>T.name===p)},u=p=>n.console.error(p),l=new Map,d=(p,m={})=>{const T=l.get(p);if(T)return console.warn(`Capacitor plugin "${p}" already registered. Cannot register plugins twice.`),T.proxy;const C=s(),N=c(p);let k;const H=async()=>(!k&&C in m?k=typeof m[C]=="function"?k=await m[C]():k=m[C]:e!==null&&!k&&"web"in m&&(k=typeof m.web=="function"?k=await m.web():k=m.web),k),$=(_,I)=>{var v,w;if(N){const R=N==null?void 0:N.methods.find(y=>I===y.name);if(R)return R.rtype==="promise"?y=>t.nativePromise(p,I.toString(),y):(y,Re)=>t.nativeCallback(p,I.toString(),y,Re);if(_)return(v=_[I])===null||v===void 0?void 0:v.bind(_)}else{if(_)return(w=_[I])===null||w===void 0?void 0:w.bind(_);throw new ru(`"${p}" plugin is not implemented on ${C}`,cs.Unimplemented)}},U=_=>{let I;const v=(...w)=>{const R=H().then(y=>{const Re=$(y,_);if(Re){const dt=Re(...w);return I=dt==null?void 0:dt.remove,dt}else throw new ru(`"${p}.${_}()" is not implemented on ${C}`,cs.Unimplemented)});return _==="addListener"&&(R.remove=async()=>I()),R};return v.toString=()=>`${_.toString()}() { [capacitor code] }`,Object.defineProperty(v,"name",{value:_,writable:!1,configurable:!1}),v},G=U("addListener"),K=U("removeListener"),W=(_,I)=>{const v=G({eventName:_},I),w=async()=>{const y=await v;K({eventName:_,callbackId:y},I)},R=new Promise(y=>v.then(()=>y({remove:w})));return R.remove=async()=>{console.warn("Using addListener() without 'await' is deprecated."),await w()},R},E=new Proxy({},{get(_,I){switch(I){case"$$typeof":return;case"toJSON":return()=>({});case"addListener":return N?W:G;case"removeListener":return K;default:return U(I)}}});return r[p]=E,l.set(p,{name:p,proxy:E,platforms:new Set([...Object.keys(m),...N?[C]:[]])}),E};return t.convertFileSrc||(t.convertFileSrc=p=>p),t.getPlatform=s,t.handleError=u,t.isNativePlatform=i,t.isPluginAvailable=o,t.registerPlugin=d,t.Exception=ru,t.DEBUG=!!t.DEBUG,t.isLoggingEnabled=!!t.isLoggingEnabled,t},Cb=n=>n.Capacitor=Pb(n),Ju=Cb(typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{}),Yi=Ju.registerPlugin;class Xi{constructor(){this.listeners={},this.retainedEventArguments={},this.windowListeners={}}addListener(e,t){let r=!1;this.listeners[e]||(this.listeners[e]=[],r=!0),this.listeners[e].push(t);const i=this.windowListeners[e];i&&!i.registered&&this.addWindowListener(i),r&&this.sendRetainedArgumentsForEvent(e);const o=async()=>this.removeListener(e,t);return Promise.resolve({remove:o})}async removeAllListeners(){this.listeners={};for(const e in this.windowListeners)this.removeWindowListener(this.windowListeners[e]);this.windowListeners={}}notifyListeners(e,t,r){const s=this.listeners[e];if(!s){if(r){let i=this.retainedEventArguments[e];i||(i=[]),i.push(t),this.retainedEventArguments[e]=i}return}s.forEach(i=>i(t))}hasListeners(e){var t;return!!(!((t=this.listeners[e])===null||t===void 0)&&t.length)}registerWindowListener(e,t){this.windowListeners[t]={registered:!1,windowEventName:e,pluginEventName:t,handler:r=>{this.notifyListeners(t,r)}}}unimplemented(e="not implemented"){return new Ju.Exception(e,cs.Unimplemented)}unavailable(e="not available"){return new Ju.Exception(e,cs.Unavailable)}async removeListener(e,t){const r=this.listeners[e];if(!r)return;const s=r.indexOf(t);this.listeners[e].splice(s,1),this.listeners[e].length||this.removeWindowListener(this.windowListeners[e])}addWindowListener(e){window.addEventListener(e.windowEventName,e.handler),e.registered=!0}removeWindowListener(e){e&&(window.removeEventListener(e.windowEventName,e.handler),e.registered=!1)}sendRetainedArgumentsForEvent(e){const t=this.retainedEventArguments[e];t&&(delete this.retainedEventArguments[e],t.forEach(r=>{this.notifyListeners(e,r)}))}}const Sp=n=>encodeURIComponent(n).replace(/%(2[346B]|5E|60|7C)/g,decodeURIComponent).replace(/[()]/g,escape),Pp=n=>n.replace(/(%[\dA-F]{2})+/gi,decodeURIComponent);class kb extends Xi{async getCookies(){const e=document.cookie,t={};return e.split(";").forEach(r=>{if(r.length<=0)return;let[s,i]=r.replace(/=/,"CAP_COOKIE").split("CAP_COOKIE");s=Pp(s).trim(),i=Pp(i).trim(),t[s]=i}),t}async setCookie(e){try{const t=Sp(e.key),r=Sp(e.value),s=e.expires?`; expires=${e.expires.replace("expires=","")}`:"",i=(e.path||"/").replace("path=",""),o=e.url!=null&&e.url.length>0?`domain=${e.url}`:"";document.cookie=`${t}=${r||""}${s}; path=${i}; ${o};`}catch(t){return Promise.reject(t)}}async deleteCookie(e){try{document.cookie=`${e.key}=; Max-Age=0`}catch(t){return Promise.reject(t)}}async clearCookies(){try{const e=document.cookie.split(";")||[];for(const t of e)document.cookie=t.replace(/^ +/,"").replace(/=.*/,`=;expires=${new Date().toUTCString()};path=/`)}catch(e){return Promise.reject(e)}}async clearAllCookies(){try{await this.clearCookies()}catch(e){return Promise.reject(e)}}}Yi("CapacitorCookies",{web:()=>new kb});const Nb=async n=>new Promise((e,t)=>{const r=new FileReader;r.onload=()=>{const s=r.result;e(s.indexOf(",")>=0?s.split(",")[1]:s)},r.onerror=s=>t(s),r.readAsDataURL(n)}),Db=(n={})=>{const e=Object.keys(n);return Object.keys(n).map(s=>s.toLocaleLowerCase()).reduce((s,i,o)=>(s[i]=n[e[o]],s),{})},Vb=(n,e=!0)=>n?Object.entries(n).reduce((r,s)=>{const[i,o]=s;let c,u;return Array.isArray(o)?(u="",o.forEach(l=>{c=e?encodeURIComponent(l):l,u+=`${i}=${c}&`}),u.slice(0,-1)):(c=e?encodeURIComponent(o):o,u=`${i}=${c}`),`${r}&${u}`},"").substr(1):null,Ob=(n,e={})=>{const t=Object.assign({method:n.method||"GET",headers:n.headers},e),s=Db(n.headers)["content-type"]||"";if(typeof n.data=="string")t.body=n.data;else if(s.includes("application/x-www-form-urlencoded")){const i=new URLSearchParams;for(const[o,c]of Object.entries(n.data||{}))i.set(o,c);t.body=i.toString()}else if(s.includes("multipart/form-data")||n.data instanceof FormData){const i=new FormData;if(n.data instanceof FormData)n.data.forEach((c,u)=>{i.append(u,c)});else for(const c of Object.keys(n.data))i.append(c,n.data[c]);t.body=i;const o=new Headers(t.headers);o.delete("content-type"),t.headers=o}else(s.includes("application/json")||typeof n.data=="object")&&(t.body=JSON.stringify(n.data));return t};class xb extends Xi{async request(e){const t=Ob(e,e.webFetchExtra),r=Vb(e.params,e.shouldEncodeUrlParams),s=r?`${e.url}?${r}`:e.url,i=await fetch(s,t),o=i.headers.get("content-type")||"";let{responseType:c="text"}=i.ok?e:{};o.includes("application/json")&&(c="json");let u,l;switch(c){case"arraybuffer":case"blob":l=await i.blob(),u=await Nb(l);break;case"json":u=await i.json();break;case"document":case"text":default:u=await i.text()}const d={};return i.headers.forEach((p,m)=>{d[m]=p}),{data:u,headers:d,status:i.status,url:i.url}}async get(e){return this.request(Object.assign(Object.assign({},e),{method:"GET"}))}async post(e){return this.request(Object.assign(Object.assign({},e),{method:"POST"}))}async put(e){return this.request(Object.assign(Object.assign({},e),{method:"PUT"}))}async patch(e){return this.request(Object.assign(Object.assign({},e),{method:"PATCH"}))}async delete(e){return this.request(Object.assign(Object.assign({},e),{method:"DELETE"}))}}Yi("CapacitorHttp",{web:()=>new xb});var Cp;(function(n){n.Dark="DARK",n.Light="LIGHT",n.Default="DEFAULT"})(Cp||(Cp={}));var kp;(function(n){n.StatusBar="StatusBar",n.NavigationBar="NavigationBar"})(kp||(kp={}));class Mb extends Xi{async setStyle(){this.unavailable("not available for web")}async setAnimation(){this.unavailable("not available for web")}async show(){this.unavailable("not available for web")}async hide(){this.unavailable("not available for web")}}Yi("SystemBars",{web:()=>new Mb});/**
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
 */const dy="firebasestorage.googleapis.com",fy="storageBucket",Lb=2*60*1e3,Ub=10*60*1e3,Fb=1e3;/**
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
 */class pe extends It{constructor(e,t,r=0){super(su(e),`Firebase Storage: ${t} (${su(e)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,pe.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return su(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var ce;(function(n){n.UNKNOWN="unknown",n.OBJECT_NOT_FOUND="object-not-found",n.BUCKET_NOT_FOUND="bucket-not-found",n.PROJECT_NOT_FOUND="project-not-found",n.QUOTA_EXCEEDED="quota-exceeded",n.UNAUTHENTICATED="unauthenticated",n.UNAUTHORIZED="unauthorized",n.UNAUTHORIZED_APP="unauthorized-app",n.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",n.INVALID_CHECKSUM="invalid-checksum",n.CANCELED="canceled",n.INVALID_EVENT_NAME="invalid-event-name",n.INVALID_URL="invalid-url",n.INVALID_DEFAULT_BUCKET="invalid-default-bucket",n.NO_DEFAULT_BUCKET="no-default-bucket",n.CANNOT_SLICE_BLOB="cannot-slice-blob",n.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",n.NO_DOWNLOAD_URL="no-download-url",n.INVALID_ARGUMENT="invalid-argument",n.INVALID_ARGUMENT_COUNT="invalid-argument-count",n.APP_DELETED="app-deleted",n.INVALID_ROOT_OPERATION="invalid-root-operation",n.INVALID_FORMAT="invalid-format",n.INTERNAL_ERROR="internal-error",n.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(ce||(ce={}));function su(n){return"storage/"+n}function hh(){const n="An unknown error occurred, please check the error payload for server response.";return new pe(ce.UNKNOWN,n)}function Bb(n){return new pe(ce.OBJECT_NOT_FOUND,"Object '"+n+"' does not exist.")}function qb(n){return new pe(ce.QUOTA_EXCEEDED,"Quota for bucket '"+n+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function $b(){const n="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new pe(ce.UNAUTHENTICATED,n)}function jb(){return new pe(ce.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function Hb(n){return new pe(ce.UNAUTHORIZED,"User does not have permission to access '"+n+"'.")}function py(){return new pe(ce.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function my(){return new pe(ce.CANCELED,"User canceled the upload/download.")}function Gb(n){return new pe(ce.INVALID_URL,"Invalid URL '"+n+"'.")}function zb(n){return new pe(ce.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+n+"'.")}function Wb(){return new pe(ce.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+fy+"' property when initializing the app?")}function gy(){return new pe(ce.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function Kb(){return new pe(ce.SERVER_FILE_WRONG_SIZE,"Server recorded incorrect upload file size, please retry the upload.")}function Qb(){return new pe(ce.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function Jb(n){return new pe(ce.UNSUPPORTED_ENVIRONMENT,`${n} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function _a(n){return new pe(ce.INVALID_ARGUMENT,n)}function _y(){return new pe(ce.APP_DELETED,"The Firebase app was deleted.")}function yy(n){return new pe(ce.INVALID_ROOT_OPERATION,"The operation '"+n+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function ui(n,e){return new pe(ce.INVALID_FORMAT,"String does not match format '"+n+"': "+e)}function Hs(n){throw new pe(ce.INTERNAL_ERROR,"Internal error: "+n)}/**
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
 */class He{constructor(e,t){this.bucket=e,this.path_=t}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,t){let r;try{r=He.makeFromUrl(e,t)}catch{return new He(e,"")}if(r.path==="")return r;throw zb(e)}static makeFromUrl(e,t){let r=null;const s="([A-Za-z0-9.\\-_]+)";function i(G){G.path.charAt(G.path.length-1)==="/"&&(G.path_=G.path_.slice(0,-1))}const o="(/(.*))?$",c=new RegExp("^gs://"+s+o,"i"),u={bucket:1,path:3};function l(G){G.path_=decodeURIComponent(G.path)}const d="v[A-Za-z0-9_]+",p=t.replace(/[.]/g,"\\."),m="(/([^?#]*).*)?$",T=new RegExp(`^https?://${p}/${d}/b/${s}/o${m}`,"i"),C={bucket:1,path:3},N=t===dy?"(?:storage.googleapis.com|storage.cloud.google.com)":t,k="([^?#]*)",H=new RegExp(`^https?://${N}/${s}/${k}`,"i"),U=[{regex:c,indices:u,postModify:i},{regex:T,indices:C,postModify:l},{regex:H,indices:{bucket:1,path:2},postModify:l}];for(let G=0;G<U.length;G++){const K=U[G],W=K.regex.exec(e);if(W){const E=W[K.indices.bucket];let _=W[K.indices.path];_||(_=""),r=new He(E,_),K.postModify(r);break}}if(r==null)throw Gb(e);return r}}class Yb{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
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
 */function Xb(n,e,t){let r=1,s=null,i=null,o=!1,c=0;function u(){return c===2}let l=!1;function d(...k){l||(l=!0,e.apply(null,k))}function p(k){s=setTimeout(()=>{s=null,n(T,u())},k)}function m(){i&&clearTimeout(i)}function T(k,...H){if(l){m();return}if(k){m(),d.call(null,k,...H);return}if(u()||o){m(),d.call(null,k,...H);return}r<64&&(r*=2);let U;c===1?(c=2,U=0):U=(r+Math.random())*1e3,p(U)}let C=!1;function N(k){C||(C=!0,m(),!l&&(s!==null?(k||(c=2),clearTimeout(s),p(0)):k||(c=1)))}return p(0),i=setTimeout(()=>{o=!0,N(!0)},t),N}function Zb(n){n(!1)}/**
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
 */function eS(n){return n!==void 0}function tS(n){return typeof n=="function"}function nS(n){return typeof n=="object"&&!Array.isArray(n)}function nc(n){return typeof n=="string"||n instanceof String}function Np(n){return dh()&&n instanceof Blob}function dh(){return typeof Blob<"u"}function Yu(n,e,t,r){if(r<e)throw _a(`Invalid value for '${n}'. Expected ${e} or greater.`);if(r>t)throw _a(`Invalid value for '${n}'. Expected ${t} or less.`)}/**
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
 */function en(n,e,t){let r=e;return t==null&&(r=`https://${e}`),`${t}://${r}/v0${n}`}function Iy(n){const e=encodeURIComponent;let t="?";for(const r in n)if(n.hasOwnProperty(r)){const s=e(r)+"="+e(n[r]);t=t+s+"&"}return t=t.slice(0,-1),t}var tr;(function(n){n[n.NO_ERROR=0]="NO_ERROR",n[n.NETWORK_ERROR=1]="NETWORK_ERROR",n[n.ABORT=2]="ABORT"})(tr||(tr={}));/**
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
 */function Ey(n,e){const t=n>=500&&n<600,s=[408,429].indexOf(n)!==-1,i=e.indexOf(n)!==-1;return t||s||i}/**
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
 */class rS{constructor(e,t,r,s,i,o,c,u,l,d,p,m=!0,T=!1){this.url_=e,this.method_=t,this.headers_=r,this.body_=s,this.successCodes_=i,this.additionalRetryCodes_=o,this.callback_=c,this.errorCallback_=u,this.timeout_=l,this.progressCallback_=d,this.connectionFactory_=p,this.retry=m,this.isUsingEmulator=T,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((C,N)=>{this.resolve_=C,this.reject_=N,this.start_()})}start_(){const e=(r,s)=>{if(s){r(!1,new Po(!1,null,!0));return}const i=this.connectionFactory_();this.pendingConnection_=i;const o=c=>{const u=c.loaded,l=c.lengthComputable?c.total:-1;this.progressCallback_!==null&&this.progressCallback_(u,l)};this.progressCallback_!==null&&i.addUploadProgressListener(o),i.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&i.removeUploadProgressListener(o),this.pendingConnection_=null;const c=i.getErrorCode()===tr.NO_ERROR,u=i.getStatus();if(!c||Ey(u,this.additionalRetryCodes_)&&this.retry){const d=i.getErrorCode()===tr.ABORT;r(!1,new Po(!1,null,d));return}const l=this.successCodes_.indexOf(u)!==-1;r(!0,new Po(l,i))})},t=(r,s)=>{const i=this.resolve_,o=this.reject_,c=s.connection;if(s.wasSuccessCode)try{const u=this.callback_(c,c.getResponse());eS(u)?i(u):i()}catch(u){o(u)}else if(c!==null){const u=hh();u.serverResponse=c.getErrorText(),this.errorCallback_?o(this.errorCallback_(c,u)):o(u)}else if(s.canceled){const u=this.appDelete_?_y():my();o(u)}else{const u=py();o(u)}};this.canceled_?t(!1,new Po(!1,null,!0)):this.backoffId_=Xb(e,t,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&Zb(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class Po{constructor(e,t,r){this.wasSuccessCode=e,this.connection=t,this.canceled=!!r}}function sS(n,e){e!==null&&e.length>0&&(n.Authorization="Firebase "+e)}function iS(n,e){n["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function oS(n,e){e&&(n["X-Firebase-GMPID"]=e)}function aS(n,e){e!==null&&(n["X-Firebase-AppCheck"]=e)}function cS(n,e,t,r,s,i,o=!0,c=!1){const u=Iy(n.urlParams),l=n.url+u,d=Object.assign({},n.headers);return oS(d,e),sS(d,t),iS(d,i),aS(d,r),new rS(l,n.method,d,n.body,n.successCodes,n.additionalRetryCodes,n.handler,n.errorHandler,n.timeout,n.progressCallback,s,o,c)}/**
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
 */function uS(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function lS(...n){const e=uS();if(e!==void 0){const t=new e;for(let r=0;r<n.length;r++)t.append(n[r]);return t.getBlob()}else{if(dh())return new Blob(n);throw new pe(ce.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function hS(n,e,t){return n.webkitSlice?n.webkitSlice(e,t):n.mozSlice?n.mozSlice(e,t):n.slice?n.slice(e,t):null}/**
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
 */function dS(n){if(typeof atob>"u")throw Jb("base-64");return atob(n)}/**
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
 */const _t={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class iu{constructor(e,t){this.data=e,this.contentType=t||null}}function fh(n,e){switch(n){case _t.RAW:return new iu(wy(e));case _t.BASE64:case _t.BASE64URL:return new iu(Ty(n,e));case _t.DATA_URL:return new iu(pS(e),mS(e))}throw hh()}function wy(n){const e=[];for(let t=0;t<n.length;t++){let r=n.charCodeAt(t);if(r<=127)e.push(r);else if(r<=2047)e.push(192|r>>6,128|r&63);else if((r&64512)===55296)if(!(t<n.length-1&&(n.charCodeAt(t+1)&64512)===56320))e.push(239,191,189);else{const i=r,o=n.charCodeAt(++t);r=65536|(i&1023)<<10|o&1023,e.push(240|r>>18,128|r>>12&63,128|r>>6&63,128|r&63)}else(r&64512)===56320?e.push(239,191,189):e.push(224|r>>12,128|r>>6&63,128|r&63)}return new Uint8Array(e)}function fS(n){let e;try{e=decodeURIComponent(n)}catch{throw ui(_t.DATA_URL,"Malformed data URL.")}return wy(e)}function Ty(n,e){switch(n){case _t.BASE64:{const s=e.indexOf("-")!==-1,i=e.indexOf("_")!==-1;if(s||i)throw ui(n,"Invalid character '"+(s?"-":"_")+"' found: is it base64url encoded?");break}case _t.BASE64URL:{const s=e.indexOf("+")!==-1,i=e.indexOf("/")!==-1;if(s||i)throw ui(n,"Invalid character '"+(s?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");break}}let t;try{t=dS(e)}catch(s){throw s.message.includes("polyfill")?s:ui(n,"Invalid character found")}const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=t.charCodeAt(s);return r}class vy{constructor(e){this.base64=!1,this.contentType=null;const t=e.match(/^data:([^,]+)?,/);if(t===null)throw ui(_t.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const r=t[1]||null;r!=null&&(this.base64=gS(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-7):r),this.rest=e.substring(e.indexOf(",")+1)}}function pS(n){const e=new vy(n);return e.base64?Ty(_t.BASE64,e.rest):fS(e.rest)}function mS(n){return new vy(n).contentType}function gS(n,e){return n.length>=e.length?n.substring(n.length-e.length)===e:!1}/**
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
 */class kt{constructor(e,t){let r=0,s="";Np(e)?(this.data_=e,r=e.size,s=e.type):e instanceof ArrayBuffer?(t?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),r=this.data_.length):e instanceof Uint8Array&&(t?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),r=e.length),this.size_=r,this.type_=s}size(){return this.size_}type(){return this.type_}slice(e,t){if(Np(this.data_)){const r=this.data_,s=hS(r,e,t);return s===null?null:new kt(s)}else{const r=new Uint8Array(this.data_.buffer,e,t-e);return new kt(r,!0)}}static getBlob(...e){if(dh()){const t=e.map(r=>r instanceof kt?r.data_:r);return new kt(lS.apply(null,t))}else{const t=e.map(o=>nc(o)?fh(_t.RAW,o).data:o.data_);let r=0;t.forEach(o=>{r+=o.byteLength});const s=new Uint8Array(r);let i=0;return t.forEach(o=>{for(let c=0;c<o.length;c++)s[i++]=o[c]}),new kt(s,!0)}}uploadData(){return this.data_}}/**
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
 */function ph(n){let e;try{e=JSON.parse(n)}catch{return null}return nS(e)?e:null}/**
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
 */function _S(n){if(n.length===0)return null;const e=n.lastIndexOf("/");return e===-1?"":n.slice(0,e)}function yS(n,e){const t=e.split("/").filter(r=>r.length>0).join("/");return n.length===0?t:n+"/"+t}function Ay(n){const e=n.lastIndexOf("/",n.length-2);return e===-1?n:n.slice(e+1)}/**
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
 */function IS(n,e){return e}class Ke{constructor(e,t,r,s){this.server=e,this.local=t||e,this.writable=!!r,this.xform=s||IS}}let Co=null;function ES(n){return!nc(n)||n.length<2?n:Ay(n)}function Zi(){if(Co)return Co;const n=[];n.push(new Ke("bucket")),n.push(new Ke("generation")),n.push(new Ke("metageneration")),n.push(new Ke("name","fullPath",!0));function e(i,o){return ES(o)}const t=new Ke("name");t.xform=e,n.push(t);function r(i,o){return o!==void 0?Number(o):o}const s=new Ke("size");return s.xform=r,n.push(s),n.push(new Ke("timeCreated")),n.push(new Ke("updated")),n.push(new Ke("md5Hash",null,!0)),n.push(new Ke("cacheControl",null,!0)),n.push(new Ke("contentDisposition",null,!0)),n.push(new Ke("contentEncoding",null,!0)),n.push(new Ke("contentLanguage",null,!0)),n.push(new Ke("contentType",null,!0)),n.push(new Ke("metadata","customMetadata",!0)),Co=n,Co}function wS(n,e){function t(){const r=n.bucket,s=n.fullPath,i=new He(r,s);return e._makeStorageReference(i)}Object.defineProperty(n,"ref",{get:t})}function TS(n,e,t){const r={};r.type="file";const s=t.length;for(let i=0;i<s;i++){const o=t[i];r[o.local]=o.xform(r,e[o.server])}return wS(r,n),r}function Ry(n,e,t){const r=ph(e);return r===null?null:TS(n,r,t)}function vS(n,e,t,r){const s=ph(e);if(s===null||!nc(s.downloadTokens))return null;const i=s.downloadTokens;if(i.length===0)return null;const o=encodeURIComponent;return i.split(",").map(l=>{const d=n.bucket,p=n.fullPath,m="/b/"+o(d)+"/o/"+o(p),T=en(m,t,r),C=Iy({alt:"media",token:l});return T+C})[0]}function mh(n,e){const t={},r=e.length;for(let s=0;s<r;s++){const i=e[s];i.writable&&(t[i.server]=n[i.local])}return JSON.stringify(t)}/**
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
 */const Dp="prefixes",Vp="items";function AS(n,e,t){const r={prefixes:[],items:[],nextPageToken:t.nextPageToken};if(t[Dp])for(const s of t[Dp]){const i=s.replace(/\/$/,""),o=n._makeStorageReference(new He(e,i));r.prefixes.push(o)}if(t[Vp])for(const s of t[Vp]){const i=n._makeStorageReference(new He(e,s.name));r.items.push(i)}return r}function RS(n,e,t){const r=ph(t);return r===null?null:AS(n,e,r)}class Ft{constructor(e,t,r,s){this.url=e,this.method=t,this.handler=r,this.timeout=s,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
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
 */function Ot(n){if(!n)throw hh()}function rc(n,e){function t(r,s){const i=Ry(n,s,e);return Ot(i!==null),i}return t}function bS(n,e){function t(r,s){const i=RS(n,e,s);return Ot(i!==null),i}return t}function SS(n,e){function t(r,s){const i=Ry(n,s,e);return Ot(i!==null),vS(i,s,n.host,n._protocol)}return t}function Is(n){function e(t,r){let s;return t.getStatus()===401?t.getErrorText().includes("Firebase App Check token is invalid")?s=jb():s=$b():t.getStatus()===402?s=qb(n.bucket):t.getStatus()===403?s=Hb(n.path):s=r,s.status=t.getStatus(),s.serverResponse=r.serverResponse,s}return e}function eo(n){const e=Is(n);function t(r,s){let i=e(r,s);return r.getStatus()===404&&(i=Bb(n.path)),i.serverResponse=s.serverResponse,i}return t}function by(n,e,t){const r=e.fullServerUrl(),s=en(r,n.host,n._protocol),i="GET",o=n.maxOperationRetryTime,c=new Ft(s,i,rc(n,t),o);return c.errorHandler=eo(e),c}function PS(n,e,t,r,s){const i={};e.isRoot?i.prefix="":i.prefix=e.path+"/",t.length>0&&(i.delimiter=t),r&&(i.pageToken=r),s&&(i.maxResults=s);const o=e.bucketOnlyServerUrl(),c=en(o,n.host,n._protocol),u="GET",l=n.maxOperationRetryTime,d=new Ft(c,u,bS(n,e.bucket),l);return d.urlParams=i,d.errorHandler=Is(e),d}function Sy(n,e,t){const r=e.fullServerUrl(),s=en(r,n.host,n._protocol)+"?alt=media",i="GET",o=n.maxOperationRetryTime,c=new Ft(s,i,(u,l)=>l,o);return c.errorHandler=eo(e),t!==void 0&&(c.headers.Range=`bytes=0-${t}`,c.successCodes=[200,206]),c}function CS(n,e,t){const r=e.fullServerUrl(),s=en(r,n.host,n._protocol),i="GET",o=n.maxOperationRetryTime,c=new Ft(s,i,SS(n,t),o);return c.errorHandler=eo(e),c}function kS(n,e,t,r){const s=e.fullServerUrl(),i=en(s,n.host,n._protocol),o="PATCH",c=mh(t,r),u={"Content-Type":"application/json; charset=utf-8"},l=n.maxOperationRetryTime,d=new Ft(i,o,rc(n,r),l);return d.headers=u,d.body=c,d.errorHandler=eo(e),d}function NS(n,e){const t=e.fullServerUrl(),r=en(t,n.host,n._protocol),s="DELETE",i=n.maxOperationRetryTime;function o(u,l){}const c=new Ft(r,s,o,i);return c.successCodes=[200,204],c.errorHandler=eo(e),c}function DS(n,e){return n&&n.contentType||e&&e.type()||"application/octet-stream"}function Py(n,e,t){const r=Object.assign({},t);return r.fullPath=n.path,r.size=e.size(),r.contentType||(r.contentType=DS(null,e)),r}function Cy(n,e,t,r,s){const i=e.bucketOnlyServerUrl(),o={"X-Goog-Upload-Protocol":"multipart"};function c(){let U="";for(let G=0;G<2;G++)U=U+Math.random().toString().slice(2);return U}const u=c();o["Content-Type"]="multipart/related; boundary="+u;const l=Py(e,r,s),d=mh(l,t),p="--"+u+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+d+`\r
--`+u+`\r
Content-Type: `+l.contentType+`\r
\r
`,m=`\r
--`+u+"--",T=kt.getBlob(p,r,m);if(T===null)throw gy();const C={name:l.fullPath},N=en(i,n.host,n._protocol),k="POST",H=n.maxUploadRetryTime,$=new Ft(N,k,rc(n,t),H);return $.urlParams=C,$.headers=o,$.body=T.uploadData(),$.errorHandler=Is(e),$}class ya{constructor(e,t,r,s){this.current=e,this.total=t,this.finalized=!!r,this.metadata=s||null}}function gh(n,e){let t=null;try{t=n.getResponseHeader("X-Goog-Upload-Status")}catch{Ot(!1)}return Ot(!!t&&(e||["active"]).indexOf(t)!==-1),t}function VS(n,e,t,r,s){const i=e.bucketOnlyServerUrl(),o=Py(e,r,s),c={name:o.fullPath},u=en(i,n.host,n._protocol),l="POST",d={"X-Goog-Upload-Protocol":"resumable","X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":`${r.size()}`,"X-Goog-Upload-Header-Content-Type":o.contentType,"Content-Type":"application/json; charset=utf-8"},p=mh(o,t),m=n.maxUploadRetryTime;function T(N){gh(N);let k;try{k=N.getResponseHeader("X-Goog-Upload-URL")}catch{Ot(!1)}return Ot(nc(k)),k}const C=new Ft(u,l,T,m);return C.urlParams=c,C.headers=d,C.body=p,C.errorHandler=Is(e),C}function OS(n,e,t,r){const s={"X-Goog-Upload-Command":"query"};function i(l){const d=gh(l,["active","final"]);let p=null;try{p=l.getResponseHeader("X-Goog-Upload-Size-Received")}catch{Ot(!1)}p||Ot(!1);const m=Number(p);return Ot(!isNaN(m)),new ya(m,r.size(),d==="final")}const o="POST",c=n.maxUploadRetryTime,u=new Ft(t,o,i,c);return u.headers=s,u.errorHandler=Is(e),u}const Op=256*1024;function xS(n,e,t,r,s,i,o,c){const u=new ya(0,0);if(o?(u.current=o.current,u.total=o.total):(u.current=0,u.total=r.size()),r.size()!==u.total)throw Kb();const l=u.total-u.current;let d=l;s>0&&(d=Math.min(d,s));const p=u.current,m=p+d;let T="";d===0?T="finalize":l===d?T="upload, finalize":T="upload";const C={"X-Goog-Upload-Command":T,"X-Goog-Upload-Offset":`${u.current}`},N=r.slice(p,m);if(N===null)throw gy();function k(G,K){const W=gh(G,["active","final"]),E=u.current+d,_=r.size();let I;return W==="final"?I=rc(e,i)(G,K):I=null,new ya(E,_,W==="final",I)}const H="POST",$=e.maxUploadRetryTime,U=new Ft(t,H,k,$);return U.headers=C,U.body=N.uploadData(),U.progressCallback=c||null,U.errorHandler=Is(n),U}/**
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
 */const MS={STATE_CHANGED:"state_changed"},Qe={RUNNING:"running",PAUSED:"paused",SUCCESS:"success",CANCELED:"canceled",ERROR:"error"};function ou(n){switch(n){case"running":case"pausing":case"canceling":return Qe.RUNNING;case"paused":return Qe.PAUSED;case"success":return Qe.SUCCESS;case"canceled":return Qe.CANCELED;case"error":return Qe.ERROR;default:return Qe.ERROR}}/**
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
 */class LS{constructor(e,t,r){if(tS(e)||t!=null||r!=null)this.next=e,this.error=t??void 0,this.complete=r??void 0;else{const i=e;this.next=i.next,this.error=i.error,this.complete=i.complete}}}/**
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
 */function Cr(n){return(...e)=>{Promise.resolve().then(()=>n(...e))}}class _h{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=tr.NO_ERROR,this.sendPromise_=new Promise(e=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=tr.ABORT,e()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=tr.NETWORK_ERROR,e()}),this.xhr_.addEventListener("load",()=>{e()})})}send(e,t,r,s,i){if(this.sent_)throw Hs("cannot .send() more than once");if(At(e)&&r&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(t,e,!0),i!==void 0)for(const o in i)i.hasOwnProperty(o)&&this.xhr_.setRequestHeader(o,i[o].toString());return s!==void 0?this.xhr_.send(s):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw Hs("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw Hs("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw Hs("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw Hs("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(e){return this.xhr_.getResponseHeader(e)}addUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",e)}removeUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",e)}}class US extends _h{initXhr(){this.xhr_.responseType="text"}}function wt(){return new US}class FS extends _h{initXhr(){this.xhr_.responseType="arraybuffer"}}function BS(){return new FS}class qS extends _h{initXhr(){this.xhr_.responseType="blob"}}function $S(){return new qS}/**
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
 */class ky{isExponentialBackoffExpired(){return this.sleepTime>this.maxSleepTime}constructor(e,t,r=null){this._transferred=0,this._needToFetchStatus=!1,this._needToFetchMetadata=!1,this._observers=[],this._error=void 0,this._uploadUrl=void 0,this._request=void 0,this._chunkMultiplier=1,this._resolve=void 0,this._reject=void 0,this._ref=e,this._blob=t,this._metadata=r,this._mappings=Zi(),this._resumable=this._shouldDoResumable(this._blob),this._state="running",this._errorHandler=s=>{if(this._request=void 0,this._chunkMultiplier=1,s._codeEquals(ce.CANCELED))this._needToFetchStatus=!0,this.completeTransitions_();else{const i=this.isExponentialBackoffExpired();if(Ey(s.status,[]))if(i)s=py();else{this.sleepTime=Math.max(this.sleepTime*2,Fb),this._needToFetchStatus=!0,this.completeTransitions_();return}this._error=s,this._transition("error")}},this._metadataErrorHandler=s=>{this._request=void 0,s._codeEquals(ce.CANCELED)?this.completeTransitions_():(this._error=s,this._transition("error"))},this.sleepTime=0,this.maxSleepTime=this._ref.storage.maxUploadRetryTime,this._promise=new Promise((s,i)=>{this._resolve=s,this._reject=i,this._start()}),this._promise.then(null,()=>{})}_makeProgressCallback(){const e=this._transferred;return t=>this._updateProgress(e+t)}_shouldDoResumable(e){return e.size()>256*1024}_start(){this._state==="running"&&this._request===void 0&&(this._resumable?this._uploadUrl===void 0?this._createResumable():this._needToFetchStatus?this._fetchStatus():this._needToFetchMetadata?this._fetchMetadata():this.pendingTimeout=setTimeout(()=>{this.pendingTimeout=void 0,this._continueUpload()},this.sleepTime):this._oneShotUpload())}_resolveToken(e){Promise.all([this._ref.storage._getAuthToken(),this._ref.storage._getAppCheckToken()]).then(([t,r])=>{switch(this._state){case"running":e(t,r);break;case"canceling":this._transition("canceled");break;case"pausing":this._transition("paused");break}})}_createResumable(){this._resolveToken((e,t)=>{const r=VS(this._ref.storage,this._ref._location,this._mappings,this._blob,this._metadata),s=this._ref.storage._makeRequest(r,wt,e,t);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._uploadUrl=i,this._needToFetchStatus=!1,this.completeTransitions_()},this._errorHandler)})}_fetchStatus(){const e=this._uploadUrl;this._resolveToken((t,r)=>{const s=OS(this._ref.storage,this._ref._location,e,this._blob),i=this._ref.storage._makeRequest(s,wt,t,r);this._request=i,i.getPromise().then(o=>{o=o,this._request=void 0,this._updateProgress(o.current),this._needToFetchStatus=!1,o.finalized&&(this._needToFetchMetadata=!0),this.completeTransitions_()},this._errorHandler)})}_continueUpload(){const e=Op*this._chunkMultiplier,t=new ya(this._transferred,this._blob.size()),r=this._uploadUrl;this._resolveToken((s,i)=>{let o;try{o=xS(this._ref._location,this._ref.storage,r,this._blob,e,this._mappings,t,this._makeProgressCallback())}catch(u){this._error=u,this._transition("error");return}const c=this._ref.storage._makeRequest(o,wt,s,i,!1);this._request=c,c.getPromise().then(u=>{this._increaseMultiplier(),this._request=void 0,this._updateProgress(u.current),u.finalized?(this._metadata=u.metadata,this._transition("success")):this.completeTransitions_()},this._errorHandler)})}_increaseMultiplier(){Op*this._chunkMultiplier*2<32*1024*1024&&(this._chunkMultiplier*=2)}_fetchMetadata(){this._resolveToken((e,t)=>{const r=by(this._ref.storage,this._ref._location,this._mappings),s=this._ref.storage._makeRequest(r,wt,e,t);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._metadata=i,this._transition("success")},this._metadataErrorHandler)})}_oneShotUpload(){this._resolveToken((e,t)=>{const r=Cy(this._ref.storage,this._ref._location,this._mappings,this._blob,this._metadata),s=this._ref.storage._makeRequest(r,wt,e,t);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._metadata=i,this._updateProgress(this._blob.size()),this._transition("success")},this._errorHandler)})}_updateProgress(e){const t=this._transferred;this._transferred=e,this._transferred!==t&&this._notifyObservers()}_transition(e){if(this._state!==e)switch(e){case"canceling":case"pausing":this._state=e,this._request!==void 0?this._request.cancel():this.pendingTimeout&&(clearTimeout(this.pendingTimeout),this.pendingTimeout=void 0,this.completeTransitions_());break;case"running":const t=this._state==="paused";this._state=e,t&&(this._notifyObservers(),this._start());break;case"paused":this._state=e,this._notifyObservers();break;case"canceled":this._error=my(),this._state=e,this._notifyObservers();break;case"error":this._state=e,this._notifyObservers();break;case"success":this._state=e,this._notifyObservers();break}}completeTransitions_(){switch(this._state){case"pausing":this._transition("paused");break;case"canceling":this._transition("canceled");break;case"running":this._start();break}}get snapshot(){const e=ou(this._state);return{bytesTransferred:this._transferred,totalBytes:this._blob.size(),state:e,metadata:this._metadata,task:this,ref:this._ref}}on(e,t,r,s){const i=new LS(t||void 0,r||void 0,s||void 0);return this._addObserver(i),()=>{this._removeObserver(i)}}then(e,t){return this._promise.then(e,t)}catch(e){return this.then(null,e)}_addObserver(e){this._observers.push(e),this._notifyObserver(e)}_removeObserver(e){const t=this._observers.indexOf(e);t!==-1&&this._observers.splice(t,1)}_notifyObservers(){this._finishPromise(),this._observers.slice().forEach(t=>{this._notifyObserver(t)})}_finishPromise(){if(this._resolve!==void 0){let e=!0;switch(ou(this._state)){case Qe.SUCCESS:Cr(this._resolve.bind(null,this.snapshot))();break;case Qe.CANCELED:case Qe.ERROR:const t=this._reject;Cr(t.bind(null,this._error))();break;default:e=!1;break}e&&(this._resolve=void 0,this._reject=void 0)}}_notifyObserver(e){switch(ou(this._state)){case Qe.RUNNING:case Qe.PAUSED:e.next&&Cr(e.next.bind(e,this.snapshot))();break;case Qe.SUCCESS:e.complete&&Cr(e.complete.bind(e))();break;case Qe.CANCELED:case Qe.ERROR:e.error&&Cr(e.error.bind(e,this._error))();break;default:e.error&&Cr(e.error.bind(e,this._error))()}}resume(){const e=this._state==="paused"||this._state==="pausing";return e&&this._transition("running"),e}pause(){const e=this._state==="running";return e&&this._transition("pausing"),e}cancel(){const e=this._state==="running"||this._state==="pausing";return e&&this._transition("canceling"),e}}/**
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
 */class hr{constructor(e,t){this._service=e,t instanceof He?this._location=t:this._location=He.makeFromUrl(t,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,t){return new hr(e,t)}get root(){const e=new He(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return Ay(this._location.path)}get storage(){return this._service}get parent(){const e=_S(this._location.path);if(e===null)return null;const t=new He(this._location.bucket,e);return new hr(this._service,t)}_throwIfRoot(e){if(this._location.path==="")throw yy(e)}}function jS(n,e){n._throwIfRoot("getBytes");const t=Sy(n.storage,n._location,e);return n.storage.makeRequestWithTokens(t,BS).then(r=>e!==void 0?r.slice(0,e):r)}function HS(n,e){n._throwIfRoot("getBlob");const t=Sy(n.storage,n._location,e);return n.storage.makeRequestWithTokens(t,$S).then(r=>e!==void 0?r.slice(0,e):r)}function Ny(n,e,t){n._throwIfRoot("uploadBytes");const r=Cy(n.storage,n._location,Zi(),new kt(e,!0),t);return n.storage.makeRequestWithTokens(r,wt).then(s=>({metadata:s,ref:n}))}function GS(n,e,t){return n._throwIfRoot("uploadBytesResumable"),new ky(n,new kt(e),t)}function zS(n,e,t=_t.RAW,r){n._throwIfRoot("uploadString");const s=fh(t,e),i={...r};return i.contentType==null&&s.contentType!=null&&(i.contentType=s.contentType),Ny(n,s.data,i)}function WS(n){const e={prefixes:[],items:[]};return Dy(n,e).then(()=>e)}async function Dy(n,e,t){const s=await Vy(n,{pageToken:t});e.prefixes.push(...s.prefixes),e.items.push(...s.items),s.nextPageToken!=null&&await Dy(n,e,s.nextPageToken)}function Vy(n,e){e!=null&&typeof e.maxResults=="number"&&Yu("options.maxResults",1,1e3,e.maxResults);const t=e||{},r=PS(n.storage,n._location,"/",t.pageToken,t.maxResults);return n.storage.makeRequestWithTokens(r,wt)}function KS(n){n._throwIfRoot("getMetadata");const e=by(n.storage,n._location,Zi());return n.storage.makeRequestWithTokens(e,wt)}function QS(n,e){n._throwIfRoot("updateMetadata");const t=kS(n.storage,n._location,e,Zi());return n.storage.makeRequestWithTokens(t,wt)}function JS(n){n._throwIfRoot("getDownloadURL");const e=CS(n.storage,n._location,Zi());return n.storage.makeRequestWithTokens(e,wt).then(t=>{if(t===null)throw Qb();return t})}function YS(n){n._throwIfRoot("deleteObject");const e=NS(n.storage,n._location);return n.storage.makeRequestWithTokens(e,wt)}function Oy(n,e){const t=yS(n._location.path,e),r=new He(n._location.bucket,t);return new hr(n.storage,r)}/**
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
 */function XS(n){return/^[A-Za-z]+:\/\//.test(n)}function ZS(n,e){return new hr(n,e)}function xy(n,e){if(n instanceof yh){const t=n;if(t._bucket==null)throw Wb();const r=new hr(t,t._bucket);return e!=null?xy(r,e):r}else return e!==void 0?Oy(n,e):n}function eP(n,e){if(e&&XS(e)){if(n instanceof yh)return ZS(n,e);throw _a("To use ref(service, url), the first argument must be a Storage instance.")}else return xy(n,e)}function xp(n,e){const t=e==null?void 0:e[fy];return t==null?null:He.makeFromBucketSpec(t,n)}function tP(n,e,t,r={}){n.host=`${e}:${t}`;const s=At(e);s&&(Mi(`https://${n.host}/b`),Pa("Storage",!0)),n._isUsingEmulator=!0,n._protocol=s?"https":"http";const{mockUserToken:i}=r;i&&(n._overrideAuthToken=typeof i=="string"?i:Dm(i,n.app.options.projectId))}class yh{constructor(e,t,r,s,i,o=!1){this.app=e,this._authProvider=t,this._appCheckProvider=r,this._url=s,this._firebaseVersion=i,this._isUsingEmulator=o,this._bucket=null,this._host=dy,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=Lb,this._maxUploadRetryTime=Ub,this._requests=new Set,s!=null?this._bucket=He.makeFromBucketSpec(s,this._host):this._bucket=xp(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=He.makeFromBucketSpec(this._url,e):this._bucket=xp(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){Yu("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){Yu("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const t=await e.getToken();if(t!==null)return t.accessToken}return null}async _getAppCheckToken(){if(ye(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new hr(this,e)}_makeRequest(e,t,r,s,i=!0){if(this._deleted)return new Yb(_y());{const o=cS(e,this._appId,r,s,t,this._firebaseVersion,i,this._isUsingEmulator);return this._requests.add(o),o.getPromise().then(()=>this._requests.delete(o),()=>this._requests.delete(o)),o}}async makeRequestWithTokens(e,t){const[r,s]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,t,r,s).getPromise()}}const Mp="@firebase/storage",Lp="0.14.0";/**
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
 */const My="storage";/**
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
 */function nP(n,e){return n=q(n),jS(n,e)}function rP(n,e,t){return n=q(n),Ny(n,e,t)}function sP(n,e,t,r){return n=q(n),zS(n,e,t,r)}function iP(n,e,t){return n=q(n),GS(n,e,t)}function oP(n){return n=q(n),KS(n)}function aP(n,e){return n=q(n),QS(n,e)}function cP(n,e){return n=q(n),Vy(n,e)}function uP(n){return n=q(n),WS(n)}function lP(n){return n=q(n),JS(n)}function hP(n){return n=q(n),YS(n)}function dP(n,e){return n=q(n),eP(n,e)}function fP(n,e){return Oy(n,e)}function pP(n=Ui(),e){n=q(n);const r=Ut(n,My).getImmediate({identifier:e}),s=Cm("storage");return s&&Ly(r,...s),r}function Ly(n,e,t,r={}){tP(n,e,t,r)}/**
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
 */function mP(n,e){return n=q(n),HS(n,e)}function gP(n,e){throw new Error("getStream() is only supported by NodeJS builds")}function _P(n,{instanceIdentifier:e}){const t=n.getProvider("app").getImmediate(),r=n.getProvider("auth-internal"),s=n.getProvider("app-check-internal");return new yh(t,r,s,e,gr)}function yP(){rt(new Ye(My,_P,"PUBLIC").setMultipleInstances(!0)),Fe(Mp,Lp,""),Fe(Mp,Lp,"esm2020")}yP();const kV=Object.freeze(Object.defineProperty({__proto__:null,StorageError:pe,get StorageErrorCode(){return ce},StringFormat:_t,_FbsBlob:kt,_Location:He,_TaskEvent:MS,_TaskState:Qe,_UploadTask:ky,_dataFromString:fh,_getChild:fP,_invalidArgument:_a,_invalidRootOperation:yy,connectStorageEmulator:Ly,deleteObject:hP,getBlob:mP,getBytes:nP,getDownloadURL:lP,getMetadata:oP,getStorage:pP,getStream:gP,list:cP,listAll:uP,ref:dP,updateMetadata:aP,uploadBytes:rP,uploadBytesResumable:iP,uploadString:sP},Symbol.toStringTag,{value:"Module"}));function Uy(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const IP=Uy,Fy=new Vn("auth","Firebase",Uy());/**
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
 */const Ia=new Ca("@firebase/auth");function EP(n,...e){Ia.logLevel<=X.WARN&&Ia.warn(`Auth (${gr}): ${n}`,...e)}function zo(n,...e){Ia.logLevel<=X.ERROR&&Ia.error(`Auth (${gr}): ${n}`,...e)}/**
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
 */function yt(n,...e){throw Eh(n,...e)}function nt(n,...e){return Eh(n,...e)}function Ih(n,e,t){const r={...IP(),[e]:t};return new Vn("auth","Firebase",r).create(e,{appName:n.name})}function Je(n){return Ih(n,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function sc(n,e,t){const r=t;if(!(e instanceof r))throw r.name!==e.constructor.name&&yt(n,"argument-error"),Ih(n,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function Eh(n,...e){if(typeof n!="string"){const t=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=n.name),n._errorFactory.create(t,...r)}return Fy.create(n,...e)}function M(n,e,...t){if(!n)throw Eh(e,...t)}function $t(n){const e="INTERNAL ASSERTION FAILED: "+n;throw zo(e),new Error(e)}function Qt(n,e){n||$t(e)}/**
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
 */function Ni(){var n;return typeof self<"u"&&((n=self.location)==null?void 0:n.href)||""}function wh(){return Up()==="http:"||Up()==="https:"}function Up(){var n;return typeof self<"u"&&((n=self.location)==null?void 0:n.protocol)||null}/**
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
 */function wP(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(wh()||aw()||"connection"in navigator)?navigator.onLine:!0}function TP(){if(typeof navigator>"u")return null;const n=navigator;return n.languages&&n.languages[0]||n.language||null}/**
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
 */class to{constructor(e,t){this.shortDelay=e,this.longDelay=t,Qt(t>e,"Short delay should be less than long delay!"),this.isMobile=iw()||cw()}get(){return wP()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
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
 */function Th(n,e){Qt(n.emulator,"Emulator should always be set here");const{url:t}=n.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
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
 */class By{static initialize(e,t,r){this.fetchImpl=e,t&&(this.headersImpl=t),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;$t("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;$t("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;$t("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
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
 */const vP={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
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
 */const AP=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],RP=new to(3e4,6e4);function ke(n,e){return n.tenantId&&!e.tenantId?{...e,tenantId:n.tenantId}:e}async function Ne(n,e,t,r,s={}){return qy(n,s,async()=>{let i={},o={};r&&(e==="GET"?o=r:i={body:JSON.stringify(r)});const c=ls({key:n.config.apiKey,...o}).slice(1),u=await n._getAdditionalHeaders();u["Content-Type"]="application/json",n.languageCode&&(u["X-Firebase-Locale"]=n.languageCode);const l={method:e,headers:u,...i};return ow()||(l.referrerPolicy="no-referrer"),n.emulatorConfig&&At(n.emulatorConfig.host)&&(l.credentials="include"),By.fetch()(await $y(n,n.config.apiHost,t,c),l)})}async function qy(n,e,t){n._canInitEmulator=!1;const r={...vP,...e};try{const s=new SP(n),i=await Promise.race([t(),s.promise]);s.clearNetworkTimeout();const o=await i.json();if("needConfirmation"in o)throw Xs(n,"account-exists-with-different-credential",o);if(i.ok&&!("errorMessage"in o))return o;{const c=i.ok?o.errorMessage:o.error.message,[u,l]=c.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw Xs(n,"credential-already-in-use",o);if(u==="EMAIL_EXISTS")throw Xs(n,"email-already-in-use",o);if(u==="USER_DISABLED")throw Xs(n,"user-disabled",o);const d=r[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(l)throw Ih(n,d,l);yt(n,d)}}catch(s){if(s instanceof It)throw s;yt(n,"network-request-failed",{message:String(s)})}}async function tn(n,e,t,r,s={}){const i=await Ne(n,e,t,r,s);return"mfaPendingCredential"in i&&yt(n,"multi-factor-auth-required",{_serverResponse:i}),i}async function $y(n,e,t,r){const s=`${e}${t}?${r}`,i=n,o=i.config.emulator?Th(n.config,s):`${n.config.apiScheme}://${s}`;return AP.includes(t)&&(await i._persistenceManagerAvailable,i._getPersistenceType()==="COOKIE")?i._getPersistence()._getFinalTarget(o).toString():o}function bP(n){switch(n){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class SP{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,r)=>{this.timer=setTimeout(()=>r(nt(this.auth,"network-request-failed")),RP.get())})}}function Xs(n,e,t){const r={appName:n.name};t.email&&(r.email=t.email),t.phoneNumber&&(r.phoneNumber=t.phoneNumber);const s=nt(n,e,r);return s.customData._tokenResponse=t,s}/**
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
 */function Fp(n){return n!==void 0&&n.getResponse!==void 0}function Bp(n){return n!==void 0&&n.enterprise!==void 0}class jy{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return bP(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}/**
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
 */async function PP(n){return(await Ne(n,"GET","/v1/recaptchaParams")).recaptchaSiteKey||""}async function Hy(n,e){return Ne(n,"GET","/v2/recaptchaConfig",ke(n,e))}/**
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
 */async function CP(n,e){return Ne(n,"POST","/v1/accounts:delete",e)}async function kP(n,e){return Ne(n,"POST","/v1/accounts:update",e)}async function Ea(n,e){return Ne(n,"POST","/v1/accounts:lookup",e)}/**
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
 */function li(n){if(n)try{const e=new Date(Number(n));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function NP(n,e=!1){const t=q(n),r=await t.getIdToken(e),s=ic(r);M(s&&s.exp&&s.auth_time&&s.iat,t.auth,"internal-error");const i=typeof s.firebase=="object"?s.firebase:void 0,o=i==null?void 0:i.sign_in_provider;return{claims:s,token:r,authTime:li(au(s.auth_time)),issuedAtTime:li(au(s.iat)),expirationTime:li(au(s.exp)),signInProvider:o||null,signInSecondFactor:(i==null?void 0:i.sign_in_second_factor)||null}}function au(n){return Number(n)*1e3}function ic(n){const[e,t,r]=n.split(".");if(e===void 0||t===void 0||r===void 0)return zo("JWT malformed, contained fewer than 3 sections"),null;try{const s=Sm(t);return s?JSON.parse(s):(zo("Failed to decode base64 JWT payload"),null)}catch(s){return zo("Caught error parsing JWT payload as JSON",s==null?void 0:s.toString()),null}}function qp(n){const e=ic(n);return M(e,"internal-error"),M(typeof e.exp<"u","internal-error"),M(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
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
 */async function dr(n,e,t=!1){if(t)return e;try{return await e}catch(r){throw r instanceof It&&DP(r)&&n.auth.currentUser===n&&await n.auth.signOut(),r}}function DP({code:n}){return n==="auth/user-disabled"||n==="auth/user-token-expired"}/**
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
 */class VP{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const r=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,r)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
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
 */class Xu{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=li(this.lastLoginAt),this.creationTime=li(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function Di(n){var p;const e=n.auth,t=await n.getIdToken(),r=await dr(n,Ea(e,{idToken:t}));M(r==null?void 0:r.users.length,e,"internal-error");const s=r.users[0];n._notifyReloadListener(s);const i=(p=s.providerUserInfo)!=null&&p.length?zy(s.providerUserInfo):[],o=OP(n.providerData,i),c=n.isAnonymous,u=!(n.email&&s.passwordHash)&&!(o!=null&&o.length),l=c?u:!1,d={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:o,metadata:new Xu(s.createdAt,s.lastLoginAt),isAnonymous:l};Object.assign(n,d)}async function Gy(n){const e=q(n);await Di(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function OP(n,e){return[...n.filter(r=>!e.some(s=>s.providerId===r.providerId)),...e]}function zy(n){return n.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
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
 */async function xP(n,e){const t=await qy(n,{},async()=>{const r=ls({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:s,apiKey:i}=n.config,o=await $y(n,s,"/v1/token",`key=${i}`),c=await n._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const u={method:"POST",headers:c,body:r};return n.emulatorConfig&&At(n.emulatorConfig.host)&&(u.credentials="include"),By.fetch()(o,u)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function MP(n,e){return Ne(n,"POST","/v2/accounts:revokeToken",ke(n,e))}/**
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
 */class Br{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){M(e.idToken,"internal-error"),M(typeof e.idToken<"u","internal-error"),M(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):qp(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){M(e.length!==0,"internal-error");const t=qp(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(M(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:r,refreshToken:s,expiresIn:i}=await xP(e,t);this.updateTokensAndExpiration(r,s,Number(i))}updateTokensAndExpiration(e,t,r){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,t){const{refreshToken:r,accessToken:s,expirationTime:i}=t,o=new Br;return r&&(M(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),s&&(M(typeof s=="string","internal-error",{appName:e}),o.accessToken=s),i&&(M(typeof i=="number","internal-error",{appName:e}),o.expirationTime=i),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Br,this.toJSON())}_performRefresh(){return $t("not implemented")}}/**
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
 */function dn(n,e){M(typeof n=="string"||typeof n>"u","internal-error",{appName:e})}class Tt{constructor({uid:e,auth:t,stsTokenManager:r,...s}){this.providerId="firebase",this.proactiveRefresh=new VP(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new Xu(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const t=await dr(this,this.stsTokenManager.getToken(this.auth,e));return M(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return NP(this,e)}reload(){return Gy(this)}_assign(e){this!==e&&(M(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new Tt({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){M(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),t&&await Di(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(ye(this.auth.app))return Promise.reject(Je(this.auth));const e=await this.getIdToken();return await dr(this,CP(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const r=t.displayName??void 0,s=t.email??void 0,i=t.phoneNumber??void 0,o=t.photoURL??void 0,c=t.tenantId??void 0,u=t._redirectEventId??void 0,l=t.createdAt??void 0,d=t.lastLoginAt??void 0,{uid:p,emailVerified:m,isAnonymous:T,providerData:C,stsTokenManager:N}=t;M(p&&N,e,"internal-error");const k=Br.fromJSON(this.name,N);M(typeof p=="string",e,"internal-error"),dn(r,e.name),dn(s,e.name),M(typeof m=="boolean",e,"internal-error"),M(typeof T=="boolean",e,"internal-error"),dn(i,e.name),dn(o,e.name),dn(c,e.name),dn(u,e.name),dn(l,e.name),dn(d,e.name);const H=new Tt({uid:p,auth:e,email:s,emailVerified:m,displayName:r,isAnonymous:T,photoURL:o,phoneNumber:i,tenantId:c,stsTokenManager:k,createdAt:l,lastLoginAt:d});return C&&Array.isArray(C)&&(H.providerData=C.map($=>({...$}))),u&&(H._redirectEventId=u),H}static async _fromIdTokenResponse(e,t,r=!1){const s=new Br;s.updateFromServerResponse(t);const i=new Tt({uid:t.localId,auth:e,stsTokenManager:s,isAnonymous:r});return await Di(i),i}static async _fromGetAccountInfoResponse(e,t,r){const s=t.users[0];M(s.localId!==void 0,"internal-error");const i=s.providerUserInfo!==void 0?zy(s.providerUserInfo):[],o=!(s.email&&s.passwordHash)&&!(i!=null&&i.length),c=new Br;c.updateFromIdToken(r);const u=new Tt({uid:s.localId,auth:e,stsTokenManager:c,isAnonymous:o}),l={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:i,metadata:new Xu(s.createdAt,s.lastLoginAt),isAnonymous:!(s.email&&s.passwordHash)&&!(i!=null&&i.length)};return Object.assign(u,l),u}}/**
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
 */const $p=new Map;function jt(n){Qt(n instanceof Function,"Expected a class definition");let e=$p.get(n);return e?(Qt(e instanceof n,"Instance stored in cache mismatched with class"),e):(e=new n,$p.set(n,e),e)}/**
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
 */class Wy{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}Wy.type="NONE";const Zu=Wy;/**
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
 */function Wo(n,e,t){return`firebase:${n}:${e}:${t}`}class qr{constructor(e,t,r){this.persistence=e,this.auth=t,this.userKey=r;const{config:s,name:i}=this.auth;this.fullUserKey=Wo(this.userKey,s.apiKey,i),this.fullPersistenceKey=Wo("persistence",s.apiKey,i),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await Ea(this.auth,{idToken:e}).catch(()=>{});return t?Tt._fromGetAccountInfoResponse(this.auth,t,e):null}return Tt._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,r="authUser"){if(!t.length)return new qr(jt(Zu),e,r);const s=(await Promise.all(t.map(async l=>{if(await l._isAvailable())return l}))).filter(l=>l);let i=s[0]||jt(Zu);const o=Wo(r,e.config.apiKey,e.name);let c=null;for(const l of t)try{const d=await l._get(o);if(d){let p;if(typeof d=="string"){const m=await Ea(e,{idToken:d}).catch(()=>{});if(!m)break;p=await Tt._fromGetAccountInfoResponse(e,m,d)}else p=Tt._fromJSON(e,d);l!==i&&(c=p),i=l;break}}catch{}const u=s.filter(l=>l._shouldAllowMigration);return!i._shouldAllowMigration||!u.length?new qr(i,e,r):(i=u[0],c&&await i._set(o,c.toJSON()),await Promise.all(t.map(async l=>{if(l!==i)try{await l._remove(o)}catch{}})),new qr(i,e,r))}}/**
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
 */function jp(n){const e=n.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Yy(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Ky(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Zy(e))return"Blackberry";if(eI(e))return"Webos";if(Qy(e))return"Safari";if((e.includes("chrome/")||Jy(e))&&!e.includes("edge/"))return"Chrome";if(Xy(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=n.match(t);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function Ky(n=Pe()){return/firefox\//i.test(n)}function Qy(n=Pe()){const e=n.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Jy(n=Pe()){return/crios\//i.test(n)}function Yy(n=Pe()){return/iemobile/i.test(n)}function Xy(n=Pe()){return/android/i.test(n)}function Zy(n=Pe()){return/blackberry/i.test(n)}function eI(n=Pe()){return/webos/i.test(n)}function vh(n=Pe()){return/iphone|ipad|ipod/i.test(n)||/macintosh/i.test(n)&&/mobile/i.test(n)}function LP(n=Pe()){var e;return vh(n)&&!!((e=window.navigator)!=null&&e.standalone)}function UP(){return uw()&&document.documentMode===10}function tI(n=Pe()){return vh(n)||Xy(n)||eI(n)||Zy(n)||/windows phone/i.test(n)||Yy(n)}/**
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
 */function nI(n,e=[]){let t;switch(n){case"Browser":t=jp(Pe());break;case"Worker":t=`${jp(Pe())}-${n}`;break;default:t=n}const r=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${gr}/${r}`}/**
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
 */class FP{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const r=i=>new Promise((o,c)=>{try{const u=e(i);o(u)}catch(u){c(u)}});r.onAbort=t,this.queue.push(r);const s=this.queue.length-1;return()=>{this.queue[s]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const r of this.queue)await r(e),r.onAbort&&t.push(r.onAbort)}catch(r){t.reverse();for(const s of t)try{s()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
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
 */async function BP(n,e={}){return Ne(n,"GET","/v2/passwordPolicy",ke(n,e))}/**
 * @license
 * Copyright 2023 Google LLC
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
 */const qP=6;class $P{constructor(e){var r;const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??qP,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((r=e.allowedNonAlphanumericCharacters)==null?void 0:r.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const r=this.customStrengthOptions.minPasswordLength,s=this.customStrengthOptions.maxPasswordLength;r&&(t.meetsMinPasswordLength=e.length>=r),s&&(t.meetsMaxPasswordLength=e.length<=s)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let r;for(let s=0;s<e.length;s++)r=e.charAt(s),this.updatePasswordCharacterOptionsStatuses(t,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,t,r,s,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=s)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}/**
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
 */class jP{constructor(e,t,r,s){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=r,this.config=s,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Hp(this),this.idTokenSubscription=new Hp(this),this.beforeStateQueue=new FP(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Fy,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=s.sdkClientVersion,this._persistenceManagerAvailable=new Promise(i=>this._resolvePersistenceManagerAvailable=i)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=jt(t)),this._initializationPromise=this.queue(async()=>{var r,s,i;if(!this._deleted&&(this.persistenceManager=await qr.create(this,e),(r=this._resolvePersistenceManagerAvailable)==null||r.call(this),!this._deleted)){if((s=this._popupRedirectResolver)!=null&&s._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((i=this.currentUser)==null?void 0:i.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await Ea(this,{idToken:e}),r=await Tt._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(r)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var i;if(ye(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let r=t,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(i=this.redirectUser)==null?void 0:i._redirectEventId,c=r==null?void 0:r._redirectEventId,u=await this.tryRedirectSignIn(e);(!o||o===c)&&(u!=null&&u.user)&&(r=u.user,s=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(r)}catch(o){r=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return M(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Di(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=TP()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(ye(this.app))return Promise.reject(Je(this));const t=e?q(e):null;return t&&M(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&M(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return ye(this.app)?Promise.reject(Je(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return ye(this.app)?Promise.reject(Je(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(jt(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await BP(this),t=new $P(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new Vn("auth","Firebase",e())}onAuthStateChanged(e,t,r){return this.registerStateListener(this.authStateSubscription,e,t,r)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,r){return this.registerStateListener(this.idTokenSubscription,e,t,r)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(r.tenantId=this.tenantId),await MP(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,t){const r=await this.getOrInitRedirectPersistenceManager(t);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&jt(e)||this._popupRedirectResolver;M(t,this,"argument-error"),this.redirectPersistenceManager=await qr.create(this,[jt(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,r;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)==null?void 0:t._redirectEventId)===e?this._currentUser:((r=this.redirectUser)==null?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((t=this.currentUser)==null?void 0:t.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,r,s){if(this._deleted)return()=>{};const i=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(M(c,this,"internal-error"),c.then(()=>{o||i(this.currentUser)}),typeof t=="function"){const u=e.addObserver(t,r,s);return()=>{o=!0,u()}}else{const u=e.addObserver(t);return()=>{o=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return M(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=nI(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var s;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await((s=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:s.getHeartbeatsHeader());t&&(e["X-Firebase-Client"]=t);const r=await this._getAppCheckToken();return r&&(e["X-Firebase-AppCheck"]=r),e}async _getAppCheckToken(){var t;if(ye(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:t.getToken());return e!=null&&e.error&&EP(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function Le(n){return q(n)}class Hp{constructor(e){this.auth=e,this.observer=null,this.addObserver=mw(t=>this.observer=t)}get next(){return M(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
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
 */let no={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function HP(n){no=n}function Ah(n){return no.loadJS(n)}function GP(){return no.recaptchaV2Script}function zP(){return no.recaptchaEnterpriseScript}function WP(){return no.gapiScript}function rI(n){return`__${n}${Math.floor(Math.random()*1e6)}`}/**
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
 */const KP=500,QP=6e4,ko=1e12;class JP{constructor(e){this.auth=e,this.counter=ko,this._widgets=new Map}render(e,t){const r=this.counter;return this._widgets.set(r,new ZP(e,this.auth.name,t||{})),this.counter++,r}reset(e){var r;const t=e||ko;(r=this._widgets.get(t))==null||r.delete(),this._widgets.delete(t)}getResponse(e){var r;const t=e||ko;return((r=this._widgets.get(t))==null?void 0:r.getResponse())||""}async execute(e){var r;const t=e||ko;return(r=this._widgets.get(t))==null||r.execute(),""}}class YP{constructor(){this.enterprise=new XP}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class XP{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class ZP{constructor(e,t,r){this.params=r,this.timerId=null,this.deleted=!1,this.responseToken=null,this.clickHandler=()=>{this.execute()};const s=typeof e=="string"?document.getElementById(e):e;M(s,"argument-error",{appName:t}),this.container=s,this.isVisible=this.params.size!=="invisible",this.isVisible?this.execute():this.container.addEventListener("click",this.clickHandler)}getResponse(){return this.checkIfDeleted(),this.responseToken}delete(){this.checkIfDeleted(),this.deleted=!0,this.timerId&&(clearTimeout(this.timerId),this.timerId=null),this.container.removeEventListener("click",this.clickHandler)}execute(){this.checkIfDeleted(),!this.timerId&&(this.timerId=window.setTimeout(()=>{this.responseToken=eC(50);const{callback:e,"expired-callback":t}=this.params;if(e)try{e(this.responseToken)}catch{}this.timerId=window.setTimeout(()=>{if(this.timerId=null,this.responseToken=null,t)try{t()}catch{}this.isVisible&&this.execute()},QP)},KP))}checkIfDeleted(){if(this.deleted)throw new Error("reCAPTCHA mock was already deleted!")}}function eC(n){const e=[],t="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let r=0;r<n;r++)e.push(t.charAt(Math.floor(Math.random()*t.length)));return e.join("")}const tC="recaptcha-enterprise",hi="NO_RECAPTCHA";class sI{constructor(e){this.type=tC,this.auth=Le(e)}async verify(e="verify",t=!1){async function r(i){if(!t){if(i.tenantId==null&&i._agentRecaptchaConfig!=null)return i._agentRecaptchaConfig.siteKey;if(i.tenantId!=null&&i._tenantRecaptchaConfigs[i.tenantId]!==void 0)return i._tenantRecaptchaConfigs[i.tenantId].siteKey}return new Promise(async(o,c)=>{Hy(i,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(u=>{if(u.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{const l=new jy(u);return i.tenantId==null?i._agentRecaptchaConfig=l:i._tenantRecaptchaConfigs[i.tenantId]=l,o(l.siteKey)}}).catch(u=>{c(u)})})}function s(i,o,c){const u=window.grecaptcha;Bp(u)?u.enterprise.ready(()=>{u.enterprise.execute(i,{action:e}).then(l=>{o(l)}).catch(()=>{o(hi)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new YP().execute("siteKey",{action:"verify"}):new Promise((i,o)=>{r(this.auth).then(c=>{if(!t&&Bp(window.grecaptcha))s(c,i,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let u=zP();u.length!==0&&(u+=c),Ah(u).then(()=>{s(c,i,o)}).catch(l=>{o(l)})}}).catch(c=>{o(c)})})}}async function Gs(n,e,t,r=!1,s=!1){const i=new sI(n);let o;if(s)o=hi;else try{o=await i.verify(t)}catch{o=await i.verify(t,!0)}const c={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){const u=c.phoneEnrollmentInfo.phoneNumber,l=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:u,recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){const u=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return r?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function bn(n,e,t,r,s){var i,o;if(s==="EMAIL_PASSWORD_PROVIDER")if((i=n._getRecaptchaConfig())!=null&&i.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const c=await Gs(n,e,t,t==="getOobCode");return r(n,c)}else return r(n,e).catch(async c=>{if(c.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const u=await Gs(n,e,t,t==="getOobCode");return r(n,u)}else return Promise.reject(c)});else if(s==="PHONE_PROVIDER")if((o=n._getRecaptchaConfig())!=null&&o.isProviderEnabled("PHONE_PROVIDER")){const c=await Gs(n,e,t);return r(n,c).catch(async u=>{var l;if(((l=n._getRecaptchaConfig())==null?void 0:l.getProviderEnforcementState("PHONE_PROVIDER"))==="AUDIT"&&(u.code==="auth/missing-recaptcha-token"||u.code==="auth/invalid-app-credential")){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${t} flow.`);const d=await Gs(n,e,t,!1,!0);return r(n,d)}return Promise.reject(u)})}else{const c=await Gs(n,e,t,!1,!0);return r(n,c)}else return Promise.reject(s+" provider is not supported.")}async function nC(n){const e=Le(n),t=await Hy(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}),r=new jy(t);e.tenantId==null?e._agentRecaptchaConfig=r:e._tenantRecaptchaConfigs[e.tenantId]=r,r.isAnyProviderEnabled()&&new sI(e).verify()}/**
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
 */function rC(n,e){const t=Ut(n,"auth");if(t.isInitialized()){const s=t.getImmediate(),i=t.getOptions();if(Sn(i,e??{}))return s;yt(s,"already-initialized")}return t.initialize({options:e})}function sC(n,e){const t=(e==null?void 0:e.persistence)||[],r=(Array.isArray(t)?t:[t]).map(jt);e!=null&&e.errorMap&&n._updateErrorMap(e.errorMap),n._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function el(n,e,t){const r=Le(n);M(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const s=!!(t!=null&&t.disableWarnings),i=iI(e),{host:o,port:c}=iC(e),u=c===null?"":`:${c}`,l={url:`${i}//${o}${u}/`},d=Object.freeze({host:o,port:c,protocol:i.replace(":",""),options:Object.freeze({disableWarnings:s})});if(!r._canInitEmulator){M(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),M(Sn(l,r.config.emulator)&&Sn(d,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=l,r.emulatorConfig=d,r.settings.appVerificationDisabledForTesting=!0,At(o)?(Mi(`${i}//${o}${u}`),Pa("Auth",!0)):s||oC()}function iI(n){const e=n.indexOf(":");return e<0?"":n.substr(0,e+1)}function iC(n){const e=iI(n),t=/(\/\/)?([^?#/]+)/.exec(n.substr(e.length));if(!t)return{host:"",port:null};const r=t[2].split("@").pop()||"",s=/^(\[[^\]]+\])(:|$)/.exec(r);if(s){const i=s[1];return{host:i,port:Gp(r.substr(i.length+1))}}else{const[i,o]=r.split(":");return{host:i,port:Gp(o)}}}function Gp(n){if(!n)return null;const e=Number(n);return isNaN(e)?null:e}function oC(){function n(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",n):n())}/**
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
 */class oc{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return $t("not implemented")}_getIdTokenResponse(e){return $t("not implemented")}_linkToIdToken(e,t){return $t("not implemented")}_getReauthenticationResolver(e){return $t("not implemented")}}/**
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
 */async function aC(n,e){return Ne(n,"POST","/v1/accounts:resetPassword",ke(n,e))}async function cC(n,e){return Ne(n,"POST","/v1/accounts:update",e)}async function uC(n,e){return Ne(n,"POST","/v1/accounts:signUp",e)}async function lC(n,e){return Ne(n,"POST","/v1/accounts:update",ke(n,e))}/**
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
 */async function hC(n,e){return tn(n,"POST","/v1/accounts:signInWithPassword",ke(n,e))}async function ac(n,e){return Ne(n,"POST","/v1/accounts:sendOobCode",ke(n,e))}async function dC(n,e){return ac(n,e)}async function fC(n,e){return ac(n,e)}async function pC(n,e){return ac(n,e)}async function mC(n,e){return ac(n,e)}/**
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
 */async function gC(n,e){return tn(n,"POST","/v1/accounts:signInWithEmailLink",ke(n,e))}async function _C(n,e){return tn(n,"POST","/v1/accounts:signInWithEmailLink",ke(n,e))}/**
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
 */class Vi extends oc{constructor(e,t,r,s=null){super("password",r),this._email=e,this._password=t,this._tenantId=s}static _fromEmailAndPassword(e,t){return new Vi(e,t,"password")}static _fromEmailAndCode(e,t,r=null){return new Vi(e,t,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return bn(e,t,"signInWithPassword",hC,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return gC(e,{email:this._email,oobCode:this._password});default:yt(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const r={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return bn(e,r,"signUpPassword",uC,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return _C(e,{idToken:t,email:this._email,oobCode:this._password});default:yt(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
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
 */async function $r(n,e){return tn(n,"POST","/v1/accounts:signInWithIdp",ke(n,e))}/**
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
 */const yC="http://localhost";class Mt extends oc{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Mt(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):yt("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:s,...i}=t;if(!r||!s)return null;const o=new Mt(r,s);return o.idToken=i.idToken||void 0,o.accessToken=i.accessToken||void 0,o.secret=i.secret,o.nonce=i.nonce,o.pendingToken=i.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return $r(e,t)}_linkToIdToken(e,t){const r=this.buildRequest();return r.idToken=t,$r(e,r)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,$r(e,t)}buildRequest(){const e={requestUri:yC,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=ls(t)}return e}}/**
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
 */async function zp(n,e){return Ne(n,"POST","/v1/accounts:sendVerificationCode",ke(n,e))}async function IC(n,e){return tn(n,"POST","/v1/accounts:signInWithPhoneNumber",ke(n,e))}async function EC(n,e){const t=await tn(n,"POST","/v1/accounts:signInWithPhoneNumber",ke(n,e));if(t.temporaryProof)throw Xs(n,"account-exists-with-different-credential",t);return t}const wC={USER_NOT_FOUND:"user-not-found"};async function TC(n,e){const t={...e,operation:"REAUTH"};return tn(n,"POST","/v1/accounts:signInWithPhoneNumber",ke(n,t),wC)}/**
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
 */class di extends oc{constructor(e){super("phone","phone"),this.params=e}static _fromVerification(e,t){return new di({verificationId:e,verificationCode:t})}static _fromTokenResponse(e,t){return new di({phoneNumber:e,temporaryProof:t})}_getIdTokenResponse(e){return IC(e,this._makeVerificationRequest())}_linkToIdToken(e,t){return EC(e,{idToken:t,...this._makeVerificationRequest()})}_getReauthenticationResolver(e){return TC(e,this._makeVerificationRequest())}_makeVerificationRequest(){const{temporaryProof:e,phoneNumber:t,verificationId:r,verificationCode:s}=this.params;return e&&t?{temporaryProof:e,phoneNumber:t}:{sessionInfo:r,code:s}}toJSON(){const e={providerId:this.providerId};return this.params.phoneNumber&&(e.phoneNumber=this.params.phoneNumber),this.params.temporaryProof&&(e.temporaryProof=this.params.temporaryProof),this.params.verificationCode&&(e.verificationCode=this.params.verificationCode),this.params.verificationId&&(e.verificationId=this.params.verificationId),e}static fromJSON(e){typeof e=="string"&&(e=JSON.parse(e));const{verificationId:t,verificationCode:r,phoneNumber:s,temporaryProof:i}=e;return!r&&!t&&!s&&!i?null:new di({verificationId:t,verificationCode:r,phoneNumber:s,temporaryProof:i})}}/**
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
 */function vC(n){switch(n){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function AC(n){const e=zs(Ws(n)).link,t=e?zs(Ws(e)).deep_link_id:null,r=zs(Ws(n)).deep_link_id;return(r?zs(Ws(r)).link:null)||r||t||e||n}class cc{constructor(e){const t=zs(Ws(e)),r=t.apiKey??null,s=t.oobCode??null,i=vC(t.mode??null);M(r&&s&&i,"argument-error"),this.apiKey=r,this.operation=i,this.code=s,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=AC(e);try{return new cc(t)}catch{return null}}}/**
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
 */class Jt{constructor(){this.providerId=Jt.PROVIDER_ID}static credential(e,t){return Vi._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const r=cc.parseLink(t);return M(r,"argument-error"),Vi._fromEmailAndCode(e,r.code,r.tenantId)}}Jt.PROVIDER_ID="password";Jt.EMAIL_PASSWORD_SIGN_IN_METHOD="password";Jt.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
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
 */class Es{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class ws extends Es{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}class _e extends ws{static credentialFromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;return M("providerId"in t&&"signInMethod"in t,"argument-error"),Mt._fromParams(t)}credential(e){return this._credential({...e,nonce:e.rawNonce})}_credential(e){return M(e.idToken||e.accessToken,"argument-error"),Mt._fromParams({...e,providerId:this.providerId,signInMethod:this.providerId})}static credentialFromResult(e){return _e.oauthCredentialFromTaggedObject(e)}static credentialFromError(e){return _e.oauthCredentialFromTaggedObject(e.customData||{})}static oauthCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:r,oauthTokenSecret:s,pendingToken:i,nonce:o,providerId:c}=e;if(!r&&!s&&!t&&!i||!c)return null;try{return new _e(c)._credential({idToken:t,accessToken:r,nonce:o,pendingToken:i})}catch{return null}}}/**
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
 */class ft extends ws{constructor(){super("facebook.com")}static credential(e){return Mt._fromParams({providerId:ft.PROVIDER_ID,signInMethod:ft.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return ft.credentialFromTaggedObject(e)}static credentialFromError(e){return ft.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return ft.credential(e.oauthAccessToken)}catch{return null}}}ft.FACEBOOK_SIGN_IN_METHOD="facebook.com";ft.PROVIDER_ID="facebook.com";/**
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
 */class pt extends ws{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Mt._fromParams({providerId:pt.PROVIDER_ID,signInMethod:pt.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return pt.credentialFromTaggedObject(e)}static credentialFromError(e){return pt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:r}=e;if(!t&&!r)return null;try{return pt.credential(t,r)}catch{return null}}}pt.GOOGLE_SIGN_IN_METHOD="google.com";pt.PROVIDER_ID="google.com";/**
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
 */class mt extends ws{constructor(){super("github.com")}static credential(e){return Mt._fromParams({providerId:mt.PROVIDER_ID,signInMethod:mt.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return mt.credentialFromTaggedObject(e)}static credentialFromError(e){return mt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return mt.credential(e.oauthAccessToken)}catch{return null}}}mt.GITHUB_SIGN_IN_METHOD="github.com";mt.PROVIDER_ID="github.com";/**
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
 */class gt extends ws{constructor(){super("twitter.com")}static credential(e,t){return Mt._fromParams({providerId:gt.PROVIDER_ID,signInMethod:gt.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return gt.credentialFromTaggedObject(e)}static credentialFromError(e){return gt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:r}=e;if(!t||!r)return null;try{return gt.credential(t,r)}catch{return null}}}gt.TWITTER_SIGN_IN_METHOD="twitter.com";gt.PROVIDER_ID="twitter.com";/**
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
 */async function oI(n,e){return tn(n,"POST","/v1/accounts:signUp",ke(n,e))}/**
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
 */class Lt{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,r,s=!1){const i=await Tt._fromIdTokenResponse(e,r,s),o=Wp(r);return new Lt({user:i,providerId:o,_tokenResponse:r,operationType:t})}static async _forOperation(e,t,r){await e._updateTokensIfNecessary(r,!0);const s=Wp(r);return new Lt({user:e,providerId:s,_tokenResponse:r,operationType:t})}}function Wp(n){return n.providerId?n.providerId:"phoneNumber"in n?"phone":null}/**
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
 */async function RC(n){var s;if(ye(n.app))return Promise.reject(Je(n));const e=Le(n);if(await e._initializationPromise,(s=e.currentUser)!=null&&s.isAnonymous)return new Lt({user:e.currentUser,providerId:null,operationType:"signIn"});const t=await oI(e,{returnSecureToken:!0}),r=await Lt._fromIdTokenResponse(e,"signIn",t,!0);return await e._updateCurrentUser(r.user),r}/**
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
 */class wa extends It{constructor(e,t,r,s){super(t.code,t.message),this.operationType=r,this.user=s,Object.setPrototypeOf(this,wa.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,t,r,s){return new wa(e,t,r,s)}}function aI(n,e,t,r){return(e==="reauthenticate"?t._getReauthenticationResolver(n):t._getIdTokenResponse(n)).catch(i=>{throw i.code==="auth/multi-factor-auth-required"?wa._fromErrorAndOperation(n,i,e,r):i})}/**
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
 */function cI(n){return new Set(n.map(({providerId:e})=>e).filter(e=>!!e))}/**
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
 */async function bC(n,e){const t=q(n);await uc(!0,t,e);const{providerUserInfo:r}=await kP(t.auth,{idToken:await t.getIdToken(),deleteProvider:[e]}),s=cI(r||[]);return t.providerData=t.providerData.filter(i=>s.has(i.providerId)),s.has("phone")||(t.phoneNumber=null),await t.auth._persistUserIfCurrent(t),t}async function uI(n,e,t=!1){const r=await dr(n,e._linkToIdToken(n.auth,await n.getIdToken()),t);return Lt._forOperation(n,"link",r)}async function uc(n,e,t){await Di(e);const r=cI(e.providerData),s=n===!1?"provider-already-linked":"no-such-provider";M(r.has(t)===n,e.auth,s)}/**
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
 */async function SC(n,e,t=!1){const{auth:r}=n;if(ye(r.app))return Promise.reject(Je(r));const s="reauthenticate";try{const i=await dr(n,aI(r,s,e,n),t);M(i.idToken,r,"internal-error");const o=ic(i.idToken);M(o,r,"internal-error");const{sub:c}=o;return M(n.uid===c,r,"user-mismatch"),Lt._forOperation(n,s,i)}catch(i){throw(i==null?void 0:i.code)==="auth/user-not-found"&&yt(r,"user-mismatch"),i}}/**
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
 */async function lI(n,e,t=!1){if(ye(n.app))return Promise.reject(Je(n));const r="signIn",s=await aI(n,r,e),i=await Lt._fromIdTokenResponse(n,r,s);return t||await n._updateCurrentUser(i.user),i}async function Rh(n,e){return lI(Le(n),e)}async function hI(n,e){const t=q(n);return await uc(!1,t,e.providerId),uI(t,e)}/**
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
 */async function PC(n,e){return tn(n,"POST","/v1/accounts:signInWithCustomToken",ke(n,e))}/**
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
 */async function CC(n,e){if(ye(n.app))return Promise.reject(Je(n));const t=Le(n),r=await PC(t,{token:e,returnSecureToken:!0}),s=await Lt._fromIdTokenResponse(t,"signIn",r);return await t._updateCurrentUser(s.user),s}/**
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
 */function lc(n,e,t){var r;M(((r=t.url)==null?void 0:r.length)>0,n,"invalid-continue-uri"),M(typeof t.dynamicLinkDomain>"u"||t.dynamicLinkDomain.length>0,n,"invalid-dynamic-link-domain"),M(typeof t.linkDomain>"u"||t.linkDomain.length>0,n,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&(M(t.iOS.bundleId.length>0,n,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&(M(t.android.packageName.length>0,n,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}/**
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
 */async function bh(n){const e=Le(n);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function kC(n,e,t){const r=Le(n),s={requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"};t&&lc(r,s,t),await bn(r,s,"getOobCode",fC,"EMAIL_PASSWORD_PROVIDER")}async function NC(n,e,t){await aC(q(n),{oobCode:e,newPassword:t}).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&bh(n),r})}async function DC(n,e){await lC(q(n),{oobCode:e})}async function VC(n,e,t){if(ye(n.app))return Promise.reject(Je(n));const r=Le(n),o=await bn(r,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",oI,"EMAIL_PASSWORD_PROVIDER").catch(u=>{throw u.code==="auth/password-does-not-meet-requirements"&&bh(n),u}),c=await Lt._fromIdTokenResponse(r,"signIn",o);return await r._updateCurrentUser(c.user),c}function OC(n,e,t){return ye(n.app)?Promise.reject(Je(n)):Rh(q(n),Jt.credential(e,t)).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&bh(n),r})}/**
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
 */async function xC(n,e,t){const r=Le(n),s={requestType:"EMAIL_SIGNIN",email:e,clientType:"CLIENT_TYPE_WEB"};function i(o,c){M(c.handleCodeInApp,r,"argument-error"),c&&lc(r,o,c)}i(s,t),await bn(r,s,"getOobCode",pC,"EMAIL_PASSWORD_PROVIDER")}function MC(n,e){const t=cc.parseLink(e);return(t==null?void 0:t.operation)==="EMAIL_SIGNIN"}async function LC(n,e,t){if(ye(n.app))return Promise.reject(Je(n));const r=q(n),s=Jt.credentialWithLink(e,t||Ni());return M(s._tenantId===(r.tenantId||null),r,"tenant-id-mismatch"),Rh(r,s)}/**
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
 */async function UC(n,e){return Ne(n,"POST","/v1/accounts:createAuthUri",ke(n,e))}/**
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
 */async function FC(n,e){const t=wh()?Ni():"http://localhost",r={identifier:e,continueUri:t},{signinMethods:s}=await UC(q(n),r);return s||[]}async function BC(n,e){const t=q(n),s={requestType:"VERIFY_EMAIL",idToken:await n.getIdToken()};e&&lc(t.auth,s,e);const{email:i}=await dC(t.auth,s);i!==n.email&&await n.reload()}async function qC(n,e,t){const r=q(n),i={requestType:"VERIFY_AND_CHANGE_EMAIL",idToken:await n.getIdToken(),newEmail:e};t&&lc(r.auth,i,t);const{email:o}=await mC(r.auth,i);o!==n.email&&await n.reload()}/**
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
 */async function $C(n,e){return Ne(n,"POST","/v1/accounts:update",e)}/**
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
 */async function jC(n,{displayName:e,photoURL:t}){if(e===void 0&&t===void 0)return;const r=q(n),i={idToken:await r.getIdToken(),displayName:e,photoUrl:t,returnSecureToken:!0},o=await dr(r,$C(r.auth,i));r.displayName=o.displayName||null,r.photoURL=o.photoUrl||null;const c=r.providerData.find(({providerId:u})=>u==="password");c&&(c.displayName=r.displayName,c.photoURL=r.photoURL),await r._updateTokensIfNecessary(o)}function HC(n,e){const t=q(n);return ye(t.auth.app)?Promise.reject(Je(t.auth)):dI(t,e,null)}function GC(n,e){return dI(q(n),null,e)}async function dI(n,e,t){const{auth:r}=n,i={idToken:await n.getIdToken(),returnSecureToken:!0};e&&(i.email=e),t&&(i.password=t);const o=await dr(n,cC(r,i));await n._updateTokensIfNecessary(o,!0)}/**
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
 */function zC(n){var s,i;if(!n)return null;const{providerId:e}=n,t=n.rawUserInfo?JSON.parse(n.rawUserInfo):{},r=n.isNewUser||n.kind==="identitytoolkit#SignupNewUserResponse";if(!e&&(n!=null&&n.idToken)){const o=(i=(s=ic(n.idToken))==null?void 0:s.firebase)==null?void 0:i.sign_in_provider;if(o){const c=o!=="anonymous"&&o!=="custom"?o:null;return new jr(r,c)}}if(!e)return null;switch(e){case"facebook.com":return new WC(r,t);case"github.com":return new KC(r,t);case"google.com":return new QC(r,t);case"twitter.com":return new JC(r,t,n.screenName||null);case"custom":case"anonymous":return new jr(r,null);default:return new jr(r,e,t)}}class jr{constructor(e,t,r={}){this.isNewUser=e,this.providerId=t,this.profile=r}}class fI extends jr{constructor(e,t,r,s){super(e,t,r),this.username=s}}class WC extends jr{constructor(e,t){super(e,"facebook.com",t)}}class KC extends fI{constructor(e,t){super(e,"github.com",t,typeof(t==null?void 0:t.login)=="string"?t==null?void 0:t.login:null)}}class QC extends jr{constructor(e,t){super(e,"google.com",t)}}class JC extends fI{constructor(e,t,r){super(e,"twitter.com",t,r)}}function YC(n){const{user:e,_tokenResponse:t}=n;return e.isAnonymous&&!t?{providerId:null,isNewUser:!1,profile:null}:zC(t)}/**
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
 */function No(n,e){return q(n).setPersistence(e)}function XC(n,e,t,r){return q(n).onIdTokenChanged(e,t,r)}function ZC(n,e,t){return q(n).beforeAuthStateChanged(e,t)}function NV(n,e,t,r){return q(n).onAuthStateChanged(e,t,r)}function DV(n){return q(n).signOut()}function ek(n,e){return Le(n).revokeAccessToken(e)}async function tk(n){return q(n).delete()}/**
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
 */function Kp(n,e){return Ne(n,"POST","/v2/accounts/mfaEnrollment:start",ke(n,e))}const Ta="__sak";/**
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
 */class pI{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(Ta,"1"),this.storage.removeItem(Ta),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
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
 */const nk=1e3,rk=10;class mI extends pI{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=tI(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const r=this.storage.getItem(t),s=this.localCache[t];r!==s&&e(t,s,r)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,u)=>{this.notifyListeners(o,u)});return}const r=e.key;t?this.detachListener():this.stopPolling();const s=()=>{const o=this.storage.getItem(r);!t&&this.localCache[r]===o||this.notifyListeners(r,o)},i=this.storage.getItem(r);UP()&&i!==e.newValue&&e.newValue!==e.oldValue?setTimeout(s,rk):s()}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:r}),!0)})},nk)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}mI.type="LOCAL";const gI=mI;/**
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
 */class _I extends pI{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}_I.type="SESSION";const Sh=_I;/**
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
 */function sk(n){return Promise.all(n.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
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
 */class hc{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(s=>s.isListeningto(e));if(t)return t;const r=new hc(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:r,eventType:s,data:i}=t.data,o=this.handlersMap[s];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:r,eventType:s});const c=Array.from(o).map(async l=>l(t.origin,i)),u=await sk(c);t.ports[0].postMessage({status:"done",eventId:r,eventType:s,response:u})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}hc.receivers=[];/**
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
 */function dc(n="",e=10){let t="";for(let r=0;r<e;r++)t+=Math.floor(Math.random()*10);return n+t}/**
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
 */class ik{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,r=50){const s=typeof MessageChannel<"u"?new MessageChannel:null;if(!s)throw new Error("connection_unavailable");let i,o;return new Promise((c,u)=>{const l=dc("",20);s.port1.start();const d=setTimeout(()=>{u(new Error("unsupported_event"))},r);o={messageChannel:s,onMessage(p){const m=p;if(m.data.eventId===l)switch(m.data.status){case"ack":clearTimeout(d),i=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(i),c(m.data.response);break;default:clearTimeout(d),clearTimeout(i),u(new Error("invalid_response"));break}}},this.handlers.add(o),s.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:l,data:t},[s.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
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
 */function ve(){return window}function ok(n){ve().location.href=n}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */function Ph(){return typeof ve().WorkerGlobalScope<"u"&&typeof ve().importScripts=="function"}async function ak(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function ck(){var n;return((n=navigator==null?void 0:navigator.serviceWorker)==null?void 0:n.controller)||null}function uk(){return Ph()?self:null}/**
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
 */const yI="firebaseLocalStorageDb",lk=1,va="firebaseLocalStorage",II="fbase_key";class ro{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function fc(n,e){return n.transaction([va],e?"readwrite":"readonly").objectStore(va)}function hk(){const n=indexedDB.deleteDatabase(yI);return new ro(n).toPromise()}function tl(){const n=indexedDB.open(yI,lk);return new Promise((e,t)=>{n.addEventListener("error",()=>{t(n.error)}),n.addEventListener("upgradeneeded",()=>{const r=n.result;try{r.createObjectStore(va,{keyPath:II})}catch(s){t(s)}}),n.addEventListener("success",async()=>{const r=n.result;r.objectStoreNames.contains(va)?e(r):(r.close(),await hk(),e(await tl()))})})}async function Qp(n,e,t){const r=fc(n,!0).put({[II]:e,value:t});return new ro(r).toPromise()}async function dk(n,e){const t=fc(n,!1).get(e),r=await new ro(t).toPromise();return r===void 0?null:r.value}function Jp(n,e){const t=fc(n,!0).delete(e);return new ro(t).toPromise()}const fk=800,pk=3;class EI{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await tl(),this.db)}async _withRetries(e){let t=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(t++>pk)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Ph()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=hc._getInstance(uk()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var t,r;if(this.activeServiceWorker=await ak(),!this.activeServiceWorker)return;this.sender=new ik(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(t=e[0])!=null&&t.fulfilled&&(r=e[0])!=null&&r.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||ck()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await tl();return await Qp(e,Ta,"1"),await Jp(e,Ta),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(r=>Qp(r,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(r=>dk(r,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Jp(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(s=>{const i=fc(s,!1).getAll();return new ro(i).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],r=new Set;if(e.length!==0)for(const{fbase_key:s,value:i}of e)r.add(s),JSON.stringify(this.localCache[s])!==JSON.stringify(i)&&(this.notifyListeners(s,i),t.push(s));for(const s of Object.keys(this.localCache))this.localCache[s]&&!r.has(s)&&(this.notifyListeners(s,null),t.push(s));return t}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),fk)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}EI.type="LOCAL";const wI=EI;/**
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
 */function Yp(n,e){return Ne(n,"POST","/v2/accounts/mfaSignIn:start",ke(n,e))}/**
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
 */const cu=rI("rcb"),mk=new to(3e4,6e4);class gk{constructor(){var e;this.hostLanguage="",this.counter=0,this.librarySeparatelyLoaded=!!((e=ve().grecaptcha)!=null&&e.render)}load(e,t=""){return M(_k(t),e,"argument-error"),this.shouldResolveImmediately(t)&&Fp(ve().grecaptcha)?Promise.resolve(ve().grecaptcha):new Promise((r,s)=>{const i=ve().setTimeout(()=>{s(nt(e,"network-request-failed"))},mk.get());ve()[cu]=()=>{ve().clearTimeout(i),delete ve()[cu];const c=ve().grecaptcha;if(!c||!Fp(c)){s(nt(e,"internal-error"));return}const u=c.render;c.render=(l,d)=>{const p=u(l,d);return this.counter++,p},this.hostLanguage=t,r(c)};const o=`${GP()}?${ls({onload:cu,render:"explicit",hl:t})}`;Ah(o).catch(()=>{clearTimeout(i),s(nt(e,"internal-error"))})})}clearedOneInstance(){this.counter--}shouldResolveImmediately(e){var t;return!!((t=ve().grecaptcha)!=null&&t.render)&&(e===this.hostLanguage||this.counter>0||this.librarySeparatelyLoaded)}}function _k(n){return n.length<=6&&/^\s*[a-zA-Z0-9\-]*\s*$/.test(n)}class yk{async load(e){return new JP(e)}clearedOneInstance(){}}/**
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
 */const fi="recaptcha",Ik={theme:"light",type:"image"};class Xp{constructor(e,t,r={...Ik}){this.parameters=r,this.type=fi,this.destroyed=!1,this.widgetId=null,this.tokenChangeListeners=new Set,this.renderPromise=null,this.recaptcha=null,this.auth=Le(e),this.isInvisible=this.parameters.size==="invisible",M(typeof document<"u",this.auth,"operation-not-supported-in-this-environment");const s=typeof t=="string"?document.getElementById(t):t;M(s,this.auth,"argument-error"),this.container=s,this.parameters.callback=this.makeTokenCallback(this.parameters.callback),this._recaptchaLoader=this.auth.settings.appVerificationDisabledForTesting?new yk:new gk,this.validateStartingState()}async verify(){this.assertNotDestroyed();const e=await this.render(),t=this.getAssertedRecaptcha(),r=t.getResponse(e);return r||new Promise(s=>{const i=o=>{o&&(this.tokenChangeListeners.delete(i),s(o))};this.tokenChangeListeners.add(i),this.isInvisible&&t.execute(e)})}render(){try{this.assertNotDestroyed()}catch(e){return Promise.reject(e)}return this.renderPromise?this.renderPromise:(this.renderPromise=this.makeRenderPromise().catch(e=>{throw this.renderPromise=null,e}),this.renderPromise)}_reset(){this.assertNotDestroyed(),this.widgetId!==null&&this.getAssertedRecaptcha().reset(this.widgetId)}clear(){this.assertNotDestroyed(),this.destroyed=!0,this._recaptchaLoader.clearedOneInstance(),this.isInvisible||this.container.childNodes.forEach(e=>{this.container.removeChild(e)})}validateStartingState(){M(!this.parameters.sitekey,this.auth,"argument-error"),M(this.isInvisible||!this.container.hasChildNodes(),this.auth,"argument-error"),M(typeof document<"u",this.auth,"operation-not-supported-in-this-environment")}makeTokenCallback(e){return t=>{if(this.tokenChangeListeners.forEach(r=>r(t)),typeof e=="function")e(t);else if(typeof e=="string"){const r=ve()[e];typeof r=="function"&&r(t)}}}assertNotDestroyed(){M(!this.destroyed,this.auth,"internal-error")}async makeRenderPromise(){if(await this.init(),!this.widgetId){let e=this.container;if(!this.isInvisible){const t=document.createElement("div");e.appendChild(t),e=t}this.widgetId=this.getAssertedRecaptcha().render(e,this.parameters)}return this.widgetId}async init(){M(wh()&&!Ph(),this.auth,"internal-error"),await Ek(),this.recaptcha=await this._recaptchaLoader.load(this.auth,this.auth.languageCode||void 0);const e=await PP(this.auth);M(e,this.auth,"internal-error"),this.parameters.sitekey=e}getAssertedRecaptcha(){return M(this.recaptcha,this.auth,"internal-error"),this.recaptcha}}function Ek(){let n=null;return new Promise(e=>{if(document.readyState==="complete"){e();return}n=()=>e(),window.addEventListener("load",n)}).catch(e=>{throw n&&window.removeEventListener("load",n),e})}/**
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
 */class TI{constructor(e,t){this.verificationId=e,this.onConfirmation=t}confirm(e){const t=di._fromVerification(this.verificationId,e);return this.onConfirmation(t)}}async function wk(n,e,t){if(ye(n.app))return Promise.reject(Je(n));const r=Le(n),s=await vI(r,e,q(t));return new TI(s,i=>Rh(r,i))}async function Tk(n,e,t){const r=q(n);await uc(!1,r,"phone");const s=await vI(r.auth,e,q(t));return new TI(s,i=>hI(r,i))}async function vI(n,e,t){var r;if(!n._getRecaptchaConfig())try{await nC(n)}catch{console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.")}try{let s;if(typeof e=="string"?s={phoneNumber:e}:s=e,"session"in s){const i=s.session;if("phoneNumber"in s){M(i.type==="enroll",n,"internal-error");const o={idToken:i.credential,phoneEnrollmentInfo:{phoneNumber:s.phoneNumber,clientType:"CLIENT_TYPE_WEB"}};return(await bn(n,o,"mfaSmsEnrollment",async(d,p)=>{if(p.phoneEnrollmentInfo.captchaResponse===hi){M((t==null?void 0:t.type)===fi,d,"argument-error");const m=await uu(d,p,t);return Kp(d,m)}return Kp(d,p)},"PHONE_PROVIDER").catch(d=>Promise.reject(d))).phoneSessionInfo.sessionInfo}else{M(i.type==="signin",n,"internal-error");const o=((r=s.multiFactorHint)==null?void 0:r.uid)||s.multiFactorUid;M(o,n,"missing-multi-factor-info");const c={mfaPendingCredential:i.credential,mfaEnrollmentId:o,phoneSignInInfo:{clientType:"CLIENT_TYPE_WEB"}};return(await bn(n,c,"mfaSmsSignIn",async(p,m)=>{if(m.phoneSignInInfo.captchaResponse===hi){M((t==null?void 0:t.type)===fi,p,"argument-error");const T=await uu(p,m,t);return Yp(p,T)}return Yp(p,m)},"PHONE_PROVIDER").catch(p=>Promise.reject(p))).phoneResponseInfo.sessionInfo}}else{const i={phoneNumber:s.phoneNumber,clientType:"CLIENT_TYPE_WEB"};return(await bn(n,i,"sendVerificationCode",async(l,d)=>{if(d.captchaResponse===hi){M((t==null?void 0:t.type)===fi,l,"argument-error");const p=await uu(l,d,t);return zp(l,p)}return zp(l,d)},"PHONE_PROVIDER").catch(l=>Promise.reject(l))).sessionInfo}}finally{t==null||t._reset()}}async function uu(n,e,t){M(t.type===fi,n,"argument-error");const r=await t.verify();M(typeof r=="string",n,"argument-error");const s={...e};if("phoneEnrollmentInfo"in s){const i=s.phoneEnrollmentInfo.phoneNumber,o=s.phoneEnrollmentInfo.captchaResponse,c=s.phoneEnrollmentInfo.clientType,u=s.phoneEnrollmentInfo.recaptchaVersion;return Object.assign(s,{phoneEnrollmentInfo:{phoneNumber:i,recaptchaToken:r,captchaResponse:o,clientType:c,recaptchaVersion:u}}),s}else if("phoneSignInInfo"in s){const i=s.phoneSignInInfo.captchaResponse,o=s.phoneSignInInfo.clientType,c=s.phoneSignInInfo.recaptchaVersion;return Object.assign(s,{phoneSignInInfo:{recaptchaToken:r,captchaResponse:i,clientType:o,recaptchaVersion:c}}),s}else return Object.assign(s,{recaptchaToken:r}),s}/**
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
 */function so(n,e){return e?jt(e):(M(n._popupRedirectResolver,n,"argument-error"),n._popupRedirectResolver)}/**
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
 */class Ch extends oc{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return $r(e,this._buildIdpRequest())}_linkToIdToken(e,t){return $r(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return $r(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function vk(n){return lI(n.auth,new Ch(n),n.bypassAuthState)}function Ak(n){const{auth:e,user:t}=n;return M(t,e,"internal-error"),SC(t,new Ch(n),n.bypassAuthState)}async function Rk(n){const{auth:e,user:t}=n;return M(t,e,"internal-error"),uI(t,new Ch(n),n.bypassAuthState)}/**
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
 */class AI{constructor(e,t,r,s,i=!1){this.auth=e,this.resolver=r,this.user=s,this.bypassAuthState=i,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:r,postBody:s,tenantId:i,error:o,type:c}=e;if(o){this.reject(o);return}const u={auth:this.auth,requestUri:t,sessionId:r,tenantId:i||void 0,postBody:s||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(u))}catch(l){this.reject(l)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return vk;case"linkViaPopup":case"linkViaRedirect":return Rk;case"reauthViaPopup":case"reauthViaRedirect":return Ak;default:yt(this.auth,"internal-error")}}resolve(e){Qt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){Qt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
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
 */const bk=new to(2e3,1e4);async function Sk(n,e,t){if(ye(n.app))return Promise.reject(nt(n,"operation-not-supported-in-this-environment"));const r=Le(n);sc(n,e,Es);const s=so(r,t);return new yn(r,"signInViaPopup",e,s).executeNotNull()}async function Pk(n,e,t){const r=q(n);sc(r.auth,e,Es);const s=so(r.auth,t);return new yn(r.auth,"linkViaPopup",e,s,r).executeNotNull()}class yn extends AI{constructor(e,t,r,s,i){super(e,t,s,i),this.provider=r,this.authWindow=null,this.pollId=null,yn.currentPopupAction&&yn.currentPopupAction.cancel(),yn.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return M(e,this.auth,"internal-error"),e}async onExecution(){Qt(this.filter.length===1,"Popup operations only handle one event");const e=dc();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(nt(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(nt(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,yn.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,r;if((r=(t=this.authWindow)==null?void 0:t.window)!=null&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(nt(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,bk.get())};e()}}yn.currentPopupAction=null;/**
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
 */const Ck="pendingRedirect",Ko=new Map;class kk extends AI{constructor(e,t,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,r),this.eventId=null}async execute(){let e=Ko.get(this.auth._key());if(!e){try{const r=await Nk(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(t){e=()=>Promise.reject(t)}Ko.set(this.auth._key(),e)}return this.bypassAuthState||Ko.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function Nk(n,e){const t=SI(e),r=bI(n);if(!await r._isAvailable())return!1;const s=await r._get(t)==="true";return await r._remove(t),s}async function RI(n,e){return bI(n)._set(SI(e),"true")}function Dk(n,e){Ko.set(n._key(),e)}function bI(n){return jt(n._redirectPersistence)}function SI(n){return Wo(Ck,n.config.apiKey,n.name)}/**
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
 */function Vk(n,e,t){return Ok(n,e,t)}async function Ok(n,e,t){if(ye(n.app))return Promise.reject(Je(n));const r=Le(n);sc(n,e,Es),await r._initializationPromise;const s=so(r,t);return await RI(s,r),s._openRedirect(r,e,"signInViaRedirect")}function xk(n,e,t){return Mk(n,e,t)}async function Mk(n,e,t){const r=q(n);sc(r.auth,e,Es),await r.auth._initializationPromise;const s=so(r.auth,t);await uc(!1,r,e.providerId),await RI(s,r.auth);const i=await Uk(r);return s._openRedirect(r.auth,e,"linkViaRedirect",i)}async function Lk(n,e){return await Le(n)._initializationPromise,PI(n,e,!1)}async function PI(n,e,t=!1){if(ye(n.app))return Promise.reject(Je(n));const r=Le(n),s=so(r,e),o=await new kk(r,s,t).execute();return o&&!t&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}async function Uk(n){const e=dc(`${n.uid}:::`);return n._redirectEventId=e,await n.auth._setRedirectUser(n),await n.auth._persistUserIfCurrent(n),e}/**
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
 */const Fk=10*60*1e3;class Bk{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(t=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!qk(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var r;if(e.error&&!CI(e)){const s=((r=e.error.code)==null?void 0:r.split("auth/")[1])||"internal-error";t.onError(nt(this.auth,s))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const r=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=Fk&&this.cachedEventUids.clear(),this.cachedEventUids.has(Zp(e))}saveEventToCache(e){this.cachedEventUids.add(Zp(e)),this.lastProcessedEventTime=Date.now()}}function Zp(n){return[n.type,n.eventId,n.sessionId,n.tenantId].filter(e=>e).join("-")}function CI({type:n,error:e}){return n==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function qk(n){switch(n.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return CI(n);default:return!1}}/**
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
 */async function $k(n,e={}){return Ne(n,"GET","/v1/projects",e)}/**
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
 */const jk=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,Hk=/^https?/;async function Gk(n){if(n.config.emulator)return;const{authorizedDomains:e}=await $k(n);for(const t of e)try{if(zk(t))return}catch{}yt(n,"unauthorized-domain")}function zk(n){const e=Ni(),{protocol:t,hostname:r}=new URL(e);if(n.startsWith("chrome-extension://")){const o=new URL(n);return o.hostname===""&&r===""?t==="chrome-extension:"&&n.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===r}if(!Hk.test(t))return!1;if(jk.test(n))return r===n;const s=n.replace(/\./g,"\\.");return new RegExp("^(.+\\."+s+"|"+s+")$","i").test(r)}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const Wk=new to(3e4,6e4);function em(){const n=ve().___jsl;if(n!=null&&n.H){for(const e of Object.keys(n.H))if(n.H[e].r=n.H[e].r||[],n.H[e].L=n.H[e].L||[],n.H[e].r=[...n.H[e].L],n.CP)for(let t=0;t<n.CP.length;t++)n.CP[t]=null}}function Kk(n){return new Promise((e,t)=>{var s,i,o;function r(){em(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{em(),t(nt(n,"network-request-failed"))},timeout:Wk.get()})}if((i=(s=ve().gapi)==null?void 0:s.iframes)!=null&&i.Iframe)e(gapi.iframes.getContext());else if((o=ve().gapi)!=null&&o.load)r();else{const c=rI("iframefcb");return ve()[c]=()=>{gapi.load?r():t(nt(n,"network-request-failed"))},Ah(`${WP()}?onload=${c}`).catch(u=>t(u))}}).catch(e=>{throw Qo=null,e})}let Qo=null;function Qk(n){return Qo=Qo||Kk(n),Qo}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const Jk=new to(5e3,15e3),Yk="__/auth/iframe",Xk="emulator/auth/iframe",Zk={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},e0=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function t0(n){const e=n.config;M(e.authDomain,n,"auth-domain-config-required");const t=e.emulator?Th(e,Xk):`https://${n.config.authDomain}/${Yk}`,r={apiKey:e.apiKey,appName:n.name,v:gr},s=e0.get(n.config.apiHost);s&&(r.eid=s);const i=n._getFrameworks();return i.length&&(r.fw=i.join(",")),`${t}?${ls(r).slice(1)}`}async function n0(n){const e=await Qk(n),t=ve().gapi;return M(t,n,"internal-error"),e.open({where:document.body,url:t0(n),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:Zk,dontclear:!0},r=>new Promise(async(s,i)=>{await r.restyle({setHideOnLeave:!1});const o=nt(n,"network-request-failed"),c=ve().setTimeout(()=>{i(o)},Jk.get());function u(){ve().clearTimeout(c),s(r)}r.ping(u).then(u,()=>{i(o)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const r0={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},s0=500,i0=600,o0="_blank",a0="http://localhost";class tm{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function c0(n,e,t,r=s0,s=i0){const i=Math.max((window.screen.availHeight-s)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString();let c="";const u={...r0,width:r.toString(),height:s.toString(),top:i,left:o},l=Pe().toLowerCase();t&&(c=Jy(l)?o0:t),Ky(l)&&(e=e||a0,u.scrollbars="yes");const d=Object.entries(u).reduce((m,[T,C])=>`${m}${T}=${C},`,"");if(LP(l)&&c!=="_self")return u0(e||"",c),new tm(null);const p=window.open(e||"",c,d);M(p,n,"popup-blocked");try{p.focus()}catch{}return new tm(p)}function u0(n,e){const t=document.createElement("a");t.href=n,t.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(r)}/**
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
 */const l0="__/auth/handler",h0="emulator/auth/handler",d0=encodeURIComponent("fac");async function nm(n,e,t,r,s,i){M(n.config.authDomain,n,"auth-domain-config-required"),M(n.config.apiKey,n,"invalid-api-key");const o={apiKey:n.config.apiKey,appName:n.name,authType:t,redirectUrl:r,v:gr,eventId:s};if(e instanceof Es){e.setDefaultLanguage(n.languageCode),o.providerId=e.providerId||"",pw(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[d,p]of Object.entries({}))o[d]=p}if(e instanceof ws){const d=e.getScopes().filter(p=>p!=="");d.length>0&&(o.scopes=d.join(","))}n.tenantId&&(o.tid=n.tenantId);const c=o;for(const d of Object.keys(c))c[d]===void 0&&delete c[d];const u=await n._getAppCheckToken(),l=u?`#${d0}=${encodeURIComponent(u)}`:"";return`${f0(n)}?${ls(c).slice(1)}${l}`}function f0({config:n}){return n.emulator?Th(n,h0):`https://${n.authDomain}/${l0}`}/**
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
 */const lu="webStorageSupport";class p0{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Sh,this._completeRedirectFn=PI,this._overrideRedirectResult=Dk}async _openPopup(e,t,r,s){var o;Qt((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const i=await nm(e,t,r,Ni(),s);return c0(e,i,dc())}async _openRedirect(e,t,r,s){await this._originValidation(e);const i=await nm(e,t,r,Ni(),s);return ok(i),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:s,promise:i}=this.eventManagers[t];return s?Promise.resolve(s):(Qt(i,"If manager is not set, promise should be"),i)}const r=this.initAndGetManager(e);return this.eventManagers[t]={promise:r},r.catch(()=>{delete this.eventManagers[t]}),r}async initAndGetManager(e){const t=await n0(e),r=new Bk(e);return t.register("authEvent",s=>(M(s==null?void 0:s.authEvent,e,"invalid-auth-event"),{status:r.onEvent(s.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=t,r}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(lu,{type:lu},s=>{var o;const i=(o=s==null?void 0:s[0])==null?void 0:o[lu];i!==void 0&&t(!!i),yt(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=Gk(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return tI()||Qy()||vh()}}const m0=p0;var rm="@firebase/auth",sm="1.12.0";/**
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
 */class g0{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){M(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
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
 */function _0(n){switch(n){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function y0(n){rt(new Ye("auth",(e,{options:t})=>{const r=e.getProvider("app").getImmediate(),s=e.getProvider("heartbeat"),i=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=r.options;M(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});const u={apiKey:o,authDomain:c,clientPlatform:n,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:nI(n)},l=new jP(r,s,i,u);return sC(l,t),l},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,r)=>{e.getProvider("auth-internal").initialize()})),rt(new Ye("auth-internal",e=>{const t=Le(e.getProvider("auth").getImmediate());return(r=>new g0(r))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),Fe(rm,sm,_0(n)),Fe(rm,sm,"esm2020")}/**
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
 */const I0=5*60,E0=Nm("authIdTokenMaxAge")||I0;let im=null;const w0=n=>async e=>{const t=e&&await e.getIdTokenResult(),r=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(r&&r>E0)return;const s=t==null?void 0:t.token;im!==s&&(im=s,await fetch(n,{method:s?"POST":"DELETE",headers:s?{Authorization:`Bearer ${s}`}:{}}))};function Y(n=Ui()){const e=Ut(n,"auth");if(e.isInitialized())return e.getImmediate();const t=rC(n,{popupRedirectResolver:m0,persistence:[wI,gI,Sh]}),r=Nm("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const i=new URL(r,location.origin);if(location.origin===i.origin){const o=w0(i.toString());ZC(t,o,()=>o(t.currentUser)),XC(t,c=>o(c))}}const s=Pm("auth");return s&&el(t,`http://${s}`),t}function T0(){var n;return((n=document.getElementsByTagName("head"))==null?void 0:n[0])??document}HP({loadJS(n){return new Promise((e,t)=>{const r=document.createElement("script");r.setAttribute("src",n),r.onload=e,r.onerror=s=>{const i=nt("internal-error");i.customData=s,t(i)},r.type="text/javascript",r.charset="UTF-8",T0().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});y0("Browser");/**
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
 */const v0="type.googleapis.com/google.protobuf.Int64Value",A0="type.googleapis.com/google.protobuf.UInt64Value";function kI(n,e){const t={};for(const r in n)n.hasOwnProperty(r)&&(t[r]=e(n[r]));return t}function Aa(n){if(n==null)return null;if(n instanceof Number&&(n=n.valueOf()),typeof n=="number"&&isFinite(n)||n===!0||n===!1||Object.prototype.toString.call(n)==="[object String]")return n;if(n instanceof Date)return n.toISOString();if(Array.isArray(n))return n.map(e=>Aa(e));if(typeof n=="function"||typeof n=="object")return kI(n,e=>Aa(e));throw new Error("Data cannot be encoded in JSON: "+n)}function us(n){if(n==null)return n;if(n["@type"])switch(n["@type"]){case v0:case A0:{const e=Number(n.value);if(isNaN(e))throw new Error("Data cannot be decoded from JSON: "+n);return e}default:throw new Error("Data cannot be decoded from JSON: "+n)}return Array.isArray(n)?n.map(e=>us(e)):typeof n=="function"||typeof n=="object"?kI(n,e=>us(e)):n}/**
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
 */const kh="functions";/**
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
 */const om={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class et extends It{constructor(e,t,r){super(`${kh}/${e}`,t||""),this.details=r,Object.setPrototypeOf(this,et.prototype)}}function R0(n){if(n>=200&&n<300)return"ok";switch(n){case 0:return"internal";case 400:return"invalid-argument";case 401:return"unauthenticated";case 403:return"permission-denied";case 404:return"not-found";case 409:return"aborted";case 429:return"resource-exhausted";case 499:return"cancelled";case 500:return"internal";case 501:return"unimplemented";case 503:return"unavailable";case 504:return"deadline-exceeded"}return"unknown"}function Ra(n,e){let t=R0(n),r=t,s;try{const i=e&&e.error;if(i){const o=i.status;if(typeof o=="string"){if(!om[o])return new et("internal","internal");t=om[o],r=o}const c=i.message;typeof c=="string"&&(r=c),s=i.details,s!==void 0&&(s=us(s))}}catch{}return t==="ok"?null:new et(t,r,s)}/**
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
 */class b0{constructor(e,t,r,s){this.app=e,this.auth=null,this.messaging=null,this.appCheck=null,this.serverAppAppCheckToken=null,ye(e)&&e.settings.appCheckToken&&(this.serverAppAppCheckToken=e.settings.appCheckToken),this.auth=t.getImmediate({optional:!0}),this.messaging=r.getImmediate({optional:!0}),this.auth||t.get().then(i=>this.auth=i,()=>{}),this.messaging||r.get().then(i=>this.messaging=i,()=>{}),this.appCheck||s==null||s.get().then(i=>this.appCheck=i,()=>{})}async getAuthToken(){if(this.auth)try{const e=await this.auth.getToken();return e==null?void 0:e.accessToken}catch{return}}async getMessagingToken(){if(!(!this.messaging||!("Notification"in self)||Notification.permission!=="granted"))try{return await this.messaging.getToken()}catch{return}}async getAppCheckToken(e){if(this.serverAppAppCheckToken)return this.serverAppAppCheckToken;if(this.appCheck){const t=e?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return t.error?null:t.token}return null}async getContext(e){const t=await this.getAuthToken(),r=await this.getMessagingToken(),s=await this.getAppCheckToken(e);return{authToken:t,messagingToken:r,appCheckToken:s}}}/**
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
 */const nl="us-central1",S0=/^data: (.*?)(?:\n|$)/;function P0(n){let e=null;return{promise:new Promise((t,r)=>{e=setTimeout(()=>{r(new et("deadline-exceeded","deadline-exceeded"))},n)}),cancel:()=>{e&&clearTimeout(e)}}}class C0{constructor(e,t,r,s,i=nl,o=(...c)=>fetch(...c)){this.app=e,this.fetchImpl=o,this.emulatorOrigin=null,this.contextProvider=new b0(e,t,r,s),this.cancelAllRequests=new Promise(c=>{this.deleteService=()=>Promise.resolve(c())});try{const c=new URL(i);this.customDomain=c.origin+(c.pathname==="/"?"":c.pathname),this.region=nl}catch{this.customDomain=null,this.region=i}}_delete(){return this.deleteService()}_url(e){const t=this.app.options.projectId;return this.emulatorOrigin!==null?`${this.emulatorOrigin}/${t}/${this.region}/${e}`:this.customDomain!==null?`${this.customDomain}/${e}`:`https://${this.region}-${t}.cloudfunctions.net/${e}`}}function k0(n,e,t){const r=At(e);n.emulatorOrigin=`http${r?"s":""}://${e}:${t}`,r&&(Mi(n.emulatorOrigin+"/backends"),Pa("Functions",!0))}function N0(n,e,t){const r=s=>V0(n,e,s,{});return r.stream=(s,i)=>x0(n,e,s,i),r}function NI(n){return n.emulatorOrigin&&At(n.emulatorOrigin)?"include":void 0}async function D0(n,e,t,r,s){t["Content-Type"]="application/json";let i;try{i=await r(n,{method:"POST",body:JSON.stringify(e),headers:t,credentials:NI(s)})}catch{return{status:0,json:null}}let o=null;try{o=await i.json()}catch{}return{status:i.status,json:o}}async function DI(n,e){const t={},r=await n.contextProvider.getContext(e.limitedUseAppCheckTokens);return r.authToken&&(t.Authorization="Bearer "+r.authToken),r.messagingToken&&(t["Firebase-Instance-ID-Token"]=r.messagingToken),r.appCheckToken!==null&&(t["X-Firebase-AppCheck"]=r.appCheckToken),t}function V0(n,e,t,r){const s=n._url(e);return O0(n,s,t,r)}async function O0(n,e,t,r){t=Aa(t);const s={data:t},i=await DI(n,r),o=r.timeout||7e4,c=P0(o),u=await Promise.race([D0(e,s,i,n.fetchImpl,n),c.promise,n.cancelAllRequests]);if(c.cancel(),!u)throw new et("cancelled","Firebase Functions instance was deleted.");const l=Ra(u.status,u.json);if(l)throw l;if(!u.json)throw new et("internal","Response is not valid JSON object.");let d=u.json.data;if(typeof d>"u"&&(d=u.json.result),typeof d>"u")throw new et("internal","Response is missing data field.");return{data:us(d)}}function x0(n,e,t,r){const s=n._url(e);return M0(n,s,t,r||{})}async function M0(n,e,t,r){var m;t=Aa(t);const s={data:t},i=await DI(n,r);i["Content-Type"]="application/json",i.Accept="text/event-stream";let o;try{o=await n.fetchImpl(e,{method:"POST",body:JSON.stringify(s),headers:i,signal:r==null?void 0:r.signal,credentials:NI(n)})}catch(T){if(T instanceof Error&&T.name==="AbortError"){const N=new et("cancelled","Request was cancelled.");return{data:Promise.reject(N),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(N)}}}}}}const C=Ra(0,null);return{data:Promise.reject(C),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(C)}}}}}}let c,u;const l=new Promise((T,C)=>{c=T,u=C});(m=r==null?void 0:r.signal)==null||m.addEventListener("abort",()=>{const T=new et("cancelled","Request was cancelled.");u(T)});const d=o.body.getReader(),p=L0(d,c,u,r==null?void 0:r.signal);return{stream:{[Symbol.asyncIterator](){const T=p.getReader();return{async next(){const{value:C,done:N}=await T.read();return{value:C,done:N}},async return(){return await T.cancel(),{done:!0,value:void 0}}}}},data:l}}function L0(n,e,t,r){const s=(o,c)=>{const u=o.match(S0);if(!u)return;const l=u[1];try{const d=JSON.parse(l);if("result"in d){e(us(d.result));return}if("message"in d){c.enqueue(us(d.message));return}if("error"in d){const p=Ra(0,d);c.error(p),t(p);return}}catch(d){if(d instanceof et){c.error(d),t(d);return}}},i=new TextDecoder;return new ReadableStream({start(o){let c="";return u();async function u(){if(r!=null&&r.aborted){const l=new et("cancelled","Request was cancelled");return o.error(l),t(l),Promise.resolve()}try{const{value:l,done:d}=await n.read();if(d){c.trim()&&s(c.trim(),o),o.close();return}if(r!=null&&r.aborted){const m=new et("cancelled","Request was cancelled");o.error(m),t(m),await n.cancel();return}c+=i.decode(l,{stream:!0});const p=c.split(`
`);c=p.pop()||"";for(const m of p)m.trim()&&s(m.trim(),o);return u()}catch(l){const d=l instanceof et?l:Ra(0,null);o.error(d),t(d)}}},cancel(){return n.cancel()}})}const am="@firebase/functions",cm="0.13.1";/**
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
 */const U0="auth-internal",F0="app-check-internal",B0="messaging-internal";function q0(n){const e=(t,{instanceIdentifier:r})=>{const s=t.getProvider("app").getImmediate(),i=t.getProvider(U0),o=t.getProvider(B0),c=t.getProvider(F0);return new C0(s,i,o,c,r)};rt(new Ye(kh,e,"PUBLIC").setMultipleInstances(!0)),Fe(am,cm,n),Fe(am,cm,"esm2020")}/**
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
 */function VV(n=Ui(),e=nl){const r=Ut(q(n),kh).getImmediate({identifier:e}),s=Cm("functions");return s&&$0(r,...s),r}function $0(n,e,t){k0(q(n),e,t)}function OV(n,e,t){return N0(q(n),e)}q0();var xr;(function(n){n.IndexedDbLocal="INDEXED_DB_LOCAL",n.InMemory="IN_MEMORY",n.BrowserLocal="BROWSER_LOCAL",n.BrowserSession="BROWSER_SESSION"})(xr||(xr={}));var fn;(function(n){n.APPLE="apple.com",n.FACEBOOK="facebook.com",n.GAME_CENTER="gc.apple.com",n.GITHUB="github.com",n.GOOGLE="google.com",n.MICROSOFT="microsoft.com",n.PLAY_GAMES="playgames.google.com",n.TWITTER="twitter.com",n.YAHOO="yahoo.com",n.PASSWORD="password",n.PHONE="phone"})(fn||(fn={}));const xV=Yi("FirebaseAuthentication",{web:()=>Rm(()=>Promise.resolve().then(()=>PN),void 0).then(n=>new n.FirebaseAuthenticationWeb)});var um;(function(n){n[n.Min=1]="Min",n[n.Low=2]="Low",n[n.Default=3]="Default",n[n.High=4]="High",n[n.Max=5]="Max"})(um||(um={}));var lm;(function(n){n[n.Secret=-1]="Secret",n[n.Private=0]="Private",n[n.Public=1]="Public"})(lm||(lm={}));const MV=Yi("FirebaseMessaging",{web:()=>Rm(()=>Promise.resolve().then(()=>nV),void 0).then(n=>new n.FirebaseMessagingWeb)});/**
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
 */const rl=new Map,VI={activated:!1,tokenObservers:[]},j0={initialized:!1,enabled:!1};function Se(n){return rl.get(n)||{...VI}}function H0(n,e){return rl.set(n,e),rl.get(n)}function pc(){return j0}/**
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
 */const OI="https://content-firebaseappcheck.googleapis.com/v1",G0="exchangeRecaptchaEnterpriseToken",z0="exchangeDebugToken",hm={RETRIAL_MIN_WAIT:30*1e3,RETRIAL_MAX_WAIT:16*60*1e3},W0=24*60*60*1e3;/**
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
 */class K0{constructor(e,t,r,s,i){if(this.operation=e,this.retryPolicy=t,this.getWaitDuration=r,this.lowerBound=s,this.upperBound=i,this.pending=null,this.nextErrorWaitInterval=s,s>i)throw new Error("Proactive refresh lower bound greater than upper bound!")}start(){this.nextErrorWaitInterval=this.lowerBound,this.process(!0).catch(()=>{})}stop(){this.pending&&(this.pending.reject("cancelled"),this.pending=null)}isRunning(){return!!this.pending}async process(e){this.stop();try{this.pending=new pi,this.pending.promise.catch(t=>{}),await Q0(this.getNextRun(e)),this.pending.resolve(),await this.pending.promise,this.pending=new pi,this.pending.promise.catch(t=>{}),await this.operation(),this.pending.resolve(),await this.pending.promise,this.process(!0).catch(()=>{})}catch(t){this.retryPolicy(t)?this.process(!1).catch(()=>{}):this.stop()}}getNextRun(e){if(e)return this.nextErrorWaitInterval=this.lowerBound,this.getWaitDuration();{const t=this.nextErrorWaitInterval;return this.nextErrorWaitInterval*=2,this.nextErrorWaitInterval>this.upperBound&&(this.nextErrorWaitInterval=this.upperBound),t}}}function Q0(n){return new Promise(e=>{setTimeout(e,n)})}/**
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
 */const J0={"already-initialized":"You have already called initializeAppCheck() for FirebaseApp {$appName} with different options. To avoid this error, call initializeAppCheck() with the same options as when it was originally called. This will return the already initialized instance.","use-before-activation":"App Check is being used before initializeAppCheck() is called for FirebaseApp {$appName}. Call initializeAppCheck() before instantiating other Firebase services.","fetch-network-error":"Fetch failed to connect to a network. Check Internet connection. Original error: {$originalErrorMessage}.","fetch-parse-error":"Fetch client could not parse response. Original error: {$originalErrorMessage}.","fetch-status-error":"Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.","storage-open":"Error thrown when opening storage. Original error: {$originalErrorMessage}.","storage-get":"Error thrown when reading from storage. Original error: {$originalErrorMessage}.","storage-set":"Error thrown when writing to storage. Original error: {$originalErrorMessage}.","recaptcha-error":"ReCAPTCHA error.","initial-throttle":"{$httpStatus} error. Attempts allowed again after {$time}",throttled:"Requests throttled due to previous {$httpStatus} error. Attempts allowed again after {$time}"},tt=new Vn("appCheck","AppCheck",J0);/**
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
 */function dm(n=!1){var e;return n?(e=self.grecaptcha)==null?void 0:e.enterprise:self.grecaptcha}function Nh(n){if(!Se(n).activated)throw tt.create("use-before-activation",{appName:n.name})}function xI(n){const e=Math.round(n/1e3),t=Math.floor(e/(3600*24)),r=Math.floor((e-t*3600*24)/3600),s=Math.floor((e-t*3600*24-r*3600)/60),i=e-t*3600*24-r*3600-s*60;let o="";return t&&(o+=Do(t)+"d:"),r&&(o+=Do(r)+"h:"),o+=Do(s)+"m:"+Do(i)+"s",o}function Do(n){return n===0?"00":n>=10?n.toString():"0"+n}/**
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
 */async function Dh({url:n,body:e},t){const r={"Content-Type":"application/json"},s=t.getImmediate({optional:!0});if(s){const p=await s.getHeartbeatsHeader();p&&(r["X-Firebase-Client"]=p)}const i={method:"POST",body:JSON.stringify(e),headers:r};let o;try{o=await fetch(n,i)}catch(p){throw tt.create("fetch-network-error",{originalErrorMessage:p==null?void 0:p.message})}if(o.status!==200)throw tt.create("fetch-status-error",{httpStatus:o.status});let c;try{c=await o.json()}catch(p){throw tt.create("fetch-parse-error",{originalErrorMessage:p==null?void 0:p.message})}const u=c.ttl.match(/^([\d.]+)(s)$/);if(!u||!u[2]||isNaN(Number(u[1])))throw tt.create("fetch-parse-error",{originalErrorMessage:`ttl field (timeToLive) is not in standard Protobuf Duration format: ${c.ttl}`});const l=Number(u[1])*1e3,d=Date.now();return{token:c.token,expireTimeMillis:d+l,issuedAtTimeMillis:d}}function Y0(n,e){const{projectId:t,appId:r,apiKey:s}=n.options;return{url:`${OI}/projects/${t}/apps/${r}:${G0}?key=${s}`,body:{recaptcha_enterprise_token:e}}}function MI(n,e){const{projectId:t,appId:r,apiKey:s}=n.options;return{url:`${OI}/projects/${t}/apps/${r}:${z0}?key=${s}`,body:{debug_token:e}}}/**
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
 */const X0="firebase-app-check-database",Z0=1,Oi="firebase-app-check-store",LI="debug-token";let Vo=null;function UI(){return Vo||(Vo=new Promise((n,e)=>{try{const t=indexedDB.open(X0,Z0);t.onsuccess=r=>{n(r.target.result)},t.onerror=r=>{var s;e(tt.create("storage-open",{originalErrorMessage:(s=r.target.error)==null?void 0:s.message}))},t.onupgradeneeded=r=>{const s=r.target.result;switch(r.oldVersion){case 0:s.createObjectStore(Oi,{keyPath:"compositeKey"})}}}catch(t){e(tt.create("storage-open",{originalErrorMessage:t==null?void 0:t.message}))}}),Vo)}function eN(n){return BI(qI(n))}function tN(n,e){return FI(qI(n),e)}function nN(n){return FI(LI,n)}function rN(){return BI(LI)}async function FI(n,e){const r=(await UI()).transaction(Oi,"readwrite"),i=r.objectStore(Oi).put({compositeKey:n,value:e});return new Promise((o,c)=>{i.onsuccess=u=>{o()},r.onerror=u=>{var l;c(tt.create("storage-set",{originalErrorMessage:(l=u.target.error)==null?void 0:l.message}))}})}async function BI(n){const t=(await UI()).transaction(Oi,"readonly"),s=t.objectStore(Oi).get(n);return new Promise((i,o)=>{s.onsuccess=c=>{const u=c.target.result;i(u?u.value:void 0)},t.onerror=c=>{var u;o(tt.create("storage-get",{originalErrorMessage:(u=c.target.error)==null?void 0:u.message}))}})}function qI(n){return`${n.options.appId}-${n.name}`}/**
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
 */const In=new Ca("@firebase/app-check");/**
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
 */async function sN(n){if(Li()){let e;try{e=await eN(n)}catch(t){In.warn(`Failed to read token from IndexedDB. Error: ${t}`)}return e}}function hu(n,e){return Li()?tN(n,e).catch(t=>{In.warn(`Failed to write token to IndexedDB. Error: ${t}`)}):Promise.resolve()}async function iN(){let n;try{n=await rN()}catch{}if(n)return n;{const e=crypto.randomUUID();return nN(e).catch(t=>In.warn(`Failed to persist debug token to IndexedDB. Error: ${t}`)),e}}/**
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
 */function Vh(){return pc().enabled}async function Oh(){const n=pc();if(n.enabled&&n.token)return n.token.promise;throw Error(`
            Can't get debug token in production mode.
        `)}function oN(){const n=al(),e=pc();if(e.initialized=!0,typeof n.FIREBASE_APPCHECK_DEBUG_TOKEN!="string"&&n.FIREBASE_APPCHECK_DEBUG_TOKEN!==!0)return;e.enabled=!0;const t=new pi;e.token=t,typeof n.FIREBASE_APPCHECK_DEBUG_TOKEN=="string"?t.resolve(n.FIREBASE_APPCHECK_DEBUG_TOKEN):t.resolve(iN())}/**
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
 */const aN={error:"UNKNOWN_ERROR"};function cN(n){return ol.encodeString(JSON.stringify(n),!1)}async function sl(n,e=!1,t=!1){const r=n.app;Nh(r);const s=Se(r);let i=s.token,o;if(i&&!Mr(i)&&(s.token=void 0,i=void 0),!i){const l=await s.cachedTokenPromise;l&&(Mr(l)?i=l:await hu(r,void 0))}if(!e&&i&&Mr(i))return{token:i.token};let c=!1;if(Vh())try{s.exchangeTokenPromise||(s.exchangeTokenPromise=Dh(MI(r,await Oh()),n.heartbeatServiceProvider).finally(()=>{s.exchangeTokenPromise=void 0}),c=!0);const l=await s.exchangeTokenPromise;return await hu(r,l),s.token=l,{token:l.token}}catch(l){return l.code==="appCheck/throttled"||l.code==="appCheck/initial-throttle"?In.warn(l.message):t&&In.error(l),du(l)}try{s.exchangeTokenPromise||(s.exchangeTokenPromise=s.provider.getToken().finally(()=>{s.exchangeTokenPromise=void 0}),c=!0),i=await Se(r).exchangeTokenPromise}catch(l){l.code==="appCheck/throttled"||l.code==="appCheck/initial-throttle"?In.warn(l.message):t&&In.error(l),o=l}let u;return i?o?Mr(i)?u={token:i.token,internalError:o}:u=du(o):(u={token:i.token},s.token=i,await hu(r,i)):u=du(o),c&&HI(r,u),u}async function uN(n){const e=n.app;Nh(e);const{provider:t}=Se(e);if(Vh()){const r=await Oh(),{token:s}=await Dh(MI(e,r),n.heartbeatServiceProvider);return{token:s}}else{const{token:r}=await t.getToken();return{token:r}}}function $I(n,e,t,r){const{app:s}=n,i=Se(s),o={next:t,error:r,type:e};if(i.tokenObservers=[...i.tokenObservers,o],i.token&&Mr(i.token)){const c=i.token;Promise.resolve().then(()=>{t({token:c.token}),fm(n)}).catch(()=>{})}i.cachedTokenPromise.then(()=>fm(n))}function jI(n,e){const t=Se(n),r=t.tokenObservers.filter(s=>s.next!==e);r.length===0&&t.tokenRefresher&&t.tokenRefresher.isRunning()&&t.tokenRefresher.stop(),t.tokenObservers=r}function fm(n){const{app:e}=n,t=Se(e);let r=t.tokenRefresher;r||(r=lN(n),t.tokenRefresher=r),!r.isRunning()&&t.isTokenAutoRefreshEnabled&&r.start()}function lN(n){const{app:e}=n;return new K0(async()=>{const t=Se(e);let r;if(t.token?r=await sl(n,!0):r=await sl(n),r.error)throw r.error;if(r.internalError)throw r.internalError},()=>!0,()=>{const t=Se(e);if(t.token){let r=t.token.issuedAtTimeMillis+(t.token.expireTimeMillis-t.token.issuedAtTimeMillis)*.5+3e5;const s=t.token.expireTimeMillis-5*60*1e3;return r=Math.min(r,s),Math.max(0,r-Date.now())}else return 0},hm.RETRIAL_MIN_WAIT,hm.RETRIAL_MAX_WAIT)}function HI(n,e){const t=Se(n).tokenObservers;for(const r of t)try{r.type==="EXTERNAL"&&e.error!=null?r.error(e.error):r.next(e)}catch{}}function Mr(n){return n.expireTimeMillis-Date.now()>0}function du(n){return{token:cN(aN),error:n}}/**
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
 */class hN{constructor(e,t){this.app=e,this.heartbeatServiceProvider=t}_delete(){const{tokenObservers:e}=Se(this.app);for(const t of e)jI(this.app,t.next);return Promise.resolve()}}function dN(n,e){return new hN(n,e)}function fN(n){return{getToken:e=>sl(n,e),getLimitedUseToken:()=>uN(n),addTokenListener:e=>$I(n,"INTERNAL",e),removeTokenListener:e=>jI(n.app,e)}}const pN="@firebase/app-check",mN="0.11.0",gN="https://www.google.com/recaptcha/enterprise.js";function _N(n,e){const t=new pi,r=Se(n);r.reCAPTCHAState={initialized:t};const s=yN(n),i=dm(!0);return i?pm(n,e,i,s,t):wN(()=>{const o=dm(!0);if(!o)throw new Error("no recaptcha");pm(n,e,o,s,t)}),t.promise}function pm(n,e,t,r,s){t.ready(()=>{EN(n,e,t,r),s.resolve(t)})}function yN(n){const e=`fire_app_check_${n.name}`,t=document.createElement("div");return t.id=e,t.style.display="none",document.body.appendChild(t),e}async function IN(n){Nh(n);const t=await Se(n).reCAPTCHAState.initialized.promise;return new Promise((r,s)=>{const i=Se(n).reCAPTCHAState;t.ready(()=>{r(t.execute(i.widgetId,{action:"fire_app_check"}))})})}function EN(n,e,t,r){const s=t.render(r,{sitekey:e,size:"invisible",callback:()=>{Se(n).reCAPTCHAState.succeeded=!0},"error-callback":()=>{Se(n).reCAPTCHAState.succeeded=!1}}),i=Se(n);i.reCAPTCHAState={...i.reCAPTCHAState,widgetId:s}}function wN(n){const e=document.createElement("script");e.src=gN,e.onload=n,document.head.appendChild(e)}class xh{constructor(e){this._siteKey=e,this._throttleData=null}async getToken(){var r,s,i;vN(this._throttleData);const e=await IN(this._app).catch(o=>{throw tt.create("recaptcha-error")});if(!((r=Se(this._app).reCAPTCHAState)!=null&&r.succeeded))throw tt.create("recaptcha-error");let t;try{t=await Dh(Y0(this._app,e),this._heartbeatServiceProvider)}catch(o){throw(s=o.code)!=null&&s.includes("fetch-status-error")?(this._throttleData=TN(Number((i=o.customData)==null?void 0:i.httpStatus),this._throttleData),tt.create("initial-throttle",{time:xI(this._throttleData.allowRequestsAfter-Date.now()),httpStatus:this._throttleData.httpStatus})):o}return this._throttleData=null,t}initialize(e){this._app=e,this._heartbeatServiceProvider=Ut(e,"heartbeat"),_N(e,this._siteKey).catch(()=>{})}isEqual(e){return e instanceof xh?this._siteKey===e._siteKey:!1}}function TN(n,e){if(n===404||n===403)return{backoffCount:1,allowRequestsAfter:Date.now()+W0,httpStatus:n};{const t=e?e.backoffCount:0,r=Tw(t,1e3,2);return{backoffCount:t+1,allowRequestsAfter:Date.now()+r,httpStatus:n}}}function vN(n){if(n&&Date.now()-n.allowRequestsAfter<=0)throw tt.create("throttled",{time:xI(n.allowRequestsAfter-Date.now()),httpStatus:n.httpStatus})}/**
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
 */function AN(n=Ui(),e){n=q(n);const t=Ut(n,"app-check");if(pc().initialized||oN(),Vh()&&Oh().then(s=>console.log(`App Check debug token: ${s}. You will need to add it to your app's App Check settings in the Firebase console for it to work.`)),t.isInitialized()){const s=t.getImmediate(),i=t.getOptions();if(i.isTokenAutoRefreshEnabled===e.isTokenAutoRefreshEnabled&&i.provider.isEqual(e.provider))return s;throw tt.create("already-initialized",{appName:n.name})}const r=t.initialize({options:e});return RN(n,e.provider,e.isTokenAutoRefreshEnabled),Se(n).isTokenAutoRefreshEnabled&&$I(r,"INTERNAL",()=>{}),r}function RN(n,e,t=!1){const r=H0(n,{...VI});r.activated=!0,r.provider=e,r.cachedTokenPromise=sN(n).then(s=>(s&&Mr(s)&&(r.token=s,HI(n,{token:s.token})),s)),r.isTokenAutoRefreshEnabled=t&&n.automaticDataCollectionEnabled,!n.automaticDataCollectionEnabled&&t&&In.warn("`isTokenAutoRefreshEnabled` is true but `automaticDataCollectionEnabled` was set to false during `initializeApp()`. This blocks automatic token refresh."),r.provider.initialize(n)}const bN="app-check",mm="app-check-internal";function SN(){rt(new Ye(bN,n=>{const e=n.getProvider("app").getImmediate(),t=n.getProvider("heartbeat");return dN(e,t)},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((n,e,t)=>{n.getProvider(mm).initialize()})),rt(new Ye(mm,n=>{const e=n.getProvider("app-check").getImmediate();return fN(e)},"PUBLIC").setInstantiationMode("EXPLICIT")),Fe(pN,mN)}SN();const LV=Object.freeze(Object.defineProperty({__proto__:null,ReCaptchaEnterpriseProvider:xh,initializeAppCheck:AN},Symbol.toStringTag,{value:"Module"}));class te extends Xi{constructor(){super(),this.lastConfirmationResult=new Map;const e=Y();e.onAuthStateChanged(t=>this.handleAuthStateChange(t)),e.onIdTokenChanged(t=>void this.handleIdTokenChange(t))}async applyActionCode(e){const t=Y();return DC(t,e.oobCode)}async createUserWithEmailAndPassword(e){const t=Y(),r=await VC(t,e.email,e.password);return this.createSignInResult(r,null)}async confirmPasswordReset(e){const t=Y();return NC(t,e.oobCode,e.newPassword)}async confirmVerificationCode(e){const{verificationCode:t,verificationId:r}=e,s=this.lastConfirmationResult.get(r);if(!s)throw new Error(te.ERROR_CONFIRMATION_RESULT_MISSING);const i=await s.confirm(t);return this.createSignInResult(i,null)}async deleteUser(){const t=Y().currentUser;if(!t)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return tk(t)}async fetchSignInMethodsForEmail(e){const t=Y();return{signInMethods:await FC(t,e.email)}}async getPendingAuthResult(){throw this.unimplemented("Not implemented on web.")}async getCurrentUser(){const e=Y();return{user:this.createUserResult(e.currentUser)}}async getIdToken(e){const t=Y();if(!t.currentUser)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return{token:await t.currentUser.getIdToken(e==null?void 0:e.forceRefresh)||""}}async getIdTokenResult(e){const t=Y();if(!t.currentUser)throw new Error(te.ERROR_NO_USER_SIGNED_IN);const r=await t.currentUser.getIdTokenResult(e==null?void 0:e.forceRefresh);return Object.assign(Object.assign({},r),{authTime:Date.parse(r.authTime),expirationTime:Date.parse(r.expirationTime),issuedAtTime:Date.parse(r.issuedAtTime)})}async getRedirectResult(){const e=Y(),t=await Lk(e),r=t?_e.credentialFromResult(t):null;return this.createSignInResult(t,r)}async getTenantId(){return{tenantId:Y().tenantId}}async isSignInWithEmailLink(e){const t=Y();return{isSignInWithEmailLink:MC(t,e.emailLink)}}async linkWithApple(e){const t=new _e(fn.APPLE);this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithEmailAndPassword(e){const t=Jt.credential(e.email,e.password),r=await this.linkCurrentUserWithCredential(t);return this.createSignInResult(r,t)}async linkWithEmailLink(e){const t=Jt.credentialWithLink(e.email,e.emailLink),r=await this.linkCurrentUserWithCredential(t);return this.createSignInResult(r,t)}async linkWithFacebook(e){const t=new ft;this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=ft.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithGameCenter(){throw this.unimplemented("Not implemented on web.")}async linkWithGithub(e){const t=new mt;this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=mt.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithGoogle(e){const t=new pt;this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=pt.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithMicrosoft(e){const t=new _e(fn.MICROSOFT);this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithOpenIdConnect(e){const t=new _e(e.providerId);this.applySignInOptions(e,t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithPhoneNumber(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);if(!e.phoneNumber)throw new Error(te.ERROR_PHONE_NUMBER_MISSING);if(!e.recaptchaVerifier||!(e.recaptchaVerifier instanceof Xp))throw new Error(te.ERROR_RECAPTCHA_VERIFIER_MISSING);try{const s=await Tk(r,e.phoneNumber,e.recaptchaVerifier),{verificationId:i}=s;this.lastConfirmationResult.set(i,s);const o={verificationId:i};this.notifyListeners(te.PHONE_CODE_SENT_EVENT,o)}catch(s){const i={message:this.getErrorMessage(s)};this.notifyListeners(te.PHONE_VERIFICATION_FAILED_EVENT,i)}}async linkWithPlayGames(){throw this.unimplemented("Not implemented on web.")}async linkWithTwitter(e){const t=new gt;this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=gt.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithYahoo(e){const t=new _e(fn.YAHOO);this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async reload(){const t=Y().currentUser;if(!t)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return Gy(t)}async revokeAccessToken(e){const t=Y();return ek(t,e.token)}async sendEmailVerification(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return BC(r,e==null?void 0:e.actionCodeSettings)}async sendPasswordResetEmail(e){const t=Y();return kC(t,e.email,e.actionCodeSettings)}async sendSignInLinkToEmail(e){const t=Y();return xC(t,e.email,e.actionCodeSettings)}async setLanguageCode(e){const t=Y();t.languageCode=e.languageCode}async setPersistence(e){const t=Y();switch(e.persistence){case xr.BrowserLocal:await No(t,gI);break;case xr.BrowserSession:await No(t,Sh);break;case xr.IndexedDbLocal:await No(t,wI);break;case xr.InMemory:await No(t,Zu);break}}async setTenantId(e){const t=Y();t.tenantId=e.tenantId}async signInAnonymously(){const e=Y(),t=await RC(e);return this.createSignInResult(t,null)}async signInWithApple(e){const t=new _e(fn.APPLE);this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithCustomToken(e){const t=Y(),r=await CC(t,e.token);return this.createSignInResult(r,null)}async signInWithEmailAndPassword(e){const t=Y(),r=await OC(t,e.email,e.password);return this.createSignInResult(r,null)}async signInWithEmailLink(e){const t=Y(),r=await LC(t,e.email,e.emailLink);return this.createSignInResult(r,null)}async signInWithFacebook(e){const t=new ft;this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=ft.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithGithub(e){const t=new mt;this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=mt.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithGoogle(e){const t=new pt;this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=pt.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithMicrosoft(e){const t=new _e(fn.MICROSOFT);this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithOpenIdConnect(e){const t=new _e(e.providerId);this.applySignInOptions(e,t);const r=await this.signInWithPopupOrRedirect(t,e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithPhoneNumber(e){if(!e.phoneNumber)throw new Error(te.ERROR_PHONE_NUMBER_MISSING);if(!e.recaptchaVerifier||!(e.recaptchaVerifier instanceof Xp))throw new Error(te.ERROR_RECAPTCHA_VERIFIER_MISSING);const t=Y();try{const r=await wk(t,e.phoneNumber,e.recaptchaVerifier),{verificationId:s}=r;this.lastConfirmationResult.set(s,r);const i={verificationId:s};this.notifyListeners(te.PHONE_CODE_SENT_EVENT,i)}catch(r){const s={message:this.getErrorMessage(r)};this.notifyListeners(te.PHONE_VERIFICATION_FAILED_EVENT,s)}}async signInWithPlayGames(){throw this.unimplemented("Not implemented on web.")}async signInWithGameCenter(){throw this.unimplemented("Not implemented on web.")}async signInWithTwitter(e){const t=new gt;this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=gt.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithYahoo(e){const t=new _e(fn.YAHOO);this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async signOut(){await Y().signOut()}async unlink(e){const t=Y();if(!t.currentUser)throw new Error(te.ERROR_NO_USER_SIGNED_IN);const r=await bC(t.currentUser,e.providerId);return{user:this.createUserResult(r)}}async updateEmail(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return HC(r,e.newEmail)}async updatePassword(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return GC(r,e.newPassword)}async updateProfile(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return jC(r,{displayName:e.displayName,photoURL:e.photoUrl})}async useAppLanguage(){Y().useDeviceLanguage()}async useEmulator(e){const t=Y(),r=e.port||9099,s=e.scheme||"http";e.host.includes("://")?el(t,`${e.host}:${r}`):el(t,`${s}://${e.host}:${r}`)}async verifyBeforeUpdateEmail(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return qC(r,e==null?void 0:e.newEmail,e==null?void 0:e.actionCodeSettings)}handleAuthStateChange(e){const r={user:this.createUserResult(e)};this.notifyListeners(te.AUTH_STATE_CHANGE_EVENT,r,!0)}async handleIdTokenChange(e){if(!e)return;const r={token:await e.getIdToken(!1)};this.notifyListeners(te.ID_TOKEN_CHANGE_EVENT,r,!0)}applySignInOptions(e,t){if(e.customParameters){const r={};e.customParameters.map(s=>{r[s.key]=s.value}),t.setCustomParameters(r)}if(e.scopes)for(const r of e.scopes)t.addScope(r)}signInWithPopupOrRedirect(e,t){const r=Y();return t==="redirect"?Vk(r,e):Sk(r,e)}linkCurrentUserWithPopupOrRedirect(e,t){const r=Y();if(!r.currentUser)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return t==="redirect"?xk(r.currentUser,e):Pk(r.currentUser,e)}linkCurrentUserWithCredential(e){const t=Y();if(!t.currentUser)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return hI(t.currentUser,e)}requestAppTrackingTransparencyPermission(){throw this.unimplemented("Not implemented on web.")}checkAppTrackingTransparencyPermission(){throw this.unimplemented("Not implemented on web.")}createSignInResult(e,t){const r=this.createUserResult((e==null?void 0:e.user)||null),s=this.createCredentialResult(t),i=this.createAdditionalUserInfoResult(e);return{user:r,credential:s,additionalUserInfo:i}}createCredentialResult(e){if(!e)return null;const t={providerId:e.providerId};return e instanceof Mt&&(t.accessToken=e.accessToken,t.idToken=e.idToken,t.secret=e.secret),t}createUserResult(e){return e?{displayName:e.displayName,email:e.email,emailVerified:e.emailVerified,isAnonymous:e.isAnonymous,metadata:this.createUserMetadataResult(e.metadata),phoneNumber:e.phoneNumber,photoUrl:e.photoURL,providerData:this.createUserProviderDataResult(e.providerData),providerId:e.providerId,tenantId:e.tenantId,uid:e.uid}:null}createUserMetadataResult(e){const t={};return e.creationTime&&(t.creationTime=Date.parse(e.creationTime)),e.lastSignInTime&&(t.lastSignInTime=Date.parse(e.lastSignInTime)),t}createUserProviderDataResult(e){return e.map(t=>({displayName:t.displayName,email:t.email,phoneNumber:t.phoneNumber,photoUrl:t.photoURL,providerId:t.providerId,uid:t.uid}))}createAdditionalUserInfoResult(e){if(!e)return null;const t=YC(e);if(!t)return null;const{isNewUser:r,profile:s,providerId:i,username:o}=t,c={isNewUser:r};return i!==null&&(c.providerId=i),s!==null&&(c.profile=s),o!=null&&(c.username=o),c}getErrorMessage(e){return e instanceof Object&&"message"in e&&typeof e.message=="string"?e.message:JSON.stringify(e)}}te.AUTH_STATE_CHANGE_EVENT="authStateChange";te.ID_TOKEN_CHANGE_EVENT="idTokenChange";te.PHONE_CODE_SENT_EVENT="phoneCodeSent";te.PHONE_VERIFICATION_FAILED_EVENT="phoneVerificationFailed";te.ERROR_NO_USER_SIGNED_IN="No user is signed in.";te.ERROR_PHONE_NUMBER_MISSING="phoneNumber must be provided.";te.ERROR_RECAPTCHA_VERIFIER_MISSING="recaptchaVerifier must be provided and must be an instance of RecaptchaVerifier.";te.ERROR_CONFIRMATION_RESULT_MISSING="No confirmation result with this verification id was found.";const PN=Object.freeze(Object.defineProperty({__proto__:null,FirebaseAuthenticationWeb:te},Symbol.toStringTag,{value:"Module"})),GI="@firebase/installations",Mh="0.6.19";/**
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
 */const zI=1e4,WI=`w:${Mh}`,KI="FIS_v2",CN="https://firebaseinstallations.googleapis.com/v1",kN=60*60*1e3,NN="installations",DN="Installations";/**
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
 */const VN={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},fr=new Vn(NN,DN,VN);function QI(n){return n instanceof It&&n.code.includes("request-failed")}/**
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
 */function JI({projectId:n}){return`${CN}/projects/${n}/installations`}function YI(n){return{token:n.token,requestStatus:2,expiresIn:xN(n.expiresIn),creationTime:Date.now()}}async function XI(n,e){const r=(await e.json()).error;return fr.create("request-failed",{requestName:n,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function ZI({apiKey:n}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":n})}function ON(n,{refreshToken:e}){const t=ZI(n);return t.append("Authorization",MN(e)),t}async function eE(n){const e=await n();return e.status>=500&&e.status<600?n():e}function xN(n){return Number(n.replace("s","000"))}function MN(n){return`${KI} ${n}`}/**
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
 */async function LN({appConfig:n,heartbeatServiceProvider:e},{fid:t}){const r=JI(n),s=ZI(n),i=e.getImmediate({optional:!0});if(i){const l=await i.getHeartbeatsHeader();l&&s.append("x-firebase-client",l)}const o={fid:t,authVersion:KI,appId:n.appId,sdkVersion:WI},c={method:"POST",headers:s,body:JSON.stringify(o)},u=await eE(()=>fetch(r,c));if(u.ok){const l=await u.json();return{fid:l.fid||t,registrationStatus:2,refreshToken:l.refreshToken,authToken:YI(l.authToken)}}else throw await XI("Create Installation",u)}/**
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
 */function tE(n){return new Promise(e=>{setTimeout(e,n)})}/**
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
 */function UN(n){return btoa(String.fromCharCode(...n)).replace(/\+/g,"-").replace(/\//g,"_")}/**
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
 */const FN=/^[cdef][\w-]{21}$/,il="";function BN(){try{const n=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(n),n[0]=112+n[0]%16;const t=qN(n);return FN.test(t)?t:il}catch{return il}}function qN(n){return UN(n).substr(0,22)}/**
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
 */function mc(n){return`${n.appName}!${n.appId}`}/**
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
 */const nE=new Map;function rE(n,e){const t=mc(n);sE(t,e),$N(t,e)}function sE(n,e){const t=nE.get(n);if(t)for(const r of t)r(e)}function $N(n,e){const t=jN();t&&t.postMessage({key:n,fid:e}),HN()}let Xn=null;function jN(){return!Xn&&"BroadcastChannel"in self&&(Xn=new BroadcastChannel("[Firebase] FID Change"),Xn.onmessage=n=>{sE(n.data.key,n.data.fid)}),Xn}function HN(){nE.size===0&&Xn&&(Xn.close(),Xn=null)}/**
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
 */const GN="firebase-installations-database",zN=1,pr="firebase-installations-store";let fu=null;function Lh(){return fu||(fu=ka(GN,zN,{upgrade:(n,e)=>{switch(e){case 0:n.createObjectStore(pr)}}})),fu}async function ba(n,e){const t=mc(n),s=(await Lh()).transaction(pr,"readwrite"),i=s.objectStore(pr),o=await i.get(t);return await i.put(e,t),await s.done,(!o||o.fid!==e.fid)&&rE(n,e.fid),e}async function iE(n){const e=mc(n),r=(await Lh()).transaction(pr,"readwrite");await r.objectStore(pr).delete(e),await r.done}async function gc(n,e){const t=mc(n),s=(await Lh()).transaction(pr,"readwrite"),i=s.objectStore(pr),o=await i.get(t),c=e(o);return c===void 0?await i.delete(t):await i.put(c,t),await s.done,c&&(!o||o.fid!==c.fid)&&rE(n,c.fid),c}/**
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
 */async function Uh(n){let e;const t=await gc(n.appConfig,r=>{const s=WN(r),i=KN(n,s);return e=i.registrationPromise,i.installationEntry});return t.fid===il?{installationEntry:await e}:{installationEntry:t,registrationPromise:e}}function WN(n){const e=n||{fid:BN(),registrationStatus:0};return oE(e)}function KN(n,e){if(e.registrationStatus===0){if(!navigator.onLine){const s=Promise.reject(fr.create("app-offline"));return{installationEntry:e,registrationPromise:s}}const t={fid:e.fid,registrationStatus:1,registrationTime:Date.now()},r=QN(n,t);return{installationEntry:t,registrationPromise:r}}else return e.registrationStatus===1?{installationEntry:e,registrationPromise:JN(n)}:{installationEntry:e}}async function QN(n,e){try{const t=await LN(n,e);return ba(n.appConfig,t)}catch(t){throw QI(t)&&t.customData.serverCode===409?await iE(n.appConfig):await ba(n.appConfig,{fid:e.fid,registrationStatus:0}),t}}async function JN(n){let e=await gm(n.appConfig);for(;e.registrationStatus===1;)await tE(100),e=await gm(n.appConfig);if(e.registrationStatus===0){const{installationEntry:t,registrationPromise:r}=await Uh(n);return r||t}return e}function gm(n){return gc(n,e=>{if(!e)throw fr.create("installation-not-found");return oE(e)})}function oE(n){return YN(n)?{fid:n.fid,registrationStatus:0}:n}function YN(n){return n.registrationStatus===1&&n.registrationTime+zI<Date.now()}/**
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
 */async function XN({appConfig:n,heartbeatServiceProvider:e},t){const r=ZN(n,t),s=ON(n,t),i=e.getImmediate({optional:!0});if(i){const l=await i.getHeartbeatsHeader();l&&s.append("x-firebase-client",l)}const o={installation:{sdkVersion:WI,appId:n.appId}},c={method:"POST",headers:s,body:JSON.stringify(o)},u=await eE(()=>fetch(r,c));if(u.ok){const l=await u.json();return YI(l)}else throw await XI("Generate Auth Token",u)}function ZN(n,{fid:e}){return`${JI(n)}/${e}/authTokens:generate`}/**
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
 */async function Fh(n,e=!1){let t;const r=await gc(n.appConfig,i=>{if(!aE(i))throw fr.create("not-registered");const o=i.authToken;if(!e&&nD(o))return i;if(o.requestStatus===1)return t=eD(n,e),i;{if(!navigator.onLine)throw fr.create("app-offline");const c=sD(i);return t=tD(n,c),c}});return t?await t:r.authToken}async function eD(n,e){let t=await _m(n.appConfig);for(;t.authToken.requestStatus===1;)await tE(100),t=await _m(n.appConfig);const r=t.authToken;return r.requestStatus===0?Fh(n,e):r}function _m(n){return gc(n,e=>{if(!aE(e))throw fr.create("not-registered");const t=e.authToken;return iD(t)?{...e,authToken:{requestStatus:0}}:e})}async function tD(n,e){try{const t=await XN(n,e),r={...e,authToken:t};return await ba(n.appConfig,r),t}catch(t){if(QI(t)&&(t.customData.serverCode===401||t.customData.serverCode===404))await iE(n.appConfig);else{const r={...e,authToken:{requestStatus:0}};await ba(n.appConfig,r)}throw t}}function aE(n){return n!==void 0&&n.registrationStatus===2}function nD(n){return n.requestStatus===2&&!rD(n)}function rD(n){const e=Date.now();return e<n.creationTime||n.creationTime+n.expiresIn<e+kN}function sD(n){const e={requestStatus:1,requestTime:Date.now()};return{...n,authToken:e}}function iD(n){return n.requestStatus===1&&n.requestTime+zI<Date.now()}/**
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
 */async function oD(n){const e=n,{installationEntry:t,registrationPromise:r}=await Uh(e);return r?r.catch(console.error):Fh(e).catch(console.error),t.fid}/**
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
 */async function aD(n,e=!1){const t=n;return await cD(t),(await Fh(t,e)).token}async function cD(n){const{registrationPromise:e}=await Uh(n);e&&await e}/**
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
 */function uD(n){if(!n||!n.options)throw pu("App Configuration");if(!n.name)throw pu("App Name");const e=["projectId","apiKey","appId"];for(const t of e)if(!n.options[t])throw pu(t);return{appName:n.name,projectId:n.options.projectId,apiKey:n.options.apiKey,appId:n.options.appId}}function pu(n){return fr.create("missing-app-config-values",{valueName:n})}/**
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
 */const cE="installations",lD="installations-internal",hD=n=>{const e=n.getProvider("app").getImmediate(),t=uD(e),r=Ut(e,"heartbeat");return{app:e,appConfig:t,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},dD=n=>{const e=n.getProvider("app").getImmediate(),t=Ut(e,cE).getImmediate();return{getId:()=>oD(t),getToken:s=>aD(t,s)}};function fD(){rt(new Ye(cE,hD,"PUBLIC")),rt(new Ye(lD,dD,"PRIVATE"))}fD();Fe(GI,Mh);Fe(GI,Mh,"esm2020");/**
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
 */const pD="/firebase-messaging-sw.js",mD="/firebase-cloud-messaging-push-scope",uE="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",gD="https://fcmregistrations.googleapis.com/v1",lE="google.c.a.c_id",_D="google.c.a.c_l",yD="google.c.a.ts",ID="google.c.a.e",ym=1e4;var Im;(function(n){n[n.DATA_MESSAGE=1]="DATA_MESSAGE",n[n.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION"})(Im||(Im={}));/**
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
 */var xi;(function(n){n.PUSH_RECEIVED="push-received",n.NOTIFICATION_CLICKED="notification-clicked"})(xi||(xi={}));/**
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
 */function Bt(n){const e=new Uint8Array(n);return btoa(String.fromCharCode(...e)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function ED(n){const e="=".repeat((4-n.length%4)%4),t=(n+e).replace(/\-/g,"+").replace(/_/g,"/"),r=atob(t),s=new Uint8Array(r.length);for(let i=0;i<r.length;++i)s[i]=r.charCodeAt(i);return s}/**
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
 */const mu="fcm_token_details_db",wD=5,Em="fcm_token_object_Store";async function TD(n){if("databases"in indexedDB&&!(await indexedDB.databases()).map(i=>i.name).includes(mu))return null;let e=null;return(await ka(mu,wD,{upgrade:async(r,s,i,o)=>{if(s<2||!r.objectStoreNames.contains(Em))return;const c=o.objectStore(Em),u=await c.index("fcmSenderId").get(n);if(await c.clear(),!!u){if(s===2){const l=u;if(!l.auth||!l.p256dh||!l.endpoint)return;e={token:l.fcmToken,createTime:l.createTime??Date.now(),subscriptionOptions:{auth:l.auth,p256dh:l.p256dh,endpoint:l.endpoint,swScope:l.swScope,vapidKey:typeof l.vapidKey=="string"?l.vapidKey:Bt(l.vapidKey)}}}else if(s===3){const l=u;e={token:l.fcmToken,createTime:l.createTime,subscriptionOptions:{auth:Bt(l.auth),p256dh:Bt(l.p256dh),endpoint:l.endpoint,swScope:l.swScope,vapidKey:Bt(l.vapidKey)}}}else if(s===4){const l=u;e={token:l.fcmToken,createTime:l.createTime,subscriptionOptions:{auth:Bt(l.auth),p256dh:Bt(l.p256dh),endpoint:l.endpoint,swScope:l.swScope,vapidKey:Bt(l.vapidKey)}}}}}})).close(),await Gc(mu),await Gc("fcm_vapid_details_db"),await Gc("undefined"),vD(e)?e:null}function vD(n){if(!n||!n.subscriptionOptions)return!1;const{subscriptionOptions:e}=n;return typeof n.createTime=="number"&&n.createTime>0&&typeof n.token=="string"&&n.token.length>0&&typeof e.auth=="string"&&e.auth.length>0&&typeof e.p256dh=="string"&&e.p256dh.length>0&&typeof e.endpoint=="string"&&e.endpoint.length>0&&typeof e.swScope=="string"&&e.swScope.length>0&&typeof e.vapidKey=="string"&&e.vapidKey.length>0}/**
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
 */const AD="firebase-messaging-database",RD=1,mr="firebase-messaging-store";let gu=null;function Bh(){return gu||(gu=ka(AD,RD,{upgrade:(n,e)=>{switch(e){case 0:n.createObjectStore(mr)}}})),gu}async function hE(n){const e=$h(n),r=await(await Bh()).transaction(mr).objectStore(mr).get(e);if(r)return r;{const s=await TD(n.appConfig.senderId);if(s)return await qh(n,s),s}}async function qh(n,e){const t=$h(n),s=(await Bh()).transaction(mr,"readwrite");return await s.objectStore(mr).put(e,t),await s.done,e}async function bD(n){const e=$h(n),r=(await Bh()).transaction(mr,"readwrite");await r.objectStore(mr).delete(e),await r.done}function $h({appConfig:n}){return n.appId}/**
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
 */const SD={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."},Be=new Vn("messaging","Messaging",SD);/**
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
 */async function PD(n,e){const t=await Hh(n),r=fE(e),s={method:"POST",headers:t,body:JSON.stringify(r)};let i;try{i=await(await fetch(jh(n.appConfig),s)).json()}catch(o){throw Be.create("token-subscribe-failed",{errorInfo:o==null?void 0:o.toString()})}if(i.error){const o=i.error.message;throw Be.create("token-subscribe-failed",{errorInfo:o})}if(!i.token)throw Be.create("token-subscribe-no-token");return i.token}async function CD(n,e){const t=await Hh(n),r=fE(e.subscriptionOptions),s={method:"PATCH",headers:t,body:JSON.stringify(r)};let i;try{i=await(await fetch(`${jh(n.appConfig)}/${e.token}`,s)).json()}catch(o){throw Be.create("token-update-failed",{errorInfo:o==null?void 0:o.toString()})}if(i.error){const o=i.error.message;throw Be.create("token-update-failed",{errorInfo:o})}if(!i.token)throw Be.create("token-update-no-token");return i.token}async function dE(n,e){const r={method:"DELETE",headers:await Hh(n)};try{const i=await(await fetch(`${jh(n.appConfig)}/${e}`,r)).json();if(i.error){const o=i.error.message;throw Be.create("token-unsubscribe-failed",{errorInfo:o})}}catch(s){throw Be.create("token-unsubscribe-failed",{errorInfo:s==null?void 0:s.toString()})}}function jh({projectId:n}){return`${gD}/projects/${n}/registrations`}async function Hh({appConfig:n,installations:e}){const t=await e.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":n.apiKey,"x-goog-firebase-installations-auth":`FIS ${t}`})}function fE({p256dh:n,auth:e,endpoint:t,vapidKey:r}){const s={web:{endpoint:t,auth:e,p256dh:n}};return r!==uE&&(s.web.applicationPubKey=r),s}/**
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
 */const kD=7*24*60*60*1e3;async function ND(n){const e=await OD(n.swRegistration,n.vapidKey),t={vapidKey:n.vapidKey,swScope:n.swRegistration.scope,endpoint:e.endpoint,auth:Bt(e.getKey("auth")),p256dh:Bt(e.getKey("p256dh"))},r=await hE(n.firebaseDependencies);if(r){if(xD(r.subscriptionOptions,t))return Date.now()>=r.createTime+kD?VD(n,{token:r.token,createTime:Date.now(),subscriptionOptions:t}):r.token;try{await dE(n.firebaseDependencies,r.token)}catch(s){console.warn(s)}return wm(n.firebaseDependencies,t)}else return wm(n.firebaseDependencies,t)}async function DD(n){const e=await hE(n.firebaseDependencies);e&&(await dE(n.firebaseDependencies,e.token),await bD(n.firebaseDependencies));const t=await n.swRegistration.pushManager.getSubscription();return t?t.unsubscribe():!0}async function VD(n,e){try{const t=await CD(n.firebaseDependencies,e),r={...e,token:t,createTime:Date.now()};return await qh(n.firebaseDependencies,r),t}catch(t){throw t}}async function wm(n,e){const r={token:await PD(n,e),createTime:Date.now(),subscriptionOptions:e};return await qh(n,r),r.token}async function OD(n,e){const t=await n.pushManager.getSubscription();return t||n.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:ED(e)})}function xD(n,e){const t=e.vapidKey===n.vapidKey,r=e.endpoint===n.endpoint,s=e.auth===n.auth,i=e.p256dh===n.p256dh;return t&&r&&s&&i}/**
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
 */function Tm(n){const e={from:n.from,collapseKey:n.collapse_key,messageId:n.fcmMessageId};return MD(e,n),LD(e,n),UD(e,n),e}function MD(n,e){if(!e.notification)return;n.notification={};const t=e.notification.title;t&&(n.notification.title=t);const r=e.notification.body;r&&(n.notification.body=r);const s=e.notification.image;s&&(n.notification.image=s);const i=e.notification.icon;i&&(n.notification.icon=i)}function LD(n,e){e.data&&(n.data=e.data)}function UD(n,e){var s,i,o,c;if(!e.fcmOptions&&!((s=e.notification)!=null&&s.click_action))return;n.fcmOptions={};const t=((i=e.fcmOptions)==null?void 0:i.link)??((o=e.notification)==null?void 0:o.click_action);t&&(n.fcmOptions.link=t);const r=(c=e.fcmOptions)==null?void 0:c.analytics_label;r&&(n.fcmOptions.analyticsLabel=r)}/**
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
 */function FD(n){return typeof n=="object"&&!!n&&lE in n}/**
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
 */function BD(n){if(!n||!n.options)throw _u("App Configuration Object");if(!n.name)throw _u("App Name");const e=["projectId","apiKey","appId","messagingSenderId"],{options:t}=n;for(const r of e)if(!t[r])throw _u(r);return{appName:n.name,projectId:t.projectId,apiKey:t.apiKey,appId:t.appId,senderId:t.messagingSenderId}}function _u(n){return Be.create("missing-app-config-values",{valueName:n})}/**
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
 */class qD{constructor(e,t,r){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const s=BD(e);this.firebaseDependencies={app:e,appConfig:s,installations:t,analyticsProvider:r}}_delete(){return Promise.resolve()}}/**
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
 */async function pE(n){try{n.swRegistration=await navigator.serviceWorker.register(pD,{scope:mD}),n.swRegistration.update().catch(()=>{}),await $D(n.swRegistration)}catch(e){throw Be.create("failed-service-worker-registration",{browserErrorMessage:e==null?void 0:e.message})}}async function $D(n){return new Promise((e,t)=>{const r=setTimeout(()=>t(new Error(`Service worker not registered after ${ym} ms`)),ym),s=n.installing||n.waiting;n.active?(clearTimeout(r),e()):s?s.onstatechange=i=>{var o;((o=i.target)==null?void 0:o.state)==="activated"&&(s.onstatechange=null,clearTimeout(r),e())}:(clearTimeout(r),t(new Error("No incoming service worker found.")))})}/**
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
 */async function jD(n,e){if(!e&&!n.swRegistration&&await pE(n),!(!e&&n.swRegistration)){if(!(e instanceof ServiceWorkerRegistration))throw Be.create("invalid-sw-registration");n.swRegistration=e}}/**
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
 */async function HD(n,e){e?n.vapidKey=e:n.vapidKey||(n.vapidKey=uE)}/**
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
 */async function mE(n,e){if(!navigator)throw Be.create("only-available-in-window");if(Notification.permission==="default"&&await Notification.requestPermission(),Notification.permission!=="granted")throw Be.create("permission-blocked");return await HD(n,e==null?void 0:e.vapidKey),await jD(n,e==null?void 0:e.serviceWorkerRegistration),ND(n)}/**
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
 */async function GD(n,e,t){const r=zD(e);(await n.firebaseDependencies.analyticsProvider.get()).logEvent(r,{message_id:t[lE],message_name:t[_D],message_time:t[yD],message_device_time:Math.floor(Date.now()/1e3)})}function zD(n){switch(n){case xi.NOTIFICATION_CLICKED:return"notification_open";case xi.PUSH_RECEIVED:return"notification_foreground";default:throw new Error}}/**
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
 */async function WD(n,e){const t=e.data;if(!t.isFirebaseMessaging)return;n.onMessageHandler&&t.messageType===xi.PUSH_RECEIVED&&(typeof n.onMessageHandler=="function"?n.onMessageHandler(Tm(t)):n.onMessageHandler.next(Tm(t)));const r=t.data;FD(r)&&r[ID]==="1"&&await GD(n,t.messageType,r)}const vm="@firebase/messaging",Am="0.12.23";/**
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
 */const KD=n=>{const e=new qD(n.getProvider("app").getImmediate(),n.getProvider("installations-internal").getImmediate(),n.getProvider("analytics-internal"));return navigator.serviceWorker.addEventListener("message",t=>WD(e,t)),e},QD=n=>{const e=n.getProvider("messaging").getImmediate();return{getToken:r=>mE(e,r)}};function JD(){rt(new Ye("messaging",KD,"PUBLIC")),rt(new Ye("messaging-internal",QD,"PRIVATE")),Fe(vm,Am),Fe(vm,Am,"esm2020")}/**
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
 */async function Zs(){try{await Mm()}catch{return!1}return typeof window<"u"&&Li()&&lw()&&"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&"fetch"in window&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}/**
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
 */async function YD(n){if(!navigator)throw Be.create("only-available-in-window");return n.swRegistration||await pE(n),DD(n)}/**
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
 */function XD(n,e){if(!navigator)throw Be.create("only-available-in-window");return n.onMessageHandler=e,()=>{n.onMessageHandler=null}}/**
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
 */function yu(n=Ui()){return Zs().then(e=>{if(!e)throw Be.create("unsupported-browser")},e=>{throw Be.create("indexed-db-unsupported")}),Ut(q(n),"messaging").getImmediate()}async function ZD(n,e){return n=q(n),mE(n,e)}function eV(n){return n=q(n),YD(n)}function tV(n,e){return n=q(n),XD(n,e)}JD();class _c extends Xi{constructor(){super(),Zs().then(e=>{if(!e)return;const t=yu();tV(t,r=>this.handleNotificationReceived(r))})}async checkPermissions(){return await Zs()?{receive:this.convertNotificationPermissionToPermissionState(Notification.permission)}:{receive:"denied"}}async requestPermissions(){if(!await Zs())return{receive:"denied"};const t=await Notification.requestPermission();return{receive:this.convertNotificationPermissionToPermissionState(t)}}async isSupported(){return{isSupported:await Zs()}}async getToken(e){const t=yu();return{token:await ZD(t,{vapidKey:e.vapidKey,serviceWorkerRegistration:e.serviceWorkerRegistration})}}async deleteToken(){const e=yu();await eV(e)}async getDeliveredNotifications(){this.throwUnimplementedError()}async removeDeliveredNotifications(e){this.throwUnimplementedError()}async removeAllDeliveredNotifications(){this.throwUnimplementedError()}async subscribeToTopic(e){this.throwUnimplementedError()}async unsubscribeFromTopic(e){this.throwUnimplementedError()}async createChannel(e){this.throwUnimplementedError()}async deleteChannel(e){this.throwUnimplementedError()}async listChannels(){this.throwUnimplementedError()}handleNotificationReceived(e){const r={notification:this.createNotificationResult(e)};this.notifyListeners(_c.notificationReceivedEvent,r)}createNotificationResult(e){var t,r,s;return{body:(t=e.notification)===null||t===void 0?void 0:t.body,data:e.data,id:e.messageId,image:(r=e.notification)===null||r===void 0?void 0:r.image,title:(s=e.notification)===null||s===void 0?void 0:s.title}}convertNotificationPermissionToPermissionState(e){let t="prompt";switch(e){case"granted":t="granted";break;case"denied":t="denied";break}return t}throwUnimplementedError(){throw this.unimplemented("Not implemented on web.")}}_c.notificationReceivedEvent="notificationReceived";const nV=Object.freeze(Object.defineProperty({__proto__:null,FirebaseMessagingWeb:_c},Symbol.toStringTag,{value:"Module"}));export{dP as $,Rh as A,Sk as B,Ju as C,DV as D,hV as E,MV as F,pt as G,pV as H,fV as I,dV as J,PV as K,vV as L,TV as M,cV as N,_e as O,mV as P,CV as Q,IV as R,RV as S,re as T,bV as U,wV as V,Xi as W,EV as X,gV as Y,uV as Z,Rm as _,aV as a,rP as a0,lP as a1,kV as a2,LV as a3,rC as b,VV as c,iV as d,el as e,$0 as f,pP as g,gI as h,ET as i,m0 as j,wI as k,yV as l,SV as m,oV as n,OV as o,_V as p,lV as q,Yi as r,AV as s,rb as t,NV as u,kC as v,No as w,OC as x,VC as y,xV as z};
