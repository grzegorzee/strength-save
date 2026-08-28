import{c as R,b0 as z,F as L,w as W,z as O}from"./index-ClA__RzM.js";import{_ as C}from"./firebase-DdLkZA3K.js";import{ct as A,bk as T,bI as _,cu as D,bJ as H}from"./AuthenticatedApp-BeM-woqC.js";import{r as l}from"./react-vendor-DuJroiHx.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=R("CalendarRange",[["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M17 14h-6",key:"bkmgh3"}],["path",{d:"M13 18H7",key:"bb0bb7"}],["path",{d:"M7 14h.01",key:"1qa3f1"}],["path",{d:"M17 18h.01",key:"1bdyru"}]]),J=(e,a)=>{const o=A(e,12,a),i=o.reduce((s,t)=>({workoutCount:s.workoutCount+t.workoutCount,workoutsWithDuration:s.workoutsWithDuration+t.workoutsWithDuration,totalDurationSec:s.totalDurationSec+t.totalDurationSec,totalTonnageKg:s.totalTonnageKg+t.totalTonnageKg}),{workoutCount:0,workoutsWithDuration:0,totalDurationSec:0,totalTonnageKg:0});return{monthly:o,totals:i}},c=e=>e.replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]),P=(e,a)=>{const o=W(`${e}-01`).toLocaleDateString(L(a),{month:"long",year:"numeric"});return o.charAt(0).toUpperCase()+o.slice(1)},K=(e,a,o,i,s)=>{const t=(n,r)=>O(a,n,r),g=e.monthly.map(n=>{const r=n.workoutCount-n.workoutsWithDuration;return`
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;">${c(P(n.monthKey,a))}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${n.workoutCount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${T(n.totalDurationSec)}${r>0?`<div style="font-size:11px;color:#777;">${c(t("analytics.months.noTime",{n:r}))}</div>`:""}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${c(_(n.totalTonnageKg,o))}</td>
      </tr>`}).join("");return`
  <div style="width:794px;background:#ffffff;color:#111111;font-family:'Inter',-apple-system,sans-serif;padding:48px;box-sizing:border-box;">
    <div style="border-left:6px solid ${z().hex};padding-left:16px;margin-bottom:8px;">
      <div style="font-size:26px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${c(t("report.title"))}</div>
      <div style="font-size:12px;color:#555;">Strength Save · ${c(i)} · ${c(s.toLocaleDateString(L(a)))}</div>
    </div>
    <div style="display:flex;gap:24px;margin:24px 0;">
      <div><div style="font-size:22px;font-weight:700;">${e.totals.workoutCount}</div><div style="font-size:11px;color:#555;">${c(t("report.totalWorkouts"))}</div></div>
      <div><div style="font-size:22px;font-weight:700;">${T(e.totals.totalDurationSec)}</div><div style="font-size:11px;color:#555;">${c(t("report.totalTime"))}</div></div>
      <div><div style="font-size:22px;font-weight:700;">${c(_(e.totals.totalTonnageKg,o))}</div><div style="font-size:11px;color:#555;">${c(t("report.totalTonnage"))}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="text-align:left;">
          <th style="padding:8px 12px;border-bottom:2px solid #111;">${c(t("analytics.months.title"))}</th>
          <th style="padding:8px 12px;border-bottom:2px solid #111;text-align:right;">${c(t("report.colWorkouts"))}</th>
          <th style="padding:8px 12px;border-bottom:2px solid #111;text-align:right;">${c(t("report.colTime"))}</th>
          <th style="padding:8px 12px;border-bottom:2px solid #111;text-align:right;">${c(t("report.colTonnage"))}</th>
        </tr>
      </thead>
      <tbody>${g}</tbody>
    </table>
  </div>`},Y=async(e,a,o,i,s)=>{const[{default:t},{jsPDF:g}]=await Promise.all([C(()=>import("./html2canvas.esm-QH1iLAAe.js"),[]),C(()=>import("./jspdf.es.min-pF9s6b40.js").then(r=>r.j),[])]),n=document.createElement("div");n.style.cssText="position:fixed;left:-9999px;top:0;",n.innerHTML=K(e,a,o,i,s),document.body.appendChild(n);try{const r=await t(n.firstElementChild,{scale:2,useCORS:!0,backgroundColor:"#ffffff"}),u=new g({unit:"pt",format:"a4"}),f=u.internal.pageSize.getWidth(),m=u.internal.pageSize.getHeight(),y=Math.floor(r.width/f*m);let h=0,b=0;for(;h<r.height;){const d=Math.min(y,r.height-h),v=document.createElement("canvas");v.width=r.width,v.height=d;const k=v.getContext("2d");k.fillStyle="#ffffff",k.fillRect(0,0,v.width,v.height),k.drawImage(r,0,h,r.width,d,0,0,r.width,d),b>0&&u.addPage(),u.addImage(v.toDataURL("image/png"),"PNG",0,0,f,d/r.width*f),h+=d,b+=1}return u.output("blob")}finally{document.body.removeChild(n)}},q=(e,a)=>{const o=a.fromDate,i=a.toDate,s=a.completed,t=a.pageSize,[g,n]=l.useState([]),[r,u]=l.useState(null),[f,m]=l.useState(!1),[y,h]=l.useState(!1),[b,d]=l.useState(null),[v,k]=l.useState(0),$=l.useMemo(()=>JSON.stringify({userId:e,fromDate:o??"",toDate:i??"",completed:s,pageSize:t}),[s,o,t,i,e]);l.useEffect(()=>{let p=!1,w=!1,S=!1;return m(!1),d(null),n([]),u(null),D(e,{fromDate:o,toDate:i,completed:s,pageSize:t,source:"cache"}).then(x=>{p||w||x.cacheMiss||(S=!0,n(x.workouts),u(x.nextCursor),m(!0))}).catch(()=>{}),D(e,{fromDate:o,toDate:i,completed:s,pageSize:t}).then(x=>{p||(w=!0,n(x.workouts),u(x.nextCursor),m(!0))}).catch(x=>{p||(w=!0,S||d(x instanceof Error?x.message:"WORKOUT_HISTORY_LOAD_FAILED"),m(!0))}),()=>{p=!0}},[v,s,o,$,t,i,e]);const M=l.useCallback(()=>{k(p=>p+1)},[]),E=l.useCallback(async()=>{if(!(!r||y)){h(!0);try{const p=await D(e,{fromDate:o,toDate:i,completed:s,pageSize:t,cursor:r});n(w=>[...w,...p.workouts]),u(p.nextCursor)}catch(p){d(p instanceof Error?p.message:"WORKOUT_HISTORY_LOAD_MORE_FAILED")}finally{h(!1)}}},[s,o,y,r,t,i,e]);return{workouts:g,isLoaded:f,isLoadingMore:y,hasMore:r!==null,loadMore:E,error:b,retry:M}},G=(e,a)=>{const o=a.fromDate,i=a.toDate,s=a.completed,t=a.pageSize,g=a.maxPages,[n,r]=l.useState([]),[u,f]=l.useState(!1),[m,y]=l.useState(null),h=l.useMemo(()=>JSON.stringify({userId:e,fromDate:o,toDate:i,completed:s,pageSize:t,maxPages:g}),[s,o,g,t,i,e]);return l.useEffect(()=>{let b=!1;return f(!1),y(null),H(e,{fromDate:o,toDate:i,completed:s,pageSize:t,maxPages:g}).then(d=>{b||(r(d),f(!0))}).catch(d=>{b||(y(d instanceof Error?d.message:"WORKOUT_RANGE_LOAD_FAILED"),f(!0))}),()=>{b=!0}},[s,o,h,g,t,i,e]),{workouts:n,isLoaded:u,error:m}};export{j as C,G as a,J as b,Y as g,q as u};
