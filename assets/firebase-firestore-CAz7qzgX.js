import{L as Fc,I as ut,_ as Mc,g as ce,F as Oc,a as Ve,b as Lc,d as qc,i as pa,p as Uc,c as ya,e as Bc,E as zc,X as Gc,f as Kc,h as as,W as er,j as $c,k as yr,l as jc,m as Qc,n as Ia,M as Wc,S as Qi,o as Hc,C as Jc,r as Wi,q as Yc}from"./firebase-core-935b67bD.js";/**
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
 */class re{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}re.UNAUTHENTICATED=new re(null),re.GOOGLE_CREDENTIALS=new re("google-credentials-uid"),re.FIRST_PARTY=new re("first-party-uid"),re.MOCK_USER=new re("mock-user");/**
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
 */let tn="12.8.0";function Xc(r){tn=r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */const dt=new Fc("@firebase/firestore");function Ct(){return dt.logLevel}function g(r,...e){if(dt.logLevel<=Ve.DEBUG){const t=e.map(Gs);dt.debug(`Firestore (${tn}): ${r}`,...t)}}function K(r,...e){if(dt.logLevel<=Ve.ERROR){const t=e.map(Gs);dt.error(`Firestore (${tn}): ${r}`,...t)}}function Vn(r,...e){if(dt.logLevel<=Ve.WARN){const t=e.map(Gs);dt.warn(`Firestore (${tn}): ${r}`,...t)}}function Gs(r){if(typeof r=="string")return r;try{return function(t){return JSON.stringify(t)}(r)}catch{return r}}/**
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
 */function T(r,e,t){let n="Unexpected state";typeof e=="string"?n=e:t=e,Ta(r,n,t)}function Ta(r,e,t){let n=`FIRESTORE (${tn}) INTERNAL ASSERTION FAILED: ${e} (ID: ${r.toString(16)})`;if(t!==void 0)try{n+=" CONTEXT: "+JSON.stringify(t)}catch{n+=" CONTEXT: "+t}throw K(n),new Error(n)}function v(r,e,t,n){let s="Unexpected state";typeof t=="string"?s=t:n=t,r||Ta(e,s,n)}function w(r,e){return r}/**
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
 */const m={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class p extends Oc{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
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
 */class ge{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
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
 */class Zc{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class el{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(re.UNAUTHENTICATED))}shutdown(){}}class tl{constructor(e){this.t=e,this.currentUser=re.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){v(this.o===void 0,42304);let n=this.i;const s=u=>this.i!==n?(n=this.i,t(u)):Promise.resolve();let i=new ge;this.o=()=>{this.i++,this.currentUser=this.u(),i.resolve(),i=new ge,e.enqueueRetryable(()=>s(this.currentUser))};const o=()=>{const u=i;e.enqueueRetryable(async()=>{await u.promise,await s(this.currentUser)})},a=u=>{g("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(u=>a(u)),setTimeout(()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?a(u):(g("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new ge)}},0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(n=>this.i!==e?(g("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?(v(typeof n.accessToken=="string",31837,{l:n}),new Zc(n.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return v(e===null||typeof e=="string",2055,{h:e}),new re(e)}}class nl{constructor(e,t,n){this.P=e,this.T=t,this.I=n,this.type="FirstParty",this.user=re.FIRST_PARTY,this.R=new Map}A(){return this.I?this.I():null}get headers(){this.R.set("X-Goog-AuthUser",this.P);const e=this.A();return e&&this.R.set("Authorization",e),this.T&&this.R.set("X-Goog-Iam-Authorization-Token",this.T),this.R}}class rl{constructor(e,t,n){this.P=e,this.T=t,this.I=n}getToken(){return Promise.resolve(new nl(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable(()=>t(re.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class Hi{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class sl{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,Mc(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){v(this.o===void 0,3512);const n=i=>{i.error!=null&&g("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${i.error.message}`);const o=i.token!==this.m;return this.m=i.token,g("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(i.token):Promise.resolve()};this.o=i=>{e.enqueueRetryable(()=>n(i))};const s=i=>{g("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=i,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(i=>s(i)),setTimeout(()=>{if(!this.appCheck){const i=this.V.getImmediate({optional:!0});i?s(i):g("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new Hi(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?(v(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new Hi(t.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function il(r){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(r);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let n=0;n<r;n++)t[n]=Math.floor(256*Math.random());return t}/**
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
 */class Ks{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let n="";for(;n.length<20;){const s=il(40);for(let i=0;i<s.length;++i)n.length<20&&s[i]<t&&(n+=e.charAt(s[i]%62))}return n}}function V(r,e){return r<e?-1:r>e?1:0}function ps(r,e){const t=Math.min(r.length,e.length);for(let n=0;n<t;n++){const s=r.charAt(n),i=e.charAt(n);if(s!==i)return us(s)===us(i)?V(s,i):us(s)?1:-1}return V(r.length,e.length)}const ol=55296,al=57343;function us(r){const e=r.charCodeAt(0);return e>=ol&&e<=al}function Lt(r,e,t){return r.length===e.length&&r.every((n,s)=>t(n,e[s]))}function Ea(r){return r+"\0"}/**
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
 */const ys="__name__";class Ie{constructor(e,t,n){t===void 0?t=0:t>e.length&&T(637,{offset:t,range:e.length}),n===void 0?n=e.length-t:n>e.length-t&&T(1746,{length:n,range:e.length-t}),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return Ie.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof Ie?e.forEach(n=>{t.push(n)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let s=0;s<n;s++){const i=Ie.compareSegments(e.get(s),t.get(s));if(i!==0)return i}return V(e.length,t.length)}static compareSegments(e,t){const n=Ie.isNumericId(e),s=Ie.isNumericId(t);return n&&!s?-1:!n&&s?1:n&&s?Ie.extractNumericId(e).compare(Ie.extractNumericId(t)):ps(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return ut.fromString(e.substring(4,e.length-2))}}class x extends Ie{construct(e,t,n){return new x(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new p(m.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter(s=>s.length>0))}return new x(t)}static emptyPath(){return new x([])}}const ul=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class z extends Ie{construct(e,t,n){return new z(e,t,n)}static isValidIdentifier(e){return ul.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),z.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===ys}static keyField(){return new z([ys])}static fromServerFormat(e){const t=[];let n="",s=0;const i=()=>{if(n.length===0)throw new p(m.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let o=!1;for(;s<e.length;){const a=e[s];if(a==="\\"){if(s+1===e.length)throw new p(m.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[s+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new p(m.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=u,s+=2}else a==="`"?(o=!o,s++):a!=="."||o?(n+=a,s++):(i(),s++)}if(i(),o)throw new p(m.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new z(t)}static emptyPath(){return new z([])}}/**
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
 */class y{constructor(e){this.path=e}static fromPath(e){return new y(x.fromString(e))}static fromName(e){return new y(x.fromString(e).popFirst(5))}static empty(){return new y(x.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&x.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return x.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new y(new x(e.slice()))}}/**
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
 */function wa(r,e,t){if(!t)throw new p(m.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${e}.`)}function cl(r,e,t,n){if(e===!0&&n===!0)throw new p(m.INVALID_ARGUMENT,`${r} and ${t} cannot be used together.`)}function Ji(r){if(!y.isDocumentKey(r))throw new p(m.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function Yi(r){if(y.isDocumentKey(r))throw new p(m.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function Aa(r){return typeof r=="object"&&r!==null&&(Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)}function Or(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const e=function(n){return n.constructor?n.constructor.name:null}(r);return e?`a custom ${e} object`:"an object"}}return typeof r=="function"?"a function":T(12329,{type:typeof r})}function Z(r,e){if("_delegate"in r&&(r=r._delegate),!(r instanceof e)){if(e.name===r.constructor.name)throw new p(m.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=Or(r);throw new p(m.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return r}function ll(r,e){if(e<=0)throw new p(m.INVALID_ARGUMENT,`Function ${r}() requires a positive number, but it was: ${e}.`)}/**
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
 */function Q(r,e){const t={typeString:r};return e&&(t.value=e),t}function zn(r,e){if(!Aa(r))throw new p(m.INVALID_ARGUMENT,"JSON must be an object");let t;for(const n in e)if(e[n]){const s=e[n].typeString,i="value"in e[n]?{value:e[n].value}:void 0;if(!(n in r)){t=`JSON missing required field: '${n}'`;break}const o=r[n];if(s&&typeof o!==s){t=`JSON field '${n}' must be a ${s}.`;break}if(i!==void 0&&o!==i.value){t=`Expected '${n}' field to equal '${i.value}'`;break}}if(t)throw new p(m.INVALID_ARGUMENT,t);return!0}/**
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
 */const Xi=-62135596800,Zi=1e6;class k{static now(){return k.fromMillis(Date.now())}static fromDate(e){return k.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor((e-1e3*t)*Zi);return new k(t,n)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new p(m.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new p(m.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<Xi)throw new p(m.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new p(m.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/Zi}_compareTo(e){return this.seconds===e.seconds?V(this.nanoseconds,e.nanoseconds):V(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:k._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(zn(e,k._jsonSchema))return new k(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-Xi;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}k._jsonSchemaVersion="firestore/timestamp/1.0",k._jsonSchema={type:Q("string",k._jsonSchemaVersion),seconds:Q("number"),nanoseconds:Q("number")};/**
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
 */class R{static fromTimestamp(e){return new R(e)}static min(){return new R(new k(0,0))}static max(){return new R(new k(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */const qt=-1;class Ir{constructor(e,t,n,s){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=s}}function Is(r){return r.fields.find(e=>e.kind===2)}function tt(r){return r.fields.filter(e=>e.kind!==2)}Ir.UNKNOWN_ID=-1;class ar{constructor(e,t){this.fieldPath=e,this.kind=t}}class Pn{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new Pn(0,me.min())}}function va(r,e){const t=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,s=R.fromTimestamp(n===1e9?new k(t+1,0):new k(t,n));return new me(s,y.empty(),e)}function Ra(r){return new me(r.readTime,r.key,qt)}class me{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new me(R.min(),y.empty(),qt)}static max(){return new me(R.max(),y.empty(),qt)}}function $s(r,e){let t=r.readTime.compareTo(e.readTime);return t!==0?t:(t=y.comparator(r.documentKey,e.documentKey),t!==0?t:V(r.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Va="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Pa{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
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
 */async function He(r){if(r.code!==m.FAILED_PRECONDITION||r.message!==Va)throw r;g("LocalStore","Unexpectedly lost primary lease")}/**
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
 */class f{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)},t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&T(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new f((n,s)=>{this.nextCallback=i=>{this.wrapSuccess(e,i).next(n,s)},this.catchCallback=i=>{this.wrapFailure(t,i).next(n,s)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof f?t:f.resolve(t)}catch(t){return f.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):f.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):f.reject(t)}static resolve(e){return new f((t,n)=>{t(e)})}static reject(e){return new f((t,n)=>{n(e)})}static waitFor(e){return new f((t,n)=>{let s=0,i=0,o=!1;e.forEach(a=>{++s,a.next(()=>{++i,o&&i===s&&t()},u=>n(u))}),o=!0,i===s&&t()})}static or(e){let t=f.resolve(!1);for(const n of e)t=t.next(s=>s?f.resolve(s):n());return t}static forEach(e,t){const n=[];return e.forEach((s,i)=>{n.push(t.call(this,s,i))}),this.waitFor(n)}static mapArray(e,t){return new f((n,s)=>{const i=e.length,o=new Array(i);let a=0;for(let u=0;u<i;u++){const c=u;t(e[c]).next(l=>{o[c]=l,++a,a===i&&n(o)},l=>s(l))}})}static doWhile(e,t){return new f((n,s)=>{const i=()=>{e()===!0?t().next(()=>{i()},s):n()};i()})}}/**
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
 */const le="SimpleDb";class Lr{static open(e,t,n,s){try{return new Lr(t,e.transaction(s,n))}catch(i){throw new yn(t,i)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new ge,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new yn(e,t.error)):this.S.resolve()},this.transaction.onerror=n=>{const s=js(n.target.error);this.S.reject(new yn(e,s))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||(g(le,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}C(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new dl(t)}}class Be{static delete(e){return g(le,"Removing database:",e),rt(jc().indexedDB.deleteDatabase(e)).toPromise()}static v(){if(!Qc())return!1;if(Be.F())return!0;const e=yr(),t=Be.M(e),n=0<t&&t<10,s=Sa(e),i=0<s&&s<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||i)}static F(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)==null?void 0:e.__PRIVATE_USE_MOCK_PERSISTENCE)==="YES"}static O(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}constructor(e,t,n){this.name=e,this.version=t,this.N=n,this.B=null,Be.M(yr())===12.2&&K("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async L(e){return this.db||(g(le,"Opening database:",this.name),this.db=await new Promise((t,n)=>{const s=indexedDB.open(this.name,this.version);s.onsuccess=i=>{const o=i.target.result;t(o)},s.onblocked=()=>{n(new yn(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},s.onerror=i=>{const o=i.target.error;o.name==="VersionError"?n(new p(m.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?n(new p(m.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):n(new yn(e,o))},s.onupgradeneeded=i=>{g(le,'Database "'+this.name+'" requires upgrade from version:',i.oldVersion);const o=i.target.result;this.N.k(o,s.transaction,i.oldVersion,this.version).next(()=>{g(le,"Database upgrade to version "+this.version+" complete")})}})),this.K&&(this.db.onversionchange=t=>this.K(t)),this.db}q(e){this.K=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,n,s){const i=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.L(e);const a=Lr.open(this.db,e,i?"readonly":"readwrite",n),u=s(a).next(c=>(a.C(),c)).catch(c=>(a.abort(c),f.reject(c))).toPromise();return u.catch(()=>{}),await a.D,u}catch(a){const u=a,c=u.name!=="FirebaseError"&&o<3;if(g(le,"Transaction failed with error:",u.message,"Retrying:",c),this.close(),!c)return Promise.reject(u)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Sa(r){const e=r.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class hl{constructor(e){this.U=e,this.$=!1,this.W=null}get isDone(){return this.$}get G(){return this.W}set cursor(e){this.U=e}done(){this.$=!0}j(e){this.W=e}delete(){return rt(this.U.delete())}}class yn extends p{constructor(e,t){super(m.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function Je(r){return r.name==="IndexedDbTransactionError"}class dl{constructor(e){this.store=e}put(e,t){let n;return t!==void 0?(g(le,"PUT",this.store.name,e,t),n=this.store.put(t,e)):(g(le,"PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),rt(n)}add(e){return g(le,"ADD",this.store.name,e,e),rt(this.store.add(e))}get(e){return rt(this.store.get(e)).next(t=>(t===void 0&&(t=null),g(le,"GET",this.store.name,e,t),t))}delete(e){return g(le,"DELETE",this.store.name,e),rt(this.store.delete(e))}count(){return g(le,"COUNT",this.store.name),rt(this.store.count())}H(e,t){const n=this.options(e,t),s=n.index?this.store.index(n.index):this.store;if(typeof s.getAll=="function"){const i=s.getAll(n.range);return new f((o,a)=>{i.onerror=u=>{a(u.target.error)},i.onsuccess=u=>{o(u.target.result)}})}{const i=this.cursor(n),o=[];return this.J(i,(a,u)=>{o.push(u)}).next(()=>o)}}Z(e,t){const n=this.store.getAll(e,t===null?void 0:t);return new f((s,i)=>{n.onerror=o=>{i(o.target.error)},n.onsuccess=o=>{s(o.target.result)}})}X(e,t){g(le,"DELETE ALL",this.store.name);const n=this.options(e,t);n.Y=!1;const s=this.cursor(n);return this.J(s,(i,o,a)=>a.delete())}ee(e,t){let n;t?n=e:(n={},t=e);const s=this.cursor(n);return this.J(s,t)}te(e){const t=this.cursor({});return new f((n,s)=>{t.onerror=i=>{const o=js(i.target.error);s(o)},t.onsuccess=i=>{const o=i.target.result;o?e(o.primaryKey,o.value).next(a=>{a?o.continue():n()}):n()}})}J(e,t){const n=[];return new f((s,i)=>{e.onerror=o=>{i(o.target.error)},e.onsuccess=o=>{const a=o.target.result;if(!a)return void s();const u=new hl(a),c=t(a.primaryKey,a.value,u);if(c instanceof f){const l=c.catch(h=>(u.done(),f.reject(h)));n.push(l)}u.isDone?s():u.G===null?a.continue():a.continue(u.G)}}).next(()=>f.waitFor(n))}options(e,t){let n;return e!==void 0&&(typeof e=="string"?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.Y?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function rt(r){return new f((e,t)=>{r.onsuccess=n=>{const s=n.target.result;e(s)},r.onerror=n=>{const s=js(n.target.error);t(s)}})}let eo=!1;function js(r){const e=Be.M(yr());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(t)>=0){const n=new p("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return eo||(eo=!0,setTimeout(()=>{throw n},0)),n}}return r}const In="IndexBackfiller";class fl{constructor(e,t){this.asyncQueue=e,this.ne=t,this.task=null}start(){this.re(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}re(e){g(In,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{const t=await this.ne.ie();g(In,`Documents written: ${t}`)}catch(t){Je(t)?g(In,"Ignoring IndexedDB error during index backfill: ",t):await He(t)}await this.re(6e4)})}}class ml{constructor(e,t){this.localStore=e,this.persistence=t}async ie(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.se(t,e))}se(e,t){const n=new Set;let s=t,i=!0;return f.doWhile(()=>i===!0&&s>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(o=>{if(o!==null&&!n.has(o))return g(In,`Processing collection: ${o}`),this.oe(e,o,s).next(a=>{s-=a,n.add(o)});i=!1})).next(()=>t-s)}oe(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(s=>this.localStore.localDocuments.getNextDocuments(e,t,s,n).next(i=>{const o=i.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next(()=>this._e(s,i)).next(a=>(g(In,`Updating offset: ${a}`),this.localStore.indexManager.updateCollectionGroup(e,t,a))).next(()=>o.size)}))}_e(e,t){let n=e;return t.changes.forEach((s,i)=>{const o=Ra(i);$s(o,n)>0&&(n=o)}),new me(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
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
 */class ae{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=n=>this.ae(n),this.ue=n=>t.writeSequenceNumber(n))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}ae.ce=-1;/**
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
 */const ct=-1;function Gn(r){return r==null}function Sn(r){return r===0&&1/r==-1/0}function ba(r){return typeof r=="number"&&Number.isInteger(r)&&!Sn(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}/**
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
 */const Tr="";function ie(r){let e="";for(let t=0;t<r.length;t++)e.length>0&&(e=to(e)),e=_l(r.get(t),e);return to(e)}function _l(r,e){let t=e;const n=r.length;for(let s=0;s<n;s++){const i=r.charAt(s);switch(i){case"\0":t+="";break;case Tr:t+="";break;default:t+=i}}return t}function to(r){return r+Tr+""}function Ee(r){const e=r.length;if(v(e>=2,64408,{path:r}),e===2)return v(r.charAt(0)===Tr&&r.charAt(1)==="",56145,{path:r}),x.emptyPath();const t=e-2,n=[];let s="";for(let i=0;i<e;){const o=r.indexOf(Tr,i);switch((o<0||o>t)&&T(50515,{path:r}),r.charAt(o+1)){case"":const a=r.substring(i,o);let u;s.length===0?u=a:(s+=a,u=s,s=""),n.push(u);break;case"":s+=r.substring(i,o),s+="\0";break;case"":s+=r.substring(i,o+1);break;default:T(61167,{path:r})}i=o+2}return new x(n)}/**
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
 */const nt="remoteDocuments",Kn="owner",vt="owner",bn="mutationQueues",gl="userId",pe="mutations",no="batchId",at="userMutationsIndex",ro=["userId","batchId"];/**
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
 */function ur(r,e){return[r,ie(e)]}function Ca(r,e,t){return[r,ie(e),t]}const pl={},Ut="documentMutations",Er="remoteDocumentsV14",yl=["prefixPath","collectionGroup","readTime","documentId"],cr="documentKeyIndex",Il=["prefixPath","collectionGroup","documentId"],Da="collectionGroupIndex",Tl=["collectionGroup","readTime","prefixPath","documentId"],Cn="remoteDocumentGlobal",Ts="remoteDocumentGlobalKey",Bt="targets",xa="queryTargetsIndex",El=["canonicalId","targetId"],zt="targetDocuments",wl=["targetId","path"],Qs="documentTargetsIndex",Al=["path","targetId"],wr="targetGlobalKey",lt="targetGlobal",Dn="collectionParents",vl=["collectionId","parent"],Gt="clientMetadata",Rl="clientId",qr="bundles",Vl="bundleId",Ur="namedQueries",Pl="name",Ws="indexConfiguration",Sl="indexId",Es="collectionGroupIndex",bl="collectionGroup",Tn="indexState",Cl=["indexId","uid"],Na="sequenceNumberIndex",Dl=["uid","sequenceNumber"],En="indexEntries",xl=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],ka="documentKeyIndex",Nl=["indexId","uid","orderedDocumentKey"],Br="documentOverlays",kl=["userId","collectionPath","documentId"],ws="collectionPathOverlayIndex",Fl=["userId","collectionPath","largestBatchId"],Fa="collectionGroupOverlayIndex",Ml=["userId","collectionGroup","largestBatchId"],Hs="globals",Ol="name",Ma=[bn,pe,Ut,nt,Bt,Kn,lt,zt,Gt,Cn,Dn,qr,Ur],Ll=[...Ma,Br],Oa=[bn,pe,Ut,Er,Bt,Kn,lt,zt,Gt,Cn,Dn,qr,Ur,Br],La=Oa,Js=[...La,Ws,Tn,En],ql=Js,qa=[...Js,Hs],Ul=qa;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class As extends Pa{constructor(e,t){super(),this.le=e,this.currentSequenceNumber=t}}function H(r,e){const t=w(r);return Be.O(t.le,e)}/**
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
 */function so(r){let e=0;for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e++;return e}function Ye(r,e){for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e(t,r[t])}function Bl(r,e){const t=[];for(const n in r)Object.prototype.hasOwnProperty.call(r,n)&&t.push(e(r[n],n,r));return t}function Ua(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}/**
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
 */class O{constructor(e,t){this.comparator=e,this.root=t||te.EMPTY}insert(e,t){return new O(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,te.BLACK,null,null))}remove(e){return new O(this.comparator,this.root.remove(e,this.comparator).copy(null,null,te.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(n===0)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const s=this.comparator(e,n.key);if(s===0)return t+n.left.size;s<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,n)=>(e(t,n),!1))}toString(){const e=[];return this.inorderTraversal((t,n)=>(e.push(`${t}:${n}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new tr(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new tr(this.root,e,this.comparator,!1)}getReverseIterator(){return new tr(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new tr(this.root,e,this.comparator,!0)}}class tr{constructor(e,t,n,s){this.isReverse=s,this.nodeStack=[];let i=1;for(;!e.isEmpty();)if(i=t?n(e.key,t):1,t&&s&&(i*=-1),i<0)e=this.isReverse?e.left:e.right;else{if(i===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class te{constructor(e,t,n,s,i){this.key=e,this.value=t,this.color=n??te.RED,this.left=s??te.EMPTY,this.right=i??te.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,s,i){return new te(e??this.key,t??this.value,n??this.color,s??this.left,i??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let s=this;const i=n(e,s.key);return s=i<0?s.copy(null,null,null,s.left.insert(e,t,n),null):i===0?s.copy(null,t,null,null,null):s.copy(null,null,null,null,s.right.insert(e,t,n)),s.fixUp()}removeMin(){if(this.left.isEmpty())return te.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,s=this;if(t(e,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(e,t),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),t(e,s.key)===0){if(s.right.isEmpty())return te.EMPTY;n=s.right.min(),s=s.copy(n.key,n.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(e,t))}return s.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,te.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,te.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw T(43730,{key:this.key,value:this.value});if(this.right.isRed())throw T(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw T(27949);return e+(this.isRed()?0:1)}}te.EMPTY=null,te.RED=!0,te.BLACK=!1;te.EMPTY=new class{constructor(){this.size=0}get key(){throw T(57766)}get value(){throw T(16141)}get color(){throw T(16727)}get left(){throw T(29726)}get right(){throw T(36894)}copy(e,t,n,s,i){return this}insert(e,t,n){return new te(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
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
 */class M{constructor(e){this.comparator=e,this.data=new O(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,n)=>(e(t),!1))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const s=n.getNext();if(this.comparator(s.key,e[1])>=0)return;t(s.key)}}forEachWhile(e,t){let n;for(n=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new io(this.data.getIterator())}getIteratorFrom(e){return new io(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(n=>{t=t.add(n)}),t}isEqual(e){if(!(e instanceof M)||this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=n.getNext().key;if(this.comparator(s,i)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new M(this.comparator);return t.data=e,t}}class io{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function Rt(r){return r.hasNext()?r.getNext():void 0}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ue{constructor(e){this.fields=e,e.sort(z.comparator)}static empty(){return new ue([])}unionWith(e){let t=new M(z.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new ue(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return Lt(this.fields,e.fields,(t,n)=>t.isEqual(n))}}/**
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
 */class Ba extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ${constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(s){try{return atob(s)}catch(i){throw typeof DOMException<"u"&&i instanceof DOMException?new Ba("Invalid base64 string: "+i):i}}(e);return new $(t)}static fromUint8Array(e){const t=function(s){let i="";for(let o=0;o<s.length;++o)i+=String.fromCharCode(s[o]);return i}(e);return new $(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){const n=new Uint8Array(t.length);for(let s=0;s<t.length;s++)n[s]=t.charCodeAt(s);return n}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return V(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}$.EMPTY_BYTE_STRING=new $("");const zl=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function be(r){if(v(!!r,39018),typeof r=="string"){let e=0;const t=zl.exec(r);if(v(!!t,46558,{timestamp:r}),t[1]){let s=t[1];s=(s+"000000000").substr(0,9),e=Number(s)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:e}}return{seconds:L(r.seconds),nanos:L(r.nanos)}}function L(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function Ce(r){return typeof r=="string"?$.fromBase64String(r):$.fromUint8Array(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const za="server_timestamp",Ga="__type__",Ka="__previous_value__",$a="__local_write_time__";function zr(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[Ga])==null?void 0:n.stringValue)===za}function Gr(r){const e=r.mapValue.fields[Ka];return zr(e)?Gr(e):e}function xn(r){const e=be(r.mapValue.fields[$a].timestampValue);return new k(e.seconds,e.nanos)}/**
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
 */class Gl{constructor(e,t,n,s,i,o,a,u,c,l,h){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=s,this.ssl=i,this.forceLongPolling=o,this.autoDetectLongPolling=a,this.longPollingOptions=u,this.useFetchStreams=c,this.isUsingEmulator=l,this.apiKey=h}}const Ar="(default)";class ft{constructor(e,t){this.projectId=e,this.database=t||Ar}static empty(){return new ft("","")}get isDefaultDatabase(){return this.database===Ar}isEqual(e){return e instanceof ft&&e.projectId===this.projectId&&e.database===this.database}}function Kl(r,e){if(!Object.prototype.hasOwnProperty.apply(r.options,["projectId"]))throw new p(m.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new ft(r.options.projectId,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ys="__type__",ja="__max__",qe={mapValue:{fields:{__type__:{stringValue:ja}}}},Xs="__vector__",Kt="value",lr={nullValue:"NULL_VALUE"};function Ke(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?zr(r)?4:Qa(r)?9007199254740991:Kr(r)?10:11:T(28295,{value:r})}function ve(r,e){if(r===e)return!0;const t=Ke(r);if(t!==Ke(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===e.booleanValue;case 4:return xn(r).isEqual(xn(e));case 3:return function(s,i){if(typeof s.timestampValue=="string"&&typeof i.timestampValue=="string"&&s.timestampValue.length===i.timestampValue.length)return s.timestampValue===i.timestampValue;const o=be(s.timestampValue),a=be(i.timestampValue);return o.seconds===a.seconds&&o.nanos===a.nanos}(r,e);case 5:return r.stringValue===e.stringValue;case 6:return function(s,i){return Ce(s.bytesValue).isEqual(Ce(i.bytesValue))}(r,e);case 7:return r.referenceValue===e.referenceValue;case 8:return function(s,i){return L(s.geoPointValue.latitude)===L(i.geoPointValue.latitude)&&L(s.geoPointValue.longitude)===L(i.geoPointValue.longitude)}(r,e);case 2:return function(s,i){if("integerValue"in s&&"integerValue"in i)return L(s.integerValue)===L(i.integerValue);if("doubleValue"in s&&"doubleValue"in i){const o=L(s.doubleValue),a=L(i.doubleValue);return o===a?Sn(o)===Sn(a):isNaN(o)&&isNaN(a)}return!1}(r,e);case 9:return Lt(r.arrayValue.values||[],e.arrayValue.values||[],ve);case 10:case 11:return function(s,i){const o=s.mapValue.fields||{},a=i.mapValue.fields||{};if(so(o)!==so(a))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(a[u]===void 0||!ve(o[u],a[u])))return!1;return!0}(r,e);default:return T(52216,{left:r})}}function Nn(r,e){return(r.values||[]).find(t=>ve(t,e))!==void 0}function $e(r,e){if(r===e)return 0;const t=Ke(r),n=Ke(e);if(t!==n)return V(t,n);switch(t){case 0:case 9007199254740991:return 0;case 1:return V(r.booleanValue,e.booleanValue);case 2:return function(i,o){const a=L(i.integerValue||i.doubleValue),u=L(o.integerValue||o.doubleValue);return a<u?-1:a>u?1:a===u?0:isNaN(a)?isNaN(u)?0:-1:1}(r,e);case 3:return oo(r.timestampValue,e.timestampValue);case 4:return oo(xn(r),xn(e));case 5:return ps(r.stringValue,e.stringValue);case 6:return function(i,o){const a=Ce(i),u=Ce(o);return a.compareTo(u)}(r.bytesValue,e.bytesValue);case 7:return function(i,o){const a=i.split("/"),u=o.split("/");for(let c=0;c<a.length&&c<u.length;c++){const l=V(a[c],u[c]);if(l!==0)return l}return V(a.length,u.length)}(r.referenceValue,e.referenceValue);case 8:return function(i,o){const a=V(L(i.latitude),L(o.latitude));return a!==0?a:V(L(i.longitude),L(o.longitude))}(r.geoPointValue,e.geoPointValue);case 9:return ao(r.arrayValue,e.arrayValue);case 10:return function(i,o){var d,_,I,E;const a=i.fields||{},u=o.fields||{},c=(d=a[Kt])==null?void 0:d.arrayValue,l=(_=u[Kt])==null?void 0:_.arrayValue,h=V(((I=c==null?void 0:c.values)==null?void 0:I.length)||0,((E=l==null?void 0:l.values)==null?void 0:E.length)||0);return h!==0?h:ao(c,l)}(r.mapValue,e.mapValue);case 11:return function(i,o){if(i===qe.mapValue&&o===qe.mapValue)return 0;if(i===qe.mapValue)return 1;if(o===qe.mapValue)return-1;const a=i.fields||{},u=Object.keys(a),c=o.fields||{},l=Object.keys(c);u.sort(),l.sort();for(let h=0;h<u.length&&h<l.length;++h){const d=ps(u[h],l[h]);if(d!==0)return d;const _=$e(a[u[h]],c[l[h]]);if(_!==0)return _}return V(u.length,l.length)}(r.mapValue,e.mapValue);default:throw T(23264,{he:t})}}function oo(r,e){if(typeof r=="string"&&typeof e=="string"&&r.length===e.length)return V(r,e);const t=be(r),n=be(e),s=V(t.seconds,n.seconds);return s!==0?s:V(t.nanos,n.nanos)}function ao(r,e){const t=r.values||[],n=e.values||[];for(let s=0;s<t.length&&s<n.length;++s){const i=$e(t[s],n[s]);if(i)return i}return V(t.length,n.length)}function $t(r){return vs(r)}function vs(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?function(t){const n=be(t);return`time(${n.seconds},${n.nanos})`}(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?function(t){return Ce(t).toBase64()}(r.bytesValue):"referenceValue"in r?function(t){return y.fromName(t).toString()}(r.referenceValue):"geoPointValue"in r?function(t){return`geo(${t.latitude},${t.longitude})`}(r.geoPointValue):"arrayValue"in r?function(t){let n="[",s=!0;for(const i of t.values||[])s?s=!1:n+=",",n+=vs(i);return n+"]"}(r.arrayValue):"mapValue"in r?function(t){const n=Object.keys(t.fields||{}).sort();let s="{",i=!0;for(const o of n)i?i=!1:s+=",",s+=`${o}:${vs(t.fields[o])}`;return s+"}"}(r.mapValue):T(61005,{value:r})}function hr(r){switch(Ke(r)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=Gr(r);return e?16+hr(e):16;case 5:return 2*r.stringValue.length;case 6:return Ce(r.bytesValue).approximateByteSize();case 7:return r.referenceValue.length;case 9:return function(n){return(n.values||[]).reduce((s,i)=>s+hr(i),0)}(r.arrayValue);case 10:case 11:return function(n){let s=0;return Ye(n.fields,(i,o)=>{s+=i.length+hr(o)}),s}(r.mapValue);default:throw T(13486,{value:r})}}function mt(r,e){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${e.path.canonicalString()}`}}function Rs(r){return!!r&&"integerValue"in r}function kn(r){return!!r&&"arrayValue"in r}function uo(r){return!!r&&"nullValue"in r}function co(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function dr(r){return!!r&&"mapValue"in r}function Kr(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[Ys])==null?void 0:n.stringValue)===Xs}function wn(r){if(r.geoPointValue)return{geoPointValue:{...r.geoPointValue}};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:{...r.timestampValue}};if(r.mapValue){const e={mapValue:{fields:{}}};return Ye(r.mapValue.fields,(t,n)=>e.mapValue.fields[t]=wn(n)),e}if(r.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(r.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=wn(r.arrayValue.values[t]);return e}return{...r}}function Qa(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue===ja}const Wa={mapValue:{fields:{[Ys]:{stringValue:Xs},[Kt]:{arrayValue:{}}}}};function $l(r){return"nullValue"in r?lr:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?mt(ft.empty(),y.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?Kr(r)?Wa:{mapValue:{}}:T(35942,{value:r})}function jl(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?mt(ft.empty(),y.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?Wa:"mapValue"in r?Kr(r)?{mapValue:{}}:qe:T(61959,{value:r})}function lo(r,e){const t=$e(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?-1:!r.inclusive&&e.inclusive?1:0}function ho(r,e){const t=$e(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?1:!r.inclusive&&e.inclusive?-1:0}/**
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
 */class X{constructor(e){this.value=e}static empty(){return new X({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!dr(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=wn(t)}setAll(e){let t=z.emptyPath(),n={},s=[];e.forEach((o,a)=>{if(!t.isImmediateParentOf(a)){const u=this.getFieldsMap(t);this.applyChanges(u,n,s),n={},s=[],t=a.popLast()}o?n[a.lastSegment()]=wn(o):s.push(a.lastSegment())});const i=this.getFieldsMap(t);this.applyChanges(i,n,s)}delete(e){const t=this.field(e.popLast());dr(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return ve(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let s=t.mapValue.fields[e.get(n)];dr(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=s),t=s}return t.mapValue.fields}applyChanges(e,t,n){Ye(t,(s,i)=>e[s]=i);for(const s of n)delete e[s]}clone(){return new X(wn(this.value))}}function Ha(r){const e=[];return Ye(r.fields,(t,n)=>{const s=new z([t]);if(dr(n)){const i=Ha(n.mapValue).fields;if(i.length===0)e.push(s);else for(const o of i)e.push(s.child(o))}else e.push(s)}),new ue(e)}/**
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
 */class q{constructor(e,t,n,s,i,o,a){this.key=e,this.documentType=t,this.version=n,this.readTime=s,this.createTime=i,this.data=o,this.documentState=a}static newInvalidDocument(e){return new q(e,0,R.min(),R.min(),R.min(),X.empty(),0)}static newFoundDocument(e,t,n,s){return new q(e,1,t,R.min(),n,s,0)}static newNoDocument(e,t){return new q(e,2,t,R.min(),R.min(),X.empty(),0)}static newUnknownDocument(e,t){return new q(e,3,t,R.min(),R.min(),X.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(R.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=X.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=X.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=R.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof q&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new q(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class je{constructor(e,t){this.position=e,this.inclusive=t}}function fo(r,e,t){let n=0;for(let s=0;s<r.position.length;s++){const i=e[s],o=r.position[s];if(i.field.isKeyField()?n=y.comparator(y.fromName(o.referenceValue),t.key):n=$e(o,t.data.field(i.field)),i.dir==="desc"&&(n*=-1),n!==0)break}return n}function mo(r,e){if(r===null)return e===null;if(e===null||r.inclusive!==e.inclusive||r.position.length!==e.position.length)return!1;for(let t=0;t<r.position.length;t++)if(!ve(r.position[t],e.position[t]))return!1;return!0}/**
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
 */class Fn{constructor(e,t="asc"){this.field=e,this.dir=t}}function Ql(r,e){return r.dir===e.dir&&r.field.isEqual(e.field)}/**
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
 */class Ja{}class S extends Ja{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,n):new Wl(e,t,n):t==="array-contains"?new Yl(e,n):t==="in"?new nu(e,n):t==="not-in"?new Xl(e,n):t==="array-contains-any"?new Zl(e,n):new S(e,t,n)}static createKeyFieldInFilter(e,t,n){return t==="in"?new Hl(e,n):new Jl(e,n)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison($e(t,this.value)):t!==null&&Ke(this.value)===Ke(t)&&this.matchesComparison($e(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return T(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class F extends Ja{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null}static create(e,t){return new F(e,t)}matches(e){return jt(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function jt(r){return r.op==="and"}function Vs(r){return r.op==="or"}function Zs(r){return Ya(r)&&jt(r)}function Ya(r){for(const e of r.filters)if(e instanceof F)return!1;return!0}function Ps(r){if(r instanceof S)return r.field.canonicalString()+r.op.toString()+$t(r.value);if(Zs(r))return r.filters.map(e=>Ps(e)).join(",");{const e=r.filters.map(t=>Ps(t)).join(",");return`${r.op}(${e})`}}function Xa(r,e){return r instanceof S?function(n,s){return s instanceof S&&n.op===s.op&&n.field.isEqual(s.field)&&ve(n.value,s.value)}(r,e):r instanceof F?function(n,s){return s instanceof F&&n.op===s.op&&n.filters.length===s.filters.length?n.filters.reduce((i,o,a)=>i&&Xa(o,s.filters[a]),!0):!1}(r,e):void T(19439)}function Za(r,e){const t=r.filters.concat(e);return F.create(t,r.op)}function eu(r){return r instanceof S?function(t){return`${t.field.canonicalString()} ${t.op} ${$t(t.value)}`}(r):r instanceof F?function(t){return t.op.toString()+" {"+t.getFilters().map(eu).join(" ,")+"}"}(r):"Filter"}class Wl extends S{constructor(e,t,n){super(e,t,n),this.key=y.fromName(n.referenceValue)}matches(e){const t=y.comparator(e.key,this.key);return this.matchesComparison(t)}}class Hl extends S{constructor(e,t){super(e,"in",t),this.keys=tu("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class Jl extends S{constructor(e,t){super(e,"not-in",t),this.keys=tu("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function tu(r,e){var t;return(((t=e.arrayValue)==null?void 0:t.values)||[]).map(n=>y.fromName(n.referenceValue))}class Yl extends S{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return kn(t)&&Nn(t.arrayValue,this.value)}}class nu extends S{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&Nn(this.value.arrayValue,t)}}class Xl extends S{constructor(e,t){super(e,"not-in",t)}matches(e){if(Nn(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!Nn(this.value.arrayValue,t)}}class Zl extends S{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!kn(t)||!t.arrayValue.values)&&t.arrayValue.values.some(n=>Nn(this.value.arrayValue,n))}}/**
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
 */class eh{constructor(e,t=null,n=[],s=[],i=null,o=null,a=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=s,this.limit=i,this.startAt=o,this.endAt=a,this.Te=null}}function Ss(r,e=null,t=[],n=[],s=null,i=null,o=null){return new eh(r,e,t,n,s,i,o)}function _t(r){const e=w(r);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(n=>Ps(n)).join(","),t+="|ob:",t+=e.orderBy.map(n=>function(i){return i.field.canonicalString()+i.dir}(n)).join(","),Gn(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(n=>$t(n)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(n=>$t(n)).join(",")),e.Te=t}return e.Te}function $n(r,e){if(r.limit!==e.limit||r.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<r.orderBy.length;t++)if(!Ql(r.orderBy[t],e.orderBy[t]))return!1;if(r.filters.length!==e.filters.length)return!1;for(let t=0;t<r.filters.length;t++)if(!Xa(r.filters[t],e.filters[t]))return!1;return r.collectionGroup===e.collectionGroup&&!!r.path.isEqual(e.path)&&!!mo(r.startAt,e.startAt)&&mo(r.endAt,e.endAt)}function vr(r){return y.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function Rr(r,e){return r.filters.filter(t=>t instanceof S&&t.field.isEqual(e))}function _o(r,e,t){let n=lr,s=!0;for(const i of Rr(r,e)){let o=lr,a=!0;switch(i.op){case"<":case"<=":o=$l(i.value);break;case"==":case"in":case">=":o=i.value;break;case">":o=i.value,a=!1;break;case"!=":case"not-in":o=lr}lo({value:n,inclusive:s},{value:o,inclusive:a})<0&&(n=o,s=a)}if(t!==null){for(let i=0;i<r.orderBy.length;++i)if(r.orderBy[i].field.isEqual(e)){const o=t.position[i];lo({value:n,inclusive:s},{value:o,inclusive:t.inclusive})<0&&(n=o,s=t.inclusive);break}}return{value:n,inclusive:s}}function go(r,e,t){let n=qe,s=!0;for(const i of Rr(r,e)){let o=qe,a=!0;switch(i.op){case">=":case">":o=jl(i.value),a=!1;break;case"==":case"in":case"<=":o=i.value;break;case"<":o=i.value,a=!1;break;case"!=":case"not-in":o=qe}ho({value:n,inclusive:s},{value:o,inclusive:a})>0&&(n=o,s=a)}if(t!==null){for(let i=0;i<r.orderBy.length;++i)if(r.orderBy[i].field.isEqual(e)){const o=t.position[i];ho({value:n,inclusive:s},{value:o,inclusive:t.inclusive})>0&&(n=o,s=t.inclusive);break}}return{value:n,inclusive:s}}/**
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
 */class Et{constructor(e,t=null,n=[],s=[],i=null,o="F",a=null,u=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=s,this.limit=i,this.limitType=o,this.startAt=a,this.endAt=u,this.Ie=null,this.Ee=null,this.Re=null,this.startAt,this.endAt}}function ru(r,e,t,n,s,i,o,a){return new Et(r,e,t,n,s,i,o,a)}function jn(r){return new Et(r)}function po(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function th(r){return y.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function ei(r){return r.collectionGroup!==null}function Ft(r){const e=w(r);if(e.Ie===null){e.Ie=[];const t=new Set;for(const i of e.explicitOrderBy)e.Ie.push(i),t.add(i.field.canonicalString());const n=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let a=new M(z.comparator);return o.filters.forEach(u=>{u.getFlattenedFilters().forEach(c=>{c.isInequality()&&(a=a.add(c.field))})}),a})(e).forEach(i=>{t.has(i.canonicalString())||i.isKeyField()||e.Ie.push(new Fn(i,n))}),t.has(z.keyField().canonicalString())||e.Ie.push(new Fn(z.keyField(),n))}return e.Ie}function fe(r){const e=w(r);return e.Ee||(e.Ee=su(e,Ft(r))),e.Ee}function nh(r){const e=w(r);return e.Re||(e.Re=su(e,r.explicitOrderBy)),e.Re}function su(r,e){if(r.limitType==="F")return Ss(r.path,r.collectionGroup,e,r.filters,r.limit,r.startAt,r.endAt);{e=e.map(s=>{const i=s.dir==="desc"?"asc":"desc";return new Fn(s.field,i)});const t=r.endAt?new je(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new je(r.startAt.position,r.startAt.inclusive):null;return Ss(r.path,r.collectionGroup,e,r.filters,r.limit,t,n)}}function bs(r,e){const t=r.filters.concat([e]);return new Et(r.path,r.collectionGroup,r.explicitOrderBy.slice(),t,r.limit,r.limitType,r.startAt,r.endAt)}function rh(r,e){const t=r.explicitOrderBy.concat([e]);return new Et(r.path,r.collectionGroup,t,r.filters.slice(),r.limit,r.limitType,r.startAt,r.endAt)}function Vr(r,e,t){return new Et(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),e,t,r.startAt,r.endAt)}function sh(r,e){return new Et(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),r.limit,r.limitType,e,r.endAt)}function $r(r,e){return $n(fe(r),fe(e))&&r.limitType===e.limitType}function iu(r){return`${_t(fe(r))}|lt:${r.limitType}`}function Dt(r){return`Query(target=${function(t){let n=t.path.canonicalString();return t.collectionGroup!==null&&(n+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(n+=`, filters: [${t.filters.map(s=>eu(s)).join(", ")}]`),Gn(t.limit)||(n+=", limit: "+t.limit),t.orderBy.length>0&&(n+=`, orderBy: [${t.orderBy.map(s=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(s)).join(", ")}]`),t.startAt&&(n+=", startAt: ",n+=t.startAt.inclusive?"b:":"a:",n+=t.startAt.position.map(s=>$t(s)).join(",")),t.endAt&&(n+=", endAt: ",n+=t.endAt.inclusive?"a:":"b:",n+=t.endAt.position.map(s=>$t(s)).join(",")),`Target(${n})`}(fe(r))}; limitType=${r.limitType})`}function Qn(r,e){return e.isFoundDocument()&&function(n,s){const i=s.key.path;return n.collectionGroup!==null?s.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(i):y.isDocumentKey(n.path)?n.path.isEqual(i):n.path.isImmediateParentOf(i)}(r,e)&&function(n,s){for(const i of Ft(n))if(!i.field.isKeyField()&&s.data.field(i.field)===null)return!1;return!0}(r,e)&&function(n,s){for(const i of n.filters)if(!i.matches(s))return!1;return!0}(r,e)&&function(n,s){return!(n.startAt&&!function(o,a,u){const c=fo(o,a,u);return o.inclusive?c<=0:c<0}(n.startAt,Ft(n),s)||n.endAt&&!function(o,a,u){const c=fo(o,a,u);return o.inclusive?c>=0:c>0}(n.endAt,Ft(n),s))}(r,e)}function ou(r){return r.collectionGroup||(r.path.length%2==1?r.path.lastSegment():r.path.get(r.path.length-2))}function au(r){return(e,t)=>{let n=!1;for(const s of Ft(r)){const i=ih(s,e,t);if(i!==0)return i;n=n||s.field.isKeyField()}return 0}}function ih(r,e,t){const n=r.field.isKeyField()?y.comparator(e.key,t.key):function(i,o,a){const u=o.data.field(i),c=a.data.field(i);return u!==null&&c!==null?$e(u,c):T(42886)}(r.field,e,t);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return T(19790,{direction:r.dir})}}/**
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
 */class De{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n!==void 0){for(const[s,i]of n)if(this.equalsFn(s,e))return i}}has(e){return this.get(e)!==void 0}set(e,t){const n=this.mapKeyFn(e),s=this.inner[n];if(s===void 0)return this.inner[n]=[[e,t]],void this.innerSize++;for(let i=0;i<s.length;i++)if(this.equalsFn(s[i][0],e))return void(s[i]=[e,t]);s.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n===void 0)return!1;for(let s=0;s<n.length;s++)if(this.equalsFn(n[s][0],e))return n.length===1?delete this.inner[t]:n.splice(s,1),this.innerSize--,!0;return!1}forEach(e){Ye(this.inner,(t,n)=>{for(const[s,i]of n)e(s,i)})}isEmpty(){return Ua(this.inner)}size(){return this.innerSize}}/**
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
 */const oh=new O(y.comparator);function de(){return oh}const uu=new O(y.comparator);function _n(...r){let e=uu;for(const t of r)e=e.insert(t.key,t);return e}function cu(r){let e=uu;return r.forEach((t,n)=>e=e.insert(t,n.overlayedDocument)),e}function we(){return An()}function lu(){return An()}function An(){return new De(r=>r.toString(),(r,e)=>r.isEqual(e))}const ah=new O(y.comparator),uh=new M(y.comparator);function P(...r){let e=uh;for(const t of r)e=e.add(t);return e}const ch=new M(V);function ti(){return ch}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ni(r,e){if(r.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Sn(e)?"-0":e}}function hu(r){return{integerValue:""+r}}function du(r,e){return ba(e)?hu(e):ni(r,e)}/**
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
 */class jr{constructor(){this._=void 0}}function lh(r,e,t){return r instanceof Mn?function(s,i){const o={fields:{[Ga]:{stringValue:za},[$a]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return i&&zr(i)&&(i=Gr(i)),i&&(o.fields[Ka]=i),{mapValue:o}}(t,e):r instanceof Qt?mu(r,e):r instanceof Wt?_u(r,e):function(s,i){const o=fu(s,i),a=yo(o)+yo(s.Ae);return Rs(o)&&Rs(s.Ae)?hu(a):ni(s.serializer,a)}(r,e)}function hh(r,e,t){return r instanceof Qt?mu(r,e):r instanceof Wt?_u(r,e):t}function fu(r,e){return r instanceof Ht?function(n){return Rs(n)||function(i){return!!i&&"doubleValue"in i}(n)}(e)?e:{integerValue:0}:null}class Mn extends jr{}class Qt extends jr{constructor(e){super(),this.elements=e}}function mu(r,e){const t=gu(e);for(const n of r.elements)t.some(s=>ve(s,n))||t.push(n);return{arrayValue:{values:t}}}class Wt extends jr{constructor(e){super(),this.elements=e}}function _u(r,e){let t=gu(e);for(const n of r.elements)t=t.filter(s=>!ve(s,n));return{arrayValue:{values:t}}}class Ht extends jr{constructor(e,t){super(),this.serializer=e,this.Ae=t}}function yo(r){return L(r.integerValue||r.doubleValue)}function gu(r){return kn(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
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
 */class pu{constructor(e,t){this.field=e,this.transform=t}}function dh(r,e){return r.field.isEqual(e.field)&&function(n,s){return n instanceof Qt&&s instanceof Qt||n instanceof Wt&&s instanceof Wt?Lt(n.elements,s.elements,ve):n instanceof Ht&&s instanceof Ht?ve(n.Ae,s.Ae):n instanceof Mn&&s instanceof Mn}(r.transform,e.transform)}class fh{constructor(e,t){this.version=e,this.transformResults=t}}class U{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new U}static exists(e){return new U(void 0,e)}static updateTime(e){return new U(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function fr(r,e){return r.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(r.updateTime):r.exists===void 0||r.exists===e.isFoundDocument()}class Qr{}function yu(r,e){if(!r.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return r.isNoDocument()?new rn(r.key,U.none()):new nn(r.key,r.data,U.none());{const t=r.data,n=X.empty();let s=new M(z.comparator);for(let i of e.fields)if(!s.has(i)){let o=t.field(i);o===null&&i.length>1&&(i=i.popLast(),o=t.field(i)),o===null?n.delete(i):n.set(i,o),s=s.add(i)}return new xe(r.key,n,new ue(s.toArray()),U.none())}}function mh(r,e,t){r instanceof nn?function(s,i,o){const a=s.value.clone(),u=To(s.fieldTransforms,i,o.transformResults);a.setAll(u),i.convertToFoundDocument(o.version,a).setHasCommittedMutations()}(r,e,t):r instanceof xe?function(s,i,o){if(!fr(s.precondition,i))return void i.convertToUnknownDocument(o.version);const a=To(s.fieldTransforms,i,o.transformResults),u=i.data;u.setAll(Iu(s)),u.setAll(a),i.convertToFoundDocument(o.version,u).setHasCommittedMutations()}(r,e,t):function(s,i,o){i.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,t)}function vn(r,e,t,n){return r instanceof nn?function(i,o,a,u){if(!fr(i.precondition,o))return a;const c=i.value.clone(),l=Eo(i.fieldTransforms,u,o);return c.setAll(l),o.convertToFoundDocument(o.version,c).setHasLocalMutations(),null}(r,e,t,n):r instanceof xe?function(i,o,a,u){if(!fr(i.precondition,o))return a;const c=Eo(i.fieldTransforms,u,o),l=o.data;return l.setAll(Iu(i)),l.setAll(c),o.convertToFoundDocument(o.version,l).setHasLocalMutations(),a===null?null:a.unionWith(i.fieldMask.fields).unionWith(i.fieldTransforms.map(h=>h.field))}(r,e,t,n):function(i,o,a){return fr(i.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):a}(r,e,t)}function _h(r,e){let t=null;for(const n of r.fieldTransforms){const s=e.data.field(n.field),i=fu(n.transform,s||null);i!=null&&(t===null&&(t=X.empty()),t.set(n.field,i))}return t||null}function Io(r,e){return r.type===e.type&&!!r.key.isEqual(e.key)&&!!r.precondition.isEqual(e.precondition)&&!!function(n,s){return n===void 0&&s===void 0||!(!n||!s)&&Lt(n,s,(i,o)=>dh(i,o))}(r.fieldTransforms,e.fieldTransforms)&&(r.type===0?r.value.isEqual(e.value):r.type!==1||r.data.isEqual(e.data)&&r.fieldMask.isEqual(e.fieldMask))}class nn extends Qr{constructor(e,t,n,s=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class xe extends Qr{constructor(e,t,n,s,i=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=s,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function Iu(r){const e=new Map;return r.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){const n=r.data.field(t);e.set(t,n)}}),e}function To(r,e,t){const n=new Map;v(r.length===t.length,32656,{Ve:t.length,de:r.length});for(let s=0;s<t.length;s++){const i=r[s],o=i.transform,a=e.data.field(i.field);n.set(i.field,hh(o,a,t[s]))}return n}function Eo(r,e,t){const n=new Map;for(const s of r){const i=s.transform,o=t.data.field(s.field);n.set(s.field,lh(i,o,e))}return n}class rn extends Qr{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class ri extends Qr{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
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
 */class si{constructor(e,t,n,s){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=s}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let s=0;s<this.mutations.length;s++){const i=this.mutations[s];i.key.isEqual(e.key)&&mh(i,e,n[s])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=vn(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=vn(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=lu();return this.mutations.forEach(s=>{const i=e.get(s.key),o=i.overlayedDocument;let a=this.applyToLocalView(o,i.mutatedFields);a=t.has(s.key)?null:a;const u=yu(o,a);u!==null&&n.set(s.key,u),o.isValidDocument()||o.convertToNoDocument(R.min())}),n}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),P())}isEqual(e){return this.batchId===e.batchId&&Lt(this.mutations,e.mutations,(t,n)=>Io(t,n))&&Lt(this.baseMutations,e.baseMutations,(t,n)=>Io(t,n))}}class ii{constructor(e,t,n,s){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=s}static from(e,t,n){v(e.mutations.length===n.length,58842,{me:e.mutations.length,fe:n.length});let s=function(){return ah}();const i=e.mutations;for(let o=0;o<i.length;o++)s=s.insert(i[o].key,n[o].version);return new ii(e,t,n,s)}}/**
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
 */class oi{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
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
 */class gh{constructor(e,t,n){this.alias=e,this.aggregateType=t,this.fieldPath=n}}/**
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
 */class ph{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
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
 */var j,D;function Tu(r){switch(r){case m.OK:return T(64938);case m.CANCELLED:case m.UNKNOWN:case m.DEADLINE_EXCEEDED:case m.RESOURCE_EXHAUSTED:case m.INTERNAL:case m.UNAVAILABLE:case m.UNAUTHENTICATED:return!1;case m.INVALID_ARGUMENT:case m.NOT_FOUND:case m.ALREADY_EXISTS:case m.PERMISSION_DENIED:case m.FAILED_PRECONDITION:case m.ABORTED:case m.OUT_OF_RANGE:case m.UNIMPLEMENTED:case m.DATA_LOSS:return!0;default:return T(15467,{code:r})}}function Eu(r){if(r===void 0)return K("GRPC error has no .code"),m.UNKNOWN;switch(r){case j.OK:return m.OK;case j.CANCELLED:return m.CANCELLED;case j.UNKNOWN:return m.UNKNOWN;case j.DEADLINE_EXCEEDED:return m.DEADLINE_EXCEEDED;case j.RESOURCE_EXHAUSTED:return m.RESOURCE_EXHAUSTED;case j.INTERNAL:return m.INTERNAL;case j.UNAVAILABLE:return m.UNAVAILABLE;case j.UNAUTHENTICATED:return m.UNAUTHENTICATED;case j.INVALID_ARGUMENT:return m.INVALID_ARGUMENT;case j.NOT_FOUND:return m.NOT_FOUND;case j.ALREADY_EXISTS:return m.ALREADY_EXISTS;case j.PERMISSION_DENIED:return m.PERMISSION_DENIED;case j.FAILED_PRECONDITION:return m.FAILED_PRECONDITION;case j.ABORTED:return m.ABORTED;case j.OUT_OF_RANGE:return m.OUT_OF_RANGE;case j.UNIMPLEMENTED:return m.UNIMPLEMENTED;case j.DATA_LOSS:return m.DATA_LOSS;default:return T(39323,{code:r})}}(D=j||(j={}))[D.OK=0]="OK",D[D.CANCELLED=1]="CANCELLED",D[D.UNKNOWN=2]="UNKNOWN",D[D.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",D[D.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",D[D.NOT_FOUND=5]="NOT_FOUND",D[D.ALREADY_EXISTS=6]="ALREADY_EXISTS",D[D.PERMISSION_DENIED=7]="PERMISSION_DENIED",D[D.UNAUTHENTICATED=16]="UNAUTHENTICATED",D[D.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",D[D.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",D[D.ABORTED=10]="ABORTED",D[D.OUT_OF_RANGE=11]="OUT_OF_RANGE",D[D.UNIMPLEMENTED=12]="UNIMPLEMENTED",D[D.INTERNAL=13]="INTERNAL",D[D.UNAVAILABLE=14]="UNAVAILABLE",D[D.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function yh(){return new TextEncoder}/**
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
 */const Ih=new ut([4294967295,4294967295],0);function wo(r){const e=yh().encode(r),t=new Wc;return t.update(e),new Uint8Array(t.digest())}function Ao(r){const e=new DataView(r.buffer),t=e.getUint32(0,!0),n=e.getUint32(4,!0),s=e.getUint32(8,!0),i=e.getUint32(12,!0);return[new ut([t,n],0),new ut([s,i],0)]}class ai{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new gn(`Invalid padding: ${t}`);if(n<0)throw new gn(`Invalid hash count: ${n}`);if(e.length>0&&this.hashCount===0)throw new gn(`Invalid hash count: ${n}`);if(e.length===0&&t!==0)throw new gn(`Invalid padding when bitmap length is 0: ${t}`);this.ge=8*e.length-t,this.pe=ut.fromNumber(this.ge)}ye(e,t,n){let s=e.add(t.multiply(ut.fromNumber(n)));return s.compare(Ih)===1&&(s=new ut([s.getBits(0),s.getBits(1)],0)),s.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const t=wo(e),[n,s]=Ao(t);for(let i=0;i<this.hashCount;i++){const o=this.ye(n,s,i);if(!this.we(o))return!1}return!0}static create(e,t,n){const s=e%8==0?0:8-e%8,i=new Uint8Array(Math.ceil(e/8)),o=new ai(i,s,t);return n.forEach(a=>o.insert(a)),o}insert(e){if(this.ge===0)return;const t=wo(e),[n,s]=Ao(t);for(let i=0;i<this.hashCount;i++){const o=this.ye(n,s,i);this.be(o)}}be(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class gn extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
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
 */class Wn{constructor(e,t,n,s,i){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=s,this.resolvedLimboDocuments=i}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const s=new Map;return s.set(e,Hn.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new Wn(R.min(),s,new O(V),de(),P())}}class Hn{constructor(e,t,n,s,i){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=s,this.removedDocuments=i}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new Hn(n,t,P(),P(),P())}}/**
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
 */class mr{constructor(e,t,n,s){this.Se=e,this.removedTargetIds=t,this.key=n,this.De=s}}class wu{constructor(e,t){this.targetId=e,this.Ce=t}}class Au{constructor(e,t,n=$.EMPTY_BYTE_STRING,s=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=s}}class vo{constructor(){this.ve=0,this.Fe=Ro(),this.Me=$.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=P(),t=P(),n=P();return this.Fe.forEach((s,i)=>{switch(i){case 0:e=e.add(s);break;case 2:t=t.add(s);break;case 1:n=n.add(s);break;default:T(38017,{changeType:i})}}),new Hn(this.Me,this.xe,e,t,n)}Ke(){this.Oe=!1,this.Fe=Ro()}qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t)}Ue(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}$e(){this.ve+=1}We(){this.ve-=1,v(this.ve>=0,3241,{ve:this.ve})}Qe(){this.Oe=!0,this.xe=!0}}class Th{constructor(e){this.Ge=e,this.ze=new Map,this.je=de(),this.He=nr(),this.Je=nr(),this.Ze=new O(V)}Xe(e){for(const t of e.Se)e.De&&e.De.isFoundDocument()?this.Ye(t,e.De):this.et(t,e.key,e.De);for(const t of e.removedTargetIds)this.et(t,e.key,e.De)}tt(e){this.forEachTarget(e,t=>{const n=this.nt(t);switch(e.state){case 0:this.rt(t)&&n.Le(e.resumeToken);break;case 1:n.We(),n.Ne||n.Ke(),n.Le(e.resumeToken);break;case 2:n.We(),n.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(n.Qe(),n.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),n.Le(e.resumeToken));break;default:T(56790,{state:e.state})}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach((n,s)=>{this.rt(s)&&t(s)})}st(e){const t=e.targetId,n=e.Ce.count,s=this.ot(t);if(s){const i=s.target;if(vr(i))if(n===0){const o=new y(i.path);this.et(t,o,q.newNoDocument(o,R.min()))}else v(n===1,20013,{expectedCount:n});else{const o=this._t(t);if(o!==n){const a=this.ut(e),u=a?this.ct(a,e,o):1;if(u!==0){this.it(t);const c=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ze=this.Ze.insert(t,c)}}}}}ut(e){const t=e.Ce.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:s=0},hashCount:i=0}=t;let o,a;try{o=Ce(n).toUint8Array()}catch(u){if(u instanceof Ba)return Vn("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{a=new ai(o,s,i)}catch(u){return Vn(u instanceof gn?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return a.ge===0?null:a}ct(e,t,n){return t.Ce.count===n-this.Pt(e,t.targetId)?0:2}Pt(e,t){const n=this.Ge.getRemoteKeysForTarget(t);let s=0;return n.forEach(i=>{const o=this.Ge.ht(),a=`projects/${o.projectId}/databases/${o.database}/documents/${i.path.canonicalString()}`;e.mightContain(a)||(this.et(t,i,null),s++)}),s}Tt(e){const t=new Map;this.ze.forEach((i,o)=>{const a=this.ot(o);if(a){if(i.current&&vr(a.target)){const u=new y(a.target.path);this.It(u).has(o)||this.Et(o,u)||this.et(o,u,q.newNoDocument(u,e))}i.Be&&(t.set(o,i.ke()),i.Ke())}});let n=P();this.Je.forEach((i,o)=>{let a=!0;o.forEachWhile(u=>{const c=this.ot(u);return!c||c.purpose==="TargetPurposeLimboResolution"||(a=!1,!1)}),a&&(n=n.add(i))}),this.je.forEach((i,o)=>o.setReadTime(e));const s=new Wn(e,t,this.Ze,this.je,n);return this.je=de(),this.He=nr(),this.Je=nr(),this.Ze=new O(V),s}Ye(e,t){if(!this.rt(e))return;const n=this.Et(e,t.key)?2:0;this.nt(e).qe(t.key,n),this.je=this.je.insert(t.key,t),this.He=this.He.insert(t.key,this.It(t.key).add(e)),this.Je=this.Je.insert(t.key,this.Rt(t.key).add(e))}et(e,t,n){if(!this.rt(e))return;const s=this.nt(e);this.Et(e,t)?s.qe(t,1):s.Ue(t),this.Je=this.Je.insert(t,this.Rt(t).delete(e)),this.Je=this.Je.insert(t,this.Rt(t).add(e)),n&&(this.je=this.je.insert(t,n))}removeTarget(e){this.ze.delete(e)}_t(e){const t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}$e(e){this.nt(e).$e()}nt(e){let t=this.ze.get(e);return t||(t=new vo,this.ze.set(e,t)),t}Rt(e){let t=this.Je.get(e);return t||(t=new M(V),this.Je=this.Je.insert(e,t)),t}It(e){let t=this.He.get(e);return t||(t=new M(V),this.He=this.He.insert(e,t)),t}rt(e){const t=this.ot(e)!==null;return t||g("WatchChangeAggregator","Detected inactive target",e),t}ot(e){const t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new vo),this.Ge.getRemoteKeysForTarget(e).forEach(t=>{this.et(e,t,null)})}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t)}}function nr(){return new O(y.comparator)}function Ro(){return new O(y.comparator)}const Eh={asc:"ASCENDING",desc:"DESCENDING"},wh={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},Ah={and:"AND",or:"OR"};class vh{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function Cs(r,e){return r.useProto3Json||Gn(e)?e:{value:e}}function Jt(r,e){return r.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function vu(r,e){return r.useProto3Json?e.toBase64():e.toUint8Array()}function Rh(r,e){return Jt(r,e.toTimestamp())}function ee(r){return v(!!r,49232),R.fromTimestamp(function(t){const n=be(t);return new k(n.seconds,n.nanos)}(r))}function ui(r,e){return Ds(r,e).canonicalString()}function Ds(r,e){const t=function(s){return new x(["projects",s.projectId,"databases",s.database])}(r).child("documents");return e===void 0?t:t.child(e)}function Ru(r){const e=x.fromString(r);return v(Nu(e),10190,{key:e.toString()}),e}function On(r,e){return ui(r.databaseId,e.path)}function Se(r,e){const t=Ru(e);if(t.get(1)!==r.databaseId.projectId)throw new p(m.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+r.databaseId.projectId);if(t.get(3)!==r.databaseId.database)throw new p(m.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+r.databaseId.database);return new y(Su(t))}function Vu(r,e){return ui(r.databaseId,e)}function Pu(r){const e=Ru(r);return e.length===4?x.emptyPath():Su(e)}function xs(r){return new x(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function Su(r){return v(r.length>4&&r.get(4)==="documents",29091,{key:r.toString()}),r.popFirst(5)}function Vo(r,e,t){return{name:On(r,e),fields:t.value.mapValue.fields}}function Vh(r,e,t){const n=Se(r,e.name),s=ee(e.updateTime),i=e.createTime?ee(e.createTime):R.min(),o=new X({mapValue:{fields:e.fields}}),a=q.newFoundDocument(n,s,i,o);return t&&a.setHasCommittedMutations(),t?a.setHasCommittedMutations():a}function Ph(r,e){return"found"in e?function(n,s){v(!!s.found,43571),s.found.name,s.found.updateTime;const i=Se(n,s.found.name),o=ee(s.found.updateTime),a=s.found.createTime?ee(s.found.createTime):R.min(),u=new X({mapValue:{fields:s.found.fields}});return q.newFoundDocument(i,o,a,u)}(r,e):"missing"in e?function(n,s){v(!!s.missing,3894),v(!!s.readTime,22933);const i=Se(n,s.missing),o=ee(s.readTime);return q.newNoDocument(i,o)}(r,e):T(7234,{result:e})}function Sh(r,e){let t;if("targetChange"in e){e.targetChange;const n=function(c){return c==="NO_CHANGE"?0:c==="ADD"?1:c==="REMOVE"?2:c==="CURRENT"?3:c==="RESET"?4:T(39313,{state:c})}(e.targetChange.targetChangeType||"NO_CHANGE"),s=e.targetChange.targetIds||[],i=function(c,l){return c.useProto3Json?(v(l===void 0||typeof l=="string",58123),$.fromBase64String(l||"")):(v(l===void 0||l instanceof Buffer||l instanceof Uint8Array,16193),$.fromUint8Array(l||new Uint8Array))}(r,e.targetChange.resumeToken),o=e.targetChange.cause,a=o&&function(c){const l=c.code===void 0?m.UNKNOWN:Eu(c.code);return new p(l,c.message||"")}(o);t=new Au(n,s,i,a||null)}else if("documentChange"in e){e.documentChange;const n=e.documentChange;n.document,n.document.name,n.document.updateTime;const s=Se(r,n.document.name),i=ee(n.document.updateTime),o=n.document.createTime?ee(n.document.createTime):R.min(),a=new X({mapValue:{fields:n.document.fields}}),u=q.newFoundDocument(s,i,o,a),c=n.targetIds||[],l=n.removedTargetIds||[];t=new mr(c,l,u.key,u)}else if("documentDelete"in e){e.documentDelete;const n=e.documentDelete;n.document;const s=Se(r,n.document),i=n.readTime?ee(n.readTime):R.min(),o=q.newNoDocument(s,i),a=n.removedTargetIds||[];t=new mr([],a,o.key,o)}else if("documentRemove"in e){e.documentRemove;const n=e.documentRemove;n.document;const s=Se(r,n.document),i=n.removedTargetIds||[];t=new mr([],i,s,null)}else{if(!("filter"in e))return T(11601,{Vt:e});{e.filter;const n=e.filter;n.targetId;const{count:s=0,unchangedNames:i}=n,o=new ph(s,i),a=n.targetId;t=new wu(a,o)}}return t}function Ln(r,e){let t;if(e instanceof nn)t={update:Vo(r,e.key,e.value)};else if(e instanceof rn)t={delete:On(r,e.key)};else if(e instanceof xe)t={update:Vo(r,e.key,e.data),updateMask:Fh(e.fieldMask)};else{if(!(e instanceof ri))return T(16599,{dt:e.type});t={verify:On(r,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(n=>function(i,o){const a=o.transform;if(a instanceof Mn)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(a instanceof Qt)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:a.elements}};if(a instanceof Wt)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:a.elements}};if(a instanceof Ht)return{fieldPath:o.field.canonicalString(),increment:a.Ae};throw T(20930,{transform:o.transform})}(0,n))),e.precondition.isNone||(t.currentDocument=function(s,i){return i.updateTime!==void 0?{updateTime:Rh(s,i.updateTime)}:i.exists!==void 0?{exists:i.exists}:T(27497)}(r,e.precondition)),t}function Ns(r,e){const t=e.currentDocument?function(i){return i.updateTime!==void 0?U.updateTime(ee(i.updateTime)):i.exists!==void 0?U.exists(i.exists):U.none()}(e.currentDocument):U.none(),n=e.updateTransforms?e.updateTransforms.map(s=>function(o,a){let u=null;if("setToServerValue"in a)v(a.setToServerValue==="REQUEST_TIME",16630,{proto:a}),u=new Mn;else if("appendMissingElements"in a){const l=a.appendMissingElements.values||[];u=new Qt(l)}else if("removeAllFromArray"in a){const l=a.removeAllFromArray.values||[];u=new Wt(l)}else"increment"in a?u=new Ht(o,a.increment):T(16584,{proto:a});const c=z.fromServerFormat(a.fieldPath);return new pu(c,u)}(r,s)):[];if(e.update){e.update.name;const s=Se(r,e.update.name),i=new X({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=function(u){const c=u.fieldPaths||[];return new ue(c.map(l=>z.fromServerFormat(l)))}(e.updateMask);return new xe(s,i,o,t,n)}return new nn(s,i,t,n)}if(e.delete){const s=Se(r,e.delete);return new rn(s,t)}if(e.verify){const s=Se(r,e.verify);return new ri(s,t)}return T(1463,{proto:e})}function bh(r,e){return r&&r.length>0?(v(e!==void 0,14353),r.map(t=>function(s,i){let o=s.updateTime?ee(s.updateTime):ee(i);return o.isEqual(R.min())&&(o=ee(i)),new fh(o,s.transformResults||[])}(t,e))):[]}function bu(r,e){return{documents:[Vu(r,e.path)]}}function ci(r,e){const t={structuredQuery:{}},n=e.path;let s;e.collectionGroup!==null?(s=n,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(s=n.popLast(),t.structuredQuery.from=[{collectionId:n.lastSegment()}]),t.parent=Vu(r,s);const i=function(c){if(c.length!==0)return xu(F.create(c,"and"))}(e.filters);i&&(t.structuredQuery.where=i);const o=function(c){if(c.length!==0)return c.map(l=>function(d){return{field:Oe(d.field),direction:xh(d.dir)}}(l))}(e.orderBy);o&&(t.structuredQuery.orderBy=o);const a=Cs(r,e.limit);return a!==null&&(t.structuredQuery.limit=a),e.startAt&&(t.structuredQuery.startAt=function(c){return{before:c.inclusive,values:c.position}}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(c){return{before:!c.inclusive,values:c.position}}(e.endAt)),{ft:t,parent:s}}function Ch(r,e,t,n){const{ft:s,parent:i}=ci(r,e),o={},a=[];let u=0;return t.forEach(c=>{const l="aggregate_"+u++;o[l]=c.alias,c.aggregateType==="count"?a.push({alias:l,count:{}}):c.aggregateType==="avg"?a.push({alias:l,avg:{field:Oe(c.fieldPath)}}):c.aggregateType==="sum"&&a.push({alias:l,sum:{field:Oe(c.fieldPath)}})}),{request:{structuredAggregationQuery:{aggregations:a,structuredQuery:s.structuredQuery},parent:s.parent},gt:o,parent:i}}function Cu(r){let e=Pu(r.parent);const t=r.structuredQuery,n=t.from?t.from.length:0;let s=null;if(n>0){v(n===1,65062);const l=t.from[0];l.allDescendants?s=l.collectionId:e=e.child(l.collectionId)}let i=[];t.where&&(i=function(h){const d=Du(h);return d instanceof F&&Zs(d)?d.getFilters():[d]}(t.where));let o=[];t.orderBy&&(o=function(h){return h.map(d=>function(I){return new Fn(xt(I.field),function(A){switch(A){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(I.direction))}(d))}(t.orderBy));let a=null;t.limit&&(a=function(h){let d;return d=typeof h=="object"?h.value:h,Gn(d)?null:d}(t.limit));let u=null;t.startAt&&(u=function(h){const d=!!h.before,_=h.values||[];return new je(_,d)}(t.startAt));let c=null;return t.endAt&&(c=function(h){const d=!h.before,_=h.values||[];return new je(_,d)}(t.endAt)),ru(e,s,o,i,a,"F",u,c)}function Dh(r,e){const t=function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return T(28987,{purpose:s})}}(e.purpose);return t==null?null:{"goog-listen-tags":t}}function Du(r){return r.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":const n=xt(t.unaryFilter.field);return S.create(n,"==",{doubleValue:NaN});case"IS_NULL":const s=xt(t.unaryFilter.field);return S.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const i=xt(t.unaryFilter.field);return S.create(i,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=xt(t.unaryFilter.field);return S.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return T(61313);default:return T(60726)}}(r):r.fieldFilter!==void 0?function(t){return S.create(xt(t.fieldFilter.field),function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return T(58110);default:return T(50506)}}(t.fieldFilter.op),t.fieldFilter.value)}(r):r.compositeFilter!==void 0?function(t){return F.create(t.compositeFilter.filters.map(n=>Du(n)),function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return T(1026)}}(t.compositeFilter.op))}(r):T(30097,{filter:r})}function xh(r){return Eh[r]}function Nh(r){return wh[r]}function kh(r){return Ah[r]}function Oe(r){return{fieldPath:r.canonicalString()}}function xt(r){return z.fromServerFormat(r.fieldPath)}function xu(r){return r instanceof S?function(t){if(t.op==="=="){if(co(t.value))return{unaryFilter:{field:Oe(t.field),op:"IS_NAN"}};if(uo(t.value))return{unaryFilter:{field:Oe(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(co(t.value))return{unaryFilter:{field:Oe(t.field),op:"IS_NOT_NAN"}};if(uo(t.value))return{unaryFilter:{field:Oe(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Oe(t.field),op:Nh(t.op),value:t.value}}}(r):r instanceof F?function(t){const n=t.getFilters().map(s=>xu(s));return n.length===1?n[0]:{compositeFilter:{op:kh(t.op),filters:n}}}(r):T(54877,{filter:r})}function Fh(r){const e=[];return r.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function Nu(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}function ku(r){return!!r&&typeof r._toProto=="function"&&r._protoValueType==="ProtoValue"}/**
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
 */class Pe{constructor(e,t,n,s,i=R.min(),o=R.min(),a=$.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=s,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=a,this.expectedCount=u}withSequenceNumber(e){return new Pe(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new Pe(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Pe(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Pe(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
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
 */class Fu{constructor(e){this.yt=e}}function Mh(r,e){let t;if(e.document)t=Vh(r.yt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const n=y.fromSegments(e.noDocument.path),s=pt(e.noDocument.readTime);t=q.newNoDocument(n,s),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return T(56709);{const n=y.fromSegments(e.unknownDocument.path),s=pt(e.unknownDocument.version);t=q.newUnknownDocument(n,s)}}return e.readTime&&t.setReadTime(function(s){const i=new k(s[0],s[1]);return R.fromTimestamp(i)}(e.readTime)),t}function Po(r,e){const t=e.key,n={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:Pr(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())n.document=function(i,o){return{name:On(i,o.key),fields:o.data.value.mapValue.fields,updateTime:Jt(i,o.version.toTimestamp()),createTime:Jt(i,o.createTime.toTimestamp())}}(r.yt,e);else if(e.isNoDocument())n.noDocument={path:t.path.toArray(),readTime:gt(e.version)};else{if(!e.isUnknownDocument())return T(57904,{document:e});n.unknownDocument={path:t.path.toArray(),version:gt(e.version)}}return n}function Pr(r){const e=r.toTimestamp();return[e.seconds,e.nanoseconds]}function gt(r){const e=r.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function pt(r){const e=new k(r.seconds,r.nanoseconds);return R.fromTimestamp(e)}function st(r,e){const t=(e.baseMutations||[]).map(i=>Ns(r.yt,i));for(let i=0;i<e.mutations.length-1;++i){const o=e.mutations[i];if(i+1<e.mutations.length&&e.mutations[i+1].transform!==void 0){const a=e.mutations[i+1];o.updateTransforms=a.transform.fieldTransforms,e.mutations.splice(i+1,1),++i}}const n=e.mutations.map(i=>Ns(r.yt,i)),s=k.fromMillis(e.localWriteTimeMs);return new si(e.batchId,s,t,n)}function pn(r){const e=pt(r.readTime),t=r.lastLimboFreeSnapshotVersion!==void 0?pt(r.lastLimboFreeSnapshotVersion):R.min();let n;return n=function(i){return i.documents!==void 0}(r.query)?function(i){const o=i.documents.length;return v(o===1,1966,{count:o}),fe(jn(Pu(i.documents[0])))}(r.query):function(i){return fe(Cu(i))}(r.query),new Pe(n,r.targetId,"TargetPurposeListen",r.lastListenSequenceNumber,e,t,$.fromBase64String(r.resumeToken))}function Mu(r,e){const t=gt(e.snapshotVersion),n=gt(e.lastLimboFreeSnapshotVersion);let s;s=vr(e.target)?bu(r.yt,e.target):ci(r.yt,e.target).ft;const i=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:_t(e.target),readTime:t,resumeToken:i,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:s}}function Ou(r){const e=Cu({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?Vr(e,e.limit,"L"):e}function cs(r,e){return new oi(e.largestBatchId,Ns(r.yt,e.overlayMutation))}function So(r,e){const t=e.path.lastSegment();return[r,ie(e.path.popLast()),t]}function bo(r,e,t,n){return{indexId:r,uid:e,sequenceNumber:t,readTime:gt(n.readTime),documentKey:ie(n.documentKey.path),largestBatchId:n.largestBatchId}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oh{getBundleMetadata(e,t){return Co(e).get(t).next(n=>{if(n)return function(i){return{id:i.bundleId,createTime:pt(i.createTime),version:i.version}}(n)})}saveBundleMetadata(e,t){return Co(e).put(function(s){return{bundleId:s.id,createTime:gt(ee(s.createTime)),version:s.version}}(t))}getNamedQuery(e,t){return Do(e).get(t).next(n=>{if(n)return function(i){return{name:i.name,query:Ou(i.bundledQuery),readTime:pt(i.readTime)}}(n)})}saveNamedQuery(e,t){return Do(e).put(function(s){return{name:s.name,readTime:gt(ee(s.readTime)),bundledQuery:s.bundledQuery}}(t))}}function Co(r){return H(r,qr)}function Do(r){return H(r,Ur)}/**
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
 */class Wr{constructor(e,t){this.serializer=e,this.userId=t}static wt(e,t){const n=t.uid||"";return new Wr(e,n)}getOverlay(e,t){return cn(e).get(So(this.userId,t)).next(n=>n?cs(this.serializer,n):null)}getOverlays(e,t){const n=we();return f.forEach(t,s=>this.getOverlay(e,s).next(i=>{i!==null&&n.set(s,i)})).next(()=>n)}saveOverlays(e,t,n){const s=[];return n.forEach((i,o)=>{const a=new oi(t,o);s.push(this.bt(e,a))}),f.waitFor(s)}removeOverlaysForBatchId(e,t,n){const s=new Set;t.forEach(o=>s.add(ie(o.getCollectionPath())));const i=[];return s.forEach(o=>{const a=IDBKeyRange.bound([this.userId,o,n],[this.userId,o,n+1],!1,!0);i.push(cn(e).X(ws,a))}),f.waitFor(i)}getOverlaysForCollection(e,t,n){const s=we(),i=ie(t),o=IDBKeyRange.bound([this.userId,i,n],[this.userId,i,Number.POSITIVE_INFINITY],!0);return cn(e).H(ws,o).next(a=>{for(const u of a){const c=cs(this.serializer,u);s.set(c.getKey(),c)}return s})}getOverlaysForCollectionGroup(e,t,n,s){const i=we();let o;const a=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return cn(e).ee({index:Fa,range:a},(u,c,l)=>{const h=cs(this.serializer,c);i.size()<s||h.largestBatchId===o?(i.set(h.getKey(),h),o=h.largestBatchId):l.done()}).next(()=>i)}bt(e,t){return cn(e).put(function(s,i,o){const[a,u,c]=So(i,o.mutation.key);return{userId:i,collectionPath:u,documentId:c,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:Ln(s.yt,o.mutation)}}(this.serializer,this.userId,t))}}function cn(r){return H(r,Br)}/**
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
 */class Lh{St(e){return H(e,Hs)}getSessionToken(e){return this.St(e).get("sessionToken").next(t=>{const n=t==null?void 0:t.value;return n?$.fromUint8Array(n):$.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.St(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
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
 */class it{constructor(){}Dt(e,t){this.Ct(e,t),t.vt()}Ct(e,t){if("nullValue"in e)this.Ft(t,5);else if("booleanValue"in e)this.Ft(t,10),t.Mt(e.booleanValue?1:0);else if("integerValue"in e)this.Ft(t,15),t.Mt(L(e.integerValue));else if("doubleValue"in e){const n=L(e.doubleValue);isNaN(n)?this.Ft(t,13):(this.Ft(t,15),Sn(n)?t.Mt(0):t.Mt(n))}else if("timestampValue"in e){let n=e.timestampValue;this.Ft(t,20),typeof n=="string"&&(n=be(n)),t.xt(`${n.seconds||""}`),t.Mt(n.nanos||0)}else if("stringValue"in e)this.Ot(e.stringValue,t),this.Nt(t);else if("bytesValue"in e)this.Ft(t,30),t.Bt(Ce(e.bytesValue)),this.Nt(t);else if("referenceValue"in e)this.Lt(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.Ft(t,45),t.Mt(n.latitude||0),t.Mt(n.longitude||0)}else"mapValue"in e?Qa(e)?this.Ft(t,Number.MAX_SAFE_INTEGER):Kr(e)?this.kt(e.mapValue,t):(this.Kt(e.mapValue,t),this.Nt(t)):"arrayValue"in e?(this.qt(e.arrayValue,t),this.Nt(t)):T(19022,{Ut:e})}Ot(e,t){this.Ft(t,25),this.$t(e,t)}$t(e,t){t.xt(e)}Kt(e,t){const n=e.fields||{};this.Ft(t,55);for(const s of Object.keys(n))this.Ot(s,t),this.Ct(n[s],t)}kt(e,t){var o,a;const n=e.fields||{};this.Ft(t,53);const s=Kt,i=((a=(o=n[s].arrayValue)==null?void 0:o.values)==null?void 0:a.length)||0;this.Ft(t,15),t.Mt(L(i)),this.Ot(s,t),this.Ct(n[s],t)}qt(e,t){const n=e.values||[];this.Ft(t,50);for(const s of n)this.Ct(s,t)}Lt(e,t){this.Ft(t,37),y.fromName(e).path.forEach(n=>{this.Ft(t,60),this.$t(n,t)})}Ft(e,t){e.Mt(t)}Nt(e){e.Mt(2)}}it.Wt=new it;/**
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
 */const Vt=255;function qh(r){if(r===0)return 8;let e=0;return r>>4||(e+=4,r<<=4),r>>6||(e+=2,r<<=2),r>>7||(e+=1),e}function xo(r){const e=64-function(n){let s=0;for(let i=0;i<8;++i){const o=qh(255&n[i]);if(s+=o,o!==8)break}return s}(r);return Math.ceil(e/8)}class Uh{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Qt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Gt(n.value),n=t.next();this.zt()}jt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Ht(n.value),n=t.next();this.Jt()}Zt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Gt(n);else if(n<2048)this.Gt(960|n>>>6),this.Gt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Gt(480|n>>>12),this.Gt(128|63&n>>>6),this.Gt(128|63&n);else{const s=t.codePointAt(0);this.Gt(240|s>>>18),this.Gt(128|63&s>>>12),this.Gt(128|63&s>>>6),this.Gt(128|63&s)}}this.zt()}Xt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Ht(n);else if(n<2048)this.Ht(960|n>>>6),this.Ht(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Ht(480|n>>>12),this.Ht(128|63&n>>>6),this.Ht(128|63&n);else{const s=t.codePointAt(0);this.Ht(240|s>>>18),this.Ht(128|63&s>>>12),this.Ht(128|63&s>>>6),this.Ht(128|63&s)}}this.Jt()}Yt(e){const t=this.en(e),n=xo(t);this.tn(1+n),this.buffer[this.position++]=255&n;for(let s=t.length-n;s<t.length;++s)this.buffer[this.position++]=255&t[s]}nn(e){const t=this.en(e),n=xo(t);this.tn(1+n),this.buffer[this.position++]=~(255&n);for(let s=t.length-n;s<t.length;++s)this.buffer[this.position++]=~(255&t[s])}rn(){this.sn(Vt),this.sn(255)}_n(){this.an(Vt),this.an(255)}reset(){this.position=0}seed(e){this.tn(e.length),this.buffer.set(e,this.position),this.position+=e.length}un(){return this.buffer.slice(0,this.position)}en(e){const t=function(i){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,i,!1),new Uint8Array(o.buffer)}(e),n=!!(128&t[0]);t[0]^=n?255:128;for(let s=1;s<t.length;++s)t[s]^=n?255:0;return t}Gt(e){const t=255&e;t===0?(this.sn(0),this.sn(255)):t===Vt?(this.sn(Vt),this.sn(0)):this.sn(t)}Ht(e){const t=255&e;t===0?(this.an(0),this.an(255)):t===Vt?(this.an(Vt),this.an(0)):this.an(e)}zt(){this.sn(0),this.sn(1)}Jt(){this.an(0),this.an(1)}sn(e){this.tn(1),this.buffer[this.position++]=e}an(e){this.tn(1),this.buffer[this.position++]=~e}tn(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const s=new Uint8Array(n);s.set(this.buffer),this.buffer=s}}class Bh{constructor(e){this.cn=e}Bt(e){this.cn.Qt(e)}xt(e){this.cn.Zt(e)}Mt(e){this.cn.Yt(e)}vt(){this.cn.rn()}}class zh{constructor(e){this.cn=e}Bt(e){this.cn.jt(e)}xt(e){this.cn.Xt(e)}Mt(e){this.cn.nn(e)}vt(){this.cn._n()}}class ln{constructor(){this.cn=new Uh,this.ascending=new Bh(this.cn),this.descending=new zh(this.cn)}seed(e){this.cn.seed(e)}ln(e){return e===0?this.ascending:this.descending}un(){return this.cn.un()}reset(){this.cn.reset()}}/**
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
 */class ot{constructor(e,t,n,s){this.hn=e,this.Pn=t,this.Tn=n,this.In=s}En(){const e=this.In.length,t=e===0||this.In[e-1]===255?e+1:e,n=new Uint8Array(t);return n.set(this.In,0),t!==e?n.set([0],this.In.length):++n[n.length-1],new ot(this.hn,this.Pn,this.Tn,n)}Rn(e,t,n){return{indexId:this.hn,uid:e,arrayValue:_r(this.Tn),directionalValue:_r(this.In),orderedDocumentKey:_r(t),documentKey:n.path.toArray()}}An(e,t,n){const s=this.Rn(e,t,n);return[s.indexId,s.uid,s.arrayValue,s.directionalValue,s.orderedDocumentKey,s.documentKey]}}function ke(r,e){let t=r.hn-e.hn;return t!==0?t:(t=No(r.Tn,e.Tn),t!==0?t:(t=No(r.In,e.In),t!==0?t:y.comparator(r.Pn,e.Pn)))}function No(r,e){for(let t=0;t<r.length&&t<e.length;++t){const n=r[t]-e[t];if(n!==0)return n}return r.length-e.length}function _r(r){return Ia()?function(t){let n="";for(let s=0;s<t.length;s++)n+=String.fromCharCode(t[s]);return n}(r):r}function ko(r){return typeof r!="string"?r:function(t){const n=new Uint8Array(t.length);for(let s=0;s<t.length;s++)n[s]=t.charCodeAt(s);return n}(r)}class Fo{constructor(e){this.Vn=new M((t,n)=>z.comparator(t.field,n.field)),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.dn=e.orderBy,this.mn=[];for(const t of e.filters){const n=t;n.isInequality()?this.Vn=this.Vn.add(n):this.mn.push(n)}}get fn(){return this.Vn.size>1}gn(e){if(v(e.collectionGroup===this.collectionId,49279),this.fn)return!1;const t=Is(e);if(t!==void 0&&!this.pn(t))return!1;const n=tt(e);let s=new Set,i=0,o=0;for(;i<n.length&&this.pn(n[i]);++i)s=s.add(n[i].fieldPath.canonicalString());if(i===n.length)return!0;if(this.Vn.size>0){const a=this.Vn.getIterator().getNext();if(!s.has(a.field.canonicalString())){const u=n[i];if(!this.yn(a,u)||!this.wn(this.dn[o++],u))return!1}++i}for(;i<n.length;++i){const a=n[i];if(o>=this.dn.length||!this.wn(this.dn[o++],a))return!1}return!0}bn(){if(this.fn)return null;let e=new M(z.comparator);const t=[];for(const n of this.mn)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")t.push(new ar(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new ar(n.field,0))}for(const n of this.dn)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new ar(n.field,n.dir==="asc"?0:1)));return new Ir(Ir.UNKNOWN_ID,this.collectionId,t,Pn.empty())}pn(e){for(const t of this.mn)if(this.yn(t,e))return!0;return!1}yn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const n=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===n}wn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
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
 */function Lu(r){var t,n;if(v(r instanceof S||r instanceof F,20012),r instanceof S){if(r instanceof nu){const s=((n=(t=r.value.arrayValue)==null?void 0:t.values)==null?void 0:n.map(i=>S.create(r.field,"==",i)))||[];return F.create(s,"or")}return r}const e=r.filters.map(s=>Lu(s));return F.create(e,r.op)}function Gh(r){if(r.getFilters().length===0)return[];const e=Ms(Lu(r));return v(qu(e),7391),ks(e)||Fs(e)?[e]:e.getFilters()}function ks(r){return r instanceof S}function Fs(r){return r instanceof F&&Zs(r)}function qu(r){return ks(r)||Fs(r)||function(t){if(t instanceof F&&Vs(t)){for(const n of t.getFilters())if(!ks(n)&&!Fs(n))return!1;return!0}return!1}(r)}function Ms(r){if(v(r instanceof S||r instanceof F,34018),r instanceof S)return r;if(r.filters.length===1)return Ms(r.filters[0]);const e=r.filters.map(n=>Ms(n));let t=F.create(e,r.op);return t=Sr(t),qu(t)?t:(v(t instanceof F,64498),v(jt(t),40251),v(t.filters.length>1,57927),t.filters.reduce((n,s)=>li(n,s)))}function li(r,e){let t;return v(r instanceof S||r instanceof F,38388),v(e instanceof S||e instanceof F,25473),t=r instanceof S?e instanceof S?function(s,i){return F.create([s,i],"and")}(r,e):Mo(r,e):e instanceof S?Mo(e,r):function(s,i){if(v(s.filters.length>0&&i.filters.length>0,48005),jt(s)&&jt(i))return Za(s,i.getFilters());const o=Vs(s)?s:i,a=Vs(s)?i:s,u=o.filters.map(c=>li(c,a));return F.create(u,"or")}(r,e),Sr(t)}function Mo(r,e){if(jt(e))return Za(e,r.getFilters());{const t=e.filters.map(n=>li(r,n));return F.create(t,"or")}}function Sr(r){if(v(r instanceof S||r instanceof F,11850),r instanceof S)return r;const e=r.getFilters();if(e.length===1)return Sr(e[0]);if(Ya(r))return r;const t=e.map(s=>Sr(s)),n=[];return t.forEach(s=>{s instanceof S?n.push(s):s instanceof F&&(s.op===r.op?n.push(...s.filters):n.push(s))}),n.length===1?n[0]:F.create(n,r.op)}/**
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
 */class Kh{constructor(){this.Sn=new hi}addToCollectionParentIndex(e,t){return this.Sn.add(t),f.resolve()}getCollectionParents(e,t){return f.resolve(this.Sn.getEntries(t))}addFieldIndex(e,t){return f.resolve()}deleteFieldIndex(e,t){return f.resolve()}deleteAllFieldIndexes(e){return f.resolve()}createTargetIndexes(e,t){return f.resolve()}getDocumentsMatchingTarget(e,t){return f.resolve(null)}getIndexType(e,t){return f.resolve(0)}getFieldIndexes(e,t){return f.resolve([])}getNextCollectionGroupToUpdate(e){return f.resolve(null)}getMinOffset(e,t){return f.resolve(me.min())}getMinOffsetFromCollectionGroup(e,t){return f.resolve(me.min())}updateCollectionGroup(e,t,n){return f.resolve()}updateIndexEntries(e,t){return f.resolve()}}class hi{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),s=this.index[t]||new M(x.comparator),i=!s.has(n);return this.index[t]=s.add(n),i}has(e){const t=e.lastSegment(),n=e.popLast(),s=this.index[t];return s&&s.has(n)}getEntries(e){return(this.index[e]||new M(x.comparator)).toArray()}}/**
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
 */const Oo="IndexedDbIndexManager",rr=new Uint8Array(0);class $h{constructor(e,t){this.databaseId=t,this.Dn=new hi,this.Cn=new De(n=>_t(n),(n,s)=>$n(n,s)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.Dn.has(t)){const n=t.lastSegment(),s=t.popLast();e.addOnCommittedListener(()=>{this.Dn.add(t)});const i={collectionId:n,parent:ie(s)};return Lo(e).put(i)}return f.resolve()}getCollectionParents(e,t){const n=[],s=IDBKeyRange.bound([t,""],[Ea(t),""],!1,!0);return Lo(e).H(s).next(i=>{for(const o of i){if(o.collectionId!==t)break;n.push(Ee(o.parent))}return n})}addFieldIndex(e,t){const n=hn(e),s=function(a){return{indexId:a.indexId,collectionGroup:a.collectionGroup,fields:a.fields.map(u=>[u.fieldPath.canonicalString(),u.kind])}}(t);delete s.indexId;const i=n.add(s);if(t.indexState){const o=St(e);return i.next(a=>{o.put(bo(a,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return i.next()}deleteFieldIndex(e,t){const n=hn(e),s=St(e),i=Pt(e);return n.delete(t.indexId).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=hn(e),n=Pt(e),s=St(e);return t.X().next(()=>n.X()).next(()=>s.X())}createTargetIndexes(e,t){return f.forEach(this.vn(t),n=>this.getIndexType(e,n).next(s=>{if(s===0||s===1){const i=new Fo(n).bn();if(i!=null)return this.addFieldIndex(e,i)}}))}getDocumentsMatchingTarget(e,t){const n=Pt(e);let s=!0;const i=new Map;return f.forEach(this.vn(t),o=>this.Fn(e,o).next(a=>{s&&(s=!!a),i.set(o,a)})).next(()=>{if(s){let o=P();const a=[];return f.forEach(i,(u,c)=>{g(Oo,`Using index ${function(C){return`id=${C.indexId}|cg=${C.collectionGroup}|f=${C.fields.map(J=>`${J.fieldPath}:${J.kind}`).join(",")}`}(u)} to execute ${_t(t)}`);const l=function(C,J){const G=Is(J);if(G===void 0)return null;for(const W of Rr(C,G.fieldPath))switch(W.op){case"array-contains-any":return W.value.arrayValue.values||[];case"array-contains":return[W.value]}return null}(c,u),h=function(C,J){const G=new Map;for(const W of tt(J))for(const oe of Rr(C,W.fieldPath))switch(oe.op){case"==":case"in":G.set(W.fieldPath.canonicalString(),oe.value);break;case"not-in":case"!=":return G.set(W.fieldPath.canonicalString(),oe.value),Array.from(G.values())}return null}(c,u),d=function(C,J){const G=[];let W=!0;for(const oe of tt(J)){const Ne=oe.kind===0?_o(C,oe.fieldPath,C.startAt):go(C,oe.fieldPath,C.startAt);G.push(Ne.value),W&&(W=Ne.inclusive)}return new je(G,W)}(c,u),_=function(C,J){const G=[];let W=!0;for(const oe of tt(J)){const Ne=oe.kind===0?go(C,oe.fieldPath,C.endAt):_o(C,oe.fieldPath,C.endAt);G.push(Ne.value),W&&(W=Ne.inclusive)}return new je(G,W)}(c,u),I=this.Mn(u,c,d),E=this.Mn(u,c,_),A=this.xn(u,c,h),N=this.On(u.indexId,l,I,d.inclusive,E,_.inclusive,A);return f.forEach(N,b=>n.Z(b,t.limit).next(C=>{C.forEach(J=>{const G=y.fromSegments(J.documentKey);o.has(G)||(o=o.add(G),a.push(G))})}))}).next(()=>a)}return f.resolve(null)})}vn(e){let t=this.Cn.get(e);return t||(e.filters.length===0?t=[e]:t=Gh(F.create(e.filters,"and")).map(n=>Ss(e.path,e.collectionGroup,e.orderBy,n.getFilters(),e.limit,e.startAt,e.endAt)),this.Cn.set(e,t),t)}On(e,t,n,s,i,o,a){const u=(t!=null?t.length:1)*Math.max(n.length,i.length),c=u/(t!=null?t.length:1),l=[];for(let h=0;h<u;++h){const d=t?this.Nn(t[h/c]):rr,_=this.Bn(e,d,n[h%c],s),I=this.Ln(e,d,i[h%c],o),E=a.map(A=>this.Bn(e,d,A,!0));l.push(...this.createRange(_,I,E))}return l}Bn(e,t,n,s){const i=new ot(e,y.empty(),t,n);return s?i:i.En()}Ln(e,t,n,s){const i=new ot(e,y.empty(),t,n);return s?i.En():i}Fn(e,t){const n=new Fo(t),s=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,s).next(i=>{let o=null;for(const a of i)n.gn(a)&&(!o||a.fields.length>o.fields.length)&&(o=a);return o})}getIndexType(e,t){let n=2;const s=this.vn(t);return f.forEach(s,i=>this.Fn(e,i).next(o=>{o?n!==0&&o.fields.length<function(u){let c=new M(z.comparator),l=!1;for(const h of u.filters)for(const d of h.getFlattenedFilters())d.field.isKeyField()||(d.op==="array-contains"||d.op==="array-contains-any"?l=!0:c=c.add(d.field));for(const h of u.orderBy)h.field.isKeyField()||(c=c.add(h.field));return c.size+(l?1:0)}(i)&&(n=1):n=0})).next(()=>function(o){return o.limit!==null}(t)&&s.length>1&&n===2?1:n)}kn(e,t){const n=new ln;for(const s of tt(e)){const i=t.data.field(s.fieldPath);if(i==null)return null;const o=n.ln(s.kind);it.Wt.Dt(i,o)}return n.un()}Nn(e){const t=new ln;return it.Wt.Dt(e,t.ln(0)),t.un()}Kn(e,t){const n=new ln;return it.Wt.Dt(mt(this.databaseId,t),n.ln(function(i){const o=tt(i);return o.length===0?0:o[o.length-1].kind}(e))),n.un()}xn(e,t,n){if(n===null)return[];let s=[];s.push(new ln);let i=0;for(const o of tt(e)){const a=n[i++];for(const u of s)if(this.qn(t,o.fieldPath)&&kn(a))s=this.Un(s,o,a);else{const c=u.ln(o.kind);it.Wt.Dt(a,c)}}return this.$n(s)}Mn(e,t,n){return this.xn(e,t,n.position)}$n(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].un();return t}Un(e,t,n){const s=[...e],i=[];for(const o of n.arrayValue.values||[])for(const a of s){const u=new ln;u.seed(a.un()),it.Wt.Dt(o,u.ln(t.kind)),i.push(u)}return i}qn(e,t){return!!e.filters.find(n=>n instanceof S&&n.field.isEqual(t)&&(n.op==="in"||n.op==="not-in"))}getFieldIndexes(e,t){const n=hn(e),s=St(e);return(t?n.H(Es,IDBKeyRange.bound(t,t)):n.H()).next(i=>{const o=[];return f.forEach(i,a=>s.get([a.indexId,this.uid]).next(u=>{o.push(function(l,h){const d=h?new Pn(h.sequenceNumber,new me(pt(h.readTime),new y(Ee(h.documentKey)),h.largestBatchId)):Pn.empty(),_=l.fields.map(([I,E])=>new ar(z.fromServerFormat(I),E));return new Ir(l.indexId,l.collectionGroup,_,d)}(a,u))})).next(()=>o)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(t=>t.length===0?null:(t.sort((n,s)=>{const i=n.indexState.sequenceNumber-s.indexState.sequenceNumber;return i!==0?i:V(n.collectionGroup,s.collectionGroup)}),t[0].collectionGroup))}updateCollectionGroup(e,t,n){const s=hn(e),i=St(e);return this.Wn(e).next(o=>s.H(Es,IDBKeyRange.bound(t,t)).next(a=>f.forEach(a,u=>i.put(bo(u.indexId,this.uid,o,n)))))}updateIndexEntries(e,t){const n=new Map;return f.forEach(t,(s,i)=>{const o=n.get(s.collectionGroup);return(o?f.resolve(o):this.getFieldIndexes(e,s.collectionGroup)).next(a=>(n.set(s.collectionGroup,a),f.forEach(a,u=>this.Qn(e,s,u).next(c=>{const l=this.Gn(i,u);return c.isEqual(l)?f.resolve():this.zn(e,i,u,c,l)}))))})}jn(e,t,n,s){return Pt(e).put(s.Rn(this.uid,this.Kn(n,t.key),t.key))}Hn(e,t,n,s){return Pt(e).delete(s.An(this.uid,this.Kn(n,t.key),t.key))}Qn(e,t,n){const s=Pt(e);let i=new M(ke);return s.ee({index:ka,range:IDBKeyRange.only([n.indexId,this.uid,_r(this.Kn(n,t))])},(o,a)=>{i=i.add(new ot(n.indexId,t,ko(a.arrayValue),ko(a.directionalValue)))}).next(()=>i)}Gn(e,t){let n=new M(ke);const s=this.kn(t,e);if(s==null)return n;const i=Is(t);if(i!=null){const o=e.data.field(i.fieldPath);if(kn(o))for(const a of o.arrayValue.values||[])n=n.add(new ot(t.indexId,e.key,this.Nn(a),s))}else n=n.add(new ot(t.indexId,e.key,rr,s));return n}zn(e,t,n,s,i){g(Oo,"Updating index entries for document '%s'",t.key);const o=[];return function(u,c,l,h,d){const _=u.getIterator(),I=c.getIterator();let E=Rt(_),A=Rt(I);for(;E||A;){let N=!1,b=!1;if(E&&A){const C=l(E,A);C<0?b=!0:C>0&&(N=!0)}else E!=null?b=!0:N=!0;N?(h(A),A=Rt(I)):b?(d(E),E=Rt(_)):(E=Rt(_),A=Rt(I))}}(s,i,ke,a=>{o.push(this.jn(e,t,n,a))},a=>{o.push(this.Hn(e,t,n,a))}),f.waitFor(o)}Wn(e){let t=1;return St(e).ee({index:Na,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(n,s,i)=>{i.done(),t=s.sequenceNumber+1}).next(()=>t)}createRange(e,t,n){n=n.sort((o,a)=>ke(o,a)).filter((o,a,u)=>!a||ke(o,u[a-1])!==0);const s=[];s.push(e);for(const o of n){const a=ke(o,e),u=ke(o,t);if(a===0)s[0]=e.En();else if(a>0&&u<0)s.push(o),s.push(o.En());else if(u>0)break}s.push(t);const i=[];for(let o=0;o<s.length;o+=2){if(this.Jn(s[o],s[o+1]))return[];const a=s[o].An(this.uid,rr,y.empty()),u=s[o+1].An(this.uid,rr,y.empty());i.push(IDBKeyRange.bound(a,u))}return i}Jn(e,t){return ke(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(qo)}getMinOffset(e,t){return f.mapArray(this.vn(t),n=>this.Fn(e,n).next(s=>s||T(44426))).next(qo)}}function Lo(r){return H(r,Dn)}function Pt(r){return H(r,En)}function hn(r){return H(r,Ws)}function St(r){return H(r,Tn)}function qo(r){v(r.length!==0,28825);let e=r[0].indexState.offset,t=e.largestBatchId;for(let n=1;n<r.length;n++){const s=r[n].indexState.offset;$s(s,e)<0&&(e=s),t<s.largestBatchId&&(t=s.largestBatchId)}return new me(e.readTime,e.documentKey,t)}/**
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
 */const Uo={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},Uu=41943040;class se{static withCacheSize(e){return new se(e,se.DEFAULT_COLLECTION_PERCENTILE,se.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bu(r,e,t){const n=r.store(pe),s=r.store(Ut),i=[],o=IDBKeyRange.only(t.batchId);let a=0;const u=n.ee({range:o},(l,h,d)=>(a++,d.delete()));i.push(u.next(()=>{v(a===1,47070,{batchId:t.batchId})}));const c=[];for(const l of t.mutations){const h=Ca(e,l.key.path,t.batchId);i.push(s.delete(h)),c.push(l.key)}return f.waitFor(i).next(()=>c)}function br(r){if(!r)return 0;let e;if(r.document)e=r.document;else if(r.unknownDocument)e=r.unknownDocument;else{if(!r.noDocument)throw T(14731);e=r.noDocument}return JSON.stringify(e).length}/**
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
 */se.DEFAULT_COLLECTION_PERCENTILE=10,se.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,se.DEFAULT=new se(Uu,se.DEFAULT_COLLECTION_PERCENTILE,se.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),se.DISABLED=new se(-1,0,0);class Hr{constructor(e,t,n,s){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=s,this.Zn={}}static wt(e,t,n,s){v(e.uid!=="",64387);const i=e.isAuthenticated()?e.uid:"";return new Hr(i,t,n,s)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return Fe(e).ee({index:at,range:n},(s,i,o)=>{t=!1,o.done()}).next(()=>t)}addMutationBatch(e,t,n,s){const i=Nt(e),o=Fe(e);return o.add({}).next(a=>{v(typeof a=="number",49019);const u=new si(a,t,n,s),c=function(_,I,E){const A=E.baseMutations.map(b=>Ln(_.yt,b)),N=E.mutations.map(b=>Ln(_.yt,b));return{userId:I,batchId:E.batchId,localWriteTimeMs:E.localWriteTime.toMillis(),baseMutations:A,mutations:N}}(this.serializer,this.userId,u),l=[];let h=new M((d,_)=>V(d.canonicalString(),_.canonicalString()));for(const d of s){const _=Ca(this.userId,d.key.path,a);h=h.add(d.key.path.popLast()),l.push(o.put(c)),l.push(i.put(_,pl))}return h.forEach(d=>{l.push(this.indexManager.addToCollectionParentIndex(e,d))}),e.addOnCommittedListener(()=>{this.Zn[a]=u.keys()}),f.waitFor(l).next(()=>u)})}lookupMutationBatch(e,t){return Fe(e).get(t).next(n=>n?(v(n.userId===this.userId,48,"Unexpected user for mutation batch",{userId:n.userId,batchId:t}),st(this.serializer,n)):null)}Xn(e,t){return this.Zn[t]?f.resolve(this.Zn[t]):this.lookupMutationBatch(e,t).next(n=>{if(n){const s=n.keys();return this.Zn[t]=s,s}return null})}getNextMutationBatchAfterBatchId(e,t){const n=t+1,s=IDBKeyRange.lowerBound([this.userId,n]);let i=null;return Fe(e).ee({index:at,range:s},(o,a,u)=>{a.userId===this.userId&&(v(a.batchId>=n,47524,{Yn:n}),i=st(this.serializer,a)),u.done()}).next(()=>i)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=ct;return Fe(e).ee({index:at,range:t,reverse:!0},(s,i,o)=>{n=i.batchId,o.done()}).next(()=>n)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,ct],[this.userId,Number.POSITIVE_INFINITY]);return Fe(e).H(at,t).next(n=>n.map(s=>st(this.serializer,s)))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=ur(this.userId,t.path),s=IDBKeyRange.lowerBound(n),i=[];return Nt(e).ee({range:s},(o,a,u)=>{const[c,l,h]=o,d=Ee(l);if(c===this.userId&&t.path.isEqual(d))return Fe(e).get(h).next(_=>{if(!_)throw T(61480,{er:o,batchId:h});v(_.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:_.userId,batchId:h}),i.push(st(this.serializer,_))});u.done()}).next(()=>i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new M(V);const s=[];return t.forEach(i=>{const o=ur(this.userId,i.path),a=IDBKeyRange.lowerBound(o),u=Nt(e).ee({range:a},(c,l,h)=>{const[d,_,I]=c,E=Ee(_);d===this.userId&&i.path.isEqual(E)?n=n.add(I):h.done()});s.push(u)}),f.waitFor(s).next(()=>this.tr(e,n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,s=n.length+1,i=ur(this.userId,n),o=IDBKeyRange.lowerBound(i);let a=new M(V);return Nt(e).ee({range:o},(u,c,l)=>{const[h,d,_]=u,I=Ee(d);h===this.userId&&n.isPrefixOf(I)?I.length===s&&(a=a.add(_)):l.done()}).next(()=>this.tr(e,a))}tr(e,t){const n=[],s=[];return t.forEach(i=>{s.push(Fe(e).get(i).next(o=>{if(o===null)throw T(35274,{batchId:i});v(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:i}),n.push(st(this.serializer,o))}))}),f.waitFor(s).next(()=>n)}removeMutationBatch(e,t){return Bu(e.le,this.userId,t).next(n=>(e.addOnCommittedListener(()=>{this.nr(t.batchId)}),f.forEach(n,s=>this.referenceDelegate.markPotentiallyOrphaned(e,s))))}nr(e){delete this.Zn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return f.resolve();const n=IDBKeyRange.lowerBound(function(o){return[o]}(this.userId)),s=[];return Nt(e).ee({range:n},(i,o,a)=>{if(i[0]===this.userId){const u=Ee(i[1]);s.push(u)}else a.done()}).next(()=>{v(s.length===0,56720,{rr:s.map(i=>i.canonicalString())})})})}containsKey(e,t){return zu(e,this.userId,t)}ir(e){return Gu(e).get(this.userId).next(t=>t||{userId:this.userId,lastAcknowledgedBatchId:ct,lastStreamToken:""})}}function zu(r,e,t){const n=ur(e,t.path),s=n[1],i=IDBKeyRange.lowerBound(n);let o=!1;return Nt(r).ee({range:i,Y:!0},(a,u,c)=>{const[l,h,d]=a;l===e&&h===s&&(o=!0),c.done()}).next(()=>o)}function Fe(r){return H(r,pe)}function Nt(r){return H(r,Ut)}function Gu(r){return H(r,bn)}/**
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
 */class yt{constructor(e){this.sr=e}next(){return this.sr+=2,this.sr}static _r(){return new yt(0)}static ar(){return new yt(-1)}}/**
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
 */class jh{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.ur(e).next(t=>{const n=new yt(t.highestTargetId);return t.highestTargetId=n.next(),this.cr(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.ur(e).next(t=>R.fromTimestamp(new k(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.ur(e).next(t=>t.highestListenSequenceNumber)}setTargetsMetadata(e,t,n){return this.ur(e).next(s=>(s.highestListenSequenceNumber=t,n&&(s.lastRemoteSnapshotVersion=n.toTimestamp()),t>s.highestListenSequenceNumber&&(s.highestListenSequenceNumber=t),this.cr(e,s)))}addTargetData(e,t){return this.lr(e,t).next(()=>this.ur(e).next(n=>(n.targetCount+=1,this.hr(t,n),this.cr(e,n))))}updateTargetData(e,t){return this.lr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>bt(e).delete(t.targetId)).next(()=>this.ur(e)).next(n=>(v(n.targetCount>0,8065),n.targetCount-=1,this.cr(e,n)))}removeTargets(e,t,n){let s=0;const i=[];return bt(e).ee((o,a)=>{const u=pn(a);u.sequenceNumber<=t&&n.get(u.targetId)===null&&(s++,i.push(this.removeTargetData(e,u)))}).next(()=>f.waitFor(i)).next(()=>s)}forEachTarget(e,t){return bt(e).ee((n,s)=>{const i=pn(s);t(i)})}ur(e){return Bo(e).get(wr).next(t=>(v(t!==null,2888),t))}cr(e,t){return Bo(e).put(wr,t)}lr(e,t){return bt(e).put(Mu(this.serializer,t))}hr(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.ur(e).next(t=>t.targetCount)}getTargetData(e,t){const n=_t(t),s=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let i=null;return bt(e).ee({range:s,index:xa},(o,a,u)=>{const c=pn(a);$n(t,c.target)&&(i=c,u.done())}).next(()=>i)}addMatchingKeys(e,t,n){const s=[],i=Le(e);return t.forEach(o=>{const a=ie(o.path);s.push(i.put({targetId:n,path:a})),s.push(this.referenceDelegate.addReference(e,n,o))}),f.waitFor(s)}removeMatchingKeys(e,t,n){const s=Le(e);return f.forEach(t,i=>{const o=ie(i.path);return f.waitFor([s.delete([n,o]),this.referenceDelegate.removeReference(e,n,i)])})}removeMatchingKeysForTargetId(e,t){const n=Le(e),s=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(s)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),s=Le(e);let i=P();return s.ee({range:n,Y:!0},(o,a,u)=>{const c=Ee(o[1]),l=new y(c);i=i.add(l)}).next(()=>i)}containsKey(e,t){const n=ie(t.path),s=IDBKeyRange.bound([n],[Ea(n)],!1,!0);let i=0;return Le(e).ee({index:Qs,Y:!0,range:s},([o,a],u,c)=>{o!==0&&(i++,c.done())}).next(()=>i>0)}At(e,t){return bt(e).get(t).next(n=>n?pn(n):null)}}function bt(r){return H(r,Bt)}function Bo(r){return H(r,lt)}function Le(r){return H(r,zt)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zo="LruGarbageCollector",Ku=1048576;function Go([r,e],[t,n]){const s=V(r,t);return s===0?V(e,n):s}class Qh{constructor(e){this.Pr=e,this.buffer=new M(Go),this.Tr=0}Ir(){return++this.Tr}Er(e){const t=[e,this.Ir()];if(this.buffer.size<this.Pr)this.buffer=this.buffer.add(t);else{const n=this.buffer.last();Go(t,n)<0&&(this.buffer=this.buffer.delete(n).add(t))}}get maxValue(){return this.buffer.last()[0]}}class $u{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Ar(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Ar(e){g(zo,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){Je(t)?g(zo,"Ignoring IndexedDB error during garbage collection: ",t):await He(t)}await this.Ar(3e5)})}}class Wh{constructor(e,t){this.Vr=e,this.params=t}calculateTargetCount(e,t){return this.Vr.dr(e).next(n=>Math.floor(t/100*n))}nthSequenceNumber(e,t){if(t===0)return f.resolve(ae.ce);const n=new Qh(t);return this.Vr.forEachTarget(e,s=>n.Er(s.sequenceNumber)).next(()=>this.Vr.mr(e,s=>n.Er(s))).next(()=>n.maxValue)}removeTargets(e,t,n){return this.Vr.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.Vr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(g("LruGarbageCollector","Garbage collection skipped; disabled"),f.resolve(Uo)):this.getCacheSize(e).next(n=>n<this.params.cacheSizeCollectionThreshold?(g("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),Uo):this.gr(e,t))}getCacheSize(e){return this.Vr.getCacheSize(e)}gr(e,t){let n,s,i,o,a,u,c;const l=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(h=>(h>this.params.maximumSequenceNumbersToCollect?(g("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${h}`),s=this.params.maximumSequenceNumbersToCollect):s=h,o=Date.now(),this.nthSequenceNumber(e,s))).next(h=>(n=h,a=Date.now(),this.removeTargets(e,n,t))).next(h=>(i=h,u=Date.now(),this.removeOrphanedDocuments(e,n))).next(h=>(c=Date.now(),Ct()<=Ve.DEBUG&&g("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-l}ms
	Determined least recently used ${s} in `+(a-o)+`ms
	Removed ${i} targets in `+(u-a)+`ms
	Removed ${h} documents in `+(c-u)+`ms
Total Duration: ${c-l}ms`),f.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:i,documentsRemoved:h})))}}function ju(r,e){return new Wh(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hh{constructor(e,t){this.db=e,this.garbageCollector=ju(this,t)}dr(e){const t=this.pr(e);return this.db.getTargetCache().getTargetCount(e).next(n=>t.next(s=>n+s))}pr(e){let t=0;return this.mr(e,n=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}mr(e,t){return this.yr(e,(n,s)=>t(s))}addReference(e,t,n){return sr(e,n)}removeReference(e,t,n){return sr(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return sr(e,t)}wr(e,t){return function(s,i){let o=!1;return Gu(s).te(a=>zu(s,a,i).next(u=>(u&&(o=!0),f.resolve(!u)))).next(()=>o)}(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),s=[];let i=0;return this.yr(e,(o,a)=>{if(a<=t){const u=this.wr(e,o).next(c=>{if(!c)return i++,n.getEntry(e,o).next(()=>(n.removeEntry(o,R.min()),Le(e).delete(function(h){return[0,ie(h.path)]}(o))))});s.push(u)}}).next(()=>f.waitFor(s)).next(()=>n.apply(e)).next(()=>i)}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return sr(e,t)}yr(e,t){const n=Le(e);let s,i=ae.ce;return n.ee({index:Qs},([o,a],{path:u,sequenceNumber:c})=>{o===0?(i!==ae.ce&&t(new y(Ee(s)),i),i=c,s=u):i=ae.ce}).next(()=>{i!==ae.ce&&t(new y(Ee(s)),i)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function sr(r,e){return Le(r).put(function(n,s){return{targetId:0,path:ie(n.path),sequenceNumber:s}}(e,r.currentSequenceNumber))}/**
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
 */class Qu{constructor(){this.changes=new De(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,q.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return n!==void 0?f.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
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
 */class Jh{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return et(e).put(n)}removeEntry(e,t,n){return et(e).delete(function(i,o){const a=i.path.toArray();return[a.slice(0,a.length-2),a[a.length-2],Pr(o),a[a.length-1]]}(t,n))}updateMetadata(e,t){return this.getMetadata(e).next(n=>(n.byteSize+=t,this.br(e,n)))}getEntry(e,t){let n=q.newInvalidDocument(t);return et(e).ee({index:cr,range:IDBKeyRange.only(dn(t))},(s,i)=>{n=this.Sr(t,i)}).next(()=>n)}Dr(e,t){let n={size:0,document:q.newInvalidDocument(t)};return et(e).ee({index:cr,range:IDBKeyRange.only(dn(t))},(s,i)=>{n={document:this.Sr(t,i),size:br(i)}}).next(()=>n)}getEntries(e,t){let n=de();return this.Cr(e,t,(s,i)=>{const o=this.Sr(s,i);n=n.insert(s,o)}).next(()=>n)}vr(e,t){let n=de(),s=new O(y.comparator);return this.Cr(e,t,(i,o)=>{const a=this.Sr(i,o);n=n.insert(i,a),s=s.insert(i,br(o))}).next(()=>({documents:n,Fr:s}))}Cr(e,t,n){if(t.isEmpty())return f.resolve();let s=new M(jo);t.forEach(u=>s=s.add(u));const i=IDBKeyRange.bound(dn(s.first()),dn(s.last())),o=s.getIterator();let a=o.getNext();return et(e).ee({index:cr,range:i},(u,c,l)=>{const h=y.fromSegments([...c.prefixPath,c.collectionGroup,c.documentId]);for(;a&&jo(a,h)<0;)n(a,null),a=o.getNext();a&&a.isEqual(h)&&(n(a,c),a=o.hasNext()?o.getNext():null),a?l.j(dn(a)):l.done()}).next(()=>{for(;a;)n(a,null),a=o.hasNext()?o.getNext():null})}getDocumentsMatchingQuery(e,t,n,s,i){const o=t.path,a=[o.popLast().toArray(),o.lastSegment(),Pr(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],u=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return et(e).H(IDBKeyRange.bound(a,u,!0)).next(c=>{i==null||i.incrementDocumentReadCount(c.length);let l=de();for(const h of c){const d=this.Sr(y.fromSegments(h.prefixPath.concat(h.collectionGroup,h.documentId)),h);d.isFoundDocument()&&(Qn(t,d)||s.has(d.key))&&(l=l.insert(d.key,d))}return l})}getAllFromCollectionGroup(e,t,n,s){let i=de();const o=$o(t,n),a=$o(t,me.max());return et(e).ee({index:Da,range:IDBKeyRange.bound(o,a,!0)},(u,c,l)=>{const h=this.Sr(y.fromSegments(c.prefixPath.concat(c.collectionGroup,c.documentId)),c);i=i.insert(h.key,h),i.size===s&&l.done()}).next(()=>i)}newChangeBuffer(e){return new Yh(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(t=>t.byteSize)}getMetadata(e){return Ko(e).get(Ts).next(t=>(v(!!t,20021),t))}br(e,t){return Ko(e).put(Ts,t)}Sr(e,t){if(t){const n=Mh(this.serializer,t);if(!(n.isNoDocument()&&n.version.isEqual(R.min())))return n}return q.newInvalidDocument(e)}}function Wu(r){return new Jh(r)}class Yh extends Qu{constructor(e,t){super(),this.Mr=e,this.trackRemovals=t,this.Or=new De(n=>n.toString(),(n,s)=>n.isEqual(s))}applyChanges(e){const t=[];let n=0,s=new M((i,o)=>V(i.canonicalString(),o.canonicalString()));return this.changes.forEach((i,o)=>{const a=this.Or.get(i);if(t.push(this.Mr.removeEntry(e,i,a.readTime)),o.isValidDocument()){const u=Po(this.Mr.serializer,o);s=s.add(i.path.popLast());const c=br(u);n+=c-a.size,t.push(this.Mr.addEntry(e,i,u))}else if(n-=a.size,this.trackRemovals){const u=Po(this.Mr.serializer,o.convertToNoDocument(R.min()));t.push(this.Mr.addEntry(e,i,u))}}),s.forEach(i=>{t.push(this.Mr.indexManager.addToCollectionParentIndex(e,i))}),t.push(this.Mr.updateMetadata(e,n)),f.waitFor(t)}getFromCache(e,t){return this.Mr.Dr(e,t).next(n=>(this.Or.set(t,{size:n.size,readTime:n.document.readTime}),n.document))}getAllFromCache(e,t){return this.Mr.vr(e,t).next(({documents:n,Fr:s})=>(s.forEach((i,o)=>{this.Or.set(i,{size:o,readTime:n.get(i).readTime})}),n))}}function Ko(r){return H(r,Cn)}function et(r){return H(r,Er)}function dn(r){const e=r.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function $o(r,e){const t=e.documentKey.path.toArray();return[r,Pr(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function jo(r,e){const t=r.path.toArray(),n=e.path.toArray();let s=0;for(let i=0;i<t.length-2&&i<n.length-2;++i)if(s=V(t[i],n[i]),s)return s;return s=V(t.length,n.length),s||(s=V(t[t.length-2],n[n.length-2]),s||V(t[t.length-1],n[n.length-1]))}/**
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
 */class Xh{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
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
 */class Hu{constructor(e,t,n,s){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=s}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next(s=>(n=s,this.remoteDocumentCache.getEntry(e,t))).next(s=>(n!==null&&vn(n.mutation,s,ue.empty(),k.now()),s))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.getLocalViewOfDocuments(e,n,P()).next(()=>n))}getLocalViewOfDocuments(e,t,n=P()){const s=we();return this.populateOverlays(e,s,t).next(()=>this.computeViews(e,t,s,n).next(i=>{let o=_n();return i.forEach((a,u)=>{o=o.insert(a,u.overlayedDocument)}),o}))}getOverlayedDocuments(e,t){const n=we();return this.populateOverlays(e,n,t).next(()=>this.computeViews(e,t,n,P()))}populateOverlays(e,t,n){const s=[];return n.forEach(i=>{t.has(i)||s.push(i)}),this.documentOverlayCache.getOverlays(e,s).next(i=>{i.forEach((o,a)=>{t.set(o,a)})})}computeViews(e,t,n,s){let i=de();const o=An(),a=function(){return An()}();return t.forEach((u,c)=>{const l=n.get(c.key);s.has(c.key)&&(l===void 0||l.mutation instanceof xe)?i=i.insert(c.key,c):l!==void 0?(o.set(c.key,l.mutation.getFieldMask()),vn(l.mutation,c,l.mutation.getFieldMask(),k.now())):o.set(c.key,ue.empty())}),this.recalculateAndSaveOverlays(e,i).next(u=>(u.forEach((c,l)=>o.set(c,l)),t.forEach((c,l)=>a.set(c,new Xh(l,o.get(c)??null))),a))}recalculateAndSaveOverlays(e,t){const n=An();let s=new O((o,a)=>o-a),i=P();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(o=>{for(const a of o)a.keys().forEach(u=>{const c=t.get(u);if(c===null)return;let l=n.get(u)||ue.empty();l=a.applyToLocalView(c,l),n.set(u,l);const h=(s.get(a.batchId)||P()).add(u);s=s.insert(a.batchId,h)})}).next(()=>{const o=[],a=s.getReverseIterator();for(;a.hasNext();){const u=a.getNext(),c=u.key,l=u.value,h=lu();l.forEach(d=>{if(!i.has(d)){const _=yu(t.get(d),n.get(d));_!==null&&h.set(d,_),i=i.add(d)}}),o.push(this.documentOverlayCache.saveOverlays(e,c,h))}return f.waitFor(o)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.recalculateAndSaveOverlays(e,n))}getDocumentsMatchingQuery(e,t,n,s){return th(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):ei(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,s):this.getDocumentsMatchingCollectionQuery(e,t,n,s)}getNextDocuments(e,t,n,s){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,s).next(i=>{const o=s-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,s-i.size):f.resolve(we());let a=qt,u=i;return o.next(c=>f.forEach(c,(l,h)=>(a<h.largestBatchId&&(a=h.largestBatchId),i.get(l)?f.resolve():this.remoteDocumentCache.getEntry(e,l).next(d=>{u=u.insert(l,d)}))).next(()=>this.populateOverlays(e,c,i)).next(()=>this.computeViews(e,u,c,P())).next(l=>({batchId:a,changes:cu(l)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new y(t)).next(n=>{let s=_n();return n.isFoundDocument()&&(s=s.insert(n.key,n)),s})}getDocumentsMatchingCollectionGroupQuery(e,t,n,s){const i=t.collectionGroup;let o=_n();return this.indexManager.getCollectionParents(e,i).next(a=>f.forEach(a,u=>{const c=function(h,d){return new Et(d,null,h.explicitOrderBy.slice(),h.filters.slice(),h.limit,h.limitType,h.startAt,h.endAt)}(t,u.child(i));return this.getDocumentsMatchingCollectionQuery(e,c,n,s).next(l=>{l.forEach((h,d)=>{o=o.insert(h,d)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,t,n,s){let i;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next(o=>(i=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,i,s))).next(o=>{i.forEach((u,c)=>{const l=c.getKey();o.get(l)===null&&(o=o.insert(l,q.newInvalidDocument(l)))});let a=_n();return o.forEach((u,c)=>{const l=i.get(u);l!==void 0&&vn(l.mutation,c,ue.empty(),k.now()),Qn(t,c)&&(a=a.insert(u,c))}),a})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zh{constructor(e){this.serializer=e,this.Nr=new Map,this.Br=new Map}getBundleMetadata(e,t){return f.resolve(this.Nr.get(t))}saveBundleMetadata(e,t){return this.Nr.set(t.id,function(s){return{id:s.id,version:s.version,createTime:ee(s.createTime)}}(t)),f.resolve()}getNamedQuery(e,t){return f.resolve(this.Br.get(t))}saveNamedQuery(e,t){return this.Br.set(t.name,function(s){return{name:s.name,query:Ou(s.bundledQuery),readTime:ee(s.readTime)}}(t)),f.resolve()}}/**
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
 */class ed{constructor(){this.overlays=new O(y.comparator),this.Lr=new Map}getOverlay(e,t){return f.resolve(this.overlays.get(t))}getOverlays(e,t){const n=we();return f.forEach(t,s=>this.getOverlay(e,s).next(i=>{i!==null&&n.set(s,i)})).next(()=>n)}saveOverlays(e,t,n){return n.forEach((s,i)=>{this.bt(e,t,i)}),f.resolve()}removeOverlaysForBatchId(e,t,n){const s=this.Lr.get(n);return s!==void 0&&(s.forEach(i=>this.overlays=this.overlays.remove(i)),this.Lr.delete(n)),f.resolve()}getOverlaysForCollection(e,t,n){const s=we(),i=t.length+1,o=new y(t.child("")),a=this.overlays.getIteratorFrom(o);for(;a.hasNext();){const u=a.getNext().value,c=u.getKey();if(!t.isPrefixOf(c.path))break;c.path.length===i&&u.largestBatchId>n&&s.set(u.getKey(),u)}return f.resolve(s)}getOverlaysForCollectionGroup(e,t,n,s){let i=new O((c,l)=>c-l);const o=this.overlays.getIterator();for(;o.hasNext();){const c=o.getNext().value;if(c.getKey().getCollectionGroup()===t&&c.largestBatchId>n){let l=i.get(c.largestBatchId);l===null&&(l=we(),i=i.insert(c.largestBatchId,l)),l.set(c.getKey(),c)}}const a=we(),u=i.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach((c,l)=>a.set(c,l)),!(a.size()>=s)););return f.resolve(a)}bt(e,t,n){const s=this.overlays.get(n.key);if(s!==null){const o=this.Lr.get(s.largestBatchId).delete(n.key);this.Lr.set(s.largestBatchId,o)}this.overlays=this.overlays.insert(n.key,new oi(t,n));let i=this.Lr.get(t);i===void 0&&(i=P(),this.Lr.set(t,i)),this.Lr.set(t,i.add(n.key))}}/**
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
 */class td{constructor(){this.sessionToken=$.EMPTY_BYTE_STRING}getSessionToken(e){return f.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,f.resolve()}}/**
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
 */class di{constructor(){this.kr=new M(Y.Kr),this.qr=new M(Y.Ur)}isEmpty(){return this.kr.isEmpty()}addReference(e,t){const n=new Y(e,t);this.kr=this.kr.add(n),this.qr=this.qr.add(n)}$r(e,t){e.forEach(n=>this.addReference(n,t))}removeReference(e,t){this.Wr(new Y(e,t))}Qr(e,t){e.forEach(n=>this.removeReference(n,t))}Gr(e){const t=new y(new x([])),n=new Y(t,e),s=new Y(t,e+1),i=[];return this.qr.forEachInRange([n,s],o=>{this.Wr(o),i.push(o.key)}),i}zr(){this.kr.forEach(e=>this.Wr(e))}Wr(e){this.kr=this.kr.delete(e),this.qr=this.qr.delete(e)}jr(e){const t=new y(new x([])),n=new Y(t,e),s=new Y(t,e+1);let i=P();return this.qr.forEachInRange([n,s],o=>{i=i.add(o.key)}),i}containsKey(e){const t=new Y(e,0),n=this.kr.firstAfterOrEqual(t);return n!==null&&e.isEqual(n.key)}}class Y{constructor(e,t){this.key=e,this.Hr=t}static Kr(e,t){return y.comparator(e.key,t.key)||V(e.Hr,t.Hr)}static Ur(e,t){return V(e.Hr,t.Hr)||y.comparator(e.key,t.key)}}/**
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
 */class nd{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.Yn=1,this.Jr=new M(Y.Kr)}checkEmpty(e){return f.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,n,s){const i=this.Yn;this.Yn++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new si(i,t,n,s);this.mutationQueue.push(o);for(const a of s)this.Jr=this.Jr.add(new Y(a.key,i)),this.indexManager.addToCollectionParentIndex(e,a.key.path.popLast());return f.resolve(o)}lookupMutationBatch(e,t){return f.resolve(this.Zr(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,s=this.Xr(n),i=s<0?0:s;return f.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return f.resolve(this.mutationQueue.length===0?ct:this.Yn-1)}getAllMutationBatches(e){return f.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new Y(t,0),s=new Y(t,Number.POSITIVE_INFINITY),i=[];return this.Jr.forEachInRange([n,s],o=>{const a=this.Zr(o.Hr);i.push(a)}),f.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new M(V);return t.forEach(s=>{const i=new Y(s,0),o=new Y(s,Number.POSITIVE_INFINITY);this.Jr.forEachInRange([i,o],a=>{n=n.add(a.Hr)})}),f.resolve(this.Yr(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,s=n.length+1;let i=n;y.isDocumentKey(i)||(i=i.child(""));const o=new Y(new y(i),0);let a=new M(V);return this.Jr.forEachWhile(u=>{const c=u.key.path;return!!n.isPrefixOf(c)&&(c.length===s&&(a=a.add(u.Hr)),!0)},o),f.resolve(this.Yr(a))}Yr(e){const t=[];return e.forEach(n=>{const s=this.Zr(n);s!==null&&t.push(s)}),t}removeMutationBatch(e,t){v(this.ei(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let n=this.Jr;return f.forEach(t.mutations,s=>{const i=new Y(s.key,t.batchId);return n=n.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,s.key)}).next(()=>{this.Jr=n})}nr(e){}containsKey(e,t){const n=new Y(t,0),s=this.Jr.firstAfterOrEqual(n);return f.resolve(t.isEqual(s&&s.key))}performConsistencyCheck(e){return this.mutationQueue.length,f.resolve()}ei(e,t){return this.Xr(e)}Xr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Zr(e){const t=this.Xr(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
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
 */class rd{constructor(e){this.ti=e,this.docs=function(){return new O(y.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,s=this.docs.get(n),i=s?s.size:0,o=this.ti(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:o}),this.size+=o-i,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return f.resolve(n?n.document.mutableCopy():q.newInvalidDocument(t))}getEntries(e,t){let n=de();return t.forEach(s=>{const i=this.docs.get(s);n=n.insert(s,i?i.document.mutableCopy():q.newInvalidDocument(s))}),f.resolve(n)}getDocumentsMatchingQuery(e,t,n,s){let i=de();const o=t.path,a=new y(o.child("__id-9223372036854775808__")),u=this.docs.getIteratorFrom(a);for(;u.hasNext();){const{key:c,value:{document:l}}=u.getNext();if(!o.isPrefixOf(c.path))break;c.path.length>o.length+1||$s(Ra(l),n)<=0||(s.has(l.key)||Qn(t,l))&&(i=i.insert(l.key,l.mutableCopy()))}return f.resolve(i)}getAllFromCollectionGroup(e,t,n,s){T(9500)}ni(e,t){return f.forEach(this.docs,n=>t(n))}newChangeBuffer(e){return new sd(this)}getSize(e){return f.resolve(this.size)}}class sd extends Qu{constructor(e){super(),this.Mr=e}applyChanges(e){const t=[];return this.changes.forEach((n,s)=>{s.isValidDocument()?t.push(this.Mr.addEntry(e,s)):this.Mr.removeEntry(n)}),f.waitFor(t)}getFromCache(e,t){return this.Mr.getEntry(e,t)}getAllFromCache(e,t){return this.Mr.getEntries(e,t)}}/**
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
 */class id{constructor(e){this.persistence=e,this.ri=new De(t=>_t(t),$n),this.lastRemoteSnapshotVersion=R.min(),this.highestTargetId=0,this.ii=0,this.si=new di,this.targetCount=0,this.oi=yt._r()}forEachTarget(e,t){return this.ri.forEach((n,s)=>t(s)),f.resolve()}getLastRemoteSnapshotVersion(e){return f.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return f.resolve(this.ii)}allocateTargetId(e){return this.highestTargetId=this.oi.next(),f.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.ii&&(this.ii=t),f.resolve()}lr(e){this.ri.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.oi=new yt(t),this.highestTargetId=t),e.sequenceNumber>this.ii&&(this.ii=e.sequenceNumber)}addTargetData(e,t){return this.lr(t),this.targetCount+=1,f.resolve()}updateTargetData(e,t){return this.lr(t),f.resolve()}removeTargetData(e,t){return this.ri.delete(t.target),this.si.Gr(t.targetId),this.targetCount-=1,f.resolve()}removeTargets(e,t,n){let s=0;const i=[];return this.ri.forEach((o,a)=>{a.sequenceNumber<=t&&n.get(a.targetId)===null&&(this.ri.delete(o),i.push(this.removeMatchingKeysForTargetId(e,a.targetId)),s++)}),f.waitFor(i).next(()=>s)}getTargetCount(e){return f.resolve(this.targetCount)}getTargetData(e,t){const n=this.ri.get(t)||null;return f.resolve(n)}addMatchingKeys(e,t,n){return this.si.$r(t,n),f.resolve()}removeMatchingKeys(e,t,n){this.si.Qr(t,n);const s=this.persistence.referenceDelegate,i=[];return s&&t.forEach(o=>{i.push(s.markPotentiallyOrphaned(e,o))}),f.waitFor(i)}removeMatchingKeysForTargetId(e,t){return this.si.Gr(t),f.resolve()}getMatchingKeysForTargetId(e,t){const n=this.si.jr(t);return f.resolve(n)}containsKey(e,t){return f.resolve(this.si.containsKey(t))}}/**
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
 */class fi{constructor(e,t){this._i={},this.overlays={},this.ai=new ae(0),this.ui=!1,this.ui=!0,this.ci=new td,this.referenceDelegate=e(this),this.li=new id(this),this.indexManager=new Kh,this.remoteDocumentCache=function(s){return new rd(s)}(n=>this.referenceDelegate.hi(n)),this.serializer=new Fu(t),this.Pi=new Zh(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.ui=!1,Promise.resolve()}get started(){return this.ui}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new ed,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this._i[e.toKey()];return n||(n=new nd(t,this.referenceDelegate),this._i[e.toKey()]=n),n}getGlobalsCache(){return this.ci}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Pi}runTransaction(e,t,n){g("MemoryPersistence","Starting transaction:",e);const s=new od(this.ai.next());return this.referenceDelegate.Ti(),n(s).next(i=>this.referenceDelegate.Ii(s).next(()=>i)).toPromise().then(i=>(s.raiseOnCommittedEvent(),i))}Ei(e,t){return f.or(Object.values(this._i).map(n=>()=>n.containsKey(e,t)))}}class od extends Pa{constructor(e){super(),this.currentSequenceNumber=e}}class Jr{constructor(e){this.persistence=e,this.Ri=new di,this.Ai=null}static Vi(e){return new Jr(e)}get di(){if(this.Ai)return this.Ai;throw T(60996)}addReference(e,t,n){return this.Ri.addReference(n,t),this.di.delete(n.toString()),f.resolve()}removeReference(e,t,n){return this.Ri.removeReference(n,t),this.di.add(n.toString()),f.resolve()}markPotentiallyOrphaned(e,t){return this.di.add(t.toString()),f.resolve()}removeTarget(e,t){this.Ri.Gr(t.targetId).forEach(s=>this.di.add(s.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next(s=>{s.forEach(i=>this.di.add(i.toString()))}).next(()=>n.removeTargetData(e,t))}Ti(){this.Ai=new Set}Ii(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return f.forEach(this.di,n=>{const s=y.fromPath(n);return this.mi(e,s).next(i=>{i||t.removeEntry(s,R.min())})}).next(()=>(this.Ai=null,t.apply(e)))}updateLimboDocument(e,t){return this.mi(e,t).next(n=>{n?this.di.delete(t.toString()):this.di.add(t.toString())})}hi(e){return 0}mi(e,t){return f.or([()=>f.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ei(e,t)])}}class Cr{constructor(e,t){this.persistence=e,this.fi=new De(n=>ie(n.path),(n,s)=>n.isEqual(s)),this.garbageCollector=ju(this,t)}static Vi(e,t){return new Cr(e,t)}Ti(){}Ii(e){return f.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}dr(e){const t=this.pr(e);return this.persistence.getTargetCache().getTargetCount(e).next(n=>t.next(s=>n+s))}pr(e){let t=0;return this.mr(e,n=>{t++}).next(()=>t)}mr(e,t){return f.forEach(this.fi,(n,s)=>this.wr(e,n,s).next(i=>i?f.resolve():t(s)))}removeTargets(e,t,n){return this.persistence.getTargetCache().removeTargets(e,t,n)}removeOrphanedDocuments(e,t){let n=0;const s=this.persistence.getRemoteDocumentCache(),i=s.newChangeBuffer();return s.ni(e,o=>this.wr(e,o,t).next(a=>{a||(n++,i.removeEntry(o,R.min()))})).next(()=>i.apply(e)).next(()=>n)}markPotentiallyOrphaned(e,t){return this.fi.set(t,e.currentSequenceNumber),f.resolve()}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,n)}addReference(e,t,n){return this.fi.set(n,e.currentSequenceNumber),f.resolve()}removeReference(e,t,n){return this.fi.set(n,e.currentSequenceNumber),f.resolve()}updateLimboDocument(e,t){return this.fi.set(t,e.currentSequenceNumber),f.resolve()}hi(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=hr(e.data.value)),t}wr(e,t,n){return f.or([()=>this.persistence.Ei(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const s=this.fi.get(t);return f.resolve(s!==void 0&&s>n)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ad{constructor(e){this.serializer=e}k(e,t,n,s){const i=new Lr("createOrUpgrade",t);n<1&&s>=1&&(function(u){u.createObjectStore(Kn)}(e),function(u){u.createObjectStore(bn,{keyPath:gl}),u.createObjectStore(pe,{keyPath:no,autoIncrement:!0}).createIndex(at,ro,{unique:!0}),u.createObjectStore(Ut)}(e),Qo(e),function(u){u.createObjectStore(nt)}(e));let o=f.resolve();return n<3&&s>=3&&(n!==0&&(function(u){u.deleteObjectStore(zt),u.deleteObjectStore(Bt),u.deleteObjectStore(lt)}(e),Qo(e)),o=o.next(()=>function(u){const c=u.store(lt),l={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:R.min().toTimestamp(),targetCount:0};return c.put(wr,l)}(i))),n<4&&s>=4&&(n!==0&&(o=o.next(()=>function(u,c){return c.store(pe).H().next(h=>{u.deleteObjectStore(pe),u.createObjectStore(pe,{keyPath:no,autoIncrement:!0}).createIndex(at,ro,{unique:!0});const d=c.store(pe),_=h.map(I=>d.put(I));return f.waitFor(_)})}(e,i))),o=o.next(()=>{(function(u){u.createObjectStore(Gt,{keyPath:Rl})})(e)})),n<5&&s>=5&&(o=o.next(()=>this.gi(i))),n<6&&s>=6&&(o=o.next(()=>(function(u){u.createObjectStore(Cn)}(e),this.pi(i)))),n<7&&s>=7&&(o=o.next(()=>this.yi(i))),n<8&&s>=8&&(o=o.next(()=>this.wi(e,i))),n<9&&s>=9&&(o=o.next(()=>{(function(u){u.objectStoreNames.contains("remoteDocumentChanges")&&u.deleteObjectStore("remoteDocumentChanges")})(e)})),n<10&&s>=10&&(o=o.next(()=>this.bi(i))),n<11&&s>=11&&(o=o.next(()=>{(function(u){u.createObjectStore(qr,{keyPath:Vl})})(e),function(u){u.createObjectStore(Ur,{keyPath:Pl})}(e)})),n<12&&s>=12&&(o=o.next(()=>{(function(u){const c=u.createObjectStore(Br,{keyPath:kl});c.createIndex(ws,Fl,{unique:!1}),c.createIndex(Fa,Ml,{unique:!1})})(e)})),n<13&&s>=13&&(o=o.next(()=>function(u){const c=u.createObjectStore(Er,{keyPath:yl});c.createIndex(cr,Il),c.createIndex(Da,Tl)}(e)).next(()=>this.Si(e,i)).next(()=>e.deleteObjectStore(nt))),n<14&&s>=14&&(o=o.next(()=>this.Di(e,i))),n<15&&s>=15&&(o=o.next(()=>function(u){u.createObjectStore(Ws,{keyPath:Sl,autoIncrement:!0}).createIndex(Es,bl,{unique:!1}),u.createObjectStore(Tn,{keyPath:Cl}).createIndex(Na,Dl,{unique:!1}),u.createObjectStore(En,{keyPath:xl}).createIndex(ka,Nl,{unique:!1})}(e))),n<16&&s>=16&&(o=o.next(()=>{t.objectStore(Tn).clear()}).next(()=>{t.objectStore(En).clear()})),n<17&&s>=17&&(o=o.next(()=>{(function(u){u.createObjectStore(Hs,{keyPath:Ol})})(e)})),n<18&&s>=18&&Ia()&&(o=o.next(()=>{t.objectStore(Tn).clear()}).next(()=>{t.objectStore(En).clear()})),o}pi(e){let t=0;return e.store(nt).ee((n,s)=>{t+=br(s)}).next(()=>{const n={byteSize:t};return e.store(Cn).put(Ts,n)})}gi(e){const t=e.store(bn),n=e.store(pe);return t.H().next(s=>f.forEach(s,i=>{const o=IDBKeyRange.bound([i.userId,ct],[i.userId,i.lastAcknowledgedBatchId]);return n.H(at,o).next(a=>f.forEach(a,u=>{v(u.userId===i.userId,18650,"Cannot process batch from unexpected user",{batchId:u.batchId});const c=st(this.serializer,u);return Bu(e,i.userId,c).next(()=>{})}))}))}yi(e){const t=e.store(zt),n=e.store(nt);return e.store(lt).get(wr).next(s=>{const i=[];return n.ee((o,a)=>{const u=new x(o),c=function(h){return[0,ie(h)]}(u);i.push(t.get(c).next(l=>l?f.resolve():(h=>t.put({targetId:0,path:ie(h),sequenceNumber:s.highestListenSequenceNumber}))(u)))}).next(()=>f.waitFor(i))})}wi(e,t){e.createObjectStore(Dn,{keyPath:vl});const n=t.store(Dn),s=new hi,i=o=>{if(s.add(o)){const a=o.lastSegment(),u=o.popLast();return n.put({collectionId:a,parent:ie(u)})}};return t.store(nt).ee({Y:!0},(o,a)=>{const u=new x(o);return i(u.popLast())}).next(()=>t.store(Ut).ee({Y:!0},([o,a,u],c)=>{const l=Ee(a);return i(l.popLast())}))}bi(e){const t=e.store(Bt);return t.ee((n,s)=>{const i=pn(s),o=Mu(this.serializer,i);return t.put(o)})}Si(e,t){const n=t.store(nt),s=[];return n.ee((i,o)=>{const a=t.store(Er),u=function(h){return h.document?new y(x.fromString(h.document.name).popFirst(5)):h.noDocument?y.fromSegments(h.noDocument.path):h.unknownDocument?y.fromSegments(h.unknownDocument.path):T(36783)}(o).path.toArray(),c={prefixPath:u.slice(0,u.length-2),collectionGroup:u[u.length-2],documentId:u[u.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};s.push(a.put(c))}).next(()=>f.waitFor(s))}Di(e,t){const n=t.store(pe),s=Wu(this.serializer),i=new fi(Jr.Vi,this.serializer.yt);return n.H().next(o=>{const a=new Map;return o.forEach(u=>{let c=a.get(u.userId)??P();st(this.serializer,u).keys().forEach(l=>c=c.add(l)),a.set(u.userId,c)}),f.forEach(a,(u,c)=>{const l=new re(c),h=Wr.wt(this.serializer,l),d=i.getIndexManager(l),_=Hr.wt(l,this.serializer,d,i.referenceDelegate);return new Hu(s,_,h,d).recalculateAndSaveOverlaysForDocumentKeys(new As(t,ae.ce),u).next()})})}}function Qo(r){r.createObjectStore(zt,{keyPath:wl}).createIndex(Qs,Al,{unique:!0}),r.createObjectStore(Bt,{keyPath:"targetId"}).createIndex(xa,El,{unique:!0}),r.createObjectStore(lt)}const Me="IndexedDbPersistence",ls=18e5,hs=5e3,ds="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",ud="main";class mi{constructor(e,t,n,s,i,o,a,u,c,l,h=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.Ci=i,this.window=o,this.document=a,this.Fi=c,this.Mi=l,this.xi=h,this.ai=null,this.ui=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Oi=null,this.inForeground=!1,this.Ni=null,this.Bi=null,this.Li=Number.NEGATIVE_INFINITY,this.ki=d=>Promise.resolve(),!mi.v())throw new p(m.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new Hh(this,s),this.Ki=t+ud,this.serializer=new Fu(u),this.qi=new Be(this.Ki,this.xi,new ad(this.serializer)),this.ci=new Lh,this.li=new jh(this.referenceDelegate,this.serializer),this.remoteDocumentCache=Wu(this.serializer),this.Pi=new Oh,this.window&&this.window.localStorage?this.Ui=this.window.localStorage:(this.Ui=null,l===!1&&K(Me,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.$i().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new p(m.FAILED_PRECONDITION,ds);return this.Wi(),this.Qi(),this.Gi(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.li.getHighestSequenceNumber(e))}).then(e=>{this.ai=new ae(e,this.Fi)}).then(()=>{this.ui=!0}).catch(e=>(this.qi&&this.qi.close(),Promise.reject(e)))}zi(e){return this.ki=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.qi.q(async t=>{t.newVersion===null&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Ci.enqueueAndForget(async()=>{this.started&&await this.$i()}))}$i(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>ir(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.ji(e).next(t=>{t||(this.isPrimary=!1,this.Ci.enqueueRetryable(()=>this.ki(!1)))})}).next(()=>this.Hi(e)).next(t=>this.isPrimary&&!t?this.Ji(e).next(()=>!1):!!t&&this.Zi(e).next(()=>!0))).catch(e=>{if(Je(e))return g(Me,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return g(Me,"Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.Ci.enqueueRetryable(()=>this.ki(e)),this.isPrimary=e})}ji(e){return fn(e).get(vt).next(t=>f.resolve(this.Xi(t)))}Yi(e){return ir(e).delete(this.clientId)}async es(){if(this.isPrimary&&!this.ts(this.Li,ls)){this.Li=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",t=>{const n=H(t,Gt);return n.H().next(s=>{const i=this.ns(s,ls),o=s.filter(a=>i.indexOf(a)===-1);return f.forEach(o,a=>n.delete(a.clientId)).next(()=>o)})}).catch(()=>[]);if(this.Ui)for(const t of e)this.Ui.removeItem(this.rs(t.clientId))}}Gi(){this.Bi=this.Ci.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.$i().then(()=>this.es()).then(()=>this.Gi()))}Xi(e){return!!e&&e.ownerId===this.clientId}Hi(e){return this.Mi?f.resolve(!0):fn(e).get(vt).next(t=>{if(t!==null&&this.ts(t.leaseTimestampMs,hs)&&!this.ss(t.ownerId)){if(this.Xi(t)&&this.networkEnabled)return!0;if(!this.Xi(t)){if(!t.allowTabSynchronization)throw new p(m.FAILED_PRECONDITION,ds);return!1}}return!(!this.networkEnabled||!this.inForeground)||ir(e).H().next(n=>this.ns(n,hs).find(s=>{if(this.clientId!==s.clientId){const i=!this.networkEnabled&&s.networkEnabled,o=!this.inForeground&&s.inForeground,a=this.networkEnabled===s.networkEnabled;if(i||o&&a)return!0}return!1})===void 0)}).next(t=>(this.isPrimary!==t&&g(Me,`Client ${t?"is":"is not"} eligible for a primary lease.`),t))}async shutdown(){this.ui=!1,this._s(),this.Bi&&(this.Bi.cancel(),this.Bi=null),this.us(),this.cs(),await this.qi.runTransaction("shutdown","readwrite",[Kn,Gt],e=>{const t=new As(e,ae.ce);return this.Ji(t).next(()=>this.Yi(t))}),this.qi.close(),this.ls()}ns(e,t){return e.filter(n=>this.ts(n.updateTimeMs,t)&&!this.ss(n.clientId))}hs(){return this.runTransaction("getActiveClients","readonly",e=>ir(e).H().next(t=>this.ns(t,ls).map(n=>n.clientId)))}get started(){return this.ui}getGlobalsCache(){return this.ci}getMutationQueue(e,t){return Hr.wt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new $h(e,this.serializer.yt.databaseId)}getDocumentOverlayCache(e){return Wr.wt(this.serializer,e)}getBundleCache(){return this.Pi}runTransaction(e,t,n){g(Me,"Starting transaction:",e);const s=t==="readonly"?"readonly":"readwrite",i=function(u){return u===18?Ul:u===17?qa:u===16?ql:u===15?Js:u===14?La:u===13?Oa:u===12?Ll:u===11?Ma:void T(60245)}(this.xi);let o;return this.qi.runTransaction(e,s,i,a=>(o=new As(a,this.ai?this.ai.next():ae.ce),t==="readwrite-primary"?this.ji(o).next(u=>!!u||this.Hi(o)).next(u=>{if(!u)throw K(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Ci.enqueueRetryable(()=>this.ki(!1)),new p(m.FAILED_PRECONDITION,Va);return n(o)}).next(u=>this.Zi(o).next(()=>u)):this.Ps(o).next(()=>n(o)))).then(a=>(o.raiseOnCommittedEvent(),a))}Ps(e){return fn(e).get(vt).next(t=>{if(t!==null&&this.ts(t.leaseTimestampMs,hs)&&!this.ss(t.ownerId)&&!this.Xi(t)&&!(this.Mi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new p(m.FAILED_PRECONDITION,ds)})}Zi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return fn(e).put(vt,t)}static v(){return Be.v()}Ji(e){const t=fn(e);return t.get(vt).next(n=>this.Xi(n)?(g(Me,"Releasing primary lease."),t.delete(vt)):f.resolve())}ts(e,t){const n=Date.now();return!(e<n-t)&&(!(e>n)||(K(`Detected an update time that is in the future: ${e} > ${n}`),!1))}Wi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Ni=()=>{this.Ci.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.$i()))},this.document.addEventListener("visibilitychange",this.Ni),this.inForeground=this.document.visibilityState==="visible")}us(){this.Ni&&(this.document.removeEventListener("visibilitychange",this.Ni),this.Ni=null)}Qi(){var e;typeof((e=this.window)==null?void 0:e.addEventListener)=="function"&&(this.Oi=()=>{this._s();const t=/(?:Version|Mobile)\/1[456]/;ya()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.Ci.enterRestrictedMode(!0),this.Ci.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Oi))}cs(){this.Oi&&(this.window.removeEventListener("pagehide",this.Oi),this.Oi=null)}ss(e){var t;try{const n=((t=this.Ui)==null?void 0:t.getItem(this.rs(e)))!==null;return g(Me,`Client '${e}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(n){return K(Me,"Failed to get zombied client id.",n),!1}}_s(){if(this.Ui)try{this.Ui.setItem(this.rs(this.clientId),String(Date.now()))}catch(e){K("Failed to set zombie client id.",e)}}ls(){if(this.Ui)try{this.Ui.removeItem(this.rs(this.clientId))}catch{}}rs(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function fn(r){return H(r,Kn)}function ir(r){return H(r,Gt)}function Ju(r,e){let t=r.projectId;return r.isDefaultDatabase||(t+="."+r.database),"firestore/"+e+"/"+t+"/"}/**
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
 */class _i{constructor(e,t,n,s){this.targetId=e,this.fromCache=t,this.Ts=n,this.Is=s}static Es(e,t){let n=P(),s=P();for(const i of t.docChanges)switch(i.type){case 0:n=n.add(i.doc.key);break;case 1:s=s.add(i.doc.key)}return new _i(e,t.fromCache,n,s)}}/**
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
 */class cd{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class Yu{constructor(){this.Rs=!1,this.As=!1,this.Vs=100,this.ds=function(){return ya()?8:Sa(yr())>0?6:4}()}initialize(e,t){this.fs=e,this.indexManager=t,this.Rs=!0}getDocumentsMatchingQuery(e,t,n,s){const i={result:null};return this.gs(e,t).next(o=>{i.result=o}).next(()=>{if(!i.result)return this.ps(e,t,s,n).next(o=>{i.result=o})}).next(()=>{if(i.result)return;const o=new cd;return this.ys(e,t,o).next(a=>{if(i.result=a,this.As)return this.ws(e,t,o,a.size)})}).next(()=>i.result)}ws(e,t,n,s){return n.documentReadCount<this.Vs?(Ct()<=Ve.DEBUG&&g("QueryEngine","SDK will not create cache indexes for query:",Dt(t),"since it only creates cache indexes for collection contains","more than or equal to",this.Vs,"documents"),f.resolve()):(Ct()<=Ve.DEBUG&&g("QueryEngine","Query:",Dt(t),"scans",n.documentReadCount,"local documents and returns",s,"documents as results."),n.documentReadCount>this.ds*s?(Ct()<=Ve.DEBUG&&g("QueryEngine","The SDK decides to create cache indexes for query:",Dt(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,fe(t))):f.resolve())}gs(e,t){if(po(t))return f.resolve(null);let n=fe(t);return this.indexManager.getIndexType(e,n).next(s=>s===0?null:(t.limit!==null&&s===1&&(t=Vr(t,null,"F"),n=fe(t)),this.indexManager.getDocumentsMatchingTarget(e,n).next(i=>{const o=P(...i);return this.fs.getDocuments(e,o).next(a=>this.indexManager.getMinOffset(e,n).next(u=>{const c=this.bs(t,a);return this.Ss(t,c,o,u.readTime)?this.gs(e,Vr(t,null,"F")):this.Ds(e,c,t,u)}))})))}ps(e,t,n,s){return po(t)||s.isEqual(R.min())?f.resolve(null):this.fs.getDocuments(e,n).next(i=>{const o=this.bs(t,i);return this.Ss(t,o,n,s)?f.resolve(null):(Ct()<=Ve.DEBUG&&g("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),Dt(t)),this.Ds(e,o,t,va(s,qt)).next(a=>a))})}bs(e,t){let n=new M(au(e));return t.forEach((s,i)=>{Qn(e,i)&&(n=n.add(i))}),n}Ss(e,t,n,s){if(e.limit===null)return!1;if(n.size!==t.size)return!0;const i=e.limitType==="F"?t.last():t.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(s)>0)}ys(e,t,n){return Ct()<=Ve.DEBUG&&g("QueryEngine","Using full collection scan to execute query:",Dt(t)),this.fs.getDocumentsMatchingQuery(e,t,me.min(),n)}Ds(e,t,n,s){return this.fs.getDocumentsMatchingQuery(e,n,s).next(i=>(t.forEach(o=>{i=i.insert(o.key,o)}),i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gi="LocalStore",ld=3e8;class hd{constructor(e,t,n,s){this.persistence=e,this.Cs=t,this.serializer=s,this.vs=new O(V),this.Fs=new De(i=>_t(i),$n),this.Ms=new Map,this.xs=e.getRemoteDocumentCache(),this.li=e.getTargetCache(),this.Pi=e.getBundleCache(),this.Os(n)}Os(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new Hu(this.xs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.xs.setIndexManager(this.indexManager),this.Cs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.vs))}}function Xu(r,e,t,n){return new hd(r,e,t,n)}async function Zu(r,e){const t=w(r);return await t.persistence.runTransaction("Handle user change","readonly",n=>{let s;return t.mutationQueue.getAllMutationBatches(n).next(i=>(s=i,t.Os(e),t.mutationQueue.getAllMutationBatches(n))).next(i=>{const o=[],a=[];let u=P();for(const c of s){o.push(c.batchId);for(const l of c.mutations)u=u.add(l.key)}for(const c of i){a.push(c.batchId);for(const l of c.mutations)u=u.add(l.key)}return t.localDocuments.getDocuments(n,u).next(c=>({Ns:c,removedBatchIds:o,addedBatchIds:a}))})})}function dd(r,e){const t=w(r);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",n=>{const s=e.batch.keys(),i=t.xs.newChangeBuffer({trackRemovals:!0});return function(a,u,c,l){const h=c.batch,d=h.keys();let _=f.resolve();return d.forEach(I=>{_=_.next(()=>l.getEntry(u,I)).next(E=>{const A=c.docVersions.get(I);v(A!==null,48541),E.version.compareTo(A)<0&&(h.applyToRemoteDocument(E,c),E.isValidDocument()&&(E.setReadTime(c.commitVersion),l.addEntry(E)))})}),_.next(()=>a.mutationQueue.removeMutationBatch(u,h))}(t,n,e,i).next(()=>i.apply(n)).next(()=>t.mutationQueue.performConsistencyCheck(n)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(n,s,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,function(a){let u=P();for(let c=0;c<a.mutationResults.length;++c)a.mutationResults[c].transformResults.length>0&&(u=u.add(a.batch.mutations[c].key));return u}(e))).next(()=>t.localDocuments.getDocuments(n,s))})}function ec(r){const e=w(r);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.li.getLastRemoteSnapshotVersion(t))}function fd(r,e){const t=w(r),n=e.snapshotVersion;let s=t.vs;return t.persistence.runTransaction("Apply remote event","readwrite-primary",i=>{const o=t.xs.newChangeBuffer({trackRemovals:!0});s=t.vs;const a=[];e.targetChanges.forEach((l,h)=>{const d=s.get(h);if(!d)return;a.push(t.li.removeMatchingKeys(i,l.removedDocuments,h).next(()=>t.li.addMatchingKeys(i,l.addedDocuments,h)));let _=d.withSequenceNumber(i.currentSequenceNumber);e.targetMismatches.get(h)!==null?_=_.withResumeToken($.EMPTY_BYTE_STRING,R.min()).withLastLimboFreeSnapshotVersion(R.min()):l.resumeToken.approximateByteSize()>0&&(_=_.withResumeToken(l.resumeToken,n)),s=s.insert(h,_),function(E,A,N){return E.resumeToken.approximateByteSize()===0||A.snapshotVersion.toMicroseconds()-E.snapshotVersion.toMicroseconds()>=ld?!0:N.addedDocuments.size+N.modifiedDocuments.size+N.removedDocuments.size>0}(d,_,l)&&a.push(t.li.updateTargetData(i,_))});let u=de(),c=P();if(e.documentUpdates.forEach(l=>{e.resolvedLimboDocuments.has(l)&&a.push(t.persistence.referenceDelegate.updateLimboDocument(i,l))}),a.push(md(i,o,e.documentUpdates).next(l=>{u=l.Bs,c=l.Ls})),!n.isEqual(R.min())){const l=t.li.getLastRemoteSnapshotVersion(i).next(h=>t.li.setTargetsMetadata(i,i.currentSequenceNumber,n));a.push(l)}return f.waitFor(a).next(()=>o.apply(i)).next(()=>t.localDocuments.getLocalViewOfDocuments(i,u,c)).next(()=>u)}).then(i=>(t.vs=s,i))}function md(r,e,t){let n=P(),s=P();return t.forEach(i=>n=n.add(i)),e.getEntries(r,n).next(i=>{let o=de();return t.forEach((a,u)=>{const c=i.get(a);u.isFoundDocument()!==c.isFoundDocument()&&(s=s.add(a)),u.isNoDocument()&&u.version.isEqual(R.min())?(e.removeEntry(a,u.readTime),o=o.insert(a,u)):!c.isValidDocument()||u.version.compareTo(c.version)>0||u.version.compareTo(c.version)===0&&c.hasPendingWrites?(e.addEntry(u),o=o.insert(a,u)):g(gi,"Ignoring outdated watch update for ",a,". Current version:",c.version," Watch version:",u.version)}),{Bs:o,Ls:s}})}function _d(r,e){const t=w(r);return t.persistence.runTransaction("Get next mutation batch","readonly",n=>(e===void 0&&(e=ct),t.mutationQueue.getNextMutationBatchAfterBatchId(n,e)))}function Dr(r,e){const t=w(r);return t.persistence.runTransaction("Allocate target","readwrite",n=>{let s;return t.li.getTargetData(n,e).next(i=>i?(s=i,f.resolve(s)):t.li.allocateTargetId(n).next(o=>(s=new Pe(e,o,"TargetPurposeListen",n.currentSequenceNumber),t.li.addTargetData(n,s).next(()=>s))))}).then(n=>{const s=t.vs.get(n.targetId);return(s===null||n.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(t.vs=t.vs.insert(n.targetId,n),t.Fs.set(e,n.targetId)),n})}async function Yt(r,e,t){const n=w(r),s=n.vs.get(e),i=t?"readwrite":"readwrite-primary";try{t||await n.persistence.runTransaction("Release target",i,o=>n.persistence.referenceDelegate.removeTarget(o,s))}catch(o){if(!Je(o))throw o;g(gi,`Failed to update sequence numbers for target ${e}: ${o}`)}n.vs=n.vs.remove(e),n.Fs.delete(s.target)}function Os(r,e,t){const n=w(r);let s=R.min(),i=P();return n.persistence.runTransaction("Execute query","readwrite",o=>function(u,c,l){const h=w(u),d=h.Fs.get(l);return d!==void 0?f.resolve(h.vs.get(d)):h.li.getTargetData(c,l)}(n,o,fe(e)).next(a=>{if(a)return s=a.lastLimboFreeSnapshotVersion,n.li.getMatchingKeysForTargetId(o,a.targetId).next(u=>{i=u})}).next(()=>n.Cs.getDocumentsMatchingQuery(o,e,t?s:R.min(),t?i:P())).next(a=>(rc(n,ou(e),a),{documents:a,ks:i})))}function tc(r,e){const t=w(r),n=w(t.li),s=t.vs.get(e);return s?Promise.resolve(s.target):t.persistence.runTransaction("Get target data","readonly",i=>n.At(i,e).next(o=>o?o.target:null))}function nc(r,e){const t=w(r),n=t.Ms.get(e)||R.min();return t.persistence.runTransaction("Get new document changes","readonly",s=>t.xs.getAllFromCollectionGroup(s,e,va(n,qt),Number.MAX_SAFE_INTEGER)).then(s=>(rc(t,e,s),s))}function rc(r,e,t){let n=r.Ms.get(e)||R.min();t.forEach((s,i)=>{i.readTime.compareTo(n)>0&&(n=i.readTime)}),r.Ms.set(e,n)}/**
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
 */const sc="firestore_clients";function Wo(r,e){return`${sc}_${r}_${e}`}const ic="firestore_mutations";function Ho(r,e,t){let n=`${ic}_${r}_${t}`;return e.isAuthenticated()&&(n+=`_${e.uid}`),n}const oc="firestore_targets";function fs(r,e){return`${oc}_${r}_${e}`}/**
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
 */const Te="SharedClientState";class xr{constructor(e,t,n,s){this.user=e,this.batchId=t,this.state=n,this.error=s}static $s(e,t,n){const s=JSON.parse(n);let i,o=typeof s=="object"&&["pending","acknowledged","rejected"].indexOf(s.state)!==-1&&(s.error===void 0||typeof s.error=="object");return o&&s.error&&(o=typeof s.error.message=="string"&&typeof s.error.code=="string",o&&(i=new p(s.error.code,s.error.message))),o?new xr(e,t,s.state,i):(K(Te,`Failed to parse mutation state for ID '${t}': ${n}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Rn{constructor(e,t,n){this.targetId=e,this.state=t,this.error=n}static $s(e,t){const n=JSON.parse(t);let s,i=typeof n=="object"&&["not-current","current","rejected"].indexOf(n.state)!==-1&&(n.error===void 0||typeof n.error=="object");return i&&n.error&&(i=typeof n.error.message=="string"&&typeof n.error.code=="string",i&&(s=new p(n.error.code,n.error.message))),i?new Rn(e,n.state,s):(K(Te,`Failed to parse target state for ID '${e}': ${t}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Nr{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static $s(e,t){const n=JSON.parse(t);let s=typeof n=="object"&&n.activeTargetIds instanceof Array,i=ti();for(let o=0;s&&o<n.activeTargetIds.length;++o)s=ba(n.activeTargetIds[o]),i=i.add(n.activeTargetIds[o]);return s?new Nr(e,i):(K(Te,`Failed to parse client data for instance '${e}': ${t}`),null)}}class pi{constructor(e,t){this.clientId=e,this.onlineState=t}static $s(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new pi(t.clientId,t.onlineState):(K(Te,`Failed to parse online state: ${e}`),null)}}class Ls{constructor(){this.activeTargetIds=ti()}Qs(e){this.activeTargetIds=this.activeTargetIds.add(e)}Gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Ws(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class ms{constructor(e,t,n,s,i){this.window=e,this.Ci=t,this.persistenceKey=n,this.zs=s,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.js=this.Hs.bind(this),this.Js=new O(V),this.started=!1,this.Zs=[];const o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=i,this.Xs=Wo(this.persistenceKey,this.zs),this.Ys=function(u){return`firestore_sequence_number_${u}`}(this.persistenceKey),this.Js=this.Js.insert(this.zs,new Ls),this.eo=new RegExp(`^${sc}_${o}_([^_]*)$`),this.no=new RegExp(`^${ic}_${o}_(\\d+)(?:_(.*))?$`),this.ro=new RegExp(`^${oc}_${o}_(\\d+)$`),this.io=function(u){return`firestore_online_state_${u}`}(this.persistenceKey),this.so=function(u){return`firestore_bundle_loaded_v2_${u}`}(this.persistenceKey),this.window.addEventListener("storage",this.js)}static v(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.hs();for(const n of e){if(n===this.zs)continue;const s=this.getItem(Wo(this.persistenceKey,n));if(s){const i=Nr.$s(n,s);i&&(this.Js=this.Js.insert(i.clientId,i))}}this.oo();const t=this.storage.getItem(this.io);if(t){const n=this._o(t);n&&this.ao(n)}for(const n of this.Zs)this.Hs(n);this.Zs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.Ys,JSON.stringify(e))}getAllActiveQueryTargets(){return this.uo(this.Js)}isActiveQueryTarget(e){let t=!1;return this.Js.forEach((n,s)=>{s.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.co(e,"pending")}updateMutationState(e,t,n){this.co(e,t,n),this.lo(e)}addLocalQueryTarget(e,t=!0){let n="not-current";if(this.isActiveQueryTarget(e)){const s=this.storage.getItem(fs(this.persistenceKey,e));if(s){const i=Rn.$s(e,s);i&&(n=i.state)}}return t&&this.ho.Qs(e),this.oo(),n}removeLocalQueryTarget(e){this.ho.Gs(e),this.oo()}isLocalQueryTarget(e){return this.ho.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(fs(this.persistenceKey,e))}updateQueryState(e,t,n){this.Po(e,t,n)}handleUserChange(e,t,n){t.forEach(s=>{this.lo(s)}),this.currentUser=e,n.forEach(s=>{this.addPendingMutation(s)})}setOnlineState(e){this.To(e)}notifyBundleLoaded(e){this.Io(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.js),this.removeItem(this.Xs),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return g(Te,"READ",e,t),t}setItem(e,t){g(Te,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){g(Te,"REMOVE",e),this.storage.removeItem(e)}Hs(e){const t=e;if(t.storageArea===this.storage){if(g(Te,"EVENT",t.key,t.newValue),t.key===this.Xs)return void K("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Ci.enqueueRetryable(async()=>{if(this.started){if(t.key!==null){if(this.eo.test(t.key)){if(t.newValue==null){const n=this.Eo(t.key);return this.Ro(n,null)}{const n=this.Ao(t.key,t.newValue);if(n)return this.Ro(n.clientId,n)}}else if(this.no.test(t.key)){if(t.newValue!==null){const n=this.Vo(t.key,t.newValue);if(n)return this.mo(n)}}else if(this.ro.test(t.key)){if(t.newValue!==null){const n=this.fo(t.key,t.newValue);if(n)return this.po(n)}}else if(t.key===this.io){if(t.newValue!==null){const n=this._o(t.newValue);if(n)return this.ao(n)}}else if(t.key===this.Ys){const n=function(i){let o=ae.ce;if(i!=null)try{const a=JSON.parse(i);v(typeof a=="number",30636,{yo:i}),o=a}catch(a){K(Te,"Failed to read sequence number from WebStorage",a)}return o}(t.newValue);n!==ae.ce&&this.sequenceNumberHandler(n)}else if(t.key===this.so){const n=this.wo(t.newValue);await Promise.all(n.map(s=>this.syncEngine.bo(s)))}}}else this.Zs.push(t)})}}get ho(){return this.Js.get(this.zs)}oo(){this.setItem(this.Xs,this.ho.Ws())}co(e,t,n){const s=new xr(this.currentUser,e,t,n),i=Ho(this.persistenceKey,this.currentUser,e);this.setItem(i,s.Ws())}lo(e){const t=Ho(this.persistenceKey,this.currentUser,e);this.removeItem(t)}To(e){const t={clientId:this.zs,onlineState:e};this.storage.setItem(this.io,JSON.stringify(t))}Po(e,t,n){const s=fs(this.persistenceKey,e),i=new Rn(e,t,n);this.setItem(s,i.Ws())}Io(e){const t=JSON.stringify(Array.from(e));this.setItem(this.so,t)}Eo(e){const t=this.eo.exec(e);return t?t[1]:null}Ao(e,t){const n=this.Eo(e);return Nr.$s(n,t)}Vo(e,t){const n=this.no.exec(e),s=Number(n[1]),i=n[2]!==void 0?n[2]:null;return xr.$s(new re(i),s,t)}fo(e,t){const n=this.ro.exec(e),s=Number(n[1]);return Rn.$s(s,t)}_o(e){return pi.$s(e)}wo(e){return JSON.parse(e)}async mo(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.So(e.batchId,e.state,e.error);g(Te,`Ignoring mutation for non-active user ${e.user.uid}`)}po(e){return this.syncEngine.Do(e.targetId,e.state,e.error)}Ro(e,t){const n=t?this.Js.insert(e,t):this.Js.remove(e),s=this.uo(this.Js),i=this.uo(n),o=[],a=[];return i.forEach(u=>{s.has(u)||o.push(u)}),s.forEach(u=>{i.has(u)||a.push(u)}),this.syncEngine.Co(o,a).then(()=>{this.Js=n})}ao(e){this.Js.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}uo(e){let t=ti();return e.forEach((n,s)=>{t=t.unionWith(s.activeTargetIds)}),t}}class ac{constructor(){this.vo=new Ls,this.Fo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e,t=!0){return t&&this.vo.Qs(e),this.Fo[e]||"not-current"}updateQueryState(e,t,n){this.Fo[e]=t}removeLocalQueryTarget(e){this.vo.Gs(e)}isLocalQueryTarget(e){return this.vo.activeTargetIds.has(e)}clearQueryState(e){delete this.Fo[e]}getAllActiveQueryTargets(){return this.vo.activeTargetIds}isActiveQueryTarget(e){return this.vo.activeTargetIds.has(e)}start(){return this.vo=new Ls,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class gd{Mo(e){}shutdown(){}}/**
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
 */const Jo="ConnectivityMonitor";class Yo{constructor(){this.xo=()=>this.Oo(),this.No=()=>this.Bo(),this.Lo=[],this.ko()}Mo(e){this.Lo.push(e)}shutdown(){window.removeEventListener("online",this.xo),window.removeEventListener("offline",this.No)}ko(){window.addEventListener("online",this.xo),window.addEventListener("offline",this.No)}Oo(){g(Jo,"Network connectivity changed: AVAILABLE");for(const e of this.Lo)e(0)}Bo(){g(Jo,"Network connectivity changed: UNAVAILABLE");for(const e of this.Lo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let or=null;function qs(){return or===null?or=function(){return 268435456+Math.round(2147483648*Math.random())}():or++,"0x"+or.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _s="RestConnection",pd={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery",ExecutePipeline:"executePipeline"};class yd{get Ko(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.qo=t+"://"+e.host,this.Uo=`projects/${n}/databases/${s}`,this.$o=this.databaseId.database===Ar?`project_id=${n}`:`project_id=${n}&database_id=${s}`}Wo(e,t,n,s,i){const o=qs(),a=this.Qo(e,t.toUriEncodedString());g(_s,`Sending RPC '${e}' ${o}:`,a,n);const u={"google-cloud-resource-prefix":this.Uo,"x-goog-request-params":this.$o};this.Go(u,s,i);const{host:c}=new URL(a),l=pa(c);return this.zo(e,a,u,n,l).then(h=>(g(_s,`Received RPC '${e}' ${o}: `,h),h),h=>{throw Vn(_s,`RPC '${e}' ${o} failed with error: `,h,"url: ",a,"request:",n),h})}jo(e,t,n,s,i,o){return this.Wo(e,t,n,s,i)}Go(e,t,n){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+tn}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((s,i)=>e[i]=s),n&&n.headers.forEach((s,i)=>e[i]=s)}Qo(e,t){const n=pd[e];let s=`${this.qo}/v1/${t}:${n}`;return this.databaseInfo.apiKey&&(s=`${s}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`),s}terminate(){}}/**
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
 */class Id{constructor(e){this.Ho=e.Ho,this.Jo=e.Jo}Zo(e){this.Xo=e}Yo(e){this.e_=e}t_(e){this.n_=e}onMessage(e){this.r_=e}close(){this.Jo()}send(e){this.Ho(e)}i_(){this.Xo()}s_(){this.e_()}o_(e){this.n_(e)}__(e){this.r_(e)}}/**
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
 */const ne="WebChannelConnection",mn=(r,e,t)=>{r.listen(e,n=>{try{t(n)}catch(s){setTimeout(()=>{throw s},0)}})};class Mt extends yd{constructor(e){super(e),this.a_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}static u_(){if(!Mt.c_){const e=Bc();mn(e,zc.STAT_EVENT,t=>{t.stat===Qi.PROXY?g(ne,"STAT_EVENT: detected buffering proxy"):t.stat===Qi.NOPROXY&&g(ne,"STAT_EVENT: detected no buffering proxy")}),Mt.c_=!0}}zo(e,t,n,s,i){const o=qs();return new Promise((a,u)=>{const c=new Gc;c.setWithCredentials(!0),c.listenOnce(Kc.COMPLETE,()=>{try{switch(c.getLastErrorCode()){case as.NO_ERROR:const h=c.getResponseJson();g(ne,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(h)),a(h);break;case as.TIMEOUT:g(ne,`RPC '${e}' ${o} timed out`),u(new p(m.DEADLINE_EXCEEDED,"Request time out"));break;case as.HTTP_ERROR:const d=c.getStatus();if(g(ne,`RPC '${e}' ${o} failed with status:`,d,"response text:",c.getResponseText()),d>0){let _=c.getResponseJson();Array.isArray(_)&&(_=_[0]);const I=_==null?void 0:_.error;if(I&&I.status&&I.message){const E=function(N){const b=N.toLowerCase().replace(/_/g,"-");return Object.values(m).indexOf(b)>=0?b:m.UNKNOWN}(I.status);u(new p(E,I.message))}else u(new p(m.UNKNOWN,"Server responded with status "+c.getStatus()))}else u(new p(m.UNAVAILABLE,"Connection failed."));break;default:T(9055,{l_:e,streamId:o,h_:c.getLastErrorCode(),P_:c.getLastError()})}}finally{g(ne,`RPC '${e}' ${o} completed.`)}});const l=JSON.stringify(s);g(ne,`RPC '${e}' ${o} sending request:`,s),c.send(t,"POST",l,n,15)})}T_(e,t,n){const s=qs(),i=[this.qo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=this.createWebChannelTransport(),a={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(a.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(a.useFetchStreams=!0),this.Go(a.initMessageHeaders,t,n),a.encodeInitMessageHeaders=!0;const c=i.join("");g(ne,`Creating RPC '${e}' stream ${s}: ${c}`,a);const l=o.createWebChannel(c,a);this.I_(l);let h=!1,d=!1;const _=new Id({Ho:I=>{d?g(ne,`Not sending because RPC '${e}' stream ${s} is closed:`,I):(h||(g(ne,`Opening RPC '${e}' stream ${s} transport.`),l.open(),h=!0),g(ne,`RPC '${e}' stream ${s} sending:`,I),l.send(I))},Jo:()=>l.close()});return mn(l,er.EventType.OPEN,()=>{d||(g(ne,`RPC '${e}' stream ${s} transport opened.`),_.i_())}),mn(l,er.EventType.CLOSE,()=>{d||(d=!0,g(ne,`RPC '${e}' stream ${s} transport closed`),_.o_(),this.E_(l))}),mn(l,er.EventType.ERROR,I=>{d||(d=!0,Vn(ne,`RPC '${e}' stream ${s} transport errored. Name:`,I.name,"Message:",I.message),_.o_(new p(m.UNAVAILABLE,"The operation could not be completed")))}),mn(l,er.EventType.MESSAGE,I=>{var E;if(!d){const A=I.data[0];v(!!A,16349);const N=A,b=(N==null?void 0:N.error)||((E=N[0])==null?void 0:E.error);if(b){g(ne,`RPC '${e}' stream ${s} received error:`,b);const C=b.status;let J=function(oe){const Ne=j[oe];if(Ne!==void 0)return Eu(Ne)}(C),G=b.message;J===void 0&&(J=m.INTERNAL,G="Unknown error status: "+C+" with message "+b.message),d=!0,_.o_(new p(J,G)),l.close()}else g(ne,`RPC '${e}' stream ${s} received:`,A),_.__(A)}}),Mt.u_(),setTimeout(()=>{_.s_()},0),_}terminate(){this.a_.forEach(e=>e.close()),this.a_=[]}I_(e){this.a_.push(e)}E_(e){this.a_=this.a_.filter(t=>t===e)}Go(e,t,n){super.Go(e,t,n),this.databaseInfo.apiKey&&(e["x-goog-api-key"]=this.databaseInfo.apiKey)}createWebChannelTransport(){return $c()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Td(r){return new Mt(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function uc(){return typeof window<"u"?window:null}function gr(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yr(r){return new vh(r,!0)}/**
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
 */Mt.c_=!1;class yi{constructor(e,t,n=1e3,s=1.5,i=6e4){this.Ci=e,this.timerId=t,this.R_=n,this.A_=s,this.V_=i,this.d_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.d_=0}g_(){this.d_=this.V_}p_(e){this.cancel();const t=Math.floor(this.d_+this.y_()),n=Math.max(0,Date.now()-this.f_),s=Math.max(0,t-n);s>0&&g("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.d_} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.m_=this.Ci.enqueueAfterDelay(this.timerId,s,()=>(this.f_=Date.now(),e())),this.d_*=this.A_,this.d_<this.R_&&(this.d_=this.R_),this.d_>this.V_&&(this.d_=this.V_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.d_}}/**
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
 */const Xo="PersistentStream";class cc{constructor(e,t,n,s,i,o,a,u){this.Ci=e,this.b_=n,this.S_=s,this.connection=i,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=a,this.listener=u,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new yi(e,t)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Ci.enqueueAfterDelay(this.b_,6e4,()=>this.k_()))}K_(e){this.q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===m.RESOURCE_EXHAUSTED?(K(t.toString()),K("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===m.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.W_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.t_(t)}W_(){}auth(){this.state=1;const e=this.Q_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([n,s])=>{this.D_===t&&this.G_(n,s)},n=>{e(()=>{const s=new p(m.UNKNOWN,"Fetching auth token failed: "+n.message);return this.z_(s)})})}G_(e,t){const n=this.Q_(this.D_);this.stream=this.j_(e,t),this.stream.Zo(()=>{n(()=>this.listener.Zo())}),this.stream.Yo(()=>{n(()=>(this.state=2,this.v_=this.Ci.enqueueAfterDelay(this.S_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.Yo()))}),this.stream.t_(s=>{n(()=>this.z_(s))}),this.stream.onMessage(s=>{n(()=>++this.F_==1?this.H_(s):this.onNext(s))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return g(Xo,`close with error: ${e}`),this.stream=null,this.close(4,e)}Q_(e){return t=>{this.Ci.enqueueAndForget(()=>this.D_===e?t():(g(Xo,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class Ed extends cc{constructor(e,t,n,s,i,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,s,o),this.serializer=i}j_(e,t){return this.connection.T_("Listen",e,t)}H_(e){return this.onNext(e)}onNext(e){this.M_.reset();const t=Sh(this.serializer,e),n=function(i){if(!("targetChange"in i))return R.min();const o=i.targetChange;return o.targetIds&&o.targetIds.length?R.min():o.readTime?ee(o.readTime):R.min()}(e);return this.listener.J_(t,n)}Z_(e){const t={};t.database=xs(this.serializer),t.addTarget=function(i,o){let a;const u=o.target;if(a=vr(u)?{documents:bu(i,u)}:{query:ci(i,u).ft},a.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){a.resumeToken=vu(i,o.resumeToken);const c=Cs(i,o.expectedCount);c!==null&&(a.expectedCount=c)}else if(o.snapshotVersion.compareTo(R.min())>0){a.readTime=Jt(i,o.snapshotVersion.toTimestamp());const c=Cs(i,o.expectedCount);c!==null&&(a.expectedCount=c)}return a}(this.serializer,e);const n=Dh(this.serializer,e);n&&(t.labels=n),this.K_(t)}X_(e){const t={};t.database=xs(this.serializer),t.removeTarget=e,this.K_(t)}}class wd extends cc{constructor(e,t,n,s,i,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,s,o),this.serializer=i}get Y_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}W_(){this.Y_&&this.ea([])}j_(e,t){return this.connection.T_("Write",e,t)}H_(e){return v(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,v(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){v(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const t=bh(e.writeResults,e.commitTime),n=ee(e.commitTime);return this.listener.na(n,t)}ra(){const e={};e.database=xs(this.serializer),this.K_(e)}ea(e){const t={streamToken:this.lastStreamToken,writes:e.map(n=>Ln(this.serializer,n))};this.K_(t)}}/**
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
 */class Ad{}class vd extends Ad{constructor(e,t,n,s){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=s,this.ia=!1}sa(){if(this.ia)throw new p(m.FAILED_PRECONDITION,"The client has already been terminated.")}Wo(e,t,n,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([i,o])=>this.connection.Wo(e,Ds(t,n),s,i,o)).catch(i=>{throw i.name==="FirebaseError"?(i.code===m.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),i):new p(m.UNKNOWN,i.toString())})}jo(e,t,n,s,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,a])=>this.connection.jo(e,Ds(t,n),s,o,a,i)).catch(o=>{throw o.name==="FirebaseError"?(o.code===m.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new p(m.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}function Rd(r,e,t,n){return new vd(r,e,t,n)}class Vd{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(K(t),this.aa=!1):g("OnlineStateTracker",t)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
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
 */const It="RemoteStore";class Pd{constructor(e,t,n,s,i){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.Ra=[],this.Aa=i,this.Aa.Mo(o=>{n.enqueueAndForget(async()=>{wt(this)&&(g(It,"Restarting streams for network reachability change."),await async function(u){const c=w(u);c.Ea.add(4),await Jn(c),c.Va.set("Unknown"),c.Ea.delete(4),await Xr(c)}(this))})}),this.Va=new Vd(n,s)}}async function Xr(r){if(wt(r))for(const e of r.Ra)await e(!0)}async function Jn(r){for(const e of r.Ra)await e(!1)}function Zr(r,e){const t=w(r);t.Ia.has(e.targetId)||(t.Ia.set(e.targetId,e),Ei(t)?Ti(t):on(t).O_()&&Ii(t,e))}function Xt(r,e){const t=w(r),n=on(t);t.Ia.delete(e),n.O_()&&lc(t,e),t.Ia.size===0&&(n.O_()?n.L_():wt(t)&&t.Va.set("Unknown"))}function Ii(r,e){if(r.da.$e(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(R.min())>0){const t=r.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}on(r).Z_(e)}function lc(r,e){r.da.$e(e),on(r).X_(e)}function Ti(r){r.da=new Th({getRemoteKeysForTarget:e=>r.remoteSyncer.getRemoteKeysForTarget(e),At:e=>r.Ia.get(e)||null,ht:()=>r.datastore.serializer.databaseId}),on(r).start(),r.Va.ua()}function Ei(r){return wt(r)&&!on(r).x_()&&r.Ia.size>0}function wt(r){return w(r).Ea.size===0}function hc(r){r.da=void 0}async function Sd(r){r.Va.set("Online")}async function bd(r){r.Ia.forEach((e,t)=>{Ii(r,e)})}async function Cd(r,e){hc(r),Ei(r)?(r.Va.ha(e),Ti(r)):r.Va.set("Unknown")}async function Dd(r,e,t){if(r.Va.set("Online"),e instanceof Au&&e.state===2&&e.cause)try{await async function(s,i){const o=i.cause;for(const a of i.targetIds)s.Ia.has(a)&&(await s.remoteSyncer.rejectListen(a,o),s.Ia.delete(a),s.da.removeTarget(a))}(r,e)}catch(n){g(It,"Failed to remove targets %s: %s ",e.targetIds.join(","),n),await kr(r,n)}else if(e instanceof mr?r.da.Xe(e):e instanceof wu?r.da.st(e):r.da.tt(e),!t.isEqual(R.min()))try{const n=await ec(r.localStore);t.compareTo(n)>=0&&await function(i,o){const a=i.da.Tt(o);return a.targetChanges.forEach((u,c)=>{if(u.resumeToken.approximateByteSize()>0){const l=i.Ia.get(c);l&&i.Ia.set(c,l.withResumeToken(u.resumeToken,o))}}),a.targetMismatches.forEach((u,c)=>{const l=i.Ia.get(u);if(!l)return;i.Ia.set(u,l.withResumeToken($.EMPTY_BYTE_STRING,l.snapshotVersion)),lc(i,u);const h=new Pe(l.target,u,c,l.sequenceNumber);Ii(i,h)}),i.remoteSyncer.applyRemoteEvent(a)}(r,t)}catch(n){g(It,"Failed to raise snapshot:",n),await kr(r,n)}}async function kr(r,e,t){if(!Je(e))throw e;r.Ea.add(1),await Jn(r),r.Va.set("Offline"),t||(t=()=>ec(r.localStore)),r.asyncQueue.enqueueRetryable(async()=>{g(It,"Retrying IndexedDB access"),await t(),r.Ea.delete(1),await Xr(r)})}function dc(r,e){return e().catch(t=>kr(r,t,e))}async function sn(r){const e=w(r),t=Qe(e);let n=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:ct;for(;xd(e);)try{const s=await _d(e.localStore,n);if(s===null){e.Ta.length===0&&t.L_();break}n=s.batchId,Nd(e,s)}catch(s){await kr(e,s)}fc(e)&&mc(e)}function xd(r){return wt(r)&&r.Ta.length<10}function Nd(r,e){r.Ta.push(e);const t=Qe(r);t.O_()&&t.Y_&&t.ea(e.mutations)}function fc(r){return wt(r)&&!Qe(r).x_()&&r.Ta.length>0}function mc(r){Qe(r).start()}async function kd(r){Qe(r).ra()}async function Fd(r){const e=Qe(r);for(const t of r.Ta)e.ea(t.mutations)}async function Md(r,e,t){const n=r.Ta.shift(),s=ii.from(n,e,t);await dc(r,()=>r.remoteSyncer.applySuccessfulWrite(s)),await sn(r)}async function Od(r,e){e&&Qe(r).Y_&&await async function(n,s){if(function(o){return Tu(o)&&o!==m.ABORTED}(s.code)){const i=n.Ta.shift();Qe(n).B_(),await dc(n,()=>n.remoteSyncer.rejectFailedWrite(i.batchId,s)),await sn(n)}}(r,e),fc(r)&&mc(r)}async function Zo(r,e){const t=w(r);t.asyncQueue.verifyOperationInProgress(),g(It,"RemoteStore received new credentials");const n=wt(t);t.Ea.add(3),await Jn(t),n&&t.Va.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ea.delete(3),await Xr(t)}async function Us(r,e){const t=w(r);e?(t.Ea.delete(2),await Xr(t)):e||(t.Ea.add(2),await Jn(t),t.Va.set("Unknown"))}function on(r){return r.ma||(r.ma=function(t,n,s){const i=w(t);return i.sa(),new Ed(n,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(r.datastore,r.asyncQueue,{Zo:Sd.bind(null,r),Yo:bd.bind(null,r),t_:Cd.bind(null,r),J_:Dd.bind(null,r)}),r.Ra.push(async e=>{e?(r.ma.B_(),Ei(r)?Ti(r):r.Va.set("Unknown")):(await r.ma.stop(),hc(r))})),r.ma}function Qe(r){return r.fa||(r.fa=function(t,n,s){const i=w(t);return i.sa(),new wd(n,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(r.datastore,r.asyncQueue,{Zo:()=>Promise.resolve(),Yo:kd.bind(null,r),t_:Od.bind(null,r),ta:Fd.bind(null,r),na:Md.bind(null,r)}),r.Ra.push(async e=>{e?(r.fa.B_(),await sn(r)):(await r.fa.stop(),r.Ta.length>0&&(g(It,`Stopping write stream with ${r.Ta.length} pending writes`),r.Ta=[]))})),r.fa}/**
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
 */class wi{constructor(e,t,n,s,i){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=s,this.removalCallback=i,this.deferred=new ge,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,s,i){const o=Date.now()+n,a=new wi(e,t,o,s,i);return a.start(n),a}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new p(m.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Ai(r,e){if(K("AsyncQueue",`${e}: ${r}`),Je(r))return new p(m.UNAVAILABLE,`${e}: ${r}`);throw r}/**
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
 */class Ot{static emptySet(e){return new Ot(e.comparator)}constructor(e){this.comparator=e?(t,n)=>e(t,n)||y.comparator(t.key,n.key):(t,n)=>y.comparator(t.key,n.key),this.keyedMap=_n(),this.sortedSet=new O(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,n)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof Ot)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=n.getNext().key;if(!s.isEqual(i))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const n=new Ot;return n.comparator=this.comparator,n.keyedMap=e,n.sortedSet=t,n}}/**
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
 */class ea{constructor(){this.ga=new O(y.comparator)}track(e){const t=e.doc.key,n=this.ga.get(t);n?e.type!==0&&n.type===3?this.ga=this.ga.insert(t,e):e.type===3&&n.type!==1?this.ga=this.ga.insert(t,{type:n.type,doc:e.doc}):e.type===2&&n.type===2?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):e.type===2&&n.type===0?this.ga=this.ga.insert(t,{type:0,doc:e.doc}):e.type===1&&n.type===0?this.ga=this.ga.remove(t):e.type===1&&n.type===2?this.ga=this.ga.insert(t,{type:1,doc:n.doc}):e.type===0&&n.type===1?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):T(63341,{Vt:e,pa:n}):this.ga=this.ga.insert(t,e)}ya(){const e=[];return this.ga.inorderTraversal((t,n)=>{e.push(n)}),e}}class Zt{constructor(e,t,n,s,i,o,a,u,c){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=s,this.mutatedKeys=i,this.fromCache=o,this.syncStateChanged=a,this.excludesMetadataChanges=u,this.hasCachedResults=c}static fromInitialDocuments(e,t,n,s,i){const o=[];return t.forEach(a=>{o.push({type:0,doc:a})}),new Zt(e,t,Ot.emptySet(t),o,n,s,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&$r(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let s=0;s<t.length;s++)if(t[s].type!==n[s].type||!t[s].doc.isEqual(n[s].doc))return!1;return!0}}/**
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
 */class Ld{constructor(){this.wa=void 0,this.ba=[]}Sa(){return this.ba.some(e=>e.Da())}}class qd{constructor(){this.queries=ta(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(t,n){const s=w(t),i=s.queries;s.queries=ta(),i.forEach((o,a)=>{for(const u of a.ba)u.onError(n)})})(this,new p(m.ABORTED,"Firestore shutting down"))}}function ta(){return new De(r=>iu(r),$r)}async function vi(r,e){const t=w(r);let n=3;const s=e.query;let i=t.queries.get(s);i?!i.Sa()&&e.Da()&&(n=2):(i=new Ld,n=e.Da()?0:1);try{switch(n){case 0:i.wa=await t.onListen(s,!0);break;case 1:i.wa=await t.onListen(s,!1);break;case 2:await t.onFirstRemoteStoreListen(s)}}catch(o){const a=Ai(o,`Initialization of query '${Dt(e.query)}' failed`);return void e.onError(a)}t.queries.set(s,i),i.ba.push(e),e.va(t.onlineState),i.wa&&e.Fa(i.wa)&&Vi(t)}async function Ri(r,e){const t=w(r),n=e.query;let s=3;const i=t.queries.get(n);if(i){const o=i.ba.indexOf(e);o>=0&&(i.ba.splice(o,1),i.ba.length===0?s=e.Da()?0:1:!i.Sa()&&e.Da()&&(s=2))}switch(s){case 0:return t.queries.delete(n),t.onUnlisten(n,!0);case 1:return t.queries.delete(n),t.onUnlisten(n,!1);case 2:return t.onLastRemoteStoreUnlisten(n);default:return}}function Ud(r,e){const t=w(r);let n=!1;for(const s of e){const i=s.query,o=t.queries.get(i);if(o){for(const a of o.ba)a.Fa(s)&&(n=!0);o.wa=s}}n&&Vi(t)}function Bd(r,e,t){const n=w(r),s=n.queries.get(e);if(s)for(const i of s.ba)i.onError(t);n.queries.delete(e)}function Vi(r){r.Ca.forEach(e=>{e.next()})}var Bs,na;(na=Bs||(Bs={})).Ma="default",na.Cache="cache";class Pi{constructor(e,t,n){this.query=e,this.xa=t,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=n||{}}Fa(e){if(!this.options.includeMetadataChanges){const n=[];for(const s of e.docChanges)s.type!==3&&n.push(s);e=new Zt(e.query,e.docs,e.oldDocs,n,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Oa?this.Ba(e)&&(this.xa.next(e),t=!0):this.La(e,this.onlineState)&&(this.ka(e),t=!0),this.Na=e,t}onError(e){this.xa.error(e)}va(e){this.onlineState=e;let t=!1;return this.Na&&!this.Oa&&this.La(this.Na,e)&&(this.ka(this.Na),t=!0),t}La(e,t){if(!e.fromCache||!this.Da())return!0;const n=t!=="Offline";return(!this.options.Ka||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Ba(e){if(e.docChanges.length>0)return!0;const t=this.Na&&this.Na.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}ka(e){e=Zt.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Oa=!0,this.xa.next(e)}Da(){return this.options.source!==Bs.Cache}}/**
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
 */class _c{constructor(e){this.key=e}}class gc{constructor(e){this.key=e}}class zd{constructor(e,t){this.query=e,this.Za=t,this.Xa=null,this.hasCachedResults=!1,this.current=!1,this.Ya=P(),this.mutatedKeys=P(),this.eu=au(e),this.tu=new Ot(this.eu)}get nu(){return this.Za}ru(e,t){const n=t?t.iu:new ea,s=t?t.tu:this.tu;let i=t?t.mutatedKeys:this.mutatedKeys,o=s,a=!1;const u=this.query.limitType==="F"&&s.size===this.query.limit?s.last():null,c=this.query.limitType==="L"&&s.size===this.query.limit?s.first():null;if(e.inorderTraversal((l,h)=>{const d=s.get(l),_=Qn(this.query,h)?h:null,I=!!d&&this.mutatedKeys.has(d.key),E=!!_&&(_.hasLocalMutations||this.mutatedKeys.has(_.key)&&_.hasCommittedMutations);let A=!1;d&&_?d.data.isEqual(_.data)?I!==E&&(n.track({type:3,doc:_}),A=!0):this.su(d,_)||(n.track({type:2,doc:_}),A=!0,(u&&this.eu(_,u)>0||c&&this.eu(_,c)<0)&&(a=!0)):!d&&_?(n.track({type:0,doc:_}),A=!0):d&&!_&&(n.track({type:1,doc:d}),A=!0,(u||c)&&(a=!0)),A&&(_?(o=o.add(_),i=E?i.add(l):i.delete(l)):(o=o.delete(l),i=i.delete(l)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const l=this.query.limitType==="F"?o.last():o.first();o=o.delete(l.key),i=i.delete(l.key),n.track({type:1,doc:l})}return{tu:o,iu:n,Ss:a,mutatedKeys:i}}su(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,s){const i=this.tu;this.tu=e.tu,this.mutatedKeys=e.mutatedKeys;const o=e.iu.ya();o.sort((l,h)=>function(_,I){const E=A=>{switch(A){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return T(20277,{Vt:A})}};return E(_)-E(I)}(l.type,h.type)||this.eu(l.doc,h.doc)),this.ou(n),s=s??!1;const a=t&&!s?this._u():[],u=this.Ya.size===0&&this.current&&!s?1:0,c=u!==this.Xa;return this.Xa=u,o.length!==0||c?{snapshot:new Zt(this.query,e.tu,i,o,e.mutatedKeys,u===0,c,!1,!!n&&n.resumeToken.approximateByteSize()>0),au:a}:{au:a}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new ea,mutatedKeys:this.mutatedKeys,Ss:!1},!1)):{au:[]}}uu(e){return!this.Za.has(e)&&!!this.tu.has(e)&&!this.tu.get(e).hasLocalMutations}ou(e){e&&(e.addedDocuments.forEach(t=>this.Za=this.Za.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.Za=this.Za.delete(t)),this.current=e.current)}_u(){if(!this.current)return[];const e=this.Ya;this.Ya=P(),this.tu.forEach(n=>{this.uu(n.key)&&(this.Ya=this.Ya.add(n.key))});const t=[];return e.forEach(n=>{this.Ya.has(n)||t.push(new gc(n))}),this.Ya.forEach(n=>{e.has(n)||t.push(new _c(n))}),t}cu(e){this.Za=e.ks,this.Ya=P();const t=this.ru(e.documents);return this.applyChanges(t,!0)}lu(){return Zt.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Xa===0,this.hasCachedResults)}}const an="SyncEngine";class Gd{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class Kd{constructor(e){this.key=e,this.hu=!1}}class $d{constructor(e,t,n,s,i,o){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=s,this.currentUser=i,this.maxConcurrentLimboResolutions=o,this.Pu={},this.Tu=new De(a=>iu(a),$r),this.Iu=new Map,this.Eu=new Set,this.Ru=new O(y.comparator),this.Au=new Map,this.Vu=new di,this.du={},this.mu=new Map,this.fu=yt.ar(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function jd(r,e,t=!0){const n=es(r);let s;const i=n.Tu.get(e);return i?(n.sharedClientState.addLocalQueryTarget(i.targetId),s=i.view.lu()):s=await pc(n,e,t,!0),s}async function Qd(r,e){const t=es(r);await pc(t,e,!0,!1)}async function pc(r,e,t,n){const s=await Dr(r.localStore,fe(e)),i=s.targetId,o=r.sharedClientState.addLocalQueryTarget(i,t);let a;return n&&(a=await Si(r,e,i,o==="current",s.resumeToken)),r.isPrimaryClient&&t&&Zr(r.remoteStore,s),a}async function Si(r,e,t,n,s){r.pu=(h,d,_)=>async function(E,A,N,b){let C=A.view.ru(N);C.Ss&&(C=await Os(E.localStore,A.query,!1).then(({documents:oe})=>A.view.ru(oe,C)));const J=b&&b.targetChanges.get(A.targetId),G=b&&b.targetMismatches.get(A.targetId)!=null,W=A.view.applyChanges(C,E.isPrimaryClient,J,G);return zs(E,A.targetId,W.au),W.snapshot}(r,h,d,_);const i=await Os(r.localStore,e,!0),o=new zd(e,i.ks),a=o.ru(i.documents),u=Hn.createSynthesizedTargetChangeForCurrentChange(t,n&&r.onlineState!=="Offline",s),c=o.applyChanges(a,r.isPrimaryClient,u);zs(r,t,c.au);const l=new Gd(e,t,o);return r.Tu.set(e,l),r.Iu.has(t)?r.Iu.get(t).push(e):r.Iu.set(t,[e]),c.snapshot}async function Wd(r,e,t){const n=w(r),s=n.Tu.get(e),i=n.Iu.get(s.targetId);if(i.length>1)return n.Iu.set(s.targetId,i.filter(o=>!$r(o,e))),void n.Tu.delete(e);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(s.targetId),n.sharedClientState.isActiveQueryTarget(s.targetId)||await Yt(n.localStore,s.targetId,!1).then(()=>{n.sharedClientState.clearQueryState(s.targetId),t&&Xt(n.remoteStore,s.targetId),en(n,s.targetId)}).catch(He)):(en(n,s.targetId),await Yt(n.localStore,s.targetId,!0))}async function Hd(r,e){const t=w(r),n=t.Tu.get(e),s=t.Iu.get(n.targetId);t.isPrimaryClient&&s.length===1&&(t.sharedClientState.removeLocalQueryTarget(n.targetId),Xt(t.remoteStore,n.targetId))}async function Jd(r,e,t){const n=xi(r);try{const s=await function(o,a){const u=w(o),c=k.now(),l=a.reduce((_,I)=>_.add(I.key),P());let h,d;return u.persistence.runTransaction("Locally write mutations","readwrite",_=>{let I=de(),E=P();return u.xs.getEntries(_,l).next(A=>{I=A,I.forEach((N,b)=>{b.isValidDocument()||(E=E.add(N))})}).next(()=>u.localDocuments.getOverlayedDocuments(_,I)).next(A=>{h=A;const N=[];for(const b of a){const C=_h(b,h.get(b.key).overlayedDocument);C!=null&&N.push(new xe(b.key,C,Ha(C.value.mapValue),U.exists(!0)))}return u.mutationQueue.addMutationBatch(_,c,N,a)}).next(A=>{d=A;const N=A.applyToLocalDocumentSet(h,E);return u.documentOverlayCache.saveOverlays(_,A.batchId,N)})}).then(()=>({batchId:d.batchId,changes:cu(h)}))}(n.localStore,e);n.sharedClientState.addPendingMutation(s.batchId),function(o,a,u){let c=o.du[o.currentUser.toKey()];c||(c=new O(V)),c=c.insert(a,u),o.du[o.currentUser.toKey()]=c}(n,s.batchId,t),await Xe(n,s.changes),await sn(n.remoteStore)}catch(s){const i=Ai(s,"Failed to persist write");t.reject(i)}}async function yc(r,e){const t=w(r);try{const n=await fd(t.localStore,e);e.targetChanges.forEach((s,i)=>{const o=t.Au.get(i);o&&(v(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1,22616),s.addedDocuments.size>0?o.hu=!0:s.modifiedDocuments.size>0?v(o.hu,14607):s.removedDocuments.size>0&&(v(o.hu,42227),o.hu=!1))}),await Xe(t,n,e)}catch(n){await He(n)}}function ra(r,e,t){const n=w(r);if(n.isPrimaryClient&&t===0||!n.isPrimaryClient&&t===1){const s=[];n.Tu.forEach((i,o)=>{const a=o.view.va(e);a.snapshot&&s.push(a.snapshot)}),function(o,a){const u=w(o);u.onlineState=a;let c=!1;u.queries.forEach((l,h)=>{for(const d of h.ba)d.va(a)&&(c=!0)}),c&&Vi(u)}(n.eventManager,e),s.length&&n.Pu.J_(s),n.onlineState=e,n.isPrimaryClient&&n.sharedClientState.setOnlineState(e)}}async function Yd(r,e,t){const n=w(r);n.sharedClientState.updateQueryState(e,"rejected",t);const s=n.Au.get(e),i=s&&s.key;if(i){let o=new O(y.comparator);o=o.insert(i,q.newNoDocument(i,R.min()));const a=P().add(i),u=new Wn(R.min(),new Map,new O(V),o,a);await yc(n,u),n.Ru=n.Ru.remove(i),n.Au.delete(e),Di(n)}else await Yt(n.localStore,e,!1).then(()=>en(n,e,t)).catch(He)}async function Xd(r,e){const t=w(r),n=e.batch.batchId;try{const s=await dd(t.localStore,e);Ci(t,n,null),bi(t,n),t.sharedClientState.updateMutationState(n,"acknowledged"),await Xe(t,s)}catch(s){await He(s)}}async function Zd(r,e,t){const n=w(r);try{const s=await function(o,a){const u=w(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",c=>{let l;return u.mutationQueue.lookupMutationBatch(c,a).next(h=>(v(h!==null,37113),l=h.keys(),u.mutationQueue.removeMutationBatch(c,h))).next(()=>u.mutationQueue.performConsistencyCheck(c)).next(()=>u.documentOverlayCache.removeOverlaysForBatchId(c,l,a)).next(()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(c,l)).next(()=>u.localDocuments.getDocuments(c,l))})}(n.localStore,e);Ci(n,e,t),bi(n,e),n.sharedClientState.updateMutationState(e,"rejected",t),await Xe(n,s)}catch(s){await He(s)}}function bi(r,e){(r.mu.get(e)||[]).forEach(t=>{t.resolve()}),r.mu.delete(e)}function Ci(r,e,t){const n=w(r);let s=n.du[n.currentUser.toKey()];if(s){const i=s.get(e);i&&(t?i.reject(t):i.resolve(),s=s.remove(e)),n.du[n.currentUser.toKey()]=s}}function en(r,e,t=null){r.sharedClientState.removeLocalQueryTarget(e);for(const n of r.Iu.get(e))r.Tu.delete(n),t&&r.Pu.yu(n,t);r.Iu.delete(e),r.isPrimaryClient&&r.Vu.Gr(e).forEach(n=>{r.Vu.containsKey(n)||Ic(r,n)})}function Ic(r,e){r.Eu.delete(e.path.canonicalString());const t=r.Ru.get(e);t!==null&&(Xt(r.remoteStore,t),r.Ru=r.Ru.remove(e),r.Au.delete(t),Di(r))}function zs(r,e,t){for(const n of t)n instanceof _c?(r.Vu.addReference(n.key,e),ef(r,n)):n instanceof gc?(g(an,"Document no longer in limbo: "+n.key),r.Vu.removeReference(n.key,e),r.Vu.containsKey(n.key)||Ic(r,n.key)):T(19791,{wu:n})}function ef(r,e){const t=e.key,n=t.path.canonicalString();r.Ru.get(t)||r.Eu.has(n)||(g(an,"New document in limbo: "+t),r.Eu.add(n),Di(r))}function Di(r){for(;r.Eu.size>0&&r.Ru.size<r.maxConcurrentLimboResolutions;){const e=r.Eu.values().next().value;r.Eu.delete(e);const t=new y(x.fromString(e)),n=r.fu.next();r.Au.set(n,new Kd(t)),r.Ru=r.Ru.insert(t,n),Zr(r.remoteStore,new Pe(fe(jn(t.path)),n,"TargetPurposeLimboResolution",ae.ce))}}async function Xe(r,e,t){const n=w(r),s=[],i=[],o=[];n.Tu.isEmpty()||(n.Tu.forEach((a,u)=>{o.push(n.pu(u,e,t).then(c=>{var l;if((c||t)&&n.isPrimaryClient){const h=c?!c.fromCache:(l=t==null?void 0:t.targetChanges.get(u.targetId))==null?void 0:l.current;n.sharedClientState.updateQueryState(u.targetId,h?"current":"not-current")}if(c){s.push(c);const h=_i.Es(u.targetId,c);i.push(h)}}))}),await Promise.all(o),n.Pu.J_(s),await async function(u,c){const l=w(u);try{await l.persistence.runTransaction("notifyLocalViewChanges","readwrite",h=>f.forEach(c,d=>f.forEach(d.Ts,_=>l.persistence.referenceDelegate.addReference(h,d.targetId,_)).next(()=>f.forEach(d.Is,_=>l.persistence.referenceDelegate.removeReference(h,d.targetId,_)))))}catch(h){if(!Je(h))throw h;g(gi,"Failed to update sequence numbers: "+h)}for(const h of c){const d=h.targetId;if(!h.fromCache){const _=l.vs.get(d),I=_.snapshotVersion,E=_.withLastLimboFreeSnapshotVersion(I);l.vs=l.vs.insert(d,E)}}}(n.localStore,i))}async function tf(r,e){const t=w(r);if(!t.currentUser.isEqual(e)){g(an,"User change. New user:",e.toKey());const n=await Zu(t.localStore,e);t.currentUser=e,function(i,o){i.mu.forEach(a=>{a.forEach(u=>{u.reject(new p(m.CANCELLED,o))})}),i.mu.clear()}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,n.removedBatchIds,n.addedBatchIds),await Xe(t,n.Ns)}}function nf(r,e){const t=w(r),n=t.Au.get(e);if(n&&n.hu)return P().add(n.key);{let s=P();const i=t.Iu.get(e);if(!i)return s;for(const o of i){const a=t.Tu.get(o);s=s.unionWith(a.view.nu)}return s}}async function rf(r,e){const t=w(r),n=await Os(t.localStore,e.query,!0),s=e.view.cu(n);return t.isPrimaryClient&&zs(t,e.targetId,s.au),s}async function sf(r,e){const t=w(r);return nc(t.localStore,e).then(n=>Xe(t,n))}async function of(r,e,t,n){const s=w(r),i=await function(a,u){const c=w(a),l=w(c.mutationQueue);return c.persistence.runTransaction("Lookup mutation documents","readonly",h=>l.Xn(h,u).next(d=>d?c.localDocuments.getDocuments(h,d):f.resolve(null)))}(s.localStore,e);i!==null?(t==="pending"?await sn(s.remoteStore):t==="acknowledged"||t==="rejected"?(Ci(s,e,n||null),bi(s,e),function(a,u){w(w(a).mutationQueue).nr(u)}(s.localStore,e)):T(6720,"Unknown batchState",{bu:t}),await Xe(s,i)):g(an,"Cannot apply mutation batch with id: "+e)}async function af(r,e){const t=w(r);if(es(t),xi(t),e===!0&&t.gu!==!0){const n=t.sharedClientState.getAllActiveQueryTargets(),s=await sa(t,n.toArray());t.gu=!0,await Us(t.remoteStore,!0);for(const i of s)Zr(t.remoteStore,i)}else if(e===!1&&t.gu!==!1){const n=[];let s=Promise.resolve();t.Iu.forEach((i,o)=>{t.sharedClientState.isLocalQueryTarget(o)?n.push(o):s=s.then(()=>(en(t,o),Yt(t.localStore,o,!0))),Xt(t.remoteStore,o)}),await s,await sa(t,n),function(o){const a=w(o);a.Au.forEach((u,c)=>{Xt(a.remoteStore,c)}),a.Vu.zr(),a.Au=new Map,a.Ru=new O(y.comparator)}(t),t.gu=!1,await Us(t.remoteStore,!1)}}async function sa(r,e,t){const n=w(r),s=[],i=[];for(const o of e){let a;const u=n.Iu.get(o);if(u&&u.length!==0){a=await Dr(n.localStore,fe(u[0]));for(const c of u){const l=n.Tu.get(c),h=await rf(n,l);h.snapshot&&i.push(h.snapshot)}}else{const c=await tc(n.localStore,o);a=await Dr(n.localStore,c),await Si(n,Tc(c),o,!1,a.resumeToken)}s.push(a)}return n.Pu.J_(i),s}function Tc(r){return ru(r.path,r.collectionGroup,r.orderBy,r.filters,r.limit,"F",r.startAt,r.endAt)}function uf(r){return function(t){return w(w(t).persistence).hs()}(w(r).localStore)}async function cf(r,e,t,n){const s=w(r);if(s.gu)return void g(an,"Ignoring unexpected query state notification.");const i=s.Iu.get(e);if(i&&i.length>0)switch(t){case"current":case"not-current":{const o=await nc(s.localStore,ou(i[0])),a=Wn.createSynthesizedRemoteEventForCurrentChange(e,t==="current",$.EMPTY_BYTE_STRING);await Xe(s,o,a);break}case"rejected":await Yt(s.localStore,e,!0),en(s,e,n);break;default:T(64155,t)}}async function lf(r,e,t){const n=es(r);if(n.gu){for(const s of e){if(n.Iu.has(s)&&n.sharedClientState.isActiveQueryTarget(s)){g(an,"Adding an already active target "+s);continue}const i=await tc(n.localStore,s),o=await Dr(n.localStore,i);await Si(n,Tc(i),o.targetId,!1,o.resumeToken),Zr(n.remoteStore,o)}for(const s of t)n.Iu.has(s)&&await Yt(n.localStore,s,!1).then(()=>{Xt(n.remoteStore,s),en(n,s)}).catch(He)}}function es(r){const e=w(r);return e.remoteStore.remoteSyncer.applyRemoteEvent=yc.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=nf.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=Yd.bind(null,e),e.Pu.J_=Ud.bind(null,e.eventManager),e.Pu.yu=Bd.bind(null,e.eventManager),e}function xi(r){const e=w(r);return e.remoteStore.remoteSyncer.applySuccessfulWrite=Xd.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=Zd.bind(null,e),e}class qn{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Yr(e.databaseInfo.databaseId),this.sharedClientState=this.Du(e),this.persistence=this.Cu(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Fu(e,this.localStore),this.indexBackfillerScheduler=this.Mu(e,this.localStore)}Fu(e,t){return null}Mu(e,t){return null}vu(e){return Xu(this.persistence,new Yu,e.initialUser,this.serializer)}Cu(e){return new fi(Jr.Vi,this.serializer)}Du(e){return new ac}async terminate(){var e,t;(e=this.gcScheduler)==null||e.stop(),(t=this.indexBackfillerScheduler)==null||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}qn.provider={build:()=>new qn};class hf extends qn{constructor(e){super(),this.cacheSizeBytes=e}Fu(e,t){v(this.persistence.referenceDelegate instanceof Cr,46915);const n=this.persistence.referenceDelegate.garbageCollector;return new $u(n,e.asyncQueue,t)}Cu(e){const t=this.cacheSizeBytes!==void 0?se.withCacheSize(this.cacheSizeBytes):se.DEFAULT;return new fi(n=>Cr.Vi(n,t),this.serializer)}}class Ec extends qn{constructor(e,t,n){super(),this.xu=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.xu.initialize(this,e),await xi(this.xu.syncEngine),await sn(this.xu.remoteStore),await this.persistence.zi(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}vu(e){return Xu(this.persistence,new Yu,e.initialUser,this.serializer)}Fu(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new $u(n,e.asyncQueue,t)}Mu(e,t){const n=new ml(t,this.persistence);return new fl(e.asyncQueue,n)}Cu(e){const t=Ju(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?se.withCacheSize(this.cacheSizeBytes):se.DEFAULT;return new mi(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,uc(),gr(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Du(e){return new ac}}class df extends Ec{constructor(e,t){super(e,t,!1),this.xu=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.xu.syncEngine;this.sharedClientState instanceof ms&&(this.sharedClientState.syncEngine={So:of.bind(null,t),Do:cf.bind(null,t),Co:lf.bind(null,t),hs:uf.bind(null,t),bo:sf.bind(null,t)},await this.sharedClientState.start()),await this.persistence.zi(async n=>{await af(this.xu.syncEngine,n),this.gcScheduler&&(n&&!this.gcScheduler.started?this.gcScheduler.start():n||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(n&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():n||this.indexBackfillerScheduler.stop())})}Du(e){const t=uc();if(!ms.v(t))throw new p(m.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=Ju(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new ms(t,e.asyncQueue,n,e.clientId,e.initialUser)}}class Un{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>ra(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=tf.bind(null,this.syncEngine),await Us(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new qd}()}createDatastore(e){const t=Yr(e.databaseInfo.databaseId),n=Td(e.databaseInfo);return Rd(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return function(n,s,i,o,a){return new Pd(n,s,i,o,a)}(this.localStore,this.datastore,e.asyncQueue,t=>ra(this.syncEngine,t,0),function(){return Yo.v()?new Yo:new gd}())}createSyncEngine(e,t){return function(s,i,o,a,u,c,l){const h=new $d(s,i,o,a,u,c);return l&&(h.gu=!0),h}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(s){const i=w(s);g(It,"RemoteStore shutting down."),i.Ea.add(5),await Jn(i),i.Aa.shutdown(),i.Va.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(t=this.eventManager)==null||t.terminate()}}Un.provider={build:()=>new Un};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */class Ni{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ou(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ou(this.observer.error,e):K("Uncaught Error in snapshot listener:",e.toString()))}Nu(){this.muted=!0}Ou(e,t){setTimeout(()=>{this.muted||e(t)},0)}}/**
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
 */let ff=class{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new p(m.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await async function(s,i){const o=w(s),a={documents:i.map(h=>On(o.serializer,h))},u=await o.jo("BatchGetDocuments",o.serializer.databaseId,x.emptyPath(),a,i.length),c=new Map;u.forEach(h=>{const d=Ph(o.serializer,h);c.set(d.key.toString(),d)});const l=[];return i.forEach(h=>{const d=c.get(h.toString());v(!!d,55234,{key:h}),l.push(d)}),l}(this.datastore,e);return t.forEach(n=>this.recordVersion(n)),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(n){this.lastTransactionError=n}this.writtenDocs.add(e.toString())}delete(e){this.write(new rn(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach(t=>{e.delete(t.key.toString())}),e.forEach((t,n)=>{const s=y.fromPath(n);this.mutations.push(new ri(s,this.precondition(s)))}),await async function(n,s){const i=w(n),o={writes:s.map(a=>Ln(i.serializer,a))};await i.Wo("Commit",i.serializer.databaseId,x.emptyPath(),o)}(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw T(50498,{Gu:e.constructor.name});t=R.min()}const n=this.readVersions.get(e.key.toString());if(n){if(!t.isEqual(n))throw new p(m.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(R.min())?U.exists(!1):U.updateTime(t):U.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(R.min()))throw new p(m.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return U.updateTime(t)}return U.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}};/**
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
 */class mf{constructor(e,t,n,s,i){this.asyncQueue=e,this.datastore=t,this.options=n,this.updateFunction=s,this.deferred=i,this.zu=n.maxAttempts,this.M_=new yi(this.asyncQueue,"transaction_retry")}ju(){this.zu-=1,this.Hu()}Hu(){this.M_.p_(async()=>{const e=new ff(this.datastore),t=this.Ju(e);t&&t.then(n=>{this.asyncQueue.enqueueAndForget(()=>e.commit().then(()=>{this.deferred.resolve(n)}).catch(s=>{this.Zu(s)}))}).catch(n=>{this.Zu(n)})})}Ju(e){try{const t=this.updateFunction(e);return!Gn(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}Zu(e){this.zu>0&&this.Xu(e)?(this.zu-=1,this.asyncQueue.enqueueAndForget(()=>(this.Hu(),Promise.resolve()))):this.deferred.reject(e)}Xu(e){if((e==null?void 0:e.name)==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!Tu(t)}return!1}}/**
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
 */const We="FirestoreClient";class _f{constructor(e,t,n,s,i){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this._databaseInfo=s,this.user=re.UNAUTHENTICATED,this.clientId=Ks.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(n,async o=>{g(We,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(n,o=>(g(We,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this._databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new ge;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=Ai(t,"Failed to shutdown persistence");e.reject(n)}}),e.promise}}async function gs(r,e){r.asyncQueue.verifyOperationInProgress(),g(We,"Initializing OfflineComponentProvider");const t=r.configuration;await e.initialize(t);let n=t.initialUser;r.setCredentialChangeListener(async s=>{n.isEqual(s)||(await Zu(e.localStore,s),n=s)}),e.persistence.setDatabaseDeletedListener(()=>r.terminate()),r._offlineComponents=e}async function ia(r,e){r.asyncQueue.verifyOperationInProgress();const t=await gf(r);g(We,"Initializing OnlineComponentProvider"),await e.initialize(t,r.configuration),r.setCredentialChangeListener(n=>Zo(e.remoteStore,n)),r.setAppCheckTokenChangeListener((n,s)=>Zo(e.remoteStore,s)),r._onlineComponents=e}async function gf(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){g(We,"Using user provided OfflineComponentProvider");try{await gs(r,r._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!function(s){return s.name==="FirebaseError"?s.code===m.FAILED_PRECONDITION||s.code===m.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11}(t))throw t;Vn("Error using user provided cache. Falling back to memory cache: "+t),await gs(r,new qn)}}else g(We,"Using default OfflineComponentProvider"),await gs(r,new hf(void 0));return r._offlineComponents}async function ki(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(g(We,"Using user provided OnlineComponentProvider"),await ia(r,r._uninitializedComponentsProvider._online)):(g(We,"Using default OnlineComponentProvider"),await ia(r,new Un))),r._onlineComponents}function pf(r){return ki(r).then(e=>e.syncEngine)}function wc(r){return ki(r).then(e=>e.datastore)}async function Fr(r){const e=await ki(r),t=e.eventManager;return t.onListen=jd.bind(null,e.syncEngine),t.onUnlisten=Wd.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=Qd.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=Hd.bind(null,e.syncEngine),t}function yf(r,e,t,n){const s=new Ni(n),i=new Pi(e,s,t);return r.asyncQueue.enqueueAndForget(async()=>vi(await Fr(r),i)),()=>{s.Nu(),r.asyncQueue.enqueueAndForget(async()=>Ri(await Fr(r),i))}}function Ac(r,e,t={}){const n=new ge;return r.asyncQueue.enqueueAndForget(async()=>function(i,o,a,u,c){const l=new Ni({next:d=>{l.Nu(),o.enqueueAndForget(()=>Ri(i,h));const _=d.docs.has(a);!_&&d.fromCache?c.reject(new p(m.UNAVAILABLE,"Failed to get document because the client is offline.")):_&&d.fromCache&&u&&u.source==="server"?c.reject(new p(m.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):c.resolve(d)},error:d=>c.reject(d)}),h=new Pi(jn(a.path),l,{includeMetadataChanges:!0,Ka:!0});return vi(i,h)}(await Fr(r),r.asyncQueue,e,t,n)),n.promise}function If(r,e,t={}){const n=new ge;return r.asyncQueue.enqueueAndForget(async()=>function(i,o,a,u,c){const l=new Ni({next:d=>{l.Nu(),o.enqueueAndForget(()=>Ri(i,h)),d.fromCache&&u.source==="server"?c.reject(new p(m.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):c.resolve(d)},error:d=>c.reject(d)}),h=new Pi(a,l,{includeMetadataChanges:!0,Ka:!0});return vi(i,h)}(await Fr(r),r.asyncQueue,e,t,n)),n.promise}function Tf(r,e,t){const n=new ge;return r.asyncQueue.enqueueAndForget(async()=>{try{const s=await wc(r);n.resolve(async function(o,a,u){var E;const c=w(o),{request:l,gt:h,parent:d}=Ch(c.serializer,nh(a),u);c.connection.Ko||delete l.parent;const _=(await c.jo("RunAggregationQuery",c.serializer.databaseId,d,l,1)).filter(A=>!!A.result);v(_.length===1,64727);const I=(E=_[0].result)==null?void 0:E.aggregateFields;return Object.keys(I).reduce((A,N)=>(A[h[N]]=I[N],A),{})}(s,e,t))}catch(s){n.reject(s)}}),n.promise}function Ef(r,e){const t=new ge;return r.asyncQueue.enqueueAndForget(async()=>Jd(await pf(r),e,t)),t.promise}function wf(r,e,t){const n=new ge;return r.asyncQueue.enqueueAndForget(async()=>{const s=await wc(r);new mf(r.asyncQueue,s,t,e,n).ju()}),n.promise}/**
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
 */function vc(r){const e={};return r.timeoutSeconds!==void 0&&(e.timeoutSeconds=r.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Af="ComponentProvider",oa=new Map;function vf(r,e,t,n,s){return new Gl(r,e,t,s.host,s.ssl,s.experimentalForceLongPolling,s.experimentalAutoDetectLongPolling,vc(s.experimentalLongPollingOptions),s.useFetchStreams,s.isUsingEmulator,n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rf="firestore.googleapis.com",aa=!0;class ua{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new p(m.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=Rf,this.ssl=aa}else this.host=e.host,this.ssl=e.ssl??aa;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=Uu;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<Ku)throw new p(m.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}cl("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=vc(e.experimentalLongPollingOptions??{}),function(n){if(n.timeoutSeconds!==void 0){if(isNaN(n.timeoutSeconds))throw new p(m.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (must not be NaN)`);if(n.timeoutSeconds<5)throw new p(m.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (minimum allowed value is 5)`);if(n.timeoutSeconds>30)throw new p(m.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(n,s){return n.timeoutSeconds===s.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class Fi{constructor(e,t,n,s){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new ua({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new p(m.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new p(m.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new ua(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(n){if(!n)return new el;switch(n.type){case"firstParty":return new rl(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new p(m.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const n=oa.get(t);n&&(g(Af,"Removing Datastore"),oa.delete(t),n.terminate())}(this),Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Re{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new Re(this.firestore,e,this._query)}}class B{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new ze(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new B(this.firestore,e,this._key)}toJSON(){return{type:B._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,n){if(zn(t,B._jsonSchema))return new B(e,n||null,new y(x.fromString(t.referencePath)))}}B._jsonSchemaVersion="firestore/documentReference/1.0",B._jsonSchema={type:Q("string",B._jsonSchemaVersion),referencePath:Q("string")};class ze extends Re{constructor(e,t,n){super(e,t,jn(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new B(this.firestore,null,new y(e))}withConverter(e){return new ze(this.firestore,e,this._path)}}function Yf(r,e,...t){if(r=ce(r),wa("collection","path",e),r instanceof Fi){const n=x.fromString(e,...t);return Yi(n),new ze(r,null,n)}{if(!(r instanceof B||r instanceof ze))throw new p(m.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(x.fromString(e,...t));return Yi(n),new ze(r.firestore,null,n)}}function Vf(r,e,...t){if(r=ce(r),arguments.length===1&&(e=Ks.newId()),wa("doc","path",e),r instanceof Fi){const n=x.fromString(e,...t);return Ji(n),new B(r,null,new y(n))}{if(!(r instanceof B||r instanceof ze))throw new p(m.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(x.fromString(e,...t));return Ji(n),new B(r.firestore,r instanceof ze?r.converter:null,new y(n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ca="AsyncQueue";class la{constructor(e=Promise.resolve()){this.Yu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new yi(this,"async_queue_retry"),this._c=()=>{const n=gr();n&&g(ca,"Visibility state changed to "+n.visibilityState),this.M_.w_()},this.ac=e;const t=gr();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const t=gr();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise(()=>{});const t=new ge;return this.cc(()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Yu.push(e),this.lc()))}async lc(){if(this.Yu.length!==0){try{await this.Yu[0](),this.Yu.shift(),this.M_.reset()}catch(e){if(!Je(e))throw e;g(ca,"Operation failed with retryable error: "+e)}this.Yu.length>0&&this.M_.p_(()=>this.lc())}}cc(e){const t=this.ac.then(()=>(this.rc=!0,e().catch(n=>{throw this.nc=n,this.rc=!1,K("INTERNAL UNHANDLED ERROR: ",ha(n)),n}).then(n=>(this.rc=!1,n))));return this.ac=t,t}enqueueAfterDelay(e,t,n){this.uc(),this.oc.indexOf(e)>-1&&(t=0);const s=wi.createAndSchedule(this,e,t,n,i=>this.hc(i));return this.tc.push(s),s}uc(){this.nc&&T(47125,{Pc:ha(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const t of this.tc)if(t.timerId===e)return!0;return!1}Ec(e){return this.Tc().then(()=>{this.tc.sort((t,n)=>t.targetTimeMs-n.targetTimeMs);for(const t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc()})}Rc(e){this.oc.push(e)}hc(e){const t=this.tc.indexOf(e);this.tc.splice(t,1)}}function ha(r){let e=r.message||"";return r.stack&&(e=r.stack.includes(r.message)?r.stack:r.message+`
`+r.stack),e}class _e extends Fi{constructor(e,t,n,s){super(e,t,n,s),this.type="firestore",this._queue=new la,this._persistenceKey=(s==null?void 0:s.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new la(e),this._firestoreClient=void 0,await e}}}function Xf(r,e,t){t||(t=Ar);const n=Lc(r,"firestore");if(n.isInitialized(t)){const s=n.getImmediate({identifier:t}),i=n.getOptions(t);if(qc(i,e))return s;throw new p(m.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(e.cacheSizeBytes!==void 0&&e.localCache!==void 0)throw new p(m.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(e.cacheSizeBytes!==void 0&&e.cacheSizeBytes!==-1&&e.cacheSizeBytes<Ku)throw new p(m.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return e.host&&pa(e.host)&&Uc(e.host),n.initialize({options:e,instanceIdentifier:t})}function Ze(r){if(r._terminated)throw new p(m.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||Pf(r),r._firestoreClient}function Pf(r){var n,s,i,o;const e=r._freezeSettings(),t=vf(r._databaseId,((n=r._app)==null?void 0:n.options.appId)||"",r._persistenceKey,(s=r._app)==null?void 0:s.options.apiKey,e);r._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((o=e.localCache)!=null&&o._onlineComponentProvider)&&(r._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),r._firestoreClient=new _f(r._authCredentials,r._appCheckCredentials,r._queue,t,r._componentsProvider&&function(u){const c=u==null?void 0:u._online.build();return{_offline:u==null?void 0:u._offline.build(c),_online:c}}(r._componentsProvider))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class he{constructor(e){this._byteString=e}static fromBase64String(e){try{return new he($.fromBase64String(e))}catch(t){throw new p(m.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new he($.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:he._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(zn(e,he._jsonSchema))return he.fromBase64String(e.bytes)}}he._jsonSchemaVersion="firestore/bytes/1.0",he._jsonSchema={type:Q("string",he._jsonSchemaVersion),bytes:Q("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class un{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new p(m.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new z(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}function Zf(){return new un(ys)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ts{constructor(e){this._methodName=e}}/**
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
 */class Ae{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new p(m.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new p(m.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return V(this._lat,e._lat)||V(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:Ae._jsonSchemaVersion}}static fromJSON(e){if(zn(e,Ae._jsonSchema))return new Ae(e.latitude,e.longitude)}}Ae._jsonSchemaVersion="firestore/geoPoint/1.0",Ae._jsonSchema={type:Q("string",Ae._jsonSchemaVersion),latitude:Q("number"),longitude:Q("number")};/**
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
 */class ye{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(n,s){if(n.length!==s.length)return!1;for(let i=0;i<n.length;++i)if(n[i]!==s[i])return!1;return!0}(this._values,e._values)}toJSON(){return{type:ye._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(zn(e,ye._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new ye(e.vectorValues);throw new p(m.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}ye._jsonSchemaVersion="firestore/vectorValue/1.0",ye._jsonSchema={type:Q("string",ye._jsonSchemaVersion),vectorValues:Q("object")};/**
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
 */const Sf=/^__.*__$/;class bf{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return this.fieldMask!==null?new xe(e,this.data,this.fieldMask,t,this.fieldTransforms):new nn(e,this.data,t,this.fieldTransforms)}}class Rc{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return new xe(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function Vc(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw T(40011,{dataSource:r})}}class Mi{constructor(e,t,n,s,i,o){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=s,i===void 0&&this.validatePath(),this.fieldTransforms=i||[],this.fieldMask=o||[]}get path(){return this.settings.path}get dataSource(){return this.settings.dataSource}contextWith(e){return new Mi({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}childContextForField(e){var s;const t=(s=this.path)==null?void 0:s.child(e),n=this.contextWith({path:t,arrayElement:!1});return n.validatePathSegment(e),n}childContextForFieldPath(e){var s;const t=(s=this.path)==null?void 0:s.child(e),n=this.contextWith({path:t,arrayElement:!1});return n.validatePath(),n}childContextForArray(e){return this.contextWith({path:void 0,arrayElement:!0})}createError(e){return Mr(e,this.settings.methodName,this.settings.hasConverter||!1,this.path,this.settings.targetDoc)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}validatePath(){if(this.path)for(let e=0;e<this.path.length;e++)this.validatePathSegment(this.path.get(e))}validatePathSegment(e){if(e.length===0)throw this.createError("Document fields must not be empty");if(Vc(this.dataSource)&&Sf.test(e))throw this.createError('Document fields cannot begin and end with "__"')}}class Cf{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||Yr(e)}createContext(e,t,n,s=!1){return new Mi({dataSource:e,methodName:t,targetDoc:n,path:z.emptyPath(),arrayElement:!1,hasConverter:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function At(r){const e=r._freezeSettings(),t=Yr(r._databaseId);return new Cf(r._databaseId,!!e.ignoreUndefinedProperties,t)}function ns(r,e,t,n,s,i={}){const o=r.createContext(i.merge||i.mergeFields?2:0,e,t,s);Ui("Data must be an object, but it was:",o,n);const a=Sc(n,o);let u,c;if(i.merge)u=new ue(o.fieldMask),c=o.fieldTransforms;else if(i.mergeFields){const l=[];for(const h of i.mergeFields){const d=Tt(e,h,t);if(!o.contains(d))throw new p(m.INVALID_ARGUMENT,`Field '${d}' is specified in your field mask but missing from your input data.`);Dc(l,d)||l.push(d)}u=new ue(l),c=o.fieldTransforms.filter(h=>u.covers(h.field))}else u=null,c=o.fieldTransforms;return new bf(new X(a),u,c)}class rs extends ts{_toFieldTransform(e){if(e.dataSource!==2)throw e.dataSource===1?e.createError(`${this._methodName}() can only appear at the top level of your update data`):e.createError(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof rs}}class Oi extends ts{constructor(e,t){super(e),this.Vc=t}_toFieldTransform(e){const t=new Ht(e.serializer,du(e.serializer,this.Vc));return new pu(e.path,t)}isEqual(e){return e instanceof Oi&&this.Vc===e.Vc}}function Li(r,e,t,n){const s=r.createContext(1,e,t);Ui("Data must be an object, but it was:",s,n);const i=[],o=X.empty();Ye(n,(u,c)=>{const l=Cc(e,u,t);c=ce(c);const h=s.childContextForFieldPath(l);if(c instanceof rs)i.push(l);else{const d=Yn(c,h);d!=null&&(i.push(l),o.set(l,d))}});const a=new ue(i);return new Rc(o,a,s.fieldTransforms)}function qi(r,e,t,n,s,i){const o=r.createContext(1,e,t),a=[Tt(e,n,t)],u=[s];if(i.length%2!=0)throw new p(m.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let d=0;d<i.length;d+=2)a.push(Tt(e,i[d])),u.push(i[d+1]);const c=[],l=X.empty();for(let d=a.length-1;d>=0;--d)if(!Dc(c,a[d])){const _=a[d];let I=u[d];I=ce(I);const E=o.childContextForFieldPath(_);if(I instanceof rs)c.push(_);else{const A=Yn(I,E);A!=null&&(c.push(_),l.set(_,A))}}const h=new ue(c);return new Rc(l,h,o.fieldTransforms)}function Pc(r,e,t,n=!1){return Yn(t,r.createContext(n?4:3,e))}function Yn(r,e){if(bc(r=ce(r)))return Ui("Unsupported field value:",e,r),Sc(r,e);if(r instanceof ts)return function(n,s){if(!Vc(s.dataSource))throw s.createError(`${n._methodName}() can only be used with update() and set()`);if(!s.path)throw s.createError(`${n._methodName}() is not currently supported inside arrays`);const i=n._toFieldTransform(s);i&&s.fieldTransforms.push(i)}(r,e),null;if(r===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),r instanceof Array){if(e.settings.arrayElement&&e.dataSource!==4)throw e.createError("Nested arrays are not supported");return function(n,s){const i=[];let o=0;for(const a of n){let u=Yn(a,s.childContextForArray(o));u==null&&(u={nullValue:"NULL_VALUE"}),i.push(u),o++}return{arrayValue:{values:i}}}(r,e)}return function(n,s){if((n=ce(n))===null)return{nullValue:"NULL_VALUE"};if(typeof n=="number")return du(s.serializer,n);if(typeof n=="boolean")return{booleanValue:n};if(typeof n=="string")return{stringValue:n};if(n instanceof Date){const i=k.fromDate(n);return{timestampValue:Jt(s.serializer,i)}}if(n instanceof k){const i=new k(n.seconds,1e3*Math.floor(n.nanoseconds/1e3));return{timestampValue:Jt(s.serializer,i)}}if(n instanceof Ae)return{geoPointValue:{latitude:n.latitude,longitude:n.longitude}};if(n instanceof he)return{bytesValue:vu(s.serializer,n._byteString)};if(n instanceof B){const i=s.databaseId,o=n.firestore._databaseId;if(!o.isEqual(i))throw s.createError(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${i.projectId}/${i.database}`);return{referenceValue:ui(n.firestore._databaseId||s.databaseId,n._key.path)}}if(n instanceof ye)return function(o,a){const u=o instanceof ye?o.toArray():o;return{mapValue:{fields:{[Ys]:{stringValue:Xs},[Kt]:{arrayValue:{values:u.map(l=>{if(typeof l!="number")throw a.createError("VectorValues must only contain numeric values.");return ni(a.serializer,l)})}}}}}}(n,s);if(ku(n))return n._toProto(s.serializer);throw s.createError(`Unsupported field value: ${Or(n)}`)}(r,e)}function Sc(r,e){const t={};return Ua(r)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Ye(r,(n,s)=>{const i=Yn(s,e.childContextForField(n));i!=null&&(t[n]=i)}),{mapValue:{fields:t}}}function bc(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof k||r instanceof Ae||r instanceof he||r instanceof B||r instanceof ts||r instanceof ye||ku(r))}function Ui(r,e,t){if(!bc(t)||!Aa(t)){const n=Or(t);throw n==="an object"?e.createError(r+" a custom object"):e.createError(r+" "+n)}}function Tt(r,e,t){if((e=ce(e))instanceof un)return e._internalPath;if(typeof e=="string")return Cc(r,e);throw Mr("Field path arguments must be of type string or ",r,!1,void 0,t)}const Df=new RegExp("[~\\*/\\[\\]]");function Cc(r,e,t){if(e.search(Df)>=0)throw Mr(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,t);try{return new un(...e.split("."))._internalPath}catch{throw Mr(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,t)}}function Mr(r,e,t,n,s){const i=n&&!n.isEmpty(),o=s!==void 0;let a=`Function ${e}() called with invalid data`;t&&(a+=" (via `toFirestore()`)"),a+=". ";let u="";return(i||o)&&(u+=" (found",i&&(u+=` in field ${n}`),o&&(u+=` in document ${s}`),u+=")"),new p(m.INVALID_ARGUMENT,a+r+u)}function Dc(r,e){return r.some(t=>t.isEqual(e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xc{convertValue(e,t="none"){switch(Ke(e)){case 0:return null;case 1:return e.booleanValue;case 2:return L(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(Ce(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw T(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return Ye(e,(s,i)=>{n[s]=this.convertValue(i,t)}),n}convertVectorValue(e){var n,s,i;const t=(i=(s=(n=e.fields)==null?void 0:n[Kt].arrayValue)==null?void 0:s.values)==null?void 0:i.map(o=>L(o.doubleValue));return new ye(t)}convertGeoPoint(e){return new Ae(L(e.latitude),L(e.longitude))}convertArray(e,t){return(e.values||[]).map(n=>this.convertValue(n,t))}convertServerTimestamp(e,t){switch(t){case"previous":const n=Gr(e);return n==null?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(xn(e));default:return null}}convertTimestamp(e){const t=be(e);return new k(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=x.fromString(e);v(Nu(n),9688,{name:e});const s=new ft(n.get(1),n.get(3)),i=new y(n.popFirst(5));return s.isEqual(t)||K(`Document ${i} contains a document reference within a different database (${s.projectId}/${s.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),i}}/**
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
 */class Xn extends xc{constructor(e){super(),this.firestore=e}convertBytes(e){return new he(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new B(this.firestore,null,t)}}function em(r){return new Oi("increment",r)}const da="@firebase/firestore",fa="4.10.0";/**
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
 */function ma(r){return function(t,n){if(typeof t!="object"||t===null)return!1;const s=t;for(const i of n)if(i in s&&typeof s[i]=="function")return!0;return!1}(r,["next","error","complete"])}/**
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
 */class xf{constructor(e="count",t){this._internalFieldPath=t,this.type="AggregateField",this.aggregateType=e}}class Nf{constructor(e,t,n){this._userDataWriter=t,this._data=n,this.type="AggregateQuerySnapshot",this.query=e}data(){return this._userDataWriter.convertObjectMap(this._data)}_fieldsProto(){return new X({mapValue:{fields:this._data}}).clone().value.mapValue.fields}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bn{constructor(e,t,n,s,i){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=s,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new B(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new kf(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}_fieldsProto(){var e;return((e=this._document)==null?void 0:e.data.clone().value.mapValue.fields)??void 0}get(e){if(this._document){const t=this._document.data.field(Tt("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class kf extends Bn{data(){return super.data()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nc(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new p(m.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class Bi{}class ss extends Bi{}function tm(r,e,...t){let n=[];e instanceof Bi&&n.push(e),n=n.concat(t),function(i){const o=i.filter(u=>u instanceof zi).length,a=i.filter(u=>u instanceof is).length;if(o>1||o>0&&a>0)throw new p(m.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(n);for(const s of n)r=s._apply(r);return r}class is extends ss{constructor(e,t,n){super(),this._field=e,this._op=t,this._value=n,this.type="where"}static _create(e,t,n){return new is(e,t,n)}_apply(e){const t=this._parse(e);return kc(e._query,t),new Re(e.firestore,e.converter,bs(e._query,t))}_parse(e){const t=At(e.firestore);return function(i,o,a,u,c,l,h){let d;if(c.isKeyField()){if(l==="array-contains"||l==="array-contains-any")throw new p(m.INVALID_ARGUMENT,`Invalid Query. You can't perform '${l}' queries on documentId().`);if(l==="in"||l==="not-in"){ga(h,l);const I=[];for(const E of h)I.push(_a(u,i,E));d={arrayValue:{values:I}}}else d=_a(u,i,h)}else l!=="in"&&l!=="not-in"&&l!=="array-contains-any"||ga(h,l),d=Pc(a,o,h,l==="in"||l==="not-in");return S.create(c,l,d)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function nm(r,e,t){const n=e,s=Tt("where",r);return is._create(s,n,t)}class zi extends Bi{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new zi(e,t)}_parse(e){const t=this._queryConstraints.map(n=>n._parse(e)).filter(n=>n.getFilters().length>0);return t.length===1?t[0]:F.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:(function(s,i){let o=s;const a=i.getFlattenedFilters();for(const u of a)kc(o,u),o=bs(o,u)}(e._query,t),new Re(e.firestore,e.converter,bs(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class Gi extends ss{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new Gi(e,t)}_apply(e){const t=function(s,i,o){if(s.startAt!==null)throw new p(m.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(s.endAt!==null)throw new p(m.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new Fn(i,o)}(e._query,this._field,this._direction);return new Re(e.firestore,e.converter,rh(e._query,t))}}function rm(r,e="asc"){const t=e,n=Tt("orderBy",r);return Gi._create(n,t)}class Ki extends ss{constructor(e,t,n){super(),this.type=e,this._limit=t,this._limitType=n}static _create(e,t,n){return new Ki(e,t,n)}_apply(e){return new Re(e.firestore,e.converter,Vr(e._query,this._limit,this._limitType))}}function sm(r){return ll("limit",r),Ki._create("limit",r,"F")}class $i extends ss{constructor(e,t,n){super(),this.type=e,this._docOrFields=t,this._inclusive=n}static _create(e,t,n){return new $i(e,t,n)}_apply(e){const t=Ff(e,this.type,this._docOrFields,this._inclusive);return new Re(e.firestore,e.converter,sh(e._query,t))}}function im(...r){return $i._create("startAfter",r,!1)}function Ff(r,e,t,n){if(t[0]=ce(t[0]),t[0]instanceof Bn)return function(i,o,a,u,c){if(!u)throw new p(m.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${a}().`);const l=[];for(const h of Ft(i))if(h.field.isKeyField())l.push(mt(o,u.key));else{const d=u.data.field(h.field);if(zr(d))throw new p(m.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+h.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(d===null){const _=h.field.canonicalString();throw new p(m.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${_}' (used as the orderBy) does not exist.`)}l.push(d)}return new je(l,c)}(r._query,r.firestore._databaseId,e,t[0]._document,n);{const s=At(r.firestore);return function(o,a,u,c,l,h){const d=o.explicitOrderBy;if(l.length>d.length)throw new p(m.INVALID_ARGUMENT,`Too many arguments provided to ${c}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const _=[];for(let I=0;I<l.length;I++){const E=l[I];if(d[I].field.isKeyField()){if(typeof E!="string")throw new p(m.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${c}(), but got a ${typeof E}`);if(!ei(o)&&E.indexOf("/")!==-1)throw new p(m.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by documentId(), the value passed to ${c}() must be a plain document ID, but '${E}' contains a slash.`);const A=o.path.child(x.fromString(E));if(!y.isDocumentKey(A))throw new p(m.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${c}() must result in a valid document path, but '${A}' is not because it contains an odd number of segments.`);const N=new y(A);_.push(mt(a,N))}else{const A=Pc(u,c,E);_.push(A)}}return new je(_,h)}(r._query,r.firestore._databaseId,s,e,t,n)}}function _a(r,e,t){if(typeof(t=ce(t))=="string"){if(t==="")throw new p(m.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!ei(e)&&t.indexOf("/")!==-1)throw new p(m.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const n=e.path.child(x.fromString(t));if(!y.isDocumentKey(n))throw new p(m.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return mt(r,new y(n))}if(t instanceof B)return mt(r,t._key);throw new p(m.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${Or(t)}.`)}function ga(r,e){if(!Array.isArray(r)||r.length===0)throw new p(m.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function kc(r,e){const t=function(s,i){for(const o of s)for(const a of o.getFlattenedFilters())if(i.indexOf(a.op)>=0)return a.op;return null}(r.filters,function(s){switch(s){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(t!==null)throw t===e.op?new p(m.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new p(m.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}function os(r,e,t){let n;return n=r?t&&(t.merge||t.mergeFields)?r.toFirestore(e,t):r.toFirestore(e):e,n}class Mf extends xc{constructor(e){super(),this.firestore=e}convertBytes(e){return new he(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new B(this.firestore,null,t)}}function Of(){return new xf("count")}/**
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
 */function om(r){return Lf(r,{count:Of()})}function Lf(r,e){const t=Z(r.firestore,_e),n=Ze(t),s=Bl(e,(i,o)=>new gh(o,i.aggregateType,i._internalFieldPath));return Tf(n,r._query,s).then(i=>function(a,u,c){const l=new Xn(a);return new Nf(u,l,c)}(t,r,i))}class qf{constructor(e){let t;this.kind="persistent",e!=null&&e.tabManager?(e.tabManager._initialize(e),t=e.tabManager):(t=zf(void 0),t._initialize(e)),this._onlineComponentProvider=t._onlineComponentProvider,this._offlineComponentProvider=t._offlineComponentProvider}toJSON(){return{kind:this.kind}}}function am(r){return new qf(r)}class Uf{constructor(e){this.forceOwnership=e,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=Un.provider,this._offlineComponentProvider={build:t=>new Ec(t,e==null?void 0:e.cacheSizeBytes,this.forceOwnership)}}}class Bf{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=Un.provider,this._offlineComponentProvider={build:t=>new df(t,e==null?void 0:e.cacheSizeBytes)}}}function zf(r){return new Uf(r==null?void 0:r.forceOwnership)}function um(){return new Bf}class kt{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class Ge extends Bn{constructor(e,t,n,s,i,o){super(e,t,n,s,o),this._firestore=e,this._firestoreImpl=e,this.metadata=i}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new pr(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(Tt("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new p(m.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=Ge._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}}Ge._jsonSchemaVersion="firestore/documentSnapshot/1.0",Ge._jsonSchema={type:Q("string",Ge._jsonSchemaVersion),bundleSource:Q("string","DocumentSnapshot"),bundleName:Q("string"),bundle:Q("string")};class pr extends Ge{data(e={}){return super.data(e)}}class ht{constructor(e,t,n,s){this._firestore=e,this._userDataWriter=t,this._snapshot=s,this.metadata=new kt(s.hasPendingWrites,s.fromCache),this.query=n}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach(n=>{e.call(t,new pr(this._firestore,this._userDataWriter,n.key,n,new kt(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new p(m.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(s,i){if(s._snapshot.oldDocs.isEmpty()){let o=0;return s._snapshot.docChanges.map(a=>{const u=new pr(s._firestore,s._userDataWriter,a.doc.key,a.doc,new kt(s._snapshot.mutatedKeys.has(a.doc.key),s._snapshot.fromCache),s.query.converter);return a.doc,{type:"added",doc:u,oldIndex:-1,newIndex:o++}})}{let o=s._snapshot.oldDocs;return s._snapshot.docChanges.filter(a=>i||a.type!==3).map(a=>{const u=new pr(s._firestore,s._userDataWriter,a.doc.key,a.doc,new kt(s._snapshot.mutatedKeys.has(a.doc.key),s._snapshot.fromCache),s.query.converter);let c=-1,l=-1;return a.type!==0&&(c=o.indexOf(a.doc.key),o=o.delete(a.doc.key)),a.type!==1&&(o=o.add(a.doc),l=o.indexOf(a.doc.key)),{type:Gf(a.type),doc:u,oldIndex:c,newIndex:l}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new p(m.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=ht._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=Ks.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],n=[],s=[];return this.docs.forEach(i=>{i._document!==null&&(t.push(i._document),n.push(this._userDataWriter.convertObjectMap(i._document.data.value.mapValue.fields,"previous")),s.push(i.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function Gf(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return T(61501,{type:r})}}/**
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
 */ht._jsonSchemaVersion="firestore/querySnapshot/1.0",ht._jsonSchema={type:Q("string",ht._jsonSchemaVersion),bundleSource:Q("string","QuerySnapshot"),bundleName:Q("string"),bundle:Q("string")};const Kf={maxAttempts:5};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $f{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=At(e)}set(e,t,n){this._verifyNotCommitted();const s=Ue(e,this._firestore),i=os(s.converter,t,n),o=ns(this._dataReader,"WriteBatch.set",s._key,i,s.converter!==null,n);return this._mutations.push(o.toMutation(s._key,U.none())),this}update(e,t,n,...s){this._verifyNotCommitted();const i=Ue(e,this._firestore);let o;return o=typeof(t=ce(t))=="string"||t instanceof un?qi(this._dataReader,"WriteBatch.update",i._key,t,n,s):Li(this._dataReader,"WriteBatch.update",i._key,t),this._mutations.push(o.toMutation(i._key,U.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=Ue(e,this._firestore);return this._mutations=this._mutations.concat(new rn(t._key,U.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new p(m.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function Ue(r,e){if((r=ce(r)).firestore!==e)throw new p(m.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jf{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=At(e)}get(e){const t=Ue(e,this._firestore),n=new Mf(this._firestore);return this._transaction.lookup([t._key]).then(s=>{if(!s||s.length!==1)return T(24041);const i=s[0];if(i.isFoundDocument())return new Bn(this._firestore,n,i.key,i,t.converter);if(i.isNoDocument())return new Bn(this._firestore,n,t._key,null,t.converter);throw T(18433,{doc:i})})}set(e,t,n){const s=Ue(e,this._firestore),i=os(s.converter,t,n),o=ns(this._dataReader,"Transaction.set",s._key,i,s.converter!==null,n);return this._transaction.set(s._key,o),this}update(e,t,n,...s){const i=Ue(e,this._firestore);let o;return o=typeof(t=ce(t))=="string"||t instanceof un?qi(this._dataReader,"Transaction.update",i._key,t,n,s):Li(this._dataReader,"Transaction.update",i._key,t),this._transaction.update(i._key,o),this}delete(e){const t=Ue(e,this._firestore);return this._transaction.delete(t._key),this}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qf extends jf{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=Ue(e,this._firestore),n=new Xn(this._firestore);return super.get(e).then(s=>new Ge(this._firestore,n,t._key,s._document,new kt(!1,!1),t.converter))}}function cm(r,e,t){r=Z(r,_e);const n={...Kf,...t};(function(o){if(o.maxAttempts<1)throw new p(m.INVALID_ARGUMENT,"Max attempts must be at least 1")})(n);const s=Ze(r);return wf(s,i=>e(new Qf(r,i)),n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lm(r){r=Z(r,B);const e=Z(r.firestore,_e),t=Ze(e);return Ac(t,r._key).then(n=>ji(e,r,n))}function hm(r){r=Z(r,B);const e=Z(r.firestore,_e),t=Ze(e);return Ac(t,r._key,{source:"server"}).then(n=>ji(e,r,n))}function dm(r){r=Z(r,Re);const e=Z(r.firestore,_e),t=Ze(e),n=new Xn(e);return Nc(r._query),If(t,r._query).then(s=>new ht(e,n,r,s))}function fm(r,e,t){r=Z(r,B);const n=Z(r.firestore,_e),s=os(r.converter,e,t),i=At(n);return Zn(n,[ns(i,"setDoc",r._key,s,r.converter!==null,t).toMutation(r._key,U.none())])}function mm(r,e,t,...n){r=Z(r,B);const s=Z(r.firestore,_e),i=At(s);let o;return o=typeof(e=ce(e))=="string"||e instanceof un?qi(i,"updateDoc",r._key,e,t,n):Li(i,"updateDoc",r._key,e),Zn(s,[o.toMutation(r._key,U.exists(!0))])}function _m(r){return Zn(Z(r.firestore,_e),[new rn(r._key,U.none())])}function gm(r,e){const t=Z(r.firestore,_e),n=Vf(r),s=os(r.converter,e),i=At(r.firestore);return Zn(t,[ns(i,"addDoc",n._key,s,r.converter!==null,{}).toMutation(n._key,U.exists(!1))]).then(()=>n)}function pm(r,...e){var c,l,h;r=ce(r);let t={includeMetadataChanges:!1,source:"default"},n=0;typeof e[n]!="object"||ma(e[n])||(t=e[n++]);const s={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(ma(e[n])){const d=e[n];e[n]=(c=d.next)==null?void 0:c.bind(d),e[n+1]=(l=d.error)==null?void 0:l.bind(d),e[n+2]=(h=d.complete)==null?void 0:h.bind(d)}let i,o,a;if(r instanceof B)o=Z(r.firestore,_e),a=jn(r._key.path),i={next:d=>{e[n]&&e[n](ji(o,r,d))},error:e[n+1],complete:e[n+2]};else{const d=Z(r,Re);o=Z(d.firestore,_e),a=d._query;const _=new Xn(o);i={next:I=>{e[n]&&e[n](new ht(o,_,d,I))},error:e[n+1],complete:e[n+2]},Nc(r._query)}const u=Ze(o);return yf(u,a,s,i)}function Zn(r,e){const t=Ze(r);return Ef(t,e)}function ji(r,e,t){const n=t.docs.get(e._key),s=new Xn(r);return new Ge(r,s,e._key,n,new kt(t.hasPendingWrites,t.fromCache),e.converter)}function ym(r){return r=Z(r,_e),Ze(r),new $f(r,e=>Zn(r,e))}(function(e,t=!0){Xc(Yc),Hc(new Jc("firestore",(n,{instanceIdentifier:s,options:i})=>{const o=n.getProvider("app").getImmediate(),a=new _e(new tl(n.getProvider("auth-internal")),new sl(o,n.getProvider("app-check-internal")),Kl(o,s),o);return i={useFetchStreams:t,...i},a._setSettings(i),a},"PUBLIC").setMultipleInstances(!0)),Wi(da,fa,e),Wi(da,fa,"esm2020")})();export{k as T,zf as a,um as b,rm as c,Vf as d,Yf as e,Zf as f,dm as g,fm as h,Xf as i,ym as j,_m as k,sm as l,em as m,hm as n,pm as o,am as p,tm as q,cm as r,im as s,gm as t,mm as u,lm as v,nm as w,om as x};
