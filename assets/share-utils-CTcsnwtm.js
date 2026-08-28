import{_ as S}from"./firebase-DdLkZA3K.js";import{b0 as j,w as y,F as u,z as s,e as z}from"./index-B4A79kd5.js";import{bI as b}from"./AuthenticatedApp-BPTuIppF.js";import{e as t}from"./haptics-BgEN-ZgZ.js";const w={width:1080,height:1920};async function E(e){const i=(r,o,c)=>{const v=Math.min(1,w.width/r,w.height/o),a=document.createElement("canvas");a.width=Math.max(1,Math.round(r*v)),a.height=Math.max(1,Math.round(o*v));const x=a.getContext("2d");if(!x)throw new Error("canvas-2d-unavailable");return x.drawImage(c,0,0,a.width,a.height),a.toDataURL("image/jpeg",.8)};if(typeof createImageBitmap=="function"){const r=await createImageBitmap(e,{imageOrientation:"from-image"});try{return i(r.width,r.height,r)}finally{r.close()}}const n=URL.createObjectURL(e);try{const r=new Image;return r.src=n,await r.decode(),i(r.naturalWidth,r.naturalHeight,r)}finally{URL.revokeObjectURL(n)}}function $(e){return`
      <div style="margin-top:auto;padding-top:20px;${e?"border-top:1px solid rgba(255,255,255,0.1);":""}display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="${z}" style="width:28px;height:28px;border-radius:6px;" />
          <span style="font-size:13px;color:#94a3b8;">Strength Save</span>
        </div>
      </div>`}function D(e,i,n,r="gradient"){if(r==="minimal")return M(e,i,n);const o=t(e.dayName),c=t(y(e.date).toLocaleDateString(u(i),{weekday:"long",day:"numeric",month:"long",year:"numeric"})),v=b(e.tonnage,n),a=e.exercises.slice(0,6).map(p=>{const d=t(p.name),l=t(p.sets);return`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <span style="font-size:14px;">${d}</span>
      <span style="font-size:14px;color:#94a3b8;">${l}</span>
    </div>`}).join(""),x=e.exercises.length>6?`<div style="font-size:13px;color:#94a3b8;padding-top:8px;">${t(s(i,"share.more",{n:e.exercises.length-6}))}</div>`:"",g=e.prs.map(p=>`<div style="font-size:14px;margin-bottom:4px;"><span style="font-weight:800;letter-spacing:0.08em;">PR</span> · ${t(p)}</div>`).join(""),h=e.prs.length>0?`<div style="margin-top:16px;">${g}</div>`:"";return`
    <div style="
      width:540px;height:960px;
      background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);
      color:#fff;font-family:system-ui,-apple-system,sans-serif;
      padding:48px 36px;display:flex;flex-direction:column;
    ">
      <div style="margin-bottom:auto;">
        <div style="font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;">${t(s(i,"share.workoutDone"))}</div>
        <div style="font-size:32px;font-weight:800;margin-top:8px;">${o}</div>
        <div style="font-size:16px;color:#94a3b8;margin-top:4px;">${c}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0;">
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${v}</div>
          <div style="font-size:12px;color:#94a3b8;">${t(s(i,"share.tonnage"))}</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${e.exercises.length}</div>
          <div style="font-size:12px;color:#94a3b8;">${t(s(i,"share.exercises"))}</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${t(e.duration||"—")}</div>
          <div style="font-size:12px;color:#94a3b8;">${t(s(i,"share.duration"))}</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${e.prs.length}</div>
          <div style="font-size:12px;color:#94a3b8;">${t(s(i,"share.newPRs"))}</div>
        </div>
      </div>

      <div style="margin-bottom:auto;">
        ${a}
        ${x}
      </div>

      ${h}

      ${$(!0)}
    </div>
  `}const R="#cefc22";function L(e,i,n,r="tonnage",o=R){const c=(()=>{const l=/^#?([0-9a-f]{6})$/i.exec(o);if(!l)return"206,252,34";const f=parseInt(l[1],16);return`${f>>16&255},${f>>8&255},${f&255}`})(),v=t(e.dayName),a=t(y(e.date).toLocaleDateString(u(i),{day:"numeric",month:"long"})),x=t(b(e.tonnage,n)),g=r==="pr"&&e.prs.length===0||r==="duration"&&!e.duration?"tonnage":r,h=g==="pr"?`
        <div style="display:inline-block;background:${o};color:#0b0b0f;border-radius:999px;padding:4px 14px;font-size:13px;font-weight:800;letter-spacing:1px;">PR</div>
        <div style="font-size:34px;font-weight:800;color:${o};margin-top:12px;line-height:1.2;">${t(e.prs[0])}</div>`:g==="duration"?`
        <div style="font-size:68px;font-weight:800;color:${o};letter-spacing:-2px;line-height:1;">${t(e.duration)}</div>
        <div style="font-size:13px;color:#8b93a1;margin-top:10px;text-transform:uppercase;letter-spacing:2px;">${t(s(i,"share.duration"))}</div>`:`
      <div style="font-size:68px;font-weight:800;color:${o};letter-spacing:-2px;line-height:1;">${x}</div>
      <div style="font-size:13px;color:#8b93a1;margin-top:10px;text-transform:uppercase;letter-spacing:2px;">${t(s(i,"share.tonnage"))}</div>`,p=(l,f,m)=>`
    <div style="flex:1;text-align:center;${m?"border-left:1px solid rgba(255,255,255,0.12);":""}">
      <div style="font-size:22px;font-weight:700;color:#fff;">${l}</div>
      <div style="font-size:11px;color:#8b93a1;margin-top:2px;text-transform:uppercase;letter-spacing:1px;">${f}</div>
    </div>`,d=e.week&&e.week.total>0?`
      <div style="margin-top:26px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#8b93a1;margin-bottom:6px;">
          <span>${t(s(i,"share.weekProgress",{current:e.week.current,total:e.week.total}))}</span>
        </div>
        <div style="height:6px;border-radius:999px;background:rgba(255,255,255,0.12);overflow:hidden;">
          <div style="height:100%;width:${Math.max(0,Math.min(100,Math.round(e.week.current/e.week.total*100)))}%;background:${o};"></div>
        </div>
      </div>`:"";return`
    <div style="
      width:540px;height:960px;position:relative;overflow:hidden;
      background:#07080a;color:#fff;font-family:system-ui,-apple-system,sans-serif;
    ">
      <div style="position:absolute;top:-160px;right:-160px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle, rgba(${c},0.22) 0%, rgba(${c},0) 70%);"></div>
      <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;padding:88px 32px;">
        <div style="
          background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
          border-radius:24px;padding:30px 28px;display:flex;flex-direction:column;margin:auto 0;
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${z}" style="width:22px;height:22px;border-radius:5px;opacity:0.85;" />
              <span style="font-size:12px;color:#8b93a1;">Strength Save</span>
            </div>
            <span style="font-size:12px;color:#8b93a1;">${v}, ${a}</span>
          </div>

          <div style="text-align:center;margin:44px 0;">
            ${h}
          </div>

          <div style="display:flex;">
            ${(g==="duration"?[[x,s(i,"share.tonnage")],[String(e.completedSets??0),s(i,"share.sets")],[String(e.exercises.length),s(i,"share.exercises")]]:g==="pr"?[[x,s(i,"share.tonnage")],[t(e.duration||"—"),s(i,"share.duration")],[String(e.exercises.length),s(i,"share.exercises")]]:[[t(e.duration||"—"),s(i,"share.duration")],[String(e.completedSets??0),s(i,"share.sets")],[String(e.exercises.length),s(i,"share.exercises")]]).map(([f,m],k)=>p(f,t(m),k>0)).join("")}
          </div>

          ${(()=>{if(e.exercises.length===0)return"";const l=e.exercises.slice(0,3).map(m=>`
            <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="font-size:13px;color:#e2e8f0;">${t(m.name)}</span>
              <span style="font-size:13px;color:#8b93a1;">${t(m.sets)}</span>
            </div>`).join(""),f=e.exercises.length>3?`<div style="font-size:12px;color:#8b93a1;padding-top:7px;">${t(s(i,"share.more",{n:e.exercises.length-3}))}</div>`:"";return`<div style="margin-top:26px;">${l}${f}</div>`})()}

          ${d}
        </div>

        <div style="text-align:center;font-size:12px;color:#8b93a1;letter-spacing:1px;">strengthsave.app</div>
      </div>
    </div>
  `}function M(e,i,n){const r=t(e.dayName),o=t(y(e.date).toLocaleDateString(u(i),{weekday:"long",day:"numeric",month:"long",year:"numeric"})),c=b(e.tonnage,n);return`
    <div style="
      width:540px;height:960px;
      background:#0b0b0f;
      color:#fff;font-family:system-ui,-apple-system,sans-serif;
      padding:48px 36px;display:flex;flex-direction:column;
    ">
      <div>
        <div style="font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;">${t(s(i,"share.workoutDone"))}</div>
        <div style="font-size:30px;font-weight:800;margin-top:8px;">${r}</div>
        <div style="font-size:15px;color:#94a3b8;margin-top:4px;">${o}</div>
      </div>

      <div style="margin:auto 0;text-align:center;">
        <div style="font-size:76px;font-weight:800;letter-spacing:-2px;line-height:1;">${c}</div>
        <div style="font-size:14px;color:#94a3b8;margin-top:10px;text-transform:uppercase;letter-spacing:2px;">${t(s(i,"share.tonnage"))}</div>
        <div style="display:flex;justify-content:center;gap:24px;margin-top:36px;font-size:15px;color:#cbd5e1;">
          <span>${t(e.duration||"—")} · ${t(s(i,"share.duration"))}</span>
          <span>${e.exercises.length} · ${t(s(i,"share.exercises"))}</span>
          <span>${e.prs.length} · ${t(s(i,"share.newPRs"))}</span>
        </div>
      </div>

      ${$(!0)}
    </div>
  `}function P(e,i,n,r,o=.35){const c=t(e.dayName),v=t(y(e.date).toLocaleDateString(u(n),{weekday:"long",day:"numeric",month:"long",year:"numeric"})),a=b(e.tonnage,r),x=e.exercises.slice(0,3).map(p=>{const d=t(p.name),l=t(p.sets);return`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
      <span style="font-size:13px;">${d}</span>
      <span style="font-size:13px;color:rgba(255,255,255,0.7);">${l}</span>
    </div>`}).join(""),g=e.exercises.length>3?`<div style="font-size:12px;color:rgba(255,255,255,0.6);padding-top:6px;">${t(s(n,"share.more",{n:e.exercises.length-3}))}</div>`:"",h=e.prs.slice(0,3).map(p=>`<span style="background:rgba(245,158,11,0.3);border:1px solid rgba(245,158,11,0.5);border-radius:6px;padding:2px 8px;font-size:11px;white-space:nowrap;"><span style="font-weight:800;">PR</span> · ${t(p)}</span>`).join(" ");return`
    <div style="
      width:540px;height:960px;
      position:relative;
      color:#fff;font-family:system-ui,-apple-system,sans-serif;
      overflow:hidden;
    ">
      <img src="${i}" style="
        position:absolute;top:0;left:0;width:100%;height:100%;
        object-fit:cover;filter:brightness(${(1-Math.min(.7,Math.max(.3,o))).toFixed(2)});
      " />
      <div style="
        position:absolute;top:0;left:0;width:100%;height:100%;
        background:linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.75) 68%, rgba(0,0,0,0.92) 100%);
      "></div>
      <div style="
        position:relative;z-index:1;
        padding:48px 36px;display:flex;flex-direction:column;height:100%;
      ">
        <div>
          <div style="font-size:13px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:2px;">${t(s(n,"share.workoutDone"))}</div>
          <div style="font-size:32px;font-weight:800;margin-top:8px;text-shadow:0 2px 8px rgba(0,0,0,0.5);">${c}</div>
          <div style="font-size:15px;color:rgba(255,255,255,0.7);margin-top:4px;">${v}</div>
        </div>
        <div style="flex:1"></div>

        ${(()=>{const p="background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border-radius:12px;padding:12px 8px;text-align:center;border:1px solid rgba(255,255,255,0.1);",d=(f,m)=>`
          <div style="${p}">
            <div style="font-size:21px;font-weight:700;white-space:nowrap;">${f}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);">${m}</div>
          </div>`,l=e.prs.length>0?d(String(e.prs.length),t(s(n,"share.prs"))):d(String(e.completedSets??0),t(s(n,"share.sets")));return`
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin:24px 0;">
          ${d(a,t(s(n,"share.tonnage")))}
          ${d(t(e.duration||"—"),t(s(n,"share.duration")))}
          ${d(String(e.exercises.length),t(s(n,"share.exercises")))}
          ${l}
        </div>`})()}

        <div style="background:rgba(0,0,0,0.3);backdrop-filter:blur(8px);border-radius:12px;padding:16px;border:1px solid rgba(255,255,255,0.1);">
          ${x}
          ${g}
        </div>

        ${h?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;">${h}</div>`:""}

        ${$(!1)}
      </div>
    </div>
  `}async function O(e,i,n="pl",r="kg",o="gradient",c="tonnage"){const{default:v}=await S(async()=>{const{default:g}=await import("./html2canvas-pro.esm-CeFCdQ9N.js");return{default:g}},[]),a=document.createElement("div");a.style.cssText="position:fixed;left:-9999px;top:0;width:540px;height:960px;";const x=o==="photo"&&i;a.innerHTML=x?P(e,i,n,r):o==="story"?L(e,n,r,c,j().hex):D(e,n,r,o==="minimal"?"minimal":"gradient"),document.body.appendChild(a);try{const g=await v(a.firstElementChild,{scale:2,useCORS:!0,backgroundColor:"#0f172a"});return new Promise((h,p)=>{g.toBlob(d=>d?h(d):p(new Error("Failed to create blob")),"image/jpeg",.85)})}finally{document.body.removeChild(a)}}export{E as d,O as g};
