import{s as o}from"./index-Cs4lLxl0.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=o("Cloud",[["path",{d:"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z",key:"p7xjir"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=o("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]),i=s=>({reps:Math.max(0,Math.min(999,Math.round(Number(s.reps)||0))),weight:Math.max(0,Math.min(999,Math.round((Number(s.weight)||0)*2)/2)),completed:!!s.completed,...s.isWarmup&&{isWarmup:!0}}),n=(s,t)=>{const e=i(s),r=i(t);return e.reps===r.reps&&e.weight===r.weight&&e.completed===r.completed&&!!e.isWarmup==!!r.isWarmup},m=(s,t={})=>({completed:!!t.completed,exercises:s.map(e=>({exerciseId:e.exerciseId,sets:e.sets.map(i)}))}),p=(s,t)=>{if(!s)return{ok:!1,reason:"missing-workout"};if(t.completed&&s.completed!==!0)return{ok:!1,reason:"not-completed"};if(t.completed&&t.exercises.length===0)return{ok:!1,reason:"empty-final-payload"};if(t.exercises.length>0&&s.exercises.length===0)return{ok:!1,reason:"missing-exercises"};for(const e of t.exercises){const r=s.exercises.find(a=>a.exerciseId===e.exerciseId);if(!r)return{ok:!1,reason:`missing-exercise:${e.exerciseId}`};if(r.sets.length<e.sets.length)return{ok:!1,reason:`missing-sets:${e.exerciseId}`};for(let a=0;a<e.sets.length;a+=1)if(!n(r.sets[a],e.sets[a]))return{ok:!1,reason:`set-mismatch:${e.exerciseId}:${a+1}`}}return{ok:!0}};export{l as C,d as R,m as b,p as v};
