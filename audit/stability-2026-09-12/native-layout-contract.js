(() => {
  const bounds = el => el.getBoundingClientRect();
  const containsText = el => {
    if (!el || getComputedStyle(el).display === "none") return true;
    const r=document.createRange();r.selectNodeContents(el);const t=r.getBoundingClientRect(),b=bounds(el);
    return t.left>=b.left-1&&t.right<=b.right+1&&t.top>=b.top-1&&t.bottom<=b.bottom+1;
  };
  const canvas=document.createElement('canvas').getContext('2d');
  const tables=[...document.querySelectorAll('.exercise-set-table')].map(table=>({
    tracking:table.dataset.tracking,overflow:table.scrollWidth-table.clientWidth,
    headers:[...table.querySelectorAll('.exercise-set-header>span')].map(el=>({label:el.textContent,contained:containsText(el)})),
    rows:[...table.querySelectorAll('.exercise-set-row')].map(row=>({
      height:bounds(row).height,display:getComputedStyle(row).display,
      previous:containsText(row.querySelector('[data-field-label]:nth-child(2)')),
      controls:[...row.querySelectorAll('input,button')].map(el=>{
        const b=bounds(el),r=bounds(row),s=getComputedStyle(el,el.placeholder&&!el.value?'::placeholder':null);
        canvas.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
        const text=el.value||el.placeholder||'';
        return {label:el.getAttribute('aria-label'),width:b.width,height:b.height,
          contained:b.left>=r.left-1&&b.right<=r.right+1,
          textFits:!text||canvas.measureText(text).width+parseFloat(s.paddingLeft||0)+parseFloat(s.paddingRight||0)<=b.width+1};
      }),
    })),
  }));
  const nav=[...document.querySelectorAll('.mobile-nav-label')].map(el=>({label:el.textContent,contained:containsText(el)}));
  return {platform:document.documentElement.dataset.platform,scale:document.documentElement.dataset.textScale,
    root:getComputedStyle(document.documentElement).fontSize,body:getComputedStyle(document.body).fontSize,
    viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth-innerWidth,tables,nav};
})()
