import{c as o,z as a}from"./index-DaIzuDtB.js";import{Q as c,o as s}from"./firebase-t6phkPit.js";import{w as n,L as i}from"./AuthenticatedApp-C8P2Pcg4.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=o("StickyNote",[["path",{d:"M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z",key:"qazsjp"}],["path",{d:"M15 3v4a2 2 0 0 0 2 2h4",key:"40519r"}]]),u="workouts",y=()=>!1,m=async(t,r)=>{try{y()||await c(s(a,u,r));try{await n.clearActiveDraft(t,r)}catch{}try{i.remove(t,r)}catch{}return{success:!0}}catch(e){return console.error("[deleteWorkoutEverywhere] Error:",e),{success:!1,error:e instanceof Error?e.message:String(e)}}};export{k as S,m as d};
