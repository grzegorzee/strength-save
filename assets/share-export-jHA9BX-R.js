import{c}from"./index-DeqdHxb7.js";import{C as n}from"./firebase-x-xAugvr.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s=c("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]),d=a=>{var e;try{return((e=navigator.canShare)==null?void 0:e.call(navigator,{files:[a]}))===!0}catch{return!1}},l=async(a,e,r)=>{try{return await navigator.share({title:e,files:[a]}),"shared"}catch(t){return t instanceof Error&&t.name==="AbortError"?"aborted":(r==null||r(t),"failed")}},u=a=>{const e=URL.createObjectURL(a),r=document.createElement("a");return r.href=e,r.download=a.name,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(e),"downloaded"},y=async(a,e)=>((e==null?void 0:e.preferShare)===!0||n.isNativePlatform())&&d(a)?l(a,(e==null?void 0:e.title)??a.name,e==null?void 0:e.onShareError):u(a);export{s as D,y as s};
