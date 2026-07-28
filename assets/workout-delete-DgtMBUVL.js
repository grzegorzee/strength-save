import{c as a,aQ as c,w as o,V as s}from"./index-S1tEjfK8.js";import{N as n,w as i}from"./firebase-JgXUb3gu.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=a("StickyNote",[["path",{d:"M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z",key:"qazsjp"}],["path",{d:"M15 3v4a2 2 0 0 0 2 2h4",key:"40519r"}]]),u="workouts",y=()=>!1,k=async(t,r)=>{try{y()||await n(i(c,u,r));try{await o.clearActiveDraft(t,r)}catch{}try{s.remove(t,r)}catch{}return{success:!0}}catch(e){return console.error("[deleteWorkoutEverywhere] Error:",e),{success:!1,error:e instanceof Error?e.message:String(e)}}};export{f as S,k as d};
