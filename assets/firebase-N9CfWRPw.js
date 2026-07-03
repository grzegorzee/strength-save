const OI=function(){const e=typeof document<"u"&&document.createElement("link").relList;return e&&e.supports&&e.supports("modulepreload")?"modulepreload":"preload"}(),xI=function(n){return"/strength-save/"+n},ud={},xp=function(e,t,r){let s=Promise.resolve();if(t&&t.length>0){document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),c=(o==null?void 0:o.nonce)||(o==null?void 0:o.getAttribute("nonce"));s=Promise.allSettled(t.map(u=>{if(u=xI(u),u in ud)return;ud[u]=!0;const l=u.endsWith(".css"),f=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${u}"]${f}`))return;const p=document.createElement("link");if(p.rel=l?"stylesheet":OI,l||(p.as="script"),p.crossOrigin="",p.href=u,c&&p.setAttribute("nonce",c),document.head.appendChild(p),l)return new Promise((g,v)=>{p.addEventListener("load",g),p.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${u}`)))})}))}function i(o){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=o,window.dispatchEvent(c),!c.defaultPrevented)throw o}return s.then(o=>{for(const c of o||[])c.status==="rejected"&&i(c.reason);return e().catch(i)})},LI=()=>{};var ld={};/**
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
 */const Lp=function(n){const e=[];let t=0;for(let r=0;r<n.length;r++){let s=n.charCodeAt(r);s<128?e[t++]=s:s<2048?(e[t++]=s>>6|192,e[t++]=s&63|128):(s&64512)===55296&&r+1<n.length&&(n.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(n.charCodeAt(++r)&1023),e[t++]=s>>18|240,e[t++]=s>>12&63|128,e[t++]=s>>6&63|128,e[t++]=s&63|128):(e[t++]=s>>12|224,e[t++]=s>>6&63|128,e[t++]=s&63|128)}return e},MI=function(n){const e=[];let t=0,r=0;for(;t<n.length;){const s=n[t++];if(s<128)e[r++]=String.fromCharCode(s);else if(s>191&&s<224){const i=n[t++];e[r++]=String.fromCharCode((s&31)<<6|i&63)}else if(s>239&&s<365){const i=n[t++],o=n[t++],c=n[t++],u=((s&7)<<18|(i&63)<<12|(o&63)<<6|c&63)-65536;e[r++]=String.fromCharCode(55296+(u>>10)),e[r++]=String.fromCharCode(56320+(u&1023))}else{const i=n[t++],o=n[t++];e[r++]=String.fromCharCode((s&15)<<12|(i&63)<<6|o&63)}}return e.join("")},Mp={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<n.length;s+=3){const i=n[s],o=s+1<n.length,c=o?n[s+1]:0,u=s+2<n.length,l=u?n[s+2]:0,f=i>>2,p=(i&3)<<4|c>>4;let g=(c&15)<<2|l>>6,v=l&63;u||(v=64,o||(g=64)),r.push(t[f],t[p],t[g],t[v])}return r.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(Lp(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):MI(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<n.length;){const i=t[n.charAt(s++)],c=s<n.length?t[n.charAt(s)]:0;++s;const l=s<n.length?t[n.charAt(s)]:64;++s;const p=s<n.length?t[n.charAt(s)]:64;if(++s,i==null||c==null||l==null||p==null)throw new FI;const g=i<<2|c>>4;if(r.push(g),l!==64){const v=c<<4&240|l>>2;if(r.push(v),p!==64){const C=l<<6&192|p;r.push(C)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class FI extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const UI=function(n){const e=Lp(n);return Mp.encodeByteArray(e,!0)},Co=function(n){return UI(n).replace(/\./g,"")},Fp=function(n){try{return Mp.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
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
 */function Up(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const BI=()=>Up().__FIREBASE_DEFAULTS__,qI=()=>{if(typeof process>"u"||typeof ld>"u")return;const n=ld.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},$I=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=n&&Fp(n[1]);return e&&JSON.parse(e)},ra=()=>{try{return LI()||BI()||qI()||$I()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},Bp=n=>{var e,t;return(t=(e=ra())==null?void 0:e.emulatorHosts)==null?void 0:t[n]},qp=n=>{const e=Bp(n);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),r]:[e.substring(0,t),r]},$p=()=>{var n;return(n=ra())==null?void 0:n.config},jp=n=>{var e;return(e=ra())==null?void 0:e[`_${n}`]};/**
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
 */class jI{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,r))}}}/**
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
 */function kt(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function sa(n){return(await fetch(n,{credentials:"include"})).ok}/**
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
 */function GI(n,e){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},r=e||"demo-project",s=n.iat||0,i=n.sub||n.user_id;if(!i)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${r}`,aud:r,iat:s,exp:s+3600,auth_time:s,sub:i,user_id:i,firebase:{sign_in_provider:"custom",identities:{}},...n};return[Co(JSON.stringify(t)),Co(JSON.stringify(o)),""].join(".")}const qs={};function zI(){const n={prod:[],emulator:[]};for(const e of Object.keys(qs))qs[e]?n.emulator.push(e):n.prod.push(e);return n}function WI(n){let e=document.getElementById(n),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",n),t=!0),{created:t,element:e}}let hd=!1;function Pu(n,e){if(typeof window>"u"||typeof document>"u"||!kt(window.location.host)||qs[n]===e||qs[n]||hd)return;qs[n]=e;function t(g){return`__firebase__banner__${g}`}const r="__firebase__banner",i=zI().prod.length>0;function o(){const g=document.getElementById(r);g&&g.remove()}function c(g){g.style.display="flex",g.style.background="#7faaf0",g.style.position="fixed",g.style.bottom="5px",g.style.left="5px",g.style.padding=".5em",g.style.borderRadius="5px",g.style.alignItems="center"}function u(g,v){g.setAttribute("width","24"),g.setAttribute("id",v),g.setAttribute("height","24"),g.setAttribute("viewBox","0 0 24 24"),g.setAttribute("fill","none"),g.style.marginLeft="-6px"}function l(){const g=document.createElement("span");return g.style.cursor="pointer",g.style.marginLeft="16px",g.style.fontSize="24px",g.innerHTML=" &times;",g.onclick=()=>{hd=!0,o()},g}function f(g,v){g.setAttribute("id",v),g.innerText="Learn more",g.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",g.setAttribute("target","__blank"),g.style.paddingLeft="5px",g.style.textDecoration="underline"}function p(){const g=WI(r),v=t("text"),C=document.getElementById(v)||document.createElement("span"),N=t("learnmore"),k=document.getElementById(N)||document.createElement("a"),j=t("preprendIcon"),q=document.getElementById(j)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(g.created){const B=g.element;c(B),f(k,N);const W=l();u(q,j),B.append(q,C,k,W),document.body.appendChild(B)}i?(C.innerText="Preview backend disconnected.",q.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(q.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,C.innerText="Preview backend running in this workspace."),C.setAttribute("id",v)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",p):p()}/**
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
 */function be(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function KI(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(be())}function Gp(){var e;const n=(e=ra())==null?void 0:e.forceEnvironment;if(n==="node")return!0;if(n==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function HI(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function QI(){const n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function JI(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function YI(){const n=be();return n.indexOf("MSIE ")>=0||n.indexOf("Trident/")>=0}function zp(){return!Gp()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function Wp(){return!Gp()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Cu(){try{return typeof indexedDB=="object"}catch{return!1}}function Kp(){return new Promise((n,e)=>{try{let t=!0;const r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),t||self.indexedDB.deleteDatabase(r),n(!0)},s.onupgradeneeded=()=>{t=!1},s.onerror=()=>{var i;e(((i=s.error)==null?void 0:i.message)||"")}}catch(t){e(t)}})}function XI(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
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
 */const ZI="FirebaseError";class mt extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name=ZI,Object.setPrototypeOf(this,mt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,ar.prototype.create)}}class ar{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r}create(e,...t){const r=t[0]||{},s=`${this.service}/${e}`,i=this.errors[e],o=i?ew(i,r):"Error",c=`${this.serviceName}: ${o} (${s}).`;return new mt(s,c,r)}}function ew(n,e){return n.replace(tw,(t,r)=>{const s=e[r];return s!=null?String(s):`<${r}?>`})}const tw=/\{\$([^}]+)}/g;function nw(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function Wn(n,e){if(n===e)return!0;const t=Object.keys(n),r=Object.keys(e);for(const s of t){if(!r.includes(s))return!1;const i=n[s],o=e[s];if(dd(i)&&dd(o)){if(!Wn(i,o))return!1}else if(i!==o)return!1}for(const s of r)if(!t.includes(s))return!1;return!0}function dd(n){return n!==null&&typeof n=="object"}/**
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
 */function Zr(n){const e=[];for(const[t,r]of Object.entries(n))Array.isArray(r)?r.forEach(s=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(s))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function Vs(n){const e={};return n.replace(/^\?/,"").split("&").forEach(r=>{if(r){const[s,i]=r.split("=");e[decodeURIComponent(s)]=decodeURIComponent(i)}}),e}function Os(n){const e=n.indexOf("?");if(!e)return"";const t=n.indexOf("#",e);return n.substring(e,t>0?t:void 0)}function rw(n,e){const t=new sw(n,e);return t.subscribe.bind(t)}class sw{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,r){let s;if(e===void 0&&t===void 0&&r===void 0)throw new Error("Missing Observer.");iw(e,["next","error","complete"])?s=e:s={next:e,error:t,complete:r},s.next===void 0&&(s.next=pc),s.error===void 0&&(s.error=pc),s.complete===void 0&&(s.complete=pc);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?s.error(this.finalError):s.complete()}catch{}}),this.observers.push(s),i}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function iw(n,e){if(typeof n!="object"||n===null)return!1;for(const t of e)if(t in n&&typeof n[t]=="function")return!0;return!1}function pc(){}/**
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
 */function G(n){return n&&n._delegate?n._delegate:n}class st{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const Vn="[DEFAULT]";/**
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
 */class ow{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const r=new jI;if(this.instancesDeferred.set(t,r),this.isInitialized(t)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:t});s&&r.resolve(s)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),r=(e==null?void 0:e.optional)??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(s){if(r)return null;throw s}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(cw(e))try{this.getOrInitializeService({instanceIdentifier:Vn})}catch{}for(const[t,r]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(t);try{const i=this.getOrInitializeService({instanceIdentifier:s});r.resolve(i)}catch{}}}}clearInstance(e=Vn){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Vn){return this.instances.has(e)}getOptions(e=Vn){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:r,options:t});for(const[i,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(i);r===c&&o.resolve(s)}return s}onInit(e,t){const r=this.normalizeInstanceIdentifier(t),s=this.onInitCallbacks.get(r)??new Set;s.add(e),this.onInitCallbacks.set(r,s);const i=this.instances.get(r);return i&&e(i,r),()=>{s.delete(e)}}invokeOnInitCallbacks(e,t){const r=this.onInitCallbacks.get(t);if(r)for(const s of r)try{s(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:aw(e),options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=Vn){return this.component?this.component.multipleInstances?e:Vn:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function aw(n){return n===Vn?void 0:n}function cw(n){return n.instantiationMode==="EAGER"}/**
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
 */class uw{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new ow(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
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
 */var X;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(X||(X={}));const lw={debug:X.DEBUG,verbose:X.VERBOSE,info:X.INFO,warn:X.WARN,error:X.ERROR,silent:X.SILENT},hw=X.INFO,dw={[X.DEBUG]:"log",[X.VERBOSE]:"log",[X.INFO]:"info",[X.WARN]:"warn",[X.ERROR]:"error"},fw=(n,e,...t)=>{if(e<n.logLevel)return;const r=new Date().toISOString(),s=dw[e];if(s)console[s](`[${r}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class ku{constructor(e){this.name=e,this._logLevel=hw,this._logHandler=fw,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in X))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?lw[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,X.DEBUG,...e),this._logHandler(this,X.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,X.VERBOSE,...e),this._logHandler(this,X.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,X.INFO,...e),this._logHandler(this,X.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,X.WARN,...e),this._logHandler(this,X.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,X.ERROR,...e),this._logHandler(this,X.ERROR,...e)}}const pw=(n,e)=>e.some(t=>n instanceof t);let fd,pd;function mw(){return fd||(fd=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function gw(){return pd||(pd=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Hp=new WeakMap,$c=new WeakMap,Qp=new WeakMap,mc=new WeakMap,Nu=new WeakMap;function _w(n){const e=new Promise((t,r)=>{const s=()=>{n.removeEventListener("success",i),n.removeEventListener("error",o)},i=()=>{t(Lt(n.result)),s()},o=()=>{r(n.error),s()};n.addEventListener("success",i),n.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&Hp.set(t,n)}).catch(()=>{}),Nu.set(e,n),e}function yw(n){if($c.has(n))return;const e=new Promise((t,r)=>{const s=()=>{n.removeEventListener("complete",i),n.removeEventListener("error",o),n.removeEventListener("abort",o)},i=()=>{t(),s()},o=()=>{r(n.error||new DOMException("AbortError","AbortError")),s()};n.addEventListener("complete",i),n.addEventListener("error",o),n.addEventListener("abort",o)});$c.set(n,e)}let jc={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return $c.get(n);if(e==="objectStoreNames")return n.objectStoreNames||Qp.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return Lt(n[e])},set(n,e,t){return n[e]=t,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function Iw(n){jc=n(jc)}function ww(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const r=n.call(gc(this),e,...t);return Qp.set(r,e.sort?e.sort():[e]),Lt(r)}:gw().includes(n)?function(...e){return n.apply(gc(this),e),Lt(Hp.get(this))}:function(...e){return Lt(n.apply(gc(this),e))}}function Ew(n){return typeof n=="function"?ww(n):(n instanceof IDBTransaction&&yw(n),pw(n,mw())?new Proxy(n,jc):n)}function Lt(n){if(n instanceof IDBRequest)return _w(n);if(mc.has(n))return mc.get(n);const e=Ew(n);return e!==n&&(mc.set(n,e),Nu.set(e,n)),e}const gc=n=>Nu.get(n);function ia(n,e,{blocked:t,upgrade:r,blocking:s,terminated:i}={}){const o=indexedDB.open(n,e),c=Lt(o);return r&&o.addEventListener("upgradeneeded",u=>{r(Lt(o.result),u.oldVersion,u.newVersion,Lt(o.transaction),u)}),t&&o.addEventListener("blocked",u=>t(u.oldVersion,u.newVersion,u)),c.then(u=>{i&&u.addEventListener("close",()=>i()),s&&u.addEventListener("versionchange",l=>s(l.oldVersion,l.newVersion,l))}).catch(()=>{}),c}function _c(n,{blocked:e}={}){const t=indexedDB.deleteDatabase(n);return e&&t.addEventListener("blocked",r=>e(r.oldVersion,r)),Lt(t).then(()=>{})}const Tw=["get","getKey","getAll","getAllKeys","count"],vw=["put","add","delete","clear"],yc=new Map;function md(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(yc.get(e))return yc.get(e);const t=e.replace(/FromIndex$/,""),r=e!==t,s=vw.includes(t);if(!(t in(r?IDBIndex:IDBObjectStore).prototype)||!(s||Tw.includes(t)))return;const i=async function(o,...c){const u=this.transaction(o,s?"readwrite":"readonly");let l=u.store;return r&&(l=l.index(c.shift())),(await Promise.all([l[t](...c),s&&u.done]))[0]};return yc.set(e,i),i}Iw(n=>({...n,get:(e,t,r)=>md(e,t)||n.get(e,t,r),has:(e,t)=>!!md(e,t)||n.has(e,t)}));/**
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
 */class Aw{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(Rw(t)){const r=t.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(t=>t).join(" ")}}function Rw(n){const e=n.getComponent();return(e==null?void 0:e.type)==="VERSION"}const Gc="@firebase/app",gd="0.14.7";/**
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
 */const Ft=new ku("@firebase/app"),bw="@firebase/app-compat",Sw="@firebase/analytics-compat",Pw="@firebase/analytics",Cw="@firebase/app-check-compat",kw="@firebase/app-check",Nw="@firebase/auth",Dw="@firebase/auth-compat",Vw="@firebase/database",Ow="@firebase/data-connect",xw="@firebase/database-compat",Lw="@firebase/functions",Mw="@firebase/functions-compat",Fw="@firebase/installations",Uw="@firebase/installations-compat",Bw="@firebase/messaging",qw="@firebase/messaging-compat",$w="@firebase/performance",jw="@firebase/performance-compat",Gw="@firebase/remote-config",zw="@firebase/remote-config-compat",Ww="@firebase/storage",Kw="@firebase/storage-compat",Hw="@firebase/firestore",Qw="@firebase/ai",Jw="@firebase/firestore-compat",Yw="firebase",Xw="12.8.0";/**
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
 */const zc="[DEFAULT]",Zw={[Gc]:"fire-core",[bw]:"fire-core-compat",[Pw]:"fire-analytics",[Sw]:"fire-analytics-compat",[kw]:"fire-app-check",[Cw]:"fire-app-check-compat",[Nw]:"fire-auth",[Dw]:"fire-auth-compat",[Vw]:"fire-rtdb",[Ow]:"fire-data-connect",[xw]:"fire-rtdb-compat",[Lw]:"fire-fn",[Mw]:"fire-fn-compat",[Fw]:"fire-iid",[Uw]:"fire-iid-compat",[Bw]:"fire-fcm",[qw]:"fire-fcm-compat",[$w]:"fire-perf",[jw]:"fire-perf-compat",[Gw]:"fire-rc",[zw]:"fire-rc-compat",[Ww]:"fire-gcs",[Kw]:"fire-gcs-compat",[Hw]:"fire-fst",[Jw]:"fire-fst-compat",[Qw]:"fire-vertex","fire-js":"fire-js",[Yw]:"fire-js-all"};/**
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
 */const ko=new Map,eE=new Map,Wc=new Map;function _d(n,e){try{n.container.addComponent(e)}catch(t){Ft.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function ft(n){const e=n.name;if(Wc.has(e))return Ft.debug(`There were multiple attempts to register component ${e}.`),!1;Wc.set(e,n);for(const t of ko.values())_d(t,n);for(const t of eE.values())_d(t,n);return!0}function En(n,e){const t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}function ye(n){return n==null?!1:n.settings!==void 0}/**
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
 */const tE={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},ln=new ar("app","Firebase",tE);/**
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
 */class nE{constructor(e,t,r){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new st("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw ln.create("app-deleted",{appName:this._name})}}/**
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
 */const cr=Xw;function rE(n,e={}){let t=n;typeof e!="object"&&(e={name:e});const r={name:zc,automaticDataCollectionEnabled:!0,...e},s=r.name;if(typeof s!="string"||!s)throw ln.create("bad-app-name",{appName:String(s)});if(t||(t=$p()),!t)throw ln.create("no-options");const i=ko.get(s);if(i){if(Wn(t,i.options)&&Wn(r,i.config))return i;throw ln.create("duplicate-app",{appName:s})}const o=new uw(s);for(const u of Wc.values())o.addComponent(u);const c=new nE(t,r,o);return ko.set(s,c),c}function oa(n=zc){const e=ko.get(n);if(!e&&n===zc&&$p())return rE();if(!e)throw ln.create("no-app",{appName:n});return e}function $e(n,e,t){let r=Zw[n]??n;t&&(r+=`-${t}`);const s=r.match(/\s|\//),i=e.match(/\s|\//);if(s||i){const o=[`Unable to register library "${r}" with version "${e}":`];s&&o.push(`library name "${r}" contains illegal characters (whitespace or "/")`),s&&i&&o.push("and"),i&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Ft.warn(o.join(" "));return}ft(new st(`${r}-version`,()=>({library:r,version:e}),"VERSION"))}/**
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
 */const sE="firebase-heartbeat-database",iE=1,ti="firebase-heartbeat-store";let Ic=null;function Jp(){return Ic||(Ic=ia(sE,iE,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(ti)}catch(t){console.warn(t)}}}}).catch(n=>{throw ln.create("idb-open",{originalErrorMessage:n.message})})),Ic}async function oE(n){try{const t=(await Jp()).transaction(ti),r=await t.objectStore(ti).get(Yp(n));return await t.done,r}catch(e){if(e instanceof mt)Ft.warn(e.message);else{const t=ln.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Ft.warn(t.message)}}}async function yd(n,e){try{const r=(await Jp()).transaction(ti,"readwrite");await r.objectStore(ti).put(e,Yp(n)),await r.done}catch(t){if(t instanceof mt)Ft.warn(t.message);else{const r=ln.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});Ft.warn(r.message)}}}function Yp(n){return`${n.name}!${n.options.appId}`}/**
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
 */const aE=1024,cE=30;class uE{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new hE(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,t;try{const s=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),i=Id();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===i||this._heartbeatsCache.heartbeats.some(o=>o.date===i))return;if(this._heartbeatsCache.heartbeats.push({date:i,agent:s}),this._heartbeatsCache.heartbeats.length>cE){const o=dE(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){Ft.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=Id(),{heartbeatsToSend:r,unsentEntries:s}=lE(this._heartbeatsCache.heartbeats),i=Co(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=t,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),i}catch(t){return Ft.warn(t),""}}}function Id(){return new Date().toISOString().substring(0,10)}function lE(n,e=aE){const t=[];let r=n.slice();for(const s of n){const i=t.find(o=>o.agent===s.agent);if(i){if(i.dates.push(s.date),wd(t)>e){i.dates.pop();break}}else if(t.push({agent:s.agent,dates:[s.date]}),wd(t)>e){t.pop();break}r=r.slice(1)}return{heartbeatsToSend:t,unsentEntries:r}}class hE{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Cu()?Kp().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await oE(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return yd(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return yd(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...e.heartbeats]})}else return}}function wd(n){return Co(JSON.stringify({version:2,heartbeats:n})).length}function dE(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let r=1;r<n.length;r++)n[r].date<t&&(t=n[r].date,e=r);return e}/**
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
 */function fE(n){ft(new st("platform-logger",e=>new Aw(e),"PRIVATE")),ft(new st("heartbeat",e=>new uE(e),"PRIVATE")),$e(Gc,gd,n),$e(Gc,gd,"esm2020"),$e("fire-js","")}fE("");var pE="firebase",mE="12.8.0";/**
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
 */$e(pE,mE,"app");/*! Capacitor: https://capacitorjs.com/ - MIT License */var Or;(function(n){n.Unimplemented="UNIMPLEMENTED",n.Unavailable="UNAVAILABLE"})(Or||(Or={}));class wc extends Error{constructor(e,t,r){super(e),this.message=e,this.code=t,this.data=r}}const gE=n=>{var e,t;return n!=null&&n.androidBridge?"android":!((t=(e=n==null?void 0:n.webkit)===null||e===void 0?void 0:e.messageHandlers)===null||t===void 0)&&t.bridge?"ios":"web"},_E=n=>{const e=n.CapacitorCustomPlatform||null,t=n.Capacitor||{},r=t.Plugins=t.Plugins||{},s=()=>e!==null?e.name:gE(n),i=()=>s()!=="web",o=p=>{const g=l.get(p);return!!(g!=null&&g.platforms.has(s())||c(p))},c=p=>{var g;return(g=t.PluginHeaders)===null||g===void 0?void 0:g.find(v=>v.name===p)},u=p=>n.console.error(p),l=new Map,f=(p,g={})=>{const v=l.get(p);if(v)return console.warn(`Capacitor plugin "${p}" already registered. Cannot register plugins twice.`),v.proxy;const C=s(),N=c(p);let k;const j=async()=>(!k&&C in g?k=typeof g[C]=="function"?k=await g[C]():k=g[C]:e!==null&&!k&&"web"in g&&(k=typeof g.web=="function"?k=await g.web():k=g.web),k),q=(_,I)=>{var T,E;if(N){const R=N==null?void 0:N.methods.find(y=>I===y.name);if(R)return R.rtype==="promise"?y=>t.nativePromise(p,I.toString(),y):(y,Ae)=>t.nativeCallback(p,I.toString(),y,Ae);if(_)return(T=_[I])===null||T===void 0?void 0:T.bind(_)}else{if(_)return(E=_[I])===null||E===void 0?void 0:E.bind(_);throw new wc(`"${p}" plugin is not implemented on ${C}`,Or.Unimplemented)}},B=_=>{let I;const T=(...E)=>{const R=j().then(y=>{const Ae=q(y,_);if(Ae){const at=Ae(...E);return I=at==null?void 0:at.remove,at}else throw new wc(`"${p}.${_}()" is not implemented on ${C}`,Or.Unimplemented)});return _==="addListener"&&(R.remove=async()=>I()),R};return T.toString=()=>`${_.toString()}() { [capacitor code] }`,Object.defineProperty(T,"name",{value:_,writable:!1,configurable:!1}),T},W=B("addListener"),Q=B("removeListener"),J=(_,I)=>{const T=W({eventName:_},I),E=async()=>{const y=await T;Q({eventName:_,callbackId:y},I)},R=new Promise(y=>T.then(()=>y({remove:E})));return R.remove=async()=>{console.warn("Using addListener() without 'await' is deprecated."),await E()},R},w=new Proxy({},{get(_,I){switch(I){case"$$typeof":return;case"toJSON":return()=>({});case"addListener":return N?J:W;case"removeListener":return Q;default:return B(I)}}});return r[p]=w,l.set(p,{name:p,proxy:w,platforms:new Set([...Object.keys(g),...N?[C]:[]])}),w};return t.convertFileSrc||(t.convertFileSrc=p=>p),t.getPlatform=s,t.handleError=u,t.isNativePlatform=i,t.isPluginAvailable=o,t.registerPlugin=f,t.Exception=wc,t.DEBUG=!!t.DEBUG,t.isLoggingEnabled=!!t.isLoggingEnabled,t},yE=n=>n.Capacitor=_E(n),Kc=yE(typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{}),Ti=Kc.registerPlugin;class vi{constructor(){this.listeners={},this.retainedEventArguments={},this.windowListeners={}}addListener(e,t){let r=!1;this.listeners[e]||(this.listeners[e]=[],r=!0),this.listeners[e].push(t);const i=this.windowListeners[e];i&&!i.registered&&this.addWindowListener(i),r&&this.sendRetainedArgumentsForEvent(e);const o=async()=>this.removeListener(e,t);return Promise.resolve({remove:o})}async removeAllListeners(){this.listeners={};for(const e in this.windowListeners)this.removeWindowListener(this.windowListeners[e]);this.windowListeners={}}notifyListeners(e,t,r){const s=this.listeners[e];if(!s){if(r){let i=this.retainedEventArguments[e];i||(i=[]),i.push(t),this.retainedEventArguments[e]=i}return}s.forEach(i=>i(t))}hasListeners(e){var t;return!!(!((t=this.listeners[e])===null||t===void 0)&&t.length)}registerWindowListener(e,t){this.windowListeners[t]={registered:!1,windowEventName:e,pluginEventName:t,handler:r=>{this.notifyListeners(t,r)}}}unimplemented(e="not implemented"){return new Kc.Exception(e,Or.Unimplemented)}unavailable(e="not available"){return new Kc.Exception(e,Or.Unavailable)}async removeListener(e,t){const r=this.listeners[e];if(!r)return;const s=r.indexOf(t);this.listeners[e].splice(s,1),this.listeners[e].length||this.removeWindowListener(this.windowListeners[e])}addWindowListener(e){window.addEventListener(e.windowEventName,e.handler),e.registered=!0}removeWindowListener(e){e&&(window.removeEventListener(e.windowEventName,e.handler),e.registered=!1)}sendRetainedArgumentsForEvent(e){const t=this.retainedEventArguments[e];t&&(delete this.retainedEventArguments[e],t.forEach(r=>{this.notifyListeners(e,r)}))}}const Ed=n=>encodeURIComponent(n).replace(/%(2[346B]|5E|60|7C)/g,decodeURIComponent).replace(/[()]/g,escape),Td=n=>n.replace(/(%[\dA-F]{2})+/gi,decodeURIComponent);class IE extends vi{async getCookies(){const e=document.cookie,t={};return e.split(";").forEach(r=>{if(r.length<=0)return;let[s,i]=r.replace(/=/,"CAP_COOKIE").split("CAP_COOKIE");s=Td(s).trim(),i=Td(i).trim(),t[s]=i}),t}async setCookie(e){try{const t=Ed(e.key),r=Ed(e.value),s=e.expires?`; expires=${e.expires.replace("expires=","")}`:"",i=(e.path||"/").replace("path=",""),o=e.url!=null&&e.url.length>0?`domain=${e.url}`:"";document.cookie=`${t}=${r||""}${s}; path=${i}; ${o};`}catch(t){return Promise.reject(t)}}async deleteCookie(e){try{document.cookie=`${e.key}=; Max-Age=0`}catch(t){return Promise.reject(t)}}async clearCookies(){try{const e=document.cookie.split(";")||[];for(const t of e)document.cookie=t.replace(/^ +/,"").replace(/=.*/,`=;expires=${new Date().toUTCString()};path=/`)}catch(e){return Promise.reject(e)}}async clearAllCookies(){try{await this.clearCookies()}catch(e){return Promise.reject(e)}}}Ti("CapacitorCookies",{web:()=>new IE});const wE=async n=>new Promise((e,t)=>{const r=new FileReader;r.onload=()=>{const s=r.result;e(s.indexOf(",")>=0?s.split(",")[1]:s)},r.onerror=s=>t(s),r.readAsDataURL(n)}),EE=(n={})=>{const e=Object.keys(n);return Object.keys(n).map(s=>s.toLocaleLowerCase()).reduce((s,i,o)=>(s[i]=n[e[o]],s),{})},TE=(n,e=!0)=>n?Object.entries(n).reduce((r,s)=>{const[i,o]=s;let c,u;return Array.isArray(o)?(u="",o.forEach(l=>{c=e?encodeURIComponent(l):l,u+=`${i}=${c}&`}),u.slice(0,-1)):(c=e?encodeURIComponent(o):o,u=`${i}=${c}`),`${r}&${u}`},"").substr(1):null,vE=(n,e={})=>{const t=Object.assign({method:n.method||"GET",headers:n.headers},e),s=EE(n.headers)["content-type"]||"";if(typeof n.data=="string")t.body=n.data;else if(s.includes("application/x-www-form-urlencoded")){const i=new URLSearchParams;for(const[o,c]of Object.entries(n.data||{}))i.set(o,c);t.body=i.toString()}else if(s.includes("multipart/form-data")||n.data instanceof FormData){const i=new FormData;if(n.data instanceof FormData)n.data.forEach((c,u)=>{i.append(u,c)});else for(const c of Object.keys(n.data))i.append(c,n.data[c]);t.body=i;const o=new Headers(t.headers);o.delete("content-type"),t.headers=o}else(s.includes("application/json")||typeof n.data=="object")&&(t.body=JSON.stringify(n.data));return t};class AE extends vi{async request(e){const t=vE(e,e.webFetchExtra),r=TE(e.params,e.shouldEncodeUrlParams),s=r?`${e.url}?${r}`:e.url,i=await fetch(s,t),o=i.headers.get("content-type")||"";let{responseType:c="text"}=i.ok?e:{};o.includes("application/json")&&(c="json");let u,l;switch(c){case"arraybuffer":case"blob":l=await i.blob(),u=await wE(l);break;case"json":u=await i.json();break;case"document":case"text":default:u=await i.text()}const f={};return i.headers.forEach((p,g)=>{f[g]=p}),{data:u,headers:f,status:i.status,url:i.url}}async get(e){return this.request(Object.assign(Object.assign({},e),{method:"GET"}))}async post(e){return this.request(Object.assign(Object.assign({},e),{method:"POST"}))}async put(e){return this.request(Object.assign(Object.assign({},e),{method:"PUT"}))}async patch(e){return this.request(Object.assign(Object.assign({},e),{method:"PATCH"}))}async delete(e){return this.request(Object.assign(Object.assign({},e),{method:"DELETE"}))}}Ti("CapacitorHttp",{web:()=>new AE});var vd;(function(n){n.Dark="DARK",n.Light="LIGHT",n.Default="DEFAULT"})(vd||(vd={}));var Ad;(function(n){n.StatusBar="StatusBar",n.NavigationBar="NavigationBar"})(Ad||(Ad={}));class RE extends vi{async setStyle(){this.unavailable("not available for web")}async setAnimation(){this.unavailable("not available for web")}async show(){this.unavailable("not available for web")}async hide(){this.unavailable("not available for web")}}Ti("SystemBars",{web:()=>new RE});var Rd=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var hn,Xp;(function(){var n;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(w,_){function I(){}I.prototype=_.prototype,w.F=_.prototype,w.prototype=new I,w.prototype.constructor=w,w.D=function(T,E,R){for(var y=Array(arguments.length-2),Ae=2;Ae<arguments.length;Ae++)y[Ae-2]=arguments[Ae];return _.prototype[E].apply(T,y)}}function t(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(r,t),r.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function s(w,_,I){I||(I=0);const T=Array(16);if(typeof _=="string")for(var E=0;E<16;++E)T[E]=_.charCodeAt(I++)|_.charCodeAt(I++)<<8|_.charCodeAt(I++)<<16|_.charCodeAt(I++)<<24;else for(E=0;E<16;++E)T[E]=_[I++]|_[I++]<<8|_[I++]<<16|_[I++]<<24;_=w.g[0],I=w.g[1],E=w.g[2];let R=w.g[3],y;y=_+(R^I&(E^R))+T[0]+3614090360&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+T[1]+3905402710&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+T[2]+606105819&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+T[3]+3250441966&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(R^I&(E^R))+T[4]+4118548399&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+T[5]+1200080426&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+T[6]+2821735955&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+T[7]+4249261313&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(R^I&(E^R))+T[8]+1770035416&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+T[9]+2336552879&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+T[10]+4294925233&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+T[11]+2304563134&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(R^I&(E^R))+T[12]+1804603682&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+T[13]+4254626195&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+T[14]+2792965006&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+T[15]+1236535329&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(E^R&(I^E))+T[1]+4129170786&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+T[6]+3225465664&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+T[11]+643717713&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+T[0]+3921069994&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(E^R&(I^E))+T[5]+3593408605&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+T[10]+38016083&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+T[15]+3634488961&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+T[4]+3889429448&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(E^R&(I^E))+T[9]+568446438&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+T[14]+3275163606&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+T[3]+4107603335&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+T[8]+1163531501&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(E^R&(I^E))+T[13]+2850285829&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+T[2]+4243563512&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+T[7]+1735328473&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+T[12]+2368359562&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(I^E^R)+T[5]+4294588738&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+T[8]+2272392833&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+T[11]+1839030562&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+T[14]+4259657740&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(I^E^R)+T[1]+2763975236&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+T[4]+1272893353&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+T[7]+4139469664&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+T[10]+3200236656&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(I^E^R)+T[13]+681279174&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+T[0]+3936430074&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+T[3]+3572445317&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+T[6]+76029189&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(I^E^R)+T[9]+3654602809&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+T[12]+3873151461&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+T[15]+530742520&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+T[2]+3299628645&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(E^(I|~R))+T[0]+4096336452&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+T[7]+1126891415&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+T[14]+2878612391&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+T[5]+4237533241&4294967295,I=E+(y<<21&4294967295|y>>>11),y=_+(E^(I|~R))+T[12]+1700485571&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+T[3]+2399980690&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+T[10]+4293915773&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+T[1]+2240044497&4294967295,I=E+(y<<21&4294967295|y>>>11),y=_+(E^(I|~R))+T[8]+1873313359&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+T[15]+4264355552&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+T[6]+2734768916&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+T[13]+1309151649&4294967295,I=E+(y<<21&4294967295|y>>>11),y=_+(E^(I|~R))+T[4]+4149444226&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+T[11]+3174756917&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+T[2]+718787259&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+T[9]+3951481745&4294967295,w.g[0]=w.g[0]+_&4294967295,w.g[1]=w.g[1]+(E+(y<<21&4294967295|y>>>11))&4294967295,w.g[2]=w.g[2]+E&4294967295,w.g[3]=w.g[3]+R&4294967295}r.prototype.v=function(w,_){_===void 0&&(_=w.length);const I=_-this.blockSize,T=this.C;let E=this.h,R=0;for(;R<_;){if(E==0)for(;R<=I;)s(this,w,R),R+=this.blockSize;if(typeof w=="string"){for(;R<_;)if(T[E++]=w.charCodeAt(R++),E==this.blockSize){s(this,T),E=0;break}}else for(;R<_;)if(T[E++]=w[R++],E==this.blockSize){s(this,T),E=0;break}}this.h=E,this.o+=_},r.prototype.A=function(){var w=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);w[0]=128;for(var _=1;_<w.length-8;++_)w[_]=0;_=this.o*8;for(var I=w.length-8;I<w.length;++I)w[I]=_&255,_/=256;for(this.v(w),w=Array(16),_=0,I=0;I<4;++I)for(let T=0;T<32;T+=8)w[_++]=this.g[I]>>>T&255;return w};function i(w,_){var I=c;return Object.prototype.hasOwnProperty.call(I,w)?I[w]:I[w]=_(w)}function o(w,_){this.h=_;const I=[];let T=!0;for(let E=w.length-1;E>=0;E--){const R=w[E]|0;T&&R==_||(I[E]=R,T=!1)}this.g=I}var c={};function u(w){return-128<=w&&w<128?i(w,function(_){return new o([_|0],_<0?-1:0)}):new o([w|0],w<0?-1:0)}function l(w){if(isNaN(w)||!isFinite(w))return p;if(w<0)return k(l(-w));const _=[];let I=1;for(let T=0;w>=I;T++)_[T]=w/I|0,I*=4294967296;return new o(_,0)}function f(w,_){if(w.length==0)throw Error("number format error: empty string");if(_=_||10,_<2||36<_)throw Error("radix out of range: "+_);if(w.charAt(0)=="-")return k(f(w.substring(1),_));if(w.indexOf("-")>=0)throw Error('number format error: interior "-" character');const I=l(Math.pow(_,8));let T=p;for(let R=0;R<w.length;R+=8){var E=Math.min(8,w.length-R);const y=parseInt(w.substring(R,R+E),_);E<8?(E=l(Math.pow(_,E)),T=T.j(E).add(l(y))):(T=T.j(I),T=T.add(l(y)))}return T}var p=u(0),g=u(1),v=u(16777216);n=o.prototype,n.m=function(){if(N(this))return-k(this).m();let w=0,_=1;for(let I=0;I<this.g.length;I++){const T=this.i(I);w+=(T>=0?T:4294967296+T)*_,_*=4294967296}return w},n.toString=function(w){if(w=w||10,w<2||36<w)throw Error("radix out of range: "+w);if(C(this))return"0";if(N(this))return"-"+k(this).toString(w);const _=l(Math.pow(w,6));var I=this;let T="";for(;;){const E=W(I,_).g;I=j(I,E.j(_));let R=((I.g.length>0?I.g[0]:I.h)>>>0).toString(w);if(I=E,C(I))return R+T;for(;R.length<6;)R="0"+R;T=R+T}},n.i=function(w){return w<0?0:w<this.g.length?this.g[w]:this.h};function C(w){if(w.h!=0)return!1;for(let _=0;_<w.g.length;_++)if(w.g[_]!=0)return!1;return!0}function N(w){return w.h==-1}n.l=function(w){return w=j(this,w),N(w)?-1:C(w)?0:1};function k(w){const _=w.g.length,I=[];for(let T=0;T<_;T++)I[T]=~w.g[T];return new o(I,~w.h).add(g)}n.abs=function(){return N(this)?k(this):this},n.add=function(w){const _=Math.max(this.g.length,w.g.length),I=[];let T=0;for(let E=0;E<=_;E++){let R=T+(this.i(E)&65535)+(w.i(E)&65535),y=(R>>>16)+(this.i(E)>>>16)+(w.i(E)>>>16);T=y>>>16,R&=65535,y&=65535,I[E]=y<<16|R}return new o(I,I[I.length-1]&-2147483648?-1:0)};function j(w,_){return w.add(k(_))}n.j=function(w){if(C(this)||C(w))return p;if(N(this))return N(w)?k(this).j(k(w)):k(k(this).j(w));if(N(w))return k(this.j(k(w)));if(this.l(v)<0&&w.l(v)<0)return l(this.m()*w.m());const _=this.g.length+w.g.length,I=[];for(var T=0;T<2*_;T++)I[T]=0;for(T=0;T<this.g.length;T++)for(let E=0;E<w.g.length;E++){const R=this.i(T)>>>16,y=this.i(T)&65535,Ae=w.i(E)>>>16,at=w.i(E)&65535;I[2*T+2*E]+=y*at,q(I,2*T+2*E),I[2*T+2*E+1]+=R*at,q(I,2*T+2*E+1),I[2*T+2*E+1]+=y*Ae,q(I,2*T+2*E+1),I[2*T+2*E+2]+=R*Ae,q(I,2*T+2*E+2)}for(w=0;w<_;w++)I[w]=I[2*w+1]<<16|I[2*w];for(w=_;w<2*_;w++)I[w]=0;return new o(I,0)};function q(w,_){for(;(w[_]&65535)!=w[_];)w[_+1]+=w[_]>>>16,w[_]&=65535,_++}function B(w,_){this.g=w,this.h=_}function W(w,_){if(C(_))throw Error("division by zero");if(C(w))return new B(p,p);if(N(w))return _=W(k(w),_),new B(k(_.g),k(_.h));if(N(_))return _=W(w,k(_)),new B(k(_.g),_.h);if(w.g.length>30){if(N(w)||N(_))throw Error("slowDivide_ only works with positive integers.");for(var I=g,T=_;T.l(w)<=0;)I=Q(I),T=Q(T);var E=J(I,1),R=J(T,1);for(T=J(T,2),I=J(I,2);!C(T);){var y=R.add(T);y.l(w)<=0&&(E=E.add(I),R=y),T=J(T,1),I=J(I,1)}return _=j(w,E.j(_)),new B(E,_)}for(E=p;w.l(_)>=0;){for(I=Math.max(1,Math.floor(w.m()/_.m())),T=Math.ceil(Math.log(I)/Math.LN2),T=T<=48?1:Math.pow(2,T-48),R=l(I),y=R.j(_);N(y)||y.l(w)>0;)I-=T,R=l(I),y=R.j(_);C(R)&&(R=g),E=E.add(R),w=j(w,y)}return new B(E,w)}n.B=function(w){return W(this,w).h},n.and=function(w){const _=Math.max(this.g.length,w.g.length),I=[];for(let T=0;T<_;T++)I[T]=this.i(T)&w.i(T);return new o(I,this.h&w.h)},n.or=function(w){const _=Math.max(this.g.length,w.g.length),I=[];for(let T=0;T<_;T++)I[T]=this.i(T)|w.i(T);return new o(I,this.h|w.h)},n.xor=function(w){const _=Math.max(this.g.length,w.g.length),I=[];for(let T=0;T<_;T++)I[T]=this.i(T)^w.i(T);return new o(I,this.h^w.h)};function Q(w){const _=w.g.length+1,I=[];for(let T=0;T<_;T++)I[T]=w.i(T)<<1|w.i(T-1)>>>31;return new o(I,w.h)}function J(w,_){const I=_>>5;_%=32;const T=w.g.length-I,E=[];for(let R=0;R<T;R++)E[R]=_>0?w.i(R+I)>>>_|w.i(R+I+1)<<32-_:w.i(R+I);return new o(E,w.h)}r.prototype.digest=r.prototype.A,r.prototype.reset=r.prototype.u,r.prototype.update=r.prototype.v,Xp=r,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=l,o.fromString=f,hn=o}).apply(typeof Rd<"u"?Rd:typeof self<"u"?self:typeof window<"u"?window:{});var to=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Zp,xs,em,fo,Hc,tm,nm,rm;(function(){var n,e=Object.defineProperty;function t(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof to=="object"&&to];for(var h=0;h<a.length;++h){var d=a[h];if(d&&d.Math==Math)return d}throw Error("Cannot find global object")}var r=t(this);function s(a,h){if(h)e:{var d=r;a=a.split(".");for(var m=0;m<a.length-1;m++){var b=a[m];if(!(b in d))break e;d=d[b]}a=a[a.length-1],m=d[a],h=h(m),h!=m&&h!=null&&e(d,a,{configurable:!0,writable:!0,value:h})}}s("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),s("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),s("Object.entries",function(a){return a||function(h){var d=[],m;for(m in h)Object.prototype.hasOwnProperty.call(h,m)&&d.push([m,h[m]]);return d}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var i=i||{},o=this||self;function c(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function u(a,h,d){return a.call.apply(a.bind,arguments)}function l(a,h,d){return l=u,l.apply(null,arguments)}function f(a,h){var d=Array.prototype.slice.call(arguments,1);return function(){var m=d.slice();return m.push.apply(m,arguments),a.apply(this,m)}}function p(a,h){function d(){}d.prototype=h.prototype,a.Z=h.prototype,a.prototype=new d,a.prototype.constructor=a,a.Ob=function(m,b,P){for(var O=Array(arguments.length-2),K=2;K<arguments.length;K++)O[K-2]=arguments[K];return h.prototype[b].apply(m,O)}}var g=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function v(a){const h=a.length;if(h>0){const d=Array(h);for(let m=0;m<h;m++)d[m]=a[m];return d}return[]}function C(a,h){for(let m=1;m<arguments.length;m++){const b=arguments[m];var d=typeof b;if(d=d!="object"?d:b?Array.isArray(b)?"array":d:"null",d=="array"||d=="object"&&typeof b.length=="number"){d=a.length||0;const P=b.length||0;a.length=d+P;for(let O=0;O<P;O++)a[d+O]=b[O]}else a.push(b)}}class N{constructor(h,d){this.i=h,this.j=d,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function k(a){o.setTimeout(()=>{throw a},0)}function j(){var a=w;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class q{constructor(){this.h=this.g=null}add(h,d){const m=B.get();m.set(h,d),this.h?this.h.next=m:this.g=m,this.h=m}}var B=new N(()=>new W,a=>a.reset());class W{constructor(){this.next=this.g=this.h=null}set(h,d){this.h=h,this.g=d,this.next=null}reset(){this.next=this.g=this.h=null}}let Q,J=!1,w=new q,_=()=>{const a=Promise.resolve(void 0);Q=()=>{a.then(I)}};function I(){for(var a;a=j();){try{a.h.call(a.g)}catch(d){k(d)}var h=B;h.j(a),h.h<100&&(h.h++,a.next=h.g,h.g=a)}J=!1}function T(){this.u=this.u,this.C=this.C}T.prototype.u=!1,T.prototype.dispose=function(){this.u||(this.u=!0,this.N())},T.prototype[Symbol.dispose]=function(){this.dispose()},T.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function E(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}E.prototype.h=function(){this.defaultPrevented=!0};var R=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const d=()=>{};o.addEventListener("test",d,h),o.removeEventListener("test",d,h)}catch{}return a}();function y(a){return/^[\s\xa0]*$/.test(a)}function Ae(a,h){E.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,h)}p(Ae,E),Ae.prototype.init=function(a,h){const d=this.type=a.type,m=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget,h||(d=="mouseover"?h=a.fromElement:d=="mouseout"&&(h=a.toElement)),this.relatedTarget=h,m?(this.clientX=m.clientX!==void 0?m.clientX:m.pageX,this.clientY=m.clientY!==void 0?m.clientY:m.pageY,this.screenX=m.screenX||0,this.screenY=m.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&Ae.Z.h.call(this)},Ae.prototype.h=function(){Ae.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var at="closure_listenable_"+(Math.random()*1e6|0),nI=0;function rI(a,h,d,m,b){this.listener=a,this.proxy=null,this.src=h,this.type=d,this.capture=!!m,this.ha=b,this.key=++nI,this.da=this.fa=!1}function Bi(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function qi(a,h,d){for(const m in a)h.call(d,a[m],m,a)}function sI(a,h){for(const d in a)h.call(void 0,a[d],d,a)}function ch(a){const h={};for(const d in a)h[d]=a[d];return h}const uh="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function lh(a,h){let d,m;for(let b=1;b<arguments.length;b++){m=arguments[b];for(d in m)a[d]=m[d];for(let P=0;P<uh.length;P++)d=uh[P],Object.prototype.hasOwnProperty.call(m,d)&&(a[d]=m[d])}}function $i(a){this.src=a,this.g={},this.h=0}$i.prototype.add=function(a,h,d,m,b){const P=a.toString();a=this.g[P],a||(a=this.g[P]=[],this.h++);const O=za(a,h,m,b);return O>-1?(h=a[O],d||(h.fa=!1)):(h=new rI(h,this.src,P,!!m,b),h.fa=d,a.push(h)),h};function Ga(a,h){const d=h.type;if(d in a.g){var m=a.g[d],b=Array.prototype.indexOf.call(m,h,void 0),P;(P=b>=0)&&Array.prototype.splice.call(m,b,1),P&&(Bi(h),a.g[d].length==0&&(delete a.g[d],a.h--))}}function za(a,h,d,m){for(let b=0;b<a.length;++b){const P=a[b];if(!P.da&&P.listener==h&&P.capture==!!d&&P.ha==m)return b}return-1}var Wa="closure_lm_"+(Math.random()*1e6|0),Ka={};function hh(a,h,d,m,b){if(Array.isArray(h)){for(let P=0;P<h.length;P++)hh(a,h[P],d,m,b);return null}return d=ph(d),a&&a[at]?a.J(h,d,c(m)?!!m.capture:!1,b):iI(a,h,d,!1,m,b)}function iI(a,h,d,m,b,P){if(!h)throw Error("Invalid event type");const O=c(b)?!!b.capture:!!b;let K=Qa(a);if(K||(a[Wa]=K=new $i(a)),d=K.add(h,d,m,O,P),d.proxy)return d;if(m=oI(),d.proxy=m,m.src=a,m.listener=d,a.addEventListener)R||(b=O),b===void 0&&(b=!1),a.addEventListener(h.toString(),m,b);else if(a.attachEvent)a.attachEvent(fh(h.toString()),m);else if(a.addListener&&a.removeListener)a.addListener(m);else throw Error("addEventListener and attachEvent are unavailable.");return d}function oI(){function a(d){return h.call(a.src,a.listener,d)}const h=aI;return a}function dh(a,h,d,m,b){if(Array.isArray(h))for(var P=0;P<h.length;P++)dh(a,h[P],d,m,b);else m=c(m)?!!m.capture:!!m,d=ph(d),a&&a[at]?(a=a.i,P=String(h).toString(),P in a.g&&(h=a.g[P],d=za(h,d,m,b),d>-1&&(Bi(h[d]),Array.prototype.splice.call(h,d,1),h.length==0&&(delete a.g[P],a.h--)))):a&&(a=Qa(a))&&(h=a.g[h.toString()],a=-1,h&&(a=za(h,d,m,b)),(d=a>-1?h[a]:null)&&Ha(d))}function Ha(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[at])Ga(h.i,a);else{var d=a.type,m=a.proxy;h.removeEventListener?h.removeEventListener(d,m,a.capture):h.detachEvent?h.detachEvent(fh(d),m):h.addListener&&h.removeListener&&h.removeListener(m),(d=Qa(h))?(Ga(d,a),d.h==0&&(d.src=null,h[Wa]=null)):Bi(a)}}}function fh(a){return a in Ka?Ka[a]:Ka[a]="on"+a}function aI(a,h){if(a.da)a=!0;else{h=new Ae(h,this);const d=a.listener,m=a.ha||a.src;a.fa&&Ha(a),a=d.call(m,h)}return a}function Qa(a){return a=a[Wa],a instanceof $i?a:null}var Ja="__closure_events_fn_"+(Math.random()*1e9>>>0);function ph(a){return typeof a=="function"?a:(a[Ja]||(a[Ja]=function(h){return a.handleEvent(h)}),a[Ja])}function Fe(){T.call(this),this.i=new $i(this),this.M=this,this.G=null}p(Fe,T),Fe.prototype[at]=!0,Fe.prototype.removeEventListener=function(a,h,d,m){dh(this,a,h,d,m)};function Ge(a,h){var d,m=a.G;if(m)for(d=[];m;m=m.G)d.push(m);if(a=a.M,m=h.type||h,typeof h=="string")h=new E(h,a);else if(h instanceof E)h.target=h.target||a;else{var b=h;h=new E(m,a),lh(h,b)}b=!0;let P,O;if(d)for(O=d.length-1;O>=0;O--)P=h.g=d[O],b=ji(P,m,!0,h)&&b;if(P=h.g=a,b=ji(P,m,!0,h)&&b,b=ji(P,m,!1,h)&&b,d)for(O=0;O<d.length;O++)P=h.g=d[O],b=ji(P,m,!1,h)&&b}Fe.prototype.N=function(){if(Fe.Z.N.call(this),this.i){var a=this.i;for(const h in a.g){const d=a.g[h];for(let m=0;m<d.length;m++)Bi(d[m]);delete a.g[h],a.h--}}this.G=null},Fe.prototype.J=function(a,h,d,m){return this.i.add(String(a),h,!1,d,m)},Fe.prototype.K=function(a,h,d,m){return this.i.add(String(a),h,!0,d,m)};function ji(a,h,d,m){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();let b=!0;for(let P=0;P<h.length;++P){const O=h[P];if(O&&!O.da&&O.capture==d){const K=O.listener,Re=O.ha||O.src;O.fa&&Ga(a.i,O),b=K.call(Re,m)!==!1&&b}}return b&&!m.defaultPrevented}function cI(a,h){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=l(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(a,h||0)}function mh(a){a.g=cI(()=>{a.g=null,a.i&&(a.i=!1,mh(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class uI extends T{constructor(h,d){super(),this.m=h,this.l=d,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:mh(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function us(a){T.call(this),this.h=a,this.g={}}p(us,T);var gh=[];function _h(a){qi(a.g,function(h,d){this.g.hasOwnProperty(d)&&Ha(h)},a),a.g={}}us.prototype.N=function(){us.Z.N.call(this),_h(this)},us.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Ya=o.JSON.stringify,lI=o.JSON.parse,hI=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function yh(){}function Ih(){}var ls={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function Xa(){E.call(this,"d")}p(Xa,E);function Za(){E.call(this,"c")}p(Za,E);var Sn={},wh=null;function Gi(){return wh=wh||new Fe}Sn.Ia="serverreachability";function Eh(a){E.call(this,Sn.Ia,a)}p(Eh,E);function hs(a){const h=Gi();Ge(h,new Eh(h))}Sn.STAT_EVENT="statevent";function Th(a,h){E.call(this,Sn.STAT_EVENT,a),this.stat=h}p(Th,E);function ze(a){const h=Gi();Ge(h,new Th(h,a))}Sn.Ja="timingevent";function vh(a,h){E.call(this,Sn.Ja,a),this.size=h}p(vh,E);function ds(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},h)}function fs(){this.g=!0}fs.prototype.ua=function(){this.g=!1};function dI(a,h,d,m,b,P){a.info(function(){if(a.g)if(P){var O="",K=P.split("&");for(let oe=0;oe<K.length;oe++){var Re=K[oe].split("=");if(Re.length>1){const ke=Re[0];Re=Re[1];const wt=ke.split("_");O=wt.length>=2&&wt[1]=="type"?O+(ke+"="+Re+"&"):O+(ke+"=redacted&")}}}else O=null;else O=P;return"XMLHTTP REQ ("+m+") [attempt "+b+"]: "+h+`
`+d+`
`+O})}function fI(a,h,d,m,b,P,O){a.info(function(){return"XMLHTTP RESP ("+m+") [ attempt "+b+"]: "+h+`
`+d+`
`+P+" "+O})}function dr(a,h,d,m){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+mI(a,d)+(m?" "+m:"")})}function pI(a,h){a.info(function(){return"TIMEOUT: "+h})}fs.prototype.info=function(){};function mI(a,h){if(!a.g)return h;if(!h)return null;try{const P=JSON.parse(h);if(P){for(a=0;a<P.length;a++)if(Array.isArray(P[a])){var d=P[a];if(!(d.length<2)){var m=d[1];if(Array.isArray(m)&&!(m.length<1)){var b=m[0];if(b!="noop"&&b!="stop"&&b!="close")for(let O=1;O<m.length;O++)m[O]=""}}}}return Ya(P)}catch{return h}}var zi={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},Ah={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},Rh;function ec(){}p(ec,yh),ec.prototype.g=function(){return new XMLHttpRequest},Rh=new ec;function ps(a){return encodeURIComponent(String(a))}function gI(a){var h=1;a=a.split(":");const d=[];for(;h>0&&a.length;)d.push(a.shift()),h--;return a.length&&d.push(a.join(":")),d}function Wt(a,h,d,m){this.j=a,this.i=h,this.l=d,this.S=m||1,this.V=new us(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new bh}function bh(){this.i=null,this.g="",this.h=!1}var Sh={},tc={};function nc(a,h,d){a.M=1,a.A=Ki(It(h)),a.u=d,a.R=!0,Ph(a,null)}function Ph(a,h){a.F=Date.now(),Wi(a),a.B=It(a.A);var d=a.B,m=a.S;Array.isArray(m)||(m=[String(m)]),qh(d.i,"t",m),a.C=0,d=a.j.L,a.h=new bh,a.g=id(a.j,d?h:null,!a.u),a.P>0&&(a.O=new uI(l(a.Y,a,a.g),a.P)),h=a.V,d=a.g,m=a.ba;var b="readystatechange";Array.isArray(b)||(b&&(gh[0]=b.toString()),b=gh);for(let P=0;P<b.length;P++){const O=hh(d,b[P],m||h.handleEvent,!1,h.h||h);if(!O)break;h.g[O.key]=O}h=a.J?ch(a.J):{},a.u?(a.v||(a.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,h)):(a.v="GET",a.g.ea(a.B,a.v,null,h)),hs(),dI(a.i,a.v,a.B,a.l,a.S,a.u)}Wt.prototype.ba=function(a){a=a.target;const h=this.O;h&&Qt(a)==3?h.j():this.Y(a)},Wt.prototype.Y=function(a){try{if(a==this.g)e:{const K=Qt(this.g),Re=this.g.ya(),oe=this.g.ca();if(!(K<3)&&(K!=3||this.g&&(this.h.h||this.g.la()||Hh(this.g)))){this.K||K!=4||Re==7||(Re==8||oe<=0?hs(3):hs(2)),rc(this);var h=this.g.ca();this.X=h;var d=_I(this);if(this.o=h==200,fI(this.i,this.v,this.B,this.l,this.S,K,h),this.o){if(this.U&&!this.L){t:{if(this.g){var m,b=this.g;if((m=b.g?b.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!y(m)){var P=m;break t}}P=null}if(a=P)dr(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,sc(this,a);else{this.o=!1,this.m=3,ze(12),Pn(this),ms(this);break e}}if(this.R){a=!0;let ke;for(;!this.K&&this.C<d.length;)if(ke=yI(this,d),ke==tc){K==4&&(this.m=4,ze(14),a=!1),dr(this.i,this.l,null,"[Incomplete Response]");break}else if(ke==Sh){this.m=4,ze(15),dr(this.i,this.l,d,"[Invalid Chunk]"),a=!1;break}else dr(this.i,this.l,ke,null),sc(this,ke);if(Ch(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),K!=4||d.length!=0||this.h.h||(this.m=1,ze(16),a=!1),this.o=this.o&&a,!a)dr(this.i,this.l,d,"[Invalid Chunked Response]"),Pn(this),ms(this);else if(d.length>0&&!this.W){this.W=!0;var O=this.j;O.g==this&&O.aa&&!O.P&&(O.j.info("Great, no buffering proxy detected. Bytes received: "+d.length),dc(O),O.P=!0,ze(11))}}else dr(this.i,this.l,d,null),sc(this,d);K==4&&Pn(this),this.o&&!this.K&&(K==4?td(this.j,this):(this.o=!1,Wi(this)))}else DI(this.g),h==400&&d.indexOf("Unknown SID")>0?(this.m=3,ze(12)):(this.m=0,ze(13)),Pn(this),ms(this)}}}catch{}finally{}};function _I(a){if(!Ch(a))return a.g.la();const h=Hh(a.g);if(h==="")return"";let d="";const m=h.length,b=Qt(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return Pn(a),ms(a),"";a.h.i=new o.TextDecoder}for(let P=0;P<m;P++)a.h.h=!0,d+=a.h.i.decode(h[P],{stream:!(b&&P==m-1)});return h.length=0,a.h.g+=d,a.C=0,a.h.g}function Ch(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function yI(a,h){var d=a.C,m=h.indexOf(`
`,d);return m==-1?tc:(d=Number(h.substring(d,m)),isNaN(d)?Sh:(m+=1,m+d>h.length?tc:(h=h.slice(m,m+d),a.C=m+d,h)))}Wt.prototype.cancel=function(){this.K=!0,Pn(this)};function Wi(a){a.T=Date.now()+a.H,kh(a,a.H)}function kh(a,h){if(a.D!=null)throw Error("WatchDog timer not null");a.D=ds(l(a.aa,a),h)}function rc(a){a.D&&(o.clearTimeout(a.D),a.D=null)}Wt.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?(pI(this.i,this.B),this.M!=2&&(hs(),ze(17)),Pn(this),this.m=2,ms(this)):kh(this,this.T-a)};function ms(a){a.j.I==0||a.K||td(a.j,a)}function Pn(a){rc(a);var h=a.O;h&&typeof h.dispose=="function"&&h.dispose(),a.O=null,_h(a.V),a.g&&(h=a.g,a.g=null,h.abort(),h.dispose())}function sc(a,h){try{var d=a.j;if(d.I!=0&&(d.g==a||ic(d.h,a))){if(!a.L&&ic(d.h,a)&&d.I==3){try{var m=d.Ba.g.parse(h)}catch{m=null}if(Array.isArray(m)&&m.length==3){var b=m;if(b[0]==0){e:if(!d.v){if(d.g)if(d.g.F+3e3<a.F)Xi(d),Ji(d);else break e;hc(d),ze(18)}}else d.xa=b[1],0<d.xa-d.K&&b[2]<37500&&d.F&&d.A==0&&!d.C&&(d.C=ds(l(d.Va,d),6e3));Vh(d.h)<=1&&d.ta&&(d.ta=void 0)}else kn(d,11)}else if((a.L||d.g==a)&&Xi(d),!y(h))for(b=d.Ba.g.parse(h),h=0;h<b.length;h++){let oe=b[h];const ke=oe[0];if(!(ke<=d.K))if(d.K=ke,oe=oe[1],d.I==2)if(oe[0]=="c"){d.M=oe[1],d.ba=oe[2];const wt=oe[3];wt!=null&&(d.ka=wt,d.j.info("VER="+d.ka));const Nn=oe[4];Nn!=null&&(d.za=Nn,d.j.info("SVER="+d.za));const Jt=oe[5];Jt!=null&&typeof Jt=="number"&&Jt>0&&(m=1.5*Jt,d.O=m,d.j.info("backChannelRequestTimeoutMs_="+m)),m=d;const Yt=a.g;if(Yt){const eo=Yt.g?Yt.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(eo){var P=m.h;P.g||eo.indexOf("spdy")==-1&&eo.indexOf("quic")==-1&&eo.indexOf("h2")==-1||(P.j=P.l,P.g=new Set,P.h&&(oc(P,P.h),P.h=null))}if(m.G){const fc=Yt.g?Yt.g.getResponseHeader("X-HTTP-Session-Id"):null;fc&&(m.wa=fc,ce(m.J,m.G,fc))}}d.I=3,d.l&&d.l.ra(),d.aa&&(d.T=Date.now()-a.F,d.j.info("Handshake RTT: "+d.T+"ms")),m=d;var O=a;if(m.na=sd(m,m.L?m.ba:null,m.W),O.L){Oh(m.h,O);var K=O,Re=m.O;Re&&(K.H=Re),K.D&&(rc(K),Wi(K)),m.g=O}else Zh(m);d.i.length>0&&Yi(d)}else oe[0]!="stop"&&oe[0]!="close"||kn(d,7);else d.I==3&&(oe[0]=="stop"||oe[0]=="close"?oe[0]=="stop"?kn(d,7):lc(d):oe[0]!="noop"&&d.l&&d.l.qa(oe),d.A=0)}}hs(4)}catch{}}var II=class{constructor(a,h){this.g=a,this.map=h}};function Nh(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function Dh(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function Vh(a){return a.h?1:a.g?a.g.size:0}function ic(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function oc(a,h){a.g?a.g.add(h):a.h=h}function Oh(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}Nh.prototype.cancel=function(){if(this.i=xh(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function xh(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const d of a.g.values())h=h.concat(d.G);return h}return v(a.i)}var Lh=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function wI(a,h){if(a){a=a.split("&");for(let d=0;d<a.length;d++){const m=a[d].indexOf("=");let b,P=null;m>=0?(b=a[d].substring(0,m),P=a[d].substring(m+1)):b=a[d],h(b,P?decodeURIComponent(P.replace(/\+/g," ")):"")}}}function Kt(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;a instanceof Kt?(this.l=a.l,gs(this,a.j),this.o=a.o,this.g=a.g,_s(this,a.u),this.h=a.h,ac(this,$h(a.i)),this.m=a.m):a&&(h=String(a).match(Lh))?(this.l=!1,gs(this,h[1]||"",!0),this.o=ys(h[2]||""),this.g=ys(h[3]||"",!0),_s(this,h[4]),this.h=ys(h[5]||"",!0),ac(this,h[6]||"",!0),this.m=ys(h[7]||"")):(this.l=!1,this.i=new ws(null,this.l))}Kt.prototype.toString=function(){const a=[];var h=this.j;h&&a.push(Is(h,Mh,!0),":");var d=this.g;return(d||h=="file")&&(a.push("//"),(h=this.o)&&a.push(Is(h,Mh,!0),"@"),a.push(ps(d).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),d=this.u,d!=null&&a.push(":",String(d))),(d=this.h)&&(this.g&&d.charAt(0)!="/"&&a.push("/"),a.push(Is(d,d.charAt(0)=="/"?vI:TI,!0))),(d=this.i.toString())&&a.push("?",d),(d=this.m)&&a.push("#",Is(d,RI)),a.join("")},Kt.prototype.resolve=function(a){const h=It(this);let d=!!a.j;d?gs(h,a.j):d=!!a.o,d?h.o=a.o:d=!!a.g,d?h.g=a.g:d=a.u!=null;var m=a.h;if(d)_s(h,a.u);else if(d=!!a.h){if(m.charAt(0)!="/")if(this.g&&!this.h)m="/"+m;else{var b=h.h.lastIndexOf("/");b!=-1&&(m=h.h.slice(0,b+1)+m)}if(b=m,b==".."||b==".")m="";else if(b.indexOf("./")!=-1||b.indexOf("/.")!=-1){m=b.lastIndexOf("/",0)==0,b=b.split("/");const P=[];for(let O=0;O<b.length;){const K=b[O++];K=="."?m&&O==b.length&&P.push(""):K==".."?((P.length>1||P.length==1&&P[0]!="")&&P.pop(),m&&O==b.length&&P.push("")):(P.push(K),m=!0)}m=P.join("/")}else m=b}return d?h.h=m:d=a.i.toString()!=="",d?ac(h,$h(a.i)):d=!!a.m,d&&(h.m=a.m),h};function It(a){return new Kt(a)}function gs(a,h,d){a.j=d?ys(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function _s(a,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);a.u=h}else a.u=null}function ac(a,h,d){h instanceof ws?(a.i=h,bI(a.i,a.l)):(d||(h=Is(h,AI)),a.i=new ws(h,a.l))}function ce(a,h,d){a.i.set(h,d)}function Ki(a){return ce(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function ys(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function Is(a,h,d){return typeof a=="string"?(a=encodeURI(a).replace(h,EI),d&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function EI(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var Mh=/[#\/\?@]/g,TI=/[#\?:]/g,vI=/[#\?]/g,AI=/[#\?@]/g,RI=/#/g;function ws(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function Cn(a){a.g||(a.g=new Map,a.h=0,a.i&&wI(a.i,function(h,d){a.add(decodeURIComponent(h.replace(/\+/g," ")),d)}))}n=ws.prototype,n.add=function(a,h){Cn(this),this.i=null,a=fr(this,a);let d=this.g.get(a);return d||this.g.set(a,d=[]),d.push(h),this.h+=1,this};function Fh(a,h){Cn(a),h=fr(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function Uh(a,h){return Cn(a),h=fr(a,h),a.g.has(h)}n.forEach=function(a,h){Cn(this),this.g.forEach(function(d,m){d.forEach(function(b){a.call(h,b,m,this)},this)},this)};function Bh(a,h){Cn(a);let d=[];if(typeof h=="string")Uh(a,h)&&(d=d.concat(a.g.get(fr(a,h))));else for(a=Array.from(a.g.values()),h=0;h<a.length;h++)d=d.concat(a[h]);return d}n.set=function(a,h){return Cn(this),this.i=null,a=fr(this,a),Uh(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},n.get=function(a,h){return a?(a=Bh(this,a),a.length>0?String(a[0]):h):h};function qh(a,h,d){Fh(a,h),d.length>0&&(a.i=null,a.g.set(fr(a,h),v(d)),a.h+=d.length)}n.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(let m=0;m<h.length;m++){var d=h[m];const b=ps(d);d=Bh(this,d);for(let P=0;P<d.length;P++){let O=b;d[P]!==""&&(O+="="+ps(d[P])),a.push(O)}}return this.i=a.join("&")};function $h(a){const h=new ws;return h.i=a.i,a.g&&(h.g=new Map(a.g),h.h=a.h),h}function fr(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function bI(a,h){h&&!a.j&&(Cn(a),a.i=null,a.g.forEach(function(d,m){const b=m.toLowerCase();m!=b&&(Fh(this,m),qh(this,b,d))},a)),a.j=h}function SI(a,h){const d=new fs;if(o.Image){const m=new Image;m.onload=f(Ht,d,"TestLoadImage: loaded",!0,h,m),m.onerror=f(Ht,d,"TestLoadImage: error",!1,h,m),m.onabort=f(Ht,d,"TestLoadImage: abort",!1,h,m),m.ontimeout=f(Ht,d,"TestLoadImage: timeout",!1,h,m),o.setTimeout(function(){m.ontimeout&&m.ontimeout()},1e4),m.src=a}else h(!1)}function PI(a,h){const d=new fs,m=new AbortController,b=setTimeout(()=>{m.abort(),Ht(d,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:m.signal}).then(P=>{clearTimeout(b),P.ok?Ht(d,"TestPingServer: ok",!0,h):Ht(d,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(b),Ht(d,"TestPingServer: error",!1,h)})}function Ht(a,h,d,m,b){try{b&&(b.onload=null,b.onerror=null,b.onabort=null,b.ontimeout=null),m(d)}catch{}}function CI(){this.g=new hI}function cc(a){this.i=a.Sb||null,this.h=a.ab||!1}p(cc,yh),cc.prototype.g=function(){return new Hi(this.i,this.h)};function Hi(a,h){Fe.call(this),this.H=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}p(Hi,Fe),n=Hi.prototype,n.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=h,this.readyState=1,Ts(this)},n.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(h.body=a),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},n.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Es(this)),this.readyState=0},n.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,Ts(this)),this.g&&(this.readyState=3,Ts(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;jh(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function jh(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}n.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?Es(this):Ts(this),this.readyState==3&&jh(this)}},n.Oa=function(a){this.g&&(this.response=this.responseText=a,Es(this))},n.Na=function(a){this.g&&(this.response=a,Es(this))},n.ga=function(){this.g&&Es(this)};function Es(a){a.readyState=4,a.l=null,a.j=null,a.B=null,Ts(a)}n.setRequestHeader=function(a,h){this.A.append(a,h)},n.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},n.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var d=h.next();!d.done;)d=d.value,a.push(d[0]+": "+d[1]),d=h.next();return a.join(`\r
`)};function Ts(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(Hi.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function Gh(a){let h="";return qi(a,function(d,m){h+=m,h+=":",h+=d,h+=`\r
`}),h}function uc(a,h,d){e:{for(m in d){var m=!1;break e}m=!0}m||(d=Gh(d),typeof a=="string"?d!=null&&ps(d):ce(a,h,d))}function pe(a){Fe.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}p(pe,Fe);var kI=/^https?$/i,NI=["POST","PUT"];n=pe.prototype,n.Fa=function(a){this.H=a},n.ea=function(a,h,d,m){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():Rh.g(),this.g.onreadystatechange=g(l(this.Ca,this));try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(P){zh(this,P);return}if(a=d||"",d=new Map(this.headers),m)if(Object.getPrototypeOf(m)===Object.prototype)for(var b in m)d.set(b,m[b]);else if(typeof m.keys=="function"&&typeof m.get=="function")for(const P of m.keys())d.set(P,m.get(P));else throw Error("Unknown input type for opt_headers: "+String(m));m=Array.from(d.keys()).find(P=>P.toLowerCase()=="content-type"),b=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(NI,h,void 0)>=0)||m||b||d.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[P,O]of d)this.g.setRequestHeader(P,O);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(P){zh(this,P)}};function zh(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.o=5,Wh(a),Qi(a)}function Wh(a){a.A||(a.A=!0,Ge(a,"complete"),Ge(a,"error"))}n.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,Ge(this,"complete"),Ge(this,"abort"),Qi(this))},n.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Qi(this,!0)),pe.Z.N.call(this)},n.Ca=function(){this.u||(this.B||this.v||this.j?Kh(this):this.Xa())},n.Xa=function(){Kh(this)};function Kh(a){if(a.h&&typeof i<"u"){if(a.v&&Qt(a)==4)setTimeout(a.Ca.bind(a),0);else if(Ge(a,"readystatechange"),Qt(a)==4){a.h=!1;try{const P=a.ca();e:switch(P){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var d;if(!(d=h)){var m;if(m=P===0){let O=String(a.D).match(Lh)[1]||null;!O&&o.self&&o.self.location&&(O=o.self.location.protocol.slice(0,-1)),m=!kI.test(O?O.toLowerCase():"")}d=m}if(d)Ge(a,"complete"),Ge(a,"success");else{a.o=6;try{var b=Qt(a)>2?a.g.statusText:""}catch{b=""}a.l=b+" ["+a.ca()+"]",Wh(a)}}finally{Qi(a)}}}}function Qi(a,h){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const d=a.g;a.g=null,h||Ge(a,"ready");try{d.onreadystatechange=null}catch{}}}n.isActive=function(){return!!this.g};function Qt(a){return a.g?a.g.readyState:0}n.ca=function(){try{return Qt(this)>2?this.g.status:-1}catch{return-1}},n.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},n.La=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),lI(h)}};function Hh(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function DI(a){const h={};a=(a.g&&Qt(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let m=0;m<a.length;m++){if(y(a[m]))continue;var d=gI(a[m]);const b=d[0];if(d=d[1],typeof d!="string")continue;d=d.trim();const P=h[b]||[];h[b]=P,P.push(d)}sI(h,function(m){return m.join(", ")})}n.ya=function(){return this.o},n.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function vs(a,h,d){return d&&d.internalChannelParams&&d.internalChannelParams[a]||h}function Qh(a){this.za=0,this.i=[],this.j=new fs,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=vs("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=vs("baseRetryDelayMs",5e3,a),this.Za=vs("retryDelaySeedMs",1e4,a),this.Ta=vs("forwardChannelMaxRetries",2,a),this.va=vs("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new Nh(a&&a.concurrentRequestLimit),this.Ba=new CI,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}n=Qh.prototype,n.ka=8,n.I=1,n.connect=function(a,h,d,m){ze(0),this.W=a,this.H=h||{},d&&m!==void 0&&(this.H.OSID=d,this.H.OAID=m),this.F=this.X,this.J=sd(this,null,this.W),Yi(this)};function lc(a){if(Jh(a),a.I==3){var h=a.V++,d=It(a.J);if(ce(d,"SID",a.M),ce(d,"RID",h),ce(d,"TYPE","terminate"),As(a,d),h=new Wt(a,a.j,h),h.M=2,h.A=Ki(It(d)),d=!1,o.navigator&&o.navigator.sendBeacon)try{d=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!d&&o.Image&&(new Image().src=h.A,d=!0),d||(h.g=id(h.j,null),h.g.ea(h.A)),h.F=Date.now(),Wi(h)}rd(a)}function Ji(a){a.g&&(dc(a),a.g.cancel(),a.g=null)}function Jh(a){Ji(a),a.v&&(o.clearTimeout(a.v),a.v=null),Xi(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function Yi(a){if(!Dh(a.h)&&!a.m){a.m=!0;var h=a.Ea;Q||_(),J||(Q(),J=!0),w.add(h,a),a.D=0}}function VI(a,h){return Vh(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=h.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=ds(l(a.Ea,a,h),nd(a,a.D)),a.D++,!0)}n.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const b=new Wt(this,this.j,a);let P=this.o;if(this.U&&(P?(P=ch(P),lh(P,this.U)):P=this.U),this.u!==null||this.R||(b.J=P,P=null),this.S)e:{for(var h=0,d=0;d<this.i.length;d++){t:{var m=this.i[d];if("__data__"in m.map&&(m=m.map.__data__,typeof m=="string")){m=m.length;break t}m=void 0}if(m===void 0)break;if(h+=m,h>4096){h=d;break e}if(h===4096||d===this.i.length-1){h=d+1;break e}}h=1e3}else h=1e3;h=Xh(this,b,h),d=It(this.J),ce(d,"RID",a),ce(d,"CVER",22),this.G&&ce(d,"X-HTTP-Session-Id",this.G),As(this,d),P&&(this.R?h="headers="+ps(Gh(P))+"&"+h:this.u&&uc(d,this.u,P)),oc(this.h,b),this.Ra&&ce(d,"TYPE","init"),this.S?(ce(d,"$req",h),ce(d,"SID","null"),b.U=!0,nc(b,d,null)):nc(b,d,h),this.I=2}}else this.I==3&&(a?Yh(this,a):this.i.length==0||Dh(this.h)||Yh(this))};function Yh(a,h){var d;h?d=h.l:d=a.V++;const m=It(a.J);ce(m,"SID",a.M),ce(m,"RID",d),ce(m,"AID",a.K),As(a,m),a.u&&a.o&&uc(m,a.u,a.o),d=new Wt(a,a.j,d,a.D+1),a.u===null&&(d.J=a.o),h&&(a.i=h.G.concat(a.i)),h=Xh(a,d,1e3),d.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),oc(a.h,d),nc(d,m,h)}function As(a,h){a.H&&qi(a.H,function(d,m){ce(h,m,d)}),a.l&&qi({},function(d,m){ce(h,m,d)})}function Xh(a,h,d){d=Math.min(a.i.length,d);const m=a.l?l(a.l.Ka,a.l,a):null;e:{var b=a.i;let K=-1;for(;;){const Re=["count="+d];K==-1?d>0?(K=b[0].g,Re.push("ofs="+K)):K=0:Re.push("ofs="+K);let oe=!0;for(let ke=0;ke<d;ke++){var P=b[ke].g;const wt=b[ke].map;if(P-=K,P<0)K=Math.max(0,b[ke].g-100),oe=!1;else try{P="req"+P+"_"||"";try{var O=wt instanceof Map?wt:Object.entries(wt);for(const[Nn,Jt]of O){let Yt=Jt;c(Jt)&&(Yt=Ya(Jt)),Re.push(P+Nn+"="+encodeURIComponent(Yt))}}catch(Nn){throw Re.push(P+"type="+encodeURIComponent("_badmap")),Nn}}catch{m&&m(wt)}}if(oe){O=Re.join("&");break e}}O=void 0}return a=a.i.splice(0,d),h.G=a,O}function Zh(a){if(!a.g&&!a.v){a.Y=1;var h=a.Da;Q||_(),J||(Q(),J=!0),w.add(h,a),a.A=0}}function hc(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=ds(l(a.Da,a),nd(a,a.A)),a.A++,!0)}n.Da=function(){if(this.v=null,ed(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=ds(l(this.Wa,this),a)}},n.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,ze(10),Ji(this),ed(this))};function dc(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function ed(a){a.g=new Wt(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var h=It(a.na);ce(h,"RID","rpc"),ce(h,"SID",a.M),ce(h,"AID",a.K),ce(h,"CI",a.F?"0":"1"),!a.F&&a.ia&&ce(h,"TO",a.ia),ce(h,"TYPE","xmlhttp"),As(a,h),a.u&&a.o&&uc(h,a.u,a.o),a.O&&(a.g.H=a.O);var d=a.g;a=a.ba,d.M=1,d.A=Ki(It(h)),d.u=null,d.R=!0,Ph(d,a)}n.Va=function(){this.C!=null&&(this.C=null,Ji(this),hc(this),ze(19))};function Xi(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function td(a,h){var d=null;if(a.g==h){Xi(a),dc(a),a.g=null;var m=2}else if(ic(a.h,h))d=h.G,Oh(a.h,h),m=1;else return;if(a.I!=0){if(h.o)if(m==1){d=h.u?h.u.length:0,h=Date.now()-h.F;var b=a.D;m=Gi(),Ge(m,new vh(m,d)),Yi(a)}else Zh(a);else if(b=h.m,b==3||b==0&&h.X>0||!(m==1&&VI(a,h)||m==2&&hc(a)))switch(d&&d.length>0&&(h=a.h,h.i=h.i.concat(d)),b){case 1:kn(a,5);break;case 4:kn(a,10);break;case 3:kn(a,6);break;default:kn(a,2)}}}function nd(a,h){let d=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(d*=2),d*h}function kn(a,h){if(a.j.info("Error code "+h),h==2){var d=l(a.bb,a),m=a.Ua;const b=!m;m=new Kt(m||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||gs(m,"https"),Ki(m),b?SI(m.toString(),d):PI(m.toString(),d)}else ze(2);a.I=0,a.l&&a.l.pa(h),rd(a),Jh(a)}n.bb=function(a){a?(this.j.info("Successfully pinged google.com"),ze(2)):(this.j.info("Failed to ping google.com"),ze(1))};function rd(a){if(a.I=0,a.ja=[],a.l){const h=xh(a.h);(h.length!=0||a.i.length!=0)&&(C(a.ja,h),C(a.ja,a.i),a.h.i.length=0,v(a.i),a.i.length=0),a.l.oa()}}function sd(a,h,d){var m=d instanceof Kt?It(d):new Kt(d);if(m.g!="")h&&(m.g=h+"."+m.g),_s(m,m.u);else{var b=o.location;m=b.protocol,h=h?h+"."+b.hostname:b.hostname,b=+b.port;const P=new Kt(null);m&&gs(P,m),h&&(P.g=h),b&&_s(P,b),d&&(P.h=d),m=P}return d=a.G,h=a.wa,d&&h&&ce(m,d,h),ce(m,"VER",a.ka),As(a,m),m}function id(a,h,d){if(h&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Aa&&!a.ma?new pe(new cc({ab:d})):new pe(a.ma),h.Fa(a.L),h}n.isActive=function(){return!!this.l&&this.l.isActive(this)};function od(){}n=od.prototype,n.ra=function(){},n.qa=function(){},n.pa=function(){},n.oa=function(){},n.isActive=function(){return!0},n.Ka=function(){};function Zi(){}Zi.prototype.g=function(a,h){return new Xe(a,h)};function Xe(a,h){Fe.call(this),this.g=new Qh(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(a?a["X-WebChannel-Client-Profile"]=h.sa:a={"X-WebChannel-Client-Profile":h.sa}),this.g.U=a,(a=h&&h.Qb)&&!y(a)&&(this.g.u=a),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!y(h)&&(this.g.G=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new pr(this)}p(Xe,Fe),Xe.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},Xe.prototype.close=function(){lc(this.g)},Xe.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var d={};d.__data__=a,a=d}else this.v&&(d={},d.__data__=Ya(a),a=d);h.i.push(new II(h.Ya++,a)),h.I==3&&Yi(h)},Xe.prototype.N=function(){this.g.l=null,delete this.j,lc(this.g),delete this.g,Xe.Z.N.call(this)};function ad(a){Xa.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const d in h){a=d;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}p(ad,Xa);function cd(){Za.call(this),this.status=1}p(cd,Za);function pr(a){this.g=a}p(pr,od),pr.prototype.ra=function(){Ge(this.g,"a")},pr.prototype.qa=function(a){Ge(this.g,new ad(a))},pr.prototype.pa=function(a){Ge(this.g,new cd)},pr.prototype.oa=function(){Ge(this.g,"b")},Zi.prototype.createWebChannel=Zi.prototype.g,Xe.prototype.send=Xe.prototype.o,Xe.prototype.open=Xe.prototype.m,Xe.prototype.close=Xe.prototype.close,rm=function(){return new Zi},nm=function(){return Gi()},tm=Sn,Hc={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},zi.NO_ERROR=0,zi.TIMEOUT=8,zi.HTTP_ERROR=6,fo=zi,Ah.COMPLETE="complete",em=Ah,Ih.EventType=ls,ls.OPEN="a",ls.CLOSE="b",ls.ERROR="c",ls.MESSAGE="d",Fe.prototype.listen=Fe.prototype.J,xs=Ih,pe.prototype.listenOnce=pe.prototype.K,pe.prototype.getLastError=pe.prototype.Ha,pe.prototype.getLastErrorCode=pe.prototype.ya,pe.prototype.getStatus=pe.prototype.ca,pe.prototype.getResponseJson=pe.prototype.La,pe.prototype.getResponseText=pe.prototype.la,pe.prototype.send=pe.prototype.ea,pe.prototype.setWithCredentials=pe.prototype.Fa,Zp=pe}).apply(typeof to<"u"?to:typeof self<"u"?self:typeof window<"u"?window:{});/**
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
 */class Be{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}Be.UNAUTHENTICATED=new Be(null),Be.GOOGLE_CREDENTIALS=new Be("google-credentials-uid"),Be.FIRST_PARTY=new Be("first-party-uid"),Be.MOCK_USER=new Be("mock-user");/**
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
 */let es="12.8.0";function bE(n){es=n}/**
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
 */const Kn=new ku("@firebase/firestore");function Er(){return Kn.logLevel}function D(n,...e){if(Kn.logLevel<=X.DEBUG){const t=e.map(Du);Kn.debug(`Firestore (${es}): ${n}`,...t)}}function Ie(n,...e){if(Kn.logLevel<=X.ERROR){const t=e.map(Du);Kn.error(`Firestore (${es}): ${n}`,...t)}}function ni(n,...e){if(Kn.logLevel<=X.WARN){const t=e.map(Du);Kn.warn(`Firestore (${es}): ${n}`,...t)}}function Du(n){if(typeof n=="string")return n;try{return function(t){return JSON.stringify(t)}(n)}catch{return n}}/**
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
 */function M(n,e,t){let r="Unexpected state";typeof e=="string"?r=e:t=e,sm(n,r,t)}function sm(n,e,t){let r=`FIRESTORE (${es}) INTERNAL ASSERTION FAILED: ${e} (ID: ${n.toString(16)})`;if(t!==void 0)try{r+=" CONTEXT: "+JSON.stringify(t)}catch{r+=" CONTEXT: "+t}throw Ie(r),new Error(r)}function U(n,e,t,r){let s="Unexpected state";typeof t=="string"?s=t:r=t,n||sm(e,s,r)}function F(n,e){return n}/**
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
 */const S={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class V extends mt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
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
 */class dt{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
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
 */class SE{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class PE{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(Be.UNAUTHENTICATED))}shutdown(){}}class CE{constructor(e){this.t=e,this.currentUser=Be.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){U(this.o===void 0,42304);let r=this.i;const s=u=>this.i!==r?(r=this.i,t(u)):Promise.resolve();let i=new dt;this.o=()=>{this.i++,this.currentUser=this.u(),i.resolve(),i=new dt,e.enqueueRetryable(()=>s(this.currentUser))};const o=()=>{const u=i;e.enqueueRetryable(async()=>{await u.promise,await s(this.currentUser)})},c=u=>{D("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(u=>c(u)),setTimeout(()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?c(u):(D("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new dt)}},0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(r=>this.i!==e?(D("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(U(typeof r.accessToken=="string",31837,{l:r}),new SE(r.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return U(e===null||typeof e=="string",2055,{h:e}),new Be(e)}}class kE{constructor(e,t,r){this.P=e,this.T=t,this.I=r,this.type="FirstParty",this.user=Be.FIRST_PARTY,this.R=new Map}A(){return this.I?this.I():null}get headers(){this.R.set("X-Goog-AuthUser",this.P);const e=this.A();return e&&this.R.set("Authorization",e),this.T&&this.R.set("X-Goog-Iam-Authorization-Token",this.T),this.R}}class NE{constructor(e,t,r){this.P=e,this.T=t,this.I=r}getToken(){return Promise.resolve(new kE(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable(()=>t(Be.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class bd{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class DE{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,ye(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){U(this.o===void 0,3512);const r=i=>{i.error!=null&&D("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${i.error.message}`);const o=i.token!==this.m;return this.m=i.token,D("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(i.token):Promise.resolve()};this.o=i=>{e.enqueueRetryable(()=>r(i))};const s=i=>{D("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=i,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(i=>s(i)),setTimeout(()=>{if(!this.appCheck){const i=this.V.getImmediate({optional:!0});i?s(i):D("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new bd(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?(U(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new bd(t.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
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
 */function VE(n){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(n);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let r=0;r<n;r++)t[r]=Math.floor(256*Math.random());return t}/**
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
 */class Vu{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let r="";for(;r.length<20;){const s=VE(40);for(let i=0;i<s.length;++i)r.length<20&&s[i]<t&&(r+=e.charAt(s[i]%62))}return r}}function z(n,e){return n<e?-1:n>e?1:0}function Qc(n,e){const t=Math.min(n.length,e.length);for(let r=0;r<t;r++){const s=n.charAt(r),i=e.charAt(r);if(s!==i)return Ec(s)===Ec(i)?z(s,i):Ec(s)?1:-1}return z(n.length,e.length)}const OE=55296,xE=57343;function Ec(n){const e=n.charCodeAt(0);return e>=OE&&e<=xE}function xr(n,e,t){return n.length===e.length&&n.every((r,s)=>t(r,e[s]))}function im(n){return n+"\0"}/**
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
 */const Jc="__name__";class Et{constructor(e,t,r){t===void 0?t=0:t>e.length&&M(637,{offset:t,range:e.length}),r===void 0?r=e.length-t:r>e.length-t&&M(1746,{length:r,range:e.length-t}),this.segments=e,this.offset=t,this.len=r}get length(){return this.len}isEqual(e){return Et.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof Et?e.forEach(r=>{t.push(r)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,r=this.limit();t<r;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const r=Math.min(e.length,t.length);for(let s=0;s<r;s++){const i=Et.compareSegments(e.get(s),t.get(s));if(i!==0)return i}return z(e.length,t.length)}static compareSegments(e,t){const r=Et.isNumericId(e),s=Et.isNumericId(t);return r&&!s?-1:!r&&s?1:r&&s?Et.extractNumericId(e).compare(Et.extractNumericId(t)):Qc(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return hn.fromString(e.substring(4,e.length-2))}}class ne extends Et{construct(e,t,r){return new ne(e,t,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const r of e){if(r.indexOf("//")>=0)throw new V(S.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);t.push(...r.split("/").filter(s=>s.length>0))}return new ne(t)}static emptyPath(){return new ne([])}}const LE=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class fe extends Et{construct(e,t,r){return new fe(e,t,r)}static isValidIdentifier(e){return LE.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),fe.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===Jc}static keyField(){return new fe([Jc])}static fromServerFormat(e){const t=[];let r="",s=0;const i=()=>{if(r.length===0)throw new V(S.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(r),r=""};let o=!1;for(;s<e.length;){const c=e[s];if(c==="\\"){if(s+1===e.length)throw new V(S.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[s+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new V(S.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=u,s+=2}else c==="`"?(o=!o,s++):c!=="."||o?(r+=c,s++):(i(),s++)}if(i(),o)throw new V(S.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new fe(t)}static emptyPath(){return new fe([])}}/**
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
 */function om(n,e,t){if(!t)throw new V(S.INVALID_ARGUMENT,`Function ${n}() cannot be called with an empty ${e}.`)}function ME(n,e,t,r){if(e===!0&&r===!0)throw new V(S.INVALID_ARGUMENT,`${n} and ${t} cannot be used together.`)}function Sd(n){if(!x.isDocumentKey(n))throw new V(S.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${n} has ${n.length}.`)}function Pd(n){if(x.isDocumentKey(n))throw new V(S.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${n} has ${n.length}.`)}function am(n){return typeof n=="object"&&n!==null&&(Object.getPrototypeOf(n)===Object.prototype||Object.getPrototypeOf(n)===null)}function aa(n){if(n===void 0)return"undefined";if(n===null)return"null";if(typeof n=="string")return n.length>20&&(n=`${n.substring(0,20)}...`),JSON.stringify(n);if(typeof n=="number"||typeof n=="boolean")return""+n;if(typeof n=="object"){if(n instanceof Array)return"an array";{const e=function(r){return r.constructor?r.constructor.name:null}(n);return e?`a custom ${e} object`:"an object"}}return typeof n=="function"?"a function":M(12329,{type:typeof n})}function Ve(n,e){if("_delegate"in n&&(n=n._delegate),!(n instanceof e)){if(e.name===n.constructor.name)throw new V(S.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=aa(n);throw new V(S.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return n}function FE(n,e){if(e<=0)throw new V(S.INVALID_ARGUMENT,`Function ${n}() requires a positive number, but it was: ${e}.`)}/**
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
 */function ve(n,e){const t={typeString:n};return e&&(t.value=e),t}function Ai(n,e){if(!am(n))throw new V(S.INVALID_ARGUMENT,"JSON must be an object");let t;for(const r in e)if(e[r]){const s=e[r].typeString,i="value"in e[r]?{value:e[r].value}:void 0;if(!(r in n)){t=`JSON missing required field: '${r}'`;break}const o=n[r];if(s&&typeof o!==s){t=`JSON field '${r}' must be a ${s}.`;break}if(i!==void 0&&o!==i.value){t=`Expected '${r}' field to equal '${i.value}'`;break}}if(t)throw new V(S.INVALID_ARGUMENT,t);return!0}/**
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
 */const Cd=-62135596800,kd=1e6;class re{static now(){return re.fromMillis(Date.now())}static fromDate(e){return re.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),r=Math.floor((e-1e3*t)*kd);return new re(t,r)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new V(S.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new V(S.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<Cd)throw new V(S.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new V(S.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/kd}_compareTo(e){return this.seconds===e.seconds?z(this.nanoseconds,e.nanoseconds):z(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:re._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Ai(e,re._jsonSchema))return new re(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-Cd;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}re._jsonSchemaVersion="firestore/timestamp/1.0",re._jsonSchema={type:ve("string",re._jsonSchemaVersion),seconds:ve("number"),nanoseconds:ve("number")};/**
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
 */class ${static fromTimestamp(e){return new $(e)}static min(){return new $(new re(0,0))}static max(){return new $(new re(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */const Lr=-1;class No{constructor(e,t,r,s){this.indexId=e,this.collectionGroup=t,this.fields=r,this.indexState=s}}function Yc(n){return n.fields.find(e=>e.kind===2)}function On(n){return n.fields.filter(e=>e.kind!==2)}No.UNKNOWN_ID=-1;class po{constructor(e,t){this.fieldPath=e,this.kind=t}}class ri{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new ri(0,it.min())}}function cm(n,e){const t=n.toTimestamp().seconds,r=n.toTimestamp().nanoseconds+1,s=$.fromTimestamp(r===1e9?new re(t+1,0):new re(t,r));return new it(s,x.empty(),e)}function um(n){return new it(n.readTime,n.key,Lr)}class it{constructor(e,t,r){this.readTime=e,this.documentKey=t,this.largestBatchId=r}static min(){return new it($.min(),x.empty(),Lr)}static max(){return new it($.max(),x.empty(),Lr)}}function Ou(n,e){let t=n.readTime.compareTo(e.readTime);return t!==0?t:(t=x.comparator(n.documentKey,e.documentKey),t!==0?t:z(n.largestBatchId,e.largestBatchId))}/**
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
 */const lm="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class hm{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
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
 */async function Tn(n){if(n.code!==S.FAILED_PRECONDITION||n.message!==lm)throw n;D("LocalStore","Unexpectedly lost primary lease")}/**
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
 */class A{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)},t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&M(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new A((r,s)=>{this.nextCallback=i=>{this.wrapSuccess(e,i).next(r,s)},this.catchCallback=i=>{this.wrapFailure(t,i).next(r,s)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof A?t:A.resolve(t)}catch(t){return A.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):A.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):A.reject(t)}static resolve(e){return new A((t,r)=>{t(e)})}static reject(e){return new A((t,r)=>{r(e)})}static waitFor(e){return new A((t,r)=>{let s=0,i=0,o=!1;e.forEach(c=>{++s,c.next(()=>{++i,o&&i===s&&t()},u=>r(u))}),o=!0,i===s&&t()})}static or(e){let t=A.resolve(!1);for(const r of e)t=t.next(s=>s?A.resolve(s):r());return t}static forEach(e,t){const r=[];return e.forEach((s,i)=>{r.push(t.call(this,s,i))}),this.waitFor(r)}static mapArray(e,t){return new A((r,s)=>{const i=e.length,o=new Array(i);let c=0;for(let u=0;u<i;u++){const l=u;t(e[l]).next(f=>{o[l]=f,++c,c===i&&r(o)},f=>s(f))}})}static doWhile(e,t){return new A((r,s)=>{const i=()=>{e()===!0?t().next(()=>{i()},s):r()};i()})}}/**
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
 */const Ze="SimpleDb";class ca{static open(e,t,r,s){try{return new ca(t,e.transaction(s,r))}catch(i){throw new $s(t,i)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new dt,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new $s(e,t.error)):this.S.resolve()},this.transaction.onerror=r=>{const s=xu(r.target.error);this.S.reject(new $s(e,s))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||(D(Ze,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}C(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new BE(t)}}class dn{static delete(e){return D(Ze,"Removing database:",e),Ln(Up().indexedDB.deleteDatabase(e)).toPromise()}static v(){if(!Cu())return!1;if(dn.F())return!0;const e=be(),t=dn.M(e),r=0<t&&t<10,s=dm(e),i=0<s&&s<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||r||i)}static F(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)==null?void 0:e.__PRIVATE_USE_MOCK_PERSISTENCE)==="YES"}static O(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),r=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(r)}constructor(e,t,r){this.name=e,this.version=t,this.N=r,this.B=null,dn.M(be())===12.2&&Ie("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async L(e){return this.db||(D(Ze,"Opening database:",this.name),this.db=await new Promise((t,r)=>{const s=indexedDB.open(this.name,this.version);s.onsuccess=i=>{const o=i.target.result;t(o)},s.onblocked=()=>{r(new $s(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},s.onerror=i=>{const o=i.target.error;o.name==="VersionError"?r(new V(S.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?r(new V(S.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):r(new $s(e,o))},s.onupgradeneeded=i=>{D(Ze,'Database "'+this.name+'" requires upgrade from version:',i.oldVersion);const o=i.target.result;this.N.k(o,s.transaction,i.oldVersion,this.version).next(()=>{D(Ze,"Database upgrade to version "+this.version+" complete")})}})),this.K&&(this.db.onversionchange=t=>this.K(t)),this.db}q(e){this.K=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,r,s){const i=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.L(e);const c=ca.open(this.db,e,i?"readonly":"readwrite",r),u=s(c).next(l=>(c.C(),l)).catch(l=>(c.abort(l),A.reject(l))).toPromise();return u.catch(()=>{}),await c.D,u}catch(c){const u=c,l=u.name!=="FirebaseError"&&o<3;if(D(Ze,"Transaction failed with error:",u.message,"Retrying:",l),this.close(),!l)return Promise.reject(u)}}}close(){this.db&&this.db.close(),this.db=void 0}}function dm(n){const e=n.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class UE{constructor(e){this.U=e,this.$=!1,this.W=null}get isDone(){return this.$}get G(){return this.W}set cursor(e){this.U=e}done(){this.$=!0}j(e){this.W=e}delete(){return Ln(this.U.delete())}}class $s extends V{constructor(e,t){super(S.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function vn(n){return n.name==="IndexedDbTransactionError"}class BE{constructor(e){this.store=e}put(e,t){let r;return t!==void 0?(D(Ze,"PUT",this.store.name,e,t),r=this.store.put(t,e)):(D(Ze,"PUT",this.store.name,"<auto-key>",e),r=this.store.put(e)),Ln(r)}add(e){return D(Ze,"ADD",this.store.name,e,e),Ln(this.store.add(e))}get(e){return Ln(this.store.get(e)).next(t=>(t===void 0&&(t=null),D(Ze,"GET",this.store.name,e,t),t))}delete(e){return D(Ze,"DELETE",this.store.name,e),Ln(this.store.delete(e))}count(){return D(Ze,"COUNT",this.store.name),Ln(this.store.count())}H(e,t){const r=this.options(e,t),s=r.index?this.store.index(r.index):this.store;if(typeof s.getAll=="function"){const i=s.getAll(r.range);return new A((o,c)=>{i.onerror=u=>{c(u.target.error)},i.onsuccess=u=>{o(u.target.result)}})}{const i=this.cursor(r),o=[];return this.J(i,(c,u)=>{o.push(u)}).next(()=>o)}}Z(e,t){const r=this.store.getAll(e,t===null?void 0:t);return new A((s,i)=>{r.onerror=o=>{i(o.target.error)},r.onsuccess=o=>{s(o.target.result)}})}X(e,t){D(Ze,"DELETE ALL",this.store.name);const r=this.options(e,t);r.Y=!1;const s=this.cursor(r);return this.J(s,(i,o,c)=>c.delete())}ee(e,t){let r;t?r=e:(r={},t=e);const s=this.cursor(r);return this.J(s,t)}te(e){const t=this.cursor({});return new A((r,s)=>{t.onerror=i=>{const o=xu(i.target.error);s(o)},t.onsuccess=i=>{const o=i.target.result;o?e(o.primaryKey,o.value).next(c=>{c?o.continue():r()}):r()}})}J(e,t){const r=[];return new A((s,i)=>{e.onerror=o=>{i(o.target.error)},e.onsuccess=o=>{const c=o.target.result;if(!c)return void s();const u=new UE(c),l=t(c.primaryKey,c.value,u);if(l instanceof A){const f=l.catch(p=>(u.done(),A.reject(p)));r.push(f)}u.isDone?s():u.G===null?c.continue():c.continue(u.G)}}).next(()=>A.waitFor(r))}options(e,t){let r;return e!==void 0&&(typeof e=="string"?r=e:t=e),{index:r,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const r=this.store.index(e.index);return e.Y?r.openKeyCursor(e.range,t):r.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function Ln(n){return new A((e,t)=>{n.onsuccess=r=>{const s=r.target.result;e(s)},n.onerror=r=>{const s=xu(r.target.error);t(s)}})}let Nd=!1;function xu(n){const e=dn.M(be());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(n.message.indexOf(t)>=0){const r=new V("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return Nd||(Nd=!0,setTimeout(()=>{throw r},0)),r}}return n}const js="IndexBackfiller";class qE{constructor(e,t){this.asyncQueue=e,this.ne=t,this.task=null}start(){this.re(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}re(e){D(js,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{const t=await this.ne.ie();D(js,`Documents written: ${t}`)}catch(t){vn(t)?D(js,"Ignoring IndexedDB error during index backfill: ",t):await Tn(t)}await this.re(6e4)})}}class $E{constructor(e,t){this.localStore=e,this.persistence=t}async ie(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.se(t,e))}se(e,t){const r=new Set;let s=t,i=!0;return A.doWhile(()=>i===!0&&s>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(o=>{if(o!==null&&!r.has(o))return D(js,`Processing collection: ${o}`),this.oe(e,o,s).next(c=>{s-=c,r.add(o)});i=!1})).next(()=>t-s)}oe(e,t,r){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(s=>this.localStore.localDocuments.getNextDocuments(e,t,s,r).next(i=>{const o=i.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next(()=>this._e(s,i)).next(c=>(D(js,`Updating offset: ${c}`),this.localStore.indexManager.updateCollectionGroup(e,t,c))).next(()=>o.size)}))}_e(e,t){let r=e;return t.changes.forEach((s,i)=>{const o=um(i);Ou(o,r)>0&&(r=o)}),new it(r.readTime,r.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
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
 */class He{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=r=>this.ae(r),this.ue=r=>t.writeSequenceNumber(r))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}He.ce=-1;/**
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
 */const $n=-1;function Ri(n){return n==null}function si(n){return n===0&&1/n==-1/0}function fm(n){return typeof n=="number"&&Number.isInteger(n)&&!si(n)&&n<=Number.MAX_SAFE_INTEGER&&n>=Number.MIN_SAFE_INTEGER}/**
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
 */const Do="";function je(n){let e="";for(let t=0;t<n.length;t++)e.length>0&&(e=Dd(e)),e=jE(n.get(t),e);return Dd(e)}function jE(n,e){let t=e;const r=n.length;for(let s=0;s<r;s++){const i=n.charAt(s);switch(i){case"\0":t+="";break;case Do:t+="";break;default:t+=i}}return t}function Dd(n){return n+Do+""}function vt(n){const e=n.length;if(U(e>=2,64408,{path:n}),e===2)return U(n.charAt(0)===Do&&n.charAt(1)==="",56145,{path:n}),ne.emptyPath();const t=e-2,r=[];let s="";for(let i=0;i<e;){const o=n.indexOf(Do,i);switch((o<0||o>t)&&M(50515,{path:n}),n.charAt(o+1)){case"":const c=n.substring(i,o);let u;s.length===0?u=c:(s+=c,u=s,s=""),r.push(u);break;case"":s+=n.substring(i,o),s+="\0";break;case"":s+=n.substring(i,o+1);break;default:M(61167,{path:n})}i=o+2}return new ne(r)}/**
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
 */const xn="remoteDocuments",bi="owner",mr="owner",ii="mutationQueues",GE="userId",gt="mutations",Vd="batchId",Bn="userMutationsIndex",Od=["userId","batchId"];/**
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
 */function mo(n,e){return[n,je(e)]}function pm(n,e,t){return[n,je(e),t]}const zE={},Mr="documentMutations",Vo="remoteDocumentsV14",WE=["prefixPath","collectionGroup","readTime","documentId"],go="documentKeyIndex",KE=["prefixPath","collectionGroup","documentId"],mm="collectionGroupIndex",HE=["collectionGroup","readTime","prefixPath","documentId"],oi="remoteDocumentGlobal",Xc="remoteDocumentGlobalKey",Fr="targets",gm="queryTargetsIndex",QE=["canonicalId","targetId"],Ur="targetDocuments",JE=["targetId","path"],Lu="documentTargetsIndex",YE=["path","targetId"],Oo="targetGlobalKey",jn="targetGlobal",ai="collectionParents",XE=["collectionId","parent"],Br="clientMetadata",ZE="clientId",ua="bundles",eT="bundleId",la="namedQueries",tT="name",Mu="indexConfiguration",nT="indexId",Zc="collectionGroupIndex",rT="collectionGroup",Gs="indexState",sT=["indexId","uid"],_m="sequenceNumberIndex",iT=["uid","sequenceNumber"],zs="indexEntries",oT=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],ym="documentKeyIndex",aT=["indexId","uid","orderedDocumentKey"],ha="documentOverlays",cT=["userId","collectionPath","documentId"],eu="collectionPathOverlayIndex",uT=["userId","collectionPath","largestBatchId"],Im="collectionGroupOverlayIndex",lT=["userId","collectionGroup","largestBatchId"],Fu="globals",hT="name",wm=[ii,gt,Mr,xn,Fr,bi,jn,Ur,Br,oi,ai,ua,la],dT=[...wm,ha],Em=[ii,gt,Mr,Vo,Fr,bi,jn,Ur,Br,oi,ai,ua,la,ha],Tm=Em,Uu=[...Tm,Mu,Gs,zs],fT=Uu,vm=[...Uu,Fu],pT=vm;/**
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
 */class tu extends hm{constructor(e,t){super(),this.le=e,this.currentSequenceNumber=t}}function Se(n,e){const t=F(n);return dn.O(t.le,e)}/**
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
 */function xd(n){let e=0;for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e++;return e}function An(n,e){for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e(t,n[t])}function mT(n,e){const t=[];for(const r in n)Object.prototype.hasOwnProperty.call(n,r)&&t.push(e(n[r],r,n));return t}function Am(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}/**
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
 */class ae{constructor(e,t){this.comparator=e,this.root=t||Le.EMPTY}insert(e,t){return new ae(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,Le.BLACK,null,null))}remove(e){return new ae(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Le.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const r=this.comparator(e,t.key);if(r===0)return t.value;r<0?t=t.left:r>0&&(t=t.right)}return null}indexOf(e){let t=0,r=this.root;for(;!r.isEmpty();){const s=this.comparator(e,r.key);if(s===0)return t+r.left.size;s<0?r=r.left:(t+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,r)=>(e(t,r),!1))}toString(){const e=[];return this.inorderTraversal((t,r)=>(e.push(`${t}:${r}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new no(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new no(this.root,e,this.comparator,!1)}getReverseIterator(){return new no(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new no(this.root,e,this.comparator,!0)}}class no{constructor(e,t,r,s){this.isReverse=s,this.nodeStack=[];let i=1;for(;!e.isEmpty();)if(i=t?r(e.key,t):1,t&&s&&(i*=-1),i<0)e=this.isReverse?e.left:e.right;else{if(i===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Le{constructor(e,t,r,s,i){this.key=e,this.value=t,this.color=r??Le.RED,this.left=s??Le.EMPTY,this.right=i??Le.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,r,s,i){return new Le(e??this.key,t??this.value,r??this.color,s??this.left,i??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,r){let s=this;const i=r(e,s.key);return s=i<0?s.copy(null,null,null,s.left.insert(e,t,r),null):i===0?s.copy(null,t,null,null,null):s.copy(null,null,null,null,s.right.insert(e,t,r)),s.fixUp()}removeMin(){if(this.left.isEmpty())return Le.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let r,s=this;if(t(e,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(e,t),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),t(e,s.key)===0){if(s.right.isEmpty())return Le.EMPTY;r=s.right.min(),s=s.copy(r.key,r.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(e,t))}return s.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Le.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Le.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw M(43730,{key:this.key,value:this.value});if(this.right.isRed())throw M(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw M(27949);return e+(this.isRed()?0:1)}}Le.EMPTY=null,Le.RED=!0,Le.BLACK=!1;Le.EMPTY=new class{constructor(){this.size=0}get key(){throw M(57766)}get value(){throw M(16141)}get color(){throw M(16727)}get left(){throw M(29726)}get right(){throw M(36894)}copy(e,t,r,s,i){return this}insert(e,t,r){return new Le(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
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
 */class ie{constructor(e){this.comparator=e,this.data=new ae(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,r)=>(e(t),!1))}forEachInRange(e,t){const r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){const s=r.getNext();if(this.comparator(s.key,e[1])>=0)return;t(s.key)}}forEachWhile(e,t){let r;for(r=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new Ld(this.data.getIterator())}getIteratorFrom(e){return new Ld(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(r=>{t=t.add(r)}),t}isEqual(e){if(!(e instanceof ie)||this.size!==e.size)return!1;const t=this.data.getIterator(),r=e.data.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=r.getNext().key;if(this.comparator(s,i)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new ie(this.comparator);return t.data=e,t}}class Ld{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function gr(n){return n.hasNext()?n.getNext():void 0}/**
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
 */class Qe{constructor(e){this.fields=e,e.sort(fe.comparator)}static empty(){return new Qe([])}unionWith(e){let t=new ie(fe.comparator);for(const r of this.fields)t=t.add(r);for(const r of e)t=t.add(r);return new Qe(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return xr(this.fields,e.fields,(t,r)=>t.isEqual(r))}}/**
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
 */class Rm extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
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
 */class we{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(s){try{return atob(s)}catch(i){throw typeof DOMException<"u"&&i instanceof DOMException?new Rm("Invalid base64 string: "+i):i}}(e);return new we(t)}static fromUint8Array(e){const t=function(s){let i="";for(let o=0;o<s.length;++o)i+=String.fromCharCode(s[o]);return i}(e);return new we(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=t.charCodeAt(s);return r}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return z(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}we.EMPTY_BYTE_STRING=new we("");const gT=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Ut(n){if(U(!!n,39018),typeof n=="string"){let e=0;const t=gT.exec(n);if(U(!!t,46558,{timestamp:n}),t[1]){let s=t[1];s=(s+"000000000").substr(0,9),e=Number(s)}const r=new Date(n);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:ue(n.seconds),nanos:ue(n.nanos)}}function ue(n){return typeof n=="number"?n:typeof n=="string"?Number(n):0}function Bt(n){return typeof n=="string"?we.fromBase64String(n):we.fromUint8Array(n)}/**
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
 */const bm="server_timestamp",Sm="__type__",Pm="__previous_value__",Cm="__local_write_time__";function da(n){var t,r;return((r=(((t=n==null?void 0:n.mapValue)==null?void 0:t.fields)||{})[Sm])==null?void 0:r.stringValue)===bm}function fa(n){const e=n.mapValue.fields[Pm];return da(e)?fa(e):e}function ci(n){const e=Ut(n.mapValue.fields[Cm].timestampValue);return new re(e.seconds,e.nanos)}/**
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
 */class _T{constructor(e,t,r,s,i,o,c,u,l,f,p){this.databaseId=e,this.appId=t,this.persistenceKey=r,this.host=s,this.ssl=i,this.forceLongPolling=o,this.autoDetectLongPolling=c,this.longPollingOptions=u,this.useFetchStreams=l,this.isUsingEmulator=f,this.apiKey=p}}const xo="(default)";class Hn{constructor(e,t){this.projectId=e,this.database=t||xo}static empty(){return new Hn("","")}get isDefaultDatabase(){return this.database===xo}isEqual(e){return e instanceof Hn&&e.projectId===this.projectId&&e.database===this.database}}function yT(n,e){if(!Object.prototype.hasOwnProperty.apply(n.options,["projectId"]))throw new V(S.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Hn(n.options.projectId,e)}/**
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
 */const Bu="__type__",km="__max__",an={mapValue:{fields:{__type__:{stringValue:km}}}},qu="__vector__",qr="value",_o={nullValue:"NULL_VALUE"};function gn(n){return"nullValue"in n?0:"booleanValue"in n?1:"integerValue"in n||"doubleValue"in n?2:"timestampValue"in n?3:"stringValue"in n?5:"bytesValue"in n?6:"referenceValue"in n?7:"geoPointValue"in n?8:"arrayValue"in n?9:"mapValue"in n?da(n)?4:Nm(n)?9007199254740991:pa(n)?10:11:M(28295,{value:n})}function St(n,e){if(n===e)return!0;const t=gn(n);if(t!==gn(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return n.booleanValue===e.booleanValue;case 4:return ci(n).isEqual(ci(e));case 3:return function(s,i){if(typeof s.timestampValue=="string"&&typeof i.timestampValue=="string"&&s.timestampValue.length===i.timestampValue.length)return s.timestampValue===i.timestampValue;const o=Ut(s.timestampValue),c=Ut(i.timestampValue);return o.seconds===c.seconds&&o.nanos===c.nanos}(n,e);case 5:return n.stringValue===e.stringValue;case 6:return function(s,i){return Bt(s.bytesValue).isEqual(Bt(i.bytesValue))}(n,e);case 7:return n.referenceValue===e.referenceValue;case 8:return function(s,i){return ue(s.geoPointValue.latitude)===ue(i.geoPointValue.latitude)&&ue(s.geoPointValue.longitude)===ue(i.geoPointValue.longitude)}(n,e);case 2:return function(s,i){if("integerValue"in s&&"integerValue"in i)return ue(s.integerValue)===ue(i.integerValue);if("doubleValue"in s&&"doubleValue"in i){const o=ue(s.doubleValue),c=ue(i.doubleValue);return o===c?si(o)===si(c):isNaN(o)&&isNaN(c)}return!1}(n,e);case 9:return xr(n.arrayValue.values||[],e.arrayValue.values||[],St);case 10:case 11:return function(s,i){const o=s.mapValue.fields||{},c=i.mapValue.fields||{};if(xd(o)!==xd(c))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(c[u]===void 0||!St(o[u],c[u])))return!1;return!0}(n,e);default:return M(52216,{left:n})}}function ui(n,e){return(n.values||[]).find(t=>St(t,e))!==void 0}function _n(n,e){if(n===e)return 0;const t=gn(n),r=gn(e);if(t!==r)return z(t,r);switch(t){case 0:case 9007199254740991:return 0;case 1:return z(n.booleanValue,e.booleanValue);case 2:return function(i,o){const c=ue(i.integerValue||i.doubleValue),u=ue(o.integerValue||o.doubleValue);return c<u?-1:c>u?1:c===u?0:isNaN(c)?isNaN(u)?0:-1:1}(n,e);case 3:return Md(n.timestampValue,e.timestampValue);case 4:return Md(ci(n),ci(e));case 5:return Qc(n.stringValue,e.stringValue);case 6:return function(i,o){const c=Bt(i),u=Bt(o);return c.compareTo(u)}(n.bytesValue,e.bytesValue);case 7:return function(i,o){const c=i.split("/"),u=o.split("/");for(let l=0;l<c.length&&l<u.length;l++){const f=z(c[l],u[l]);if(f!==0)return f}return z(c.length,u.length)}(n.referenceValue,e.referenceValue);case 8:return function(i,o){const c=z(ue(i.latitude),ue(o.latitude));return c!==0?c:z(ue(i.longitude),ue(o.longitude))}(n.geoPointValue,e.geoPointValue);case 9:return Fd(n.arrayValue,e.arrayValue);case 10:return function(i,o){var g,v,C,N;const c=i.fields||{},u=o.fields||{},l=(g=c[qr])==null?void 0:g.arrayValue,f=(v=u[qr])==null?void 0:v.arrayValue,p=z(((C=l==null?void 0:l.values)==null?void 0:C.length)||0,((N=f==null?void 0:f.values)==null?void 0:N.length)||0);return p!==0?p:Fd(l,f)}(n.mapValue,e.mapValue);case 11:return function(i,o){if(i===an.mapValue&&o===an.mapValue)return 0;if(i===an.mapValue)return 1;if(o===an.mapValue)return-1;const c=i.fields||{},u=Object.keys(c),l=o.fields||{},f=Object.keys(l);u.sort(),f.sort();for(let p=0;p<u.length&&p<f.length;++p){const g=Qc(u[p],f[p]);if(g!==0)return g;const v=_n(c[u[p]],l[f[p]]);if(v!==0)return v}return z(u.length,f.length)}(n.mapValue,e.mapValue);default:throw M(23264,{he:t})}}function Md(n,e){if(typeof n=="string"&&typeof e=="string"&&n.length===e.length)return z(n,e);const t=Ut(n),r=Ut(e),s=z(t.seconds,r.seconds);return s!==0?s:z(t.nanos,r.nanos)}function Fd(n,e){const t=n.values||[],r=e.values||[];for(let s=0;s<t.length&&s<r.length;++s){const i=_n(t[s],r[s]);if(i)return i}return z(t.length,r.length)}function $r(n){return nu(n)}function nu(n){return"nullValue"in n?"null":"booleanValue"in n?""+n.booleanValue:"integerValue"in n?""+n.integerValue:"doubleValue"in n?""+n.doubleValue:"timestampValue"in n?function(t){const r=Ut(t);return`time(${r.seconds},${r.nanos})`}(n.timestampValue):"stringValue"in n?n.stringValue:"bytesValue"in n?function(t){return Bt(t).toBase64()}(n.bytesValue):"referenceValue"in n?function(t){return x.fromName(t).toString()}(n.referenceValue):"geoPointValue"in n?function(t){return`geo(${t.latitude},${t.longitude})`}(n.geoPointValue):"arrayValue"in n?function(t){let r="[",s=!0;for(const i of t.values||[])s?s=!1:r+=",",r+=nu(i);return r+"]"}(n.arrayValue):"mapValue"in n?function(t){const r=Object.keys(t.fields||{}).sort();let s="{",i=!0;for(const o of r)i?i=!1:s+=",",s+=`${o}:${nu(t.fields[o])}`;return s+"}"}(n.mapValue):M(61005,{value:n})}function yo(n){switch(gn(n)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=fa(n);return e?16+yo(e):16;case 5:return 2*n.stringValue.length;case 6:return Bt(n.bytesValue).approximateByteSize();case 7:return n.referenceValue.length;case 9:return function(r){return(r.values||[]).reduce((s,i)=>s+yo(i),0)}(n.arrayValue);case 10:case 11:return function(r){let s=0;return An(r.fields,(i,o)=>{s+=i.length+yo(o)}),s}(n.mapValue);default:throw M(13486,{value:n})}}function Qn(n,e){return{referenceValue:`projects/${n.projectId}/databases/${n.database}/documents/${e.path.canonicalString()}`}}function ru(n){return!!n&&"integerValue"in n}function li(n){return!!n&&"arrayValue"in n}function Ud(n){return!!n&&"nullValue"in n}function Bd(n){return!!n&&"doubleValue"in n&&isNaN(Number(n.doubleValue))}function Io(n){return!!n&&"mapValue"in n}function pa(n){var t,r;return((r=(((t=n==null?void 0:n.mapValue)==null?void 0:t.fields)||{})[Bu])==null?void 0:r.stringValue)===qu}function Ws(n){if(n.geoPointValue)return{geoPointValue:{...n.geoPointValue}};if(n.timestampValue&&typeof n.timestampValue=="object")return{timestampValue:{...n.timestampValue}};if(n.mapValue){const e={mapValue:{fields:{}}};return An(n.mapValue.fields,(t,r)=>e.mapValue.fields[t]=Ws(r)),e}if(n.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(n.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=Ws(n.arrayValue.values[t]);return e}return{...n}}function Nm(n){return(((n.mapValue||{}).fields||{}).__type__||{}).stringValue===km}const Dm={mapValue:{fields:{[Bu]:{stringValue:qu},[qr]:{arrayValue:{}}}}};function IT(n){return"nullValue"in n?_o:"booleanValue"in n?{booleanValue:!1}:"integerValue"in n||"doubleValue"in n?{doubleValue:NaN}:"timestampValue"in n?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in n?{stringValue:""}:"bytesValue"in n?{bytesValue:""}:"referenceValue"in n?Qn(Hn.empty(),x.empty()):"geoPointValue"in n?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in n?{arrayValue:{}}:"mapValue"in n?pa(n)?Dm:{mapValue:{}}:M(35942,{value:n})}function wT(n){return"nullValue"in n?{booleanValue:!1}:"booleanValue"in n?{doubleValue:NaN}:"integerValue"in n||"doubleValue"in n?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in n?{stringValue:""}:"stringValue"in n?{bytesValue:""}:"bytesValue"in n?Qn(Hn.empty(),x.empty()):"referenceValue"in n?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in n?{arrayValue:{}}:"arrayValue"in n?Dm:"mapValue"in n?pa(n)?{mapValue:{}}:an:M(61959,{value:n})}function qd(n,e){const t=_n(n.value,e.value);return t!==0?t:n.inclusive&&!e.inclusive?-1:!n.inclusive&&e.inclusive?1:0}function $d(n,e){const t=_n(n.value,e.value);return t!==0?t:n.inclusive&&!e.inclusive?1:!n.inclusive&&e.inclusive?-1:0}/**
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
 */class De{constructor(e){this.value=e}static empty(){return new De({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let r=0;r<e.length-1;++r)if(t=(t.mapValue.fields||{})[e.get(r)],!Io(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=Ws(t)}setAll(e){let t=fe.emptyPath(),r={},s=[];e.forEach((o,c)=>{if(!t.isImmediateParentOf(c)){const u=this.getFieldsMap(t);this.applyChanges(u,r,s),r={},s=[],t=c.popLast()}o?r[c.lastSegment()]=Ws(o):s.push(c.lastSegment())});const i=this.getFieldsMap(t);this.applyChanges(i,r,s)}delete(e){const t=this.field(e.popLast());Io(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return St(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let r=0;r<e.length;++r){let s=t.mapValue.fields[e.get(r)];Io(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},t.mapValue.fields[e.get(r)]=s),t=s}return t.mapValue.fields}applyChanges(e,t,r){An(t,(s,i)=>e[s]=i);for(const s of r)delete e[s]}clone(){return new De(Ws(this.value))}}function Vm(n){const e=[];return An(n.fields,(t,r)=>{const s=new fe([t]);if(Io(r)){const i=Vm(r.mapValue).fields;if(i.length===0)e.push(s);else for(const o of i)e.push(s.child(o))}else e.push(s)}),new Qe(e)}/**
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
 */class le{constructor(e,t,r,s,i,o,c){this.key=e,this.documentType=t,this.version=r,this.readTime=s,this.createTime=i,this.data=o,this.documentState=c}static newInvalidDocument(e){return new le(e,0,$.min(),$.min(),$.min(),De.empty(),0)}static newFoundDocument(e,t,r,s){return new le(e,1,t,$.min(),r,s,0)}static newNoDocument(e,t){return new le(e,2,t,$.min(),$.min(),De.empty(),0)}static newUnknownDocument(e,t){return new le(e,3,t,$.min(),$.min(),De.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual($.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=De.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=De.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=$.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof le&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new le(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class yn{constructor(e,t){this.position=e,this.inclusive=t}}function jd(n,e,t){let r=0;for(let s=0;s<n.position.length;s++){const i=e[s],o=n.position[s];if(i.field.isKeyField()?r=x.comparator(x.fromName(o.referenceValue),t.key):r=_n(o,t.data.field(i.field)),i.dir==="desc"&&(r*=-1),r!==0)break}return r}function Gd(n,e){if(n===null)return e===null;if(e===null||n.inclusive!==e.inclusive||n.position.length!==e.position.length)return!1;for(let t=0;t<n.position.length;t++)if(!St(n.position[t],e.position[t]))return!1;return!0}/**
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
 */class hi{constructor(e,t="asc"){this.field=e,this.dir=t}}function ET(n,e){return n.dir===e.dir&&n.field.isEqual(e.field)}/**
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
 */class Om{}class Z extends Om{constructor(e,t,r){super(),this.field=e,this.op=t,this.value=r}static create(e,t,r){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,r):new TT(e,t,r):t==="array-contains"?new RT(e,r):t==="in"?new Bm(e,r):t==="not-in"?new bT(e,r):t==="array-contains-any"?new ST(e,r):new Z(e,t,r)}static createKeyFieldInFilter(e,t,r){return t==="in"?new vT(e,r):new AT(e,r)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(_n(t,this.value)):t!==null&&gn(this.value)===gn(t)&&this.matchesComparison(_n(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return M(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class se extends Om{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null}static create(e,t){return new se(e,t)}matches(e){return jr(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function jr(n){return n.op==="and"}function su(n){return n.op==="or"}function $u(n){return xm(n)&&jr(n)}function xm(n){for(const e of n.filters)if(e instanceof se)return!1;return!0}function iu(n){if(n instanceof Z)return n.field.canonicalString()+n.op.toString()+$r(n.value);if($u(n))return n.filters.map(e=>iu(e)).join(",");{const e=n.filters.map(t=>iu(t)).join(",");return`${n.op}(${e})`}}function Lm(n,e){return n instanceof Z?function(r,s){return s instanceof Z&&r.op===s.op&&r.field.isEqual(s.field)&&St(r.value,s.value)}(n,e):n instanceof se?function(r,s){return s instanceof se&&r.op===s.op&&r.filters.length===s.filters.length?r.filters.reduce((i,o,c)=>i&&Lm(o,s.filters[c]),!0):!1}(n,e):void M(19439)}function Mm(n,e){const t=n.filters.concat(e);return se.create(t,n.op)}function Fm(n){return n instanceof Z?function(t){return`${t.field.canonicalString()} ${t.op} ${$r(t.value)}`}(n):n instanceof se?function(t){return t.op.toString()+" {"+t.getFilters().map(Fm).join(" ,")+"}"}(n):"Filter"}class TT extends Z{constructor(e,t,r){super(e,t,r),this.key=x.fromName(r.referenceValue)}matches(e){const t=x.comparator(e.key,this.key);return this.matchesComparison(t)}}class vT extends Z{constructor(e,t){super(e,"in",t),this.keys=Um("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class AT extends Z{constructor(e,t){super(e,"not-in",t),this.keys=Um("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function Um(n,e){var t;return(((t=e.arrayValue)==null?void 0:t.values)||[]).map(r=>x.fromName(r.referenceValue))}class RT extends Z{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return li(t)&&ui(t.arrayValue,this.value)}}class Bm extends Z{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&ui(this.value.arrayValue,t)}}class bT extends Z{constructor(e,t){super(e,"not-in",t)}matches(e){if(ui(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!ui(this.value.arrayValue,t)}}class ST extends Z{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!li(t)||!t.arrayValue.values)&&t.arrayValue.values.some(r=>ui(this.value.arrayValue,r))}}/**
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
 */class PT{constructor(e,t=null,r=[],s=[],i=null,o=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=r,this.filters=s,this.limit=i,this.startAt=o,this.endAt=c,this.Te=null}}function ou(n,e=null,t=[],r=[],s=null,i=null,o=null){return new PT(n,e,t,r,s,i,o)}function Jn(n){const e=F(n);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(r=>iu(r)).join(","),t+="|ob:",t+=e.orderBy.map(r=>function(i){return i.field.canonicalString()+i.dir}(r)).join(","),Ri(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(r=>$r(r)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(r=>$r(r)).join(",")),e.Te=t}return e.Te}function Si(n,e){if(n.limit!==e.limit||n.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<n.orderBy.length;t++)if(!ET(n.orderBy[t],e.orderBy[t]))return!1;if(n.filters.length!==e.filters.length)return!1;for(let t=0;t<n.filters.length;t++)if(!Lm(n.filters[t],e.filters[t]))return!1;return n.collectionGroup===e.collectionGroup&&!!n.path.isEqual(e.path)&&!!Gd(n.startAt,e.startAt)&&Gd(n.endAt,e.endAt)}function Lo(n){return x.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0}function Mo(n,e){return n.filters.filter(t=>t instanceof Z&&t.field.isEqual(e))}function zd(n,e,t){let r=_o,s=!0;for(const i of Mo(n,e)){let o=_o,c=!0;switch(i.op){case"<":case"<=":o=IT(i.value);break;case"==":case"in":case">=":o=i.value;break;case">":o=i.value,c=!1;break;case"!=":case"not-in":o=_o}qd({value:r,inclusive:s},{value:o,inclusive:c})<0&&(r=o,s=c)}if(t!==null){for(let i=0;i<n.orderBy.length;++i)if(n.orderBy[i].field.isEqual(e)){const o=t.position[i];qd({value:r,inclusive:s},{value:o,inclusive:t.inclusive})<0&&(r=o,s=t.inclusive);break}}return{value:r,inclusive:s}}function Wd(n,e,t){let r=an,s=!0;for(const i of Mo(n,e)){let o=an,c=!0;switch(i.op){case">=":case">":o=wT(i.value),c=!1;break;case"==":case"in":case"<=":o=i.value;break;case"<":o=i.value,c=!1;break;case"!=":case"not-in":o=an}$d({value:r,inclusive:s},{value:o,inclusive:c})>0&&(r=o,s=c)}if(t!==null){for(let i=0;i<n.orderBy.length;++i)if(n.orderBy[i].field.isEqual(e)){const o=t.position[i];$d({value:r,inclusive:s},{value:o,inclusive:t.inclusive})>0&&(r=o,s=t.inclusive);break}}return{value:r,inclusive:s}}/**
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
 */class ur{constructor(e,t=null,r=[],s=[],i=null,o="F",c=null,u=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=r,this.filters=s,this.limit=i,this.limitType=o,this.startAt=c,this.endAt=u,this.Ie=null,this.Ee=null,this.Re=null,this.startAt,this.endAt}}function qm(n,e,t,r,s,i,o,c){return new ur(n,e,t,r,s,i,o,c)}function Pi(n){return new ur(n)}function Kd(n){return n.filters.length===0&&n.limit===null&&n.startAt==null&&n.endAt==null&&(n.explicitOrderBy.length===0||n.explicitOrderBy.length===1&&n.explicitOrderBy[0].field.isKeyField())}function CT(n){return x.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0}function ju(n){return n.collectionGroup!==null}function Sr(n){const e=F(n);if(e.Ie===null){e.Ie=[];const t=new Set;for(const i of e.explicitOrderBy)e.Ie.push(i),t.add(i.field.canonicalString());const r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let c=new ie(fe.comparator);return o.filters.forEach(u=>{u.getFlattenedFilters().forEach(l=>{l.isInequality()&&(c=c.add(l.field))})}),c})(e).forEach(i=>{t.has(i.canonicalString())||i.isKeyField()||e.Ie.push(new hi(i,r))}),t.has(fe.keyField().canonicalString())||e.Ie.push(new hi(fe.keyField(),r))}return e.Ie}function rt(n){const e=F(n);return e.Ee||(e.Ee=$m(e,Sr(n))),e.Ee}function kT(n){const e=F(n);return e.Re||(e.Re=$m(e,n.explicitOrderBy)),e.Re}function $m(n,e){if(n.limitType==="F")return ou(n.path,n.collectionGroup,e,n.filters,n.limit,n.startAt,n.endAt);{e=e.map(s=>{const i=s.dir==="desc"?"asc":"desc";return new hi(s.field,i)});const t=n.endAt?new yn(n.endAt.position,n.endAt.inclusive):null,r=n.startAt?new yn(n.startAt.position,n.startAt.inclusive):null;return ou(n.path,n.collectionGroup,e,n.filters,n.limit,t,r)}}function au(n,e){const t=n.filters.concat([e]);return new ur(n.path,n.collectionGroup,n.explicitOrderBy.slice(),t,n.limit,n.limitType,n.startAt,n.endAt)}function NT(n,e){const t=n.explicitOrderBy.concat([e]);return new ur(n.path,n.collectionGroup,t,n.filters.slice(),n.limit,n.limitType,n.startAt,n.endAt)}function Fo(n,e,t){return new ur(n.path,n.collectionGroup,n.explicitOrderBy.slice(),n.filters.slice(),e,t,n.startAt,n.endAt)}function DT(n,e){return new ur(n.path,n.collectionGroup,n.explicitOrderBy.slice(),n.filters.slice(),n.limit,n.limitType,e,n.endAt)}function ma(n,e){return Si(rt(n),rt(e))&&n.limitType===e.limitType}function jm(n){return`${Jn(rt(n))}|lt:${n.limitType}`}function Tr(n){return`Query(target=${function(t){let r=t.path.canonicalString();return t.collectionGroup!==null&&(r+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(r+=`, filters: [${t.filters.map(s=>Fm(s)).join(", ")}]`),Ri(t.limit)||(r+=", limit: "+t.limit),t.orderBy.length>0&&(r+=`, orderBy: [${t.orderBy.map(s=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(s)).join(", ")}]`),t.startAt&&(r+=", startAt: ",r+=t.startAt.inclusive?"b:":"a:",r+=t.startAt.position.map(s=>$r(s)).join(",")),t.endAt&&(r+=", endAt: ",r+=t.endAt.inclusive?"a:":"b:",r+=t.endAt.position.map(s=>$r(s)).join(",")),`Target(${r})`}(rt(n))}; limitType=${n.limitType})`}function Ci(n,e){return e.isFoundDocument()&&function(r,s){const i=s.key.path;return r.collectionGroup!==null?s.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(i):x.isDocumentKey(r.path)?r.path.isEqual(i):r.path.isImmediateParentOf(i)}(n,e)&&function(r,s){for(const i of Sr(r))if(!i.field.isKeyField()&&s.data.field(i.field)===null)return!1;return!0}(n,e)&&function(r,s){for(const i of r.filters)if(!i.matches(s))return!1;return!0}(n,e)&&function(r,s){return!(r.startAt&&!function(o,c,u){const l=jd(o,c,u);return o.inclusive?l<=0:l<0}(r.startAt,Sr(r),s)||r.endAt&&!function(o,c,u){const l=jd(o,c,u);return o.inclusive?l>=0:l>0}(r.endAt,Sr(r),s))}(n,e)}function Gm(n){return n.collectionGroup||(n.path.length%2==1?n.path.lastSegment():n.path.get(n.path.length-2))}function zm(n){return(e,t)=>{let r=!1;for(const s of Sr(n)){const i=VT(s,e,t);if(i!==0)return i;r=r||s.field.isKeyField()}return 0}}function VT(n,e,t){const r=n.field.isKeyField()?x.comparator(e.key,t.key):function(i,o,c){const u=o.data.field(i),l=c.data.field(i);return u!==null&&l!==null?_n(u,l):M(42886)}(n.field,e,t);switch(n.dir){case"asc":return r;case"desc":return-1*r;default:return M(19790,{direction:n.dir})}}/**
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
 */class jt{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r!==void 0){for(const[s,i]of r)if(this.equalsFn(s,e))return i}}has(e){return this.get(e)!==void 0}set(e,t){const r=this.mapKeyFn(e),s=this.inner[r];if(s===void 0)return this.inner[r]=[[e,t]],void this.innerSize++;for(let i=0;i<s.length;i++)if(this.equalsFn(s[i][0],e))return void(s[i]=[e,t]);s.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r===void 0)return!1;for(let s=0;s<r.length;s++)if(this.equalsFn(r[s][0],e))return r.length===1?delete this.inner[t]:r.splice(s,1),this.innerSize--,!0;return!1}forEach(e){An(this.inner,(t,r)=>{for(const[s,i]of r)e(s,i)})}isEmpty(){return Am(this.inner)}size(){return this.innerSize}}/**
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
 */const OT=new ae(x.comparator);function tt(){return OT}const Wm=new ae(x.comparator);function Ls(...n){let e=Wm;for(const t of n)e=e.insert(t.key,t);return e}function Km(n){let e=Wm;return n.forEach((t,r)=>e=e.insert(t,r.overlayedDocument)),e}function At(){return Ks()}function Hm(){return Ks()}function Ks(){return new jt(n=>n.toString(),(n,e)=>n.isEqual(e))}const xT=new ae(x.comparator),LT=new ie(x.comparator);function H(...n){let e=LT;for(const t of n)e=e.add(t);return e}const MT=new ie(z);function Gu(){return MT}/**
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
 */function zu(n,e){if(n.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:si(e)?"-0":e}}function Qm(n){return{integerValue:""+n}}function Jm(n,e){return fm(e)?Qm(e):zu(n,e)}/**
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
 */class ga{constructor(){this._=void 0}}function FT(n,e,t){return n instanceof di?function(s,i){const o={fields:{[Sm]:{stringValue:bm},[Cm]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return i&&da(i)&&(i=fa(i)),i&&(o.fields[Pm]=i),{mapValue:o}}(t,e):n instanceof Gr?Xm(n,e):n instanceof zr?Zm(n,e):function(s,i){const o=Ym(s,i),c=Hd(o)+Hd(s.Ae);return ru(o)&&ru(s.Ae)?Qm(c):zu(s.serializer,c)}(n,e)}function UT(n,e,t){return n instanceof Gr?Xm(n,e):n instanceof zr?Zm(n,e):t}function Ym(n,e){return n instanceof Wr?function(r){return ru(r)||function(i){return!!i&&"doubleValue"in i}(r)}(e)?e:{integerValue:0}:null}class di extends ga{}class Gr extends ga{constructor(e){super(),this.elements=e}}function Xm(n,e){const t=eg(e);for(const r of n.elements)t.some(s=>St(s,r))||t.push(r);return{arrayValue:{values:t}}}class zr extends ga{constructor(e){super(),this.elements=e}}function Zm(n,e){let t=eg(e);for(const r of n.elements)t=t.filter(s=>!St(s,r));return{arrayValue:{values:t}}}class Wr extends ga{constructor(e,t){super(),this.serializer=e,this.Ae=t}}function Hd(n){return ue(n.integerValue||n.doubleValue)}function eg(n){return li(n)&&n.arrayValue.values?n.arrayValue.values.slice():[]}/**
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
 */class tg{constructor(e,t){this.field=e,this.transform=t}}function BT(n,e){return n.field.isEqual(e.field)&&function(r,s){return r instanceof Gr&&s instanceof Gr||r instanceof zr&&s instanceof zr?xr(r.elements,s.elements,St):r instanceof Wr&&s instanceof Wr?St(r.Ae,s.Ae):r instanceof di&&s instanceof di}(n.transform,e.transform)}class qT{constructor(e,t){this.version=e,this.transformResults=t}}class he{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new he}static exists(e){return new he(void 0,e)}static updateTime(e){return new he(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function wo(n,e){return n.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(n.updateTime):n.exists===void 0||n.exists===e.isFoundDocument()}class _a{}function ng(n,e){if(!n.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return n.isNoDocument()?new ns(n.key,he.none()):new ts(n.key,n.data,he.none());{const t=n.data,r=De.empty();let s=new ie(fe.comparator);for(let i of e.fields)if(!s.has(i)){let o=t.field(i);o===null&&i.length>1&&(i=i.popLast(),o=t.field(i)),o===null?r.delete(i):r.set(i,o),s=s.add(i)}return new Gt(n.key,r,new Qe(s.toArray()),he.none())}}function $T(n,e,t){n instanceof ts?function(s,i,o){const c=s.value.clone(),u=Jd(s.fieldTransforms,i,o.transformResults);c.setAll(u),i.convertToFoundDocument(o.version,c).setHasCommittedMutations()}(n,e,t):n instanceof Gt?function(s,i,o){if(!wo(s.precondition,i))return void i.convertToUnknownDocument(o.version);const c=Jd(s.fieldTransforms,i,o.transformResults),u=i.data;u.setAll(rg(s)),u.setAll(c),i.convertToFoundDocument(o.version,u).setHasCommittedMutations()}(n,e,t):function(s,i,o){i.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,t)}function Hs(n,e,t,r){return n instanceof ts?function(i,o,c,u){if(!wo(i.precondition,o))return c;const l=i.value.clone(),f=Yd(i.fieldTransforms,u,o);return l.setAll(f),o.convertToFoundDocument(o.version,l).setHasLocalMutations(),null}(n,e,t,r):n instanceof Gt?function(i,o,c,u){if(!wo(i.precondition,o))return c;const l=Yd(i.fieldTransforms,u,o),f=o.data;return f.setAll(rg(i)),f.setAll(l),o.convertToFoundDocument(o.version,f).setHasLocalMutations(),c===null?null:c.unionWith(i.fieldMask.fields).unionWith(i.fieldTransforms.map(p=>p.field))}(n,e,t,r):function(i,o,c){return wo(i.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):c}(n,e,t)}function jT(n,e){let t=null;for(const r of n.fieldTransforms){const s=e.data.field(r.field),i=Ym(r.transform,s||null);i!=null&&(t===null&&(t=De.empty()),t.set(r.field,i))}return t||null}function Qd(n,e){return n.type===e.type&&!!n.key.isEqual(e.key)&&!!n.precondition.isEqual(e.precondition)&&!!function(r,s){return r===void 0&&s===void 0||!(!r||!s)&&xr(r,s,(i,o)=>BT(i,o))}(n.fieldTransforms,e.fieldTransforms)&&(n.type===0?n.value.isEqual(e.value):n.type!==1||n.data.isEqual(e.data)&&n.fieldMask.isEqual(e.fieldMask))}class ts extends _a{constructor(e,t,r,s=[]){super(),this.key=e,this.value=t,this.precondition=r,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class Gt extends _a{constructor(e,t,r,s,i=[]){super(),this.key=e,this.data=t,this.fieldMask=r,this.precondition=s,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function rg(n){const e=new Map;return n.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){const r=n.data.field(t);e.set(t,r)}}),e}function Jd(n,e,t){const r=new Map;U(n.length===t.length,32656,{Ve:t.length,de:n.length});for(let s=0;s<t.length;s++){const i=n[s],o=i.transform,c=e.data.field(i.field);r.set(i.field,UT(o,c,t[s]))}return r}function Yd(n,e,t){const r=new Map;for(const s of n){const i=s.transform,o=t.data.field(s.field);r.set(s.field,FT(i,o,e))}return r}class ns extends _a{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class Wu extends _a{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
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
 */class Ku{constructor(e,t,r,s){this.batchId=e,this.localWriteTime=t,this.baseMutations=r,this.mutations=s}applyToRemoteDocument(e,t){const r=t.mutationResults;for(let s=0;s<this.mutations.length;s++){const i=this.mutations[s];i.key.isEqual(e.key)&&$T(i,e,r[s])}}applyToLocalView(e,t){for(const r of this.baseMutations)r.key.isEqual(e.key)&&(t=Hs(r,e,t,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(e.key)&&(t=Hs(r,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const r=Hm();return this.mutations.forEach(s=>{const i=e.get(s.key),o=i.overlayedDocument;let c=this.applyToLocalView(o,i.mutatedFields);c=t.has(s.key)?null:c;const u=ng(o,c);u!==null&&r.set(s.key,u),o.isValidDocument()||o.convertToNoDocument($.min())}),r}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),H())}isEqual(e){return this.batchId===e.batchId&&xr(this.mutations,e.mutations,(t,r)=>Qd(t,r))&&xr(this.baseMutations,e.baseMutations,(t,r)=>Qd(t,r))}}class Hu{constructor(e,t,r,s){this.batch=e,this.commitVersion=t,this.mutationResults=r,this.docVersions=s}static from(e,t,r){U(e.mutations.length===r.length,58842,{me:e.mutations.length,fe:r.length});let s=function(){return xT}();const i=e.mutations;for(let o=0;o<i.length;o++)s=s.insert(i[o].key,r[o].version);return new Hu(e,t,r,s)}}/**
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
 */class Qu{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
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
 */class GT{constructor(e,t,r){this.alias=e,this.aggregateType=t,this.fieldPath=r}}/**
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
 */class zT{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
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
 */var Ee,ee;function sg(n){switch(n){case S.OK:return M(64938);case S.CANCELLED:case S.UNKNOWN:case S.DEADLINE_EXCEEDED:case S.RESOURCE_EXHAUSTED:case S.INTERNAL:case S.UNAVAILABLE:case S.UNAUTHENTICATED:return!1;case S.INVALID_ARGUMENT:case S.NOT_FOUND:case S.ALREADY_EXISTS:case S.PERMISSION_DENIED:case S.FAILED_PRECONDITION:case S.ABORTED:case S.OUT_OF_RANGE:case S.UNIMPLEMENTED:case S.DATA_LOSS:return!0;default:return M(15467,{code:n})}}function ig(n){if(n===void 0)return Ie("GRPC error has no .code"),S.UNKNOWN;switch(n){case Ee.OK:return S.OK;case Ee.CANCELLED:return S.CANCELLED;case Ee.UNKNOWN:return S.UNKNOWN;case Ee.DEADLINE_EXCEEDED:return S.DEADLINE_EXCEEDED;case Ee.RESOURCE_EXHAUSTED:return S.RESOURCE_EXHAUSTED;case Ee.INTERNAL:return S.INTERNAL;case Ee.UNAVAILABLE:return S.UNAVAILABLE;case Ee.UNAUTHENTICATED:return S.UNAUTHENTICATED;case Ee.INVALID_ARGUMENT:return S.INVALID_ARGUMENT;case Ee.NOT_FOUND:return S.NOT_FOUND;case Ee.ALREADY_EXISTS:return S.ALREADY_EXISTS;case Ee.PERMISSION_DENIED:return S.PERMISSION_DENIED;case Ee.FAILED_PRECONDITION:return S.FAILED_PRECONDITION;case Ee.ABORTED:return S.ABORTED;case Ee.OUT_OF_RANGE:return S.OUT_OF_RANGE;case Ee.UNIMPLEMENTED:return S.UNIMPLEMENTED;case Ee.DATA_LOSS:return S.DATA_LOSS;default:return M(39323,{code:n})}}(ee=Ee||(Ee={}))[ee.OK=0]="OK",ee[ee.CANCELLED=1]="CANCELLED",ee[ee.UNKNOWN=2]="UNKNOWN",ee[ee.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",ee[ee.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",ee[ee.NOT_FOUND=5]="NOT_FOUND",ee[ee.ALREADY_EXISTS=6]="ALREADY_EXISTS",ee[ee.PERMISSION_DENIED=7]="PERMISSION_DENIED",ee[ee.UNAUTHENTICATED=16]="UNAUTHENTICATED",ee[ee.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",ee[ee.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",ee[ee.ABORTED=10]="ABORTED",ee[ee.OUT_OF_RANGE=11]="OUT_OF_RANGE",ee[ee.UNIMPLEMENTED=12]="UNIMPLEMENTED",ee[ee.INTERNAL=13]="INTERNAL",ee[ee.UNAVAILABLE=14]="UNAVAILABLE",ee[ee.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function WT(){return new TextEncoder}/**
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
 */const KT=new hn([4294967295,4294967295],0);function Xd(n){const e=WT().encode(n),t=new Xp;return t.update(e),new Uint8Array(t.digest())}function Zd(n){const e=new DataView(n.buffer),t=e.getUint32(0,!0),r=e.getUint32(4,!0),s=e.getUint32(8,!0),i=e.getUint32(12,!0);return[new hn([t,r],0),new hn([s,i],0)]}class Ju{constructor(e,t,r){if(this.bitmap=e,this.padding=t,this.hashCount=r,t<0||t>=8)throw new Ms(`Invalid padding: ${t}`);if(r<0)throw new Ms(`Invalid hash count: ${r}`);if(e.length>0&&this.hashCount===0)throw new Ms(`Invalid hash count: ${r}`);if(e.length===0&&t!==0)throw new Ms(`Invalid padding when bitmap length is 0: ${t}`);this.ge=8*e.length-t,this.pe=hn.fromNumber(this.ge)}ye(e,t,r){let s=e.add(t.multiply(hn.fromNumber(r)));return s.compare(KT)===1&&(s=new hn([s.getBits(0),s.getBits(1)],0)),s.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const t=Xd(e),[r,s]=Zd(t);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);if(!this.we(o))return!1}return!0}static create(e,t,r){const s=e%8==0?0:8-e%8,i=new Uint8Array(Math.ceil(e/8)),o=new Ju(i,s,t);return r.forEach(c=>o.insert(c)),o}insert(e){if(this.ge===0)return;const t=Xd(e),[r,s]=Zd(t);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);this.be(o)}}be(e){const t=Math.floor(e/8),r=e%8;this.bitmap[t]|=1<<r}}class Ms extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
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
 */class ki{constructor(e,t,r,s,i){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=r,this.documentUpdates=s,this.resolvedLimboDocuments=i}static createSynthesizedRemoteEventForCurrentChange(e,t,r){const s=new Map;return s.set(e,Ni.createSynthesizedTargetChangeForCurrentChange(e,t,r)),new ki($.min(),s,new ae(z),tt(),H())}}class Ni{constructor(e,t,r,s,i){this.resumeToken=e,this.current=t,this.addedDocuments=r,this.modifiedDocuments=s,this.removedDocuments=i}static createSynthesizedTargetChangeForCurrentChange(e,t,r){return new Ni(r,t,H(),H(),H())}}/**
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
 */class Eo{constructor(e,t,r,s){this.Se=e,this.removedTargetIds=t,this.key=r,this.De=s}}class og{constructor(e,t){this.targetId=e,this.Ce=t}}class ag{constructor(e,t,r=we.EMPTY_BYTE_STRING,s=null){this.state=e,this.targetIds=t,this.resumeToken=r,this.cause=s}}class ef{constructor(){this.ve=0,this.Fe=tf(),this.Me=we.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=H(),t=H(),r=H();return this.Fe.forEach((s,i)=>{switch(i){case 0:e=e.add(s);break;case 2:t=t.add(s);break;case 1:r=r.add(s);break;default:M(38017,{changeType:i})}}),new Ni(this.Me,this.xe,e,t,r)}Ke(){this.Oe=!1,this.Fe=tf()}qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t)}Ue(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}$e(){this.ve+=1}We(){this.ve-=1,U(this.ve>=0,3241,{ve:this.ve})}Qe(){this.Oe=!0,this.xe=!0}}class HT{constructor(e){this.Ge=e,this.ze=new Map,this.je=tt(),this.He=ro(),this.Je=ro(),this.Ze=new ae(z)}Xe(e){for(const t of e.Se)e.De&&e.De.isFoundDocument()?this.Ye(t,e.De):this.et(t,e.key,e.De);for(const t of e.removedTargetIds)this.et(t,e.key,e.De)}tt(e){this.forEachTarget(e,t=>{const r=this.nt(t);switch(e.state){case 0:this.rt(t)&&r.Le(e.resumeToken);break;case 1:r.We(),r.Ne||r.Ke(),r.Le(e.resumeToken);break;case 2:r.We(),r.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(r.Qe(),r.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),r.Le(e.resumeToken));break;default:M(56790,{state:e.state})}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach((r,s)=>{this.rt(s)&&t(s)})}st(e){const t=e.targetId,r=e.Ce.count,s=this.ot(t);if(s){const i=s.target;if(Lo(i))if(r===0){const o=new x(i.path);this.et(t,o,le.newNoDocument(o,$.min()))}else U(r===1,20013,{expectedCount:r});else{const o=this._t(t);if(o!==r){const c=this.ut(e),u=c?this.ct(c,e,o):1;if(u!==0){this.it(t);const l=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ze=this.Ze.insert(t,l)}}}}}ut(e){const t=e.Ce.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:r="",padding:s=0},hashCount:i=0}=t;let o,c;try{o=Bt(r).toUint8Array()}catch(u){if(u instanceof Rm)return ni("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{c=new Ju(o,s,i)}catch(u){return ni(u instanceof Ms?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return c.ge===0?null:c}ct(e,t,r){return t.Ce.count===r-this.Pt(e,t.targetId)?0:2}Pt(e,t){const r=this.Ge.getRemoteKeysForTarget(t);let s=0;return r.forEach(i=>{const o=this.Ge.ht(),c=`projects/${o.projectId}/databases/${o.database}/documents/${i.path.canonicalString()}`;e.mightContain(c)||(this.et(t,i,null),s++)}),s}Tt(e){const t=new Map;this.ze.forEach((i,o)=>{const c=this.ot(o);if(c){if(i.current&&Lo(c.target)){const u=new x(c.target.path);this.It(u).has(o)||this.Et(o,u)||this.et(o,u,le.newNoDocument(u,e))}i.Be&&(t.set(o,i.ke()),i.Ke())}});let r=H();this.Je.forEach((i,o)=>{let c=!0;o.forEachWhile(u=>{const l=this.ot(u);return!l||l.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)}),c&&(r=r.add(i))}),this.je.forEach((i,o)=>o.setReadTime(e));const s=new ki(e,t,this.Ze,this.je,r);return this.je=tt(),this.He=ro(),this.Je=ro(),this.Ze=new ae(z),s}Ye(e,t){if(!this.rt(e))return;const r=this.Et(e,t.key)?2:0;this.nt(e).qe(t.key,r),this.je=this.je.insert(t.key,t),this.He=this.He.insert(t.key,this.It(t.key).add(e)),this.Je=this.Je.insert(t.key,this.Rt(t.key).add(e))}et(e,t,r){if(!this.rt(e))return;const s=this.nt(e);this.Et(e,t)?s.qe(t,1):s.Ue(t),this.Je=this.Je.insert(t,this.Rt(t).delete(e)),this.Je=this.Je.insert(t,this.Rt(t).add(e)),r&&(this.je=this.je.insert(t,r))}removeTarget(e){this.ze.delete(e)}_t(e){const t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}$e(e){this.nt(e).$e()}nt(e){let t=this.ze.get(e);return t||(t=new ef,this.ze.set(e,t)),t}Rt(e){let t=this.Je.get(e);return t||(t=new ie(z),this.Je=this.Je.insert(e,t)),t}It(e){let t=this.He.get(e);return t||(t=new ie(z),this.He=this.He.insert(e,t)),t}rt(e){const t=this.ot(e)!==null;return t||D("WatchChangeAggregator","Detected inactive target",e),t}ot(e){const t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new ef),this.Ge.getRemoteKeysForTarget(e).forEach(t=>{this.et(e,t,null)})}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t)}}function ro(){return new ae(x.comparator)}function tf(){return new ae(x.comparator)}const QT={asc:"ASCENDING",desc:"DESCENDING"},JT={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},YT={and:"AND",or:"OR"};class XT{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function cu(n,e){return n.useProto3Json||Ri(e)?e:{value:e}}function Kr(n,e){return n.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function cg(n,e){return n.useProto3Json?e.toBase64():e.toUint8Array()}function ZT(n,e){return Kr(n,e.toTimestamp())}function Oe(n){return U(!!n,49232),$.fromTimestamp(function(t){const r=Ut(t);return new re(r.seconds,r.nanos)}(n))}function Yu(n,e){return uu(n,e).canonicalString()}function uu(n,e){const t=function(s){return new ne(["projects",s.projectId,"databases",s.database])}(n).child("documents");return e===void 0?t:t.child(e)}function ug(n){const e=ne.fromString(n);return U(_g(e),10190,{key:e.toString()}),e}function fi(n,e){return Yu(n.databaseId,e.path)}function Mt(n,e){const t=ug(e);if(t.get(1)!==n.databaseId.projectId)throw new V(S.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+n.databaseId.projectId);if(t.get(3)!==n.databaseId.database)throw new V(S.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+n.databaseId.database);return new x(dg(t))}function lg(n,e){return Yu(n.databaseId,e)}function hg(n){const e=ug(n);return e.length===4?ne.emptyPath():dg(e)}function lu(n){return new ne(["projects",n.databaseId.projectId,"databases",n.databaseId.database]).canonicalString()}function dg(n){return U(n.length>4&&n.get(4)==="documents",29091,{key:n.toString()}),n.popFirst(5)}function nf(n,e,t){return{name:fi(n,e),fields:t.value.mapValue.fields}}function ev(n,e,t){const r=Mt(n,e.name),s=Oe(e.updateTime),i=e.createTime?Oe(e.createTime):$.min(),o=new De({mapValue:{fields:e.fields}}),c=le.newFoundDocument(r,s,i,o);return t&&c.setHasCommittedMutations(),t?c.setHasCommittedMutations():c}function tv(n,e){return"found"in e?function(r,s){U(!!s.found,43571),s.found.name,s.found.updateTime;const i=Mt(r,s.found.name),o=Oe(s.found.updateTime),c=s.found.createTime?Oe(s.found.createTime):$.min(),u=new De({mapValue:{fields:s.found.fields}});return le.newFoundDocument(i,o,c,u)}(n,e):"missing"in e?function(r,s){U(!!s.missing,3894),U(!!s.readTime,22933);const i=Mt(r,s.missing),o=Oe(s.readTime);return le.newNoDocument(i,o)}(n,e):M(7234,{result:e})}function nv(n,e){let t;if("targetChange"in e){e.targetChange;const r=function(l){return l==="NO_CHANGE"?0:l==="ADD"?1:l==="REMOVE"?2:l==="CURRENT"?3:l==="RESET"?4:M(39313,{state:l})}(e.targetChange.targetChangeType||"NO_CHANGE"),s=e.targetChange.targetIds||[],i=function(l,f){return l.useProto3Json?(U(f===void 0||typeof f=="string",58123),we.fromBase64String(f||"")):(U(f===void 0||f instanceof Buffer||f instanceof Uint8Array,16193),we.fromUint8Array(f||new Uint8Array))}(n,e.targetChange.resumeToken),o=e.targetChange.cause,c=o&&function(l){const f=l.code===void 0?S.UNKNOWN:ig(l.code);return new V(f,l.message||"")}(o);t=new ag(r,s,i,c||null)}else if("documentChange"in e){e.documentChange;const r=e.documentChange;r.document,r.document.name,r.document.updateTime;const s=Mt(n,r.document.name),i=Oe(r.document.updateTime),o=r.document.createTime?Oe(r.document.createTime):$.min(),c=new De({mapValue:{fields:r.document.fields}}),u=le.newFoundDocument(s,i,o,c),l=r.targetIds||[],f=r.removedTargetIds||[];t=new Eo(l,f,u.key,u)}else if("documentDelete"in e){e.documentDelete;const r=e.documentDelete;r.document;const s=Mt(n,r.document),i=r.readTime?Oe(r.readTime):$.min(),o=le.newNoDocument(s,i),c=r.removedTargetIds||[];t=new Eo([],c,o.key,o)}else if("documentRemove"in e){e.documentRemove;const r=e.documentRemove;r.document;const s=Mt(n,r.document),i=r.removedTargetIds||[];t=new Eo([],i,s,null)}else{if(!("filter"in e))return M(11601,{Vt:e});{e.filter;const r=e.filter;r.targetId;const{count:s=0,unchangedNames:i}=r,o=new zT(s,i),c=r.targetId;t=new og(c,o)}}return t}function pi(n,e){let t;if(e instanceof ts)t={update:nf(n,e.key,e.value)};else if(e instanceof ns)t={delete:fi(n,e.key)};else if(e instanceof Gt)t={update:nf(n,e.key,e.data),updateMask:uv(e.fieldMask)};else{if(!(e instanceof Wu))return M(16599,{dt:e.type});t={verify:fi(n,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(r=>function(i,o){const c=o.transform;if(c instanceof di)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof Gr)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof zr)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof Wr)return{fieldPath:o.field.canonicalString(),increment:c.Ae};throw M(20930,{transform:o.transform})}(0,r))),e.precondition.isNone||(t.currentDocument=function(s,i){return i.updateTime!==void 0?{updateTime:ZT(s,i.updateTime)}:i.exists!==void 0?{exists:i.exists}:M(27497)}(n,e.precondition)),t}function hu(n,e){const t=e.currentDocument?function(i){return i.updateTime!==void 0?he.updateTime(Oe(i.updateTime)):i.exists!==void 0?he.exists(i.exists):he.none()}(e.currentDocument):he.none(),r=e.updateTransforms?e.updateTransforms.map(s=>function(o,c){let u=null;if("setToServerValue"in c)U(c.setToServerValue==="REQUEST_TIME",16630,{proto:c}),u=new di;else if("appendMissingElements"in c){const f=c.appendMissingElements.values||[];u=new Gr(f)}else if("removeAllFromArray"in c){const f=c.removeAllFromArray.values||[];u=new zr(f)}else"increment"in c?u=new Wr(o,c.increment):M(16584,{proto:c});const l=fe.fromServerFormat(c.fieldPath);return new tg(l,u)}(n,s)):[];if(e.update){e.update.name;const s=Mt(n,e.update.name),i=new De({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=function(u){const l=u.fieldPaths||[];return new Qe(l.map(f=>fe.fromServerFormat(f)))}(e.updateMask);return new Gt(s,i,o,t,r)}return new ts(s,i,t,r)}if(e.delete){const s=Mt(n,e.delete);return new ns(s,t)}if(e.verify){const s=Mt(n,e.verify);return new Wu(s,t)}return M(1463,{proto:e})}function rv(n,e){return n&&n.length>0?(U(e!==void 0,14353),n.map(t=>function(s,i){let o=s.updateTime?Oe(s.updateTime):Oe(i);return o.isEqual($.min())&&(o=Oe(i)),new qT(o,s.transformResults||[])}(t,e))):[]}function fg(n,e){return{documents:[lg(n,e.path)]}}function Xu(n,e){const t={structuredQuery:{}},r=e.path;let s;e.collectionGroup!==null?(s=r,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(s=r.popLast(),t.structuredQuery.from=[{collectionId:r.lastSegment()}]),t.parent=lg(n,s);const i=function(l){if(l.length!==0)return gg(se.create(l,"and"))}(e.filters);i&&(t.structuredQuery.where=i);const o=function(l){if(l.length!==0)return l.map(f=>function(g){return{field:rn(g.field),direction:ov(g.dir)}}(f))}(e.orderBy);o&&(t.structuredQuery.orderBy=o);const c=cu(n,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=function(l){return{before:l.inclusive,values:l.position}}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(l){return{before:!l.inclusive,values:l.position}}(e.endAt)),{ft:t,parent:s}}function sv(n,e,t,r){const{ft:s,parent:i}=Xu(n,e),o={},c=[];let u=0;return t.forEach(l=>{const f="aggregate_"+u++;o[f]=l.alias,l.aggregateType==="count"?c.push({alias:f,count:{}}):l.aggregateType==="avg"?c.push({alias:f,avg:{field:rn(l.fieldPath)}}):l.aggregateType==="sum"&&c.push({alias:f,sum:{field:rn(l.fieldPath)}})}),{request:{structuredAggregationQuery:{aggregations:c,structuredQuery:s.structuredQuery},parent:s.parent},gt:o,parent:i}}function pg(n){let e=hg(n.parent);const t=n.structuredQuery,r=t.from?t.from.length:0;let s=null;if(r>0){U(r===1,65062);const f=t.from[0];f.allDescendants?s=f.collectionId:e=e.child(f.collectionId)}let i=[];t.where&&(i=function(p){const g=mg(p);return g instanceof se&&$u(g)?g.getFilters():[g]}(t.where));let o=[];t.orderBy&&(o=function(p){return p.map(g=>function(C){return new hi(vr(C.field),function(k){switch(k){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(C.direction))}(g))}(t.orderBy));let c=null;t.limit&&(c=function(p){let g;return g=typeof p=="object"?p.value:p,Ri(g)?null:g}(t.limit));let u=null;t.startAt&&(u=function(p){const g=!!p.before,v=p.values||[];return new yn(v,g)}(t.startAt));let l=null;return t.endAt&&(l=function(p){const g=!p.before,v=p.values||[];return new yn(v,g)}(t.endAt)),qm(e,s,o,i,c,"F",u,l)}function iv(n,e){const t=function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return M(28987,{purpose:s})}}(e.purpose);return t==null?null:{"goog-listen-tags":t}}function mg(n){return n.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":const r=vr(t.unaryFilter.field);return Z.create(r,"==",{doubleValue:NaN});case"IS_NULL":const s=vr(t.unaryFilter.field);return Z.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const i=vr(t.unaryFilter.field);return Z.create(i,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=vr(t.unaryFilter.field);return Z.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return M(61313);default:return M(60726)}}(n):n.fieldFilter!==void 0?function(t){return Z.create(vr(t.fieldFilter.field),function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return M(58110);default:return M(50506)}}(t.fieldFilter.op),t.fieldFilter.value)}(n):n.compositeFilter!==void 0?function(t){return se.create(t.compositeFilter.filters.map(r=>mg(r)),function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return M(1026)}}(t.compositeFilter.op))}(n):M(30097,{filter:n})}function ov(n){return QT[n]}function av(n){return JT[n]}function cv(n){return YT[n]}function rn(n){return{fieldPath:n.canonicalString()}}function vr(n){return fe.fromServerFormat(n.fieldPath)}function gg(n){return n instanceof Z?function(t){if(t.op==="=="){if(Bd(t.value))return{unaryFilter:{field:rn(t.field),op:"IS_NAN"}};if(Ud(t.value))return{unaryFilter:{field:rn(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(Bd(t.value))return{unaryFilter:{field:rn(t.field),op:"IS_NOT_NAN"}};if(Ud(t.value))return{unaryFilter:{field:rn(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:rn(t.field),op:av(t.op),value:t.value}}}(n):n instanceof se?function(t){const r=t.getFilters().map(s=>gg(s));return r.length===1?r[0]:{compositeFilter:{op:cv(t.op),filters:r}}}(n):M(54877,{filter:n})}function uv(n){const e=[];return n.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function _g(n){return n.length>=4&&n.get(0)==="projects"&&n.get(2)==="databases"}function yg(n){return!!n&&typeof n._toProto=="function"&&n._protoValueType==="ProtoValue"}/**
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
 */class Vt{constructor(e,t,r,s,i=$.min(),o=$.min(),c=we.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=t,this.purpose=r,this.sequenceNumber=s,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=c,this.expectedCount=u}withSequenceNumber(e){return new Vt(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new Vt(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Vt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Vt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
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
 */class Ig{constructor(e){this.yt=e}}function lv(n,e){let t;if(e.document)t=ev(n.yt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const r=x.fromSegments(e.noDocument.path),s=Xn(e.noDocument.readTime);t=le.newNoDocument(r,s),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return M(56709);{const r=x.fromSegments(e.unknownDocument.path),s=Xn(e.unknownDocument.version);t=le.newUnknownDocument(r,s)}}return e.readTime&&t.setReadTime(function(s){const i=new re(s[0],s[1]);return $.fromTimestamp(i)}(e.readTime)),t}function rf(n,e){const t=e.key,r={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:Uo(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())r.document=function(i,o){return{name:fi(i,o.key),fields:o.data.value.mapValue.fields,updateTime:Kr(i,o.version.toTimestamp()),createTime:Kr(i,o.createTime.toTimestamp())}}(n.yt,e);else if(e.isNoDocument())r.noDocument={path:t.path.toArray(),readTime:Yn(e.version)};else{if(!e.isUnknownDocument())return M(57904,{document:e});r.unknownDocument={path:t.path.toArray(),version:Yn(e.version)}}return r}function Uo(n){const e=n.toTimestamp();return[e.seconds,e.nanoseconds]}function Yn(n){const e=n.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function Xn(n){const e=new re(n.seconds,n.nanoseconds);return $.fromTimestamp(e)}function Mn(n,e){const t=(e.baseMutations||[]).map(i=>hu(n.yt,i));for(let i=0;i<e.mutations.length-1;++i){const o=e.mutations[i];if(i+1<e.mutations.length&&e.mutations[i+1].transform!==void 0){const c=e.mutations[i+1];o.updateTransforms=c.transform.fieldTransforms,e.mutations.splice(i+1,1),++i}}const r=e.mutations.map(i=>hu(n.yt,i)),s=re.fromMillis(e.localWriteTimeMs);return new Ku(e.batchId,s,t,r)}function Fs(n){const e=Xn(n.readTime),t=n.lastLimboFreeSnapshotVersion!==void 0?Xn(n.lastLimboFreeSnapshotVersion):$.min();let r;return r=function(i){return i.documents!==void 0}(n.query)?function(i){const o=i.documents.length;return U(o===1,1966,{count:o}),rt(Pi(hg(i.documents[0])))}(n.query):function(i){return rt(pg(i))}(n.query),new Vt(r,n.targetId,"TargetPurposeListen",n.lastListenSequenceNumber,e,t,we.fromBase64String(n.resumeToken))}function wg(n,e){const t=Yn(e.snapshotVersion),r=Yn(e.lastLimboFreeSnapshotVersion);let s;s=Lo(e.target)?fg(n.yt,e.target):Xu(n.yt,e.target).ft;const i=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:Jn(e.target),readTime:t,resumeToken:i,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:r,query:s}}function Eg(n){const e=pg({parent:n.parent,structuredQuery:n.structuredQuery});return n.limitType==="LAST"?Fo(e,e.limit,"L"):e}function Tc(n,e){return new Qu(e.largestBatchId,hu(n.yt,e.overlayMutation))}function sf(n,e){const t=e.path.lastSegment();return[n,je(e.path.popLast()),t]}function of(n,e,t,r){return{indexId:n,uid:e,sequenceNumber:t,readTime:Yn(r.readTime),documentKey:je(r.documentKey.path),largestBatchId:r.largestBatchId}}/**
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
 */class hv{getBundleMetadata(e,t){return af(e).get(t).next(r=>{if(r)return function(i){return{id:i.bundleId,createTime:Xn(i.createTime),version:i.version}}(r)})}saveBundleMetadata(e,t){return af(e).put(function(s){return{bundleId:s.id,createTime:Yn(Oe(s.createTime)),version:s.version}}(t))}getNamedQuery(e,t){return cf(e).get(t).next(r=>{if(r)return function(i){return{name:i.name,query:Eg(i.bundledQuery),readTime:Xn(i.readTime)}}(r)})}saveNamedQuery(e,t){return cf(e).put(function(s){return{name:s.name,readTime:Yn(Oe(s.readTime)),bundledQuery:s.bundledQuery}}(t))}}function af(n){return Se(n,ua)}function cf(n){return Se(n,la)}/**
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
 */class ya{constructor(e,t){this.serializer=e,this.userId=t}static wt(e,t){const r=t.uid||"";return new ya(e,r)}getOverlay(e,t){return Rs(e).get(sf(this.userId,t)).next(r=>r?Tc(this.serializer,r):null)}getOverlays(e,t){const r=At();return A.forEach(t,s=>this.getOverlay(e,s).next(i=>{i!==null&&r.set(s,i)})).next(()=>r)}saveOverlays(e,t,r){const s=[];return r.forEach((i,o)=>{const c=new Qu(t,o);s.push(this.bt(e,c))}),A.waitFor(s)}removeOverlaysForBatchId(e,t,r){const s=new Set;t.forEach(o=>s.add(je(o.getCollectionPath())));const i=[];return s.forEach(o=>{const c=IDBKeyRange.bound([this.userId,o,r],[this.userId,o,r+1],!1,!0);i.push(Rs(e).X(eu,c))}),A.waitFor(i)}getOverlaysForCollection(e,t,r){const s=At(),i=je(t),o=IDBKeyRange.bound([this.userId,i,r],[this.userId,i,Number.POSITIVE_INFINITY],!0);return Rs(e).H(eu,o).next(c=>{for(const u of c){const l=Tc(this.serializer,u);s.set(l.getKey(),l)}return s})}getOverlaysForCollectionGroup(e,t,r,s){const i=At();let o;const c=IDBKeyRange.bound([this.userId,t,r],[this.userId,t,Number.POSITIVE_INFINITY],!0);return Rs(e).ee({index:Im,range:c},(u,l,f)=>{const p=Tc(this.serializer,l);i.size()<s||p.largestBatchId===o?(i.set(p.getKey(),p),o=p.largestBatchId):f.done()}).next(()=>i)}bt(e,t){return Rs(e).put(function(s,i,o){const[c,u,l]=sf(i,o.mutation.key);return{userId:i,collectionPath:u,documentId:l,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:pi(s.yt,o.mutation)}}(this.serializer,this.userId,t))}}function Rs(n){return Se(n,ha)}/**
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
 */class dv{St(e){return Se(e,Fu)}getSessionToken(e){return this.St(e).get("sessionToken").next(t=>{const r=t==null?void 0:t.value;return r?we.fromUint8Array(r):we.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.St(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
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
 */class Fn{constructor(){}Dt(e,t){this.Ct(e,t),t.vt()}Ct(e,t){if("nullValue"in e)this.Ft(t,5);else if("booleanValue"in e)this.Ft(t,10),t.Mt(e.booleanValue?1:0);else if("integerValue"in e)this.Ft(t,15),t.Mt(ue(e.integerValue));else if("doubleValue"in e){const r=ue(e.doubleValue);isNaN(r)?this.Ft(t,13):(this.Ft(t,15),si(r)?t.Mt(0):t.Mt(r))}else if("timestampValue"in e){let r=e.timestampValue;this.Ft(t,20),typeof r=="string"&&(r=Ut(r)),t.xt(`${r.seconds||""}`),t.Mt(r.nanos||0)}else if("stringValue"in e)this.Ot(e.stringValue,t),this.Nt(t);else if("bytesValue"in e)this.Ft(t,30),t.Bt(Bt(e.bytesValue)),this.Nt(t);else if("referenceValue"in e)this.Lt(e.referenceValue,t);else if("geoPointValue"in e){const r=e.geoPointValue;this.Ft(t,45),t.Mt(r.latitude||0),t.Mt(r.longitude||0)}else"mapValue"in e?Nm(e)?this.Ft(t,Number.MAX_SAFE_INTEGER):pa(e)?this.kt(e.mapValue,t):(this.Kt(e.mapValue,t),this.Nt(t)):"arrayValue"in e?(this.qt(e.arrayValue,t),this.Nt(t)):M(19022,{Ut:e})}Ot(e,t){this.Ft(t,25),this.$t(e,t)}$t(e,t){t.xt(e)}Kt(e,t){const r=e.fields||{};this.Ft(t,55);for(const s of Object.keys(r))this.Ot(s,t),this.Ct(r[s],t)}kt(e,t){var o,c;const r=e.fields||{};this.Ft(t,53);const s=qr,i=((c=(o=r[s].arrayValue)==null?void 0:o.values)==null?void 0:c.length)||0;this.Ft(t,15),t.Mt(ue(i)),this.Ot(s,t),this.Ct(r[s],t)}qt(e,t){const r=e.values||[];this.Ft(t,50);for(const s of r)this.Ct(s,t)}Lt(e,t){this.Ft(t,37),x.fromName(e).path.forEach(r=>{this.Ft(t,60),this.$t(r,t)})}Ft(e,t){e.Mt(t)}Nt(e){e.Mt(2)}}Fn.Wt=new Fn;/**
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
 */const _r=255;function fv(n){if(n===0)return 8;let e=0;return n>>4||(e+=4,n<<=4),n>>6||(e+=2,n<<=2),n>>7||(e+=1),e}function uf(n){const e=64-function(r){let s=0;for(let i=0;i<8;++i){const o=fv(255&r[i]);if(s+=o,o!==8)break}return s}(n);return Math.ceil(e/8)}class pv{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Qt(e){const t=e[Symbol.iterator]();let r=t.next();for(;!r.done;)this.Gt(r.value),r=t.next();this.zt()}jt(e){const t=e[Symbol.iterator]();let r=t.next();for(;!r.done;)this.Ht(r.value),r=t.next();this.Jt()}Zt(e){for(const t of e){const r=t.charCodeAt(0);if(r<128)this.Gt(r);else if(r<2048)this.Gt(960|r>>>6),this.Gt(128|63&r);else if(t<"\uD800"||"\uDBFF"<t)this.Gt(480|r>>>12),this.Gt(128|63&r>>>6),this.Gt(128|63&r);else{const s=t.codePointAt(0);this.Gt(240|s>>>18),this.Gt(128|63&s>>>12),this.Gt(128|63&s>>>6),this.Gt(128|63&s)}}this.zt()}Xt(e){for(const t of e){const r=t.charCodeAt(0);if(r<128)this.Ht(r);else if(r<2048)this.Ht(960|r>>>6),this.Ht(128|63&r);else if(t<"\uD800"||"\uDBFF"<t)this.Ht(480|r>>>12),this.Ht(128|63&r>>>6),this.Ht(128|63&r);else{const s=t.codePointAt(0);this.Ht(240|s>>>18),this.Ht(128|63&s>>>12),this.Ht(128|63&s>>>6),this.Ht(128|63&s)}}this.Jt()}Yt(e){const t=this.en(e),r=uf(t);this.tn(1+r),this.buffer[this.position++]=255&r;for(let s=t.length-r;s<t.length;++s)this.buffer[this.position++]=255&t[s]}nn(e){const t=this.en(e),r=uf(t);this.tn(1+r),this.buffer[this.position++]=~(255&r);for(let s=t.length-r;s<t.length;++s)this.buffer[this.position++]=~(255&t[s])}rn(){this.sn(_r),this.sn(255)}_n(){this.an(_r),this.an(255)}reset(){this.position=0}seed(e){this.tn(e.length),this.buffer.set(e,this.position),this.position+=e.length}un(){return this.buffer.slice(0,this.position)}en(e){const t=function(i){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,i,!1),new Uint8Array(o.buffer)}(e),r=!!(128&t[0]);t[0]^=r?255:128;for(let s=1;s<t.length;++s)t[s]^=r?255:0;return t}Gt(e){const t=255&e;t===0?(this.sn(0),this.sn(255)):t===_r?(this.sn(_r),this.sn(0)):this.sn(t)}Ht(e){const t=255&e;t===0?(this.an(0),this.an(255)):t===_r?(this.an(_r),this.an(0)):this.an(e)}zt(){this.sn(0),this.sn(1)}Jt(){this.an(0),this.an(1)}sn(e){this.tn(1),this.buffer[this.position++]=e}an(e){this.tn(1),this.buffer[this.position++]=~e}tn(e){const t=e+this.position;if(t<=this.buffer.length)return;let r=2*this.buffer.length;r<t&&(r=t);const s=new Uint8Array(r);s.set(this.buffer),this.buffer=s}}class mv{constructor(e){this.cn=e}Bt(e){this.cn.Qt(e)}xt(e){this.cn.Zt(e)}Mt(e){this.cn.Yt(e)}vt(){this.cn.rn()}}class gv{constructor(e){this.cn=e}Bt(e){this.cn.jt(e)}xt(e){this.cn.Xt(e)}Mt(e){this.cn.nn(e)}vt(){this.cn._n()}}class bs{constructor(){this.cn=new pv,this.ascending=new mv(this.cn),this.descending=new gv(this.cn)}seed(e){this.cn.seed(e)}ln(e){return e===0?this.ascending:this.descending}un(){return this.cn.un()}reset(){this.cn.reset()}}/**
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
 */class Un{constructor(e,t,r,s){this.hn=e,this.Pn=t,this.Tn=r,this.In=s}En(){const e=this.In.length,t=e===0||this.In[e-1]===255?e+1:e,r=new Uint8Array(t);return r.set(this.In,0),t!==e?r.set([0],this.In.length):++r[r.length-1],new Un(this.hn,this.Pn,this.Tn,r)}Rn(e,t,r){return{indexId:this.hn,uid:e,arrayValue:To(this.Tn),directionalValue:To(this.In),orderedDocumentKey:To(t),documentKey:r.path.toArray()}}An(e,t,r){const s=this.Rn(e,t,r);return[s.indexId,s.uid,s.arrayValue,s.directionalValue,s.orderedDocumentKey,s.documentKey]}}function Xt(n,e){let t=n.hn-e.hn;return t!==0?t:(t=lf(n.Tn,e.Tn),t!==0?t:(t=lf(n.In,e.In),t!==0?t:x.comparator(n.Pn,e.Pn)))}function lf(n,e){for(let t=0;t<n.length&&t<e.length;++t){const r=n[t]-e[t];if(r!==0)return r}return n.length-e.length}function To(n){return Wp()?function(t){let r="";for(let s=0;s<t.length;s++)r+=String.fromCharCode(t[s]);return r}(n):n}function hf(n){return typeof n!="string"?n:function(t){const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=t.charCodeAt(s);return r}(n)}class df{constructor(e){this.Vn=new ie((t,r)=>fe.comparator(t.field,r.field)),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.dn=e.orderBy,this.mn=[];for(const t of e.filters){const r=t;r.isInequality()?this.Vn=this.Vn.add(r):this.mn.push(r)}}get fn(){return this.Vn.size>1}gn(e){if(U(e.collectionGroup===this.collectionId,49279),this.fn)return!1;const t=Yc(e);if(t!==void 0&&!this.pn(t))return!1;const r=On(e);let s=new Set,i=0,o=0;for(;i<r.length&&this.pn(r[i]);++i)s=s.add(r[i].fieldPath.canonicalString());if(i===r.length)return!0;if(this.Vn.size>0){const c=this.Vn.getIterator().getNext();if(!s.has(c.field.canonicalString())){const u=r[i];if(!this.yn(c,u)||!this.wn(this.dn[o++],u))return!1}++i}for(;i<r.length;++i){const c=r[i];if(o>=this.dn.length||!this.wn(this.dn[o++],c))return!1}return!0}bn(){if(this.fn)return null;let e=new ie(fe.comparator);const t=[];for(const r of this.mn)if(!r.field.isKeyField())if(r.op==="array-contains"||r.op==="array-contains-any")t.push(new po(r.field,2));else{if(e.has(r.field))continue;e=e.add(r.field),t.push(new po(r.field,0))}for(const r of this.dn)r.field.isKeyField()||e.has(r.field)||(e=e.add(r.field),t.push(new po(r.field,r.dir==="asc"?0:1)));return new No(No.UNKNOWN_ID,this.collectionId,t,ri.empty())}pn(e){for(const t of this.mn)if(this.yn(t,e))return!0;return!1}yn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const r=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===r}wn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
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
 */function Tg(n){var t,r;if(U(n instanceof Z||n instanceof se,20012),n instanceof Z){if(n instanceof Bm){const s=((r=(t=n.value.arrayValue)==null?void 0:t.values)==null?void 0:r.map(i=>Z.create(n.field,"==",i)))||[];return se.create(s,"or")}return n}const e=n.filters.map(s=>Tg(s));return se.create(e,n.op)}function _v(n){if(n.getFilters().length===0)return[];const e=pu(Tg(n));return U(vg(e),7391),du(e)||fu(e)?[e]:e.getFilters()}function du(n){return n instanceof Z}function fu(n){return n instanceof se&&$u(n)}function vg(n){return du(n)||fu(n)||function(t){if(t instanceof se&&su(t)){for(const r of t.getFilters())if(!du(r)&&!fu(r))return!1;return!0}return!1}(n)}function pu(n){if(U(n instanceof Z||n instanceof se,34018),n instanceof Z)return n;if(n.filters.length===1)return pu(n.filters[0]);const e=n.filters.map(r=>pu(r));let t=se.create(e,n.op);return t=Bo(t),vg(t)?t:(U(t instanceof se,64498),U(jr(t),40251),U(t.filters.length>1,57927),t.filters.reduce((r,s)=>Zu(r,s)))}function Zu(n,e){let t;return U(n instanceof Z||n instanceof se,38388),U(e instanceof Z||e instanceof se,25473),t=n instanceof Z?e instanceof Z?function(s,i){return se.create([s,i],"and")}(n,e):ff(n,e):e instanceof Z?ff(e,n):function(s,i){if(U(s.filters.length>0&&i.filters.length>0,48005),jr(s)&&jr(i))return Mm(s,i.getFilters());const o=su(s)?s:i,c=su(s)?i:s,u=o.filters.map(l=>Zu(l,c));return se.create(u,"or")}(n,e),Bo(t)}function ff(n,e){if(jr(e))return Mm(e,n.getFilters());{const t=e.filters.map(r=>Zu(n,r));return se.create(t,"or")}}function Bo(n){if(U(n instanceof Z||n instanceof se,11850),n instanceof Z)return n;const e=n.getFilters();if(e.length===1)return Bo(e[0]);if(xm(n))return n;const t=e.map(s=>Bo(s)),r=[];return t.forEach(s=>{s instanceof Z?r.push(s):s instanceof se&&(s.op===n.op?r.push(...s.filters):r.push(s))}),r.length===1?r[0]:se.create(r,n.op)}/**
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
 */class yv{constructor(){this.Sn=new el}addToCollectionParentIndex(e,t){return this.Sn.add(t),A.resolve()}getCollectionParents(e,t){return A.resolve(this.Sn.getEntries(t))}addFieldIndex(e,t){return A.resolve()}deleteFieldIndex(e,t){return A.resolve()}deleteAllFieldIndexes(e){return A.resolve()}createTargetIndexes(e,t){return A.resolve()}getDocumentsMatchingTarget(e,t){return A.resolve(null)}getIndexType(e,t){return A.resolve(0)}getFieldIndexes(e,t){return A.resolve([])}getNextCollectionGroupToUpdate(e){return A.resolve(null)}getMinOffset(e,t){return A.resolve(it.min())}getMinOffsetFromCollectionGroup(e,t){return A.resolve(it.min())}updateCollectionGroup(e,t,r){return A.resolve()}updateIndexEntries(e,t){return A.resolve()}}class el{constructor(){this.index={}}add(e){const t=e.lastSegment(),r=e.popLast(),s=this.index[t]||new ie(ne.comparator),i=!s.has(r);return this.index[t]=s.add(r),i}has(e){const t=e.lastSegment(),r=e.popLast(),s=this.index[t];return s&&s.has(r)}getEntries(e){return(this.index[e]||new ie(ne.comparator)).toArray()}}/**
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
 */const pf="IndexedDbIndexManager",so=new Uint8Array(0);class Iv{constructor(e,t){this.databaseId=t,this.Dn=new el,this.Cn=new jt(r=>Jn(r),(r,s)=>Si(r,s)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.Dn.has(t)){const r=t.lastSegment(),s=t.popLast();e.addOnCommittedListener(()=>{this.Dn.add(t)});const i={collectionId:r,parent:je(s)};return mf(e).put(i)}return A.resolve()}getCollectionParents(e,t){const r=[],s=IDBKeyRange.bound([t,""],[im(t),""],!1,!0);return mf(e).H(s).next(i=>{for(const o of i){if(o.collectionId!==t)break;r.push(vt(o.parent))}return r})}addFieldIndex(e,t){const r=Ss(e),s=function(c){return{indexId:c.indexId,collectionGroup:c.collectionGroup,fields:c.fields.map(u=>[u.fieldPath.canonicalString(),u.kind])}}(t);delete s.indexId;const i=r.add(s);if(t.indexState){const o=Ir(e);return i.next(c=>{o.put(of(c,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return i.next()}deleteFieldIndex(e,t){const r=Ss(e),s=Ir(e),i=yr(e);return r.delete(t.indexId).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=Ss(e),r=yr(e),s=Ir(e);return t.X().next(()=>r.X()).next(()=>s.X())}createTargetIndexes(e,t){return A.forEach(this.vn(t),r=>this.getIndexType(e,r).next(s=>{if(s===0||s===1){const i=new df(r).bn();if(i!=null)return this.addFieldIndex(e,i)}}))}getDocumentsMatchingTarget(e,t){const r=yr(e);let s=!0;const i=new Map;return A.forEach(this.vn(t),o=>this.Fn(e,o).next(c=>{s&&(s=!!c),i.set(o,c)})).next(()=>{if(s){let o=H();const c=[];return A.forEach(i,(u,l)=>{D(pf,`Using index ${function(B){return`id=${B.indexId}|cg=${B.collectionGroup}|f=${B.fields.map(W=>`${W.fieldPath}:${W.kind}`).join(",")}`}(u)} to execute ${Jn(t)}`);const f=function(B,W){const Q=Yc(W);if(Q===void 0)return null;for(const J of Mo(B,Q.fieldPath))switch(J.op){case"array-contains-any":return J.value.arrayValue.values||[];case"array-contains":return[J.value]}return null}(l,u),p=function(B,W){const Q=new Map;for(const J of On(W))for(const w of Mo(B,J.fieldPath))switch(w.op){case"==":case"in":Q.set(J.fieldPath.canonicalString(),w.value);break;case"not-in":case"!=":return Q.set(J.fieldPath.canonicalString(),w.value),Array.from(Q.values())}return null}(l,u),g=function(B,W){const Q=[];let J=!0;for(const w of On(W)){const _=w.kind===0?zd(B,w.fieldPath,B.startAt):Wd(B,w.fieldPath,B.startAt);Q.push(_.value),J&&(J=_.inclusive)}return new yn(Q,J)}(l,u),v=function(B,W){const Q=[];let J=!0;for(const w of On(W)){const _=w.kind===0?Wd(B,w.fieldPath,B.endAt):zd(B,w.fieldPath,B.endAt);Q.push(_.value),J&&(J=_.inclusive)}return new yn(Q,J)}(l,u),C=this.Mn(u,l,g),N=this.Mn(u,l,v),k=this.xn(u,l,p),j=this.On(u.indexId,f,C,g.inclusive,N,v.inclusive,k);return A.forEach(j,q=>r.Z(q,t.limit).next(B=>{B.forEach(W=>{const Q=x.fromSegments(W.documentKey);o.has(Q)||(o=o.add(Q),c.push(Q))})}))}).next(()=>c)}return A.resolve(null)})}vn(e){let t=this.Cn.get(e);return t||(e.filters.length===0?t=[e]:t=_v(se.create(e.filters,"and")).map(r=>ou(e.path,e.collectionGroup,e.orderBy,r.getFilters(),e.limit,e.startAt,e.endAt)),this.Cn.set(e,t),t)}On(e,t,r,s,i,o,c){const u=(t!=null?t.length:1)*Math.max(r.length,i.length),l=u/(t!=null?t.length:1),f=[];for(let p=0;p<u;++p){const g=t?this.Nn(t[p/l]):so,v=this.Bn(e,g,r[p%l],s),C=this.Ln(e,g,i[p%l],o),N=c.map(k=>this.Bn(e,g,k,!0));f.push(...this.createRange(v,C,N))}return f}Bn(e,t,r,s){const i=new Un(e,x.empty(),t,r);return s?i:i.En()}Ln(e,t,r,s){const i=new Un(e,x.empty(),t,r);return s?i.En():i}Fn(e,t){const r=new df(t),s=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,s).next(i=>{let o=null;for(const c of i)r.gn(c)&&(!o||c.fields.length>o.fields.length)&&(o=c);return o})}getIndexType(e,t){let r=2;const s=this.vn(t);return A.forEach(s,i=>this.Fn(e,i).next(o=>{o?r!==0&&o.fields.length<function(u){let l=new ie(fe.comparator),f=!1;for(const p of u.filters)for(const g of p.getFlattenedFilters())g.field.isKeyField()||(g.op==="array-contains"||g.op==="array-contains-any"?f=!0:l=l.add(g.field));for(const p of u.orderBy)p.field.isKeyField()||(l=l.add(p.field));return l.size+(f?1:0)}(i)&&(r=1):r=0})).next(()=>function(o){return o.limit!==null}(t)&&s.length>1&&r===2?1:r)}kn(e,t){const r=new bs;for(const s of On(e)){const i=t.data.field(s.fieldPath);if(i==null)return null;const o=r.ln(s.kind);Fn.Wt.Dt(i,o)}return r.un()}Nn(e){const t=new bs;return Fn.Wt.Dt(e,t.ln(0)),t.un()}Kn(e,t){const r=new bs;return Fn.Wt.Dt(Qn(this.databaseId,t),r.ln(function(i){const o=On(i);return o.length===0?0:o[o.length-1].kind}(e))),r.un()}xn(e,t,r){if(r===null)return[];let s=[];s.push(new bs);let i=0;for(const o of On(e)){const c=r[i++];for(const u of s)if(this.qn(t,o.fieldPath)&&li(c))s=this.Un(s,o,c);else{const l=u.ln(o.kind);Fn.Wt.Dt(c,l)}}return this.$n(s)}Mn(e,t,r){return this.xn(e,t,r.position)}$n(e){const t=[];for(let r=0;r<e.length;++r)t[r]=e[r].un();return t}Un(e,t,r){const s=[...e],i=[];for(const o of r.arrayValue.values||[])for(const c of s){const u=new bs;u.seed(c.un()),Fn.Wt.Dt(o,u.ln(t.kind)),i.push(u)}return i}qn(e,t){return!!e.filters.find(r=>r instanceof Z&&r.field.isEqual(t)&&(r.op==="in"||r.op==="not-in"))}getFieldIndexes(e,t){const r=Ss(e),s=Ir(e);return(t?r.H(Zc,IDBKeyRange.bound(t,t)):r.H()).next(i=>{const o=[];return A.forEach(i,c=>s.get([c.indexId,this.uid]).next(u=>{o.push(function(f,p){const g=p?new ri(p.sequenceNumber,new it(Xn(p.readTime),new x(vt(p.documentKey)),p.largestBatchId)):ri.empty(),v=f.fields.map(([C,N])=>new po(fe.fromServerFormat(C),N));return new No(f.indexId,f.collectionGroup,v,g)}(c,u))})).next(()=>o)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(t=>t.length===0?null:(t.sort((r,s)=>{const i=r.indexState.sequenceNumber-s.indexState.sequenceNumber;return i!==0?i:z(r.collectionGroup,s.collectionGroup)}),t[0].collectionGroup))}updateCollectionGroup(e,t,r){const s=Ss(e),i=Ir(e);return this.Wn(e).next(o=>s.H(Zc,IDBKeyRange.bound(t,t)).next(c=>A.forEach(c,u=>i.put(of(u.indexId,this.uid,o,r)))))}updateIndexEntries(e,t){const r=new Map;return A.forEach(t,(s,i)=>{const o=r.get(s.collectionGroup);return(o?A.resolve(o):this.getFieldIndexes(e,s.collectionGroup)).next(c=>(r.set(s.collectionGroup,c),A.forEach(c,u=>this.Qn(e,s,u).next(l=>{const f=this.Gn(i,u);return l.isEqual(f)?A.resolve():this.zn(e,i,u,l,f)}))))})}jn(e,t,r,s){return yr(e).put(s.Rn(this.uid,this.Kn(r,t.key),t.key))}Hn(e,t,r,s){return yr(e).delete(s.An(this.uid,this.Kn(r,t.key),t.key))}Qn(e,t,r){const s=yr(e);let i=new ie(Xt);return s.ee({index:ym,range:IDBKeyRange.only([r.indexId,this.uid,To(this.Kn(r,t))])},(o,c)=>{i=i.add(new Un(r.indexId,t,hf(c.arrayValue),hf(c.directionalValue)))}).next(()=>i)}Gn(e,t){let r=new ie(Xt);const s=this.kn(t,e);if(s==null)return r;const i=Yc(t);if(i!=null){const o=e.data.field(i.fieldPath);if(li(o))for(const c of o.arrayValue.values||[])r=r.add(new Un(t.indexId,e.key,this.Nn(c),s))}else r=r.add(new Un(t.indexId,e.key,so,s));return r}zn(e,t,r,s,i){D(pf,"Updating index entries for document '%s'",t.key);const o=[];return function(u,l,f,p,g){const v=u.getIterator(),C=l.getIterator();let N=gr(v),k=gr(C);for(;N||k;){let j=!1,q=!1;if(N&&k){const B=f(N,k);B<0?q=!0:B>0&&(j=!0)}else N!=null?q=!0:j=!0;j?(p(k),k=gr(C)):q?(g(N),N=gr(v)):(N=gr(v),k=gr(C))}}(s,i,Xt,c=>{o.push(this.jn(e,t,r,c))},c=>{o.push(this.Hn(e,t,r,c))}),A.waitFor(o)}Wn(e){let t=1;return Ir(e).ee({index:_m,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(r,s,i)=>{i.done(),t=s.sequenceNumber+1}).next(()=>t)}createRange(e,t,r){r=r.sort((o,c)=>Xt(o,c)).filter((o,c,u)=>!c||Xt(o,u[c-1])!==0);const s=[];s.push(e);for(const o of r){const c=Xt(o,e),u=Xt(o,t);if(c===0)s[0]=e.En();else if(c>0&&u<0)s.push(o),s.push(o.En());else if(u>0)break}s.push(t);const i=[];for(let o=0;o<s.length;o+=2){if(this.Jn(s[o],s[o+1]))return[];const c=s[o].An(this.uid,so,x.empty()),u=s[o+1].An(this.uid,so,x.empty());i.push(IDBKeyRange.bound(c,u))}return i}Jn(e,t){return Xt(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(gf)}getMinOffset(e,t){return A.mapArray(this.vn(t),r=>this.Fn(e,r).next(s=>s||M(44426))).next(gf)}}function mf(n){return Se(n,ai)}function yr(n){return Se(n,zs)}function Ss(n){return Se(n,Mu)}function Ir(n){return Se(n,Gs)}function gf(n){U(n.length!==0,28825);let e=n[0].indexState.offset,t=e.largestBatchId;for(let r=1;r<n.length;r++){const s=n[r].indexState.offset;Ou(s,e)<0&&(e=s),t<s.largestBatchId&&(t=s.largestBatchId)}return new it(e.readTime,e.documentKey,t)}/**
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
 */const _f={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},Ag=41943040;class qe{static withCacheSize(e){return new qe(e,qe.DEFAULT_COLLECTION_PERCENTILE,qe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,r){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=r}}/**
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
 */function Rg(n,e,t){const r=n.store(gt),s=n.store(Mr),i=[],o=IDBKeyRange.only(t.batchId);let c=0;const u=r.ee({range:o},(f,p,g)=>(c++,g.delete()));i.push(u.next(()=>{U(c===1,47070,{batchId:t.batchId})}));const l=[];for(const f of t.mutations){const p=pm(e,f.key.path,t.batchId);i.push(s.delete(p)),l.push(f.key)}return A.waitFor(i).next(()=>l)}function qo(n){if(!n)return 0;let e;if(n.document)e=n.document;else if(n.unknownDocument)e=n.unknownDocument;else{if(!n.noDocument)throw M(14731);e=n.noDocument}return JSON.stringify(e).length}/**
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
 */qe.DEFAULT_COLLECTION_PERCENTILE=10,qe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,qe.DEFAULT=new qe(Ag,qe.DEFAULT_COLLECTION_PERCENTILE,qe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),qe.DISABLED=new qe(-1,0,0);class Ia{constructor(e,t,r,s){this.userId=e,this.serializer=t,this.indexManager=r,this.referenceDelegate=s,this.Zn={}}static wt(e,t,r,s){U(e.uid!=="",64387);const i=e.isAuthenticated()?e.uid:"";return new Ia(i,t,r,s)}checkEmpty(e){let t=!0;const r=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return Zt(e).ee({index:Bn,range:r},(s,i,o)=>{t=!1,o.done()}).next(()=>t)}addMutationBatch(e,t,r,s){const i=Ar(e),o=Zt(e);return o.add({}).next(c=>{U(typeof c=="number",49019);const u=new Ku(c,t,r,s),l=function(v,C,N){const k=N.baseMutations.map(q=>pi(v.yt,q)),j=N.mutations.map(q=>pi(v.yt,q));return{userId:C,batchId:N.batchId,localWriteTimeMs:N.localWriteTime.toMillis(),baseMutations:k,mutations:j}}(this.serializer,this.userId,u),f=[];let p=new ie((g,v)=>z(g.canonicalString(),v.canonicalString()));for(const g of s){const v=pm(this.userId,g.key.path,c);p=p.add(g.key.path.popLast()),f.push(o.put(l)),f.push(i.put(v,zE))}return p.forEach(g=>{f.push(this.indexManager.addToCollectionParentIndex(e,g))}),e.addOnCommittedListener(()=>{this.Zn[c]=u.keys()}),A.waitFor(f).next(()=>u)})}lookupMutationBatch(e,t){return Zt(e).get(t).next(r=>r?(U(r.userId===this.userId,48,"Unexpected user for mutation batch",{userId:r.userId,batchId:t}),Mn(this.serializer,r)):null)}Xn(e,t){return this.Zn[t]?A.resolve(this.Zn[t]):this.lookupMutationBatch(e,t).next(r=>{if(r){const s=r.keys();return this.Zn[t]=s,s}return null})}getNextMutationBatchAfterBatchId(e,t){const r=t+1,s=IDBKeyRange.lowerBound([this.userId,r]);let i=null;return Zt(e).ee({index:Bn,range:s},(o,c,u)=>{c.userId===this.userId&&(U(c.batchId>=r,47524,{Yn:r}),i=Mn(this.serializer,c)),u.done()}).next(()=>i)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let r=$n;return Zt(e).ee({index:Bn,range:t,reverse:!0},(s,i,o)=>{r=i.batchId,o.done()}).next(()=>r)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,$n],[this.userId,Number.POSITIVE_INFINITY]);return Zt(e).H(Bn,t).next(r=>r.map(s=>Mn(this.serializer,s)))}getAllMutationBatchesAffectingDocumentKey(e,t){const r=mo(this.userId,t.path),s=IDBKeyRange.lowerBound(r),i=[];return Ar(e).ee({range:s},(o,c,u)=>{const[l,f,p]=o,g=vt(f);if(l===this.userId&&t.path.isEqual(g))return Zt(e).get(p).next(v=>{if(!v)throw M(61480,{er:o,batchId:p});U(v.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:v.userId,batchId:p}),i.push(Mn(this.serializer,v))});u.done()}).next(()=>i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new ie(z);const s=[];return t.forEach(i=>{const o=mo(this.userId,i.path),c=IDBKeyRange.lowerBound(o),u=Ar(e).ee({range:c},(l,f,p)=>{const[g,v,C]=l,N=vt(v);g===this.userId&&i.path.isEqual(N)?r=r.add(C):p.done()});s.push(u)}),A.waitFor(s).next(()=>this.tr(e,r))}getAllMutationBatchesAffectingQuery(e,t){const r=t.path,s=r.length+1,i=mo(this.userId,r),o=IDBKeyRange.lowerBound(i);let c=new ie(z);return Ar(e).ee({range:o},(u,l,f)=>{const[p,g,v]=u,C=vt(g);p===this.userId&&r.isPrefixOf(C)?C.length===s&&(c=c.add(v)):f.done()}).next(()=>this.tr(e,c))}tr(e,t){const r=[],s=[];return t.forEach(i=>{s.push(Zt(e).get(i).next(o=>{if(o===null)throw M(35274,{batchId:i});U(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:i}),r.push(Mn(this.serializer,o))}))}),A.waitFor(s).next(()=>r)}removeMutationBatch(e,t){return Rg(e.le,this.userId,t).next(r=>(e.addOnCommittedListener(()=>{this.nr(t.batchId)}),A.forEach(r,s=>this.referenceDelegate.markPotentiallyOrphaned(e,s))))}nr(e){delete this.Zn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return A.resolve();const r=IDBKeyRange.lowerBound(function(o){return[o]}(this.userId)),s=[];return Ar(e).ee({range:r},(i,o,c)=>{if(i[0]===this.userId){const u=vt(i[1]);s.push(u)}else c.done()}).next(()=>{U(s.length===0,56720,{rr:s.map(i=>i.canonicalString())})})})}containsKey(e,t){return bg(e,this.userId,t)}ir(e){return Sg(e).get(this.userId).next(t=>t||{userId:this.userId,lastAcknowledgedBatchId:$n,lastStreamToken:""})}}function bg(n,e,t){const r=mo(e,t.path),s=r[1],i=IDBKeyRange.lowerBound(r);let o=!1;return Ar(n).ee({range:i,Y:!0},(c,u,l)=>{const[f,p,g]=c;f===e&&p===s&&(o=!0),l.done()}).next(()=>o)}function Zt(n){return Se(n,gt)}function Ar(n){return Se(n,Mr)}function Sg(n){return Se(n,ii)}/**
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
 */class Zn{constructor(e){this.sr=e}next(){return this.sr+=2,this.sr}static _r(){return new Zn(0)}static ar(){return new Zn(-1)}}/**
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
 */class wv{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.ur(e).next(t=>{const r=new Zn(t.highestTargetId);return t.highestTargetId=r.next(),this.cr(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.ur(e).next(t=>$.fromTimestamp(new re(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.ur(e).next(t=>t.highestListenSequenceNumber)}setTargetsMetadata(e,t,r){return this.ur(e).next(s=>(s.highestListenSequenceNumber=t,r&&(s.lastRemoteSnapshotVersion=r.toTimestamp()),t>s.highestListenSequenceNumber&&(s.highestListenSequenceNumber=t),this.cr(e,s)))}addTargetData(e,t){return this.lr(e,t).next(()=>this.ur(e).next(r=>(r.targetCount+=1,this.hr(t,r),this.cr(e,r))))}updateTargetData(e,t){return this.lr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>wr(e).delete(t.targetId)).next(()=>this.ur(e)).next(r=>(U(r.targetCount>0,8065),r.targetCount-=1,this.cr(e,r)))}removeTargets(e,t,r){let s=0;const i=[];return wr(e).ee((o,c)=>{const u=Fs(c);u.sequenceNumber<=t&&r.get(u.targetId)===null&&(s++,i.push(this.removeTargetData(e,u)))}).next(()=>A.waitFor(i)).next(()=>s)}forEachTarget(e,t){return wr(e).ee((r,s)=>{const i=Fs(s);t(i)})}ur(e){return yf(e).get(Oo).next(t=>(U(t!==null,2888),t))}cr(e,t){return yf(e).put(Oo,t)}lr(e,t){return wr(e).put(wg(this.serializer,t))}hr(e,t){let r=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,r=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,r=!0),r}getTargetCount(e){return this.ur(e).next(t=>t.targetCount)}getTargetData(e,t){const r=Jn(t),s=IDBKeyRange.bound([r,Number.NEGATIVE_INFINITY],[r,Number.POSITIVE_INFINITY]);let i=null;return wr(e).ee({range:s,index:gm},(o,c,u)=>{const l=Fs(c);Si(t,l.target)&&(i=l,u.done())}).next(()=>i)}addMatchingKeys(e,t,r){const s=[],i=sn(e);return t.forEach(o=>{const c=je(o.path);s.push(i.put({targetId:r,path:c})),s.push(this.referenceDelegate.addReference(e,r,o))}),A.waitFor(s)}removeMatchingKeys(e,t,r){const s=sn(e);return A.forEach(t,i=>{const o=je(i.path);return A.waitFor([s.delete([r,o]),this.referenceDelegate.removeReference(e,r,i)])})}removeMatchingKeysForTargetId(e,t){const r=sn(e),s=IDBKeyRange.bound([t],[t+1],!1,!0);return r.delete(s)}getMatchingKeysForTargetId(e,t){const r=IDBKeyRange.bound([t],[t+1],!1,!0),s=sn(e);let i=H();return s.ee({range:r,Y:!0},(o,c,u)=>{const l=vt(o[1]),f=new x(l);i=i.add(f)}).next(()=>i)}containsKey(e,t){const r=je(t.path),s=IDBKeyRange.bound([r],[im(r)],!1,!0);let i=0;return sn(e).ee({index:Lu,Y:!0,range:s},([o,c],u,l)=>{o!==0&&(i++,l.done())}).next(()=>i>0)}At(e,t){return wr(e).get(t).next(r=>r?Fs(r):null)}}function wr(n){return Se(n,Fr)}function yf(n){return Se(n,jn)}function sn(n){return Se(n,Ur)}/**
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
 */const If="LruGarbageCollector",Pg=1048576;function wf([n,e],[t,r]){const s=z(n,t);return s===0?z(e,r):s}class Ev{constructor(e){this.Pr=e,this.buffer=new ie(wf),this.Tr=0}Ir(){return++this.Tr}Er(e){const t=[e,this.Ir()];if(this.buffer.size<this.Pr)this.buffer=this.buffer.add(t);else{const r=this.buffer.last();wf(t,r)<0&&(this.buffer=this.buffer.delete(r).add(t))}}get maxValue(){return this.buffer.last()[0]}}class Cg{constructor(e,t,r){this.garbageCollector=e,this.asyncQueue=t,this.localStore=r,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Ar(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Ar(e){D(If,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){vn(t)?D(If,"Ignoring IndexedDB error during garbage collection: ",t):await Tn(t)}await this.Ar(3e5)})}}class Tv{constructor(e,t){this.Vr=e,this.params=t}calculateTargetCount(e,t){return this.Vr.dr(e).next(r=>Math.floor(t/100*r))}nthSequenceNumber(e,t){if(t===0)return A.resolve(He.ce);const r=new Ev(t);return this.Vr.forEachTarget(e,s=>r.Er(s.sequenceNumber)).next(()=>this.Vr.mr(e,s=>r.Er(s))).next(()=>r.maxValue)}removeTargets(e,t,r){return this.Vr.removeTargets(e,t,r)}removeOrphanedDocuments(e,t){return this.Vr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(D("LruGarbageCollector","Garbage collection skipped; disabled"),A.resolve(_f)):this.getCacheSize(e).next(r=>r<this.params.cacheSizeCollectionThreshold?(D("LruGarbageCollector",`Garbage collection skipped; Cache size ${r} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),_f):this.gr(e,t))}getCacheSize(e){return this.Vr.getCacheSize(e)}gr(e,t){let r,s,i,o,c,u,l;const f=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(p=>(p>this.params.maximumSequenceNumbersToCollect?(D("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),s=this.params.maximumSequenceNumbersToCollect):s=p,o=Date.now(),this.nthSequenceNumber(e,s))).next(p=>(r=p,c=Date.now(),this.removeTargets(e,r,t))).next(p=>(i=p,u=Date.now(),this.removeOrphanedDocuments(e,r))).next(p=>(l=Date.now(),Er()<=X.DEBUG&&D("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-f}ms
	Determined least recently used ${s} in `+(c-o)+`ms
	Removed ${i} targets in `+(u-c)+`ms
	Removed ${p} documents in `+(l-u)+`ms
Total Duration: ${l-f}ms`),A.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:i,documentsRemoved:p})))}}function kg(n,e){return new Tv(n,e)}/**
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
 */class vv{constructor(e,t){this.db=e,this.garbageCollector=kg(this,t)}dr(e){const t=this.pr(e);return this.db.getTargetCache().getTargetCount(e).next(r=>t.next(s=>r+s))}pr(e){let t=0;return this.mr(e,r=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}mr(e,t){return this.yr(e,(r,s)=>t(s))}addReference(e,t,r){return io(e,r)}removeReference(e,t,r){return io(e,r)}removeTargets(e,t,r){return this.db.getTargetCache().removeTargets(e,t,r)}markPotentiallyOrphaned(e,t){return io(e,t)}wr(e,t){return function(s,i){let o=!1;return Sg(s).te(c=>bg(s,c,i).next(u=>(u&&(o=!0),A.resolve(!u)))).next(()=>o)}(e,t)}removeOrphanedDocuments(e,t){const r=this.db.getRemoteDocumentCache().newChangeBuffer(),s=[];let i=0;return this.yr(e,(o,c)=>{if(c<=t){const u=this.wr(e,o).next(l=>{if(!l)return i++,r.getEntry(e,o).next(()=>(r.removeEntry(o,$.min()),sn(e).delete(function(p){return[0,je(p.path)]}(o))))});s.push(u)}}).next(()=>A.waitFor(s)).next(()=>r.apply(e)).next(()=>i)}removeTarget(e,t){const r=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,r)}updateLimboDocument(e,t){return io(e,t)}yr(e,t){const r=sn(e);let s,i=He.ce;return r.ee({index:Lu},([o,c],{path:u,sequenceNumber:l})=>{o===0?(i!==He.ce&&t(new x(vt(s)),i),i=l,s=u):i=He.ce}).next(()=>{i!==He.ce&&t(new x(vt(s)),i)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function io(n,e){return sn(n).put(function(r,s){return{targetId:0,path:je(r.path),sequenceNumber:s}}(e,n.currentSequenceNumber))}/**
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
 */class Ng{constructor(){this.changes=new jt(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,le.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const r=this.changes.get(t);return r!==void 0?A.resolve(r):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
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
 */class Av{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,r){return Dn(e).put(r)}removeEntry(e,t,r){return Dn(e).delete(function(i,o){const c=i.path.toArray();return[c.slice(0,c.length-2),c[c.length-2],Uo(o),c[c.length-1]]}(t,r))}updateMetadata(e,t){return this.getMetadata(e).next(r=>(r.byteSize+=t,this.br(e,r)))}getEntry(e,t){let r=le.newInvalidDocument(t);return Dn(e).ee({index:go,range:IDBKeyRange.only(Ps(t))},(s,i)=>{r=this.Sr(t,i)}).next(()=>r)}Dr(e,t){let r={size:0,document:le.newInvalidDocument(t)};return Dn(e).ee({index:go,range:IDBKeyRange.only(Ps(t))},(s,i)=>{r={document:this.Sr(t,i),size:qo(i)}}).next(()=>r)}getEntries(e,t){let r=tt();return this.Cr(e,t,(s,i)=>{const o=this.Sr(s,i);r=r.insert(s,o)}).next(()=>r)}vr(e,t){let r=tt(),s=new ae(x.comparator);return this.Cr(e,t,(i,o)=>{const c=this.Sr(i,o);r=r.insert(i,c),s=s.insert(i,qo(o))}).next(()=>({documents:r,Fr:s}))}Cr(e,t,r){if(t.isEmpty())return A.resolve();let s=new ie(vf);t.forEach(u=>s=s.add(u));const i=IDBKeyRange.bound(Ps(s.first()),Ps(s.last())),o=s.getIterator();let c=o.getNext();return Dn(e).ee({index:go,range:i},(u,l,f)=>{const p=x.fromSegments([...l.prefixPath,l.collectionGroup,l.documentId]);for(;c&&vf(c,p)<0;)r(c,null),c=o.getNext();c&&c.isEqual(p)&&(r(c,l),c=o.hasNext()?o.getNext():null),c?f.j(Ps(c)):f.done()}).next(()=>{for(;c;)r(c,null),c=o.hasNext()?o.getNext():null})}getDocumentsMatchingQuery(e,t,r,s,i){const o=t.path,c=[o.popLast().toArray(),o.lastSegment(),Uo(r.readTime),r.documentKey.path.isEmpty()?"":r.documentKey.path.lastSegment()],u=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return Dn(e).H(IDBKeyRange.bound(c,u,!0)).next(l=>{i==null||i.incrementDocumentReadCount(l.length);let f=tt();for(const p of l){const g=this.Sr(x.fromSegments(p.prefixPath.concat(p.collectionGroup,p.documentId)),p);g.isFoundDocument()&&(Ci(t,g)||s.has(g.key))&&(f=f.insert(g.key,g))}return f})}getAllFromCollectionGroup(e,t,r,s){let i=tt();const o=Tf(t,r),c=Tf(t,it.max());return Dn(e).ee({index:mm,range:IDBKeyRange.bound(o,c,!0)},(u,l,f)=>{const p=this.Sr(x.fromSegments(l.prefixPath.concat(l.collectionGroup,l.documentId)),l);i=i.insert(p.key,p),i.size===s&&f.done()}).next(()=>i)}newChangeBuffer(e){return new Rv(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(t=>t.byteSize)}getMetadata(e){return Ef(e).get(Xc).next(t=>(U(!!t,20021),t))}br(e,t){return Ef(e).put(Xc,t)}Sr(e,t){if(t){const r=lv(this.serializer,t);if(!(r.isNoDocument()&&r.version.isEqual($.min())))return r}return le.newInvalidDocument(e)}}function Dg(n){return new Av(n)}class Rv extends Ng{constructor(e,t){super(),this.Mr=e,this.trackRemovals=t,this.Or=new jt(r=>r.toString(),(r,s)=>r.isEqual(s))}applyChanges(e){const t=[];let r=0,s=new ie((i,o)=>z(i.canonicalString(),o.canonicalString()));return this.changes.forEach((i,o)=>{const c=this.Or.get(i);if(t.push(this.Mr.removeEntry(e,i,c.readTime)),o.isValidDocument()){const u=rf(this.Mr.serializer,o);s=s.add(i.path.popLast());const l=qo(u);r+=l-c.size,t.push(this.Mr.addEntry(e,i,u))}else if(r-=c.size,this.trackRemovals){const u=rf(this.Mr.serializer,o.convertToNoDocument($.min()));t.push(this.Mr.addEntry(e,i,u))}}),s.forEach(i=>{t.push(this.Mr.indexManager.addToCollectionParentIndex(e,i))}),t.push(this.Mr.updateMetadata(e,r)),A.waitFor(t)}getFromCache(e,t){return this.Mr.Dr(e,t).next(r=>(this.Or.set(t,{size:r.size,readTime:r.document.readTime}),r.document))}getAllFromCache(e,t){return this.Mr.vr(e,t).next(({documents:r,Fr:s})=>(s.forEach((i,o)=>{this.Or.set(i,{size:o,readTime:r.get(i).readTime})}),r))}}function Ef(n){return Se(n,oi)}function Dn(n){return Se(n,Vo)}function Ps(n){const e=n.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function Tf(n,e){const t=e.documentKey.path.toArray();return[n,Uo(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function vf(n,e){const t=n.path.toArray(),r=e.path.toArray();let s=0;for(let i=0;i<t.length-2&&i<r.length-2;++i)if(s=z(t[i],r[i]),s)return s;return s=z(t.length,r.length),s||(s=z(t[t.length-2],r[r.length-2]),s||z(t[t.length-1],r[r.length-1]))}/**
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
 */class bv{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
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
 */class Vg{constructor(e,t,r,s){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=r,this.indexManager=s}getDocument(e,t){let r=null;return this.documentOverlayCache.getOverlay(e,t).next(s=>(r=s,this.remoteDocumentCache.getEntry(e,t))).next(s=>(r!==null&&Hs(r.mutation,s,Qe.empty(),re.now()),s))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(r=>this.getLocalViewOfDocuments(e,r,H()).next(()=>r))}getLocalViewOfDocuments(e,t,r=H()){const s=At();return this.populateOverlays(e,s,t).next(()=>this.computeViews(e,t,s,r).next(i=>{let o=Ls();return i.forEach((c,u)=>{o=o.insert(c,u.overlayedDocument)}),o}))}getOverlayedDocuments(e,t){const r=At();return this.populateOverlays(e,r,t).next(()=>this.computeViews(e,t,r,H()))}populateOverlays(e,t,r){const s=[];return r.forEach(i=>{t.has(i)||s.push(i)}),this.documentOverlayCache.getOverlays(e,s).next(i=>{i.forEach((o,c)=>{t.set(o,c)})})}computeViews(e,t,r,s){let i=tt();const o=Ks(),c=function(){return Ks()}();return t.forEach((u,l)=>{const f=r.get(l.key);s.has(l.key)&&(f===void 0||f.mutation instanceof Gt)?i=i.insert(l.key,l):f!==void 0?(o.set(l.key,f.mutation.getFieldMask()),Hs(f.mutation,l,f.mutation.getFieldMask(),re.now())):o.set(l.key,Qe.empty())}),this.recalculateAndSaveOverlays(e,i).next(u=>(u.forEach((l,f)=>o.set(l,f)),t.forEach((l,f)=>c.set(l,new bv(f,o.get(l)??null))),c))}recalculateAndSaveOverlays(e,t){const r=Ks();let s=new ae((o,c)=>o-c),i=H();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(o=>{for(const c of o)c.keys().forEach(u=>{const l=t.get(u);if(l===null)return;let f=r.get(u)||Qe.empty();f=c.applyToLocalView(l,f),r.set(u,f);const p=(s.get(c.batchId)||H()).add(u);s=s.insert(c.batchId,p)})}).next(()=>{const o=[],c=s.getReverseIterator();for(;c.hasNext();){const u=c.getNext(),l=u.key,f=u.value,p=Hm();f.forEach(g=>{if(!i.has(g)){const v=ng(t.get(g),r.get(g));v!==null&&p.set(g,v),i=i.add(g)}}),o.push(this.documentOverlayCache.saveOverlays(e,l,p))}return A.waitFor(o)}).next(()=>r)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(r=>this.recalculateAndSaveOverlays(e,r))}getDocumentsMatchingQuery(e,t,r,s){return CT(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):ju(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,r,s):this.getDocumentsMatchingCollectionQuery(e,t,r,s)}getNextDocuments(e,t,r,s){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,r,s).next(i=>{const o=s-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,r.largestBatchId,s-i.size):A.resolve(At());let c=Lr,u=i;return o.next(l=>A.forEach(l,(f,p)=>(c<p.largestBatchId&&(c=p.largestBatchId),i.get(f)?A.resolve():this.remoteDocumentCache.getEntry(e,f).next(g=>{u=u.insert(f,g)}))).next(()=>this.populateOverlays(e,l,i)).next(()=>this.computeViews(e,u,l,H())).next(f=>({batchId:c,changes:Km(f)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new x(t)).next(r=>{let s=Ls();return r.isFoundDocument()&&(s=s.insert(r.key,r)),s})}getDocumentsMatchingCollectionGroupQuery(e,t,r,s){const i=t.collectionGroup;let o=Ls();return this.indexManager.getCollectionParents(e,i).next(c=>A.forEach(c,u=>{const l=function(p,g){return new ur(g,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)}(t,u.child(i));return this.getDocumentsMatchingCollectionQuery(e,l,r,s).next(f=>{f.forEach((p,g)=>{o=o.insert(p,g)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,t,r,s){let i;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,r.largestBatchId).next(o=>(i=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,r,i,s))).next(o=>{i.forEach((u,l)=>{const f=l.getKey();o.get(f)===null&&(o=o.insert(f,le.newInvalidDocument(f)))});let c=Ls();return o.forEach((u,l)=>{const f=i.get(u);f!==void 0&&Hs(f.mutation,l,Qe.empty(),re.now()),Ci(t,l)&&(c=c.insert(u,l))}),c})}}/**
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
 */class Sv{constructor(e){this.serializer=e,this.Nr=new Map,this.Br=new Map}getBundleMetadata(e,t){return A.resolve(this.Nr.get(t))}saveBundleMetadata(e,t){return this.Nr.set(t.id,function(s){return{id:s.id,version:s.version,createTime:Oe(s.createTime)}}(t)),A.resolve()}getNamedQuery(e,t){return A.resolve(this.Br.get(t))}saveNamedQuery(e,t){return this.Br.set(t.name,function(s){return{name:s.name,query:Eg(s.bundledQuery),readTime:Oe(s.readTime)}}(t)),A.resolve()}}/**
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
 */class Pv{constructor(){this.overlays=new ae(x.comparator),this.Lr=new Map}getOverlay(e,t){return A.resolve(this.overlays.get(t))}getOverlays(e,t){const r=At();return A.forEach(t,s=>this.getOverlay(e,s).next(i=>{i!==null&&r.set(s,i)})).next(()=>r)}saveOverlays(e,t,r){return r.forEach((s,i)=>{this.bt(e,t,i)}),A.resolve()}removeOverlaysForBatchId(e,t,r){const s=this.Lr.get(r);return s!==void 0&&(s.forEach(i=>this.overlays=this.overlays.remove(i)),this.Lr.delete(r)),A.resolve()}getOverlaysForCollection(e,t,r){const s=At(),i=t.length+1,o=new x(t.child("")),c=this.overlays.getIteratorFrom(o);for(;c.hasNext();){const u=c.getNext().value,l=u.getKey();if(!t.isPrefixOf(l.path))break;l.path.length===i&&u.largestBatchId>r&&s.set(u.getKey(),u)}return A.resolve(s)}getOverlaysForCollectionGroup(e,t,r,s){let i=new ae((l,f)=>l-f);const o=this.overlays.getIterator();for(;o.hasNext();){const l=o.getNext().value;if(l.getKey().getCollectionGroup()===t&&l.largestBatchId>r){let f=i.get(l.largestBatchId);f===null&&(f=At(),i=i.insert(l.largestBatchId,f)),f.set(l.getKey(),l)}}const c=At(),u=i.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach((l,f)=>c.set(l,f)),!(c.size()>=s)););return A.resolve(c)}bt(e,t,r){const s=this.overlays.get(r.key);if(s!==null){const o=this.Lr.get(s.largestBatchId).delete(r.key);this.Lr.set(s.largestBatchId,o)}this.overlays=this.overlays.insert(r.key,new Qu(t,r));let i=this.Lr.get(t);i===void 0&&(i=H(),this.Lr.set(t,i)),this.Lr.set(t,i.add(r.key))}}/**
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
 */class Cv{constructor(){this.sessionToken=we.EMPTY_BYTE_STRING}getSessionToken(e){return A.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,A.resolve()}}/**
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
 */class tl{constructor(){this.kr=new ie(Ne.Kr),this.qr=new ie(Ne.Ur)}isEmpty(){return this.kr.isEmpty()}addReference(e,t){const r=new Ne(e,t);this.kr=this.kr.add(r),this.qr=this.qr.add(r)}$r(e,t){e.forEach(r=>this.addReference(r,t))}removeReference(e,t){this.Wr(new Ne(e,t))}Qr(e,t){e.forEach(r=>this.removeReference(r,t))}Gr(e){const t=new x(new ne([])),r=new Ne(t,e),s=new Ne(t,e+1),i=[];return this.qr.forEachInRange([r,s],o=>{this.Wr(o),i.push(o.key)}),i}zr(){this.kr.forEach(e=>this.Wr(e))}Wr(e){this.kr=this.kr.delete(e),this.qr=this.qr.delete(e)}jr(e){const t=new x(new ne([])),r=new Ne(t,e),s=new Ne(t,e+1);let i=H();return this.qr.forEachInRange([r,s],o=>{i=i.add(o.key)}),i}containsKey(e){const t=new Ne(e,0),r=this.kr.firstAfterOrEqual(t);return r!==null&&e.isEqual(r.key)}}class Ne{constructor(e,t){this.key=e,this.Hr=t}static Kr(e,t){return x.comparator(e.key,t.key)||z(e.Hr,t.Hr)}static Ur(e,t){return z(e.Hr,t.Hr)||x.comparator(e.key,t.key)}}/**
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
 */class kv{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.Yn=1,this.Jr=new ie(Ne.Kr)}checkEmpty(e){return A.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,r,s){const i=this.Yn;this.Yn++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Ku(i,t,r,s);this.mutationQueue.push(o);for(const c of s)this.Jr=this.Jr.add(new Ne(c.key,i)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return A.resolve(o)}lookupMutationBatch(e,t){return A.resolve(this.Zr(t))}getNextMutationBatchAfterBatchId(e,t){const r=t+1,s=this.Xr(r),i=s<0?0:s;return A.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return A.resolve(this.mutationQueue.length===0?$n:this.Yn-1)}getAllMutationBatches(e){return A.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const r=new Ne(t,0),s=new Ne(t,Number.POSITIVE_INFINITY),i=[];return this.Jr.forEachInRange([r,s],o=>{const c=this.Zr(o.Hr);i.push(c)}),A.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new ie(z);return t.forEach(s=>{const i=new Ne(s,0),o=new Ne(s,Number.POSITIVE_INFINITY);this.Jr.forEachInRange([i,o],c=>{r=r.add(c.Hr)})}),A.resolve(this.Yr(r))}getAllMutationBatchesAffectingQuery(e,t){const r=t.path,s=r.length+1;let i=r;x.isDocumentKey(i)||(i=i.child(""));const o=new Ne(new x(i),0);let c=new ie(z);return this.Jr.forEachWhile(u=>{const l=u.key.path;return!!r.isPrefixOf(l)&&(l.length===s&&(c=c.add(u.Hr)),!0)},o),A.resolve(this.Yr(c))}Yr(e){const t=[];return e.forEach(r=>{const s=this.Zr(r);s!==null&&t.push(s)}),t}removeMutationBatch(e,t){U(this.ei(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let r=this.Jr;return A.forEach(t.mutations,s=>{const i=new Ne(s.key,t.batchId);return r=r.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,s.key)}).next(()=>{this.Jr=r})}nr(e){}containsKey(e,t){const r=new Ne(t,0),s=this.Jr.firstAfterOrEqual(r);return A.resolve(t.isEqual(s&&s.key))}performConsistencyCheck(e){return this.mutationQueue.length,A.resolve()}ei(e,t){return this.Xr(e)}Xr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Zr(e){const t=this.Xr(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
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
 */class Nv{constructor(e){this.ti=e,this.docs=function(){return new ae(x.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const r=t.key,s=this.docs.get(r),i=s?s.size:0,o=this.ti(t);return this.docs=this.docs.insert(r,{document:t.mutableCopy(),size:o}),this.size+=o-i,this.indexManager.addToCollectionParentIndex(e,r.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const r=this.docs.get(t);return A.resolve(r?r.document.mutableCopy():le.newInvalidDocument(t))}getEntries(e,t){let r=tt();return t.forEach(s=>{const i=this.docs.get(s);r=r.insert(s,i?i.document.mutableCopy():le.newInvalidDocument(s))}),A.resolve(r)}getDocumentsMatchingQuery(e,t,r,s){let i=tt();const o=t.path,c=new x(o.child("__id-9223372036854775808__")),u=this.docs.getIteratorFrom(c);for(;u.hasNext();){const{key:l,value:{document:f}}=u.getNext();if(!o.isPrefixOf(l.path))break;l.path.length>o.length+1||Ou(um(f),r)<=0||(s.has(f.key)||Ci(t,f))&&(i=i.insert(f.key,f.mutableCopy()))}return A.resolve(i)}getAllFromCollectionGroup(e,t,r,s){M(9500)}ni(e,t){return A.forEach(this.docs,r=>t(r))}newChangeBuffer(e){return new Dv(this)}getSize(e){return A.resolve(this.size)}}class Dv extends Ng{constructor(e){super(),this.Mr=e}applyChanges(e){const t=[];return this.changes.forEach((r,s)=>{s.isValidDocument()?t.push(this.Mr.addEntry(e,s)):this.Mr.removeEntry(r)}),A.waitFor(t)}getFromCache(e,t){return this.Mr.getEntry(e,t)}getAllFromCache(e,t){return this.Mr.getEntries(e,t)}}/**
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
 */class Vv{constructor(e){this.persistence=e,this.ri=new jt(t=>Jn(t),Si),this.lastRemoteSnapshotVersion=$.min(),this.highestTargetId=0,this.ii=0,this.si=new tl,this.targetCount=0,this.oi=Zn._r()}forEachTarget(e,t){return this.ri.forEach((r,s)=>t(s)),A.resolve()}getLastRemoteSnapshotVersion(e){return A.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return A.resolve(this.ii)}allocateTargetId(e){return this.highestTargetId=this.oi.next(),A.resolve(this.highestTargetId)}setTargetsMetadata(e,t,r){return r&&(this.lastRemoteSnapshotVersion=r),t>this.ii&&(this.ii=t),A.resolve()}lr(e){this.ri.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.oi=new Zn(t),this.highestTargetId=t),e.sequenceNumber>this.ii&&(this.ii=e.sequenceNumber)}addTargetData(e,t){return this.lr(t),this.targetCount+=1,A.resolve()}updateTargetData(e,t){return this.lr(t),A.resolve()}removeTargetData(e,t){return this.ri.delete(t.target),this.si.Gr(t.targetId),this.targetCount-=1,A.resolve()}removeTargets(e,t,r){let s=0;const i=[];return this.ri.forEach((o,c)=>{c.sequenceNumber<=t&&r.get(c.targetId)===null&&(this.ri.delete(o),i.push(this.removeMatchingKeysForTargetId(e,c.targetId)),s++)}),A.waitFor(i).next(()=>s)}getTargetCount(e){return A.resolve(this.targetCount)}getTargetData(e,t){const r=this.ri.get(t)||null;return A.resolve(r)}addMatchingKeys(e,t,r){return this.si.$r(t,r),A.resolve()}removeMatchingKeys(e,t,r){this.si.Qr(t,r);const s=this.persistence.referenceDelegate,i=[];return s&&t.forEach(o=>{i.push(s.markPotentiallyOrphaned(e,o))}),A.waitFor(i)}removeMatchingKeysForTargetId(e,t){return this.si.Gr(t),A.resolve()}getMatchingKeysForTargetId(e,t){const r=this.si.jr(t);return A.resolve(r)}containsKey(e,t){return A.resolve(this.si.containsKey(t))}}/**
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
 */class nl{constructor(e,t){this._i={},this.overlays={},this.ai=new He(0),this.ui=!1,this.ui=!0,this.ci=new Cv,this.referenceDelegate=e(this),this.li=new Vv(this),this.indexManager=new yv,this.remoteDocumentCache=function(s){return new Nv(s)}(r=>this.referenceDelegate.hi(r)),this.serializer=new Ig(t),this.Pi=new Sv(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.ui=!1,Promise.resolve()}get started(){return this.ui}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new Pv,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let r=this._i[e.toKey()];return r||(r=new kv(t,this.referenceDelegate),this._i[e.toKey()]=r),r}getGlobalsCache(){return this.ci}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Pi}runTransaction(e,t,r){D("MemoryPersistence","Starting transaction:",e);const s=new Ov(this.ai.next());return this.referenceDelegate.Ti(),r(s).next(i=>this.referenceDelegate.Ii(s).next(()=>i)).toPromise().then(i=>(s.raiseOnCommittedEvent(),i))}Ei(e,t){return A.or(Object.values(this._i).map(r=>()=>r.containsKey(e,t)))}}class Ov extends hm{constructor(e){super(),this.currentSequenceNumber=e}}class wa{constructor(e){this.persistence=e,this.Ri=new tl,this.Ai=null}static Vi(e){return new wa(e)}get di(){if(this.Ai)return this.Ai;throw M(60996)}addReference(e,t,r){return this.Ri.addReference(r,t),this.di.delete(r.toString()),A.resolve()}removeReference(e,t,r){return this.Ri.removeReference(r,t),this.di.add(r.toString()),A.resolve()}markPotentiallyOrphaned(e,t){return this.di.add(t.toString()),A.resolve()}removeTarget(e,t){this.Ri.Gr(t.targetId).forEach(s=>this.di.add(s.toString()));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,t.targetId).next(s=>{s.forEach(i=>this.di.add(i.toString()))}).next(()=>r.removeTargetData(e,t))}Ti(){this.Ai=new Set}Ii(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return A.forEach(this.di,r=>{const s=x.fromPath(r);return this.mi(e,s).next(i=>{i||t.removeEntry(s,$.min())})}).next(()=>(this.Ai=null,t.apply(e)))}updateLimboDocument(e,t){return this.mi(e,t).next(r=>{r?this.di.delete(t.toString()):this.di.add(t.toString())})}hi(e){return 0}mi(e,t){return A.or([()=>A.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ei(e,t)])}}class $o{constructor(e,t){this.persistence=e,this.fi=new jt(r=>je(r.path),(r,s)=>r.isEqual(s)),this.garbageCollector=kg(this,t)}static Vi(e,t){return new $o(e,t)}Ti(){}Ii(e){return A.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}dr(e){const t=this.pr(e);return this.persistence.getTargetCache().getTargetCount(e).next(r=>t.next(s=>r+s))}pr(e){let t=0;return this.mr(e,r=>{t++}).next(()=>t)}mr(e,t){return A.forEach(this.fi,(r,s)=>this.wr(e,r,s).next(i=>i?A.resolve():t(s)))}removeTargets(e,t,r){return this.persistence.getTargetCache().removeTargets(e,t,r)}removeOrphanedDocuments(e,t){let r=0;const s=this.persistence.getRemoteDocumentCache(),i=s.newChangeBuffer();return s.ni(e,o=>this.wr(e,o,t).next(c=>{c||(r++,i.removeEntry(o,$.min()))})).next(()=>i.apply(e)).next(()=>r)}markPotentiallyOrphaned(e,t){return this.fi.set(t,e.currentSequenceNumber),A.resolve()}removeTarget(e,t){const r=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,r)}addReference(e,t,r){return this.fi.set(r,e.currentSequenceNumber),A.resolve()}removeReference(e,t,r){return this.fi.set(r,e.currentSequenceNumber),A.resolve()}updateLimboDocument(e,t){return this.fi.set(t,e.currentSequenceNumber),A.resolve()}hi(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=yo(e.data.value)),t}wr(e,t,r){return A.or([()=>this.persistence.Ei(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const s=this.fi.get(t);return A.resolve(s!==void 0&&s>r)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
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
 */class xv{constructor(e){this.serializer=e}k(e,t,r,s){const i=new ca("createOrUpgrade",t);r<1&&s>=1&&(function(u){u.createObjectStore(bi)}(e),function(u){u.createObjectStore(ii,{keyPath:GE}),u.createObjectStore(gt,{keyPath:Vd,autoIncrement:!0}).createIndex(Bn,Od,{unique:!0}),u.createObjectStore(Mr)}(e),Af(e),function(u){u.createObjectStore(xn)}(e));let o=A.resolve();return r<3&&s>=3&&(r!==0&&(function(u){u.deleteObjectStore(Ur),u.deleteObjectStore(Fr),u.deleteObjectStore(jn)}(e),Af(e)),o=o.next(()=>function(u){const l=u.store(jn),f={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:$.min().toTimestamp(),targetCount:0};return l.put(Oo,f)}(i))),r<4&&s>=4&&(r!==0&&(o=o.next(()=>function(u,l){return l.store(gt).H().next(p=>{u.deleteObjectStore(gt),u.createObjectStore(gt,{keyPath:Vd,autoIncrement:!0}).createIndex(Bn,Od,{unique:!0});const g=l.store(gt),v=p.map(C=>g.put(C));return A.waitFor(v)})}(e,i))),o=o.next(()=>{(function(u){u.createObjectStore(Br,{keyPath:ZE})})(e)})),r<5&&s>=5&&(o=o.next(()=>this.gi(i))),r<6&&s>=6&&(o=o.next(()=>(function(u){u.createObjectStore(oi)}(e),this.pi(i)))),r<7&&s>=7&&(o=o.next(()=>this.yi(i))),r<8&&s>=8&&(o=o.next(()=>this.wi(e,i))),r<9&&s>=9&&(o=o.next(()=>{(function(u){u.objectStoreNames.contains("remoteDocumentChanges")&&u.deleteObjectStore("remoteDocumentChanges")})(e)})),r<10&&s>=10&&(o=o.next(()=>this.bi(i))),r<11&&s>=11&&(o=o.next(()=>{(function(u){u.createObjectStore(ua,{keyPath:eT})})(e),function(u){u.createObjectStore(la,{keyPath:tT})}(e)})),r<12&&s>=12&&(o=o.next(()=>{(function(u){const l=u.createObjectStore(ha,{keyPath:cT});l.createIndex(eu,uT,{unique:!1}),l.createIndex(Im,lT,{unique:!1})})(e)})),r<13&&s>=13&&(o=o.next(()=>function(u){const l=u.createObjectStore(Vo,{keyPath:WE});l.createIndex(go,KE),l.createIndex(mm,HE)}(e)).next(()=>this.Si(e,i)).next(()=>e.deleteObjectStore(xn))),r<14&&s>=14&&(o=o.next(()=>this.Di(e,i))),r<15&&s>=15&&(o=o.next(()=>function(u){u.createObjectStore(Mu,{keyPath:nT,autoIncrement:!0}).createIndex(Zc,rT,{unique:!1}),u.createObjectStore(Gs,{keyPath:sT}).createIndex(_m,iT,{unique:!1}),u.createObjectStore(zs,{keyPath:oT}).createIndex(ym,aT,{unique:!1})}(e))),r<16&&s>=16&&(o=o.next(()=>{t.objectStore(Gs).clear()}).next(()=>{t.objectStore(zs).clear()})),r<17&&s>=17&&(o=o.next(()=>{(function(u){u.createObjectStore(Fu,{keyPath:hT})})(e)})),r<18&&s>=18&&Wp()&&(o=o.next(()=>{t.objectStore(Gs).clear()}).next(()=>{t.objectStore(zs).clear()})),o}pi(e){let t=0;return e.store(xn).ee((r,s)=>{t+=qo(s)}).next(()=>{const r={byteSize:t};return e.store(oi).put(Xc,r)})}gi(e){const t=e.store(ii),r=e.store(gt);return t.H().next(s=>A.forEach(s,i=>{const o=IDBKeyRange.bound([i.userId,$n],[i.userId,i.lastAcknowledgedBatchId]);return r.H(Bn,o).next(c=>A.forEach(c,u=>{U(u.userId===i.userId,18650,"Cannot process batch from unexpected user",{batchId:u.batchId});const l=Mn(this.serializer,u);return Rg(e,i.userId,l).next(()=>{})}))}))}yi(e){const t=e.store(Ur),r=e.store(xn);return e.store(jn).get(Oo).next(s=>{const i=[];return r.ee((o,c)=>{const u=new ne(o),l=function(p){return[0,je(p)]}(u);i.push(t.get(l).next(f=>f?A.resolve():(p=>t.put({targetId:0,path:je(p),sequenceNumber:s.highestListenSequenceNumber}))(u)))}).next(()=>A.waitFor(i))})}wi(e,t){e.createObjectStore(ai,{keyPath:XE});const r=t.store(ai),s=new el,i=o=>{if(s.add(o)){const c=o.lastSegment(),u=o.popLast();return r.put({collectionId:c,parent:je(u)})}};return t.store(xn).ee({Y:!0},(o,c)=>{const u=new ne(o);return i(u.popLast())}).next(()=>t.store(Mr).ee({Y:!0},([o,c,u],l)=>{const f=vt(c);return i(f.popLast())}))}bi(e){const t=e.store(Fr);return t.ee((r,s)=>{const i=Fs(s),o=wg(this.serializer,i);return t.put(o)})}Si(e,t){const r=t.store(xn),s=[];return r.ee((i,o)=>{const c=t.store(Vo),u=function(p){return p.document?new x(ne.fromString(p.document.name).popFirst(5)):p.noDocument?x.fromSegments(p.noDocument.path):p.unknownDocument?x.fromSegments(p.unknownDocument.path):M(36783)}(o).path.toArray(),l={prefixPath:u.slice(0,u.length-2),collectionGroup:u[u.length-2],documentId:u[u.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};s.push(c.put(l))}).next(()=>A.waitFor(s))}Di(e,t){const r=t.store(gt),s=Dg(this.serializer),i=new nl(wa.Vi,this.serializer.yt);return r.H().next(o=>{const c=new Map;return o.forEach(u=>{let l=c.get(u.userId)??H();Mn(this.serializer,u).keys().forEach(f=>l=l.add(f)),c.set(u.userId,l)}),A.forEach(c,(u,l)=>{const f=new Be(l),p=ya.wt(this.serializer,f),g=i.getIndexManager(f),v=Ia.wt(f,this.serializer,g,i.referenceDelegate);return new Vg(s,v,p,g).recalculateAndSaveOverlaysForDocumentKeys(new tu(t,He.ce),u).next()})})}}function Af(n){n.createObjectStore(Ur,{keyPath:JE}).createIndex(Lu,YE,{unique:!0}),n.createObjectStore(Fr,{keyPath:"targetId"}).createIndex(gm,QE,{unique:!0}),n.createObjectStore(jn)}const en="IndexedDbPersistence",vc=18e5,Ac=5e3,Rc="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",Lv="main";class rl{constructor(e,t,r,s,i,o,c,u,l,f,p=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=r,this.Ci=i,this.window=o,this.document=c,this.Fi=l,this.Mi=f,this.xi=p,this.ai=null,this.ui=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Oi=null,this.inForeground=!1,this.Ni=null,this.Bi=null,this.Li=Number.NEGATIVE_INFINITY,this.ki=g=>Promise.resolve(),!rl.v())throw new V(S.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new vv(this,s),this.Ki=t+Lv,this.serializer=new Ig(u),this.qi=new dn(this.Ki,this.xi,new xv(this.serializer)),this.ci=new dv,this.li=new wv(this.referenceDelegate,this.serializer),this.remoteDocumentCache=Dg(this.serializer),this.Pi=new hv,this.window&&this.window.localStorage?this.Ui=this.window.localStorage:(this.Ui=null,f===!1&&Ie(en,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.$i().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new V(S.FAILED_PRECONDITION,Rc);return this.Wi(),this.Qi(),this.Gi(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.li.getHighestSequenceNumber(e))}).then(e=>{this.ai=new He(e,this.Fi)}).then(()=>{this.ui=!0}).catch(e=>(this.qi&&this.qi.close(),Promise.reject(e)))}zi(e){return this.ki=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.qi.q(async t=>{t.newVersion===null&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Ci.enqueueAndForget(async()=>{this.started&&await this.$i()}))}$i(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>oo(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.ji(e).next(t=>{t||(this.isPrimary=!1,this.Ci.enqueueRetryable(()=>this.ki(!1)))})}).next(()=>this.Hi(e)).next(t=>this.isPrimary&&!t?this.Ji(e).next(()=>!1):!!t&&this.Zi(e).next(()=>!0))).catch(e=>{if(vn(e))return D(en,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return D(en,"Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.Ci.enqueueRetryable(()=>this.ki(e)),this.isPrimary=e})}ji(e){return Cs(e).get(mr).next(t=>A.resolve(this.Xi(t)))}Yi(e){return oo(e).delete(this.clientId)}async es(){if(this.isPrimary&&!this.ts(this.Li,vc)){this.Li=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",t=>{const r=Se(t,Br);return r.H().next(s=>{const i=this.ns(s,vc),o=s.filter(c=>i.indexOf(c)===-1);return A.forEach(o,c=>r.delete(c.clientId)).next(()=>o)})}).catch(()=>[]);if(this.Ui)for(const t of e)this.Ui.removeItem(this.rs(t.clientId))}}Gi(){this.Bi=this.Ci.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.$i().then(()=>this.es()).then(()=>this.Gi()))}Xi(e){return!!e&&e.ownerId===this.clientId}Hi(e){return this.Mi?A.resolve(!0):Cs(e).get(mr).next(t=>{if(t!==null&&this.ts(t.leaseTimestampMs,Ac)&&!this.ss(t.ownerId)){if(this.Xi(t)&&this.networkEnabled)return!0;if(!this.Xi(t)){if(!t.allowTabSynchronization)throw new V(S.FAILED_PRECONDITION,Rc);return!1}}return!(!this.networkEnabled||!this.inForeground)||oo(e).H().next(r=>this.ns(r,Ac).find(s=>{if(this.clientId!==s.clientId){const i=!this.networkEnabled&&s.networkEnabled,o=!this.inForeground&&s.inForeground,c=this.networkEnabled===s.networkEnabled;if(i||o&&c)return!0}return!1})===void 0)}).next(t=>(this.isPrimary!==t&&D(en,`Client ${t?"is":"is not"} eligible for a primary lease.`),t))}async shutdown(){this.ui=!1,this._s(),this.Bi&&(this.Bi.cancel(),this.Bi=null),this.us(),this.cs(),await this.qi.runTransaction("shutdown","readwrite",[bi,Br],e=>{const t=new tu(e,He.ce);return this.Ji(t).next(()=>this.Yi(t))}),this.qi.close(),this.ls()}ns(e,t){return e.filter(r=>this.ts(r.updateTimeMs,t)&&!this.ss(r.clientId))}hs(){return this.runTransaction("getActiveClients","readonly",e=>oo(e).H().next(t=>this.ns(t,vc).map(r=>r.clientId)))}get started(){return this.ui}getGlobalsCache(){return this.ci}getMutationQueue(e,t){return Ia.wt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new Iv(e,this.serializer.yt.databaseId)}getDocumentOverlayCache(e){return ya.wt(this.serializer,e)}getBundleCache(){return this.Pi}runTransaction(e,t,r){D(en,"Starting transaction:",e);const s=t==="readonly"?"readonly":"readwrite",i=function(u){return u===18?pT:u===17?vm:u===16?fT:u===15?Uu:u===14?Tm:u===13?Em:u===12?dT:u===11?wm:void M(60245)}(this.xi);let o;return this.qi.runTransaction(e,s,i,c=>(o=new tu(c,this.ai?this.ai.next():He.ce),t==="readwrite-primary"?this.ji(o).next(u=>!!u||this.Hi(o)).next(u=>{if(!u)throw Ie(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Ci.enqueueRetryable(()=>this.ki(!1)),new V(S.FAILED_PRECONDITION,lm);return r(o)}).next(u=>this.Zi(o).next(()=>u)):this.Ps(o).next(()=>r(o)))).then(c=>(o.raiseOnCommittedEvent(),c))}Ps(e){return Cs(e).get(mr).next(t=>{if(t!==null&&this.ts(t.leaseTimestampMs,Ac)&&!this.ss(t.ownerId)&&!this.Xi(t)&&!(this.Mi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new V(S.FAILED_PRECONDITION,Rc)})}Zi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return Cs(e).put(mr,t)}static v(){return dn.v()}Ji(e){const t=Cs(e);return t.get(mr).next(r=>this.Xi(r)?(D(en,"Releasing primary lease."),t.delete(mr)):A.resolve())}ts(e,t){const r=Date.now();return!(e<r-t)&&(!(e>r)||(Ie(`Detected an update time that is in the future: ${e} > ${r}`),!1))}Wi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Ni=()=>{this.Ci.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.$i()))},this.document.addEventListener("visibilitychange",this.Ni),this.inForeground=this.document.visibilityState==="visible")}us(){this.Ni&&(this.document.removeEventListener("visibilitychange",this.Ni),this.Ni=null)}Qi(){var e;typeof((e=this.window)==null?void 0:e.addEventListener)=="function"&&(this.Oi=()=>{this._s();const t=/(?:Version|Mobile)\/1[456]/;zp()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.Ci.enterRestrictedMode(!0),this.Ci.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Oi))}cs(){this.Oi&&(this.window.removeEventListener("pagehide",this.Oi),this.Oi=null)}ss(e){var t;try{const r=((t=this.Ui)==null?void 0:t.getItem(this.rs(e)))!==null;return D(en,`Client '${e}' ${r?"is":"is not"} zombied in LocalStorage`),r}catch(r){return Ie(en,"Failed to get zombied client id.",r),!1}}_s(){if(this.Ui)try{this.Ui.setItem(this.rs(this.clientId),String(Date.now()))}catch(e){Ie("Failed to set zombie client id.",e)}}ls(){if(this.Ui)try{this.Ui.removeItem(this.rs(this.clientId))}catch{}}rs(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function Cs(n){return Se(n,bi)}function oo(n){return Se(n,Br)}function Og(n,e){let t=n.projectId;return n.isDefaultDatabase||(t+="."+n.database),"firestore/"+e+"/"+t+"/"}/**
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
 */class sl{constructor(e,t,r,s){this.targetId=e,this.fromCache=t,this.Ts=r,this.Is=s}static Es(e,t){let r=H(),s=H();for(const i of t.docChanges)switch(i.type){case 0:r=r.add(i.doc.key);break;case 1:s=s.add(i.doc.key)}return new sl(e,t.fromCache,r,s)}}/**
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
 */class Mv{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class xg{constructor(){this.Rs=!1,this.As=!1,this.Vs=100,this.ds=function(){return zp()?8:dm(be())>0?6:4}()}initialize(e,t){this.fs=e,this.indexManager=t,this.Rs=!0}getDocumentsMatchingQuery(e,t,r,s){const i={result:null};return this.gs(e,t).next(o=>{i.result=o}).next(()=>{if(!i.result)return this.ps(e,t,s,r).next(o=>{i.result=o})}).next(()=>{if(i.result)return;const o=new Mv;return this.ys(e,t,o).next(c=>{if(i.result=c,this.As)return this.ws(e,t,o,c.size)})}).next(()=>i.result)}ws(e,t,r,s){return r.documentReadCount<this.Vs?(Er()<=X.DEBUG&&D("QueryEngine","SDK will not create cache indexes for query:",Tr(t),"since it only creates cache indexes for collection contains","more than or equal to",this.Vs,"documents"),A.resolve()):(Er()<=X.DEBUG&&D("QueryEngine","Query:",Tr(t),"scans",r.documentReadCount,"local documents and returns",s,"documents as results."),r.documentReadCount>this.ds*s?(Er()<=X.DEBUG&&D("QueryEngine","The SDK decides to create cache indexes for query:",Tr(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,rt(t))):A.resolve())}gs(e,t){if(Kd(t))return A.resolve(null);let r=rt(t);return this.indexManager.getIndexType(e,r).next(s=>s===0?null:(t.limit!==null&&s===1&&(t=Fo(t,null,"F"),r=rt(t)),this.indexManager.getDocumentsMatchingTarget(e,r).next(i=>{const o=H(...i);return this.fs.getDocuments(e,o).next(c=>this.indexManager.getMinOffset(e,r).next(u=>{const l=this.bs(t,c);return this.Ss(t,l,o,u.readTime)?this.gs(e,Fo(t,null,"F")):this.Ds(e,l,t,u)}))})))}ps(e,t,r,s){return Kd(t)||s.isEqual($.min())?A.resolve(null):this.fs.getDocuments(e,r).next(i=>{const o=this.bs(t,i);return this.Ss(t,o,r,s)?A.resolve(null):(Er()<=X.DEBUG&&D("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),Tr(t)),this.Ds(e,o,t,cm(s,Lr)).next(c=>c))})}bs(e,t){let r=new ie(zm(e));return t.forEach((s,i)=>{Ci(e,i)&&(r=r.add(i))}),r}Ss(e,t,r,s){if(e.limit===null)return!1;if(r.size!==t.size)return!0;const i=e.limitType==="F"?t.last():t.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(s)>0)}ys(e,t,r){return Er()<=X.DEBUG&&D("QueryEngine","Using full collection scan to execute query:",Tr(t)),this.fs.getDocumentsMatchingQuery(e,t,it.min(),r)}Ds(e,t,r,s){return this.fs.getDocumentsMatchingQuery(e,r,s).next(i=>(t.forEach(o=>{i=i.insert(o.key,o)}),i))}}/**
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
 */const il="LocalStore",Fv=3e8;class Uv{constructor(e,t,r,s){this.persistence=e,this.Cs=t,this.serializer=s,this.vs=new ae(z),this.Fs=new jt(i=>Jn(i),Si),this.Ms=new Map,this.xs=e.getRemoteDocumentCache(),this.li=e.getTargetCache(),this.Pi=e.getBundleCache(),this.Os(r)}Os(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new Vg(this.xs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.xs.setIndexManager(this.indexManager),this.Cs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.vs))}}function Lg(n,e,t,r){return new Uv(n,e,t,r)}async function Mg(n,e){const t=F(n);return await t.persistence.runTransaction("Handle user change","readonly",r=>{let s;return t.mutationQueue.getAllMutationBatches(r).next(i=>(s=i,t.Os(e),t.mutationQueue.getAllMutationBatches(r))).next(i=>{const o=[],c=[];let u=H();for(const l of s){o.push(l.batchId);for(const f of l.mutations)u=u.add(f.key)}for(const l of i){c.push(l.batchId);for(const f of l.mutations)u=u.add(f.key)}return t.localDocuments.getDocuments(r,u).next(l=>({Ns:l,removedBatchIds:o,addedBatchIds:c}))})})}function Bv(n,e){const t=F(n);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",r=>{const s=e.batch.keys(),i=t.xs.newChangeBuffer({trackRemovals:!0});return function(c,u,l,f){const p=l.batch,g=p.keys();let v=A.resolve();return g.forEach(C=>{v=v.next(()=>f.getEntry(u,C)).next(N=>{const k=l.docVersions.get(C);U(k!==null,48541),N.version.compareTo(k)<0&&(p.applyToRemoteDocument(N,l),N.isValidDocument()&&(N.setReadTime(l.commitVersion),f.addEntry(N)))})}),v.next(()=>c.mutationQueue.removeMutationBatch(u,p))}(t,r,e,i).next(()=>i.apply(r)).next(()=>t.mutationQueue.performConsistencyCheck(r)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(r,s,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,function(c){let u=H();for(let l=0;l<c.mutationResults.length;++l)c.mutationResults[l].transformResults.length>0&&(u=u.add(c.batch.mutations[l].key));return u}(e))).next(()=>t.localDocuments.getDocuments(r,s))})}function Fg(n){const e=F(n);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.li.getLastRemoteSnapshotVersion(t))}function qv(n,e){const t=F(n),r=e.snapshotVersion;let s=t.vs;return t.persistence.runTransaction("Apply remote event","readwrite-primary",i=>{const o=t.xs.newChangeBuffer({trackRemovals:!0});s=t.vs;const c=[];e.targetChanges.forEach((f,p)=>{const g=s.get(p);if(!g)return;c.push(t.li.removeMatchingKeys(i,f.removedDocuments,p).next(()=>t.li.addMatchingKeys(i,f.addedDocuments,p)));let v=g.withSequenceNumber(i.currentSequenceNumber);e.targetMismatches.get(p)!==null?v=v.withResumeToken(we.EMPTY_BYTE_STRING,$.min()).withLastLimboFreeSnapshotVersion($.min()):f.resumeToken.approximateByteSize()>0&&(v=v.withResumeToken(f.resumeToken,r)),s=s.insert(p,v),function(N,k,j){return N.resumeToken.approximateByteSize()===0||k.snapshotVersion.toMicroseconds()-N.snapshotVersion.toMicroseconds()>=Fv?!0:j.addedDocuments.size+j.modifiedDocuments.size+j.removedDocuments.size>0}(g,v,f)&&c.push(t.li.updateTargetData(i,v))});let u=tt(),l=H();if(e.documentUpdates.forEach(f=>{e.resolvedLimboDocuments.has(f)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(i,f))}),c.push($v(i,o,e.documentUpdates).next(f=>{u=f.Bs,l=f.Ls})),!r.isEqual($.min())){const f=t.li.getLastRemoteSnapshotVersion(i).next(p=>t.li.setTargetsMetadata(i,i.currentSequenceNumber,r));c.push(f)}return A.waitFor(c).next(()=>o.apply(i)).next(()=>t.localDocuments.getLocalViewOfDocuments(i,u,l)).next(()=>u)}).then(i=>(t.vs=s,i))}function $v(n,e,t){let r=H(),s=H();return t.forEach(i=>r=r.add(i)),e.getEntries(n,r).next(i=>{let o=tt();return t.forEach((c,u)=>{const l=i.get(c);u.isFoundDocument()!==l.isFoundDocument()&&(s=s.add(c)),u.isNoDocument()&&u.version.isEqual($.min())?(e.removeEntry(c,u.readTime),o=o.insert(c,u)):!l.isValidDocument()||u.version.compareTo(l.version)>0||u.version.compareTo(l.version)===0&&l.hasPendingWrites?(e.addEntry(u),o=o.insert(c,u)):D(il,"Ignoring outdated watch update for ",c,". Current version:",l.version," Watch version:",u.version)}),{Bs:o,Ls:s}})}function jv(n,e){const t=F(n);return t.persistence.runTransaction("Get next mutation batch","readonly",r=>(e===void 0&&(e=$n),t.mutationQueue.getNextMutationBatchAfterBatchId(r,e)))}function jo(n,e){const t=F(n);return t.persistence.runTransaction("Allocate target","readwrite",r=>{let s;return t.li.getTargetData(r,e).next(i=>i?(s=i,A.resolve(s)):t.li.allocateTargetId(r).next(o=>(s=new Vt(e,o,"TargetPurposeListen",r.currentSequenceNumber),t.li.addTargetData(r,s).next(()=>s))))}).then(r=>{const s=t.vs.get(r.targetId);return(s===null||r.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(t.vs=t.vs.insert(r.targetId,r),t.Fs.set(e,r.targetId)),r})}async function Hr(n,e,t){const r=F(n),s=r.vs.get(e),i=t?"readwrite":"readwrite-primary";try{t||await r.persistence.runTransaction("Release target",i,o=>r.persistence.referenceDelegate.removeTarget(o,s))}catch(o){if(!vn(o))throw o;D(il,`Failed to update sequence numbers for target ${e}: ${o}`)}r.vs=r.vs.remove(e),r.Fs.delete(s.target)}function mu(n,e,t){const r=F(n);let s=$.min(),i=H();return r.persistence.runTransaction("Execute query","readwrite",o=>function(u,l,f){const p=F(u),g=p.Fs.get(f);return g!==void 0?A.resolve(p.vs.get(g)):p.li.getTargetData(l,f)}(r,o,rt(e)).next(c=>{if(c)return s=c.lastLimboFreeSnapshotVersion,r.li.getMatchingKeysForTargetId(o,c.targetId).next(u=>{i=u})}).next(()=>r.Cs.getDocumentsMatchingQuery(o,e,t?s:$.min(),t?i:H())).next(c=>(qg(r,Gm(e),c),{documents:c,ks:i})))}function Ug(n,e){const t=F(n),r=F(t.li),s=t.vs.get(e);return s?Promise.resolve(s.target):t.persistence.runTransaction("Get target data","readonly",i=>r.At(i,e).next(o=>o?o.target:null))}function Bg(n,e){const t=F(n),r=t.Ms.get(e)||$.min();return t.persistence.runTransaction("Get new document changes","readonly",s=>t.xs.getAllFromCollectionGroup(s,e,cm(r,Lr),Number.MAX_SAFE_INTEGER)).then(s=>(qg(t,e,s),s))}function qg(n,e,t){let r=n.Ms.get(e)||$.min();t.forEach((s,i)=>{i.readTime.compareTo(r)>0&&(r=i.readTime)}),n.Ms.set(e,r)}/**
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
 */const $g="firestore_clients";function Rf(n,e){return`${$g}_${n}_${e}`}const jg="firestore_mutations";function bf(n,e,t){let r=`${jg}_${n}_${t}`;return e.isAuthenticated()&&(r+=`_${e.uid}`),r}const Gg="firestore_targets";function bc(n,e){return`${Gg}_${n}_${e}`}/**
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
 */const Tt="SharedClientState";class Go{constructor(e,t,r,s){this.user=e,this.batchId=t,this.state=r,this.error=s}static $s(e,t,r){const s=JSON.parse(r);let i,o=typeof s=="object"&&["pending","acknowledged","rejected"].indexOf(s.state)!==-1&&(s.error===void 0||typeof s.error=="object");return o&&s.error&&(o=typeof s.error.message=="string"&&typeof s.error.code=="string",o&&(i=new V(s.error.code,s.error.message))),o?new Go(e,t,s.state,i):(Ie(Tt,`Failed to parse mutation state for ID '${t}': ${r}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Qs{constructor(e,t,r){this.targetId=e,this.state=t,this.error=r}static $s(e,t){const r=JSON.parse(t);let s,i=typeof r=="object"&&["not-current","current","rejected"].indexOf(r.state)!==-1&&(r.error===void 0||typeof r.error=="object");return i&&r.error&&(i=typeof r.error.message=="string"&&typeof r.error.code=="string",i&&(s=new V(r.error.code,r.error.message))),i?new Qs(e,r.state,s):(Ie(Tt,`Failed to parse target state for ID '${e}': ${t}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class zo{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static $s(e,t){const r=JSON.parse(t);let s=typeof r=="object"&&r.activeTargetIds instanceof Array,i=Gu();for(let o=0;s&&o<r.activeTargetIds.length;++o)s=fm(r.activeTargetIds[o]),i=i.add(r.activeTargetIds[o]);return s?new zo(e,i):(Ie(Tt,`Failed to parse client data for instance '${e}': ${t}`),null)}}class ol{constructor(e,t){this.clientId=e,this.onlineState=t}static $s(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new ol(t.clientId,t.onlineState):(Ie(Tt,`Failed to parse online state: ${e}`),null)}}class gu{constructor(){this.activeTargetIds=Gu()}Qs(e){this.activeTargetIds=this.activeTargetIds.add(e)}Gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Ws(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Sc{constructor(e,t,r,s,i){this.window=e,this.Ci=t,this.persistenceKey=r,this.zs=s,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.js=this.Hs.bind(this),this.Js=new ae(z),this.started=!1,this.Zs=[];const o=r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=i,this.Xs=Rf(this.persistenceKey,this.zs),this.Ys=function(u){return`firestore_sequence_number_${u}`}(this.persistenceKey),this.Js=this.Js.insert(this.zs,new gu),this.eo=new RegExp(`^${$g}_${o}_([^_]*)$`),this.no=new RegExp(`^${jg}_${o}_(\\d+)(?:_(.*))?$`),this.ro=new RegExp(`^${Gg}_${o}_(\\d+)$`),this.io=function(u){return`firestore_online_state_${u}`}(this.persistenceKey),this.so=function(u){return`firestore_bundle_loaded_v2_${u}`}(this.persistenceKey),this.window.addEventListener("storage",this.js)}static v(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.hs();for(const r of e){if(r===this.zs)continue;const s=this.getItem(Rf(this.persistenceKey,r));if(s){const i=zo.$s(r,s);i&&(this.Js=this.Js.insert(i.clientId,i))}}this.oo();const t=this.storage.getItem(this.io);if(t){const r=this._o(t);r&&this.ao(r)}for(const r of this.Zs)this.Hs(r);this.Zs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.Ys,JSON.stringify(e))}getAllActiveQueryTargets(){return this.uo(this.Js)}isActiveQueryTarget(e){let t=!1;return this.Js.forEach((r,s)=>{s.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.co(e,"pending")}updateMutationState(e,t,r){this.co(e,t,r),this.lo(e)}addLocalQueryTarget(e,t=!0){let r="not-current";if(this.isActiveQueryTarget(e)){const s=this.storage.getItem(bc(this.persistenceKey,e));if(s){const i=Qs.$s(e,s);i&&(r=i.state)}}return t&&this.ho.Qs(e),this.oo(),r}removeLocalQueryTarget(e){this.ho.Gs(e),this.oo()}isLocalQueryTarget(e){return this.ho.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(bc(this.persistenceKey,e))}updateQueryState(e,t,r){this.Po(e,t,r)}handleUserChange(e,t,r){t.forEach(s=>{this.lo(s)}),this.currentUser=e,r.forEach(s=>{this.addPendingMutation(s)})}setOnlineState(e){this.To(e)}notifyBundleLoaded(e){this.Io(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.js),this.removeItem(this.Xs),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return D(Tt,"READ",e,t),t}setItem(e,t){D(Tt,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){D(Tt,"REMOVE",e),this.storage.removeItem(e)}Hs(e){const t=e;if(t.storageArea===this.storage){if(D(Tt,"EVENT",t.key,t.newValue),t.key===this.Xs)return void Ie("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Ci.enqueueRetryable(async()=>{if(this.started){if(t.key!==null){if(this.eo.test(t.key)){if(t.newValue==null){const r=this.Eo(t.key);return this.Ro(r,null)}{const r=this.Ao(t.key,t.newValue);if(r)return this.Ro(r.clientId,r)}}else if(this.no.test(t.key)){if(t.newValue!==null){const r=this.Vo(t.key,t.newValue);if(r)return this.mo(r)}}else if(this.ro.test(t.key)){if(t.newValue!==null){const r=this.fo(t.key,t.newValue);if(r)return this.po(r)}}else if(t.key===this.io){if(t.newValue!==null){const r=this._o(t.newValue);if(r)return this.ao(r)}}else if(t.key===this.Ys){const r=function(i){let o=He.ce;if(i!=null)try{const c=JSON.parse(i);U(typeof c=="number",30636,{yo:i}),o=c}catch(c){Ie(Tt,"Failed to read sequence number from WebStorage",c)}return o}(t.newValue);r!==He.ce&&this.sequenceNumberHandler(r)}else if(t.key===this.so){const r=this.wo(t.newValue);await Promise.all(r.map(s=>this.syncEngine.bo(s)))}}}else this.Zs.push(t)})}}get ho(){return this.Js.get(this.zs)}oo(){this.setItem(this.Xs,this.ho.Ws())}co(e,t,r){const s=new Go(this.currentUser,e,t,r),i=bf(this.persistenceKey,this.currentUser,e);this.setItem(i,s.Ws())}lo(e){const t=bf(this.persistenceKey,this.currentUser,e);this.removeItem(t)}To(e){const t={clientId:this.zs,onlineState:e};this.storage.setItem(this.io,JSON.stringify(t))}Po(e,t,r){const s=bc(this.persistenceKey,e),i=new Qs(e,t,r);this.setItem(s,i.Ws())}Io(e){const t=JSON.stringify(Array.from(e));this.setItem(this.so,t)}Eo(e){const t=this.eo.exec(e);return t?t[1]:null}Ao(e,t){const r=this.Eo(e);return zo.$s(r,t)}Vo(e,t){const r=this.no.exec(e),s=Number(r[1]),i=r[2]!==void 0?r[2]:null;return Go.$s(new Be(i),s,t)}fo(e,t){const r=this.ro.exec(e),s=Number(r[1]);return Qs.$s(s,t)}_o(e){return ol.$s(e)}wo(e){return JSON.parse(e)}async mo(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.So(e.batchId,e.state,e.error);D(Tt,`Ignoring mutation for non-active user ${e.user.uid}`)}po(e){return this.syncEngine.Do(e.targetId,e.state,e.error)}Ro(e,t){const r=t?this.Js.insert(e,t):this.Js.remove(e),s=this.uo(this.Js),i=this.uo(r),o=[],c=[];return i.forEach(u=>{s.has(u)||o.push(u)}),s.forEach(u=>{i.has(u)||c.push(u)}),this.syncEngine.Co(o,c).then(()=>{this.Js=r})}ao(e){this.Js.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}uo(e){let t=Gu();return e.forEach((r,s)=>{t=t.unionWith(s.activeTargetIds)}),t}}class zg{constructor(){this.vo=new gu,this.Fo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,r){}addLocalQueryTarget(e,t=!0){return t&&this.vo.Qs(e),this.Fo[e]||"not-current"}updateQueryState(e,t,r){this.Fo[e]=t}removeLocalQueryTarget(e){this.vo.Gs(e)}isLocalQueryTarget(e){return this.vo.activeTargetIds.has(e)}clearQueryState(e){delete this.Fo[e]}getAllActiveQueryTargets(){return this.vo.activeTargetIds}isActiveQueryTarget(e){return this.vo.activeTargetIds.has(e)}start(){return this.vo=new gu,Promise.resolve()}handleUserChange(e,t,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class Gv{Mo(e){}shutdown(){}}/**
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
 */const Sf="ConnectivityMonitor";class Pf{constructor(){this.xo=()=>this.Oo(),this.No=()=>this.Bo(),this.Lo=[],this.ko()}Mo(e){this.Lo.push(e)}shutdown(){window.removeEventListener("online",this.xo),window.removeEventListener("offline",this.No)}ko(){window.addEventListener("online",this.xo),window.addEventListener("offline",this.No)}Oo(){D(Sf,"Network connectivity changed: AVAILABLE");for(const e of this.Lo)e(0)}Bo(){D(Sf,"Network connectivity changed: UNAVAILABLE");for(const e of this.Lo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let ao=null;function _u(){return ao===null?ao=function(){return 268435456+Math.round(2147483648*Math.random())}():ao++,"0x"+ao.toString(16)}/**
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
 */const Pc="RestConnection",zv={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery",ExecutePipeline:"executePipeline"};class Wv{get Ko(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",r=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.qo=t+"://"+e.host,this.Uo=`projects/${r}/databases/${s}`,this.$o=this.databaseId.database===xo?`project_id=${r}`:`project_id=${r}&database_id=${s}`}Wo(e,t,r,s,i){const o=_u(),c=this.Qo(e,t.toUriEncodedString());D(Pc,`Sending RPC '${e}' ${o}:`,c,r);const u={"google-cloud-resource-prefix":this.Uo,"x-goog-request-params":this.$o};this.Go(u,s,i);const{host:l}=new URL(c),f=kt(l);return this.zo(e,c,u,r,f).then(p=>(D(Pc,`Received RPC '${e}' ${o}: `,p),p),p=>{throw ni(Pc,`RPC '${e}' ${o} failed with error: `,p,"url: ",c,"request:",r),p})}jo(e,t,r,s,i,o){return this.Wo(e,t,r,s,i)}Go(e,t,r){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+es}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((s,i)=>e[i]=s),r&&r.headers.forEach((s,i)=>e[i]=s)}Qo(e,t){const r=zv[e];let s=`${this.qo}/v1/${t}:${r}`;return this.databaseInfo.apiKey&&(s=`${s}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`),s}terminate(){}}/**
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
 */class Kv{constructor(e){this.Ho=e.Ho,this.Jo=e.Jo}Zo(e){this.Xo=e}Yo(e){this.e_=e}t_(e){this.n_=e}onMessage(e){this.r_=e}close(){this.Jo()}send(e){this.Ho(e)}i_(){this.Xo()}s_(){this.e_()}o_(e){this.n_(e)}__(e){this.r_(e)}}/**
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
 */const Ue="WebChannelConnection",ks=(n,e,t)=>{n.listen(e,r=>{try{t(r)}catch(s){setTimeout(()=>{throw s},0)}})};class Pr extends Wv{constructor(e){super(e),this.a_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}static u_(){if(!Pr.c_){const e=nm();ks(e,tm.STAT_EVENT,t=>{t.stat===Hc.PROXY?D(Ue,"STAT_EVENT: detected buffering proxy"):t.stat===Hc.NOPROXY&&D(Ue,"STAT_EVENT: detected no buffering proxy")}),Pr.c_=!0}}zo(e,t,r,s,i){const o=_u();return new Promise((c,u)=>{const l=new Zp;l.setWithCredentials(!0),l.listenOnce(em.COMPLETE,()=>{try{switch(l.getLastErrorCode()){case fo.NO_ERROR:const p=l.getResponseJson();D(Ue,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(p)),c(p);break;case fo.TIMEOUT:D(Ue,`RPC '${e}' ${o} timed out`),u(new V(S.DEADLINE_EXCEEDED,"Request time out"));break;case fo.HTTP_ERROR:const g=l.getStatus();if(D(Ue,`RPC '${e}' ${o} failed with status:`,g,"response text:",l.getResponseText()),g>0){let v=l.getResponseJson();Array.isArray(v)&&(v=v[0]);const C=v==null?void 0:v.error;if(C&&C.status&&C.message){const N=function(j){const q=j.toLowerCase().replace(/_/g,"-");return Object.values(S).indexOf(q)>=0?q:S.UNKNOWN}(C.status);u(new V(N,C.message))}else u(new V(S.UNKNOWN,"Server responded with status "+l.getStatus()))}else u(new V(S.UNAVAILABLE,"Connection failed."));break;default:M(9055,{l_:e,streamId:o,h_:l.getLastErrorCode(),P_:l.getLastError()})}}finally{D(Ue,`RPC '${e}' ${o} completed.`)}});const f=JSON.stringify(s);D(Ue,`RPC '${e}' ${o} sending request:`,s),l.send(t,"POST",f,r,15)})}T_(e,t,r){const s=_u(),i=[this.qo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=this.createWebChannelTransport(),c={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(c.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(c.useFetchStreams=!0),this.Go(c.initMessageHeaders,t,r),c.encodeInitMessageHeaders=!0;const l=i.join("");D(Ue,`Creating RPC '${e}' stream ${s}: ${l}`,c);const f=o.createWebChannel(l,c);this.I_(f);let p=!1,g=!1;const v=new Kv({Ho:C=>{g?D(Ue,`Not sending because RPC '${e}' stream ${s} is closed:`,C):(p||(D(Ue,`Opening RPC '${e}' stream ${s} transport.`),f.open(),p=!0),D(Ue,`RPC '${e}' stream ${s} sending:`,C),f.send(C))},Jo:()=>f.close()});return ks(f,xs.EventType.OPEN,()=>{g||(D(Ue,`RPC '${e}' stream ${s} transport opened.`),v.i_())}),ks(f,xs.EventType.CLOSE,()=>{g||(g=!0,D(Ue,`RPC '${e}' stream ${s} transport closed`),v.o_(),this.E_(f))}),ks(f,xs.EventType.ERROR,C=>{g||(g=!0,ni(Ue,`RPC '${e}' stream ${s} transport errored. Name:`,C.name,"Message:",C.message),v.o_(new V(S.UNAVAILABLE,"The operation could not be completed")))}),ks(f,xs.EventType.MESSAGE,C=>{var N;if(!g){const k=C.data[0];U(!!k,16349);const j=k,q=(j==null?void 0:j.error)||((N=j[0])==null?void 0:N.error);if(q){D(Ue,`RPC '${e}' stream ${s} received error:`,q);const B=q.status;let W=function(w){const _=Ee[w];if(_!==void 0)return ig(_)}(B),Q=q.message;W===void 0&&(W=S.INTERNAL,Q="Unknown error status: "+B+" with message "+q.message),g=!0,v.o_(new V(W,Q)),f.close()}else D(Ue,`RPC '${e}' stream ${s} received:`,k),v.__(k)}}),Pr.u_(),setTimeout(()=>{v.s_()},0),v}terminate(){this.a_.forEach(e=>e.close()),this.a_=[]}I_(e){this.a_.push(e)}E_(e){this.a_=this.a_.filter(t=>t===e)}Go(e,t,r){super.Go(e,t,r),this.databaseInfo.apiKey&&(e["x-goog-api-key"]=this.databaseInfo.apiKey)}createWebChannelTransport(){return rm()}}/**
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
 */function Hv(n){return new Pr(n)}/**
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
 */function Wg(){return typeof window<"u"?window:null}function vo(){return typeof document<"u"?document:null}/**
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
 */function Ea(n){return new XT(n,!0)}/**
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
 */Pr.c_=!1;class al{constructor(e,t,r=1e3,s=1.5,i=6e4){this.Ci=e,this.timerId=t,this.R_=r,this.A_=s,this.V_=i,this.d_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.d_=0}g_(){this.d_=this.V_}p_(e){this.cancel();const t=Math.floor(this.d_+this.y_()),r=Math.max(0,Date.now()-this.f_),s=Math.max(0,t-r);s>0&&D("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.d_} ms, delay with jitter: ${t} ms, last attempt: ${r} ms ago)`),this.m_=this.Ci.enqueueAfterDelay(this.timerId,s,()=>(this.f_=Date.now(),e())),this.d_*=this.A_,this.d_<this.R_&&(this.d_=this.R_),this.d_>this.V_&&(this.d_=this.V_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.d_}}/**
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
 */const Cf="PersistentStream";class Kg{constructor(e,t,r,s,i,o,c,u){this.Ci=e,this.b_=r,this.S_=s,this.connection=i,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=c,this.listener=u,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new al(e,t)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Ci.enqueueAfterDelay(this.b_,6e4,()=>this.k_()))}K_(e){this.q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===S.RESOURCE_EXHAUSTED?(Ie(t.toString()),Ie("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===S.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.W_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.t_(t)}W_(){}auth(){this.state=1;const e=this.Q_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([r,s])=>{this.D_===t&&this.G_(r,s)},r=>{e(()=>{const s=new V(S.UNKNOWN,"Fetching auth token failed: "+r.message);return this.z_(s)})})}G_(e,t){const r=this.Q_(this.D_);this.stream=this.j_(e,t),this.stream.Zo(()=>{r(()=>this.listener.Zo())}),this.stream.Yo(()=>{r(()=>(this.state=2,this.v_=this.Ci.enqueueAfterDelay(this.S_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.Yo()))}),this.stream.t_(s=>{r(()=>this.z_(s))}),this.stream.onMessage(s=>{r(()=>++this.F_==1?this.H_(s):this.onNext(s))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return D(Cf,`close with error: ${e}`),this.stream=null,this.close(4,e)}Q_(e){return t=>{this.Ci.enqueueAndForget(()=>this.D_===e?t():(D(Cf,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class Qv extends Kg{constructor(e,t,r,s,i,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,r,s,o),this.serializer=i}j_(e,t){return this.connection.T_("Listen",e,t)}H_(e){return this.onNext(e)}onNext(e){this.M_.reset();const t=nv(this.serializer,e),r=function(i){if(!("targetChange"in i))return $.min();const o=i.targetChange;return o.targetIds&&o.targetIds.length?$.min():o.readTime?Oe(o.readTime):$.min()}(e);return this.listener.J_(t,r)}Z_(e){const t={};t.database=lu(this.serializer),t.addTarget=function(i,o){let c;const u=o.target;if(c=Lo(u)?{documents:fg(i,u)}:{query:Xu(i,u).ft},c.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){c.resumeToken=cg(i,o.resumeToken);const l=cu(i,o.expectedCount);l!==null&&(c.expectedCount=l)}else if(o.snapshotVersion.compareTo($.min())>0){c.readTime=Kr(i,o.snapshotVersion.toTimestamp());const l=cu(i,o.expectedCount);l!==null&&(c.expectedCount=l)}return c}(this.serializer,e);const r=iv(this.serializer,e);r&&(t.labels=r),this.K_(t)}X_(e){const t={};t.database=lu(this.serializer),t.removeTarget=e,this.K_(t)}}class Jv extends Kg{constructor(e,t,r,s,i,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,r,s,o),this.serializer=i}get Y_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}W_(){this.Y_&&this.ea([])}j_(e,t){return this.connection.T_("Write",e,t)}H_(e){return U(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,U(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){U(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const t=rv(e.writeResults,e.commitTime),r=Oe(e.commitTime);return this.listener.na(r,t)}ra(){const e={};e.database=lu(this.serializer),this.K_(e)}ea(e){const t={streamToken:this.lastStreamToken,writes:e.map(r=>pi(this.serializer,r))};this.K_(t)}}/**
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
 */class Yv{}class Xv extends Yv{constructor(e,t,r,s){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=r,this.serializer=s,this.ia=!1}sa(){if(this.ia)throw new V(S.FAILED_PRECONDITION,"The client has already been terminated.")}Wo(e,t,r,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([i,o])=>this.connection.Wo(e,uu(t,r),s,i,o)).catch(i=>{throw i.name==="FirebaseError"?(i.code===S.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),i):new V(S.UNKNOWN,i.toString())})}jo(e,t,r,s,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,c])=>this.connection.jo(e,uu(t,r),s,o,c,i)).catch(o=>{throw o.name==="FirebaseError"?(o.code===S.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new V(S.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}function Zv(n,e,t,r){return new Xv(n,e,t,r)}class eA{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const t=`Could not reach Cloud Firestore backend. ${e}
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
 */const er="RemoteStore";class tA{constructor(e,t,r,s,i){this.localStore=e,this.datastore=t,this.asyncQueue=r,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.Ra=[],this.Aa=i,this.Aa.Mo(o=>{r.enqueueAndForget(async()=>{lr(this)&&(D(er,"Restarting streams for network reachability change."),await async function(u){const l=F(u);l.Ea.add(4),await Di(l),l.Va.set("Unknown"),l.Ea.delete(4),await Ta(l)}(this))})}),this.Va=new eA(r,s)}}async function Ta(n){if(lr(n))for(const e of n.Ra)await e(!0)}async function Di(n){for(const e of n.Ra)await e(!1)}function va(n,e){const t=F(n);t.Ia.has(e.targetId)||(t.Ia.set(e.targetId,e),ll(t)?ul(t):ss(t).O_()&&cl(t,e))}function Qr(n,e){const t=F(n),r=ss(t);t.Ia.delete(e),r.O_()&&Hg(t,e),t.Ia.size===0&&(r.O_()?r.L_():lr(t)&&t.Va.set("Unknown"))}function cl(n,e){if(n.da.$e(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo($.min())>0){const t=n.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}ss(n).Z_(e)}function Hg(n,e){n.da.$e(e),ss(n).X_(e)}function ul(n){n.da=new HT({getRemoteKeysForTarget:e=>n.remoteSyncer.getRemoteKeysForTarget(e),At:e=>n.Ia.get(e)||null,ht:()=>n.datastore.serializer.databaseId}),ss(n).start(),n.Va.ua()}function ll(n){return lr(n)&&!ss(n).x_()&&n.Ia.size>0}function lr(n){return F(n).Ea.size===0}function Qg(n){n.da=void 0}async function nA(n){n.Va.set("Online")}async function rA(n){n.Ia.forEach((e,t)=>{cl(n,e)})}async function sA(n,e){Qg(n),ll(n)?(n.Va.ha(e),ul(n)):n.Va.set("Unknown")}async function iA(n,e,t){if(n.Va.set("Online"),e instanceof ag&&e.state===2&&e.cause)try{await async function(s,i){const o=i.cause;for(const c of i.targetIds)s.Ia.has(c)&&(await s.remoteSyncer.rejectListen(c,o),s.Ia.delete(c),s.da.removeTarget(c))}(n,e)}catch(r){D(er,"Failed to remove targets %s: %s ",e.targetIds.join(","),r),await Wo(n,r)}else if(e instanceof Eo?n.da.Xe(e):e instanceof og?n.da.st(e):n.da.tt(e),!t.isEqual($.min()))try{const r=await Fg(n.localStore);t.compareTo(r)>=0&&await function(i,o){const c=i.da.Tt(o);return c.targetChanges.forEach((u,l)=>{if(u.resumeToken.approximateByteSize()>0){const f=i.Ia.get(l);f&&i.Ia.set(l,f.withResumeToken(u.resumeToken,o))}}),c.targetMismatches.forEach((u,l)=>{const f=i.Ia.get(u);if(!f)return;i.Ia.set(u,f.withResumeToken(we.EMPTY_BYTE_STRING,f.snapshotVersion)),Hg(i,u);const p=new Vt(f.target,u,l,f.sequenceNumber);cl(i,p)}),i.remoteSyncer.applyRemoteEvent(c)}(n,t)}catch(r){D(er,"Failed to raise snapshot:",r),await Wo(n,r)}}async function Wo(n,e,t){if(!vn(e))throw e;n.Ea.add(1),await Di(n),n.Va.set("Offline"),t||(t=()=>Fg(n.localStore)),n.asyncQueue.enqueueRetryable(async()=>{D(er,"Retrying IndexedDB access"),await t(),n.Ea.delete(1),await Ta(n)})}function Jg(n,e){return e().catch(t=>Wo(n,t,e))}async function rs(n){const e=F(n),t=In(e);let r=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:$n;for(;oA(e);)try{const s=await jv(e.localStore,r);if(s===null){e.Ta.length===0&&t.L_();break}r=s.batchId,aA(e,s)}catch(s){await Wo(e,s)}Yg(e)&&Xg(e)}function oA(n){return lr(n)&&n.Ta.length<10}function aA(n,e){n.Ta.push(e);const t=In(n);t.O_()&&t.Y_&&t.ea(e.mutations)}function Yg(n){return lr(n)&&!In(n).x_()&&n.Ta.length>0}function Xg(n){In(n).start()}async function cA(n){In(n).ra()}async function uA(n){const e=In(n);for(const t of n.Ta)e.ea(t.mutations)}async function lA(n,e,t){const r=n.Ta.shift(),s=Hu.from(r,e,t);await Jg(n,()=>n.remoteSyncer.applySuccessfulWrite(s)),await rs(n)}async function hA(n,e){e&&In(n).Y_&&await async function(r,s){if(function(o){return sg(o)&&o!==S.ABORTED}(s.code)){const i=r.Ta.shift();In(r).B_(),await Jg(r,()=>r.remoteSyncer.rejectFailedWrite(i.batchId,s)),await rs(r)}}(n,e),Yg(n)&&Xg(n)}async function kf(n,e){const t=F(n);t.asyncQueue.verifyOperationInProgress(),D(er,"RemoteStore received new credentials");const r=lr(t);t.Ea.add(3),await Di(t),r&&t.Va.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ea.delete(3),await Ta(t)}async function yu(n,e){const t=F(n);e?(t.Ea.delete(2),await Ta(t)):e||(t.Ea.add(2),await Di(t),t.Va.set("Unknown"))}function ss(n){return n.ma||(n.ma=function(t,r,s){const i=F(t);return i.sa(),new Qv(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(n.datastore,n.asyncQueue,{Zo:nA.bind(null,n),Yo:rA.bind(null,n),t_:sA.bind(null,n),J_:iA.bind(null,n)}),n.Ra.push(async e=>{e?(n.ma.B_(),ll(n)?ul(n):n.Va.set("Unknown")):(await n.ma.stop(),Qg(n))})),n.ma}function In(n){return n.fa||(n.fa=function(t,r,s){const i=F(t);return i.sa(),new Jv(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(n.datastore,n.asyncQueue,{Zo:()=>Promise.resolve(),Yo:cA.bind(null,n),t_:hA.bind(null,n),ta:uA.bind(null,n),na:lA.bind(null,n)}),n.Ra.push(async e=>{e?(n.fa.B_(),await rs(n)):(await n.fa.stop(),n.Ta.length>0&&(D(er,`Stopping write stream with ${n.Ta.length} pending writes`),n.Ta=[]))})),n.fa}/**
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
 */class hl{constructor(e,t,r,s,i){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=r,this.op=s,this.removalCallback=i,this.deferred=new dt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,r,s,i){const o=Date.now()+r,c=new hl(e,t,o,s,i);return c.start(r),c}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new V(S.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function dl(n,e){if(Ie("AsyncQueue",`${e}: ${n}`),vn(n))return new V(S.UNAVAILABLE,`${e}: ${n}`);throw n}/**
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
 */class Cr{static emptySet(e){return new Cr(e.comparator)}constructor(e){this.comparator=e?(t,r)=>e(t,r)||x.comparator(t.key,r.key):(t,r)=>x.comparator(t.key,r.key),this.keyedMap=Ls(),this.sortedSet=new ae(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,r)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof Cr)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=r.getNext().key;if(!s.isEqual(i))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const r=new Cr;return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=t,r}}/**
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
 */class Nf{constructor(){this.ga=new ae(x.comparator)}track(e){const t=e.doc.key,r=this.ga.get(t);r?e.type!==0&&r.type===3?this.ga=this.ga.insert(t,e):e.type===3&&r.type!==1?this.ga=this.ga.insert(t,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.ga=this.ga.insert(t,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.ga=this.ga.remove(t):e.type===1&&r.type===2?this.ga=this.ga.insert(t,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):M(63341,{Vt:e,pa:r}):this.ga=this.ga.insert(t,e)}ya(){const e=[];return this.ga.inorderTraversal((t,r)=>{e.push(r)}),e}}class Jr{constructor(e,t,r,s,i,o,c,u,l){this.query=e,this.docs=t,this.oldDocs=r,this.docChanges=s,this.mutatedKeys=i,this.fromCache=o,this.syncStateChanged=c,this.excludesMetadataChanges=u,this.hasCachedResults=l}static fromInitialDocuments(e,t,r,s,i){const o=[];return t.forEach(c=>{o.push({type:0,doc:c})}),new Jr(e,t,Cr.emptySet(t),o,r,s,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&ma(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,r=e.docChanges;if(t.length!==r.length)return!1;for(let s=0;s<t.length;s++)if(t[s].type!==r[s].type||!t[s].doc.isEqual(r[s].doc))return!1;return!0}}/**
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
 */class dA{constructor(){this.wa=void 0,this.ba=[]}Sa(){return this.ba.some(e=>e.Da())}}class fA{constructor(){this.queries=Df(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(t,r){const s=F(t),i=s.queries;s.queries=Df(),i.forEach((o,c)=>{for(const u of c.ba)u.onError(r)})})(this,new V(S.ABORTED,"Firestore shutting down"))}}function Df(){return new jt(n=>jm(n),ma)}async function fl(n,e){const t=F(n);let r=3;const s=e.query;let i=t.queries.get(s);i?!i.Sa()&&e.Da()&&(r=2):(i=new dA,r=e.Da()?0:1);try{switch(r){case 0:i.wa=await t.onListen(s,!0);break;case 1:i.wa=await t.onListen(s,!1);break;case 2:await t.onFirstRemoteStoreListen(s)}}catch(o){const c=dl(o,`Initialization of query '${Tr(e.query)}' failed`);return void e.onError(c)}t.queries.set(s,i),i.ba.push(e),e.va(t.onlineState),i.wa&&e.Fa(i.wa)&&ml(t)}async function pl(n,e){const t=F(n),r=e.query;let s=3;const i=t.queries.get(r);if(i){const o=i.ba.indexOf(e);o>=0&&(i.ba.splice(o,1),i.ba.length===0?s=e.Da()?0:1:!i.Sa()&&e.Da()&&(s=2))}switch(s){case 0:return t.queries.delete(r),t.onUnlisten(r,!0);case 1:return t.queries.delete(r),t.onUnlisten(r,!1);case 2:return t.onLastRemoteStoreUnlisten(r);default:return}}function pA(n,e){const t=F(n);let r=!1;for(const s of e){const i=s.query,o=t.queries.get(i);if(o){for(const c of o.ba)c.Fa(s)&&(r=!0);o.wa=s}}r&&ml(t)}function mA(n,e,t){const r=F(n),s=r.queries.get(e);if(s)for(const i of s.ba)i.onError(t);r.queries.delete(e)}function ml(n){n.Ca.forEach(e=>{e.next()})}var Iu,Vf;(Vf=Iu||(Iu={})).Ma="default",Vf.Cache="cache";class gl{constructor(e,t,r){this.query=e,this.xa=t,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=r||{}}Fa(e){if(!this.options.includeMetadataChanges){const r=[];for(const s of e.docChanges)s.type!==3&&r.push(s);e=new Jr(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Oa?this.Ba(e)&&(this.xa.next(e),t=!0):this.La(e,this.onlineState)&&(this.ka(e),t=!0),this.Na=e,t}onError(e){this.xa.error(e)}va(e){this.onlineState=e;let t=!1;return this.Na&&!this.Oa&&this.La(this.Na,e)&&(this.ka(this.Na),t=!0),t}La(e,t){if(!e.fromCache||!this.Da())return!0;const r=t!=="Offline";return(!this.options.Ka||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Ba(e){if(e.docChanges.length>0)return!0;const t=this.Na&&this.Na.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}ka(e){e=Jr.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Oa=!0,this.xa.next(e)}Da(){return this.options.source!==Iu.Cache}}/**
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
 */class Zg{constructor(e){this.key=e}}class e_{constructor(e){this.key=e}}class gA{constructor(e,t){this.query=e,this.Za=t,this.Xa=null,this.hasCachedResults=!1,this.current=!1,this.Ya=H(),this.mutatedKeys=H(),this.eu=zm(e),this.tu=new Cr(this.eu)}get nu(){return this.Za}ru(e,t){const r=t?t.iu:new Nf,s=t?t.tu:this.tu;let i=t?t.mutatedKeys:this.mutatedKeys,o=s,c=!1;const u=this.query.limitType==="F"&&s.size===this.query.limit?s.last():null,l=this.query.limitType==="L"&&s.size===this.query.limit?s.first():null;if(e.inorderTraversal((f,p)=>{const g=s.get(f),v=Ci(this.query,p)?p:null,C=!!g&&this.mutatedKeys.has(g.key),N=!!v&&(v.hasLocalMutations||this.mutatedKeys.has(v.key)&&v.hasCommittedMutations);let k=!1;g&&v?g.data.isEqual(v.data)?C!==N&&(r.track({type:3,doc:v}),k=!0):this.su(g,v)||(r.track({type:2,doc:v}),k=!0,(u&&this.eu(v,u)>0||l&&this.eu(v,l)<0)&&(c=!0)):!g&&v?(r.track({type:0,doc:v}),k=!0):g&&!v&&(r.track({type:1,doc:g}),k=!0,(u||l)&&(c=!0)),k&&(v?(o=o.add(v),i=N?i.add(f):i.delete(f)):(o=o.delete(f),i=i.delete(f)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const f=this.query.limitType==="F"?o.last():o.first();o=o.delete(f.key),i=i.delete(f.key),r.track({type:1,doc:f})}return{tu:o,iu:r,Ss:c,mutatedKeys:i}}su(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,r,s){const i=this.tu;this.tu=e.tu,this.mutatedKeys=e.mutatedKeys;const o=e.iu.ya();o.sort((f,p)=>function(v,C){const N=k=>{switch(k){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return M(20277,{Vt:k})}};return N(v)-N(C)}(f.type,p.type)||this.eu(f.doc,p.doc)),this.ou(r),s=s??!1;const c=t&&!s?this._u():[],u=this.Ya.size===0&&this.current&&!s?1:0,l=u!==this.Xa;return this.Xa=u,o.length!==0||l?{snapshot:new Jr(this.query,e.tu,i,o,e.mutatedKeys,u===0,l,!1,!!r&&r.resumeToken.approximateByteSize()>0),au:c}:{au:c}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new Nf,mutatedKeys:this.mutatedKeys,Ss:!1},!1)):{au:[]}}uu(e){return!this.Za.has(e)&&!!this.tu.has(e)&&!this.tu.get(e).hasLocalMutations}ou(e){e&&(e.addedDocuments.forEach(t=>this.Za=this.Za.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.Za=this.Za.delete(t)),this.current=e.current)}_u(){if(!this.current)return[];const e=this.Ya;this.Ya=H(),this.tu.forEach(r=>{this.uu(r.key)&&(this.Ya=this.Ya.add(r.key))});const t=[];return e.forEach(r=>{this.Ya.has(r)||t.push(new e_(r))}),this.Ya.forEach(r=>{e.has(r)||t.push(new Zg(r))}),t}cu(e){this.Za=e.ks,this.Ya=H();const t=this.ru(e.documents);return this.applyChanges(t,!0)}lu(){return Jr.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Xa===0,this.hasCachedResults)}}const is="SyncEngine";class _A{constructor(e,t,r){this.query=e,this.targetId=t,this.view=r}}class yA{constructor(e){this.key=e,this.hu=!1}}class IA{constructor(e,t,r,s,i,o){this.localStore=e,this.remoteStore=t,this.eventManager=r,this.sharedClientState=s,this.currentUser=i,this.maxConcurrentLimboResolutions=o,this.Pu={},this.Tu=new jt(c=>jm(c),ma),this.Iu=new Map,this.Eu=new Set,this.Ru=new ae(x.comparator),this.Au=new Map,this.Vu=new tl,this.du={},this.mu=new Map,this.fu=Zn.ar(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function wA(n,e,t=!0){const r=Aa(n);let s;const i=r.Tu.get(e);return i?(r.sharedClientState.addLocalQueryTarget(i.targetId),s=i.view.lu()):s=await t_(r,e,t,!0),s}async function EA(n,e){const t=Aa(n);await t_(t,e,!0,!1)}async function t_(n,e,t,r){const s=await jo(n.localStore,rt(e)),i=s.targetId,o=n.sharedClientState.addLocalQueryTarget(i,t);let c;return r&&(c=await _l(n,e,i,o==="current",s.resumeToken)),n.isPrimaryClient&&t&&va(n.remoteStore,s),c}async function _l(n,e,t,r,s){n.pu=(p,g,v)=>async function(N,k,j,q){let B=k.view.ru(j);B.Ss&&(B=await mu(N.localStore,k.query,!1).then(({documents:w})=>k.view.ru(w,B)));const W=q&&q.targetChanges.get(k.targetId),Q=q&&q.targetMismatches.get(k.targetId)!=null,J=k.view.applyChanges(B,N.isPrimaryClient,W,Q);return wu(N,k.targetId,J.au),J.snapshot}(n,p,g,v);const i=await mu(n.localStore,e,!0),o=new gA(e,i.ks),c=o.ru(i.documents),u=Ni.createSynthesizedTargetChangeForCurrentChange(t,r&&n.onlineState!=="Offline",s),l=o.applyChanges(c,n.isPrimaryClient,u);wu(n,t,l.au);const f=new _A(e,t,o);return n.Tu.set(e,f),n.Iu.has(t)?n.Iu.get(t).push(e):n.Iu.set(t,[e]),l.snapshot}async function TA(n,e,t){const r=F(n),s=r.Tu.get(e),i=r.Iu.get(s.targetId);if(i.length>1)return r.Iu.set(s.targetId,i.filter(o=>!ma(o,e))),void r.Tu.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(s.targetId),r.sharedClientState.isActiveQueryTarget(s.targetId)||await Hr(r.localStore,s.targetId,!1).then(()=>{r.sharedClientState.clearQueryState(s.targetId),t&&Qr(r.remoteStore,s.targetId),Yr(r,s.targetId)}).catch(Tn)):(Yr(r,s.targetId),await Hr(r.localStore,s.targetId,!0))}async function vA(n,e){const t=F(n),r=t.Tu.get(e),s=t.Iu.get(r.targetId);t.isPrimaryClient&&s.length===1&&(t.sharedClientState.removeLocalQueryTarget(r.targetId),Qr(t.remoteStore,r.targetId))}async function AA(n,e,t){const r=El(n);try{const s=await function(o,c){const u=F(o),l=re.now(),f=c.reduce((v,C)=>v.add(C.key),H());let p,g;return u.persistence.runTransaction("Locally write mutations","readwrite",v=>{let C=tt(),N=H();return u.xs.getEntries(v,f).next(k=>{C=k,C.forEach((j,q)=>{q.isValidDocument()||(N=N.add(j))})}).next(()=>u.localDocuments.getOverlayedDocuments(v,C)).next(k=>{p=k;const j=[];for(const q of c){const B=jT(q,p.get(q.key).overlayedDocument);B!=null&&j.push(new Gt(q.key,B,Vm(B.value.mapValue),he.exists(!0)))}return u.mutationQueue.addMutationBatch(v,l,j,c)}).next(k=>{g=k;const j=k.applyToLocalDocumentSet(p,N);return u.documentOverlayCache.saveOverlays(v,k.batchId,j)})}).then(()=>({batchId:g.batchId,changes:Km(p)}))}(r.localStore,e);r.sharedClientState.addPendingMutation(s.batchId),function(o,c,u){let l=o.du[o.currentUser.toKey()];l||(l=new ae(z)),l=l.insert(c,u),o.du[o.currentUser.toKey()]=l}(r,s.batchId,t),await Rn(r,s.changes),await rs(r.remoteStore)}catch(s){const i=dl(s,"Failed to persist write");t.reject(i)}}async function n_(n,e){const t=F(n);try{const r=await qv(t.localStore,e);e.targetChanges.forEach((s,i)=>{const o=t.Au.get(i);o&&(U(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1,22616),s.addedDocuments.size>0?o.hu=!0:s.modifiedDocuments.size>0?U(o.hu,14607):s.removedDocuments.size>0&&(U(o.hu,42227),o.hu=!1))}),await Rn(t,r,e)}catch(r){await Tn(r)}}function Of(n,e,t){const r=F(n);if(r.isPrimaryClient&&t===0||!r.isPrimaryClient&&t===1){const s=[];r.Tu.forEach((i,o)=>{const c=o.view.va(e);c.snapshot&&s.push(c.snapshot)}),function(o,c){const u=F(o);u.onlineState=c;let l=!1;u.queries.forEach((f,p)=>{for(const g of p.ba)g.va(c)&&(l=!0)}),l&&ml(u)}(r.eventManager,e),s.length&&r.Pu.J_(s),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e)}}async function RA(n,e,t){const r=F(n);r.sharedClientState.updateQueryState(e,"rejected",t);const s=r.Au.get(e),i=s&&s.key;if(i){let o=new ae(x.comparator);o=o.insert(i,le.newNoDocument(i,$.min()));const c=H().add(i),u=new ki($.min(),new Map,new ae(z),o,c);await n_(r,u),r.Ru=r.Ru.remove(i),r.Au.delete(e),wl(r)}else await Hr(r.localStore,e,!1).then(()=>Yr(r,e,t)).catch(Tn)}async function bA(n,e){const t=F(n),r=e.batch.batchId;try{const s=await Bv(t.localStore,e);Il(t,r,null),yl(t,r),t.sharedClientState.updateMutationState(r,"acknowledged"),await Rn(t,s)}catch(s){await Tn(s)}}async function SA(n,e,t){const r=F(n);try{const s=await function(o,c){const u=F(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",l=>{let f;return u.mutationQueue.lookupMutationBatch(l,c).next(p=>(U(p!==null,37113),f=p.keys(),u.mutationQueue.removeMutationBatch(l,p))).next(()=>u.mutationQueue.performConsistencyCheck(l)).next(()=>u.documentOverlayCache.removeOverlaysForBatchId(l,f,c)).next(()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(l,f)).next(()=>u.localDocuments.getDocuments(l,f))})}(r.localStore,e);Il(r,e,t),yl(r,e),r.sharedClientState.updateMutationState(e,"rejected",t),await Rn(r,s)}catch(s){await Tn(s)}}function yl(n,e){(n.mu.get(e)||[]).forEach(t=>{t.resolve()}),n.mu.delete(e)}function Il(n,e,t){const r=F(n);let s=r.du[r.currentUser.toKey()];if(s){const i=s.get(e);i&&(t?i.reject(t):i.resolve(),s=s.remove(e)),r.du[r.currentUser.toKey()]=s}}function Yr(n,e,t=null){n.sharedClientState.removeLocalQueryTarget(e);for(const r of n.Iu.get(e))n.Tu.delete(r),t&&n.Pu.yu(r,t);n.Iu.delete(e),n.isPrimaryClient&&n.Vu.Gr(e).forEach(r=>{n.Vu.containsKey(r)||r_(n,r)})}function r_(n,e){n.Eu.delete(e.path.canonicalString());const t=n.Ru.get(e);t!==null&&(Qr(n.remoteStore,t),n.Ru=n.Ru.remove(e),n.Au.delete(t),wl(n))}function wu(n,e,t){for(const r of t)r instanceof Zg?(n.Vu.addReference(r.key,e),PA(n,r)):r instanceof e_?(D(is,"Document no longer in limbo: "+r.key),n.Vu.removeReference(r.key,e),n.Vu.containsKey(r.key)||r_(n,r.key)):M(19791,{wu:r})}function PA(n,e){const t=e.key,r=t.path.canonicalString();n.Ru.get(t)||n.Eu.has(r)||(D(is,"New document in limbo: "+t),n.Eu.add(r),wl(n))}function wl(n){for(;n.Eu.size>0&&n.Ru.size<n.maxConcurrentLimboResolutions;){const e=n.Eu.values().next().value;n.Eu.delete(e);const t=new x(ne.fromString(e)),r=n.fu.next();n.Au.set(r,new yA(t)),n.Ru=n.Ru.insert(t,r),va(n.remoteStore,new Vt(rt(Pi(t.path)),r,"TargetPurposeLimboResolution",He.ce))}}async function Rn(n,e,t){const r=F(n),s=[],i=[],o=[];r.Tu.isEmpty()||(r.Tu.forEach((c,u)=>{o.push(r.pu(u,e,t).then(l=>{var f;if((l||t)&&r.isPrimaryClient){const p=l?!l.fromCache:(f=t==null?void 0:t.targetChanges.get(u.targetId))==null?void 0:f.current;r.sharedClientState.updateQueryState(u.targetId,p?"current":"not-current")}if(l){s.push(l);const p=sl.Es(u.targetId,l);i.push(p)}}))}),await Promise.all(o),r.Pu.J_(s),await async function(u,l){const f=F(u);try{await f.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>A.forEach(l,g=>A.forEach(g.Ts,v=>f.persistence.referenceDelegate.addReference(p,g.targetId,v)).next(()=>A.forEach(g.Is,v=>f.persistence.referenceDelegate.removeReference(p,g.targetId,v)))))}catch(p){if(!vn(p))throw p;D(il,"Failed to update sequence numbers: "+p)}for(const p of l){const g=p.targetId;if(!p.fromCache){const v=f.vs.get(g),C=v.snapshotVersion,N=v.withLastLimboFreeSnapshotVersion(C);f.vs=f.vs.insert(g,N)}}}(r.localStore,i))}async function CA(n,e){const t=F(n);if(!t.currentUser.isEqual(e)){D(is,"User change. New user:",e.toKey());const r=await Mg(t.localStore,e);t.currentUser=e,function(i,o){i.mu.forEach(c=>{c.forEach(u=>{u.reject(new V(S.CANCELLED,o))})}),i.mu.clear()}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await Rn(t,r.Ns)}}function kA(n,e){const t=F(n),r=t.Au.get(e);if(r&&r.hu)return H().add(r.key);{let s=H();const i=t.Iu.get(e);if(!i)return s;for(const o of i){const c=t.Tu.get(o);s=s.unionWith(c.view.nu)}return s}}async function NA(n,e){const t=F(n),r=await mu(t.localStore,e.query,!0),s=e.view.cu(r);return t.isPrimaryClient&&wu(t,e.targetId,s.au),s}async function DA(n,e){const t=F(n);return Bg(t.localStore,e).then(r=>Rn(t,r))}async function VA(n,e,t,r){const s=F(n),i=await function(c,u){const l=F(c),f=F(l.mutationQueue);return l.persistence.runTransaction("Lookup mutation documents","readonly",p=>f.Xn(p,u).next(g=>g?l.localDocuments.getDocuments(p,g):A.resolve(null)))}(s.localStore,e);i!==null?(t==="pending"?await rs(s.remoteStore):t==="acknowledged"||t==="rejected"?(Il(s,e,r||null),yl(s,e),function(c,u){F(F(c).mutationQueue).nr(u)}(s.localStore,e)):M(6720,"Unknown batchState",{bu:t}),await Rn(s,i)):D(is,"Cannot apply mutation batch with id: "+e)}async function OA(n,e){const t=F(n);if(Aa(t),El(t),e===!0&&t.gu!==!0){const r=t.sharedClientState.getAllActiveQueryTargets(),s=await xf(t,r.toArray());t.gu=!0,await yu(t.remoteStore,!0);for(const i of s)va(t.remoteStore,i)}else if(e===!1&&t.gu!==!1){const r=[];let s=Promise.resolve();t.Iu.forEach((i,o)=>{t.sharedClientState.isLocalQueryTarget(o)?r.push(o):s=s.then(()=>(Yr(t,o),Hr(t.localStore,o,!0))),Qr(t.remoteStore,o)}),await s,await xf(t,r),function(o){const c=F(o);c.Au.forEach((u,l)=>{Qr(c.remoteStore,l)}),c.Vu.zr(),c.Au=new Map,c.Ru=new ae(x.comparator)}(t),t.gu=!1,await yu(t.remoteStore,!1)}}async function xf(n,e,t){const r=F(n),s=[],i=[];for(const o of e){let c;const u=r.Iu.get(o);if(u&&u.length!==0){c=await jo(r.localStore,rt(u[0]));for(const l of u){const f=r.Tu.get(l),p=await NA(r,f);p.snapshot&&i.push(p.snapshot)}}else{const l=await Ug(r.localStore,o);c=await jo(r.localStore,l),await _l(r,s_(l),o,!1,c.resumeToken)}s.push(c)}return r.Pu.J_(i),s}function s_(n){return qm(n.path,n.collectionGroup,n.orderBy,n.filters,n.limit,"F",n.startAt,n.endAt)}function xA(n){return function(t){return F(F(t).persistence).hs()}(F(n).localStore)}async function LA(n,e,t,r){const s=F(n);if(s.gu)return void D(is,"Ignoring unexpected query state notification.");const i=s.Iu.get(e);if(i&&i.length>0)switch(t){case"current":case"not-current":{const o=await Bg(s.localStore,Gm(i[0])),c=ki.createSynthesizedRemoteEventForCurrentChange(e,t==="current",we.EMPTY_BYTE_STRING);await Rn(s,o,c);break}case"rejected":await Hr(s.localStore,e,!0),Yr(s,e,r);break;default:M(64155,t)}}async function MA(n,e,t){const r=Aa(n);if(r.gu){for(const s of e){if(r.Iu.has(s)&&r.sharedClientState.isActiveQueryTarget(s)){D(is,"Adding an already active target "+s);continue}const i=await Ug(r.localStore,s),o=await jo(r.localStore,i);await _l(r,s_(i),o.targetId,!1,o.resumeToken),va(r.remoteStore,o)}for(const s of t)r.Iu.has(s)&&await Hr(r.localStore,s,!1).then(()=>{Qr(r.remoteStore,s),Yr(r,s)}).catch(Tn)}}function Aa(n){const e=F(n);return e.remoteStore.remoteSyncer.applyRemoteEvent=n_.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=kA.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=RA.bind(null,e),e.Pu.J_=pA.bind(null,e.eventManager),e.Pu.yu=mA.bind(null,e.eventManager),e}function El(n){const e=F(n);return e.remoteStore.remoteSyncer.applySuccessfulWrite=bA.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=SA.bind(null,e),e}class mi{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Ea(e.databaseInfo.databaseId),this.sharedClientState=this.Du(e),this.persistence=this.Cu(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Fu(e,this.localStore),this.indexBackfillerScheduler=this.Mu(e,this.localStore)}Fu(e,t){return null}Mu(e,t){return null}vu(e){return Lg(this.persistence,new xg,e.initialUser,this.serializer)}Cu(e){return new nl(wa.Vi,this.serializer)}Du(e){return new zg}async terminate(){var e,t;(e=this.gcScheduler)==null||e.stop(),(t=this.indexBackfillerScheduler)==null||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}mi.provider={build:()=>new mi};class FA extends mi{constructor(e){super(),this.cacheSizeBytes=e}Fu(e,t){U(this.persistence.referenceDelegate instanceof $o,46915);const r=this.persistence.referenceDelegate.garbageCollector;return new Cg(r,e.asyncQueue,t)}Cu(e){const t=this.cacheSizeBytes!==void 0?qe.withCacheSize(this.cacheSizeBytes):qe.DEFAULT;return new nl(r=>$o.Vi(r,t),this.serializer)}}class i_ extends mi{constructor(e,t,r){super(),this.xu=e,this.cacheSizeBytes=t,this.forceOwnership=r,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.xu.initialize(this,e),await El(this.xu.syncEngine),await rs(this.xu.remoteStore),await this.persistence.zi(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}vu(e){return Lg(this.persistence,new xg,e.initialUser,this.serializer)}Fu(e,t){const r=this.persistence.referenceDelegate.garbageCollector;return new Cg(r,e.asyncQueue,t)}Mu(e,t){const r=new $E(t,this.persistence);return new qE(e.asyncQueue,r)}Cu(e){const t=Og(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),r=this.cacheSizeBytes!==void 0?qe.withCacheSize(this.cacheSizeBytes):qe.DEFAULT;return new rl(this.synchronizeTabs,t,e.clientId,r,e.asyncQueue,Wg(),vo(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Du(e){return new zg}}class UA extends i_{constructor(e,t){super(e,t,!1),this.xu=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.xu.syncEngine;this.sharedClientState instanceof Sc&&(this.sharedClientState.syncEngine={So:VA.bind(null,t),Do:LA.bind(null,t),Co:MA.bind(null,t),hs:xA.bind(null,t),bo:DA.bind(null,t)},await this.sharedClientState.start()),await this.persistence.zi(async r=>{await OA(this.xu.syncEngine,r),this.gcScheduler&&(r&&!this.gcScheduler.started?this.gcScheduler.start():r||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(r&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():r||this.indexBackfillerScheduler.stop())})}Du(e){const t=Wg();if(!Sc.v(t))throw new V(S.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const r=Og(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new Sc(t,e.asyncQueue,r,e.clientId,e.initialUser)}}class gi{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>Of(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=CA.bind(null,this.syncEngine),await yu(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new fA}()}createDatastore(e){const t=Ea(e.databaseInfo.databaseId),r=Hv(e.databaseInfo);return Zv(e.authCredentials,e.appCheckCredentials,r,t)}createRemoteStore(e){return function(r,s,i,o,c){return new tA(r,s,i,o,c)}(this.localStore,this.datastore,e.asyncQueue,t=>Of(this.syncEngine,t,0),function(){return Pf.v()?new Pf:new Gv}())}createSyncEngine(e,t){return function(s,i,o,c,u,l,f){const p=new IA(s,i,o,c,u,l);return f&&(p.gu=!0),p}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(s){const i=F(s);D(er,"RemoteStore shutting down."),i.Ea.add(5),await Di(i),i.Aa.shutdown(),i.Va.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(t=this.eventManager)==null||t.terminate()}}gi.provider={build:()=>new gi};/**
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
 */class Tl{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ou(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ou(this.observer.error,e):Ie("Uncaught Error in snapshot listener:",e.toString()))}Nu(){this.muted=!0}Ou(e,t){setTimeout(()=>{this.muted||e(t)},0)}}/**
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
 */let BA=class{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new V(S.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await async function(s,i){const o=F(s),c={documents:i.map(p=>fi(o.serializer,p))},u=await o.jo("BatchGetDocuments",o.serializer.databaseId,ne.emptyPath(),c,i.length),l=new Map;u.forEach(p=>{const g=tv(o.serializer,p);l.set(g.key.toString(),g)});const f=[];return i.forEach(p=>{const g=l.get(p.toString());U(!!g,55234,{key:p}),f.push(g)}),f}(this.datastore,e);return t.forEach(r=>this.recordVersion(r)),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(r){this.lastTransactionError=r}this.writtenDocs.add(e.toString())}delete(e){this.write(new ns(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach(t=>{e.delete(t.key.toString())}),e.forEach((t,r)=>{const s=x.fromPath(r);this.mutations.push(new Wu(s,this.precondition(s)))}),await async function(r,s){const i=F(r),o={writes:s.map(c=>pi(i.serializer,c))};await i.Wo("Commit",i.serializer.databaseId,ne.emptyPath(),o)}(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw M(50498,{Gu:e.constructor.name});t=$.min()}const r=this.readVersions.get(e.key.toString());if(r){if(!t.isEqual(r))throw new V(S.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual($.min())?he.exists(!1):he.updateTime(t):he.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual($.min()))throw new V(S.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return he.updateTime(t)}return he.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}};/**
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
 */class qA{constructor(e,t,r,s,i){this.asyncQueue=e,this.datastore=t,this.options=r,this.updateFunction=s,this.deferred=i,this.zu=r.maxAttempts,this.M_=new al(this.asyncQueue,"transaction_retry")}ju(){this.zu-=1,this.Hu()}Hu(){this.M_.p_(async()=>{const e=new BA(this.datastore),t=this.Ju(e);t&&t.then(r=>{this.asyncQueue.enqueueAndForget(()=>e.commit().then(()=>{this.deferred.resolve(r)}).catch(s=>{this.Zu(s)}))}).catch(r=>{this.Zu(r)})})}Ju(e){try{const t=this.updateFunction(e);return!Ri(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}Zu(e){this.zu>0&&this.Xu(e)?(this.zu-=1,this.asyncQueue.enqueueAndForget(()=>(this.Hu(),Promise.resolve()))):this.deferred.reject(e)}Xu(e){if((e==null?void 0:e.name)==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!sg(t)}return!1}}/**
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
 */const wn="FirestoreClient";class $A{constructor(e,t,r,s,i){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=r,this._databaseInfo=s,this.user=Be.UNAUTHENTICATED,this.clientId=Vu.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(r,async o=>{D(wn,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(r,o=>(D(wn,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this._databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new dt;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const r=dl(t,"Failed to shutdown persistence");e.reject(r)}}),e.promise}}async function Cc(n,e){n.asyncQueue.verifyOperationInProgress(),D(wn,"Initializing OfflineComponentProvider");const t=n.configuration;await e.initialize(t);let r=t.initialUser;n.setCredentialChangeListener(async s=>{r.isEqual(s)||(await Mg(e.localStore,s),r=s)}),e.persistence.setDatabaseDeletedListener(()=>n.terminate()),n._offlineComponents=e}async function Lf(n,e){n.asyncQueue.verifyOperationInProgress();const t=await jA(n);D(wn,"Initializing OnlineComponentProvider"),await e.initialize(t,n.configuration),n.setCredentialChangeListener(r=>kf(e.remoteStore,r)),n.setAppCheckTokenChangeListener((r,s)=>kf(e.remoteStore,s)),n._onlineComponents=e}async function jA(n){if(!n._offlineComponents)if(n._uninitializedComponentsProvider){D(wn,"Using user provided OfflineComponentProvider");try{await Cc(n,n._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!function(s){return s.name==="FirebaseError"?s.code===S.FAILED_PRECONDITION||s.code===S.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11}(t))throw t;ni("Error using user provided cache. Falling back to memory cache: "+t),await Cc(n,new mi)}}else D(wn,"Using default OfflineComponentProvider"),await Cc(n,new FA(void 0));return n._offlineComponents}async function vl(n){return n._onlineComponents||(n._uninitializedComponentsProvider?(D(wn,"Using user provided OnlineComponentProvider"),await Lf(n,n._uninitializedComponentsProvider._online)):(D(wn,"Using default OnlineComponentProvider"),await Lf(n,new gi))),n._onlineComponents}function GA(n){return vl(n).then(e=>e.syncEngine)}function o_(n){return vl(n).then(e=>e.datastore)}async function Ko(n){const e=await vl(n),t=e.eventManager;return t.onListen=wA.bind(null,e.syncEngine),t.onUnlisten=TA.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=EA.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=vA.bind(null,e.syncEngine),t}function zA(n,e,t,r){const s=new Tl(r),i=new gl(e,s,t);return n.asyncQueue.enqueueAndForget(async()=>fl(await Ko(n),i)),()=>{s.Nu(),n.asyncQueue.enqueueAndForget(async()=>pl(await Ko(n),i))}}function a_(n,e,t={}){const r=new dt;return n.asyncQueue.enqueueAndForget(async()=>function(i,o,c,u,l){const f=new Tl({next:g=>{f.Nu(),o.enqueueAndForget(()=>pl(i,p));const v=g.docs.has(c);!v&&g.fromCache?l.reject(new V(S.UNAVAILABLE,"Failed to get document because the client is offline.")):v&&g.fromCache&&u&&u.source==="server"?l.reject(new V(S.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):l.resolve(g)},error:g=>l.reject(g)}),p=new gl(Pi(c.path),f,{includeMetadataChanges:!0,Ka:!0});return fl(i,p)}(await Ko(n),n.asyncQueue,e,t,r)),r.promise}function WA(n,e,t={}){const r=new dt;return n.asyncQueue.enqueueAndForget(async()=>function(i,o,c,u,l){const f=new Tl({next:g=>{f.Nu(),o.enqueueAndForget(()=>pl(i,p)),g.fromCache&&u.source==="server"?l.reject(new V(S.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):l.resolve(g)},error:g=>l.reject(g)}),p=new gl(c,f,{includeMetadataChanges:!0,Ka:!0});return fl(i,p)}(await Ko(n),n.asyncQueue,e,t,r)),r.promise}function KA(n,e,t){const r=new dt;return n.asyncQueue.enqueueAndForget(async()=>{try{const s=await o_(n);r.resolve(async function(o,c,u){var N;const l=F(o),{request:f,gt:p,parent:g}=sv(l.serializer,kT(c),u);l.connection.Ko||delete f.parent;const v=(await l.jo("RunAggregationQuery",l.serializer.databaseId,g,f,1)).filter(k=>!!k.result);U(v.length===1,64727);const C=(N=v[0].result)==null?void 0:N.aggregateFields;return Object.keys(C).reduce((k,j)=>(k[p[j]]=C[j],k),{})}(s,e,t))}catch(s){r.reject(s)}}),r.promise}function HA(n,e){const t=new dt;return n.asyncQueue.enqueueAndForget(async()=>AA(await GA(n),e,t)),t.promise}function QA(n,e,t){const r=new dt;return n.asyncQueue.enqueueAndForget(async()=>{const s=await o_(n);new qA(n.asyncQueue,s,t,e,r).ju()}),r.promise}/**
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
 */function c_(n){const e={};return n.timeoutSeconds!==void 0&&(e.timeoutSeconds=n.timeoutSeconds),e}/**
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
 */const JA="ComponentProvider",Mf=new Map;function YA(n,e,t,r,s){return new _T(n,e,t,s.host,s.ssl,s.experimentalForceLongPolling,s.experimentalAutoDetectLongPolling,c_(s.experimentalLongPollingOptions),s.useFetchStreams,s.isUsingEmulator,r)}/**
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
 */const XA="firestore.googleapis.com",Ff=!0;class Uf{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new V(S.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=XA,this.ssl=Ff}else this.host=e.host,this.ssl=e.ssl??Ff;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=Ag;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<Pg)throw new V(S.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}ME("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=c_(e.experimentalLongPollingOptions??{}),function(r){if(r.timeoutSeconds!==void 0){if(isNaN(r.timeoutSeconds))throw new V(S.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (must not be NaN)`);if(r.timeoutSeconds<5)throw new V(S.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (minimum allowed value is 5)`);if(r.timeoutSeconds>30)throw new V(S.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(r,s){return r.timeoutSeconds===s.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class Al{constructor(e,t,r,s){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=r,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Uf({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new V(S.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new V(S.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Uf(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(r){if(!r)return new PE;switch(r.type){case"firstParty":return new NE(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new V(S.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const r=Mf.get(t);r&&(D(JA,"Removing Datastore"),Mf.delete(t),r.terminate())}(this),Promise.resolve()}}/**
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
 */class Nt{constructor(e,t,r){this.converter=t,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new Nt(this.firestore,e,this._query)}}class de{constructor(e,t,r){this.converter=t,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new fn(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new de(this.firestore,e,this._key)}toJSON(){return{type:de._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,r){if(Ai(t,de._jsonSchema))return new de(e,r||null,new x(ne.fromString(t.referencePath)))}}de._jsonSchemaVersion="firestore/documentReference/1.0",de._jsonSchema={type:ve("string",de._jsonSchemaVersion),referencePath:ve("string")};class fn extends Nt{constructor(e,t,r){super(e,t,Pi(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new de(this.firestore,null,new x(e))}withConverter(e){return new fn(this.firestore,e,this._path)}}function D0(n,e,...t){if(n=G(n),om("collection","path",e),n instanceof Al){const r=ne.fromString(e,...t);return Pd(r),new fn(n,null,r)}{if(!(n instanceof de||n instanceof fn))throw new V(S.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(ne.fromString(e,...t));return Pd(r),new fn(n.firestore,null,r)}}function ZA(n,e,...t){if(n=G(n),arguments.length===1&&(e=Vu.newId()),om("doc","path",e),n instanceof Al){const r=ne.fromString(e,...t);return Sd(r),new de(n,null,new x(r))}{if(!(n instanceof de||n instanceof fn))throw new V(S.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(ne.fromString(e,...t));return Sd(r),new de(n.firestore,n instanceof fn?n.converter:null,new x(r))}}/**
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
 */const Bf="AsyncQueue";class qf{constructor(e=Promise.resolve()){this.Yu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new al(this,"async_queue_retry"),this._c=()=>{const r=vo();r&&D(Bf,"Visibility state changed to "+r.visibilityState),this.M_.w_()},this.ac=e;const t=vo();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const t=vo();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise(()=>{});const t=new dt;return this.cc(()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Yu.push(e),this.lc()))}async lc(){if(this.Yu.length!==0){try{await this.Yu[0](),this.Yu.shift(),this.M_.reset()}catch(e){if(!vn(e))throw e;D(Bf,"Operation failed with retryable error: "+e)}this.Yu.length>0&&this.M_.p_(()=>this.lc())}}cc(e){const t=this.ac.then(()=>(this.rc=!0,e().catch(r=>{throw this.nc=r,this.rc=!1,Ie("INTERNAL UNHANDLED ERROR: ",$f(r)),r}).then(r=>(this.rc=!1,r))));return this.ac=t,t}enqueueAfterDelay(e,t,r){this.uc(),this.oc.indexOf(e)>-1&&(t=0);const s=hl.createAndSchedule(this,e,t,r,i=>this.hc(i));return this.tc.push(s),s}uc(){this.nc&&M(47125,{Pc:$f(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const t of this.tc)if(t.timerId===e)return!0;return!1}Ec(e){return this.Tc().then(()=>{this.tc.sort((t,r)=>t.targetTimeMs-r.targetTimeMs);for(const t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc()})}Rc(e){this.oc.push(e)}hc(e){const t=this.tc.indexOf(e);this.tc.splice(t,1)}}function $f(n){let e=n.message||"";return n.stack&&(e=n.stack.includes(n.message)?n.stack:n.message+`
`+n.stack),e}class ot extends Al{constructor(e,t,r,s){super(e,t,r,s),this.type="firestore",this._queue=new qf,this._persistenceKey=(s==null?void 0:s.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new qf(e),this._firestoreClient=void 0,await e}}}function V0(n,e,t){t||(t=xo);const r=En(n,"firestore");if(r.isInitialized(t)){const s=r.getImmediate({identifier:t}),i=r.getOptions(t);if(Wn(i,e))return s;throw new V(S.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(e.cacheSizeBytes!==void 0&&e.localCache!==void 0)throw new V(S.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(e.cacheSizeBytes!==void 0&&e.cacheSizeBytes!==-1&&e.cacheSizeBytes<Pg)throw new V(S.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return e.host&&kt(e.host)&&sa(e.host),r.initialize({options:e,instanceIdentifier:t})}function bn(n){if(n._terminated)throw new V(S.FAILED_PRECONDITION,"The client has already been terminated.");return n._firestoreClient||eR(n),n._firestoreClient}function eR(n){var r,s,i,o;const e=n._freezeSettings(),t=YA(n._databaseId,((r=n._app)==null?void 0:r.options.appId)||"",n._persistenceKey,(s=n._app)==null?void 0:s.options.apiKey,e);n._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((o=e.localCache)!=null&&o._onlineComponentProvider)&&(n._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),n._firestoreClient=new $A(n._authCredentials,n._appCheckCredentials,n._queue,t,n._componentsProvider&&function(u){const l=u==null?void 0:u._online.build();return{_offline:u==null?void 0:u._offline.build(l),_online:l}}(n._componentsProvider))}/**
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
 */class et{constructor(e){this._byteString=e}static fromBase64String(e){try{return new et(we.fromBase64String(e))}catch(t){throw new V(S.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new et(we.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:et._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Ai(e,et._jsonSchema))return et.fromBase64String(e.bytes)}}et._jsonSchemaVersion="firestore/bytes/1.0",et._jsonSchema={type:ve("string",et._jsonSchemaVersion),bytes:ve("string")};/**
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
 */class os{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new V(S.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new fe(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}function O0(){return new os(Jc)}/**
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
 */class Ra{constructor(e){this._methodName=e}}/**
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
 */class bt{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new V(S.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new V(S.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return z(this._lat,e._lat)||z(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:bt._jsonSchemaVersion}}static fromJSON(e){if(Ai(e,bt._jsonSchema))return new bt(e.latitude,e.longitude)}}bt._jsonSchemaVersion="firestore/geoPoint/1.0",bt._jsonSchema={type:ve("string",bt._jsonSchemaVersion),latitude:ve("number"),longitude:ve("number")};/**
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
 */class yt{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(r,s){if(r.length!==s.length)return!1;for(let i=0;i<r.length;++i)if(r[i]!==s[i])return!1;return!0}(this._values,e._values)}toJSON(){return{type:yt._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Ai(e,yt._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new yt(e.vectorValues);throw new V(S.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}yt._jsonSchemaVersion="firestore/vectorValue/1.0",yt._jsonSchema={type:ve("string",yt._jsonSchemaVersion),vectorValues:ve("object")};/**
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
 */const tR=/^__.*__$/;class nR{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return this.fieldMask!==null?new Gt(e,this.data,this.fieldMask,t,this.fieldTransforms):new ts(e,this.data,t,this.fieldTransforms)}}class u_{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return new Gt(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function l_(n){switch(n){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw M(40011,{dataSource:n})}}class Rl{constructor(e,t,r,s,i,o){this.settings=e,this.databaseId=t,this.serializer=r,this.ignoreUndefinedProperties=s,i===void 0&&this.validatePath(),this.fieldTransforms=i||[],this.fieldMask=o||[]}get path(){return this.settings.path}get dataSource(){return this.settings.dataSource}contextWith(e){return new Rl({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}childContextForField(e){var s;const t=(s=this.path)==null?void 0:s.child(e),r=this.contextWith({path:t,arrayElement:!1});return r.validatePathSegment(e),r}childContextForFieldPath(e){var s;const t=(s=this.path)==null?void 0:s.child(e),r=this.contextWith({path:t,arrayElement:!1});return r.validatePath(),r}childContextForArray(e){return this.contextWith({path:void 0,arrayElement:!0})}createError(e){return Ho(e,this.settings.methodName,this.settings.hasConverter||!1,this.path,this.settings.targetDoc)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}validatePath(){if(this.path)for(let e=0;e<this.path.length;e++)this.validatePathSegment(this.path.get(e))}validatePathSegment(e){if(e.length===0)throw this.createError("Document fields must not be empty");if(l_(this.dataSource)&&tR.test(e))throw this.createError('Document fields cannot begin and end with "__"')}}class rR{constructor(e,t,r){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=r||Ea(e)}createContext(e,t,r,s=!1){return new Rl({dataSource:e,methodName:t,targetDoc:r,path:fe.emptyPath(),arrayElement:!1,hasConverter:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function hr(n){const e=n._freezeSettings(),t=Ea(n._databaseId);return new rR(n._databaseId,!!e.ignoreUndefinedProperties,t)}function ba(n,e,t,r,s,i={}){const o=n.createContext(i.merge||i.mergeFields?2:0,e,t,s);Cl("Data must be an object, but it was:",o,r);const c=d_(r,o);let u,l;if(i.merge)u=new Qe(o.fieldMask),l=o.fieldTransforms;else if(i.mergeFields){const f=[];for(const p of i.mergeFields){const g=tr(e,p,t);if(!o.contains(g))throw new V(S.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);m_(f,g)||f.push(g)}u=new Qe(f),l=o.fieldTransforms.filter(p=>u.covers(p.field))}else u=null,l=o.fieldTransforms;return new nR(new De(c),u,l)}class Sa extends Ra{_toFieldTransform(e){if(e.dataSource!==2)throw e.dataSource===1?e.createError(`${this._methodName}() can only appear at the top level of your update data`):e.createError(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof Sa}}class bl extends Ra{constructor(e,t){super(e),this.Vc=t}_toFieldTransform(e){const t=new Wr(e.serializer,Jm(e.serializer,this.Vc));return new tg(e.path,t)}isEqual(e){return e instanceof bl&&this.Vc===e.Vc}}function Sl(n,e,t,r){const s=n.createContext(1,e,t);Cl("Data must be an object, but it was:",s,r);const i=[],o=De.empty();An(r,(u,l)=>{const f=p_(e,u,t);l=G(l);const p=s.childContextForFieldPath(f);if(l instanceof Sa)i.push(f);else{const g=Vi(l,p);g!=null&&(i.push(f),o.set(f,g))}});const c=new Qe(i);return new u_(o,c,s.fieldTransforms)}function Pl(n,e,t,r,s,i){const o=n.createContext(1,e,t),c=[tr(e,r,t)],u=[s];if(i.length%2!=0)throw new V(S.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<i.length;g+=2)c.push(tr(e,i[g])),u.push(i[g+1]);const l=[],f=De.empty();for(let g=c.length-1;g>=0;--g)if(!m_(l,c[g])){const v=c[g];let C=u[g];C=G(C);const N=o.childContextForFieldPath(v);if(C instanceof Sa)l.push(v);else{const k=Vi(C,N);k!=null&&(l.push(v),f.set(v,k))}}const p=new Qe(l);return new u_(f,p,o.fieldTransforms)}function h_(n,e,t,r=!1){return Vi(t,n.createContext(r?4:3,e))}function Vi(n,e){if(f_(n=G(n)))return Cl("Unsupported field value:",e,n),d_(n,e);if(n instanceof Ra)return function(r,s){if(!l_(s.dataSource))throw s.createError(`${r._methodName}() can only be used with update() and set()`);if(!s.path)throw s.createError(`${r._methodName}() is not currently supported inside arrays`);const i=r._toFieldTransform(s);i&&s.fieldTransforms.push(i)}(n,e),null;if(n===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),n instanceof Array){if(e.settings.arrayElement&&e.dataSource!==4)throw e.createError("Nested arrays are not supported");return function(r,s){const i=[];let o=0;for(const c of r){let u=Vi(c,s.childContextForArray(o));u==null&&(u={nullValue:"NULL_VALUE"}),i.push(u),o++}return{arrayValue:{values:i}}}(n,e)}return function(r,s){if((r=G(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return Jm(s.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const i=re.fromDate(r);return{timestampValue:Kr(s.serializer,i)}}if(r instanceof re){const i=new re(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:Kr(s.serializer,i)}}if(r instanceof bt)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof et)return{bytesValue:cg(s.serializer,r._byteString)};if(r instanceof de){const i=s.databaseId,o=r.firestore._databaseId;if(!o.isEqual(i))throw s.createError(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${i.projectId}/${i.database}`);return{referenceValue:Yu(r.firestore._databaseId||s.databaseId,r._key.path)}}if(r instanceof yt)return function(o,c){const u=o instanceof yt?o.toArray():o;return{mapValue:{fields:{[Bu]:{stringValue:qu},[qr]:{arrayValue:{values:u.map(f=>{if(typeof f!="number")throw c.createError("VectorValues must only contain numeric values.");return zu(c.serializer,f)})}}}}}}(r,s);if(yg(r))return r._toProto(s.serializer);throw s.createError(`Unsupported field value: ${aa(r)}`)}(n,e)}function d_(n,e){const t={};return Am(n)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):An(n,(r,s)=>{const i=Vi(s,e.childContextForField(r));i!=null&&(t[r]=i)}),{mapValue:{fields:t}}}function f_(n){return!(typeof n!="object"||n===null||n instanceof Array||n instanceof Date||n instanceof re||n instanceof bt||n instanceof et||n instanceof de||n instanceof Ra||n instanceof yt||yg(n))}function Cl(n,e,t){if(!f_(t)||!am(t)){const r=aa(t);throw r==="an object"?e.createError(n+" a custom object"):e.createError(n+" "+r)}}function tr(n,e,t){if((e=G(e))instanceof os)return e._internalPath;if(typeof e=="string")return p_(n,e);throw Ho("Field path arguments must be of type string or ",n,!1,void 0,t)}const sR=new RegExp("[~\\*/\\[\\]]");function p_(n,e,t){if(e.search(sR)>=0)throw Ho(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,n,!1,void 0,t);try{return new os(...e.split("."))._internalPath}catch{throw Ho(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,n,!1,void 0,t)}}function Ho(n,e,t,r,s){const i=r&&!r.isEmpty(),o=s!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let u="";return(i||o)&&(u+=" (found",i&&(u+=` in field ${r}`),o&&(u+=` in document ${s}`),u+=")"),new V(S.INVALID_ARGUMENT,c+n+u)}function m_(n,e){return n.some(t=>t.isEqual(e))}/**
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
 */class g_{convertValue(e,t="none"){switch(gn(e)){case 0:return null;case 1:return e.booleanValue;case 2:return ue(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(Bt(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw M(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const r={};return An(e,(s,i)=>{r[s]=this.convertValue(i,t)}),r}convertVectorValue(e){var r,s,i;const t=(i=(s=(r=e.fields)==null?void 0:r[qr].arrayValue)==null?void 0:s.values)==null?void 0:i.map(o=>ue(o.doubleValue));return new yt(t)}convertGeoPoint(e){return new bt(ue(e.latitude),ue(e.longitude))}convertArray(e,t){return(e.values||[]).map(r=>this.convertValue(r,t))}convertServerTimestamp(e,t){switch(t){case"previous":const r=fa(e);return r==null?null:this.convertValue(r,t);case"estimate":return this.convertTimestamp(ci(e));default:return null}}convertTimestamp(e){const t=Ut(e);return new re(t.seconds,t.nanos)}convertDocumentKey(e,t){const r=ne.fromString(e);U(_g(r),9688,{name:e});const s=new Hn(r.get(1),r.get(3)),i=new x(r.popFirst(5));return s.isEqual(t)||Ie(`Document ${i} contains a document reference within a different database (${s.projectId}/${s.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),i}}/**
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
 */class Oi extends g_{constructor(e){super(),this.firestore=e}convertBytes(e){return new et(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new de(this.firestore,null,t)}}function x0(n){return new bl("increment",n)}const jf="@firebase/firestore",Gf="4.10.0";/**
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
 */function zf(n){return function(t,r){if(typeof t!="object"||t===null)return!1;const s=t;for(const i of r)if(i in s&&typeof s[i]=="function")return!0;return!1}(n,["next","error","complete"])}/**
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
 */class iR{constructor(e="count",t){this._internalFieldPath=t,this.type="AggregateField",this.aggregateType=e}}class oR{constructor(e,t,r){this._userDataWriter=t,this._data=r,this.type="AggregateQuerySnapshot",this.query=e}data(){return this._userDataWriter.convertObjectMap(this._data)}_fieldsProto(){return new De({mapValue:{fields:this._data}}).clone().value.mapValue.fields}}/**
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
 */class _i{constructor(e,t,r,s,i){this._firestore=e,this._userDataWriter=t,this._key=r,this._document=s,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new de(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new aR(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}_fieldsProto(){var e;return((e=this._document)==null?void 0:e.data.clone().value.mapValue.fields)??void 0}get(e){if(this._document){const t=this._document.data.field(tr("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class aR extends _i{data(){return super.data()}}/**
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
 */function __(n){if(n.limitType==="L"&&n.explicitOrderBy.length===0)throw new V(S.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class kl{}class Pa extends kl{}function L0(n,e,...t){let r=[];e instanceof kl&&r.push(e),r=r.concat(t),function(i){const o=i.filter(u=>u instanceof Nl).length,c=i.filter(u=>u instanceof Ca).length;if(o>1||o>0&&c>0)throw new V(S.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(r);for(const s of r)n=s._apply(n);return n}class Ca extends Pa{constructor(e,t,r){super(),this._field=e,this._op=t,this._value=r,this.type="where"}static _create(e,t,r){return new Ca(e,t,r)}_apply(e){const t=this._parse(e);return y_(e._query,t),new Nt(e.firestore,e.converter,au(e._query,t))}_parse(e){const t=hr(e.firestore);return function(i,o,c,u,l,f,p){let g;if(l.isKeyField()){if(f==="array-contains"||f==="array-contains-any")throw new V(S.INVALID_ARGUMENT,`Invalid Query. You can't perform '${f}' queries on documentId().`);if(f==="in"||f==="not-in"){Kf(p,f);const C=[];for(const N of p)C.push(Wf(u,i,N));g={arrayValue:{values:C}}}else g=Wf(u,i,p)}else f!=="in"&&f!=="not-in"&&f!=="array-contains-any"||Kf(p,f),g=h_(c,o,p,f==="in"||f==="not-in");return Z.create(l,f,g)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function M0(n,e,t){const r=e,s=tr("where",n);return Ca._create(s,r,t)}class Nl extends kl{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new Nl(e,t)}_parse(e){const t=this._queryConstraints.map(r=>r._parse(e)).filter(r=>r.getFilters().length>0);return t.length===1?t[0]:se.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:(function(s,i){let o=s;const c=i.getFlattenedFilters();for(const u of c)y_(o,u),o=au(o,u)}(e._query,t),new Nt(e.firestore,e.converter,au(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class Dl extends Pa{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new Dl(e,t)}_apply(e){const t=function(s,i,o){if(s.startAt!==null)throw new V(S.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(s.endAt!==null)throw new V(S.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new hi(i,o)}(e._query,this._field,this._direction);return new Nt(e.firestore,e.converter,NT(e._query,t))}}function F0(n,e="asc"){const t=e,r=tr("orderBy",n);return Dl._create(r,t)}class Vl extends Pa{constructor(e,t,r){super(),this.type=e,this._limit=t,this._limitType=r}static _create(e,t,r){return new Vl(e,t,r)}_apply(e){return new Nt(e.firestore,e.converter,Fo(e._query,this._limit,this._limitType))}}function U0(n){return FE("limit",n),Vl._create("limit",n,"F")}class Ol extends Pa{constructor(e,t,r){super(),this.type=e,this._docOrFields=t,this._inclusive=r}static _create(e,t,r){return new Ol(e,t,r)}_apply(e){const t=cR(e,this.type,this._docOrFields,this._inclusive);return new Nt(e.firestore,e.converter,DT(e._query,t))}}function B0(...n){return Ol._create("startAfter",n,!1)}function cR(n,e,t,r){if(t[0]=G(t[0]),t[0]instanceof _i)return function(i,o,c,u,l){if(!u)throw new V(S.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${c}().`);const f=[];for(const p of Sr(i))if(p.field.isKeyField())f.push(Qn(o,u.key));else{const g=u.data.field(p.field);if(da(g))throw new V(S.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+p.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(g===null){const v=p.field.canonicalString();throw new V(S.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${v}' (used as the orderBy) does not exist.`)}f.push(g)}return new yn(f,l)}(n._query,n.firestore._databaseId,e,t[0]._document,r);{const s=hr(n.firestore);return function(o,c,u,l,f,p){const g=o.explicitOrderBy;if(f.length>g.length)throw new V(S.INVALID_ARGUMENT,`Too many arguments provided to ${l}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const v=[];for(let C=0;C<f.length;C++){const N=f[C];if(g[C].field.isKeyField()){if(typeof N!="string")throw new V(S.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${l}(), but got a ${typeof N}`);if(!ju(o)&&N.indexOf("/")!==-1)throw new V(S.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by documentId(), the value passed to ${l}() must be a plain document ID, but '${N}' contains a slash.`);const k=o.path.child(ne.fromString(N));if(!x.isDocumentKey(k))throw new V(S.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${l}() must result in a valid document path, but '${k}' is not because it contains an odd number of segments.`);const j=new x(k);v.push(Qn(c,j))}else{const k=h_(u,l,N);v.push(k)}}return new yn(v,p)}(n._query,n.firestore._databaseId,s,e,t,r)}}function Wf(n,e,t){if(typeof(t=G(t))=="string"){if(t==="")throw new V(S.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!ju(e)&&t.indexOf("/")!==-1)throw new V(S.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const r=e.path.child(ne.fromString(t));if(!x.isDocumentKey(r))throw new V(S.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);return Qn(n,new x(r))}if(t instanceof de)return Qn(n,t._key);throw new V(S.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${aa(t)}.`)}function Kf(n,e){if(!Array.isArray(n)||n.length===0)throw new V(S.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function y_(n,e){const t=function(s,i){for(const o of s)for(const c of o.getFlattenedFilters())if(i.indexOf(c.op)>=0)return c.op;return null}(n.filters,function(s){switch(s){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(t!==null)throw t===e.op?new V(S.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new V(S.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}function ka(n,e,t){let r;return r=n?t&&(t.merge||t.mergeFields)?n.toFirestore(e,t):n.toFirestore(e):e,r}class uR extends g_{constructor(e){super(),this.firestore=e}convertBytes(e){return new et(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new de(this.firestore,null,t)}}function lR(){return new iR("count")}/**
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
 */function q0(n){return hR(n,{count:lR()})}function hR(n,e){const t=Ve(n.firestore,ot),r=bn(t),s=mT(e,(i,o)=>new GT(o,i.aggregateType,i._internalFieldPath));return KA(r,n._query,s).then(i=>function(c,u,l){const f=new Oi(c);return new oR(u,f,l)}(t,n,i))}class dR{constructor(e){let t;this.kind="persistent",e!=null&&e.tabManager?(e.tabManager._initialize(e),t=e.tabManager):(t=mR(void 0),t._initialize(e)),this._onlineComponentProvider=t._onlineComponentProvider,this._offlineComponentProvider=t._offlineComponentProvider}toJSON(){return{kind:this.kind}}}function $0(n){return new dR(n)}class fR{constructor(e){this.forceOwnership=e,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=gi.provider,this._offlineComponentProvider={build:t=>new i_(t,e==null?void 0:e.cacheSizeBytes,this.forceOwnership)}}}class pR{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=gi.provider,this._offlineComponentProvider={build:t=>new UA(t,e==null?void 0:e.cacheSizeBytes)}}}function mR(n){return new fR(n==null?void 0:n.forceOwnership)}function j0(){return new pR}class Rr{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class pn extends _i{constructor(e,t,r,s,i,o){super(e,t,r,s,o),this._firestore=e,this._firestoreImpl=e,this.metadata=i}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new Ao(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const r=this._document.data.field(tr("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new V(S.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=pn._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}}pn._jsonSchemaVersion="firestore/documentSnapshot/1.0",pn._jsonSchema={type:ve("string",pn._jsonSchemaVersion),bundleSource:ve("string","DocumentSnapshot"),bundleName:ve("string"),bundle:ve("string")};class Ao extends pn{data(e={}){return super.data(e)}}class Gn{constructor(e,t,r,s){this._firestore=e,this._userDataWriter=t,this._snapshot=s,this.metadata=new Rr(s.hasPendingWrites,s.fromCache),this.query=r}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach(r=>{e.call(t,new Ao(this._firestore,this._userDataWriter,r.key,r,new Rr(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new V(S.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(s,i){if(s._snapshot.oldDocs.isEmpty()){let o=0;return s._snapshot.docChanges.map(c=>{const u=new Ao(s._firestore,s._userDataWriter,c.doc.key,c.doc,new Rr(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter);return c.doc,{type:"added",doc:u,oldIndex:-1,newIndex:o++}})}{let o=s._snapshot.oldDocs;return s._snapshot.docChanges.filter(c=>i||c.type!==3).map(c=>{const u=new Ao(s._firestore,s._userDataWriter,c.doc.key,c.doc,new Rr(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter);let l=-1,f=-1;return c.type!==0&&(l=o.indexOf(c.doc.key),o=o.delete(c.doc.key)),c.type!==1&&(o=o.add(c.doc),f=o.indexOf(c.doc.key)),{type:gR(c.type),doc:u,oldIndex:l,newIndex:f}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new V(S.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=Gn._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=Vu.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],r=[],s=[];return this.docs.forEach(i=>{i._document!==null&&(t.push(i._document),r.push(this._userDataWriter.convertObjectMap(i._document.data.value.mapValue.fields,"previous")),s.push(i.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function gR(n){switch(n){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return M(61501,{type:n})}}/**
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
 */Gn._jsonSchemaVersion="firestore/querySnapshot/1.0",Gn._jsonSchema={type:ve("string",Gn._jsonSchemaVersion),bundleSource:ve("string","QuerySnapshot"),bundleName:ve("string"),bundle:ve("string")};const _R={maxAttempts:5};/**
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
 */class yR{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=hr(e)}set(e,t,r){this._verifyNotCommitted();const s=cn(e,this._firestore),i=ka(s.converter,t,r),o=ba(this._dataReader,"WriteBatch.set",s._key,i,s.converter!==null,r);return this._mutations.push(o.toMutation(s._key,he.none())),this}update(e,t,r,...s){this._verifyNotCommitted();const i=cn(e,this._firestore);let o;return o=typeof(t=G(t))=="string"||t instanceof os?Pl(this._dataReader,"WriteBatch.update",i._key,t,r,s):Sl(this._dataReader,"WriteBatch.update",i._key,t),this._mutations.push(o.toMutation(i._key,he.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=cn(e,this._firestore);return this._mutations=this._mutations.concat(new ns(t._key,he.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new V(S.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function cn(n,e){if((n=G(n)).firestore!==e)throw new V(S.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return n}/**
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
 */class IR{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=hr(e)}get(e){const t=cn(e,this._firestore),r=new uR(this._firestore);return this._transaction.lookup([t._key]).then(s=>{if(!s||s.length!==1)return M(24041);const i=s[0];if(i.isFoundDocument())return new _i(this._firestore,r,i.key,i,t.converter);if(i.isNoDocument())return new _i(this._firestore,r,t._key,null,t.converter);throw M(18433,{doc:i})})}set(e,t,r){const s=cn(e,this._firestore),i=ka(s.converter,t,r),o=ba(this._dataReader,"Transaction.set",s._key,i,s.converter!==null,r);return this._transaction.set(s._key,o),this}update(e,t,r,...s){const i=cn(e,this._firestore);let o;return o=typeof(t=G(t))=="string"||t instanceof os?Pl(this._dataReader,"Transaction.update",i._key,t,r,s):Sl(this._dataReader,"Transaction.update",i._key,t),this._transaction.update(i._key,o),this}delete(e){const t=cn(e,this._firestore);return this._transaction.delete(t._key),this}}/**
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
 */class wR extends IR{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=cn(e,this._firestore),r=new Oi(this._firestore);return super.get(e).then(s=>new pn(this._firestore,r,t._key,s._document,new Rr(!1,!1),t.converter))}}function G0(n,e,t){n=Ve(n,ot);const r={..._R,...t};(function(o){if(o.maxAttempts<1)throw new V(S.INVALID_ARGUMENT,"Max attempts must be at least 1")})(r);const s=bn(n);return QA(s,i=>e(new wR(n,i)),r)}/**
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
 */function z0(n){n=Ve(n,de);const e=Ve(n.firestore,ot),t=bn(e);return a_(t,n._key).then(r=>xl(e,n,r))}function W0(n){n=Ve(n,de);const e=Ve(n.firestore,ot),t=bn(e);return a_(t,n._key,{source:"server"}).then(r=>xl(e,n,r))}function K0(n){n=Ve(n,Nt);const e=Ve(n.firestore,ot),t=bn(e),r=new Oi(e);return __(n._query),WA(t,n._query).then(s=>new Gn(e,r,n,s))}function H0(n,e,t){n=Ve(n,de);const r=Ve(n.firestore,ot),s=ka(n.converter,e,t),i=hr(r);return xi(r,[ba(i,"setDoc",n._key,s,n.converter!==null,t).toMutation(n._key,he.none())])}function Q0(n,e,t,...r){n=Ve(n,de);const s=Ve(n.firestore,ot),i=hr(s);let o;return o=typeof(e=G(e))=="string"||e instanceof os?Pl(i,"updateDoc",n._key,e,t,r):Sl(i,"updateDoc",n._key,e),xi(s,[o.toMutation(n._key,he.exists(!0))])}function J0(n){return xi(Ve(n.firestore,ot),[new ns(n._key,he.none())])}function Y0(n,e){const t=Ve(n.firestore,ot),r=ZA(n),s=ka(n.converter,e),i=hr(n.firestore);return xi(t,[ba(i,"addDoc",r._key,s,n.converter!==null,{}).toMutation(r._key,he.exists(!1))]).then(()=>r)}function X0(n,...e){var l,f,p;n=G(n);let t={includeMetadataChanges:!1,source:"default"},r=0;typeof e[r]!="object"||zf(e[r])||(t=e[r++]);const s={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(zf(e[r])){const g=e[r];e[r]=(l=g.next)==null?void 0:l.bind(g),e[r+1]=(f=g.error)==null?void 0:f.bind(g),e[r+2]=(p=g.complete)==null?void 0:p.bind(g)}let i,o,c;if(n instanceof de)o=Ve(n.firestore,ot),c=Pi(n._key.path),i={next:g=>{e[r]&&e[r](xl(o,n,g))},error:e[r+1],complete:e[r+2]};else{const g=Ve(n,Nt);o=Ve(g.firestore,ot),c=g._query;const v=new Oi(o);i={next:C=>{e[r]&&e[r](new Gn(o,v,g,C))},error:e[r+1],complete:e[r+2]},__(n._query)}const u=bn(o);return zA(u,c,s,i)}function xi(n,e){const t=bn(n);return HA(t,e)}function xl(n,e,t){const r=t.docs.get(e._key),s=new Oi(n);return new pn(n,s,e._key,r,new Rr(t.hasPendingWrites,t.fromCache),e.converter)}function Z0(n){return n=Ve(n,ot),bn(n),new yR(n,e=>xi(n,e))}(function(e,t=!0){bE(cr),ft(new st("firestore",(r,{instanceIdentifier:s,options:i})=>{const o=r.getProvider("app").getImmediate(),c=new ot(new CE(r.getProvider("auth-internal")),new DE(o,r.getProvider("app-check-internal")),yT(o,s),o);return i={useFetchStreams:t,...i},c._setSettings(i),c},"PUBLIC").setMultipleInstances(!0)),$e(jf,Gf,e),$e(jf,Gf,"esm2020")})();/**
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
 */const I_="firebasestorage.googleapis.com",w_="storageBucket",ER=2*60*1e3,TR=10*60*1e3;/**
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
 */class ge extends mt{constructor(e,t,r=0){super(kc(e),`Firebase Storage: ${t} (${kc(e)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,ge.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return kc(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var me;(function(n){n.UNKNOWN="unknown",n.OBJECT_NOT_FOUND="object-not-found",n.BUCKET_NOT_FOUND="bucket-not-found",n.PROJECT_NOT_FOUND="project-not-found",n.QUOTA_EXCEEDED="quota-exceeded",n.UNAUTHENTICATED="unauthenticated",n.UNAUTHORIZED="unauthorized",n.UNAUTHORIZED_APP="unauthorized-app",n.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",n.INVALID_CHECKSUM="invalid-checksum",n.CANCELED="canceled",n.INVALID_EVENT_NAME="invalid-event-name",n.INVALID_URL="invalid-url",n.INVALID_DEFAULT_BUCKET="invalid-default-bucket",n.NO_DEFAULT_BUCKET="no-default-bucket",n.CANNOT_SLICE_BLOB="cannot-slice-blob",n.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",n.NO_DOWNLOAD_URL="no-download-url",n.INVALID_ARGUMENT="invalid-argument",n.INVALID_ARGUMENT_COUNT="invalid-argument-count",n.APP_DELETED="app-deleted",n.INVALID_ROOT_OPERATION="invalid-root-operation",n.INVALID_FORMAT="invalid-format",n.INTERNAL_ERROR="internal-error",n.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(me||(me={}));function kc(n){return"storage/"+n}function Ll(){const n="An unknown error occurred, please check the error payload for server response.";return new ge(me.UNKNOWN,n)}function vR(n){return new ge(me.OBJECT_NOT_FOUND,"Object '"+n+"' does not exist.")}function AR(n){return new ge(me.QUOTA_EXCEEDED,"Quota for bucket '"+n+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function RR(){const n="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new ge(me.UNAUTHENTICATED,n)}function bR(){return new ge(me.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function SR(n){return new ge(me.UNAUTHORIZED,"User does not have permission to access '"+n+"'.")}function PR(){return new ge(me.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function CR(){return new ge(me.CANCELED,"User canceled the upload/download.")}function kR(n){return new ge(me.INVALID_URL,"Invalid URL '"+n+"'.")}function NR(n){return new ge(me.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+n+"'.")}function DR(){return new ge(me.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+w_+"' property when initializing the app?")}function VR(){return new ge(me.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function OR(){return new ge(me.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function xR(n){return new ge(me.UNSUPPORTED_ENVIRONMENT,`${n} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function Eu(n){return new ge(me.INVALID_ARGUMENT,n)}function E_(){return new ge(me.APP_DELETED,"The Firebase app was deleted.")}function LR(n){return new ge(me.INVALID_ROOT_OPERATION,"The operation '"+n+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function Js(n,e){return new ge(me.INVALID_FORMAT,"String does not match format '"+n+"': "+e)}function Ns(n){throw new ge(me.INTERNAL_ERROR,"Internal error: "+n)}/**
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
 */class nt{constructor(e,t){this.bucket=e,this.path_=t}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,t){let r;try{r=nt.makeFromUrl(e,t)}catch{return new nt(e,"")}if(r.path==="")return r;throw NR(e)}static makeFromUrl(e,t){let r=null;const s="([A-Za-z0-9.\\-_]+)";function i(W){W.path.charAt(W.path.length-1)==="/"&&(W.path_=W.path_.slice(0,-1))}const o="(/(.*))?$",c=new RegExp("^gs://"+s+o,"i"),u={bucket:1,path:3};function l(W){W.path_=decodeURIComponent(W.path)}const f="v[A-Za-z0-9_]+",p=t.replace(/[.]/g,"\\."),g="(/([^?#]*).*)?$",v=new RegExp(`^https?://${p}/${f}/b/${s}/o${g}`,"i"),C={bucket:1,path:3},N=t===I_?"(?:storage.googleapis.com|storage.cloud.google.com)":t,k="([^?#]*)",j=new RegExp(`^https?://${N}/${s}/${k}`,"i"),B=[{regex:c,indices:u,postModify:i},{regex:v,indices:C,postModify:l},{regex:j,indices:{bucket:1,path:2},postModify:l}];for(let W=0;W<B.length;W++){const Q=B[W],J=Q.regex.exec(e);if(J){const w=J[Q.indices.bucket];let _=J[Q.indices.path];_||(_=""),r=new nt(w,_),Q.postModify(r);break}}if(r==null)throw kR(e);return r}}class MR{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
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
 */function FR(n,e,t){let r=1,s=null,i=null,o=!1,c=0;function u(){return c===2}let l=!1;function f(...k){l||(l=!0,e.apply(null,k))}function p(k){s=setTimeout(()=>{s=null,n(v,u())},k)}function g(){i&&clearTimeout(i)}function v(k,...j){if(l){g();return}if(k){g(),f.call(null,k,...j);return}if(u()||o){g(),f.call(null,k,...j);return}r<64&&(r*=2);let B;c===1?(c=2,B=0):B=(r+Math.random())*1e3,p(B)}let C=!1;function N(k){C||(C=!0,g(),!l&&(s!==null?(k||(c=2),clearTimeout(s),p(0)):k||(c=1)))}return p(0),i=setTimeout(()=>{o=!0,N(!0)},t),N}function UR(n){n(!1)}/**
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
 */function BR(n){return n!==void 0}function qR(n){return typeof n=="object"&&!Array.isArray(n)}function Ml(n){return typeof n=="string"||n instanceof String}function Hf(n){return Fl()&&n instanceof Blob}function Fl(){return typeof Blob<"u"}function Qf(n,e,t,r){if(r<e)throw Eu(`Invalid value for '${n}'. Expected ${e} or greater.`);if(r>t)throw Eu(`Invalid value for '${n}'. Expected ${t} or less.`)}/**
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
 */function Ul(n,e,t){let r=e;return t==null&&(r=`https://${e}`),`${t}://${r}/v0${n}`}function T_(n){const e=encodeURIComponent;let t="?";for(const r in n)if(n.hasOwnProperty(r)){const s=e(r)+"="+e(n[r]);t=t+s+"&"}return t=t.slice(0,-1),t}var zn;(function(n){n[n.NO_ERROR=0]="NO_ERROR",n[n.NETWORK_ERROR=1]="NETWORK_ERROR",n[n.ABORT=2]="ABORT"})(zn||(zn={}));/**
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
 */function $R(n,e){const t=n>=500&&n<600,s=[408,429].indexOf(n)!==-1,i=e.indexOf(n)!==-1;return t||s||i}/**
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
 */class jR{constructor(e,t,r,s,i,o,c,u,l,f,p,g=!0,v=!1){this.url_=e,this.method_=t,this.headers_=r,this.body_=s,this.successCodes_=i,this.additionalRetryCodes_=o,this.callback_=c,this.errorCallback_=u,this.timeout_=l,this.progressCallback_=f,this.connectionFactory_=p,this.retry=g,this.isUsingEmulator=v,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((C,N)=>{this.resolve_=C,this.reject_=N,this.start_()})}start_(){const e=(r,s)=>{if(s){r(!1,new co(!1,null,!0));return}const i=this.connectionFactory_();this.pendingConnection_=i;const o=c=>{const u=c.loaded,l=c.lengthComputable?c.total:-1;this.progressCallback_!==null&&this.progressCallback_(u,l)};this.progressCallback_!==null&&i.addUploadProgressListener(o),i.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&i.removeUploadProgressListener(o),this.pendingConnection_=null;const c=i.getErrorCode()===zn.NO_ERROR,u=i.getStatus();if(!c||$R(u,this.additionalRetryCodes_)&&this.retry){const f=i.getErrorCode()===zn.ABORT;r(!1,new co(!1,null,f));return}const l=this.successCodes_.indexOf(u)!==-1;r(!0,new co(l,i))})},t=(r,s)=>{const i=this.resolve_,o=this.reject_,c=s.connection;if(s.wasSuccessCode)try{const u=this.callback_(c,c.getResponse());BR(u)?i(u):i()}catch(u){o(u)}else if(c!==null){const u=Ll();u.serverResponse=c.getErrorText(),this.errorCallback_?o(this.errorCallback_(c,u)):o(u)}else if(s.canceled){const u=this.appDelete_?E_():CR();o(u)}else{const u=PR();o(u)}};this.canceled_?t(!1,new co(!1,null,!0)):this.backoffId_=FR(e,t,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&UR(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class co{constructor(e,t,r){this.wasSuccessCode=e,this.connection=t,this.canceled=!!r}}function GR(n,e){e!==null&&e.length>0&&(n.Authorization="Firebase "+e)}function zR(n,e){n["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function WR(n,e){e&&(n["X-Firebase-GMPID"]=e)}function KR(n,e){e!==null&&(n["X-Firebase-AppCheck"]=e)}function HR(n,e,t,r,s,i,o=!0,c=!1){const u=T_(n.urlParams),l=n.url+u,f=Object.assign({},n.headers);return WR(f,e),GR(f,t),zR(f,i),KR(f,r),new jR(l,n.method,f,n.body,n.successCodes,n.additionalRetryCodes,n.handler,n.errorHandler,n.timeout,n.progressCallback,s,o,c)}/**
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
 */function QR(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function JR(...n){const e=QR();if(e!==void 0){const t=new e;for(let r=0;r<n.length;r++)t.append(n[r]);return t.getBlob()}else{if(Fl())return new Blob(n);throw new ge(me.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function YR(n,e,t){return n.webkitSlice?n.webkitSlice(e,t):n.mozSlice?n.mozSlice(e,t):n.slice?n.slice(e,t):null}/**
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
 */function XR(n){if(typeof atob>"u")throw xR("base-64");return atob(n)}/**
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
 */const Rt={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class Nc{constructor(e,t){this.data=e,this.contentType=t||null}}function ZR(n,e){switch(n){case Rt.RAW:return new Nc(v_(e));case Rt.BASE64:case Rt.BASE64URL:return new Nc(A_(n,e));case Rt.DATA_URL:return new Nc(tb(e),nb(e))}throw Ll()}function v_(n){const e=[];for(let t=0;t<n.length;t++){let r=n.charCodeAt(t);if(r<=127)e.push(r);else if(r<=2047)e.push(192|r>>6,128|r&63);else if((r&64512)===55296)if(!(t<n.length-1&&(n.charCodeAt(t+1)&64512)===56320))e.push(239,191,189);else{const i=r,o=n.charCodeAt(++t);r=65536|(i&1023)<<10|o&1023,e.push(240|r>>18,128|r>>12&63,128|r>>6&63,128|r&63)}else(r&64512)===56320?e.push(239,191,189):e.push(224|r>>12,128|r>>6&63,128|r&63)}return new Uint8Array(e)}function eb(n){let e;try{e=decodeURIComponent(n)}catch{throw Js(Rt.DATA_URL,"Malformed data URL.")}return v_(e)}function A_(n,e){switch(n){case Rt.BASE64:{const s=e.indexOf("-")!==-1,i=e.indexOf("_")!==-1;if(s||i)throw Js(n,"Invalid character '"+(s?"-":"_")+"' found: is it base64url encoded?");break}case Rt.BASE64URL:{const s=e.indexOf("+")!==-1,i=e.indexOf("/")!==-1;if(s||i)throw Js(n,"Invalid character '"+(s?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");break}}let t;try{t=XR(e)}catch(s){throw s.message.includes("polyfill")?s:Js(n,"Invalid character found")}const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=t.charCodeAt(s);return r}class R_{constructor(e){this.base64=!1,this.contentType=null;const t=e.match(/^data:([^,]+)?,/);if(t===null)throw Js(Rt.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const r=t[1]||null;r!=null&&(this.base64=rb(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-7):r),this.rest=e.substring(e.indexOf(",")+1)}}function tb(n){const e=new R_(n);return e.base64?A_(Rt.BASE64,e.rest):eb(e.rest)}function nb(n){return new R_(n).contentType}function rb(n,e){return n.length>=e.length?n.substring(n.length-e.length)===e:!1}/**
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
 */class on{constructor(e,t){let r=0,s="";Hf(e)?(this.data_=e,r=e.size,s=e.type):e instanceof ArrayBuffer?(t?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),r=this.data_.length):e instanceof Uint8Array&&(t?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),r=e.length),this.size_=r,this.type_=s}size(){return this.size_}type(){return this.type_}slice(e,t){if(Hf(this.data_)){const r=this.data_,s=YR(r,e,t);return s===null?null:new on(s)}else{const r=new Uint8Array(this.data_.buffer,e,t-e);return new on(r,!0)}}static getBlob(...e){if(Fl()){const t=e.map(r=>r instanceof on?r.data_:r);return new on(JR.apply(null,t))}else{const t=e.map(o=>Ml(o)?ZR(Rt.RAW,o).data:o.data_);let r=0;t.forEach(o=>{r+=o.byteLength});const s=new Uint8Array(r);let i=0;return t.forEach(o=>{for(let c=0;c<o.length;c++)s[i++]=o[c]}),new on(s,!0)}}uploadData(){return this.data_}}/**
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
 */function b_(n){let e;try{e=JSON.parse(n)}catch{return null}return qR(e)?e:null}/**
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
 */function sb(n){if(n.length===0)return null;const e=n.lastIndexOf("/");return e===-1?"":n.slice(0,e)}function ib(n,e){const t=e.split("/").filter(r=>r.length>0).join("/");return n.length===0?t:n+"/"+t}function S_(n){const e=n.lastIndexOf("/",n.length-2);return e===-1?n:n.slice(e+1)}/**
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
 */function ob(n,e){return e}class We{constructor(e,t,r,s){this.server=e,this.local=t||e,this.writable=!!r,this.xform=s||ob}}let uo=null;function ab(n){return!Ml(n)||n.length<2?n:S_(n)}function P_(){if(uo)return uo;const n=[];n.push(new We("bucket")),n.push(new We("generation")),n.push(new We("metageneration")),n.push(new We("name","fullPath",!0));function e(i,o){return ab(o)}const t=new We("name");t.xform=e,n.push(t);function r(i,o){return o!==void 0?Number(o):o}const s=new We("size");return s.xform=r,n.push(s),n.push(new We("timeCreated")),n.push(new We("updated")),n.push(new We("md5Hash",null,!0)),n.push(new We("cacheControl",null,!0)),n.push(new We("contentDisposition",null,!0)),n.push(new We("contentEncoding",null,!0)),n.push(new We("contentLanguage",null,!0)),n.push(new We("contentType",null,!0)),n.push(new We("metadata","customMetadata",!0)),uo=n,uo}function cb(n,e){function t(){const r=n.bucket,s=n.fullPath,i=new nt(r,s);return e._makeStorageReference(i)}Object.defineProperty(n,"ref",{get:t})}function ub(n,e,t){const r={};r.type="file";const s=t.length;for(let i=0;i<s;i++){const o=t[i];r[o.local]=o.xform(r,e[o.server])}return cb(r,n),r}function C_(n,e,t){const r=b_(e);return r===null?null:ub(n,r,t)}function lb(n,e,t,r){const s=b_(e);if(s===null||!Ml(s.downloadTokens))return null;const i=s.downloadTokens;if(i.length===0)return null;const o=encodeURIComponent;return i.split(",").map(l=>{const f=n.bucket,p=n.fullPath,g="/b/"+o(f)+"/o/"+o(p),v=Ul(g,t,r),C=T_({alt:"media",token:l});return v+C})[0]}function hb(n,e){const t={},r=e.length;for(let s=0;s<r;s++){const i=e[s];i.writable&&(t[i.server]=n[i.local])}return JSON.stringify(t)}class k_{constructor(e,t,r,s){this.url=e,this.method=t,this.handler=r,this.timeout=s,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
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
 */function N_(n){if(!n)throw Ll()}function db(n,e){function t(r,s){const i=C_(n,s,e);return N_(i!==null),i}return t}function fb(n,e){function t(r,s){const i=C_(n,s,e);return N_(i!==null),lb(i,s,n.host,n._protocol)}return t}function D_(n){function e(t,r){let s;return t.getStatus()===401?t.getErrorText().includes("Firebase App Check token is invalid")?s=bR():s=RR():t.getStatus()===402?s=AR(n.bucket):t.getStatus()===403?s=SR(n.path):s=r,s.status=t.getStatus(),s.serverResponse=r.serverResponse,s}return e}function pb(n){const e=D_(n);function t(r,s){let i=e(r,s);return r.getStatus()===404&&(i=vR(n.path)),i.serverResponse=s.serverResponse,i}return t}function mb(n,e,t){const r=e.fullServerUrl(),s=Ul(r,n.host,n._protocol),i="GET",o=n.maxOperationRetryTime,c=new k_(s,i,fb(n,t),o);return c.errorHandler=pb(e),c}function gb(n,e){return n&&n.contentType||e&&e.type()||"application/octet-stream"}function _b(n,e,t){const r=Object.assign({},t);return r.fullPath=n.path,r.size=e.size(),r.contentType||(r.contentType=gb(null,e)),r}function yb(n,e,t,r,s){const i=e.bucketOnlyServerUrl(),o={"X-Goog-Upload-Protocol":"multipart"};function c(){let B="";for(let W=0;W<2;W++)B=B+Math.random().toString().slice(2);return B}const u=c();o["Content-Type"]="multipart/related; boundary="+u;const l=_b(e,r,s),f=hb(l,t),p="--"+u+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+f+`\r
--`+u+`\r
Content-Type: `+l.contentType+`\r
\r
`,g=`\r
--`+u+"--",v=on.getBlob(p,r,g);if(v===null)throw VR();const C={name:l.fullPath},N=Ul(i,n.host,n._protocol),k="POST",j=n.maxUploadRetryTime,q=new k_(N,k,db(n,t),j);return q.urlParams=C,q.headers=o,q.body=v.uploadData(),q.errorHandler=D_(e),q}class Ib{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=zn.NO_ERROR,this.sendPromise_=new Promise(e=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=zn.ABORT,e()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=zn.NETWORK_ERROR,e()}),this.xhr_.addEventListener("load",()=>{e()})})}send(e,t,r,s,i){if(this.sent_)throw Ns("cannot .send() more than once");if(kt(e)&&r&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(t,e,!0),i!==void 0)for(const o in i)i.hasOwnProperty(o)&&this.xhr_.setRequestHeader(o,i[o].toString());return s!==void 0?this.xhr_.send(s):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw Ns("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw Ns("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw Ns("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw Ns("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(e){return this.xhr_.getResponseHeader(e)}addUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",e)}removeUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",e)}}class wb extends Ib{initXhr(){this.xhr_.responseType="text"}}function V_(){return new wb}/**
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
 */class nr{constructor(e,t){this._service=e,t instanceof nt?this._location=t:this._location=nt.makeFromUrl(t,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,t){return new nr(e,t)}get root(){const e=new nt(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return S_(this._location.path)}get storage(){return this._service}get parent(){const e=sb(this._location.path);if(e===null)return null;const t=new nt(this._location.bucket,e);return new nr(this._service,t)}_throwIfRoot(e){if(this._location.path==="")throw LR(e)}}function Eb(n,e,t){n._throwIfRoot("uploadBytes");const r=yb(n.storage,n._location,P_(),new on(e,!0),t);return n.storage.makeRequestWithTokens(r,V_).then(s=>({metadata:s,ref:n}))}function Tb(n){n._throwIfRoot("getDownloadURL");const e=mb(n.storage,n._location,P_());return n.storage.makeRequestWithTokens(e,V_).then(t=>{if(t===null)throw OR();return t})}function vb(n,e){const t=ib(n._location.path,e),r=new nt(n._location.bucket,t);return new nr(n.storage,r)}/**
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
 */function Ab(n){return/^[A-Za-z]+:\/\//.test(n)}function Rb(n,e){return new nr(n,e)}function O_(n,e){if(n instanceof Bl){const t=n;if(t._bucket==null)throw DR();const r=new nr(t,t._bucket);return e!=null?O_(r,e):r}else return e!==void 0?vb(n,e):n}function bb(n,e){if(e&&Ab(e)){if(n instanceof Bl)return Rb(n,e);throw Eu("To use ref(service, url), the first argument must be a Storage instance.")}else return O_(n,e)}function Jf(n,e){const t=e==null?void 0:e[w_];return t==null?null:nt.makeFromBucketSpec(t,n)}function Sb(n,e,t,r={}){n.host=`${e}:${t}`;const s=kt(e);s&&(sa(`https://${n.host}/b`),Pu("Storage",!0)),n._isUsingEmulator=!0,n._protocol=s?"https":"http";const{mockUserToken:i}=r;i&&(n._overrideAuthToken=typeof i=="string"?i:GI(i,n.app.options.projectId))}class Bl{constructor(e,t,r,s,i,o=!1){this.app=e,this._authProvider=t,this._appCheckProvider=r,this._url=s,this._firebaseVersion=i,this._isUsingEmulator=o,this._bucket=null,this._host=I_,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=ER,this._maxUploadRetryTime=TR,this._requests=new Set,s!=null?this._bucket=nt.makeFromBucketSpec(s,this._host):this._bucket=Jf(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=nt.makeFromBucketSpec(this._url,e):this._bucket=Jf(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){Qf("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){Qf("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const t=await e.getToken();if(t!==null)return t.accessToken}return null}async _getAppCheckToken(){if(ye(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new nr(this,e)}_makeRequest(e,t,r,s,i=!0){if(this._deleted)return new MR(E_());{const o=HR(e,this._appId,r,s,t,this._firebaseVersion,i,this._isUsingEmulator);return this._requests.add(o),o.getPromise().then(()=>this._requests.delete(o),()=>this._requests.delete(o)),o}}async makeRequestWithTokens(e,t){const[r,s]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,t,r,s).getPromise()}}const Yf="@firebase/storage",Xf="0.14.0";/**
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
 */const x_="storage";function eN(n,e,t){return n=G(n),Eb(n,e,t)}function tN(n){return n=G(n),Tb(n)}function nN(n,e){return n=G(n),bb(n,e)}function rN(n=oa(),e){n=G(n);const r=En(n,x_).getImmediate({identifier:e}),s=qp("storage");return s&&Pb(r,...s),r}function Pb(n,e,t,r={}){Sb(n,e,t,r)}function Cb(n,{instanceIdentifier:e}){const t=n.getProvider("app").getImmediate(),r=n.getProvider("auth-internal"),s=n.getProvider("app-check-internal");return new Bl(t,r,s,e,cr)}function kb(){ft(new st(x_,Cb,"PUBLIC").setMultipleInstances(!0)),$e(Yf,Xf,""),$e(Yf,Xf,"esm2020")}kb();function L_(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const Nb=L_,M_=new ar("auth","Firebase",L_());/**
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
 */const Qo=new ku("@firebase/auth");function Db(n,...e){Qo.logLevel<=X.WARN&&Qo.warn(`Auth (${cr}): ${n}`,...e)}function Ro(n,...e){Qo.logLevel<=X.ERROR&&Qo.error(`Auth (${cr}): ${n}`,...e)}/**
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
 */function pt(n,...e){throw $l(n,...e)}function Ye(n,...e){return $l(n,...e)}function ql(n,e,t){const r={...Nb(),[e]:t};return new ar("auth","Firebase",r).create(e,{appName:n.name})}function Ke(n){return ql(n,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function Na(n,e,t){const r=t;if(!(e instanceof r))throw r.name!==e.constructor.name&&pt(n,"argument-error"),ql(n,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function $l(n,...e){if(typeof n!="string"){const t=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=n.name),n._errorFactory.create(t,...r)}return M_.create(n,...e)}function L(n,e,...t){if(!n)throw $l(e,...t)}function Ot(n){const e="INTERNAL ASSERTION FAILED: "+n;throw Ro(e),new Error(e)}function qt(n,e){n||Ot(e)}/**
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
 */function yi(){var n;return typeof self<"u"&&((n=self.location)==null?void 0:n.href)||""}function jl(){return Zf()==="http:"||Zf()==="https:"}function Zf(){var n;return typeof self<"u"&&((n=self.location)==null?void 0:n.protocol)||null}/**
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
 */function Vb(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(jl()||QI()||"connection"in navigator)?navigator.onLine:!0}function Ob(){if(typeof navigator>"u")return null;const n=navigator;return n.languages&&n.languages[0]||n.language||null}/**
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
 */class Li{constructor(e,t){this.shortDelay=e,this.longDelay=t,qt(t>e,"Short delay should be less than long delay!"),this.isMobile=KI()||JI()}get(){return Vb()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
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
 */function Gl(n,e){qt(n.emulator,"Emulator should always be set here");const{url:t}=n.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
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
 */class F_{static initialize(e,t,r){this.fetchImpl=e,t&&(this.headersImpl=t),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;Ot("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;Ot("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;Ot("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
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
 */const xb={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
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
 */const Lb=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],Mb=new Li(3e4,6e4);function Pe(n,e){return n.tenantId&&!e.tenantId?{...e,tenantId:n.tenantId}:e}async function Ce(n,e,t,r,s={}){return U_(n,s,async()=>{let i={},o={};r&&(e==="GET"?o=r:i={body:JSON.stringify(r)});const c=Zr({key:n.config.apiKey,...o}).slice(1),u=await n._getAdditionalHeaders();u["Content-Type"]="application/json",n.languageCode&&(u["X-Firebase-Locale"]=n.languageCode);const l={method:e,headers:u,...i};return HI()||(l.referrerPolicy="no-referrer"),n.emulatorConfig&&kt(n.emulatorConfig.host)&&(l.credentials="include"),F_.fetch()(await B_(n,n.config.apiHost,t,c),l)})}async function U_(n,e,t){n._canInitEmulator=!1;const r={...xb,...e};try{const s=new Ub(n),i=await Promise.race([t(),s.promise]);s.clearNetworkTimeout();const o=await i.json();if("needConfirmation"in o)throw Us(n,"account-exists-with-different-credential",o);if(i.ok&&!("errorMessage"in o))return o;{const c=i.ok?o.errorMessage:o.error.message,[u,l]=c.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw Us(n,"credential-already-in-use",o);if(u==="EMAIL_EXISTS")throw Us(n,"email-already-in-use",o);if(u==="USER_DISABLED")throw Us(n,"user-disabled",o);const f=r[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(l)throw ql(n,f,l);pt(n,f)}}catch(s){if(s instanceof mt)throw s;pt(n,"network-request-failed",{message:String(s)})}}async function zt(n,e,t,r,s={}){const i=await Ce(n,e,t,r,s);return"mfaPendingCredential"in i&&pt(n,"multi-factor-auth-required",{_serverResponse:i}),i}async function B_(n,e,t,r){const s=`${e}${t}?${r}`,i=n,o=i.config.emulator?Gl(n.config,s):`${n.config.apiScheme}://${s}`;return Lb.includes(t)&&(await i._persistenceManagerAvailable,i._getPersistenceType()==="COOKIE")?i._getPersistence()._getFinalTarget(o).toString():o}function Fb(n){switch(n){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class Ub{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,r)=>{this.timer=setTimeout(()=>r(Ye(this.auth,"network-request-failed")),Mb.get())})}}function Us(n,e,t){const r={appName:n.name};t.email&&(r.email=t.email),t.phoneNumber&&(r.phoneNumber=t.phoneNumber);const s=Ye(n,e,r);return s.customData._tokenResponse=t,s}/**
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
 */function ep(n){return n!==void 0&&n.getResponse!==void 0}function tp(n){return n!==void 0&&n.enterprise!==void 0}class q_{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return Fb(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}/**
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
 */async function Bb(n){return(await Ce(n,"GET","/v1/recaptchaParams")).recaptchaSiteKey||""}async function $_(n,e){return Ce(n,"GET","/v2/recaptchaConfig",Pe(n,e))}/**
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
 */async function qb(n,e){return Ce(n,"POST","/v1/accounts:delete",e)}async function $b(n,e){return Ce(n,"POST","/v1/accounts:update",e)}async function Jo(n,e){return Ce(n,"POST","/v1/accounts:lookup",e)}/**
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
 */function Ys(n){if(n)try{const e=new Date(Number(n));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function jb(n,e=!1){const t=G(n),r=await t.getIdToken(e),s=Da(r);L(s&&s.exp&&s.auth_time&&s.iat,t.auth,"internal-error");const i=typeof s.firebase=="object"?s.firebase:void 0,o=i==null?void 0:i.sign_in_provider;return{claims:s,token:r,authTime:Ys(Dc(s.auth_time)),issuedAtTime:Ys(Dc(s.iat)),expirationTime:Ys(Dc(s.exp)),signInProvider:o||null,signInSecondFactor:(i==null?void 0:i.sign_in_second_factor)||null}}function Dc(n){return Number(n)*1e3}function Da(n){const[e,t,r]=n.split(".");if(e===void 0||t===void 0||r===void 0)return Ro("JWT malformed, contained fewer than 3 sections"),null;try{const s=Fp(t);return s?JSON.parse(s):(Ro("Failed to decode base64 JWT payload"),null)}catch(s){return Ro("Caught error parsing JWT payload as JSON",s==null?void 0:s.toString()),null}}function np(n){const e=Da(n);return L(e,"internal-error"),L(typeof e.exp<"u","internal-error"),L(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
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
 */async function rr(n,e,t=!1){if(t)return e;try{return await e}catch(r){throw r instanceof mt&&Gb(r)&&n.auth.currentUser===n&&await n.auth.signOut(),r}}function Gb({code:n}){return n==="auth/user-disabled"||n==="auth/user-token-expired"}/**
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
 */class zb{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const r=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,r)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
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
 */class Tu{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=Ys(this.lastLoginAt),this.creationTime=Ys(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function Ii(n){var p;const e=n.auth,t=await n.getIdToken(),r=await rr(n,Jo(e,{idToken:t}));L(r==null?void 0:r.users.length,e,"internal-error");const s=r.users[0];n._notifyReloadListener(s);const i=(p=s.providerUserInfo)!=null&&p.length?G_(s.providerUserInfo):[],o=Wb(n.providerData,i),c=n.isAnonymous,u=!(n.email&&s.passwordHash)&&!(o!=null&&o.length),l=c?u:!1,f={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:o,metadata:new Tu(s.createdAt,s.lastLoginAt),isAnonymous:l};Object.assign(n,f)}async function j_(n){const e=G(n);await Ii(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function Wb(n,e){return[...n.filter(r=>!e.some(s=>s.providerId===r.providerId)),...e]}function G_(n){return n.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
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
 */async function Kb(n,e){const t=await U_(n,{},async()=>{const r=Zr({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:s,apiKey:i}=n.config,o=await B_(n,s,"/v1/token",`key=${i}`),c=await n._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const u={method:"POST",headers:c,body:r};return n.emulatorConfig&&kt(n.emulatorConfig.host)&&(u.credentials="include"),F_.fetch()(o,u)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function Hb(n,e){return Ce(n,"POST","/v2/accounts:revokeToken",Pe(n,e))}/**
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
 */class kr{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){L(e.idToken,"internal-error"),L(typeof e.idToken<"u","internal-error"),L(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):np(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){L(e.length!==0,"internal-error");const t=np(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(L(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:r,refreshToken:s,expiresIn:i}=await Kb(e,t);this.updateTokensAndExpiration(r,s,Number(i))}updateTokensAndExpiration(e,t,r){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,t){const{refreshToken:r,accessToken:s,expirationTime:i}=t,o=new kr;return r&&(L(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),s&&(L(typeof s=="string","internal-error",{appName:e}),o.accessToken=s),i&&(L(typeof i=="number","internal-error",{appName:e}),o.expirationTime=i),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new kr,this.toJSON())}_performRefresh(){return Ot("not implemented")}}/**
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
 */function tn(n,e){L(typeof n=="string"||typeof n>"u","internal-error",{appName:e})}class _t{constructor({uid:e,auth:t,stsTokenManager:r,...s}){this.providerId="firebase",this.proactiveRefresh=new zb(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new Tu(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const t=await rr(this,this.stsTokenManager.getToken(this.auth,e));return L(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return jb(this,e)}reload(){return j_(this)}_assign(e){this!==e&&(L(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new _t({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){L(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),t&&await Ii(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(ye(this.auth.app))return Promise.reject(Ke(this.auth));const e=await this.getIdToken();return await rr(this,qb(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const r=t.displayName??void 0,s=t.email??void 0,i=t.phoneNumber??void 0,o=t.photoURL??void 0,c=t.tenantId??void 0,u=t._redirectEventId??void 0,l=t.createdAt??void 0,f=t.lastLoginAt??void 0,{uid:p,emailVerified:g,isAnonymous:v,providerData:C,stsTokenManager:N}=t;L(p&&N,e,"internal-error");const k=kr.fromJSON(this.name,N);L(typeof p=="string",e,"internal-error"),tn(r,e.name),tn(s,e.name),L(typeof g=="boolean",e,"internal-error"),L(typeof v=="boolean",e,"internal-error"),tn(i,e.name),tn(o,e.name),tn(c,e.name),tn(u,e.name),tn(l,e.name),tn(f,e.name);const j=new _t({uid:p,auth:e,email:s,emailVerified:g,displayName:r,isAnonymous:v,photoURL:o,phoneNumber:i,tenantId:c,stsTokenManager:k,createdAt:l,lastLoginAt:f});return C&&Array.isArray(C)&&(j.providerData=C.map(q=>({...q}))),u&&(j._redirectEventId=u),j}static async _fromIdTokenResponse(e,t,r=!1){const s=new kr;s.updateFromServerResponse(t);const i=new _t({uid:t.localId,auth:e,stsTokenManager:s,isAnonymous:r});return await Ii(i),i}static async _fromGetAccountInfoResponse(e,t,r){const s=t.users[0];L(s.localId!==void 0,"internal-error");const i=s.providerUserInfo!==void 0?G_(s.providerUserInfo):[],o=!(s.email&&s.passwordHash)&&!(i!=null&&i.length),c=new kr;c.updateFromIdToken(r);const u=new _t({uid:s.localId,auth:e,stsTokenManager:c,isAnonymous:o}),l={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:i,metadata:new Tu(s.createdAt,s.lastLoginAt),isAnonymous:!(s.email&&s.passwordHash)&&!(i!=null&&i.length)};return Object.assign(u,l),u}}/**
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
 */const rp=new Map;function xt(n){qt(n instanceof Function,"Expected a class definition");let e=rp.get(n);return e?(qt(e instanceof n,"Instance stored in cache mismatched with class"),e):(e=new n,rp.set(n,e),e)}/**
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
 */class z_{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}z_.type="NONE";const vu=z_;/**
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
 */function bo(n,e,t){return`firebase:${n}:${e}:${t}`}class Nr{constructor(e,t,r){this.persistence=e,this.auth=t,this.userKey=r;const{config:s,name:i}=this.auth;this.fullUserKey=bo(this.userKey,s.apiKey,i),this.fullPersistenceKey=bo("persistence",s.apiKey,i),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await Jo(this.auth,{idToken:e}).catch(()=>{});return t?_t._fromGetAccountInfoResponse(this.auth,t,e):null}return _t._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,r="authUser"){if(!t.length)return new Nr(xt(vu),e,r);const s=(await Promise.all(t.map(async l=>{if(await l._isAvailable())return l}))).filter(l=>l);let i=s[0]||xt(vu);const o=bo(r,e.config.apiKey,e.name);let c=null;for(const l of t)try{const f=await l._get(o);if(f){let p;if(typeof f=="string"){const g=await Jo(e,{idToken:f}).catch(()=>{});if(!g)break;p=await _t._fromGetAccountInfoResponse(e,g,f)}else p=_t._fromJSON(e,f);l!==i&&(c=p),i=l;break}}catch{}const u=s.filter(l=>l._shouldAllowMigration);return!i._shouldAllowMigration||!u.length?new Nr(i,e,r):(i=u[0],c&&await i._set(o,c.toJSON()),await Promise.all(t.map(async l=>{if(l!==i)try{await l._remove(o)}catch{}})),new Nr(i,e,r))}}/**
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
 */function sp(n){const e=n.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Q_(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(W_(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Y_(e))return"Blackberry";if(X_(e))return"Webos";if(K_(e))return"Safari";if((e.includes("chrome/")||H_(e))&&!e.includes("edge/"))return"Chrome";if(J_(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=n.match(t);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function W_(n=be()){return/firefox\//i.test(n)}function K_(n=be()){const e=n.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function H_(n=be()){return/crios\//i.test(n)}function Q_(n=be()){return/iemobile/i.test(n)}function J_(n=be()){return/android/i.test(n)}function Y_(n=be()){return/blackberry/i.test(n)}function X_(n=be()){return/webos/i.test(n)}function zl(n=be()){return/iphone|ipad|ipod/i.test(n)||/macintosh/i.test(n)&&/mobile/i.test(n)}function Qb(n=be()){var e;return zl(n)&&!!((e=window.navigator)!=null&&e.standalone)}function Jb(){return YI()&&document.documentMode===10}function Z_(n=be()){return zl(n)||J_(n)||X_(n)||Y_(n)||/windows phone/i.test(n)||Q_(n)}/**
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
 */function ey(n,e=[]){let t;switch(n){case"Browser":t=sp(be());break;case"Worker":t=`${sp(be())}-${n}`;break;default:t=n}const r=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${cr}/${r}`}/**
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
 */class Yb{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const r=i=>new Promise((o,c)=>{try{const u=e(i);o(u)}catch(u){c(u)}});r.onAbort=t,this.queue.push(r);const s=this.queue.length-1;return()=>{this.queue[s]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const r of this.queue)await r(e),r.onAbort&&t.push(r.onAbort)}catch(r){t.reverse();for(const s of t)try{s()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
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
 */async function Xb(n,e={}){return Ce(n,"GET","/v2/passwordPolicy",Pe(n,e))}/**
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
 */const Zb=6;class eS{constructor(e){var r;const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??Zb,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((r=e.allowedNonAlphanumericCharacters)==null?void 0:r.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const r=this.customStrengthOptions.minPasswordLength,s=this.customStrengthOptions.maxPasswordLength;r&&(t.meetsMinPasswordLength=e.length>=r),s&&(t.meetsMaxPasswordLength=e.length<=s)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let r;for(let s=0;s<e.length;s++)r=e.charAt(s),this.updatePasswordCharacterOptionsStatuses(t,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,t,r,s,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=s)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}/**
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
 */class tS{constructor(e,t,r,s){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=r,this.config=s,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new ip(this),this.idTokenSubscription=new ip(this),this.beforeStateQueue=new Yb(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=M_,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=s.sdkClientVersion,this._persistenceManagerAvailable=new Promise(i=>this._resolvePersistenceManagerAvailable=i)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=xt(t)),this._initializationPromise=this.queue(async()=>{var r,s,i;if(!this._deleted&&(this.persistenceManager=await Nr.create(this,e),(r=this._resolvePersistenceManagerAvailable)==null||r.call(this),!this._deleted)){if((s=this._popupRedirectResolver)!=null&&s._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((i=this.currentUser)==null?void 0:i.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await Jo(this,{idToken:e}),r=await _t._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(r)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var i;if(ye(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let r=t,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(i=this.redirectUser)==null?void 0:i._redirectEventId,c=r==null?void 0:r._redirectEventId,u=await this.tryRedirectSignIn(e);(!o||o===c)&&(u!=null&&u.user)&&(r=u.user,s=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(r)}catch(o){r=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return L(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Ii(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Ob()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(ye(this.app))return Promise.reject(Ke(this));const t=e?G(e):null;return t&&L(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&L(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return ye(this.app)?Promise.reject(Ke(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return ye(this.app)?Promise.reject(Ke(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(xt(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await Xb(this),t=new eS(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new ar("auth","Firebase",e())}onAuthStateChanged(e,t,r){return this.registerStateListener(this.authStateSubscription,e,t,r)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,r){return this.registerStateListener(this.idTokenSubscription,e,t,r)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(r.tenantId=this.tenantId),await Hb(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,t){const r=await this.getOrInitRedirectPersistenceManager(t);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&xt(e)||this._popupRedirectResolver;L(t,this,"argument-error"),this.redirectPersistenceManager=await Nr.create(this,[xt(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,r;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)==null?void 0:t._redirectEventId)===e?this._currentUser:((r=this.redirectUser)==null?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((t=this.currentUser)==null?void 0:t.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,r,s){if(this._deleted)return()=>{};const i=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(L(c,this,"internal-error"),c.then(()=>{o||i(this.currentUser)}),typeof t=="function"){const u=e.addObserver(t,r,s);return()=>{o=!0,u()}}else{const u=e.addObserver(t);return()=>{o=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return L(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=ey(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var s;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await((s=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:s.getHeartbeatsHeader());t&&(e["X-Firebase-Client"]=t);const r=await this._getAppCheckToken();return r&&(e["X-Firebase-AppCheck"]=r),e}async _getAppCheckToken(){var t;if(ye(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:t.getToken());return e!=null&&e.error&&Db(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function xe(n){return G(n)}class ip{constructor(e){this.auth=e,this.observer=null,this.addObserver=rw(t=>this.observer=t)}get next(){return L(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
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
 */let Mi={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function nS(n){Mi=n}function Wl(n){return Mi.loadJS(n)}function rS(){return Mi.recaptchaV2Script}function sS(){return Mi.recaptchaEnterpriseScript}function iS(){return Mi.gapiScript}function ty(n){return`__${n}${Math.floor(Math.random()*1e6)}`}/**
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
 */const oS=500,aS=6e4,lo=1e12;class cS{constructor(e){this.auth=e,this.counter=lo,this._widgets=new Map}render(e,t){const r=this.counter;return this._widgets.set(r,new hS(e,this.auth.name,t||{})),this.counter++,r}reset(e){var r;const t=e||lo;(r=this._widgets.get(t))==null||r.delete(),this._widgets.delete(t)}getResponse(e){var r;const t=e||lo;return((r=this._widgets.get(t))==null?void 0:r.getResponse())||""}async execute(e){var r;const t=e||lo;return(r=this._widgets.get(t))==null||r.execute(),""}}class uS{constructor(){this.enterprise=new lS}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class lS{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class hS{constructor(e,t,r){this.params=r,this.timerId=null,this.deleted=!1,this.responseToken=null,this.clickHandler=()=>{this.execute()};const s=typeof e=="string"?document.getElementById(e):e;L(s,"argument-error",{appName:t}),this.container=s,this.isVisible=this.params.size!=="invisible",this.isVisible?this.execute():this.container.addEventListener("click",this.clickHandler)}getResponse(){return this.checkIfDeleted(),this.responseToken}delete(){this.checkIfDeleted(),this.deleted=!0,this.timerId&&(clearTimeout(this.timerId),this.timerId=null),this.container.removeEventListener("click",this.clickHandler)}execute(){this.checkIfDeleted(),!this.timerId&&(this.timerId=window.setTimeout(()=>{this.responseToken=dS(50);const{callback:e,"expired-callback":t}=this.params;if(e)try{e(this.responseToken)}catch{}this.timerId=window.setTimeout(()=>{if(this.timerId=null,this.responseToken=null,t)try{t()}catch{}this.isVisible&&this.execute()},aS)},oS))}checkIfDeleted(){if(this.deleted)throw new Error("reCAPTCHA mock was already deleted!")}}function dS(n){const e=[],t="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let r=0;r<n;r++)e.push(t.charAt(Math.floor(Math.random()*t.length)));return e.join("")}const fS="recaptcha-enterprise",Xs="NO_RECAPTCHA";class ny{constructor(e){this.type=fS,this.auth=xe(e)}async verify(e="verify",t=!1){async function r(i){if(!t){if(i.tenantId==null&&i._agentRecaptchaConfig!=null)return i._agentRecaptchaConfig.siteKey;if(i.tenantId!=null&&i._tenantRecaptchaConfigs[i.tenantId]!==void 0)return i._tenantRecaptchaConfigs[i.tenantId].siteKey}return new Promise(async(o,c)=>{$_(i,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(u=>{if(u.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{const l=new q_(u);return i.tenantId==null?i._agentRecaptchaConfig=l:i._tenantRecaptchaConfigs[i.tenantId]=l,o(l.siteKey)}}).catch(u=>{c(u)})})}function s(i,o,c){const u=window.grecaptcha;tp(u)?u.enterprise.ready(()=>{u.enterprise.execute(i,{action:e}).then(l=>{o(l)}).catch(()=>{o(Xs)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new uS().execute("siteKey",{action:"verify"}):new Promise((i,o)=>{r(this.auth).then(c=>{if(!t&&tp(window.grecaptcha))s(c,i,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let u=sS();u.length!==0&&(u+=c),Wl(u).then(()=>{s(c,i,o)}).catch(l=>{o(l)})}}).catch(c=>{o(c)})})}}async function Ds(n,e,t,r=!1,s=!1){const i=new ny(n);let o;if(s)o=Xs;else try{o=await i.verify(t)}catch{o=await i.verify(t,!0)}const c={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){const u=c.phoneEnrollmentInfo.phoneNumber,l=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:u,recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){const u=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return r?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function mn(n,e,t,r,s){var i,o;if(s==="EMAIL_PASSWORD_PROVIDER")if((i=n._getRecaptchaConfig())!=null&&i.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const c=await Ds(n,e,t,t==="getOobCode");return r(n,c)}else return r(n,e).catch(async c=>{if(c.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const u=await Ds(n,e,t,t==="getOobCode");return r(n,u)}else return Promise.reject(c)});else if(s==="PHONE_PROVIDER")if((o=n._getRecaptchaConfig())!=null&&o.isProviderEnabled("PHONE_PROVIDER")){const c=await Ds(n,e,t);return r(n,c).catch(async u=>{var l;if(((l=n._getRecaptchaConfig())==null?void 0:l.getProviderEnforcementState("PHONE_PROVIDER"))==="AUDIT"&&(u.code==="auth/missing-recaptcha-token"||u.code==="auth/invalid-app-credential")){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${t} flow.`);const f=await Ds(n,e,t,!1,!0);return r(n,f)}return Promise.reject(u)})}else{const c=await Ds(n,e,t,!1,!0);return r(n,c)}else return Promise.reject(s+" provider is not supported.")}async function pS(n){const e=xe(n),t=await $_(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}),r=new q_(t);e.tenantId==null?e._agentRecaptchaConfig=r:e._tenantRecaptchaConfigs[e.tenantId]=r,r.isAnyProviderEnabled()&&new ny(e).verify()}/**
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
 */function mS(n,e){const t=En(n,"auth");if(t.isInitialized()){const s=t.getImmediate(),i=t.getOptions();if(Wn(i,e??{}))return s;pt(s,"already-initialized")}return t.initialize({options:e})}function gS(n,e){const t=(e==null?void 0:e.persistence)||[],r=(Array.isArray(t)?t:[t]).map(xt);e!=null&&e.errorMap&&n._updateErrorMap(e.errorMap),n._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function Au(n,e,t){const r=xe(n);L(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const s=!1,i=ry(e),{host:o,port:c}=_S(e),u=c===null?"":`:${c}`,l={url:`${i}//${o}${u}/`},f=Object.freeze({host:o,port:c,protocol:i.replace(":",""),options:Object.freeze({disableWarnings:s})});if(!r._canInitEmulator){L(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),L(Wn(l,r.config.emulator)&&Wn(f,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=l,r.emulatorConfig=f,r.settings.appVerificationDisabledForTesting=!0,kt(o)?(sa(`${i}//${o}${u}`),Pu("Auth",!0)):yS()}function ry(n){const e=n.indexOf(":");return e<0?"":n.substr(0,e+1)}function _S(n){const e=ry(n),t=/(\/\/)?([^?#/]+)/.exec(n.substr(e.length));if(!t)return{host:"",port:null};const r=t[2].split("@").pop()||"",s=/^(\[[^\]]+\])(:|$)/.exec(r);if(s){const i=s[1];return{host:i,port:op(r.substr(i.length+1))}}else{const[i,o]=r.split(":");return{host:i,port:op(o)}}}function op(n){if(!n)return null;const e=Number(n);return isNaN(e)?null:e}function yS(){function n(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",n):n())}/**
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
 */class Va{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return Ot("not implemented")}_getIdTokenResponse(e){return Ot("not implemented")}_linkToIdToken(e,t){return Ot("not implemented")}_getReauthenticationResolver(e){return Ot("not implemented")}}/**
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
 */async function IS(n,e){return Ce(n,"POST","/v1/accounts:resetPassword",Pe(n,e))}async function wS(n,e){return Ce(n,"POST","/v1/accounts:update",e)}async function ES(n,e){return Ce(n,"POST","/v1/accounts:signUp",e)}async function TS(n,e){return Ce(n,"POST","/v1/accounts:update",Pe(n,e))}/**
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
 */async function vS(n,e){return zt(n,"POST","/v1/accounts:signInWithPassword",Pe(n,e))}async function Oa(n,e){return Ce(n,"POST","/v1/accounts:sendOobCode",Pe(n,e))}async function AS(n,e){return Oa(n,e)}async function RS(n,e){return Oa(n,e)}async function bS(n,e){return Oa(n,e)}async function SS(n,e){return Oa(n,e)}/**
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
 */async function PS(n,e){return zt(n,"POST","/v1/accounts:signInWithEmailLink",Pe(n,e))}async function CS(n,e){return zt(n,"POST","/v1/accounts:signInWithEmailLink",Pe(n,e))}/**
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
 */class wi extends Va{constructor(e,t,r,s=null){super("password",r),this._email=e,this._password=t,this._tenantId=s}static _fromEmailAndPassword(e,t){return new wi(e,t,"password")}static _fromEmailAndCode(e,t,r=null){return new wi(e,t,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return mn(e,t,"signInWithPassword",vS,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return PS(e,{email:this._email,oobCode:this._password});default:pt(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const r={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return mn(e,r,"signUpPassword",ES,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return CS(e,{idToken:t,email:this._email,oobCode:this._password});default:pt(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
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
 */async function Dr(n,e){return zt(n,"POST","/v1/accounts:signInWithIdp",Pe(n,e))}/**
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
 */const kS="http://localhost";class Pt extends Va{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Pt(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):pt("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:s,...i}=t;if(!r||!s)return null;const o=new Pt(r,s);return o.idToken=i.idToken||void 0,o.accessToken=i.accessToken||void 0,o.secret=i.secret,o.nonce=i.nonce,o.pendingToken=i.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return Dr(e,t)}_linkToIdToken(e,t){const r=this.buildRequest();return r.idToken=t,Dr(e,r)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,Dr(e,t)}buildRequest(){const e={requestUri:kS,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=Zr(t)}return e}}/**
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
 */async function ap(n,e){return Ce(n,"POST","/v1/accounts:sendVerificationCode",Pe(n,e))}async function NS(n,e){return zt(n,"POST","/v1/accounts:signInWithPhoneNumber",Pe(n,e))}async function DS(n,e){const t=await zt(n,"POST","/v1/accounts:signInWithPhoneNumber",Pe(n,e));if(t.temporaryProof)throw Us(n,"account-exists-with-different-credential",t);return t}const VS={USER_NOT_FOUND:"user-not-found"};async function OS(n,e){const t={...e,operation:"REAUTH"};return zt(n,"POST","/v1/accounts:signInWithPhoneNumber",Pe(n,t),VS)}/**
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
 */class Zs extends Va{constructor(e){super("phone","phone"),this.params=e}static _fromVerification(e,t){return new Zs({verificationId:e,verificationCode:t})}static _fromTokenResponse(e,t){return new Zs({phoneNumber:e,temporaryProof:t})}_getIdTokenResponse(e){return NS(e,this._makeVerificationRequest())}_linkToIdToken(e,t){return DS(e,{idToken:t,...this._makeVerificationRequest()})}_getReauthenticationResolver(e){return OS(e,this._makeVerificationRequest())}_makeVerificationRequest(){const{temporaryProof:e,phoneNumber:t,verificationId:r,verificationCode:s}=this.params;return e&&t?{temporaryProof:e,phoneNumber:t}:{sessionInfo:r,code:s}}toJSON(){const e={providerId:this.providerId};return this.params.phoneNumber&&(e.phoneNumber=this.params.phoneNumber),this.params.temporaryProof&&(e.temporaryProof=this.params.temporaryProof),this.params.verificationCode&&(e.verificationCode=this.params.verificationCode),this.params.verificationId&&(e.verificationId=this.params.verificationId),e}static fromJSON(e){typeof e=="string"&&(e=JSON.parse(e));const{verificationId:t,verificationCode:r,phoneNumber:s,temporaryProof:i}=e;return!r&&!t&&!s&&!i?null:new Zs({verificationId:t,verificationCode:r,phoneNumber:s,temporaryProof:i})}}/**
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
 */function xS(n){switch(n){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function LS(n){const e=Vs(Os(n)).link,t=e?Vs(Os(e)).deep_link_id:null,r=Vs(Os(n)).deep_link_id;return(r?Vs(Os(r)).link:null)||r||t||e||n}class xa{constructor(e){const t=Vs(Os(e)),r=t.apiKey??null,s=t.oobCode??null,i=xS(t.mode??null);L(r&&s&&i,"argument-error"),this.apiKey=r,this.operation=i,this.code=s,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=LS(e);try{return new xa(t)}catch{return null}}}/**
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
 */class $t{constructor(){this.providerId=$t.PROVIDER_ID}static credential(e,t){return wi._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const r=xa.parseLink(t);return L(r,"argument-error"),wi._fromEmailAndCode(e,r.code,r.tenantId)}}$t.PROVIDER_ID="password";$t.EMAIL_PASSWORD_SIGN_IN_METHOD="password";$t.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
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
 */class as{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class cs extends as{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}class _e extends cs{static credentialFromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;return L("providerId"in t&&"signInMethod"in t,"argument-error"),Pt._fromParams(t)}credential(e){return this._credential({...e,nonce:e.rawNonce})}_credential(e){return L(e.idToken||e.accessToken,"argument-error"),Pt._fromParams({...e,providerId:this.providerId,signInMethod:this.providerId})}static credentialFromResult(e){return _e.oauthCredentialFromTaggedObject(e)}static credentialFromError(e){return _e.oauthCredentialFromTaggedObject(e.customData||{})}static oauthCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:r,oauthTokenSecret:s,pendingToken:i,nonce:o,providerId:c}=e;if(!r&&!s&&!t&&!i||!c)return null;try{return new _e(c)._credential({idToken:t,accessToken:r,nonce:o,pendingToken:i})}catch{return null}}}/**
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
 */class ct extends cs{constructor(){super("facebook.com")}static credential(e){return Pt._fromParams({providerId:ct.PROVIDER_ID,signInMethod:ct.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return ct.credentialFromTaggedObject(e)}static credentialFromError(e){return ct.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return ct.credential(e.oauthAccessToken)}catch{return null}}}ct.FACEBOOK_SIGN_IN_METHOD="facebook.com";ct.PROVIDER_ID="facebook.com";/**
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
 */class ut extends cs{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Pt._fromParams({providerId:ut.PROVIDER_ID,signInMethod:ut.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return ut.credentialFromTaggedObject(e)}static credentialFromError(e){return ut.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:r}=e;if(!t&&!r)return null;try{return ut.credential(t,r)}catch{return null}}}ut.GOOGLE_SIGN_IN_METHOD="google.com";ut.PROVIDER_ID="google.com";/**
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
 */class lt extends cs{constructor(){super("github.com")}static credential(e){return Pt._fromParams({providerId:lt.PROVIDER_ID,signInMethod:lt.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return lt.credentialFromTaggedObject(e)}static credentialFromError(e){return lt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return lt.credential(e.oauthAccessToken)}catch{return null}}}lt.GITHUB_SIGN_IN_METHOD="github.com";lt.PROVIDER_ID="github.com";/**
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
 */class ht extends cs{constructor(){super("twitter.com")}static credential(e,t){return Pt._fromParams({providerId:ht.PROVIDER_ID,signInMethod:ht.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return ht.credentialFromTaggedObject(e)}static credentialFromError(e){return ht.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:r}=e;if(!t||!r)return null;try{return ht.credential(t,r)}catch{return null}}}ht.TWITTER_SIGN_IN_METHOD="twitter.com";ht.PROVIDER_ID="twitter.com";/**
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
 */async function sy(n,e){return zt(n,"POST","/v1/accounts:signUp",Pe(n,e))}/**
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
 */class Ct{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,r,s=!1){const i=await _t._fromIdTokenResponse(e,r,s),o=cp(r);return new Ct({user:i,providerId:o,_tokenResponse:r,operationType:t})}static async _forOperation(e,t,r){await e._updateTokensIfNecessary(r,!0);const s=cp(r);return new Ct({user:e,providerId:s,_tokenResponse:r,operationType:t})}}function cp(n){return n.providerId?n.providerId:"phoneNumber"in n?"phone":null}/**
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
 */async function MS(n){var s;if(ye(n.app))return Promise.reject(Ke(n));const e=xe(n);if(await e._initializationPromise,(s=e.currentUser)!=null&&s.isAnonymous)return new Ct({user:e.currentUser,providerId:null,operationType:"signIn"});const t=await sy(e,{returnSecureToken:!0}),r=await Ct._fromIdTokenResponse(e,"signIn",t,!0);return await e._updateCurrentUser(r.user),r}/**
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
 */class Yo extends mt{constructor(e,t,r,s){super(t.code,t.message),this.operationType=r,this.user=s,Object.setPrototypeOf(this,Yo.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,t,r,s){return new Yo(e,t,r,s)}}function iy(n,e,t,r){return(e==="reauthenticate"?t._getReauthenticationResolver(n):t._getIdTokenResponse(n)).catch(i=>{throw i.code==="auth/multi-factor-auth-required"?Yo._fromErrorAndOperation(n,i,e,r):i})}/**
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
 */function oy(n){return new Set(n.map(({providerId:e})=>e).filter(e=>!!e))}/**
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
 */async function FS(n,e){const t=G(n);await La(!0,t,e);const{providerUserInfo:r}=await $b(t.auth,{idToken:await t.getIdToken(),deleteProvider:[e]}),s=oy(r||[]);return t.providerData=t.providerData.filter(i=>s.has(i.providerId)),s.has("phone")||(t.phoneNumber=null),await t.auth._persistUserIfCurrent(t),t}async function ay(n,e,t=!1){const r=await rr(n,e._linkToIdToken(n.auth,await n.getIdToken()),t);return Ct._forOperation(n,"link",r)}async function La(n,e,t){await Ii(e);const r=oy(e.providerData),s=n===!1?"provider-already-linked":"no-such-provider";L(r.has(t)===n,e.auth,s)}/**
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
 */async function US(n,e,t=!1){const{auth:r}=n;if(ye(r.app))return Promise.reject(Ke(r));const s="reauthenticate";try{const i=await rr(n,iy(r,s,e,n),t);L(i.idToken,r,"internal-error");const o=Da(i.idToken);L(o,r,"internal-error");const{sub:c}=o;return L(n.uid===c,r,"user-mismatch"),Ct._forOperation(n,s,i)}catch(i){throw(i==null?void 0:i.code)==="auth/user-not-found"&&pt(r,"user-mismatch"),i}}/**
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
 */async function cy(n,e,t=!1){if(ye(n.app))return Promise.reject(Ke(n));const r="signIn",s=await iy(n,r,e),i=await Ct._fromIdTokenResponse(n,r,s);return t||await n._updateCurrentUser(i.user),i}async function Kl(n,e){return cy(xe(n),e)}async function uy(n,e){const t=G(n);return await La(!1,t,e.providerId),ay(t,e)}/**
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
 */async function BS(n,e){return zt(n,"POST","/v1/accounts:signInWithCustomToken",Pe(n,e))}/**
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
 */async function qS(n,e){if(ye(n.app))return Promise.reject(Ke(n));const t=xe(n),r=await BS(t,{token:e,returnSecureToken:!0}),s=await Ct._fromIdTokenResponse(t,"signIn",r);return await t._updateCurrentUser(s.user),s}/**
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
 */function Ma(n,e,t){var r;L(((r=t.url)==null?void 0:r.length)>0,n,"invalid-continue-uri"),L(typeof t.dynamicLinkDomain>"u"||t.dynamicLinkDomain.length>0,n,"invalid-dynamic-link-domain"),L(typeof t.linkDomain>"u"||t.linkDomain.length>0,n,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&(L(t.iOS.bundleId.length>0,n,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&(L(t.android.packageName.length>0,n,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}/**
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
 */async function Hl(n){const e=xe(n);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function $S(n,e,t){const r=xe(n),s={requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"};t&&Ma(r,s,t),await mn(r,s,"getOobCode",RS,"EMAIL_PASSWORD_PROVIDER")}async function jS(n,e,t){await IS(G(n),{oobCode:e,newPassword:t}).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&Hl(n),r})}async function GS(n,e){await TS(G(n),{oobCode:e})}async function zS(n,e,t){if(ye(n.app))return Promise.reject(Ke(n));const r=xe(n),o=await mn(r,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",sy,"EMAIL_PASSWORD_PROVIDER").catch(u=>{throw u.code==="auth/password-does-not-meet-requirements"&&Hl(n),u}),c=await Ct._fromIdTokenResponse(r,"signIn",o);return await r._updateCurrentUser(c.user),c}function WS(n,e,t){return ye(n.app)?Promise.reject(Ke(n)):Kl(G(n),$t.credential(e,t)).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&Hl(n),r})}/**
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
 */async function KS(n,e,t){const r=xe(n),s={requestType:"EMAIL_SIGNIN",email:e,clientType:"CLIENT_TYPE_WEB"};function i(o,c){L(c.handleCodeInApp,r,"argument-error"),c&&Ma(r,o,c)}i(s,t),await mn(r,s,"getOobCode",bS,"EMAIL_PASSWORD_PROVIDER")}function HS(n,e){const t=xa.parseLink(e);return(t==null?void 0:t.operation)==="EMAIL_SIGNIN"}async function QS(n,e,t){if(ye(n.app))return Promise.reject(Ke(n));const r=G(n),s=$t.credentialWithLink(e,t||yi());return L(s._tenantId===(r.tenantId||null),r,"tenant-id-mismatch"),Kl(r,s)}/**
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
 */async function JS(n,e){return Ce(n,"POST","/v1/accounts:createAuthUri",Pe(n,e))}/**
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
 */async function YS(n,e){const t=jl()?yi():"http://localhost",r={identifier:e,continueUri:t},{signinMethods:s}=await JS(G(n),r);return s||[]}async function XS(n,e){const t=G(n),s={requestType:"VERIFY_EMAIL",idToken:await n.getIdToken()};e&&Ma(t.auth,s,e);const{email:i}=await AS(t.auth,s);i!==n.email&&await n.reload()}async function ZS(n,e,t){const r=G(n),i={requestType:"VERIFY_AND_CHANGE_EMAIL",idToken:await n.getIdToken(),newEmail:e};t&&Ma(r.auth,i,t);const{email:o}=await SS(r.auth,i);o!==n.email&&await n.reload()}/**
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
 */async function eP(n,e){return Ce(n,"POST","/v1/accounts:update",e)}/**
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
 */async function tP(n,{displayName:e,photoURL:t}){if(e===void 0&&t===void 0)return;const r=G(n),i={idToken:await r.getIdToken(),displayName:e,photoUrl:t,returnSecureToken:!0},o=await rr(r,eP(r.auth,i));r.displayName=o.displayName||null,r.photoURL=o.photoUrl||null;const c=r.providerData.find(({providerId:u})=>u==="password");c&&(c.displayName=r.displayName,c.photoURL=r.photoURL),await r._updateTokensIfNecessary(o)}function nP(n,e){const t=G(n);return ye(t.auth.app)?Promise.reject(Ke(t.auth)):ly(t,e,null)}function rP(n,e){return ly(G(n),null,e)}async function ly(n,e,t){const{auth:r}=n,i={idToken:await n.getIdToken(),returnSecureToken:!0};e&&(i.email=e),t&&(i.password=t);const o=await rr(n,wS(r,i));await n._updateTokensIfNecessary(o,!0)}/**
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
 */function sP(n){var s,i;if(!n)return null;const{providerId:e}=n,t=n.rawUserInfo?JSON.parse(n.rawUserInfo):{},r=n.isNewUser||n.kind==="identitytoolkit#SignupNewUserResponse";if(!e&&(n!=null&&n.idToken)){const o=(i=(s=Da(n.idToken))==null?void 0:s.firebase)==null?void 0:i.sign_in_provider;if(o){const c=o!=="anonymous"&&o!=="custom"?o:null;return new Vr(r,c)}}if(!e)return null;switch(e){case"facebook.com":return new iP(r,t);case"github.com":return new oP(r,t);case"google.com":return new aP(r,t);case"twitter.com":return new cP(r,t,n.screenName||null);case"custom":case"anonymous":return new Vr(r,null);default:return new Vr(r,e,t)}}class Vr{constructor(e,t,r={}){this.isNewUser=e,this.providerId=t,this.profile=r}}class hy extends Vr{constructor(e,t,r,s){super(e,t,r),this.username=s}}class iP extends Vr{constructor(e,t){super(e,"facebook.com",t)}}class oP extends hy{constructor(e,t){super(e,"github.com",t,typeof(t==null?void 0:t.login)=="string"?t==null?void 0:t.login:null)}}class aP extends Vr{constructor(e,t){super(e,"google.com",t)}}class cP extends hy{constructor(e,t,r){super(e,"twitter.com",t,r)}}function uP(n){const{user:e,_tokenResponse:t}=n;return e.isAnonymous&&!t?{providerId:null,isNewUser:!1,profile:null}:sP(t)}/**
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
 */function ho(n,e){return G(n).setPersistence(e)}function lP(n,e,t,r){return G(n).onIdTokenChanged(e,t,r)}function hP(n,e,t){return G(n).beforeAuthStateChanged(e,t)}function sN(n,e,t,r){return G(n).onAuthStateChanged(e,t,r)}function iN(n){return G(n).signOut()}function dP(n,e){return xe(n).revokeAccessToken(e)}async function fP(n){return G(n).delete()}/**
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
 */function up(n,e){return Ce(n,"POST","/v2/accounts/mfaEnrollment:start",Pe(n,e))}const Xo="__sak";/**
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
 */class dy{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(Xo,"1"),this.storage.removeItem(Xo),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
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
 */const pP=1e3,mP=10;class fy extends dy{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Z_(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const r=this.storage.getItem(t),s=this.localCache[t];r!==s&&e(t,s,r)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,u)=>{this.notifyListeners(o,u)});return}const r=e.key;t?this.detachListener():this.stopPolling();const s=()=>{const o=this.storage.getItem(r);!t&&this.localCache[r]===o||this.notifyListeners(r,o)},i=this.storage.getItem(r);Jb()&&i!==e.newValue&&e.newValue!==e.oldValue?setTimeout(s,mP):s()}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:r}),!0)})},pP)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}fy.type="LOCAL";const py=fy;/**
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
 */class my extends dy{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}my.type="SESSION";const Ql=my;/**
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
 */function gP(n){return Promise.all(n.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
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
 */class Fa{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(s=>s.isListeningto(e));if(t)return t;const r=new Fa(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:r,eventType:s,data:i}=t.data,o=this.handlersMap[s];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:r,eventType:s});const c=Array.from(o).map(async l=>l(t.origin,i)),u=await gP(c);t.ports[0].postMessage({status:"done",eventId:r,eventType:s,response:u})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Fa.receivers=[];/**
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
 */function Ua(n="",e=10){let t="";for(let r=0;r<e;r++)t+=Math.floor(Math.random()*10);return n+t}/**
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
 */class _P{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,r=50){const s=typeof MessageChannel<"u"?new MessageChannel:null;if(!s)throw new Error("connection_unavailable");let i,o;return new Promise((c,u)=>{const l=Ua("",20);s.port1.start();const f=setTimeout(()=>{u(new Error("unsupported_event"))},r);o={messageChannel:s,onMessage(p){const g=p;if(g.data.eventId===l)switch(g.data.status){case"ack":clearTimeout(f),i=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(i),c(g.data.response);break;default:clearTimeout(f),clearTimeout(i),u(new Error("invalid_response"));break}}},this.handlers.add(o),s.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:l,data:t},[s.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
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
 */function Te(){return window}function yP(n){Te().location.href=n}/**
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
 */function Jl(){return typeof Te().WorkerGlobalScope<"u"&&typeof Te().importScripts=="function"}async function IP(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function wP(){var n;return((n=navigator==null?void 0:navigator.serviceWorker)==null?void 0:n.controller)||null}function EP(){return Jl()?self:null}/**
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
 */const gy="firebaseLocalStorageDb",TP=1,Zo="firebaseLocalStorage",_y="fbase_key";class Fi{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Ba(n,e){return n.transaction([Zo],e?"readwrite":"readonly").objectStore(Zo)}function vP(){const n=indexedDB.deleteDatabase(gy);return new Fi(n).toPromise()}function Ru(){const n=indexedDB.open(gy,TP);return new Promise((e,t)=>{n.addEventListener("error",()=>{t(n.error)}),n.addEventListener("upgradeneeded",()=>{const r=n.result;try{r.createObjectStore(Zo,{keyPath:_y})}catch(s){t(s)}}),n.addEventListener("success",async()=>{const r=n.result;r.objectStoreNames.contains(Zo)?e(r):(r.close(),await vP(),e(await Ru()))})})}async function lp(n,e,t){const r=Ba(n,!0).put({[_y]:e,value:t});return new Fi(r).toPromise()}async function AP(n,e){const t=Ba(n,!1).get(e),r=await new Fi(t).toPromise();return r===void 0?null:r.value}function hp(n,e){const t=Ba(n,!0).delete(e);return new Fi(t).toPromise()}const RP=800,bP=3;class yy{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await Ru(),this.db)}async _withRetries(e){let t=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(t++>bP)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Jl()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Fa._getInstance(EP()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var t,r;if(this.activeServiceWorker=await IP(),!this.activeServiceWorker)return;this.sender=new _P(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(t=e[0])!=null&&t.fulfilled&&(r=e[0])!=null&&r.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||wP()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await Ru();return await lp(e,Xo,"1"),await hp(e,Xo),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(r=>lp(r,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(r=>AP(r,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>hp(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(s=>{const i=Ba(s,!1).getAll();return new Fi(i).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],r=new Set;if(e.length!==0)for(const{fbase_key:s,value:i}of e)r.add(s),JSON.stringify(this.localCache[s])!==JSON.stringify(i)&&(this.notifyListeners(s,i),t.push(s));for(const s of Object.keys(this.localCache))this.localCache[s]&&!r.has(s)&&(this.notifyListeners(s,null),t.push(s));return t}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),RP)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}yy.type="LOCAL";const Iy=yy;/**
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
 */function dp(n,e){return Ce(n,"POST","/v2/accounts/mfaSignIn:start",Pe(n,e))}/**
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
 */const Vc=ty("rcb"),SP=new Li(3e4,6e4);class PP{constructor(){var e;this.hostLanguage="",this.counter=0,this.librarySeparatelyLoaded=!!((e=Te().grecaptcha)!=null&&e.render)}load(e,t=""){return L(CP(t),e,"argument-error"),this.shouldResolveImmediately(t)&&ep(Te().grecaptcha)?Promise.resolve(Te().grecaptcha):new Promise((r,s)=>{const i=Te().setTimeout(()=>{s(Ye(e,"network-request-failed"))},SP.get());Te()[Vc]=()=>{Te().clearTimeout(i),delete Te()[Vc];const c=Te().grecaptcha;if(!c||!ep(c)){s(Ye(e,"internal-error"));return}const u=c.render;c.render=(l,f)=>{const p=u(l,f);return this.counter++,p},this.hostLanguage=t,r(c)};const o=`${rS()}?${Zr({onload:Vc,render:"explicit",hl:t})}`;Wl(o).catch(()=>{clearTimeout(i),s(Ye(e,"internal-error"))})})}clearedOneInstance(){this.counter--}shouldResolveImmediately(e){var t;return!!((t=Te().grecaptcha)!=null&&t.render)&&(e===this.hostLanguage||this.counter>0||this.librarySeparatelyLoaded)}}function CP(n){return n.length<=6&&/^\s*[a-zA-Z0-9\-]*\s*$/.test(n)}class kP{async load(e){return new cS(e)}clearedOneInstance(){}}/**
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
 */const ei="recaptcha",NP={theme:"light",type:"image"};class fp{constructor(e,t,r={...NP}){this.parameters=r,this.type=ei,this.destroyed=!1,this.widgetId=null,this.tokenChangeListeners=new Set,this.renderPromise=null,this.recaptcha=null,this.auth=xe(e),this.isInvisible=this.parameters.size==="invisible",L(typeof document<"u",this.auth,"operation-not-supported-in-this-environment");const s=typeof t=="string"?document.getElementById(t):t;L(s,this.auth,"argument-error"),this.container=s,this.parameters.callback=this.makeTokenCallback(this.parameters.callback),this._recaptchaLoader=this.auth.settings.appVerificationDisabledForTesting?new kP:new PP,this.validateStartingState()}async verify(){this.assertNotDestroyed();const e=await this.render(),t=this.getAssertedRecaptcha(),r=t.getResponse(e);return r||new Promise(s=>{const i=o=>{o&&(this.tokenChangeListeners.delete(i),s(o))};this.tokenChangeListeners.add(i),this.isInvisible&&t.execute(e)})}render(){try{this.assertNotDestroyed()}catch(e){return Promise.reject(e)}return this.renderPromise?this.renderPromise:(this.renderPromise=this.makeRenderPromise().catch(e=>{throw this.renderPromise=null,e}),this.renderPromise)}_reset(){this.assertNotDestroyed(),this.widgetId!==null&&this.getAssertedRecaptcha().reset(this.widgetId)}clear(){this.assertNotDestroyed(),this.destroyed=!0,this._recaptchaLoader.clearedOneInstance(),this.isInvisible||this.container.childNodes.forEach(e=>{this.container.removeChild(e)})}validateStartingState(){L(!this.parameters.sitekey,this.auth,"argument-error"),L(this.isInvisible||!this.container.hasChildNodes(),this.auth,"argument-error"),L(typeof document<"u",this.auth,"operation-not-supported-in-this-environment")}makeTokenCallback(e){return t=>{if(this.tokenChangeListeners.forEach(r=>r(t)),typeof e=="function")e(t);else if(typeof e=="string"){const r=Te()[e];typeof r=="function"&&r(t)}}}assertNotDestroyed(){L(!this.destroyed,this.auth,"internal-error")}async makeRenderPromise(){if(await this.init(),!this.widgetId){let e=this.container;if(!this.isInvisible){const t=document.createElement("div");e.appendChild(t),e=t}this.widgetId=this.getAssertedRecaptcha().render(e,this.parameters)}return this.widgetId}async init(){L(jl()&&!Jl(),this.auth,"internal-error"),await DP(),this.recaptcha=await this._recaptchaLoader.load(this.auth,this.auth.languageCode||void 0);const e=await Bb(this.auth);L(e,this.auth,"internal-error"),this.parameters.sitekey=e}getAssertedRecaptcha(){return L(this.recaptcha,this.auth,"internal-error"),this.recaptcha}}function DP(){let n=null;return new Promise(e=>{if(document.readyState==="complete"){e();return}n=()=>e(),window.addEventListener("load",n)}).catch(e=>{throw n&&window.removeEventListener("load",n),e})}/**
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
 */class wy{constructor(e,t){this.verificationId=e,this.onConfirmation=t}confirm(e){const t=Zs._fromVerification(this.verificationId,e);return this.onConfirmation(t)}}async function VP(n,e,t){if(ye(n.app))return Promise.reject(Ke(n));const r=xe(n),s=await Ey(r,e,G(t));return new wy(s,i=>Kl(r,i))}async function OP(n,e,t){const r=G(n);await La(!1,r,"phone");const s=await Ey(r.auth,e,G(t));return new wy(s,i=>uy(r,i))}async function Ey(n,e,t){var r;if(!n._getRecaptchaConfig())try{await pS(n)}catch{console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.")}try{let s;if(typeof e=="string"?s={phoneNumber:e}:s=e,"session"in s){const i=s.session;if("phoneNumber"in s){L(i.type==="enroll",n,"internal-error");const o={idToken:i.credential,phoneEnrollmentInfo:{phoneNumber:s.phoneNumber,clientType:"CLIENT_TYPE_WEB"}};return(await mn(n,o,"mfaSmsEnrollment",async(f,p)=>{if(p.phoneEnrollmentInfo.captchaResponse===Xs){L((t==null?void 0:t.type)===ei,f,"argument-error");const g=await Oc(f,p,t);return up(f,g)}return up(f,p)},"PHONE_PROVIDER").catch(f=>Promise.reject(f))).phoneSessionInfo.sessionInfo}else{L(i.type==="signin",n,"internal-error");const o=((r=s.multiFactorHint)==null?void 0:r.uid)||s.multiFactorUid;L(o,n,"missing-multi-factor-info");const c={mfaPendingCredential:i.credential,mfaEnrollmentId:o,phoneSignInInfo:{clientType:"CLIENT_TYPE_WEB"}};return(await mn(n,c,"mfaSmsSignIn",async(p,g)=>{if(g.phoneSignInInfo.captchaResponse===Xs){L((t==null?void 0:t.type)===ei,p,"argument-error");const v=await Oc(p,g,t);return dp(p,v)}return dp(p,g)},"PHONE_PROVIDER").catch(p=>Promise.reject(p))).phoneResponseInfo.sessionInfo}}else{const i={phoneNumber:s.phoneNumber,clientType:"CLIENT_TYPE_WEB"};return(await mn(n,i,"sendVerificationCode",async(l,f)=>{if(f.captchaResponse===Xs){L((t==null?void 0:t.type)===ei,l,"argument-error");const p=await Oc(l,f,t);return ap(l,p)}return ap(l,f)},"PHONE_PROVIDER").catch(l=>Promise.reject(l))).sessionInfo}}finally{t==null||t._reset()}}async function Oc(n,e,t){L(t.type===ei,n,"argument-error");const r=await t.verify();L(typeof r=="string",n,"argument-error");const s={...e};if("phoneEnrollmentInfo"in s){const i=s.phoneEnrollmentInfo.phoneNumber,o=s.phoneEnrollmentInfo.captchaResponse,c=s.phoneEnrollmentInfo.clientType,u=s.phoneEnrollmentInfo.recaptchaVersion;return Object.assign(s,{phoneEnrollmentInfo:{phoneNumber:i,recaptchaToken:r,captchaResponse:o,clientType:c,recaptchaVersion:u}}),s}else if("phoneSignInInfo"in s){const i=s.phoneSignInInfo.captchaResponse,o=s.phoneSignInInfo.clientType,c=s.phoneSignInInfo.recaptchaVersion;return Object.assign(s,{phoneSignInInfo:{recaptchaToken:r,captchaResponse:i,clientType:o,recaptchaVersion:c}}),s}else return Object.assign(s,{recaptchaToken:r}),s}/**
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
 */function Ui(n,e){return e?xt(e):(L(n._popupRedirectResolver,n,"argument-error"),n._popupRedirectResolver)}/**
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
 */class Yl extends Va{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return Dr(e,this._buildIdpRequest())}_linkToIdToken(e,t){return Dr(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return Dr(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function xP(n){return cy(n.auth,new Yl(n),n.bypassAuthState)}function LP(n){const{auth:e,user:t}=n;return L(t,e,"internal-error"),US(t,new Yl(n),n.bypassAuthState)}async function MP(n){const{auth:e,user:t}=n;return L(t,e,"internal-error"),ay(t,new Yl(n),n.bypassAuthState)}/**
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
 */class Ty{constructor(e,t,r,s,i=!1){this.auth=e,this.resolver=r,this.user=s,this.bypassAuthState=i,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:r,postBody:s,tenantId:i,error:o,type:c}=e;if(o){this.reject(o);return}const u={auth:this.auth,requestUri:t,sessionId:r,tenantId:i||void 0,postBody:s||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(u))}catch(l){this.reject(l)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return xP;case"linkViaPopup":case"linkViaRedirect":return MP;case"reauthViaPopup":case"reauthViaRedirect":return LP;default:pt(this.auth,"internal-error")}}resolve(e){qt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){qt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
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
 */const FP=new Li(2e3,1e4);async function UP(n,e,t){if(ye(n.app))return Promise.reject(Ye(n,"operation-not-supported-in-this-environment"));const r=xe(n);Na(n,e,as);const s=Ui(r,t);return new un(r,"signInViaPopup",e,s).executeNotNull()}async function BP(n,e,t){const r=G(n);Na(r.auth,e,as);const s=Ui(r.auth,t);return new un(r.auth,"linkViaPopup",e,s,r).executeNotNull()}class un extends Ty{constructor(e,t,r,s,i){super(e,t,s,i),this.provider=r,this.authWindow=null,this.pollId=null,un.currentPopupAction&&un.currentPopupAction.cancel(),un.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return L(e,this.auth,"internal-error"),e}async onExecution(){qt(this.filter.length===1,"Popup operations only handle one event");const e=Ua();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(Ye(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(Ye(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,un.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,r;if((r=(t=this.authWindow)==null?void 0:t.window)!=null&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(Ye(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,FP.get())};e()}}un.currentPopupAction=null;/**
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
 */const qP="pendingRedirect",So=new Map;class $P extends Ty{constructor(e,t,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,r),this.eventId=null}async execute(){let e=So.get(this.auth._key());if(!e){try{const r=await jP(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(t){e=()=>Promise.reject(t)}So.set(this.auth._key(),e)}return this.bypassAuthState||So.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function jP(n,e){const t=Ry(e),r=Ay(n);if(!await r._isAvailable())return!1;const s=await r._get(t)==="true";return await r._remove(t),s}async function vy(n,e){return Ay(n)._set(Ry(e),"true")}function GP(n,e){So.set(n._key(),e)}function Ay(n){return xt(n._redirectPersistence)}function Ry(n){return bo(qP,n.config.apiKey,n.name)}/**
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
 */function zP(n,e,t){return WP(n,e,t)}async function WP(n,e,t){if(ye(n.app))return Promise.reject(Ke(n));const r=xe(n);Na(n,e,as),await r._initializationPromise;const s=Ui(r,t);return await vy(s,r),s._openRedirect(r,e,"signInViaRedirect")}function KP(n,e,t){return HP(n,e,t)}async function HP(n,e,t){const r=G(n);Na(r.auth,e,as),await r.auth._initializationPromise;const s=Ui(r.auth,t);await La(!1,r,e.providerId),await vy(s,r.auth);const i=await JP(r);return s._openRedirect(r.auth,e,"linkViaRedirect",i)}async function QP(n,e){return await xe(n)._initializationPromise,by(n,e,!1)}async function by(n,e,t=!1){if(ye(n.app))return Promise.reject(Ke(n));const r=xe(n),s=Ui(r,e),o=await new $P(r,s,t).execute();return o&&!t&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}async function JP(n){const e=Ua(`${n.uid}:::`);return n._redirectEventId=e,await n.auth._setRedirectUser(n),await n.auth._persistUserIfCurrent(n),e}/**
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
 */const YP=10*60*1e3;class XP{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(t=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!ZP(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var r;if(e.error&&!Sy(e)){const s=((r=e.error.code)==null?void 0:r.split("auth/")[1])||"internal-error";t.onError(Ye(this.auth,s))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const r=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=YP&&this.cachedEventUids.clear(),this.cachedEventUids.has(pp(e))}saveEventToCache(e){this.cachedEventUids.add(pp(e)),this.lastProcessedEventTime=Date.now()}}function pp(n){return[n.type,n.eventId,n.sessionId,n.tenantId].filter(e=>e).join("-")}function Sy({type:n,error:e}){return n==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function ZP(n){switch(n.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Sy(n);default:return!1}}/**
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
 */async function eC(n,e={}){return Ce(n,"GET","/v1/projects",e)}/**
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
 */const tC=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,nC=/^https?/;async function rC(n){if(n.config.emulator)return;const{authorizedDomains:e}=await eC(n);for(const t of e)try{if(sC(t))return}catch{}pt(n,"unauthorized-domain")}function sC(n){const e=yi(),{protocol:t,hostname:r}=new URL(e);if(n.startsWith("chrome-extension://")){const o=new URL(n);return o.hostname===""&&r===""?t==="chrome-extension:"&&n.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===r}if(!nC.test(t))return!1;if(tC.test(n))return r===n;const s=n.replace(/\./g,"\\.");return new RegExp("^(.+\\."+s+"|"+s+")$","i").test(r)}/**
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
 */const iC=new Li(3e4,6e4);function mp(){const n=Te().___jsl;if(n!=null&&n.H){for(const e of Object.keys(n.H))if(n.H[e].r=n.H[e].r||[],n.H[e].L=n.H[e].L||[],n.H[e].r=[...n.H[e].L],n.CP)for(let t=0;t<n.CP.length;t++)n.CP[t]=null}}function oC(n){return new Promise((e,t)=>{var s,i,o;function r(){mp(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{mp(),t(Ye(n,"network-request-failed"))},timeout:iC.get()})}if((i=(s=Te().gapi)==null?void 0:s.iframes)!=null&&i.Iframe)e(gapi.iframes.getContext());else if((o=Te().gapi)!=null&&o.load)r();else{const c=ty("iframefcb");return Te()[c]=()=>{gapi.load?r():t(Ye(n,"network-request-failed"))},Wl(`${iS()}?onload=${c}`).catch(u=>t(u))}}).catch(e=>{throw Po=null,e})}let Po=null;function aC(n){return Po=Po||oC(n),Po}/**
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
 */const cC=new Li(5e3,15e3),uC="__/auth/iframe",lC="emulator/auth/iframe",hC={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},dC=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function fC(n){const e=n.config;L(e.authDomain,n,"auth-domain-config-required");const t=e.emulator?Gl(e,lC):`https://${n.config.authDomain}/${uC}`,r={apiKey:e.apiKey,appName:n.name,v:cr},s=dC.get(n.config.apiHost);s&&(r.eid=s);const i=n._getFrameworks();return i.length&&(r.fw=i.join(",")),`${t}?${Zr(r).slice(1)}`}async function pC(n){const e=await aC(n),t=Te().gapi;return L(t,n,"internal-error"),e.open({where:document.body,url:fC(n),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:hC,dontclear:!0},r=>new Promise(async(s,i)=>{await r.restyle({setHideOnLeave:!1});const o=Ye(n,"network-request-failed"),c=Te().setTimeout(()=>{i(o)},cC.get());function u(){Te().clearTimeout(c),s(r)}r.ping(u).then(u,()=>{i(o)})}))}/**
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
 */const mC={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},gC=500,_C=600,yC="_blank",IC="http://localhost";class gp{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function wC(n,e,t,r=gC,s=_C){const i=Math.max((window.screen.availHeight-s)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString();let c="";const u={...mC,width:r.toString(),height:s.toString(),top:i,left:o},l=be().toLowerCase();t&&(c=H_(l)?yC:t),W_(l)&&(e=e||IC,u.scrollbars="yes");const f=Object.entries(u).reduce((g,[v,C])=>`${g}${v}=${C},`,"");if(Qb(l)&&c!=="_self")return EC(e||"",c),new gp(null);const p=window.open(e||"",c,f);L(p,n,"popup-blocked");try{p.focus()}catch{}return new gp(p)}function EC(n,e){const t=document.createElement("a");t.href=n,t.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(r)}/**
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
 */const TC="__/auth/handler",vC="emulator/auth/handler",AC=encodeURIComponent("fac");async function _p(n,e,t,r,s,i){L(n.config.authDomain,n,"auth-domain-config-required"),L(n.config.apiKey,n,"invalid-api-key");const o={apiKey:n.config.apiKey,appName:n.name,authType:t,redirectUrl:r,v:cr,eventId:s};if(e instanceof as){e.setDefaultLanguage(n.languageCode),o.providerId=e.providerId||"",nw(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[f,p]of Object.entries({}))o[f]=p}if(e instanceof cs){const f=e.getScopes().filter(p=>p!=="");f.length>0&&(o.scopes=f.join(","))}n.tenantId&&(o.tid=n.tenantId);const c=o;for(const f of Object.keys(c))c[f]===void 0&&delete c[f];const u=await n._getAppCheckToken(),l=u?`#${AC}=${encodeURIComponent(u)}`:"";return`${RC(n)}?${Zr(c).slice(1)}${l}`}function RC({config:n}){return n.emulator?Gl(n,vC):`https://${n.authDomain}/${TC}`}/**
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
 */const xc="webStorageSupport";class bC{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Ql,this._completeRedirectFn=by,this._overrideRedirectResult=GP}async _openPopup(e,t,r,s){var o;qt((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const i=await _p(e,t,r,yi(),s);return wC(e,i,Ua())}async _openRedirect(e,t,r,s){await this._originValidation(e);const i=await _p(e,t,r,yi(),s);return yP(i),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:s,promise:i}=this.eventManagers[t];return s?Promise.resolve(s):(qt(i,"If manager is not set, promise should be"),i)}const r=this.initAndGetManager(e);return this.eventManagers[t]={promise:r},r.catch(()=>{delete this.eventManagers[t]}),r}async initAndGetManager(e){const t=await pC(e),r=new XP(e);return t.register("authEvent",s=>(L(s==null?void 0:s.authEvent,e,"invalid-auth-event"),{status:r.onEvent(s.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=t,r}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(xc,{type:xc},s=>{var o;const i=(o=s==null?void 0:s[0])==null?void 0:o[xc];i!==void 0&&t(!!i),pt(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=rC(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return Z_()||K_()||zl()}}const SC=bC;var yp="@firebase/auth",Ip="1.12.0";/**
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
 */class PC{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){L(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
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
 */function CC(n){switch(n){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function kC(n){ft(new st("auth",(e,{options:t})=>{const r=e.getProvider("app").getImmediate(),s=e.getProvider("heartbeat"),i=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=r.options;L(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});const u={apiKey:o,authDomain:c,clientPlatform:n,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:ey(n)},l=new tS(r,s,i,u);return gS(l,t),l},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,r)=>{e.getProvider("auth-internal").initialize()})),ft(new st("auth-internal",e=>{const t=xe(e.getProvider("auth").getImmediate());return(r=>new PC(r))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),$e(yp,Ip,CC(n)),$e(yp,Ip,"esm2020")}/**
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
 */const NC=5*60,DC=jp("authIdTokenMaxAge")||NC;let wp=null;const VC=n=>async e=>{const t=e&&await e.getIdTokenResult(),r=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(r&&r>DC)return;const s=t==null?void 0:t.token;wp!==s&&(wp=s,await fetch(n,{method:s?"POST":"DELETE",headers:s?{Authorization:`Bearer ${s}`}:{}}))};function Y(n=oa()){const e=En(n,"auth");if(e.isInitialized())return e.getImmediate();const t=mS(n,{popupRedirectResolver:SC,persistence:[Iy,py,Ql]}),r=jp("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const i=new URL(r,location.origin);if(location.origin===i.origin){const o=VC(i.toString());hP(t,o,()=>o(t.currentUser)),lP(t,c=>o(c))}}const s=Bp("auth");return s&&Au(t,`http://${s}`),t}function OC(){var n;return((n=document.getElementsByTagName("head"))==null?void 0:n[0])??document}nS({loadJS(n){return new Promise((e,t)=>{const r=document.createElement("script");r.setAttribute("src",n),r.onload=e,r.onerror=s=>{const i=Ye("internal-error");i.customData=s,t(i)},r.type="text/javascript",r.charset="UTF-8",OC().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});kC("Browser");/**
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
 */const xC="type.googleapis.com/google.protobuf.Int64Value",LC="type.googleapis.com/google.protobuf.UInt64Value";function Py(n,e){const t={};for(const r in n)n.hasOwnProperty(r)&&(t[r]=e(n[r]));return t}function ea(n){if(n==null)return null;if(n instanceof Number&&(n=n.valueOf()),typeof n=="number"&&isFinite(n)||n===!0||n===!1||Object.prototype.toString.call(n)==="[object String]")return n;if(n instanceof Date)return n.toISOString();if(Array.isArray(n))return n.map(e=>ea(e));if(typeof n=="function"||typeof n=="object")return Py(n,e=>ea(e));throw new Error("Data cannot be encoded in JSON: "+n)}function Xr(n){if(n==null)return n;if(n["@type"])switch(n["@type"]){case xC:case LC:{const e=Number(n.value);if(isNaN(e))throw new Error("Data cannot be decoded from JSON: "+n);return e}default:throw new Error("Data cannot be decoded from JSON: "+n)}return Array.isArray(n)?n.map(e=>Xr(e)):typeof n=="function"||typeof n=="object"?Py(n,e=>Xr(e)):n}/**
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
 */const Xl="functions";/**
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
 */const Ep={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class Je extends mt{constructor(e,t,r){super(`${Xl}/${e}`,t||""),this.details=r,Object.setPrototypeOf(this,Je.prototype)}}function MC(n){if(n>=200&&n<300)return"ok";switch(n){case 0:return"internal";case 400:return"invalid-argument";case 401:return"unauthenticated";case 403:return"permission-denied";case 404:return"not-found";case 409:return"aborted";case 429:return"resource-exhausted";case 499:return"cancelled";case 500:return"internal";case 501:return"unimplemented";case 503:return"unavailable";case 504:return"deadline-exceeded"}return"unknown"}function ta(n,e){let t=MC(n),r=t,s;try{const i=e&&e.error;if(i){const o=i.status;if(typeof o=="string"){if(!Ep[o])return new Je("internal","internal");t=Ep[o],r=o}const c=i.message;typeof c=="string"&&(r=c),s=i.details,s!==void 0&&(s=Xr(s))}}catch{}return t==="ok"?null:new Je(t,r,s)}/**
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
 */class FC{constructor(e,t,r,s){this.app=e,this.auth=null,this.messaging=null,this.appCheck=null,this.serverAppAppCheckToken=null,ye(e)&&e.settings.appCheckToken&&(this.serverAppAppCheckToken=e.settings.appCheckToken),this.auth=t.getImmediate({optional:!0}),this.messaging=r.getImmediate({optional:!0}),this.auth||t.get().then(i=>this.auth=i,()=>{}),this.messaging||r.get().then(i=>this.messaging=i,()=>{}),this.appCheck||s==null||s.get().then(i=>this.appCheck=i,()=>{})}async getAuthToken(){if(this.auth)try{const e=await this.auth.getToken();return e==null?void 0:e.accessToken}catch{return}}async getMessagingToken(){if(!(!this.messaging||!("Notification"in self)||Notification.permission!=="granted"))try{return await this.messaging.getToken()}catch{return}}async getAppCheckToken(e){if(this.serverAppAppCheckToken)return this.serverAppAppCheckToken;if(this.appCheck){const t=e?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return t.error?null:t.token}return null}async getContext(e){const t=await this.getAuthToken(),r=await this.getMessagingToken(),s=await this.getAppCheckToken(e);return{authToken:t,messagingToken:r,appCheckToken:s}}}/**
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
 */const bu="us-central1",UC=/^data: (.*?)(?:\n|$)/;function BC(n){let e=null;return{promise:new Promise((t,r)=>{e=setTimeout(()=>{r(new Je("deadline-exceeded","deadline-exceeded"))},n)}),cancel:()=>{e&&clearTimeout(e)}}}class qC{constructor(e,t,r,s,i=bu,o=(...c)=>fetch(...c)){this.app=e,this.fetchImpl=o,this.emulatorOrigin=null,this.contextProvider=new FC(e,t,r,s),this.cancelAllRequests=new Promise(c=>{this.deleteService=()=>Promise.resolve(c())});try{const c=new URL(i);this.customDomain=c.origin+(c.pathname==="/"?"":c.pathname),this.region=bu}catch{this.customDomain=null,this.region=i}}_delete(){return this.deleteService()}_url(e){const t=this.app.options.projectId;return this.emulatorOrigin!==null?`${this.emulatorOrigin}/${t}/${this.region}/${e}`:this.customDomain!==null?`${this.customDomain}/${e}`:`https://${this.region}-${t}.cloudfunctions.net/${e}`}}function $C(n,e,t){const r=kt(e);n.emulatorOrigin=`http${r?"s":""}://${e}:${t}`,r&&(sa(n.emulatorOrigin+"/backends"),Pu("Functions",!0))}function jC(n,e,t){const r=s=>zC(n,e,s,{});return r.stream=(s,i)=>KC(n,e,s,i),r}function Cy(n){return n.emulatorOrigin&&kt(n.emulatorOrigin)?"include":void 0}async function GC(n,e,t,r,s){t["Content-Type"]="application/json";let i;try{i=await r(n,{method:"POST",body:JSON.stringify(e),headers:t,credentials:Cy(s)})}catch{return{status:0,json:null}}let o=null;try{o=await i.json()}catch{}return{status:i.status,json:o}}async function ky(n,e){const t={},r=await n.contextProvider.getContext(e.limitedUseAppCheckTokens);return r.authToken&&(t.Authorization="Bearer "+r.authToken),r.messagingToken&&(t["Firebase-Instance-ID-Token"]=r.messagingToken),r.appCheckToken!==null&&(t["X-Firebase-AppCheck"]=r.appCheckToken),t}function zC(n,e,t,r){const s=n._url(e);return WC(n,s,t,r)}async function WC(n,e,t,r){t=ea(t);const s={data:t},i=await ky(n,r),o=r.timeout||7e4,c=BC(o),u=await Promise.race([GC(e,s,i,n.fetchImpl,n),c.promise,n.cancelAllRequests]);if(c.cancel(),!u)throw new Je("cancelled","Firebase Functions instance was deleted.");const l=ta(u.status,u.json);if(l)throw l;if(!u.json)throw new Je("internal","Response is not valid JSON object.");let f=u.json.data;if(typeof f>"u"&&(f=u.json.result),typeof f>"u")throw new Je("internal","Response is missing data field.");return{data:Xr(f)}}function KC(n,e,t,r){const s=n._url(e);return HC(n,s,t,r||{})}async function HC(n,e,t,r){var g;t=ea(t);const s={data:t},i=await ky(n,r);i["Content-Type"]="application/json",i.Accept="text/event-stream";let o;try{o=await n.fetchImpl(e,{method:"POST",body:JSON.stringify(s),headers:i,signal:r==null?void 0:r.signal,credentials:Cy(n)})}catch(v){if(v instanceof Error&&v.name==="AbortError"){const N=new Je("cancelled","Request was cancelled.");return{data:Promise.reject(N),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(N)}}}}}}const C=ta(0,null);return{data:Promise.reject(C),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(C)}}}}}}let c,u;const l=new Promise((v,C)=>{c=v,u=C});(g=r==null?void 0:r.signal)==null||g.addEventListener("abort",()=>{const v=new Je("cancelled","Request was cancelled.");u(v)});const f=o.body.getReader(),p=QC(f,c,u,r==null?void 0:r.signal);return{stream:{[Symbol.asyncIterator](){const v=p.getReader();return{async next(){const{value:C,done:N}=await v.read();return{value:C,done:N}},async return(){return await v.cancel(),{done:!0,value:void 0}}}}},data:l}}function QC(n,e,t,r){const s=(o,c)=>{const u=o.match(UC);if(!u)return;const l=u[1];try{const f=JSON.parse(l);if("result"in f){e(Xr(f.result));return}if("message"in f){c.enqueue(Xr(f.message));return}if("error"in f){const p=ta(0,f);c.error(p),t(p);return}}catch(f){if(f instanceof Je){c.error(f),t(f);return}}},i=new TextDecoder;return new ReadableStream({start(o){let c="";return u();async function u(){if(r!=null&&r.aborted){const l=new Je("cancelled","Request was cancelled");return o.error(l),t(l),Promise.resolve()}try{const{value:l,done:f}=await n.read();if(f){c.trim()&&s(c.trim(),o),o.close();return}if(r!=null&&r.aborted){const g=new Je("cancelled","Request was cancelled");o.error(g),t(g),await n.cancel();return}c+=i.decode(l,{stream:!0});const p=c.split(`
`);c=p.pop()||"";for(const g of p)g.trim()&&s(g.trim(),o);return u()}catch(l){const f=l instanceof Je?l:ta(0,null);o.error(f),t(f)}}},cancel(){return n.cancel()}})}const Tp="@firebase/functions",vp="0.13.1";/**
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
 */const JC="auth-internal",YC="app-check-internal",XC="messaging-internal";function ZC(n){const e=(t,{instanceIdentifier:r})=>{const s=t.getProvider("app").getImmediate(),i=t.getProvider(JC),o=t.getProvider(XC),c=t.getProvider(YC);return new qC(s,i,o,c,r)};ft(new st(Xl,e,"PUBLIC").setMultipleInstances(!0)),$e(Tp,vp,n),$e(Tp,vp,"esm2020")}/**
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
 */function oN(n=oa(),e=bu){const r=En(G(n),Xl).getImmediate({identifier:e}),s=qp("functions");return s&&ek(r,...s),r}function ek(n,e,t){$C(G(n),e,t)}function aN(n,e,t){return jC(G(n),e)}ZC();var br;(function(n){n.IndexedDbLocal="INDEXED_DB_LOCAL",n.InMemory="IN_MEMORY",n.BrowserLocal="BROWSER_LOCAL",n.BrowserSession="BROWSER_SESSION"})(br||(br={}));var nn;(function(n){n.APPLE="apple.com",n.FACEBOOK="facebook.com",n.GAME_CENTER="gc.apple.com",n.GITHUB="github.com",n.GOOGLE="google.com",n.MICROSOFT="microsoft.com",n.PLAY_GAMES="playgames.google.com",n.TWITTER="twitter.com",n.YAHOO="yahoo.com",n.PASSWORD="password",n.PHONE="phone"})(nn||(nn={}));const cN=Ti("FirebaseAuthentication",{web:()=>xp(()=>Promise.resolve().then(()=>tk),void 0).then(n=>new n.FirebaseAuthenticationWeb)});var Ap;(function(n){n[n.Min=1]="Min",n[n.Low=2]="Low",n[n.Default=3]="Default",n[n.High=4]="High",n[n.Max=5]="Max"})(Ap||(Ap={}));var Rp;(function(n){n[n.Secret=-1]="Secret",n[n.Private=0]="Private",n[n.Public=1]="Public"})(Rp||(Rp={}));const uN=Ti("FirebaseMessaging",{web:()=>xp(()=>Promise.resolve().then(()=>C0),void 0).then(n=>new n.FirebaseMessagingWeb)});class te extends vi{constructor(){super(),this.lastConfirmationResult=new Map;const e=Y();e.onAuthStateChanged(t=>this.handleAuthStateChange(t)),e.onIdTokenChanged(t=>void this.handleIdTokenChange(t))}async applyActionCode(e){const t=Y();return GS(t,e.oobCode)}async createUserWithEmailAndPassword(e){const t=Y(),r=await zS(t,e.email,e.password);return this.createSignInResult(r,null)}async confirmPasswordReset(e){const t=Y();return jS(t,e.oobCode,e.newPassword)}async confirmVerificationCode(e){const{verificationCode:t,verificationId:r}=e,s=this.lastConfirmationResult.get(r);if(!s)throw new Error(te.ERROR_CONFIRMATION_RESULT_MISSING);const i=await s.confirm(t);return this.createSignInResult(i,null)}async deleteUser(){const t=Y().currentUser;if(!t)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return fP(t)}async fetchSignInMethodsForEmail(e){const t=Y();return{signInMethods:await YS(t,e.email)}}async getPendingAuthResult(){throw this.unimplemented("Not implemented on web.")}async getCurrentUser(){const e=Y();return{user:this.createUserResult(e.currentUser)}}async getIdToken(e){const t=Y();if(!t.currentUser)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return{token:await t.currentUser.getIdToken(e==null?void 0:e.forceRefresh)||""}}async getIdTokenResult(e){const t=Y();if(!t.currentUser)throw new Error(te.ERROR_NO_USER_SIGNED_IN);const r=await t.currentUser.getIdTokenResult(e==null?void 0:e.forceRefresh);return Object.assign(Object.assign({},r),{authTime:Date.parse(r.authTime),expirationTime:Date.parse(r.expirationTime),issuedAtTime:Date.parse(r.issuedAtTime)})}async getRedirectResult(){const e=Y(),t=await QP(e),r=t?_e.credentialFromResult(t):null;return this.createSignInResult(t,r)}async getTenantId(){return{tenantId:Y().tenantId}}async isSignInWithEmailLink(e){const t=Y();return{isSignInWithEmailLink:HS(t,e.emailLink)}}async linkWithApple(e){const t=new _e(nn.APPLE);this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithEmailAndPassword(e){const t=$t.credential(e.email,e.password),r=await this.linkCurrentUserWithCredential(t);return this.createSignInResult(r,t)}async linkWithEmailLink(e){const t=$t.credentialWithLink(e.email,e.emailLink),r=await this.linkCurrentUserWithCredential(t);return this.createSignInResult(r,t)}async linkWithFacebook(e){const t=new ct;this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=ct.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithGameCenter(){throw this.unimplemented("Not implemented on web.")}async linkWithGithub(e){const t=new lt;this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=lt.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithGoogle(e){const t=new ut;this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=ut.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithMicrosoft(e){const t=new _e(nn.MICROSOFT);this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithOpenIdConnect(e){const t=new _e(e.providerId);this.applySignInOptions(e,t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithPhoneNumber(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);if(!e.phoneNumber)throw new Error(te.ERROR_PHONE_NUMBER_MISSING);if(!e.recaptchaVerifier||!(e.recaptchaVerifier instanceof fp))throw new Error(te.ERROR_RECAPTCHA_VERIFIER_MISSING);try{const s=await OP(r,e.phoneNumber,e.recaptchaVerifier),{verificationId:i}=s;this.lastConfirmationResult.set(i,s);const o={verificationId:i};this.notifyListeners(te.PHONE_CODE_SENT_EVENT,o)}catch(s){const i={message:this.getErrorMessage(s)};this.notifyListeners(te.PHONE_VERIFICATION_FAILED_EVENT,i)}}async linkWithPlayGames(){throw this.unimplemented("Not implemented on web.")}async linkWithTwitter(e){const t=new ht;this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=ht.credentialFromResult(r);return this.createSignInResult(r,s)}async linkWithYahoo(e){const t=new _e(nn.YAHOO);this.applySignInOptions(e||{},t);const r=await this.linkCurrentUserWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async reload(){const t=Y().currentUser;if(!t)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return j_(t)}async revokeAccessToken(e){const t=Y();return dP(t,e.token)}async sendEmailVerification(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return XS(r,e==null?void 0:e.actionCodeSettings)}async sendPasswordResetEmail(e){const t=Y();return $S(t,e.email,e.actionCodeSettings)}async sendSignInLinkToEmail(e){const t=Y();return KS(t,e.email,e.actionCodeSettings)}async setLanguageCode(e){const t=Y();t.languageCode=e.languageCode}async setPersistence(e){const t=Y();switch(e.persistence){case br.BrowserLocal:await ho(t,py);break;case br.BrowserSession:await ho(t,Ql);break;case br.IndexedDbLocal:await ho(t,Iy);break;case br.InMemory:await ho(t,vu);break}}async setTenantId(e){const t=Y();t.tenantId=e.tenantId}async signInAnonymously(){const e=Y(),t=await MS(e);return this.createSignInResult(t,null)}async signInWithApple(e){const t=new _e(nn.APPLE);this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithCustomToken(e){const t=Y(),r=await qS(t,e.token);return this.createSignInResult(r,null)}async signInWithEmailAndPassword(e){const t=Y(),r=await WS(t,e.email,e.password);return this.createSignInResult(r,null)}async signInWithEmailLink(e){const t=Y(),r=await QS(t,e.email,e.emailLink);return this.createSignInResult(r,null)}async signInWithFacebook(e){const t=new ct;this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=ct.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithGithub(e){const t=new lt;this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=lt.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithGoogle(e){const t=new ut;this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=ut.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithMicrosoft(e){const t=new _e(nn.MICROSOFT);this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithOpenIdConnect(e){const t=new _e(e.providerId);this.applySignInOptions(e,t);const r=await this.signInWithPopupOrRedirect(t,e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithPhoneNumber(e){if(!e.phoneNumber)throw new Error(te.ERROR_PHONE_NUMBER_MISSING);if(!e.recaptchaVerifier||!(e.recaptchaVerifier instanceof fp))throw new Error(te.ERROR_RECAPTCHA_VERIFIER_MISSING);const t=Y();try{const r=await VP(t,e.phoneNumber,e.recaptchaVerifier),{verificationId:s}=r;this.lastConfirmationResult.set(s,r);const i={verificationId:s};this.notifyListeners(te.PHONE_CODE_SENT_EVENT,i)}catch(r){const s={message:this.getErrorMessage(r)};this.notifyListeners(te.PHONE_VERIFICATION_FAILED_EVENT,s)}}async signInWithPlayGames(){throw this.unimplemented("Not implemented on web.")}async signInWithGameCenter(){throw this.unimplemented("Not implemented on web.")}async signInWithTwitter(e){const t=new ht;this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=ht.credentialFromResult(r);return this.createSignInResult(r,s)}async signInWithYahoo(e){const t=new _e(nn.YAHOO);this.applySignInOptions(e||{},t);const r=await this.signInWithPopupOrRedirect(t,e==null?void 0:e.mode),s=_e.credentialFromResult(r);return this.createSignInResult(r,s)}async signOut(){await Y().signOut()}async unlink(e){const t=Y();if(!t.currentUser)throw new Error(te.ERROR_NO_USER_SIGNED_IN);const r=await FS(t.currentUser,e.providerId);return{user:this.createUserResult(r)}}async updateEmail(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return nP(r,e.newEmail)}async updatePassword(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return rP(r,e.newPassword)}async updateProfile(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return tP(r,{displayName:e.displayName,photoURL:e.photoUrl})}async useAppLanguage(){Y().useDeviceLanguage()}async useEmulator(e){const t=Y(),r=e.port||9099,s=e.scheme||"http";e.host.includes("://")?Au(t,`${e.host}:${r}`):Au(t,`${s}://${e.host}:${r}`)}async verifyBeforeUpdateEmail(e){const r=Y().currentUser;if(!r)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return ZS(r,e==null?void 0:e.newEmail,e==null?void 0:e.actionCodeSettings)}handleAuthStateChange(e){const r={user:this.createUserResult(e)};this.notifyListeners(te.AUTH_STATE_CHANGE_EVENT,r,!0)}async handleIdTokenChange(e){if(!e)return;const r={token:await e.getIdToken(!1)};this.notifyListeners(te.ID_TOKEN_CHANGE_EVENT,r,!0)}applySignInOptions(e,t){if(e.customParameters){const r={};e.customParameters.map(s=>{r[s.key]=s.value}),t.setCustomParameters(r)}if(e.scopes)for(const r of e.scopes)t.addScope(r)}signInWithPopupOrRedirect(e,t){const r=Y();return t==="redirect"?zP(r,e):UP(r,e)}linkCurrentUserWithPopupOrRedirect(e,t){const r=Y();if(!r.currentUser)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return t==="redirect"?KP(r.currentUser,e):BP(r.currentUser,e)}linkCurrentUserWithCredential(e){const t=Y();if(!t.currentUser)throw new Error(te.ERROR_NO_USER_SIGNED_IN);return uy(t.currentUser,e)}requestAppTrackingTransparencyPermission(){throw this.unimplemented("Not implemented on web.")}checkAppTrackingTransparencyPermission(){throw this.unimplemented("Not implemented on web.")}createSignInResult(e,t){const r=this.createUserResult((e==null?void 0:e.user)||null),s=this.createCredentialResult(t),i=this.createAdditionalUserInfoResult(e);return{user:r,credential:s,additionalUserInfo:i}}createCredentialResult(e){if(!e)return null;const t={providerId:e.providerId};return e instanceof Pt&&(t.accessToken=e.accessToken,t.idToken=e.idToken,t.secret=e.secret),t}createUserResult(e){return e?{displayName:e.displayName,email:e.email,emailVerified:e.emailVerified,isAnonymous:e.isAnonymous,metadata:this.createUserMetadataResult(e.metadata),phoneNumber:e.phoneNumber,photoUrl:e.photoURL,providerData:this.createUserProviderDataResult(e.providerData),providerId:e.providerId,tenantId:e.tenantId,uid:e.uid}:null}createUserMetadataResult(e){const t={};return e.creationTime&&(t.creationTime=Date.parse(e.creationTime)),e.lastSignInTime&&(t.lastSignInTime=Date.parse(e.lastSignInTime)),t}createUserProviderDataResult(e){return e.map(t=>({displayName:t.displayName,email:t.email,phoneNumber:t.phoneNumber,photoUrl:t.photoURL,providerId:t.providerId,uid:t.uid}))}createAdditionalUserInfoResult(e){if(!e)return null;const t=uP(e);if(!t)return null;const{isNewUser:r,profile:s,providerId:i,username:o}=t,c={isNewUser:r};return i!==null&&(c.providerId=i),s!==null&&(c.profile=s),o!=null&&(c.username=o),c}getErrorMessage(e){return e instanceof Object&&"message"in e&&typeof e.message=="string"?e.message:JSON.stringify(e)}}te.AUTH_STATE_CHANGE_EVENT="authStateChange";te.ID_TOKEN_CHANGE_EVENT="idTokenChange";te.PHONE_CODE_SENT_EVENT="phoneCodeSent";te.PHONE_VERIFICATION_FAILED_EVENT="phoneVerificationFailed";te.ERROR_NO_USER_SIGNED_IN="No user is signed in.";te.ERROR_PHONE_NUMBER_MISSING="phoneNumber must be provided.";te.ERROR_RECAPTCHA_VERIFIER_MISSING="recaptchaVerifier must be provided and must be an instance of RecaptchaVerifier.";te.ERROR_CONFIRMATION_RESULT_MISSING="No confirmation result with this verification id was found.";const tk=Object.freeze(Object.defineProperty({__proto__:null,FirebaseAuthenticationWeb:te},Symbol.toStringTag,{value:"Module"})),Ny="@firebase/installations",Zl="0.6.19";/**
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
 */const Dy=1e4,Vy=`w:${Zl}`,Oy="FIS_v2",nk="https://firebaseinstallations.googleapis.com/v1",rk=60*60*1e3,sk="installations",ik="Installations";/**
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
 */const ok={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},sr=new ar(sk,ik,ok);function xy(n){return n instanceof mt&&n.code.includes("request-failed")}/**
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
 */function Ly({projectId:n}){return`${nk}/projects/${n}/installations`}function My(n){return{token:n.token,requestStatus:2,expiresIn:ck(n.expiresIn),creationTime:Date.now()}}async function Fy(n,e){const r=(await e.json()).error;return sr.create("request-failed",{requestName:n,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function Uy({apiKey:n}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":n})}function ak(n,{refreshToken:e}){const t=Uy(n);return t.append("Authorization",uk(e)),t}async function By(n){const e=await n();return e.status>=500&&e.status<600?n():e}function ck(n){return Number(n.replace("s","000"))}function uk(n){return`${Oy} ${n}`}/**
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
 */async function lk({appConfig:n,heartbeatServiceProvider:e},{fid:t}){const r=Ly(n),s=Uy(n),i=e.getImmediate({optional:!0});if(i){const l=await i.getHeartbeatsHeader();l&&s.append("x-firebase-client",l)}const o={fid:t,authVersion:Oy,appId:n.appId,sdkVersion:Vy},c={method:"POST",headers:s,body:JSON.stringify(o)},u=await By(()=>fetch(r,c));if(u.ok){const l=await u.json();return{fid:l.fid||t,registrationStatus:2,refreshToken:l.refreshToken,authToken:My(l.authToken)}}else throw await Fy("Create Installation",u)}/**
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
 */function qy(n){return new Promise(e=>{setTimeout(e,n)})}/**
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
 */function hk(n){return btoa(String.fromCharCode(...n)).replace(/\+/g,"-").replace(/\//g,"_")}/**
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
 */const dk=/^[cdef][\w-]{21}$/,Su="";function fk(){try{const n=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(n),n[0]=112+n[0]%16;const t=pk(n);return dk.test(t)?t:Su}catch{return Su}}function pk(n){return hk(n).substr(0,22)}/**
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
 */function qa(n){return`${n.appName}!${n.appId}`}/**
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
 */const $y=new Map;function jy(n,e){const t=qa(n);Gy(t,e),mk(t,e)}function Gy(n,e){const t=$y.get(n);if(t)for(const r of t)r(e)}function mk(n,e){const t=gk();t&&t.postMessage({key:n,fid:e}),_k()}let qn=null;function gk(){return!qn&&"BroadcastChannel"in self&&(qn=new BroadcastChannel("[Firebase] FID Change"),qn.onmessage=n=>{Gy(n.data.key,n.data.fid)}),qn}function _k(){$y.size===0&&qn&&(qn.close(),qn=null)}/**
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
 */const yk="firebase-installations-database",Ik=1,ir="firebase-installations-store";let Lc=null;function eh(){return Lc||(Lc=ia(yk,Ik,{upgrade:(n,e)=>{switch(e){case 0:n.createObjectStore(ir)}}})),Lc}async function na(n,e){const t=qa(n),s=(await eh()).transaction(ir,"readwrite"),i=s.objectStore(ir),o=await i.get(t);return await i.put(e,t),await s.done,(!o||o.fid!==e.fid)&&jy(n,e.fid),e}async function zy(n){const e=qa(n),r=(await eh()).transaction(ir,"readwrite");await r.objectStore(ir).delete(e),await r.done}async function $a(n,e){const t=qa(n),s=(await eh()).transaction(ir,"readwrite"),i=s.objectStore(ir),o=await i.get(t),c=e(o);return c===void 0?await i.delete(t):await i.put(c,t),await s.done,c&&(!o||o.fid!==c.fid)&&jy(n,c.fid),c}/**
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
 */async function th(n){let e;const t=await $a(n.appConfig,r=>{const s=wk(r),i=Ek(n,s);return e=i.registrationPromise,i.installationEntry});return t.fid===Su?{installationEntry:await e}:{installationEntry:t,registrationPromise:e}}function wk(n){const e=n||{fid:fk(),registrationStatus:0};return Wy(e)}function Ek(n,e){if(e.registrationStatus===0){if(!navigator.onLine){const s=Promise.reject(sr.create("app-offline"));return{installationEntry:e,registrationPromise:s}}const t={fid:e.fid,registrationStatus:1,registrationTime:Date.now()},r=Tk(n,t);return{installationEntry:t,registrationPromise:r}}else return e.registrationStatus===1?{installationEntry:e,registrationPromise:vk(n)}:{installationEntry:e}}async function Tk(n,e){try{const t=await lk(n,e);return na(n.appConfig,t)}catch(t){throw xy(t)&&t.customData.serverCode===409?await zy(n.appConfig):await na(n.appConfig,{fid:e.fid,registrationStatus:0}),t}}async function vk(n){let e=await bp(n.appConfig);for(;e.registrationStatus===1;)await qy(100),e=await bp(n.appConfig);if(e.registrationStatus===0){const{installationEntry:t,registrationPromise:r}=await th(n);return r||t}return e}function bp(n){return $a(n,e=>{if(!e)throw sr.create("installation-not-found");return Wy(e)})}function Wy(n){return Ak(n)?{fid:n.fid,registrationStatus:0}:n}function Ak(n){return n.registrationStatus===1&&n.registrationTime+Dy<Date.now()}/**
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
 */async function Rk({appConfig:n,heartbeatServiceProvider:e},t){const r=bk(n,t),s=ak(n,t),i=e.getImmediate({optional:!0});if(i){const l=await i.getHeartbeatsHeader();l&&s.append("x-firebase-client",l)}const o={installation:{sdkVersion:Vy,appId:n.appId}},c={method:"POST",headers:s,body:JSON.stringify(o)},u=await By(()=>fetch(r,c));if(u.ok){const l=await u.json();return My(l)}else throw await Fy("Generate Auth Token",u)}function bk(n,{fid:e}){return`${Ly(n)}/${e}/authTokens:generate`}/**
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
 */async function nh(n,e=!1){let t;const r=await $a(n.appConfig,i=>{if(!Ky(i))throw sr.create("not-registered");const o=i.authToken;if(!e&&Ck(o))return i;if(o.requestStatus===1)return t=Sk(n,e),i;{if(!navigator.onLine)throw sr.create("app-offline");const c=Nk(i);return t=Pk(n,c),c}});return t?await t:r.authToken}async function Sk(n,e){let t=await Sp(n.appConfig);for(;t.authToken.requestStatus===1;)await qy(100),t=await Sp(n.appConfig);const r=t.authToken;return r.requestStatus===0?nh(n,e):r}function Sp(n){return $a(n,e=>{if(!Ky(e))throw sr.create("not-registered");const t=e.authToken;return Dk(t)?{...e,authToken:{requestStatus:0}}:e})}async function Pk(n,e){try{const t=await Rk(n,e),r={...e,authToken:t};return await na(n.appConfig,r),t}catch(t){if(xy(t)&&(t.customData.serverCode===401||t.customData.serverCode===404))await zy(n.appConfig);else{const r={...e,authToken:{requestStatus:0}};await na(n.appConfig,r)}throw t}}function Ky(n){return n!==void 0&&n.registrationStatus===2}function Ck(n){return n.requestStatus===2&&!kk(n)}function kk(n){const e=Date.now();return e<n.creationTime||n.creationTime+n.expiresIn<e+rk}function Nk(n){const e={requestStatus:1,requestTime:Date.now()};return{...n,authToken:e}}function Dk(n){return n.requestStatus===1&&n.requestTime+Dy<Date.now()}/**
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
 */async function Vk(n){const e=n,{installationEntry:t,registrationPromise:r}=await th(e);return r?r.catch(console.error):nh(e).catch(console.error),t.fid}/**
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
 */async function Ok(n,e=!1){const t=n;return await xk(t),(await nh(t,e)).token}async function xk(n){const{registrationPromise:e}=await th(n);e&&await e}/**
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
 */function Lk(n){if(!n||!n.options)throw Mc("App Configuration");if(!n.name)throw Mc("App Name");const e=["projectId","apiKey","appId"];for(const t of e)if(!n.options[t])throw Mc(t);return{appName:n.name,projectId:n.options.projectId,apiKey:n.options.apiKey,appId:n.options.appId}}function Mc(n){return sr.create("missing-app-config-values",{valueName:n})}/**
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
 */const Hy="installations",Mk="installations-internal",Fk=n=>{const e=n.getProvider("app").getImmediate(),t=Lk(e),r=En(e,"heartbeat");return{app:e,appConfig:t,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},Uk=n=>{const e=n.getProvider("app").getImmediate(),t=En(e,Hy).getImmediate();return{getId:()=>Vk(t),getToken:s=>Ok(t,s)}};function Bk(){ft(new st(Hy,Fk,"PUBLIC")),ft(new st(Mk,Uk,"PRIVATE"))}Bk();$e(Ny,Zl);$e(Ny,Zl,"esm2020");/**
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
 */const qk="/firebase-messaging-sw.js",$k="/firebase-cloud-messaging-push-scope",Qy="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",jk="https://fcmregistrations.googleapis.com/v1",Jy="google.c.a.c_id",Gk="google.c.a.c_l",zk="google.c.a.ts",Wk="google.c.a.e",Pp=1e4;var Cp;(function(n){n[n.DATA_MESSAGE=1]="DATA_MESSAGE",n[n.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION"})(Cp||(Cp={}));/**
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
 */var Ei;(function(n){n.PUSH_RECEIVED="push-received",n.NOTIFICATION_CLICKED="notification-clicked"})(Ei||(Ei={}));/**
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
 */function Dt(n){const e=new Uint8Array(n);return btoa(String.fromCharCode(...e)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function Kk(n){const e="=".repeat((4-n.length%4)%4),t=(n+e).replace(/\-/g,"+").replace(/_/g,"/"),r=atob(t),s=new Uint8Array(r.length);for(let i=0;i<r.length;++i)s[i]=r.charCodeAt(i);return s}/**
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
 */const Fc="fcm_token_details_db",Hk=5,kp="fcm_token_object_Store";async function Qk(n){if("databases"in indexedDB&&!(await indexedDB.databases()).map(i=>i.name).includes(Fc))return null;let e=null;return(await ia(Fc,Hk,{upgrade:async(r,s,i,o)=>{if(s<2||!r.objectStoreNames.contains(kp))return;const c=o.objectStore(kp),u=await c.index("fcmSenderId").get(n);if(await c.clear(),!!u){if(s===2){const l=u;if(!l.auth||!l.p256dh||!l.endpoint)return;e={token:l.fcmToken,createTime:l.createTime??Date.now(),subscriptionOptions:{auth:l.auth,p256dh:l.p256dh,endpoint:l.endpoint,swScope:l.swScope,vapidKey:typeof l.vapidKey=="string"?l.vapidKey:Dt(l.vapidKey)}}}else if(s===3){const l=u;e={token:l.fcmToken,createTime:l.createTime,subscriptionOptions:{auth:Dt(l.auth),p256dh:Dt(l.p256dh),endpoint:l.endpoint,swScope:l.swScope,vapidKey:Dt(l.vapidKey)}}}else if(s===4){const l=u;e={token:l.fcmToken,createTime:l.createTime,subscriptionOptions:{auth:Dt(l.auth),p256dh:Dt(l.p256dh),endpoint:l.endpoint,swScope:l.swScope,vapidKey:Dt(l.vapidKey)}}}}}})).close(),await _c(Fc),await _c("fcm_vapid_details_db"),await _c("undefined"),Jk(e)?e:null}function Jk(n){if(!n||!n.subscriptionOptions)return!1;const{subscriptionOptions:e}=n;return typeof n.createTime=="number"&&n.createTime>0&&typeof n.token=="string"&&n.token.length>0&&typeof e.auth=="string"&&e.auth.length>0&&typeof e.p256dh=="string"&&e.p256dh.length>0&&typeof e.endpoint=="string"&&e.endpoint.length>0&&typeof e.swScope=="string"&&e.swScope.length>0&&typeof e.vapidKey=="string"&&e.vapidKey.length>0}/**
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
 */const Yk="firebase-messaging-database",Xk=1,or="firebase-messaging-store";let Uc=null;function rh(){return Uc||(Uc=ia(Yk,Xk,{upgrade:(n,e)=>{switch(e){case 0:n.createObjectStore(or)}}})),Uc}async function Yy(n){const e=ih(n),r=await(await rh()).transaction(or).objectStore(or).get(e);if(r)return r;{const s=await Qk(n.appConfig.senderId);if(s)return await sh(n,s),s}}async function sh(n,e){const t=ih(n),s=(await rh()).transaction(or,"readwrite");return await s.objectStore(or).put(e,t),await s.done,e}async function Zk(n){const e=ih(n),r=(await rh()).transaction(or,"readwrite");await r.objectStore(or).delete(e),await r.done}function ih({appConfig:n}){return n.appId}/**
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
 */const e0={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."},Me=new ar("messaging","Messaging",e0);/**
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
 */async function t0(n,e){const t=await ah(n),r=Zy(e),s={method:"POST",headers:t,body:JSON.stringify(r)};let i;try{i=await(await fetch(oh(n.appConfig),s)).json()}catch(o){throw Me.create("token-subscribe-failed",{errorInfo:o==null?void 0:o.toString()})}if(i.error){const o=i.error.message;throw Me.create("token-subscribe-failed",{errorInfo:o})}if(!i.token)throw Me.create("token-subscribe-no-token");return i.token}async function n0(n,e){const t=await ah(n),r=Zy(e.subscriptionOptions),s={method:"PATCH",headers:t,body:JSON.stringify(r)};let i;try{i=await(await fetch(`${oh(n.appConfig)}/${e.token}`,s)).json()}catch(o){throw Me.create("token-update-failed",{errorInfo:o==null?void 0:o.toString()})}if(i.error){const o=i.error.message;throw Me.create("token-update-failed",{errorInfo:o})}if(!i.token)throw Me.create("token-update-no-token");return i.token}async function Xy(n,e){const r={method:"DELETE",headers:await ah(n)};try{const i=await(await fetch(`${oh(n.appConfig)}/${e}`,r)).json();if(i.error){const o=i.error.message;throw Me.create("token-unsubscribe-failed",{errorInfo:o})}}catch(s){throw Me.create("token-unsubscribe-failed",{errorInfo:s==null?void 0:s.toString()})}}function oh({projectId:n}){return`${jk}/projects/${n}/registrations`}async function ah({appConfig:n,installations:e}){const t=await e.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":n.apiKey,"x-goog-firebase-installations-auth":`FIS ${t}`})}function Zy({p256dh:n,auth:e,endpoint:t,vapidKey:r}){const s={web:{endpoint:t,auth:e,p256dh:n}};return r!==Qy&&(s.web.applicationPubKey=r),s}/**
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
 */const r0=7*24*60*60*1e3;async function s0(n){const e=await a0(n.swRegistration,n.vapidKey),t={vapidKey:n.vapidKey,swScope:n.swRegistration.scope,endpoint:e.endpoint,auth:Dt(e.getKey("auth")),p256dh:Dt(e.getKey("p256dh"))},r=await Yy(n.firebaseDependencies);if(r){if(c0(r.subscriptionOptions,t))return Date.now()>=r.createTime+r0?o0(n,{token:r.token,createTime:Date.now(),subscriptionOptions:t}):r.token;try{await Xy(n.firebaseDependencies,r.token)}catch(s){console.warn(s)}return Np(n.firebaseDependencies,t)}else return Np(n.firebaseDependencies,t)}async function i0(n){const e=await Yy(n.firebaseDependencies);e&&(await Xy(n.firebaseDependencies,e.token),await Zk(n.firebaseDependencies));const t=await n.swRegistration.pushManager.getSubscription();return t?t.unsubscribe():!0}async function o0(n,e){try{const t=await n0(n.firebaseDependencies,e),r={...e,token:t,createTime:Date.now()};return await sh(n.firebaseDependencies,r),t}catch(t){throw t}}async function Np(n,e){const r={token:await t0(n,e),createTime:Date.now(),subscriptionOptions:e};return await sh(n,r),r.token}async function a0(n,e){const t=await n.pushManager.getSubscription();return t||n.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:Kk(e)})}function c0(n,e){const t=e.vapidKey===n.vapidKey,r=e.endpoint===n.endpoint,s=e.auth===n.auth,i=e.p256dh===n.p256dh;return t&&r&&s&&i}/**
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
 */function Dp(n){const e={from:n.from,collapseKey:n.collapse_key,messageId:n.fcmMessageId};return u0(e,n),l0(e,n),h0(e,n),e}function u0(n,e){if(!e.notification)return;n.notification={};const t=e.notification.title;t&&(n.notification.title=t);const r=e.notification.body;r&&(n.notification.body=r);const s=e.notification.image;s&&(n.notification.image=s);const i=e.notification.icon;i&&(n.notification.icon=i)}function l0(n,e){e.data&&(n.data=e.data)}function h0(n,e){var s,i,o,c;if(!e.fcmOptions&&!((s=e.notification)!=null&&s.click_action))return;n.fcmOptions={};const t=((i=e.fcmOptions)==null?void 0:i.link)??((o=e.notification)==null?void 0:o.click_action);t&&(n.fcmOptions.link=t);const r=(c=e.fcmOptions)==null?void 0:c.analytics_label;r&&(n.fcmOptions.analyticsLabel=r)}/**
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
 */function d0(n){return typeof n=="object"&&!!n&&Jy in n}/**
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
 */function f0(n){if(!n||!n.options)throw Bc("App Configuration Object");if(!n.name)throw Bc("App Name");const e=["projectId","apiKey","appId","messagingSenderId"],{options:t}=n;for(const r of e)if(!t[r])throw Bc(r);return{appName:n.name,projectId:t.projectId,apiKey:t.apiKey,appId:t.appId,senderId:t.messagingSenderId}}function Bc(n){return Me.create("missing-app-config-values",{valueName:n})}/**
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
 */class p0{constructor(e,t,r){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const s=f0(e);this.firebaseDependencies={app:e,appConfig:s,installations:t,analyticsProvider:r}}_delete(){return Promise.resolve()}}/**
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
 */async function eI(n){try{n.swRegistration=await navigator.serviceWorker.register(qk,{scope:$k}),n.swRegistration.update().catch(()=>{}),await m0(n.swRegistration)}catch(e){throw Me.create("failed-service-worker-registration",{browserErrorMessage:e==null?void 0:e.message})}}async function m0(n){return new Promise((e,t)=>{const r=setTimeout(()=>t(new Error(`Service worker not registered after ${Pp} ms`)),Pp),s=n.installing||n.waiting;n.active?(clearTimeout(r),e()):s?s.onstatechange=i=>{var o;((o=i.target)==null?void 0:o.state)==="activated"&&(s.onstatechange=null,clearTimeout(r),e())}:(clearTimeout(r),t(new Error("No incoming service worker found.")))})}/**
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
 */async function g0(n,e){if(!e&&!n.swRegistration&&await eI(n),!(!e&&n.swRegistration)){if(!(e instanceof ServiceWorkerRegistration))throw Me.create("invalid-sw-registration");n.swRegistration=e}}/**
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
 */async function _0(n,e){e?n.vapidKey=e:n.vapidKey||(n.vapidKey=Qy)}/**
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
 */async function tI(n,e){if(!navigator)throw Me.create("only-available-in-window");if(Notification.permission==="default"&&await Notification.requestPermission(),Notification.permission!=="granted")throw Me.create("permission-blocked");return await _0(n,e==null?void 0:e.vapidKey),await g0(n,e==null?void 0:e.serviceWorkerRegistration),s0(n)}/**
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
 */async function y0(n,e,t){const r=I0(e);(await n.firebaseDependencies.analyticsProvider.get()).logEvent(r,{message_id:t[Jy],message_name:t[Gk],message_time:t[zk],message_device_time:Math.floor(Date.now()/1e3)})}function I0(n){switch(n){case Ei.NOTIFICATION_CLICKED:return"notification_open";case Ei.PUSH_RECEIVED:return"notification_foreground";default:throw new Error}}/**
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
 */async function w0(n,e){const t=e.data;if(!t.isFirebaseMessaging)return;n.onMessageHandler&&t.messageType===Ei.PUSH_RECEIVED&&(typeof n.onMessageHandler=="function"?n.onMessageHandler(Dp(t)):n.onMessageHandler.next(Dp(t)));const r=t.data;d0(r)&&r[Wk]==="1"&&await y0(n,t.messageType,r)}const Vp="@firebase/messaging",Op="0.12.23";/**
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
 */const E0=n=>{const e=new p0(n.getProvider("app").getImmediate(),n.getProvider("installations-internal").getImmediate(),n.getProvider("analytics-internal"));return navigator.serviceWorker.addEventListener("message",t=>w0(e,t)),e},T0=n=>{const e=n.getProvider("messaging").getImmediate();return{getToken:r=>tI(e,r)}};function v0(){ft(new st("messaging",E0,"PUBLIC")),ft(new st("messaging-internal",T0,"PRIVATE")),$e(Vp,Op),$e(Vp,Op,"esm2020")}/**
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
 */async function Bs(){try{await Kp()}catch{return!1}return typeof window<"u"&&Cu()&&XI()&&"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&"fetch"in window&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}/**
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
 */async function A0(n){if(!navigator)throw Me.create("only-available-in-window");return n.swRegistration||await eI(n),i0(n)}/**
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
 */function R0(n,e){if(!navigator)throw Me.create("only-available-in-window");return n.onMessageHandler=e,()=>{n.onMessageHandler=null}}/**
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
 */function qc(n=oa()){return Bs().then(e=>{if(!e)throw Me.create("unsupported-browser")},e=>{throw Me.create("indexed-db-unsupported")}),En(G(n),"messaging").getImmediate()}async function b0(n,e){return n=G(n),tI(n,e)}function S0(n){return n=G(n),A0(n)}function P0(n,e){return n=G(n),R0(n,e)}v0();class ja extends vi{constructor(){super(),Bs().then(e=>{if(!e)return;const t=qc();P0(t,r=>this.handleNotificationReceived(r))})}async checkPermissions(){return await Bs()?{receive:this.convertNotificationPermissionToPermissionState(Notification.permission)}:{receive:"denied"}}async requestPermissions(){if(!await Bs())return{receive:"denied"};const t=await Notification.requestPermission();return{receive:this.convertNotificationPermissionToPermissionState(t)}}async isSupported(){return{isSupported:await Bs()}}async getToken(e){const t=qc();return{token:await b0(t,{vapidKey:e.vapidKey,serviceWorkerRegistration:e.serviceWorkerRegistration})}}async deleteToken(){const e=qc();await S0(e)}async getDeliveredNotifications(){this.throwUnimplementedError()}async removeDeliveredNotifications(e){this.throwUnimplementedError()}async removeAllDeliveredNotifications(){this.throwUnimplementedError()}async subscribeToTopic(e){this.throwUnimplementedError()}async unsubscribeFromTopic(e){this.throwUnimplementedError()}async createChannel(e){this.throwUnimplementedError()}async deleteChannel(e){this.throwUnimplementedError()}async listChannels(){this.throwUnimplementedError()}handleNotificationReceived(e){const r={notification:this.createNotificationResult(e)};this.notifyListeners(ja.notificationReceivedEvent,r)}createNotificationResult(e){var t,r,s;return{body:(t=e.notification)===null||t===void 0?void 0:t.body,data:e.data,id:e.messageId,image:(r=e.notification)===null||r===void 0?void 0:r.image,title:(s=e.notification)===null||s===void 0?void 0:s.title}}convertNotificationPermissionToPermissionState(e){let t="prompt";switch(e){case"granted":t="granted";break;case"denied":t="denied";break}return t}throwUnimplementedError(){throw this.unimplemented("Not implemented on web.")}}ja.notificationReceivedEvent="notificationReceived";const C0=Object.freeze(Object.defineProperty({__proto__:null,FirebaseMessagingWeb:ja},Symbol.toStringTag,{value:"Module"}));export{U0 as A,F0 as B,Kc as C,M0 as D,D0 as E,uN as F,ut as G,K0 as H,O0 as I,B0 as J,H0 as K,Z0 as L,J0 as M,x0 as N,_e as O,Q0 as P,W0 as Q,Y0 as R,z0 as S,re as T,q0 as U,nN as V,eN as W,tN as X,vi as Y,xp as _,V0 as a,mR as b,j0 as c,mS as d,oN as e,py as f,rN as g,SC as h,rE as i,Iy as j,aN as k,$S as l,ho as m,WS as n,sN as o,$0 as p,zS as q,Ti as r,iN as s,cN as t,Kl as u,UP as v,ZA as w,X0 as x,G0 as y,L0 as z};
