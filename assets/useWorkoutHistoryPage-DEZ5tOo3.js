import{c as L,aN as $,E,w as M,y as R}from"./index-BGInrQ0j.js";import{_ as C}from"./firebase-CGXcQQ5j.js";import{bE as W,aY as T,ba as _,bD as D,bb as z}from"./AuthenticatedApp-D3KKlaeZ.js";import{r as c}from"./react-vendor-Cbk7Ekcs.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=L("CalendarRange",[["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M17 14h-6",key:"bkmgh3"}],["path",{d:"M13 18H7",key:"bb0bb7"}],["path",{d:"M7 14h.01",key:"1qa3f1"}],["path",{d:"M17 18h.01",key:"1bdyru"}]]),U=(e,a)=>{const o=W(e,12,a),i=o.reduce((s,t)=>({workoutCount:s.workoutCount+t.workoutCount,workoutsWithDuration:s.workoutsWithDuration+t.workoutsWithDuration,totalDurationSec:s.totalDurationSec+t.totalDurationSec,totalTonnageKg:s.totalTonnageKg+t.totalTonnageKg}),{workoutCount:0,workoutsWithDuration:0,totalDurationSec:0,totalTonnageKg:0});return{monthly:o,totals:i}},d=e=>e.replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]),O=(e,a)=>{const o=M(`${e}-01`).toLocaleDateString(E(a),{month:"long",year:"numeric"});return o.charAt(0).toUpperCase()+o.slice(1)},A=(e,a,o,i,s)=>{const t=(n,r)=>R(a,n,r),p=e.monthly.map(n=>{const r=n.workoutCount-n.workoutsWithDuration;return`
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;">${d(O(n.monthKey,a))}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${n.workoutCount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${T(n.totalDurationSec)}${r>0?`<div style="font-size:9px;color:#777;">${d(t("analytics.months.noTime",{n:r}))}</div>`:""}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${d(_(n.totalTonnageKg,o))}</td>
      </tr>`}).join("");return`
  <div style="width:794px;background:#ffffff;color:#111111;font-family:'Inter',-apple-system,sans-serif;padding:48px;box-sizing:border-box;">
    <div style="border-left:6px solid ${$().hex};padding-left:16px;margin-bottom:8px;">
      <div style="font-size:26px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${d(t("report.title"))}</div>
      <div style="font-size:12px;color:#555;">Strength Save · ${d(i)} · ${d(s.toLocaleDateString(E(a)))}</div>
    </div>
    <div style="display:flex;gap:24px;margin:24px 0;">
      <div><div style="font-size:22px;font-weight:700;">${e.totals.workoutCount}</div><div style="font-size:11px;color:#555;">${d(t("report.totalWorkouts"))}</div></div>
      <div><div style="font-size:22px;font-weight:700;">${T(e.totals.totalDurationSec)}</div><div style="font-size:11px;color:#555;">${d(t("report.totalTime"))}</div></div>
      <div><div style="font-size:22px;font-weight:700;">${d(_(e.totals.totalTonnageKg,o))}</div><div style="font-size:11px;color:#555;">${d(t("report.totalTonnage"))}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="text-align:left;">
          <th style="padding:8px 12px;border-bottom:2px solid #111;">${d(t("analytics.months.title"))}</th>
          <th style="padding:8px 12px;border-bottom:2px solid #111;text-align:right;">${d(t("report.colWorkouts"))}</th>
          <th style="padding:8px 12px;border-bottom:2px solid #111;text-align:right;">${d(t("report.colTime"))}</th>
          <th style="padding:8px 12px;border-bottom:2px solid #111;text-align:right;">${d(t("report.colTonnage"))}</th>
        </tr>
      </thead>
      <tbody>${p}</tbody>
    </table>
  </div>`},F=async(e,a,o,i,s)=>{const[{default:t},{jsPDF:p}]=await Promise.all([C(()=>import("./html2canvas.esm-CBrSDip1.js"),[]),C(()=>import("./jspdf.es.min-BuWfX7-v.js").then(r=>r.j),[])]),n=document.createElement("div");n.style.cssText="position:fixed;left:-9999px;top:0;",n.innerHTML=A(e,a,o,i,s),document.body.appendChild(n);try{const r=await t(n.firstElementChild,{scale:2,useCORS:!0,backgroundColor:"#ffffff"}),u=new p({unit:"pt",format:"a4"}),f=u.internal.pageSize.getWidth(),m=u.internal.pageSize.getHeight(),y=Math.floor(r.width/f*m);let h=0,b=0;for(;h<r.height;){const l=Math.min(y,r.height-h),v=document.createElement("canvas");v.width=r.width,v.height=l;const k=v.getContext("2d");k.fillStyle="#ffffff",k.fillRect(0,0,v.width,v.height),k.drawImage(r,0,h,r.width,l,0,0,r.width,l),b>0&&u.addPage(),u.addImage(v.toDataURL("image/png"),"PNG",0,0,f,l/r.width*f),h+=l,b+=1}return u.output("blob")}finally{document.body.removeChild(n)}},Y=(e,a)=>{const o=a.fromDate,i=a.toDate,s=a.completed,t=a.pageSize,[p,n]=c.useState([]),[r,u]=c.useState(null),[f,m]=c.useState(!1),[y,h]=c.useState(!1),[b,l]=c.useState(null),v=c.useMemo(()=>JSON.stringify({userId:e,fromDate:o??"",toDate:i??"",completed:s,pageSize:t}),[s,o,t,i,e]);c.useEffect(()=>{let g=!1,w=!1,S=!1;return m(!1),l(null),n([]),u(null),D(e,{fromDate:o,toDate:i,completed:s,pageSize:t,source:"cache"}).then(x=>{g||w||x.cacheMiss||(S=!0,n(x.workouts),u(x.nextCursor),m(!0))}).catch(()=>{}),D(e,{fromDate:o,toDate:i,completed:s,pageSize:t}).then(x=>{g||(w=!0,n(x.workouts),u(x.nextCursor),m(!0))}).catch(x=>{g||(w=!0,S||l(x instanceof Error?x.message:"WORKOUT_HISTORY_LOAD_FAILED"),m(!0))}),()=>{g=!0}},[s,o,v,t,i,e]);const k=c.useCallback(async()=>{if(!(!r||y)){h(!0);try{const g=await D(e,{fromDate:o,toDate:i,completed:s,pageSize:t,cursor:r});n(w=>[...w,...g.workouts]),u(g.nextCursor)}catch(g){l(g instanceof Error?g.message:"WORKOUT_HISTORY_LOAD_MORE_FAILED")}finally{h(!1)}}},[s,o,y,r,t,i,e]);return{workouts:p,isLoaded:f,isLoadingMore:y,hasMore:r!==null,loadMore:k,error:b}},j=(e,a)=>{const o=a.fromDate,i=a.toDate,s=a.completed,t=a.pageSize,p=a.maxPages,[n,r]=c.useState([]),[u,f]=c.useState(!1),[m,y]=c.useState(null),h=c.useMemo(()=>JSON.stringify({userId:e,fromDate:o,toDate:i,completed:s,pageSize:t,maxPages:p}),[s,o,p,t,i,e]);return c.useEffect(()=>{let b=!1;return f(!1),y(null),z(e,{fromDate:o,toDate:i,completed:s,pageSize:t,maxPages:p}).then(l=>{b||(r(l),f(!0))}).catch(l=>{b||(y(l instanceof Error?l.message:"WORKOUT_RANGE_LOAD_FAILED"),f(!0))}),()=>{b=!0}},[s,o,h,p,t,i,e]),{workouts:n,isLoaded:u,error:m}};export{N as C,j as a,U as b,F as g,Y as u};
