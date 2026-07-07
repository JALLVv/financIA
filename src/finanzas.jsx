import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { cloudEnabled, supabase, fetchSocial, cloudApi, enablePush, disablePush, refreshPush, hasPushSubscription, EMPTY_SOCIAL } from "./cloud.js";

/* ============================================================
   Finanzas — app de finanzas personales estilo iOS
   Un solo archivo, organizado por secciones:
   tokens/CSS · utilidades · almacenamiento · motor recurrente ·
   componentes base · gráfico · listas · formularios · pantallas · App
   ============================================================ */

/* ----------------------- Tokens + CSS ----------------------- */
const CSS = `
:root{
  --accent:#F54927; --accent-soft:rgba(245,73,39,.16);
  --bg:#060608; --card:#141417; --card2:#1D1D21; --card3:#26262B;
  --line:rgba(255,255,255,.07); --line2:rgba(255,255,255,.12);
  --txt:#F5F5F7; --txt2:#9A9AA2; --txt3:#5D5D64;
  --green:#32D74B; --red:#FF453A;
  --glass:rgba(20,20,23,.68);
  --ease-ios:cubic-bezier(.32,.72,0,1);
  --spring:cubic-bezier(.34,1.4,.64,1);
}
.fin-app,.fin-app *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;
  font-family:"Nunito",ui-rounded,"SF Pro Rounded",-apple-system,system-ui,"Segoe UI",sans-serif;}
.fin-app{
  font-family:"Nunito",ui-rounded,"SF Pro Rounded",-apple-system,system-ui,"Segoe UI",sans-serif;
  background:var(--bg); color:var(--txt); min-height:100dvh; width:100%;
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
  font-feature-settings:"tnum" 1; overflow-x:hidden; position:relative;
}
.fin-scroll{position:relative; z-index:1; padding:0 20px calc(120px + env(safe-area-inset-bottom)); max-width:520px; margin:0 auto;}
button{font:inherit; color:inherit; border:none; background:none; padding:0; cursor:pointer;}
input,select,textarea{font:inherit; color:inherit;}
input::placeholder{color:var(--txt3);}

/* ---------- header ---------- */
.hdr{
  position:sticky; top:0; z-index:40; display:flex; align-items:center; justify-content:space-between;
  padding:calc(10px + env(safe-area-inset-top)) 4px 10px;
  margin:0 -4px 4px; background:linear-gradient(var(--bg) 55%, transparent);
}
.hdr::after{content:""; position:absolute; inset:0; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  mask:linear-gradient(#000 60%,transparent); -webkit-mask:linear-gradient(#000 60%,transparent); z-index:-1;}
.chip{
  display:inline-flex; align-items:center; gap:6px; padding:9px 14px; border-radius:22px;
  background:var(--glass); border:1px solid var(--line);
  backdrop-filter:blur(20px) saturate(160%); -webkit-backdrop-filter:blur(20px) saturate(160%);
  font-weight:600; font-size:15px; transition:transform .25s var(--spring), background .2s;
}
.chip:active{transform:scale(.94); background:var(--card2);}
.icon-btn{
  width:40px; height:40px; border-radius:50%; display:grid; place-items:center;
  background:var(--glass); border:1px solid var(--line);
  backdrop-filter:blur(20px) saturate(160%); -webkit-backdrop-filter:blur(20px) saturate(160%);
  transition:transform .25s var(--spring), background .2s;
}
.icon-btn:active{transform:scale(.9); background:var(--card2);}
.hdr-right{display:flex; gap:10px;}
.avatar-mini{width:40px;height:40px;border-radius:50%;object-fit:cover;display:block;}

/* ---------- balance ---------- */
.balance-wrap{text-align:center; padding:26px 0 8px; animation:rise .5s var(--ease-ios) both;}
.balance-label{font-size:14px; font-weight:600; color:var(--txt2); letter-spacing:.06em; text-transform:uppercase;}
.balance-row{display:flex; align-items:center; justify-content:center; gap:12px; margin-top:8px;}
.balance-num{font-size:clamp(50px,14vw,68px); font-weight:900; letter-spacing:-.045em; line-height:1.05; display:inline-block;}
.sign-dot{
  width:30px;height:30px;border-radius:50%;display:grid;place-items:center;flex:none;
  color:#fff; transition:background .4s, box-shadow .4s, transform .4s var(--spring);
}
.sign-dot svg{display:block;}
.sign-pos{background:var(--green);}
.sign-neg{background:var(--red);}
.sign-zero{background:var(--card3); box-shadow:none;}
.num-pulse{animation:numPulse .7s var(--spring);}
@keyframes numPulse{0%{transform:scale(1)}35%{transform:scale(1.05)}100%{transform:scale(1)}}
@keyframes rise{from{opacity:0; transform:translateY(14px)}to{opacity:1; transform:none}}

/* ---------- segmented ---------- */
.seg{--segpad:3px; position:relative; display:flex; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:var(--segpad); margin-top:20px;}
.seg.mini{--segpad:2px; max-width:232px; margin:18px auto 0; border-radius:14px;}
.seg.mini .seg-thumb{border-radius:11px;}
.seg.mini .seg-btn{padding:6px 0;}
.seg.mini .seg-sub{font-size:13px;}
.seg-thumb{position:absolute; top:var(--segpad); bottom:var(--segpad); border-radius:13px; background:var(--card3);
  box-shadow:0 4px 14px rgba(0,0,0,.45), inset 0 0 0 1px var(--line2);
  transition:transform .35s var(--ease-ios), width .35s var(--ease-ios);}
.seg-btn{flex:1; position:relative; z-index:1; padding:11px 0; text-align:center; font-weight:600; font-size:14px; color:var(--txt2); border-radius:13px; transition:color .25s;}
.seg-btn.on{color:var(--txt);}
.seg-sub{display:block; font-size:15.5px; font-weight:700; margin-top:0; font-feature-settings:"tnum" 1; letter-spacing:-.03em;}
.seg-sub.exp{color:var(--red);} .seg-sub.inc{color:var(--green);}

/* ---------- period pill ---------- */
.period-btn{
  margin:14px auto 0; display:flex; align-items:center; gap:6px; padding:8px 16px; border-radius:20px;
  background:var(--card); border:1px solid var(--line); font-size:14px; font-weight:600; color:var(--txt2);
  transition:transform .25s var(--spring), border-color .2s;
}
.period-btn:active{transform:scale(.95);}
.period-btn .dot{width:6px;height:6px;border-radius:50%;background:var(--accent);}

/* ---------- chart ---------- */
.chart-section{margin-top:26px; animation:rise .5s var(--ease-ios) both;}
.section-title{font-size:13px; font-weight:700; color:var(--txt3); letter-spacing:.08em; text-transform:uppercase; margin:0 4px 10px;}
.chart-scroll{display:flex; gap:10px; align-items:flex-end; overflow-x:auto; padding:4px 2px 2px; height:254px; scrollbar-width:none;}
.chart-scroll::-webkit-scrollbar{display:none;}
.bar-col{flex:none; width:calc(25% - 7.5px); min-width:64px; display:flex; flex-direction:column; justify-content:flex-end; height:100%;}
.bar{
  position:relative; width:100%; border-radius:16px; background:var(--card3);
  border:1px solid var(--line); overflow:hidden;
  display:flex; flex-direction:column; justify-content:flex-end; align-items:center; padding-bottom:8px;
  transition:height .7s cubic-bezier(.22,1,.36,1), background .25s, transform .25s var(--spring), border-color .25s;
  will-change:height;
}
.bar .b-emoji,.bar .b-amt{transition:opacity .4s ease .3s;}
.bar.pre .b-emoji,.bar.pre .b-amt{opacity:0; transition:none;}
.bar:active{transform:scale(.96);}
.bar.sel{background:#3A3A40; border-color:var(--line2); box-shadow:0 6px 18px rgba(0,0,0,.4);}
.bar .b-emoji{font-size:24px; line-height:1;}
.bar .b-amt{font-size:11.5px; font-weight:700; color:var(--txt2); margin-top:3px; white-space:nowrap; letter-spacing:-.03em;}
.bar-detail{
  margin-top:12px; background:var(--card); border:1px solid var(--line); border-radius:20px; padding:14px 16px;
  display:flex; align-items:center; gap:12px; animation:popIn .35s var(--spring) both;
}
@keyframes popIn{from{opacity:0; transform:scale(.94) translateY(6px)}to{opacity:1; transform:none}}
.bd-meta{flex:1; min-width:0;}
.bd-name{font-weight:700; font-size:15px;}
.bd-sub{font-size:12.5px; color:var(--txt2); margin-top:2px;}
.bd-amt{font-weight:800; font-size:17px; font-feature-settings:"tnum" 1; letter-spacing:-.03em;}

/* ---------- emoji bubble ---------- */
.ebubble{border-radius:50%; display:grid; place-items:center; flex:none;}

/* ---------- transactions ---------- */
.tx-section{margin-top:26px;}
.date-hdr{font-size:13px; font-weight:700; color:var(--txt3); margin:18px 4px 8px; font-feature-settings:"tnum" 1;}
.tx-card{background:var(--card); border:1px solid var(--line); border-radius:22px; overflow:hidden;}
.tx-row{
  display:flex; align-items:center; gap:12px; padding:12px 14px; width:100%; text-align:left;
  transition:background .15s; position:relative;
}
.tx-row:not(:last-child)::after{content:""; position:absolute; left:64px; right:0; bottom:0; height:1px; background:var(--line);}
.tx-row:active{background:var(--card2);}
.tx-mid{flex:1; min-width:0;}
.tx-cat{font-size:13px; color:var(--txt2); font-weight:500;}
.tx-author{color:var(--accent); font-weight:800;}
.tx-desc{font-size:15px; font-weight:700; margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.tx-amt{font-weight:700; font-size:15px; font-feature-settings:"tnum" 1; white-space:nowrap; letter-spacing:-.03em;}
.tx-amt.inc{color:var(--green);} .tx-amt.exp{color:var(--txt);}
.tx-badge{font-size:10px; font-weight:700; color:var(--txt3); text-align:right; margin-top:2px;}
.content-swap{animation:swap .4s var(--ease-ios) both;}
@keyframes swap{from{opacity:0; transform:translateY(10px)}to{opacity:1; transform:none}}

/* ---------- empty ---------- */
.empty{
  text-align:center; padding:46px 24px; color:var(--txt2); background:var(--card); border:1px dashed var(--line2);
  border-radius:24px; animation:rise .5s var(--ease-ios) both;
}
.empty .e-emoji{font-size:40px;}
.empty .e-title{font-weight:700; color:var(--txt); margin-top:10px; font-size:16px;}
.empty .e-sub{font-size:14px; margin-top:4px; line-height:1.45;}

/* ---------- FAB ---------- */
.fab{
  position:fixed; right:calc(20px + env(safe-area-inset-right));
  bottom:calc(24px + env(safe-area-inset-bottom)); z-index:45;
  width:62px; height:62px; border-radius:50%;
  background:var(--accent);
  box-shadow:0 8px 22px rgba(0,0,0,.4);
  display:grid; place-items:center; transition:transform .3s var(--spring), box-shadow .3s;
}
.fab:active{transform:scale(.88); box-shadow:0 4px 12px rgba(0,0,0,.3);}

/* ---------- sheets ---------- */
.sheet-backdrop{
  position:fixed; inset:0; z-index:60; background:rgba(0,0,0,.5);
  backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
  animation:fadeIn .3s ease both;
}
.sheet-backdrop.closing{animation:fadeOut .28s ease both;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes fadeOut{from{opacity:1}to{opacity:0}}
.sheet{
  position:fixed; left:0; right:0; bottom:0; z-index:61; margin:0 auto; max-width:520px;
  background:var(--glass); backdrop-filter:blur(28px) saturate(170%); -webkit-backdrop-filter:blur(28px) saturate(170%);
  border:1px solid var(--line2); border-bottom:none; border-radius:26px 26px 0 0;
  padding:10px 20px calc(22px + env(safe-area-inset-bottom));
  max-height:88dvh; display:flex; flex-direction:column;
  animation:sheetUp .42s var(--ease-ios) both;
  box-shadow:0 -20px 60px rgba(0,0,0,.5);
}
.sheet.closing{animation:sheetDown .3s var(--ease-ios) both;}
@keyframes sheetUp{from{transform:translateY(100%)}to{transform:none}}
@keyframes sheetDown{from{transform:none}to{transform:translateY(105%)}}
.grabber{width:38px;height:5px;border-radius:3px;background:var(--card3);margin:2px auto 10px;flex:none;}
.sheet-title-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex:none;}
.sheet-title{font-size:19px;font-weight:800;letter-spacing:-.01em;}
.sheet-close{width:30px;height:30px;border-radius:50%;background:var(--card3);display:grid;place-items:center;color:var(--txt2);transition:transform .25s var(--spring);}
.sheet-close:active{transform:scale(.88);}
.sheet-body{overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; flex:1; min-height:0; padding-bottom:4px;}

/* ---------- forms ---------- */
.f-group{background:var(--card); border:1px solid var(--line); border-radius:18px; overflow:hidden; margin-bottom:14px;}
.f-row{display:flex; align-items:center; gap:10px; padding:13px 16px; position:relative;}
.f-row:not(:last-child)::after{content:""; position:absolute; left:16px; right:0; bottom:0; height:1px; background:var(--line);}
.f-label{font-size:15px; font-weight:600; color:var(--txt); flex:none; min-width:96px;}
.f-input{flex:1; background:none; border:none; outline:none; font-size:15px; text-align:right; min-width:0;}
.f-input.left{text-align:left;}
.amount-wrap{display:flex; align-items:baseline; justify-content:center; gap:3px; padding:8px 0 2px;}
.amount-cur{font-size:32px; font-weight:800; color:var(--txt3); letter-spacing:-.04em;}
.amount-input{
  background:none; border:none; outline:none; text-align:left;
  font-size:44px; font-weight:800; letter-spacing:-.04em; padding:0; caret-color:var(--accent);
  min-width:1.1ch; max-width:72%;
}
.type-toggle{display:flex; gap:8px; margin:2px auto 16px; max-width:200px;}
.type-btn{
  flex:1; padding:7px 0; border-radius:13px; font-weight:800; font-size:19px; line-height:1.2; color:var(--txt2);
  background:var(--card); border:1px solid var(--line); transition:all .25s var(--ease-ios);
}
.type-btn.exp.on{background:rgba(255,69,58,.14); color:var(--red); border-color:rgba(255,69,58,.4);}
.type-btn.inc.on{background:rgba(50,215,75,.12); color:var(--green); border-color:rgba(50,215,75,.4);}
.type-btn.tr.on{background:rgba(48,176,199,.14); color:#30B0C7; border-color:rgba(48,176,199,.4);}
.form-pills{display:flex; flex-wrap:wrap; gap:8px; justify-content:center; padding:2px 0 10px;}

/* descripción grande sin recuadro (mismo tamaño que el monto) */
.desc-input{
  width:100%; background:none; border:none; outline:none; text-align:left;
  font-size:44px; font-weight:800; letter-spacing:-.04em; caret-color:var(--accent);
  padding:6px 4px 0; margin:0; min-width:0;
}
.desc-input::placeholder{color:rgba(245,245,247,.22); font-weight:800;}

/* fila del monto: interruptor pequeño a la izquierda + monto */
.amount-row{display:flex; align-items:center; gap:10px; padding:4px 4px 2px;}
.mode-seg{position:relative; display:flex; flex:none; width:126px; background:var(--card); border:1px solid var(--line); border-radius:12px; padding:2px;}
.mode-thumb{position:absolute; top:2px; bottom:2px; border-radius:9px; transition:transform .32s var(--ease-ios), background .25s;}
.mode-thumb.expense{background:var(--red);}
.mode-thumb.income{background:var(--green);}
.mode-thumb.transfer{background:#30B0C7;}
.mode-btn{flex:1; position:relative; z-index:1; padding:5px 0; font-size:14px; font-weight:800; line-height:1.2; color:var(--txt2); border-radius:9px; transition:color .25s;}
.mode-btn.on{color:#fff;}

/* categorías en chips horizontales */
.cat-chips{display:flex; gap:8px; overflow-x:auto; padding:14px 2px 6px; scrollbar-width:none;}
.cat-chips::-webkit-scrollbar{display:none;}
.cat-chip{
  flex:none; display:flex; align-items:center; gap:6px; padding:9px 15px; border-radius:19px;
  background:var(--card); border:1px solid var(--line); font-size:14px; font-weight:700; color:var(--txt2);
  transition:all .25s var(--ease-ios); white-space:nowrap;
}
.cat-chip.on{background:var(--accent-soft); border-color:rgba(245,73,39,.45); color:#FF8A6B;}
.cat-chip:active{transform:scale(.95);}
.cat-scroll{display:flex; gap:12px; overflow-x:auto; padding:6px 2px 10px; scrollbar-width:none;}
.cat-scroll::-webkit-scrollbar{display:none;}
.cat-pick{flex:none; width:66px; text-align:center; transition:transform .25s var(--spring);}
.cat-pick:active{transform:scale(.92);}
.cat-pick .ebubble{margin:0 auto; transition:box-shadow .25s, transform .25s var(--spring);}
.cat-pick.on .ebubble{box-shadow:0 0 0 3px var(--bg), 0 0 0 5.5px var(--accent); transform:scale(1.05);}
.cat-pick .c-name{font-size:11.5px; font-weight:600; color:var(--txt2); margin-top:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.cat-pick.on .c-name{color:var(--txt);}
.primary-btn{
  width:100%; padding:15px 0; border-radius:18px; background:var(--accent); color:#fff; font-weight:800; font-size:16px;
  transition:transform .25s var(--spring), opacity .2s; flex:none;
}
.primary-btn:active{transform:scale(.97);}
.primary-btn:disabled{opacity:.35;}
.danger-btn{width:100%; padding:14px 0; border-radius:18px; background:rgba(255,69,58,.13); color:var(--red); font-weight:700; font-size:15.5px; transition:transform .25s var(--spring);}
.danger-btn:active{transform:scale(.97);}
.ghost-btn{width:100%; padding:14px 0; border-radius:18px; background:var(--card2); color:var(--txt); font-weight:700; font-size:15.5px; transition:transform .25s var(--spring);}
.ghost-btn:active{transform:scale(.97);}
select.f-input{appearance:none; -webkit-appearance:none; text-align:right; direction:rtl; color:var(--txt2);}
select.f-input option{direction:ltr; background:var(--card2); color:var(--txt);}
input[type=date].f-input{color-scheme:dark; color:var(--txt2);}

/* ---------- period sheet ---------- */
.month-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:10px;}
.month-cell{
  padding:12px 6px; border-radius:16px; background:var(--card); border:1px solid var(--line); text-align:center;
  transition:all .25s var(--ease-ios);
}
.month-cell:active{transform:scale(.94);}
.month-cell.on{border-color:var(--accent); background:var(--accent-soft);}
.month-cell.dim{opacity:.45;}
.m-name{font-weight:700; font-size:14px;}
.m-bal{font-size:11.5px; font-weight:700; margin-top:3px; font-feature-settings:"tnum" 1; letter-spacing:-.03em;}
.m-bal.pos{color:var(--green);} .m-bal.neg{color:var(--red);} .m-bal.zero{color:var(--txt3);}
.year-stepper{display:flex; align-items:center; justify-content:center; gap:18px; margin:6px 0 14px;}
.year-stepper .yr{font-size:19px; font-weight:800; min-width:74px; text-align:center;}
.step-btn{width:34px;height:34px;border-radius:50%;background:var(--card2);display:grid;place-items:center;color:var(--txt2);transition:transform .25s var(--spring);}
.step-btn:active{transform:scale(.88);}
.row-pick{
  display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:13px 16px; position:relative; transition:background .15s;
}
.row-pick:active{background:var(--card2);}
.row-pick:not(:last-child)::after{content:""; position:absolute; left:16px; right:0; bottom:0; height:1px; background:var(--line);}
.row-pick .r-main{flex:1; min-width:0; font-weight:600; font-size:15px;}
.row-pick .r-sub{font-size:12.5px; color:var(--txt2); font-weight:600; margin-top:1px;}
.check{color:var(--accent);}

/* ---------- search ---------- */
.overlay{
  position:fixed; inset:0; z-index:70; background:var(--bg); display:flex; flex-direction:column;
  animation:overlayIn .4s var(--ease-ios) both; max-width:100%;
}
.overlay.closing{animation:overlayOut .3s var(--ease-ios) both;}
@keyframes overlayIn{from{opacity:0; transform:translateY(4%) scale(.98)}to{opacity:1; transform:none}}
@keyframes overlayOut{from{opacity:1}to{opacity:0; transform:translateY(3%) scale(.98)}}
.overlay-hdr{display:flex; align-items:center; gap:12px; padding:calc(12px + env(safe-area-inset-top)) 20px 12px; flex:none; max-width:520px; margin:0 auto; width:100%;}
.overlay-body{flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:0 20px calc(40px + env(safe-area-inset-bottom)); max-width:520px; margin:0 auto; width:100%;}
.search-input-wrap{flex:1; display:flex; align-items:center; gap:8px; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:10px 14px;}
.search-input-wrap input{flex:1; background:none; border:none; outline:none; font-size:15px; min-width:0;}
.cancel-txt{color:var(--accent); font-weight:600; font-size:15px; flex:none;}
.filter-row{display:flex; gap:8px; overflow-x:auto; padding:10px 0 4px; scrollbar-width:none;}
.filter-row::-webkit-scrollbar{display:none;}
.f-chip{
  flex:none; padding:8px 14px; border-radius:18px; background:var(--card); border:1px solid var(--line);
  font-size:13.5px; font-weight:600; color:var(--txt2); display:flex; align-items:center; gap:5px;
  transition:all .25s var(--ease-ios);
}
.f-chip.on{background:var(--accent-soft); border-color:rgba(245,73,39,.45); color:#FF8A6B;}
.f-chip:active{transform:scale(.94);}

/* ---------- dropdown pills (buscador) ---------- */
.search-filters{display:flex; flex-wrap:wrap; gap:8px; padding:12px 0 4px;}
.dd{
  position:relative; flex:none; display:flex; align-items:center; gap:7px; padding:9px 13px; border-radius:16px;
  background:var(--card); border:1px solid var(--line); transition:all .25s var(--ease-ios); max-width:100%;
}
.dd:active{transform:scale(.96);}
.dd.on{background:var(--accent-soft); border-color:rgba(245,73,39,.45);}
.dd .dd-lab{color:var(--txt3); font-weight:800; font-size:10.5px; text-transform:uppercase; letter-spacing:.05em;}
.dd .dd-val{font-size:13.5px; font-weight:700; color:var(--txt2); max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.dd.on .dd-val{color:#FF8A6B;}
.dd select{position:absolute; inset:0; width:100%; height:100%; opacity:0; appearance:none; -webkit-appearance:none;}
.dd select option{background:var(--card2); color:var(--txt);}

/* ---------- profile ---------- */
.prof-head{text-align:center; padding:14px 0 20px;}
.avatar-big{
  width:96px; height:96px; border-radius:50%; margin:0 auto; display:grid; place-items:center; font-size:40px;
  background:var(--card2); border:1px solid var(--line2); overflow:hidden; position:relative; transition:transform .25s var(--spring);
}
.avatar-big:active{transform:scale(.95);}
.avatar-big img{width:100%; height:100%; object-fit:cover;}
.avatar-edit{position:absolute; bottom:2px; right:2px; width:28px; height:28px; border-radius:50%; background:var(--accent); display:grid; place-items:center; border:3px solid var(--bg);}
.name-input{background:none; border:none; outline:none; text-align:center; font-size:22px; font-weight:800; width:100%; margin-top:12px;}
.disclosure{background:var(--card); border:1px solid var(--line); border-radius:20px; margin-bottom:12px; overflow:hidden;}
.disc-head{display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:13px 16px; transition:background .15s;}
.disc-head:active{background:var(--card2);}
.disc-title{flex:1; font-weight:700; font-size:15.5px;}
.chev{color:var(--txt3); transition:transform .35s var(--ease-ios);}
.chev.open{transform:rotate(90deg);}
.disc-body{border-top:1px solid var(--line); animation:discIn .35s var(--ease-ios) both; overflow:hidden;}
@keyframes discIn{from{opacity:0; transform:translateY(-6px)}to{opacity:1; transform:none}}
.add-row{display:flex; align-items:center; gap:10px; width:100%; padding:13px 16px; color:var(--accent); font-weight:700; font-size:15px; transition:background .15s;}
.add-row:active{background:var(--card2);}
.mini-actions{display:flex; gap:6px; flex:none;}
.mini-btn{width:32px;height:32px;border-radius:10px;background:var(--card2);display:grid;place-items:center;color:var(--txt2);transition:transform .2s var(--spring), color .2s;}
.mini-btn:active{transform:scale(.88);}
.mini-btn.del{color:var(--red);}

/* ---------- action sheet ---------- */
.action-stack{padding-bottom:4px;}
.action-card{background:var(--card2); border-radius:18px; overflow:hidden; margin-bottom:10px;}
.action-btn{width:100%; padding:15px 0; font-size:16.5px; font-weight:600; text-align:center; transition:background .15s; position:relative;}
.action-btn:not(:last-child)::after{content:""; position:absolute; left:0; right:0; bottom:0; height:1px; background:var(--line);}
.action-btn:active{background:var(--card3);}
.action-btn.destructive{color:var(--red);}

.emoji-big-input{
  width:92px; height:92px; margin:0 auto; display:block; text-align:center; font-size:52px; line-height:normal; padding:0; background:var(--card2);
  border:1px solid var(--line2); border-radius:28px; outline:none; caret-color:var(--accent); transition:border-color .2s;
}
.emoji-big-input::placeholder{color:var(--txt3); font-weight:300;}
.emoji-big-input:focus{border-color:var(--accent);}

.toast{
  position:fixed; top:calc(14px + env(safe-area-inset-top)); left:50%; transform:translateX(-50%); z-index:90;
  background:var(--glass); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px);
  border:1px solid var(--line2); border-radius:20px; padding:11px 20px; font-weight:700; font-size:14px;
  box-shadow:0 10px 30px rgba(0,0,0,.5); animation:toastIn .45s var(--spring) both; display:flex; align-items:center; gap:8px;
}
@keyframes toastIn{from{opacity:0; transform:translate(-50%,-18px) scale(.9)}to{opacity:1; transform:translate(-50%,0)}}

.spin{width:26px;height:26px;border-radius:50%;border:3px solid var(--card3);border-top-color:var(--accent);animation:sp 1s linear infinite;margin:40vh auto 0;}
@keyframes sp{to{transform:rotate(360deg)}}

/* ---------- social ---------- */
.avatar-sm{border-radius:50%; background:#2E2E33; display:grid; place-items:center; font-weight:800; color:var(--txt2); overflow:hidden; flex:none;}
.avatar-sm img{width:100%; height:100%; object-fit:cover;}
.bell-wrap{position:relative;}
.badge-dot{
  position:absolute; top:-3px; right:-3px; min-width:17px; height:17px; border-radius:9px;
  background:var(--red); color:#fff; font-size:10.5px; font-weight:800;
  display:grid; place-items:center; padding:0 4px; border:2px solid var(--bg); z-index:1;
}
.notif-row{display:flex; gap:12px; padding:13px 14px; align-items:flex-start; position:relative;}
.notif-row:not(:last-child)::after{content:""; position:absolute; left:64px; right:0; bottom:0; height:1px; background:var(--line);}
.notif-main{flex:1; min-width:0;}
.notif-title{font-size:14.5px; font-weight:700; line-height:1.35;}
.notif-sub{font-size:12.5px; color:var(--txt2); font-weight:600; margin-top:2px;}
.notif-actions{display:flex; gap:8px; margin-top:9px;}
.btn-accept{padding:8px 18px; border-radius:14px; background:var(--accent); color:#fff; font-weight:700; font-size:13.5px; transition:transform .2s var(--spring);}
.btn-accept:active{transform:scale(.95);}
.btn-reject{padding:8px 18px; border-radius:14px; background:var(--card3); color:var(--txt); font-weight:700; font-size:13.5px; transition:transform .2s var(--spring);}
.btn-reject:active{transform:scale(.95);}
.cloud-hint{font-size:12.5px; color:var(--txt2); line-height:1.55; padding:14px 16px; font-weight:600;}
.account-card{
  margin:16px auto 0; display:flex; align-items:center; gap:12px; text-align:left;
  background:var(--card); border:1px solid var(--line); border-radius:18px; padding:10px 14px; max-width:340px;
}

/* ---------- interruptor estilo iPhone ---------- */
.switch{width:51px; height:31px; border-radius:16px; background:var(--card3); position:relative; transition:background .25s; flex:none;}
.switch.on{background:var(--green);}
.switch::after{
  content:""; position:absolute; top:2px; left:2px; width:27px; height:27px; border-radius:50%;
  background:#fff; transition:transform .25s var(--ease-ios); box-shadow:0 2px 5px rgba(0,0,0,.3);
}
.switch.on::after{transform:translateX(20px);}

/* ---------- fila deslizable (borrar estilo iPhone) ---------- */
.swipe-wrap{position:relative; overflow:hidden;}
.swipe-del{position:absolute; top:0; right:0; bottom:0; background:var(--red); color:#fff; display:grid; place-items:center;}
.swipe-content{position:relative; background:var(--card); touch-action:pan-y;}

@media (prefers-reduced-motion: reduce){
  .fin-app *, .fin-app *::before, .fin-app *::after{animation-duration:.01ms !important; transition-duration:.01ms !important;}
}
`;

/* ----------------------- Utilidades ----------------------- */
const ACCENT = "#F54927";
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const pad2 = (n) => String(n).padStart(2, "0");
const toStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayStr = () => toStr(new Date());
const parseD = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtDate = (s) => { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };

const money2 = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money1 = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const money0 = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
/* sin ceros de sobra: $21 en vez de $21,00 y $21,8 en vez de $21,80 */
const fmt = (n) => {
  let v = Math.round(n * 100) / 100;
  if (Math.abs(v) < 0.005) v = 0;
  const cents = Math.round(Math.abs(v) * 100);
  if (cents % 100 === 0) return money0.format(v);
  if (cents % 10 === 0) return money1.format(v);
  return money2.format(v);
};
const fmtShort = (n) => {
  const a = Math.abs(n);
  if (a >= 1000000) return "$" + (a / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (a >= 10000) return "$" + (a / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return fmt(a);
};

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_S = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const FREQS = [
  { id: "none", label: "Nunca" },
  { id: "dia", label: "Cada día" },
  { id: "semana", label: "Cada semana" },
  { id: "quincena", label: "Cada quincena" },
  { id: "mes", label: "Cada mes" },
  { id: "bimestre", label: "Cada bimestre" },
  { id: "trimestre", label: "Cada trimestre" },
  { id: "semestre", label: "Cada semestre" },
  { id: "anio", label: "Cada año" },
];
const freqLabel = (id) => (FREQS.find((f) => f.id === id) || {}).label || id;

const haptic = (ms = 8) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

/* lee una imagen del usuario y la reduce (para adjuntar facturas sin llenar el almacenamiento) */
function readImageScaled(file, maxSide, quality, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * r));
      c.height = Math.max(1, Math.round(img.height * r));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", quality));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

function firstGrapheme(str) {
  if (!str) return "";
  try {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const seg = new Intl.Segmenter("es", { granularity: "grapheme" });
      const arr = [...seg.segment(str)];
      return arr.length ? arr[arr.length - 1].segment : "";
    }
  } catch (e) {}
  const a = Array.from(str);
  return a.length ? a[a.length - 1] : "";
}

/* --- color desde emoji (canvas → color dominante, saturado y visible) --- */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();

const FALLBACK_COLORS = ["#FF9F0A","#0A84FF","#32D74B","#FF453A","#BF5AF2","#64D2FF","#FFD60A","#FF6482","#30B0C7","#AC8E68"];
function colorFromEmoji(emoji) {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 48;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.font = '40px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif';
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(emoji, 24, 26);
    const d = x.getImageData(0, 0, 48, 48).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 140) {
        const rr = d[i], gg = d[i + 1], bb = d[i + 2];
        const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb);
        if (mx - mn > 16 || mx > 100) { r += rr; g += gg; b += bb; n++; }
      }
    }
    if (n < 10) throw new Error("sin pixeles");
    let [h, s, l] = rgbToHsl(r / n, g / n, b / n);
    s = Math.max(s, 0.6); l = Math.min(Math.max(l, 0.52), 0.63);
    const [R, G, B] = hslToRgb(h, s, l);
    return toHex(R, G, B);
  } catch (e) {
    let hash = 0;
    for (const ch of emoji || "?") hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
    return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
  }
}

/* ----------------------- Persistencia ----------------------- */
const STORE_KEY = "finanzas_app_v1";

function defaultData() {
  const listId = uid();
  const mk = (name, emoji, color) => ({ id: uid(), listId, name, emoji, color });
  return {
    version: 1,
    profile: { name: "", photo: null },
    settings: { accumulate: true },
    activeListId: listId,
    lists: [{ id: listId, name: "Personal" }],
    categories: [
      mk("Comida", "🍔", "#FF9F0A"),
      mk("Transporte", "🚗", "#0A84FF"),
      mk("Hogar", "🏠", "#AC8E68"),
      mk("Compras", "🛍️", "#FF6482"),
      mk("Salud", "💊", "#FF453A"),
      mk("Sueldo", "💼", "#98989F"),
    ],
    transactions: [],
    recurring: [],
  };
}

async function loadData() {
  try {
    const r = await window.storage.get(STORE_KEY);
    if (r && r.value) {
      const d = JSON.parse(r.value);
      if (d && d.lists && d.lists.length) {
        if (!d.settings) d.settings = { accumulate: true };
        return d;
      }
    }
  } catch (e) { /* clave inexistente */ }
  return defaultData();
}

let saveTimer = null;
function persist(data) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await window.storage.set(STORE_KEY, JSON.stringify(data)); }
    catch (e) { console.error("No se pudo guardar", e); }
  }, 350);
}

/* ----------------------- Motor de recurrencias ----------------------- */
function addMonthsClamped(dateStr, months, anchorDay) {
  const d = parseD(dateStr);
  const day = anchorDay || d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return toStr(target);
}
function advance(dateStr, freq, anchorDay) {
  const d = parseD(dateStr);
  switch (freq) {
    case "dia": d.setDate(d.getDate() + 1); return toStr(d);
    case "semana": d.setDate(d.getDate() + 7); return toStr(d);
    case "quincena": d.setDate(d.getDate() + 15); return toStr(d);
    case "mes": return addMonthsClamped(dateStr, 1, anchorDay);
    case "bimestre": return addMonthsClamped(dateStr, 2, anchorDay);
    case "trimestre": return addMonthsClamped(dateStr, 3, anchorDay);
    case "semestre": return addMonthsClamped(dateStr, 6, anchorDay);
    case "anio": return addMonthsClamped(dateStr, 12, anchorDay);
    default: return null;
  }
}
/* Genera instancias vencidas de cada regla, sin duplicar (índice por regla+fecha).
   Las reglas de tipo "transfer" generan los dos movimientos enlazados. */
function runRecurring(data) {
  const today = todayStr();
  let changed = false;
  let categories = data.categories;
  const ensureTransferCat = (listId) => {
    let cat = categories.find((c) => c.listId === listId && c.name.trim().toLowerCase() === "transferencia");
    if (!cat) {
      cat = { id: uid(), listId, name: "Transferencia", emoji: "🔁", color: colorFromEmoji("🔁") };
      categories = [...categories, cat];
      changed = true;
    }
    return cat;
  };
  const listName = (id) => { const l = data.lists.find((x) => x.id === id); return l ? l.name : "—"; };
  const existing = new Set(data.transactions.filter((t) => t.recurringId).map((t) => t.recurringId + "|" + t.date));
  const newTx = [];
  const rules = data.recurring.map((r) => {
    let next = r.nextDate || r.startDate;
    const anchor = parseD(r.startDate).getDate();
    let guard = 0;
    while (next && next <= today && guard < 2000) {
      const key = r.id + "|" + next;
      if (!existing.has(key)) {
        existing.add(key);
        if (r.type === "transfer" && r.toListId) {
          const catFrom = ensureTransferCat(r.listId);
          const catTo = ensureTransferCat(r.toListId);
          const tId = uid();
          newTx.push({
            id: uid(), listId: r.listId, categoryId: catFrom.id, type: "expense",
            amount: r.amount, description: `hacia ${listName(r.toListId)}`, date: next,
            recurringId: r.id, transferId: tId,
          });
          newTx.push({
            id: uid(), listId: r.toListId, categoryId: catTo.id, type: "income",
            amount: r.amount, description: `desde ${listName(r.listId)}`, date: next,
            recurringId: r.id, transferId: tId,
          });
        } else {
          newTx.push({
            id: uid(), listId: r.listId, categoryId: r.categoryId, type: r.type,
            amount: r.amount, description: r.description, date: next, recurringId: r.id,
          });
        }
      }
      next = advance(next, r.frequency, anchor);
      guard++; changed = true;
    }
    return next !== r.nextDate ? { ...r, nextDate: next } : r;
  });
  if (!changed && newTx.length === 0) return data;
  return { ...data, categories, transactions: [...data.transactions, ...newTx], recurring: rules };
}

/* ----------------------- Iconos ----------------------- */
const Icon = memo(function Icon({ name, size = 18, color = "currentColor", stroke = 2 }) {
  const P = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "chevD": return <svg {...P}><polyline points="6 9 12 15 18 9" /></svg>;
    case "chevR": return <svg {...P}><polyline points="9 6 15 12 9 18" /></svg>;
    case "chevL": return <svg {...P}><polyline points="15 6 9 12 15 18" /></svg>;
    case "search": return <svg {...P}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
    case "plus": return <svg {...P}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "minus": return <svg {...P}><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "equal": return <svg {...P}><line x1="6" y1="9" x2="18" y2="9" /><line x1="6" y1="15" x2="18" y2="15" /></svg>;
    case "x": return <svg {...P}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>;
    case "user": return <svg {...P}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case "pencil": return <svg {...P}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>;
    case "trash": return <svg {...P}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
    case "check": return <svg {...P} strokeWidth={2.6}><polyline points="4.5 12.5 9.5 17.5 19.5 6.5" /></svg>;
    case "camera": return <svg {...P}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>;
    case "cal": return <svg {...P}><rect x="3" y="5" width="18" height="16" rx="3" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></svg>;
    case "bell": return <svg {...P}><path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" /></svg>;
    case "users": return <svg {...P}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "userplus": return <svg {...P}><path d="M2 21a8 8 0 0 1 13.292-6" /><circle cx="10" cy="8" r="5" /><path d="M19 16v6" /><path d="M22 19h-6" /></svg>;
    case "logout": return <svg {...P}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
    default: return null;
  }
});

/* ----------------------- Componentes base ----------------------- */
function AnimatedNumber({ value, format = fmt, className = "", style }) {
  const [disp, setDisp] = useState(value);
  const [pulse, setPulse] = useState(false);
  const prev = useRef(value);
  const raf = useRef(null);
  useEffect(() => {
    const from = prev.current;
    if (from === value) return;
    prev.current = value;
    setPulse(true);
    const t0 = performance.now(), dur = 700;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      setDisp(from + (value - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else { setDisp(value); setTimeout(() => setPulse(false), 60); }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <span className={`${className} ${pulse ? "num-pulse" : ""}`} style={{ display: "inline-block", ...style }}>{format(disp)}</span>;
}

function Segmented({ options, value, onChange, renderExtra, className }) {
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  const n = options.length;
  return (
    <div className={`seg ${className || ""}`} role="tablist">
      <div className="seg-thumb" style={{ width: `calc((100% - var(--segpad) * 2) / ${n})`, transform: `translateX(${idx * 100}%)` }} />
      {options.map((o) => (
        <button key={o.id} role="tab" aria-selected={o.id === value} aria-label={o.aria || undefined} className={`seg-btn ${o.id === value ? "on" : ""}`}
          onClick={() => { if (o.id !== value) { haptic(); onChange(o.id); } }}>
          {o.label}
          {renderExtra && renderExtra(o)}
        </button>
      ))}
    </div>
  );
}

/* Bloqueo del scroll del fondo mientras hay una hoja o pantalla abierta:
   evita que iOS desplace la app principal al abrir el teclado (la hoja
   y el fondo quedan separados). */
let bodyLockCount = 0, bodyLockY = 0;
/* iOS ignora overflow:hidden al enfocar un campo y desplaza la página
   igualmente: cualquier scroll del fondo se revierte al instante */
function onLockedScroll() {
  if (Math.abs((window.scrollY || 0) - bodyLockY) > 1) window.scrollTo(0, bodyLockY);
}
function lockBodyScroll() {
  if (++bodyLockCount > 1) return;
  bodyLockY = window.scrollY || 0;
  /* overflow:hidden en la raíz: congela el fondo sin reposicionar nada
     (position:fixed en body dejaba una franja negra al cerrar) */
  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.overscrollBehavior = "none";
  document.body.style.overflow = "hidden";
  window.addEventListener("scroll", onLockedScroll, { passive: true });
}
function unlockBodyScroll() {
  if (--bodyLockCount > 0) return;
  bodyLockCount = 0;
  window.removeEventListener("scroll", onLockedScroll);
  document.documentElement.style.overflow = "";
  document.documentElement.style.overscrollBehavior = "";
  document.body.style.overflow = "";
  window.scrollTo(0, bodyLockY);
}

/* Hoja modal estilo iOS con animación de cierre.
   Se eleva con el teclado (visualViewport) para que los campos no queden tapados. */
function Sheet({ open, onClose, title, children, footer }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [kb, setKb] = useState(0);
  const [animDone, setAnimDone] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); setAnimDone(false); }
    else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);
  useEffect(() => {
    if (!mounted) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [mounted]);
  /* alto del teclado: solo la reducción del visual viewport (con el fondo
     bloqueado, el desplazamiento no entra en el cálculo → valor estable) */
  useEffect(() => {
    if (!mounted || typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    let raf = null;
    const apply = () => {
      raf = null;
      setKb(Math.max(0, Math.round(window.innerHeight - vv.height)));
    };
    const onChange = () => { if (raf === null) raf = requestAnimationFrame(apply); };
    vv.addEventListener("resize", onChange);
    onChange();
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      vv.removeEventListener("resize", onChange);
      setKb(0);
    };
  }, [mounted]);

  if (!mounted) return null;
  /* con el fondo bloqueado, la hoja entera se eleva sobre el teclado; el
     inline transform solo puede aplicarse cuando la animación de entrada
     terminó (su fill-mode la sobreescribiría) */
  const lifted = animDone && !closing && kb > 0;
  return (
    <>
      <div className={`sheet-backdrop ${closing ? "closing" : ""}`} onClick={onClose} />
      <div className={`sheet ${closing ? "closing" : ""}`} role="dialog" aria-modal="true" aria-label={title}
        onAnimationEnd={(e) => { if (e.target === e.currentTarget) setAnimDone(true); }}
        style={lifted
          ? { animation: "none", transform: `translateY(-${kb}px)`, maxHeight: `calc(100dvh - ${kb}px - 20px)` }
          : animDone && !closing ? { animation: "none" } : undefined}>
        <div className="grabber" />
        {title != null && (
          <div className="sheet-title-row">
            <div className="sheet-title">{title}</div>
            <button className="sheet-close" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={15} /></button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer}
      </div>
    </>
  );
}

/* Pantalla completa con animación (buscador, perfil) */
function Overlay({ open, onClose, children }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 280);
      return () => clearTimeout(t);
    }
  }, [open]);
  useEffect(() => {
    if (!mounted) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [mounted]);
  if (!mounted) return null;
  return <div className={`overlay ${closing ? "closing" : ""}`}>{children({ requestClose: onClose })}</div>;
}

/* tinte suave del color (33 = 20% alfa) para que resalte el emoji */
const EmojiBubble = memo(function EmojiBubble({ emoji, color, size = 44, fontSize }) {
  return (
    <div className="ebubble" style={{ width: size, height: size, fontSize: fontSize || size * 0.52, background: `${color}33` }}>
      <span style={{ transform: "translateY(1px)" }}>{emoji}</span>
    </div>
  );
});

const Avatar = memo(function Avatar({ profile, size = 40 }) {
  const name = (profile && (profile.name || profile.email)) || "?";
  return (
    <div className="avatar-sm" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {profile && profile.photo
        ? <img src={profile.photo} alt="" />
        : (name.trim().charAt(0) || "?").toUpperCase()}
    </div>
  );
});

function EmptyState({ emoji, title, sub }) {
  return (
    <div className="empty">
      <div className="e-emoji">{emoji}</div>
      <div className="e-title">{title}</div>
      <div className="e-sub">{sub}</div>
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast" key={msg.id}><span>{msg.emoji}</span>{msg.text}</div>;
}

/* Interruptor estilo iPhone */
function Switch({ on, onToggle, label }) {
  return (
    <button className={`switch ${on ? "on" : ""}`} role="switch" aria-checked={on} aria-label={label}
      onClick={() => { haptic(10); onToggle(); }} />
  );
}

/* Fila deslizable a la izquierda para eliminar (mecánica iPhone) */
function SwipeRow({ children, onDelete, deleteLabel = "Eliminar" }) {
  const W = 76;
  const [dx, setDx] = useState(0);
  const drag = useRef(null);
  const start = (e) => { drag.current = { x0: e.clientX, y0: e.clientY, base: dx, horiz: null, id: e.pointerId }; };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const ddx = e.clientX - d.x0, ddy = e.clientY - d.y0;
    if (d.horiz === null) {
      if (Math.abs(ddx) < 6 && Math.abs(ddy) < 6) return;
      d.horiz = Math.abs(ddx) > Math.abs(ddy);
      if (d.horiz) { try { e.currentTarget.setPointerCapture(d.id); } catch (err) {} }
    }
    if (!d.horiz) return;
    setDx(Math.min(0, Math.max(-W - 26, d.base + ddx)));
  };
  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.horiz === null) return;
    setDx((v) => (v < -W / 2 ? -W : 0));
  };
  return (
    <div className="swipe-wrap">
      <button className="swipe-del" style={{ width: W }} aria-label={deleteLabel}
        onClick={() => { haptic(16); setDx(0); onDelete(); }}>
        <Icon name="trash" size={18} />
      </button>
      <div className="swipe-content"
        style={{ transform: `translateX(${dx}px)`, transition: drag.current ? "none" : "transform .28s var(--ease-ios)" }}
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        {children}
      </div>
    </div>
  );
}

/* Hoja de confirmación estilo iOS */
function ConfirmSheet({ open, onClose, title, message, confirmLabel = "Eliminar", onConfirm }) {
  return (
    <Sheet open={open} onClose={onClose} title={null}>
      <div style={{ textAlign: "center", padding: "6px 8px 16px" }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--txt2)", marginTop: 6, lineHeight: 1.45 }}>{message}</div>
      </div>
      <div className="action-stack">
        <button className="danger-btn" style={{ marginBottom: 10 }} onClick={() => { haptic(20); onConfirm(); onClose(); }}>{confirmLabel}</button>
        <button className="ghost-btn" onClick={onClose}>Cancelar</button>
      </div>
    </Sheet>
  );
}

/* ----------------------- Gráfico de barras ----------------------- */
const BarChart = memo(function BarChart({ groups, type, onSelect, selectedId, animKey }) {
  const max = useMemo(() => Math.max(...groups.map((g) => g.total), 0.01), [groups]);
  const H = 244, MIN = 56;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    let r2;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setReady(true)); });
    return () => { cancelAnimationFrame(r1); if (r2) cancelAnimationFrame(r2); };
  }, [animKey]);
  return (
    <div className="chart-scroll" key={animKey}>
      {groups.map((g, i) => {
        const h = ready ? MIN + (g.total / max) * (H - MIN) : 0;
        return (
          <div className="bar-col" key={g.cat.id}>
            <button
              className={`bar ${ready ? "" : "pre"} ${selectedId === g.cat.id ? "sel" : ""}`}
              style={{ height: h, transitionDelay: `${Math.min(i, 8) * 35}ms` }}
              onClick={() => { haptic(); onSelect(selectedId === g.cat.id ? null : g.cat.id); }}
              aria-label={`${g.cat.name}: ${fmt(g.total)}`}
            >
              <span className="b-emoji">{g.cat.emoji}</span>
              <span className="b-amt">{fmtShort(g.total)}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
});

/* ----------------------- Fila de transacción ----------------------- */
const TxRow = memo(function TxRow({ tx, cat, onPress, showList, listName }) {
  const inc = tx.type === "income";
  return (
    <button className="tx-row" onClick={() => onPress && onPress(tx)}>
      <EmojiBubble emoji={cat.emoji} color={cat.color} size={44} />
      <div className="tx-mid">
        <div className="tx-cat">
          {cat.name}
          {tx.authorName ? <> · <span className="tx-author">{tx.authorName}</span></> : null}
          {showList ? ` · ${listName}` : ""}
        </div>
        <div className="tx-desc">{tx.description || cat.name}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className={`tx-amt ${inc ? "inc" : "exp"}`}>{inc ? "+" : "−"}{fmt(tx.amount)}</div>
        {tx.recurringId ? <div className="tx-badge">🔁 recurrente</div> : null}
        {tx.photo ? <div className="tx-badge">📎 foto</div> : null}
      </div>
    </button>
  );
});

/* Lista agrupada por fecha con carga incremental (rendimiento) */
function GroupedTxList({ txs, catMap, onPress, listMap, showList, animKey }) {
  const [limit, setLimit] = useState(60);
  const sentinel = useRef(null);
  useEffect(() => { setLimit(60); }, [animKey]);
  useEffect(() => {
    if (!sentinel.current) return;
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) setLimit((l) => l + 80);
    }, { rootMargin: "600px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [txs.length]);

  const groups = useMemo(() => {
    const slice = txs.slice(0, limit);
    const map = new Map();
    for (const t of slice) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    return [...map.entries()];
  }, [txs, limit]);

  const fallbackCat = { name: "Sin categoría", emoji: "❓", color: "#5D5D64" };
  return (
    <div className="content-swap" key={animKey}>
      {groups.map(([date, items]) => (
        <div key={date}>
          <div className="date-hdr">{fmtDate(date)}</div>
          <div className="tx-card">
            {items.map((t) => (
              <TxRow key={t.id} tx={t} cat={catMap.get(t.categoryId) || fallbackCat}
                onPress={onPress} showList={showList} listName={showList && listMap ? (listMap.get(t.listId) || {}).name : ""} />
            ))}
          </div>
        </div>
      ))}
      {txs.length > limit && <div ref={sentinel} style={{ height: 40 }} />}
    </div>
  );
}

/* ----------------------- Formulario de categoría ----------------------- */
/* El color siempre se genera automáticamente a partir del emoji. */
function CategoryFormSheet({ open, onClose, onSave, listName, initial }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  useEffect(() => {
    if (open) {
      setName(initial ? initial.name : "");
      setEmoji(initial ? initial.emoji : "");
    }
  }, [open, initial]);

  const autoColor = useMemo(() => (emoji ? colorFromEmoji(emoji) : "#3A3A40"), [emoji]);
  const valid = name.trim().length > 0 && emoji.length > 0;

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "Editar categoría" : "Nueva categoría"}
      footer={
        <button className="primary-btn" style={{ marginTop: 12 }} disabled={!valid}
          onClick={() => { haptic(14); onSave({ name: name.trim(), emoji, color: autoColor }); onClose(); }}>
          {initial ? "Guardar cambios" : "Crear categoría"}
        </button>
      }>
      <div style={{ textAlign: "center", padding: "4px 0 16px" }}>
        <input
          className="emoji-big-input"
          value={emoji}
          inputMode="text"
          aria-label="Emoji de la categoría"
          placeholder="+"
          onChange={(e) => { const g = firstGrapheme(e.target.value); setEmoji(g); if (g) haptic(4); }}
          style={{ background: emoji ? `${autoColor}33` : "var(--card2)" }}
        />
        <div style={{ fontSize: 12.5, color: "var(--txt2)", marginTop: 10, fontWeight: 600 }}>
          Toca y elige un emoji con tu teclado · Lista: {listName}
        </div>
      </div>
      <div className="f-group">
        <div className="f-row">
          <span className="f-label">Nombre</span>
          <input className="f-input" value={name} placeholder="Ej. Restaurantes" maxLength={28} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--txt3)", margin: "2px 2px 4px", fontWeight: 600 }}>
        El color se genera automáticamente a partir del emoji.
      </div>
    </Sheet>
  );
}

/* ----------------------- Nube: hook de estado social ----------------------- */
function notifToastInfo(n) {
  const p = n.payload || {};
  if (n.kind === "movement") return { emoji: "👥", text: `${(p.author && p.author.name) || "Alguien"} agregó un ${p.type === "income" ? "ingreso" : "gasto"} a ${p.list_name || "una lista"}` };
  if (n.kind === "friend_request") return { emoji: "🤝", text: `${(p.from && p.from.name) || "Alguien"} quiere añadirte como amigo` };
  if (n.kind === "list_invite") return { emoji: "📨", text: `${(p.from && p.from.name) || "Alguien"} quiere añadirte a una lista compartida` };
  return null;
}

function useCloud(showToast) {
  const [session, setSession] = useState(null);
  const [social, setSocial] = useState(EMPTY_SOCIAL);
  const uid = session && session.user ? session.user.id : null;
  const refetchTimer = useRef(null);
  const syncTimer = useRef(null);

  const refetch = useCallback(() => {
    if (!uid) return;
    clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(async () => {
      try { setSocial(await fetchSocial(uid)); }
      catch (e) { console.error("No se pudo sincronizar", e); }
    }, 200);
  }, [uid]);

  /* sesión */
  useEffect(() => {
    if (!cloudEnabled) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* datos + tiempo real */
  useEffect(() => {
    if (!uid) { setSocial(EMPTY_SOCIAL); return; }
    refetch();
    let ch = supabase.channel("social-" + uid)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, (payload) => {
        refetch();
        if (payload.eventType === "INSERT" && payload.new) {
          const t = notifToastInfo(payload.new);
          if (t) showToast(t.emoji, t.text);
        }
      });
    for (const t of ["shared_transactions", "shared_categories", "shared_lists", "list_members", "friendships", "friend_requests", "profiles"]) {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table: t }, refetch);
    }
    ch.subscribe();
    const onVis = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { supabase.removeChannel(ch); document.removeEventListener("visibilitychange", onVis); };
  }, [uid, refetch, showToast]);

  /* re-registrar una suscripción push existente (sin crear nuevas) */
  useEffect(() => {
    if (uid) refreshPush(uid).catch(() => {});
  }, [uid]);

  const api = useMemo(() => {
    const err = (e) => showToast("⚠️", (e && e.message) || "Error de conexión");
    const call = async (q) => {
      const { data: d, error } = await q;
      if (error) { err(error); return null; }
      refetch();
      return d;
    };
    return {
      signIn: async (email, pass) => {
        const { error } = await cloudApi.signIn(email, pass);
        if (error) showToast("⚠️", "Correo o contraseña incorrectos");
      },
      signUp: async (email, pass, name) => {
        const { data: d, error } = await cloudApi.signUp(email, pass, name);
        if (error) err(error);
        else if (!d.session) showToast("📧", "Revisa tu correo para confirmar la cuenta");
      },
      signOut: () => cloudApi.signOut(),
      syncProfile: (patch) => {
        if (!uid) return;
        clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => { cloudApi.updateProfile(uid, patch).then(() => refetch()); }, 800);
      },
      sendFriendRequest: async (email) => {
        const { data: d, error } = await cloudApi.sendFriendRequest(email);
        if (error) { err(error); return null; }
        const msgs = {
          ok: ["📨", "Solicitud enviada"],
          not_found: ["🔍", "No existe una cuenta con ese correo"],
          self: ["🙃", "Ese es tu propio correo"],
          already_friends: ["👥", "Ya son amigos"],
          already_sent: ["⏳", "Ya le enviaste una solicitud"],
          incoming_exists: ["📬", "Esa persona ya te envió una solicitud: revisa tus notificaciones"],
        };
        const m = msgs[d] || msgs.ok;
        showToast(m[0], m[1]);
        refetch();
        return d;
      },
      respondFriendRequest: async (id, accept, notifId) => {
        const { error } = await cloudApi.respondFriendRequest(id, accept);
        if (error) err(error);
        else showToast(accept ? "🤝" : "🗑️", accept ? "Solicitud aceptada" : "Solicitud rechazada");
        if (notifId) { try { await cloudApi.deleteNotification(notifId); } catch (e) {} }
        refetch();
      },
      removeFriend: async (fid) => {
        const { error } = await cloudApi.removeFriend(fid);
        if (error) err(error); else showToast("👋", "Amigo eliminado");
        refetch();
      },
      createSharedList: async (name) => {
        const { data: d, error } = await cloudApi.createSharedList(name);
        if (error) { err(error); return null; }
        showToast("✨", "Lista compartida creada");
        refetch();
        return d;
      },
      renameSharedList: (id, name) => call(cloudApi.renameSharedList(id, name)),
      leaveSharedList: async (id) => {
        const { error } = await cloudApi.leaveSharedList(id);
        if (error) err(error);
        refetch();
      },
      inviteToList: async (listId, fid) => {
        const { data: d, error } = await cloudApi.inviteToList(listId, fid);
        if (error) { err(error); return null; }
        const msgs = {
          ok: ["📨", "Invitación enviada"],
          already_invited: ["⏳", "Ya tiene una invitación pendiente"],
          already_member: ["👥", "Ya es miembro de la lista"],
          not_friends: ["🤝", "Primero deben ser amigos"],
          not_member: ["⚠️", "No perteneces a esa lista"],
        };
        const m = msgs[d] || msgs.ok;
        showToast(m[0], m[1]);
        refetch();
        return d;
      },
      respondListInvite: async (id, accept, notifId) => {
        const { error } = await cloudApi.respondListInvite(id, accept);
        if (error) err(error);
        else showToast(accept ? "📋" : "🗑️", accept ? "Te uniste a la lista compartida" : "Invitación rechazada");
        if (notifId) { try { await cloudApi.deleteNotification(notifId); } catch (e) {} }
        refetch();
      },
      addCategory: async (listId, p) => {
        try { const c = await cloudApi.addCategory(listId, p); refetch(); return c; }
        catch (e) { err(e); return null; }
      },
      updateCategory: (id, p) => call(cloudApi.updateCategory(id, p)),
      deleteCategory: (id) => call(cloudApi.deleteCategory(id)),
      addTransaction: (p) => call(cloudApi.addTransaction(uid, p)),
      editTransaction: (id, p) => call(cloudApi.editTransaction(id, p)),
      deleteTransaction: (id) => call(cloudApi.deleteTransaction(id)),
      markNotificationsRead: () => call(cloudApi.markNotificationsRead()),
      deleteNotification: (id) => call(cloudApi.deleteNotification(id)),
      enablePush: async () => {
        if (!uid) return "auth";
        try {
          const r = await enablePush(uid);
          const msgs = {
            ok: ["🔔", "Notificaciones push activadas"],
            denied: ["🔕", "Permiso de notificaciones denegado"],
            unsupported: ["⚠️", "Este dispositivo no soporta push"],
            no_key: ["⚠️", "Falta la clave VAPID en config.js"],
            error: ["⚠️", "No se pudo activar el push"],
          };
          const m = msgs[r] || msgs.error;
          showToast(m[0], m[1]);
          return r;
        } catch (e) { showToast("⚠️", "No se pudo activar el push"); return "error"; }
      },
      disablePush: async () => {
        try { await disablePush(); showToast("🔕", "Notificaciones desactivadas"); return true; }
        catch (e) { showToast("⚠️", "No se pudo desactivar"); return false; }
      },
    };
  }, [uid, refetch, showToast]);

  return { enabled: cloudEnabled, session, uid, social, api, refetch };
}

/* ----------------------- Social: acceso, notificaciones, invitaciones ----------------------- */
function AuthBox({ cloud, showToast, defaultName }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState(defaultName || "");
  const [busy, setBusy] = useState(false);
  const valid = /\S+@\S+\.\S+/.test(email) && pass.length >= 6 && (mode === "login" || name.trim().length > 0);

  const submit = async () => {
    if (!valid || busy) return;
    haptic(14);
    setBusy(true);
    if (mode === "login") await cloud.api.signIn(email, pass);
    else await cloud.api.signUp(email, pass, name.trim());
    setBusy(false);
  };

  return (
    <div style={{ padding: "6px 14px 14px" }}>
      <div className="cloud-hint" style={{ padding: "4px 2px 10px" }}>
        Inicia sesión para agregar amigos y compartir listas en tiempo real.
      </div>
      <Segmented
        options={[{ id: "login", label: "Entrar" }, { id: "signup", label: "Crear cuenta" }]}
        value={mode} onChange={setMode} className="mini" />
      <div className="f-group" style={{ marginTop: 14 }}>
        {mode === "signup" && (
          <div className="f-row">
            <span className="f-label">Nombre</span>
            <input className="f-input" value={name} placeholder="Tu nombre" maxLength={30} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="f-row">
          <span className="f-label">Correo</span>
          <input className="f-input" type="email" autoComplete="email" value={email} placeholder="tu@correo.com" onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="f-row">
          <span className="f-label">Contraseña</span>
          <input className="f-input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={pass} placeholder="Mínimo 6 caracteres" onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        </div>
      </div>
      <button className="primary-btn" disabled={!valid || busy} onClick={submit}>
        {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}
      </button>
    </div>
  );
}

function NotifRow({ n, cloud }) {
  const p = n.payload || {};
  const raw = p.from || p.author || null;
  /* perfil actual del remitente (foto al día), con el payload como respaldo */
  const sender = (raw && raw.id && cloud.social.people.get(raw.id)) || raw;
  const senderName = (sender && (sender.name || sender.email)) || "Alguien";
  let title = "", sub = "", actionable = false;
  if (n.kind === "movement") {
    title = `${senderName} agregó un ${p.type === "income" ? "ingreso" : "gasto"} a ${p.list_name || "una lista"}`;
    const amt = `${p.type === "income" ? "+" : "−"}${fmt(Number(p.amount || 0))}`;
    sub = [p.description, amt, timeAgo(n.created_at)].filter(Boolean).join(" · ");
  } else if (n.kind === "friend_request") {
    title = `${senderName} quiere añadirte como amigo`;
    sub = `Solicitud de amistad · ${timeAgo(n.created_at)}`;
    actionable = true;
  } else if (n.kind === "list_invite") {
    title = `${senderName} quiere añadirte a una lista compartida`;
    sub = `${p.list_name ? `Lista: ${p.list_name} · ` : ""}${timeAgo(n.created_at)}`;
    actionable = true;
  } else return null;

  const respond = (accept) => {
    haptic(12);
    if (n.kind === "friend_request") cloud.api.respondFriendRequest(p.request_id, accept, n.id);
    else cloud.api.respondListInvite(p.invite_id, accept, n.id);
  };

  return (
    <div className="notif-row">
      <Avatar profile={sender} size={40} />
      <div className="notif-main">
        <div className="notif-title">{title}</div>
        <div className="notif-sub">{sub}</div>
        {actionable && (
          <div className="notif-actions">
            <button className="btn-accept" onClick={() => respond(true)}>Aceptar</button>
            <button className="btn-reject" onClick={() => respond(false)}>Rechazar</button>
          </div>
        )}
      </div>
      {!actionable && (
        <button className="mini-btn" aria-label="Eliminar notificación" onClick={() => { haptic(); cloud.api.deleteNotification(n.id); }}>
          <Icon name="x" size={13} />
        </button>
      )}
    </div>
  );
}

function NotificationsSheet({ open, onClose, cloud }) {
  const notifs = cloud.social.notifications;
  const hasUnread = notifs.some((n) => !n.read);
  useEffect(() => { if (open && hasUnread) cloud.api.markNotificationsRead(); }, [open, hasUnread]);
  return (
    <Sheet open={open} onClose={onClose} title="Notificaciones">
      {notifs.length === 0 ? (
        <EmptyState emoji="🔕" title="Sin notificaciones"
          sub="Aquí verás solicitudes de amistad, invitaciones y movimientos de tus listas compartidas." />
      ) : (
        <div className="f-group">
          {notifs.map((n) => <NotifRow key={n.id} n={n} cloud={cloud} />)}
        </div>
      )}
    </Sheet>
  );
}

function InviteSheet({ open, onClose, list, cloud }) {
  const listId = list ? list.id : null;
  const memberIds = useMemo(
    () => new Set(cloud.social.members.filter((m) => m.listId === listId).map((m) => m.userId)),
    [cloud.social.members, listId]
  );
  return (
    <Sheet open={open} onClose={onClose} title={list ? `Invitar a “${list.name}”` : "Invitar"}>
      {cloud.social.friends.length === 0 ? (
        <EmptyState emoji="👥" title="Aún no tienes amigos"
          sub="Agrega amigos desde tu perfil para poder invitarlos a listas compartidas." />
      ) : (
        <div className="f-group">
          {cloud.social.friends.map((f) => (
            <div key={f.id} className="f-row" style={{ padding: "11px 14px" }}>
              <Avatar profile={f} size={40} />
              <span style={{ flex: 1, fontWeight: 600, fontSize: 15, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name || f.email}
              </span>
              {memberIds.has(f.id) ? (
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--txt3)" }}>Miembro</span>
              ) : (
                <button className="chip" style={{ padding: "7px 14px" }}
                  onClick={() => { haptic(12); cloud.api.inviteToList(listId, f.id); }}>Invitar</button>
              )}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* ----------------------- Formulario de transacción ----------------------- */
/* Pastillas sin etiqueta: muestran solo la opción seleccionada */
function BarePill({ value, display, options, onChange, aria, active }) {
  return (
    <div className={`dd ${active ? "on" : ""}`}>
      <span className="dd-val" style={{ color: active ? "#FF8A6B" : "var(--txt)" }}>{display}</span>
      <Icon name="chevD" size={12} color={active ? "#FF8A6B" : "var(--txt3)"} />
      <select value={value} aria-label={aria} onChange={(e) => { haptic(); onChange(e.target.value); }}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}

function DatePill({ value, onChange }) {
  return (
    <div className="dd">
      <span className="dd-val" style={{ color: "var(--txt)" }}>{value === todayStr() ? "Hoy" : fmtDate(value)}</span>
      <Icon name="chevD" size={12} color="var(--txt3)" />
      <input type="date" value={value} max="2100-12-31" aria-label="Fecha"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0 }}
        onChange={(e) => e.target.value && onChange(e.target.value)} />
    </div>
  );
}

function TxFormSheet({ open, onClose, data, onSubmit, initial, defaultListId, onCreateCategory, sharedListIds, allowTransfer }) {
  const editing = !!(initial && initial.id);
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [listId, setListId] = useState(defaultListId);
  const [toListId, setToListId] = useState(null);
  const [catId, setCatId] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [freq, setFreq] = useState("none");
  const [photo, setPhoto] = useState(null);
  const [catSheet, setCatSheet] = useState(false);
  const [catExpanded, setCatExpanded] = useState(true);
  const photoRef = useRef(null);

  useEffect(() => {
    if (open) {
      setType(initial ? initial.type : "expense");
      setAmount(initial ? String(initial.amount) : "");
      setDesc(initial ? initial.description : "");
      setListId(initial ? initial.listId : defaultListId);
      setToListId(null);
      setCatId(initial ? initial.categoryId : null);
      setDate(initial ? initial.date : todayStr());
      setFreq(initial && initial.frequency ? initial.frequency : "none");
      setPhoto(initial ? initial.photo || null : null);
      setCatExpanded(!(initial && initial.categoryId));
    }
  }, [open, initial, defaultListId]);

  const pickTxPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    readImageScaled(file, 1100, 0.75, (url) => { setPhoto(url); haptic(8); });
    e.target.value = "";
  };

  const cats = useMemo(() => data.categories.filter((c) => c.listId === listId), [data.categories, listId]);
  useEffect(() => {
    if (open && catId && !cats.some((c) => c.id === catId)) { setCatId(null); setCatExpanded(true); }
  }, [listId, open]); // al cambiar de lista, la categoría debe pertenecer a ella
  useEffect(() => {
    if (toListId && toListId === listId) setToListId(null);
  }, [listId, toListId]);

  const isTransfer = type === "transfer";
  const amt = parseFloat(String(amount).replace(",", "."));
  const list = data.lists.find((l) => l.id === listId);
  const toList = toListId ? data.lists.find((l) => l.id === toListId) : null;
  const isSharedList = !!(sharedListIds && sharedListIds.has(listId));
  const toIsShared = !!(sharedListIds && toListId && sharedListIds.has(toListId));
  /* la repetición vive en este dispositivo: solo entre listas privadas */
  const canRepeat = isTransfer ? (!isSharedList && !toIsShared) : !isSharedList;
  const cSel = catId ? cats.find((c) => c.id === catId) : null;
  const valid = !isNaN(amt) && amt > 0 && !!date && !!listId
    && (isTransfer ? (!!toListId && toListId !== listId) : !!catId);

  const handleCreateCat = (payload) => {
    const res = onCreateCategory(listId, payload);
    const pick = (c) => { if (c && c.id) { setCatId(c.id); setCatExpanded(false); } };
    if (res && typeof res.then === "function") res.then(pick);
    else pick(res);
  };

  const listLabel = (l) => (l.shared ? `${l.name} 👥` : l.name);
  const otherLists = data.lists.filter((l) => l.id !== listId);

  return (
    <>
      <Sheet open={open} onClose={onClose} title={editing ? "Editar movimiento" : "Nuevo movimiento"}
        footer={
          <button className="primary-btn" style={{ marginTop: 12 }} disabled={!valid}
            onClick={() => {
              haptic(16);
              onSubmit(isTransfer
                ? { type: "transfer", amount: Math.round(amt * 100) / 100, listId, toListId, date, photo, frequency: canRepeat ? freq : "none" }
                : { type, amount: Math.round(amt * 100) / 100, description: desc.trim(), listId, categoryId: catId, date, frequency: isSharedList ? "none" : freq, photo });
              onClose();
            }}>
            {editing ? "Guardar cambios" : isTransfer ? "Registrar transferencia" : "Agregar movimiento"}
          </button>
        }>
        {/* línea superior: solo la opción elegida, sin etiquetas */}
        <div className="form-pills">
          <BarePill value={listId} display={list ? listLabel(list) : "—"} aria={isTransfer ? "Lista de origen" : "Lista"}
            onChange={setListId}
            options={data.lists.map((l) => ({ id: l.id, label: listLabel(l) }))} />
          {isTransfer && (
            <BarePill value={toListId || ""} display={toList ? `→ ${listLabel(toList)}` : "→ Elegir"} aria="Lista de destino"
              onChange={(v) => { if (v) setToListId(v); }}
              options={[
                ...(toList ? [] : [{ id: "", label: "→ Elegir lista" }]),
                ...otherLists.map((l) => ({ id: l.id, label: `→ ${listLabel(l)}` })),
              ]} />
          )}
          <DatePill value={date} onChange={setDate} />
          {canRepeat && (
            <BarePill value={freq} display={freqLabel(freq)} aria="Repetición"
              onChange={setFreq}
              options={FREQS.map((f) => ({ id: f.id, label: f.label }))} />
          )}
        </div>

        {/* descripción grande, sin recuadro */}
        {!isTransfer ? (
          <input className="desc-input" value={desc} placeholder="Descripción" maxLength={60}
            aria-label="Descripción" onChange={(e) => setDesc(e.target.value)} />
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--txt2)", textAlign: "center", margin: "6px 4px 2px", fontWeight: 600, lineHeight: 1.5 }}>
            ⇄ Se registrará “hacia {toList ? toList.name : "…"}” en {list ? list.name : "…"} y “desde {list ? list.name : "…"}” en {toList ? toList.name : "…"}.
          </div>
        )}

        {/* monto: interruptor de modos en pequeño a la izquierda (aparece al escribir) */}
        <div className="amount-row">
          {amount.trim() !== "" && (() => {
            const modes = allowTransfer && !editing ? ["expense", "income", "transfer"] : ["expense", "income"];
            const idx = Math.max(0, modes.indexOf(type));
            const signs = { expense: "−", income: "+", transfer: "⇄" };
            const labels = { expense: "Gasto", income: "Ingreso", transfer: "Transferencia" };
            return (
              <div className="mode-seg content-swap" role="tablist">
                <div className={`mode-thumb ${type}`}
                  style={{ width: `calc((100% - 4px) / ${modes.length})`, transform: `translateX(${idx * 100}%)` }} />
                {modes.map((m) => (
                  <button key={m} className={`mode-btn ${type === m ? "on" : ""}`} role="tab" aria-selected={type === m}
                    aria-label={labels[m]} onClick={() => { haptic(); setType(m); }}>
                    {signs[m]}
                  </button>
                ))}
              </div>
            );
          })()}
          <span className="amount-cur" style={{ color: type === "income" ? "var(--green)" : isTransfer ? "#30B0C7" : "var(--txt3)" }}>$</span>
          <input
            className="amount-input" inputMode="decimal" placeholder="0" aria-label="Monto"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.,]/g, "");
              if ((v.match(/[.,]/g) || []).length <= 1) setAmount(v);
            }}
            style={{ color: type === "expense" ? "var(--txt)" : type === "income" ? "var(--green)" : "#30B0C7", width: `${Math.max((amount || "0").length, 1) + 0.15}ch` }}
          />
        </div>

        {/* categorías en chips horizontales */}
        {!isTransfer && (
          <div className="cat-chips">
            {(catExpanded || !cSel) && (
              <button className="cat-chip" aria-label="Crear categoría" onClick={() => { haptic(); setCatSheet(true); }}>
                <Icon name="plus" size={14} /> Nueva
              </button>
            )}
            {cats.filter((c) => catExpanded || !cSel || c.id === catId).map((c) => (
              <button key={c.id} className={`cat-chip ${catId === c.id ? "on" : ""}`}
                onClick={() => {
                  haptic();
                  if (catId === c.id) setCatExpanded((e) => !e);
                  else { setCatId(c.id); setCatExpanded(false); }
                }}>
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
        )}

        {/* foto */}
        <div className="f-group" style={{ marginTop: 10 }}>
          <div className="f-row" style={{ padding: "9px 16px" }}>
            <span className="f-label">Foto</span>
            {photo ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                <img src={photo} alt="Foto adjunta" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "cover", border: "1px solid var(--line2)" }} />
                <button className="mini-btn del" aria-label="Quitar foto" onClick={() => { haptic(); setPhoto(null); }}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                <button className="chip" style={{ padding: "6px 13px", gap: 7 }} onClick={() => { haptic(); photoRef.current && photoRef.current.click(); }}>
                  <Icon name="camera" size={15} /> Adjuntar
                </button>
              </div>
            )}
            <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickTxPhoto} />
          </div>
        </div>

        {isSharedList && !isTransfer && (
          <div style={{ fontSize: 12.5, color: "var(--txt2)", margin: "8px 4px 0", fontWeight: 600, lineHeight: 1.5 }}>
            👥 Lista compartida: los demás miembros verán este movimiento al instante.
          </div>
        )}
        {!isSharedList && !isTransfer && freq !== "none" && !editing && (
          <div style={{ fontSize: 12.5, color: "var(--txt2)", margin: "8px 4px 0", fontWeight: 600, lineHeight: 1.5 }}>
            🔁 Se creará automáticamente {freqLabel(freq).toLowerCase()} a partir del {fmtDate(date)}. Puedes gestionarlo desde tu perfil.
          </div>
        )}
      </Sheet>
      <CategoryFormSheet open={catSheet} onClose={() => setCatSheet(false)} onSave={handleCreateCat} listName={list ? list.name : ""} />
    </>
  );
}

/* ----------------------- Selector de período ----------------------- */
function PeriodSheet({ open, onClose, period, setPeriod, txs }) {
  const [mode, setMode] = useState(period.mode);
  const [year, setYear] = useState(period.year);
  useEffect(() => { if (open) { setMode(period.mode); setYear(period.year); } }, [open]);

  const { years, byYear, byMonth } = useMemo(() => {
    const byYear = new Map(), byMonth = new Map();
    for (const t of txs) {
      const y = +t.date.slice(0, 4), m = +t.date.slice(5, 7);
      const v = t.type === "income" ? t.amount : -t.amount;
      byYear.set(y, (byYear.get(y) || 0) + v);
      const k = y + "-" + m;
      byMonth.set(k, (byMonth.get(k) || 0) + v);
    }
    const now = new Date().getFullYear();
    const ys = [...new Set([...byYear.keys(), now])].sort((a, b) => b - a);
    return { years: ys, byYear, byMonth };
  }, [txs]);

  const balCls = (v) => (v > 0.004 ? "pos" : v < -0.004 ? "neg" : "zero");
  const balTxt = (v) => (v > 0.004 ? "+" : v < -0.004 ? "−" : "") + fmtShort(v);

  return (
    <Sheet open={open} onClose={onClose} title="Período">
      <Segmented
        options={[{ id: "all", label: "Todo" }, { id: "year", label: "Año" }, { id: "month", label: "Mes" }]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          if (m === "all") { setPeriod({ mode: "all", year, month: period.month }); onClose(); }
        }}
      />
      <div style={{ height: 16 }} />
      {mode === "year" && (
        <div className="f-group content-swap">
          {years.map((y) => {
            const v = byYear.get(y) || 0;
            const on = period.mode === "year" && period.year === y;
            return (
              <button key={y} className="row-pick" onClick={() => { haptic(); setPeriod({ mode: "year", year: y, month: period.month }); onClose(); }}>
                <div className="r-main">{y}<div className={`r-sub m-bal ${balCls(v)}`}>{balTxt(v)}</div></div>
                {on && <span className="check"><Icon name="check" size={18} /></span>}
              </button>
            );
          })}
        </div>
      )}
      {mode === "month" && (
        <div className="content-swap">
          <div className="year-stepper">
            <button className="step-btn" onClick={() => { haptic(); setYear((y) => y - 1); }} aria-label="Año anterior"><Icon name="chevL" /></button>
            <div className="yr">{year}</div>
            <button className="step-btn" onClick={() => { haptic(); setYear((y) => y + 1); }} aria-label="Año siguiente"><Icon name="chevR" /></button>
          </div>
          <div className="month-grid">
            {MONTHS.map((m, i) => {
              const v = byMonth.get(year + "-" + (i + 1)) || 0;
              const has = byMonth.has(year + "-" + (i + 1));
              const on = period.mode === "month" && period.year === year && period.month === i + 1;
              return (
                <button key={m} className={`month-cell ${on ? "on" : ""} ${has ? "" : "dim"}`}
                  onClick={() => { haptic(); setPeriod({ mode: "month", year, month: i + 1 }); onClose(); }}>
                  <div className="m-name">{MONTHS_S[i]}</div>
                  <div className={`m-bal ${balCls(v)}`}>{has ? balTxt(v) : "—"}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ----------------------- Formulario de lista (privada o compartida) ----------------------- */
function ListFormSheet({ open, onClose, canShare, onCreate }) {
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const privColor = useMemo(() => colorFromEmoji("🤫"), []);
  const shareColor = useMemo(() => colorFromEmoji("👥"), []);
  useEffect(() => { if (open) { setName(""); setShared(false); } }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Nueva lista"
      footer={
        <button className="primary-btn" style={{ marginTop: 12 }} disabled={!name.trim()}
          onClick={() => { haptic(14); onCreate(name.trim(), shared && canShare); onClose(); }}>
          Crear lista
        </button>
      }>
      <div className="f-group">
        <div className="f-row">
          <span className="f-label">Nombre</span>
          <input className="f-input" value={name} placeholder="Ej. Viajes" maxLength={28}
            onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      {canShare ? (
        <div className="f-group">
          <button className="row-pick" onClick={() => { haptic(); setShared(false); }}>
            <EmojiBubble emoji="🤫" color={privColor} size={40} />
            <div className="r-main">Privada
              <div className="r-sub">Solo tú la verás, se guarda en este dispositivo</div>
            </div>
            {!shared && <span className="check"><Icon name="check" size={18} /></span>}
          </button>
          <button className="row-pick" onClick={() => { haptic(); setShared(true); }}>
            <EmojiBubble emoji="👥" color={shareColor} size={40} />
            <div className="r-main">Compartida
              <div className="r-sub">Invita amigos y sincroniza en tiempo real</div>
            </div>
            {shared && <span className="check"><Icon name="check" size={18} /></span>}
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--txt3)", margin: "2px 2px 4px", fontWeight: 600 }}>
          Inicia sesión en Perfil → Amigos para poder crear listas compartidas.
        </div>
      )}
    </Sheet>
  );
}

/* ----------------------- Selector de lista ----------------------- */
function ListSheet({ open, onClose, data, onSelect, onCreate, canShare }) {
  const [formOpen, setFormOpen] = useState(false);
  const privColor = useMemo(() => colorFromEmoji("🤫"), []);
  const shareColor = useMemo(() => colorFromEmoji("👥"), []);
  useEffect(() => { if (open) setFormOpen(false); }, [open]);

  const balances = useMemo(() => {
    const m = new Map();
    for (const t of data.transactions) {
      m.set(t.listId, (m.get(t.listId) || 0) + (t.type === "income" ? t.amount : -t.amount));
    }
    return m;
  }, [data.transactions]);

  return (
    <>
    <Sheet open={open} onClose={onClose} title="Mis listas">
      <div className="f-group">
        {data.lists.map((l) => {
          const v = balances.get(l.id) || 0;
          const on = l.id === data.activeListId;
          return (
            <button key={l.id} className="row-pick" onClick={() => { haptic(12); onSelect(l.id); onClose(); }}>
              <EmojiBubble emoji={l.shared ? "👥" : "🤫"} color={l.shared ? shareColor : privColor} size={40} />
              <div className="r-main">{l.name}
                <div className="r-sub" style={{ color: v > 0.004 ? "var(--green)" : v < -0.004 ? "var(--red)" : "var(--txt3)" }}>
                  {(v > 0.004 ? "+" : v < -0.004 ? "−" : "") + fmt(v)}
                </div>
              </div>
              {on && <span className="check"><Icon name="check" size={18} /></span>}
            </button>
          );
        })}
      </div>
      <button className="add-row" style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--line)" }}
        onClick={() => { haptic(); setFormOpen(true); }}>
        <Icon name="plus" size={17} /> Nueva lista
      </button>
    </Sheet>
    <ListFormSheet open={formOpen} onClose={() => setFormOpen(false)} canShare={canShare}
      onCreate={(v, shared) => { onCreate(v, shared); onClose(); }} />
    </>
  );
}

/* ----------------------- Buscador ----------------------- */
function SearchScreen({ requestClose, data, onPressTx }) {
  const now = new Date();
  const [q, setQ] = useState("");
  const [type, setType] = useState("both"); // both | expense | income
  const [listId, setListId] = useState("all");
  const [catId, setCatId] = useState("all");
  const [sPeriod, setSPeriod] = useState({ mode: "all", year: now.getFullYear(), month: now.getMonth() + 1 });
  const [periodOpen, setPeriodOpen] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 350); return () => clearTimeout(t); }, []);

  const catMap = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const listMap = useMemo(() => new Map(data.lists.map((l) => [l.id, l])), [data.lists]);
  const catOptions = useMemo(
    () => data.categories.filter((c) => listId === "all" || c.listId === listId),
    [data.categories, listId]
  );
  /* con "Todas las listas", las categorías repetidas (mismo emoji y nombre)
     se muestran una sola vez y al filtrar se incluyen todas sus gemelas */
  const catGroups = useMemo(() => {
    const map = new Map();
    for (const c of catOptions) {
      const k = c.emoji + "|" + c.name.trim().toLowerCase();
      if (!map.has(k)) map.set(k, { rep: c, ids: [c.id] });
      else map.get(k).ids.push(c.id);
    }
    return [...map.values()];
  }, [catOptions]);
  const catIdSet = useMemo(() => {
    if (catId === "all") return null;
    const g = catGroups.find((x) => x.ids.includes(catId));
    return new Set(g ? g.ids : [catId]);
  }, [catId, catGroups]);
  useEffect(() => { if (catId !== "all" && !catOptions.some((c) => c.id === catId)) setCatId("all"); }, [listId]);

  /* transacciones del ámbito de lista elegido (para balances del selector de período) */
  const scopeTxs = useMemo(
    () => (listId === "all" ? data.transactions : data.transactions.filter((t) => t.listId === listId)),
    [data.transactions, listId]
  );

  const inPeriod = useCallback((t) => {
    if (sPeriod.mode === "all") return true;
    if (sPeriod.mode === "year") return t.date.slice(0, 4) === String(sPeriod.year);
    return t.date.slice(0, 7) === sPeriod.year + "-" + pad2(sPeriod.month);
  }, [sPeriod]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.transactions
      .filter((t) => {
        if (type !== "both" && t.type !== type) return false;
        if (listId !== "all" && t.listId !== listId) return false;
        if (catIdSet && !catIdSet.has(t.categoryId)) return false;
        if (!inPeriod(t)) return false;
        if (needle) {
          const c = catMap.get(t.categoryId);
          const hay = ((t.description || "") + " " + (c ? c.name : "")).toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [data.transactions, q, type, listId, catIdSet, inPeriod, catMap]);

  const total = useMemo(() => results.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0), [results]);

  const typeLabels = { both: "Ambos", expense: "Solo gastos", income: "Solo ingresos" };
  const periodLabel = sPeriod.mode === "all" ? "Todo el tiempo"
    : sPeriod.mode === "year" ? String(sPeriod.year)
    : `${MONTHS_S[sPeriod.month - 1]} ${sPeriod.year}`;
  const listLabel = listId === "all" ? "Todas" : (listMap.get(listId) || {}).name;
  const cSel = catId === "all" ? null : catMap.get(catId);
  const catLabel = cSel ? `${cSel.emoji} ${cSel.name}` : "Todas";

  return (
    <>
      <div className="overlay-hdr">
        <div className="search-input-wrap">
          <span style={{ color: "var(--txt3)", display: "grid" }}><Icon name="search" size={16} /></span>
          <input ref={inputRef} value={q} placeholder="Buscar movimientos…" onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
          {q && <button onClick={() => setQ("")} style={{ color: "var(--txt3)", display: "grid" }} aria-label="Borrar"><Icon name="x" size={14} /></button>}
        </div>
        <button className="cancel-txt" onClick={requestClose}>Cancelar</button>
      </div>
      <div className="overlay-body">
        <div className="search-filters">
          <BarePill value={type} display={typeLabels[type]} active={type !== "both"} aria="Tipo"
            onChange={setType}
            options={[{ id: "both", label: "Gastos e ingresos" }, { id: "expense", label: "Solo gastos" }, { id: "income", label: "Solo ingresos" }]} />
          <button className={`dd ${sPeriod.mode !== "all" ? "on" : ""}`} onClick={() => { haptic(); setPeriodOpen(true); }} aria-label="Filtrar por fecha">
            <span className="dd-val" style={{ color: sPeriod.mode !== "all" ? "#FF8A6B" : "var(--txt)" }}>{periodLabel}</span>
            <Icon name="chevD" size={12} color={sPeriod.mode !== "all" ? "#FF8A6B" : "var(--txt3)"} />
          </button>
          <BarePill value={listId} display={listLabel} active={listId !== "all"} aria="Listas"
            onChange={setListId}
            options={[{ id: "all", label: "Todas las listas" }, ...data.lists.map((l) => ({ id: l.id, label: l.name }))]} />
          <BarePill value={catId} display={catLabel} active={catId !== "all"} aria="Categorías"
            onChange={setCatId}
            options={[{ id: "all", label: "Todas las categorías" }, ...catGroups.map((g) => ({ id: g.rep.id, label: `${g.rep.emoji} ${g.rep.name}` }))]} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "14px 4px 0" }}>
          <div className="section-title" style={{ margin: 0 }}>{results.length} resultado{results.length === 1 ? "" : "s"}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: total > 0.004 ? "var(--green)" : total < -0.004 ? "var(--red)" : "var(--txt3)" }}>
            {(total > 0.004 ? "+" : total < -0.004 ? "−" : "") + fmt(total)}
          </div>
        </div>
        {results.length === 0 ? (
          <div style={{ marginTop: 14 }}>
            <EmptyState emoji="🔍" title="Sin resultados" sub="Prueba con otro texto o ajusta los filtros." />
          </div>
        ) : (
          <GroupedTxList txs={results} catMap={catMap} listMap={listMap} showList onPress={onPressTx} animKey={"search"} />
        )}
      </div>
      <PeriodSheet open={periodOpen} onClose={() => setPeriodOpen(false)} period={sPeriod} setPeriod={setSPeriod} txs={scopeTxs} />
    </>
  );
}

/* ----------------------- Hoja para renombrar / crear con texto ----------------------- */
function PromptSheet({ open, onClose, title, placeholder, initial = "", confirmLabel = "Guardar", onConfirm }) {
  const [v, setV] = useState(initial);
  useEffect(() => { if (open) setV(initial); }, [open, initial]);
  return (
    <Sheet open={open} onClose={onClose} title={title}
      footer={<button className="primary-btn" style={{ marginTop: 10 }} disabled={!v.trim()} onClick={() => { haptic(14); onConfirm(v.trim()); onClose(); }}>{confirmLabel}</button>}>
      <div className="f-group">
        <div className="f-row">
          <input className="f-input left" autoFocus value={v} placeholder={placeholder} maxLength={28} onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onConfirm(v.trim()); onClose(); } }} />
        </div>
      </div>
    </Sheet>
  );
}

/* ----------------------- Perfil ----------------------- */
function GrayIconBubble({ emoji }) {
  return <div className="ebubble" style={{ width: 40, height: 40, fontSize: 20, background: "#2E2E33" }}>{emoji}</div>;
}

function ProfileScreen({ requestClose, data, actions, showToast, cloud, sharedListIds }) {
  const [open, setOpen] = useState(null); // 'friends' | 'cats' | 'lists' | 'rec'
  const [catListId, setCatListId] = useState(data.activeListId);
  const [catForm, setCatForm] = useState(null);   // {initial} | 'new'
  const [newList, setNewList] = useState(false);
  const [confirm, setConfirm] = useState(null);   // {title,message,label,fn}
  const [recEdit, setRecEdit] = useState(null);   // regla recurrente en edición
  const [friendEmail, setFriendEmail] = useState("");
  const [inviteList, setInviteList] = useState(null); // lista compartida a la que invitar
  const [pushOn, setPushOn] = useState(false);
  const fileRef = useRef(null);

  const privColor = useMemo(() => colorFromEmoji("🤫"), []);
  const shareColor = useMemo(() => colorFromEmoji("👥"), []);
  const bellColor = useMemo(() => colorFromEmoji("🔔"), []);
  const accColor = useMemo(() => colorFromEmoji("⤵️"), []);

  useEffect(() => {
    let alive = true;
    hasPushSubscription().then((v) => { if (alive) setPushOn(v); });
    return () => { alive = false; };
  }, [cloud.uid]);

  const togglePush = async () => {
    if (pushOn) { if (await cloud.api.disablePush()) setPushOn(false); }
    else { const r = await cloud.api.enablePush(); if (r === "ok") setPushOn(true); }
  };

  const listName = (id) => { const l = data.lists.find((x) => x.id === id); return l ? l.name : "—"; };
  const catsOf = data.categories.filter((c) => c.listId === catListId);
  const catMap = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);

  const pickPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const S = 180; c.width = c.height = S;
        const x = c.getContext("2d");
        const r = Math.max(S / img.width, S / img.height);
        x.drawImage(img, (S - img.width * r) / 2, (S - img.height * r) / 2, img.width * r, img.height * r);
        actions.setProfile({ photo: c.toDataURL("image/jpeg", 0.82) });
        showToast("📸", "Foto actualizada");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const toggle = (k) => { haptic(); setOpen((o) => (o === k ? null : k)); };

  return (
    <>
      <div className="overlay-hdr" style={{ justifyContent: "space-between" }}>
        <div className="sheet-title">Perfil</div>
        <button className="sheet-close" onClick={requestClose} aria-label="Cerrar"><Icon name="x" size={15} /></button>
      </div>
      <div className="overlay-body">
        <div className="prof-head">
          <button className="avatar-big" onClick={() => { haptic(); fileRef.current && fileRef.current.click(); }} aria-label="Cambiar foto de perfil">
            {data.profile.photo ? <img src={data.profile.photo} alt="Foto de perfil" /> : <Icon name="user" size={40} color="var(--txt3)" />}
            <span className="avatar-edit"><Icon name="camera" size={14} color="#fff" /></span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickPhoto} />
          <input className="name-input" value={data.profile.name} placeholder="Tu nombre" maxLength={30}
            onChange={(e) => actions.setProfile({ name: e.target.value })} />
          {cloud.enabled && cloud.uid && (
            <div className="account-card">
              <Avatar profile={cloud.social.profile} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(cloud.social.profile && cloud.social.profile.name) || "Sin nombre"}
                </div>
                <div style={{ fontSize: 12, color: "var(--txt2)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cloud.session.user.email}
                </div>
              </div>
              <button className="mini-btn" aria-label="Cerrar sesión" onClick={() => { haptic(); cloud.api.signOut(); }}>
                <Icon name="logout" size={14} />
              </button>
            </div>
          )}
        </div>

        {/* -------- Amigos -------- */}
        <div className="disclosure">
          <button className="disc-head" onClick={() => toggle("friends")} aria-expanded={open === "friends"}>
            <GrayIconBubble emoji="👥" />
            <span className="disc-title">Amigos</span>
            <span className={`chev ${open === "friends" ? "open" : ""}`}><Icon name="chevR" size={16} /></span>
          </button>
          {open === "friends" && (
            <div className="disc-body">
              {!cloud.enabled ? (
                <div className="cloud-hint">
                  Para usar amigos y listas compartidas necesitas conectar la app a Supabase:
                  edita el archivo <b>config.js</b> con la URL y la clave de tu proyecto (los pasos completos están en el README).
                </div>
              ) : !cloud.uid ? (
                <AuthBox cloud={cloud} showToast={showToast} defaultName={data.profile.name} />
              ) : (
                <>
                  <div className="f-row" style={{ padding: "8px 14px" }}>
                    <input className="f-input left" type="email" value={friendEmail} placeholder="correo@de-tu-amigo.com"
                      onChange={(e) => setFriendEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && friendEmail.trim()) { cloud.api.sendFriendRequest(friendEmail); setFriendEmail(""); } }} />
                    <button className="chip" style={{ padding: "7px 14px" }} disabled={!friendEmail.trim()}
                      onClick={() => { haptic(12); cloud.api.sendFriendRequest(friendEmail); setFriendEmail(""); }}>Agregar</button>
                  </div>
                  {cloud.social.friends.length === 0 ? (
                    <div className="cloud-hint">
                      Aún no tienes amigos agregados. Escribe el correo de tu amigo y envíale una solicitud:
                      le llegará una notificación para aceptarla.
                    </div>
                  ) : cloud.social.friends.map((f) => (
                    <SwipeRow key={f.id} deleteLabel={`Eliminar a ${f.name || f.email}`} onDelete={() => {
                      setConfirm({
                        title: `¿Eliminar a “${f.name || f.email}”?`,
                        message: "Se eliminará de la lista de amigos de ambos. Podrán volver a agregarse más adelante.",
                        fn: () => cloud.api.removeFriend(f.id),
                      });
                    }}>
                      <div className="f-row" style={{ padding: "11px 14px" }}>
                        <Avatar profile={f} size={40} />
                        <span style={{ flex: 1, fontWeight: 600, fontSize: 15, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.name || f.email}
                        </span>
                      </div>
                    </SwipeRow>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* -------- Notificaciones (interruptor) -------- */}
        {cloud.enabled && cloud.uid && (
          <div className="disclosure">
            <div className="disc-head" style={{ cursor: "default" }}>
              <EmojiBubble emoji="🔔" color={bellColor} size={40} fontSize={20} />
              <span className="disc-title">Activar notificaciones</span>
              <Switch on={pushOn} onToggle={togglePush} label="Activar notificaciones" />
            </div>
          </div>
        )}

        {/* -------- Acumulado (interruptor) -------- */}
        <div className="disclosure">
          <div className="disc-head" style={{ cursor: "default" }}>
            <EmojiBubble emoji="⤵️" color={accColor} size={40} fontSize={20} />
            <span className="disc-title">Acumulado</span>
            <Switch on={!data.settings || data.settings.accumulate !== false}
              onToggle={() => actions.setSetting({ accumulate: !(!data.settings || data.settings.accumulate !== false) })}
              label="Acumulado" />
          </div>
        </div>

        {/* -------- Categorías -------- */}
        <div className="disclosure">
          <button className="disc-head" onClick={() => toggle("cats")} aria-expanded={open === "cats"}>
            <GrayIconBubble emoji="📊" />
            <span className="disc-title">Categorías</span>
            <span className={`chev ${open === "cats" ? "open" : ""}`}><Icon name="chevR" size={16} /></span>
          </button>
          {open === "cats" && (
            <div className="disc-body">
              <div className="filter-row" style={{ padding: "12px 14px 4px" }}>
                {data.lists.map((l) => (
                  <button key={l.id} className={`f-chip ${catListId === l.id ? "on" : ""}`} onClick={() => { haptic(); setCatListId(l.id); }}>{l.name}</button>
                ))}
              </div>
              {catsOf.map((c) => (
                <SwipeRow key={c.id} deleteLabel={`Eliminar ${c.name}`} onDelete={() => {
                  const n = data.transactions.filter((t) => t.categoryId === c.id).length;
                  setConfirm({
                    title: `¿Eliminar “${c.name}”?`,
                    message: n ? `También se eliminarán ${n} movimiento${n === 1 ? "" : "s"} y sus recurrencias. Esta acción no se puede deshacer.` : "Esta acción no se puede deshacer.",
                    fn: () => { actions.deleteCategory(c.id); showToast("🗑️", "Categoría eliminada"); },
                  });
                }}>
                  <div className="f-row" style={{ padding: "11px 14px" }}>
                    <button aria-label={`Cambiar emoji de ${c.name}`} onClick={() => { haptic(); setCatForm({ initial: c }); }}>
                      <EmojiBubble emoji={c.emoji} color={c.color} size={40} />
                    </button>
                    <input className="f-input left" style={{ fontWeight: 600, fontSize: 15, padding: 0, margin: 0, height: "auto", lineHeight: 1.3 }} defaultValue={c.name} maxLength={28}
                      aria-label={`Nombre de ${c.name}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== c.name) { actions.updateCategory(c.id, { name: v }); showToast("✅", "Categoría actualizada"); }
                        else e.target.value = c.name;
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
                  </div>
                </SwipeRow>
              ))}
              <button className="add-row" onClick={() => { haptic(); setCatForm({ initial: null }); }}><Icon name="plus" size={16} /> Agregar categoría</button>
            </div>
          )}
        </div>

        {/* -------- Listas -------- */}
        <div className="disclosure">
          <button className="disc-head" onClick={() => toggle("lists")} aria-expanded={open === "lists"}>
            <GrayIconBubble emoji="📝" />
            <span className="disc-title">Listas</span>
            <span className={`chev ${open === "lists" ? "open" : ""}`}><Icon name="chevR" size={16} /></span>
          </button>
          {open === "lists" && (
            <div className="disc-body">
              {data.lists.map((l) => {
                const isShared = !!l.shared;
                const isOwner = isShared && cloud && l.owner === cloud.uid;
                const nMembers = isShared ? cloud.social.members.filter((m) => m.listId === l.id).length : 0;
                const subParts = [];
                if (isShared && nMembers > 0) subParts.push(`${nMembers} miembro${nMembers === 1 ? "" : "s"}`);
                if (l.id === data.activeListId) subParts.push("Activa");
                return (
                  <SwipeRow key={l.id} deleteLabel={isShared && !isOwner ? `Salir de ${l.name}` : `Eliminar ${l.name}`} onDelete={() => {
                    if (!isShared && data.lists.filter((x) => !x.shared).length === 1) { showToast("⚠️", "Necesitas al menos una lista"); return; }
                    const n = data.transactions.filter((t) => t.listId === l.id).length;
                    setConfirm(isShared ? {
                      title: isOwner ? `¿Eliminar “${l.name}”?` : `¿Salir de “${l.name}”?`,
                      message: isOwner
                        ? "Es una lista compartida: se eliminará para todos los miembros junto con sus movimientos."
                        : "Saldrás de esta lista compartida. Los demás miembros la conservarán.",
                      label: isOwner ? "Eliminar" : "Salir",
                      fn: () => { actions.deleteList(l.id); showToast("🗑️", isOwner ? "Lista eliminada" : "Saliste de la lista"); },
                    } : {
                      title: `¿Eliminar “${l.name}”?`,
                      message: `Se eliminarán sus categorías, recurrencias y ${n} movimiento${n === 1 ? "" : "s"}. Esta acción no se puede deshacer.`,
                      fn: () => { actions.deleteList(l.id); showToast("🗑️", "Lista eliminada"); },
                    });
                  }}>
                    <div className="f-row" style={{ padding: "11px 14px" }}>
                      <EmojiBubble emoji={isShared ? "👥" : "🤫"} color={isShared ? shareColor : privColor} size={40} />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 1 }}>
                        <input className="f-input left" defaultValue={l.name} maxLength={28}
                          style={{ fontWeight: 600, fontSize: 15, width: "100%", display: "block", padding: 0, margin: 0, height: "auto", lineHeight: 1.3 }}
                          aria-label={`Nombre de ${l.name}`}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== l.name) { actions.renameList(l.id, v); showToast("✅", "Lista renombrada"); }
                            else e.target.value = l.name;
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
                        {subParts.length > 0 && (
                          <div style={{ fontSize: 11.5, color: "var(--txt2)", fontWeight: 700, lineHeight: 1.3 }}>{subParts.join(" · ")}</div>
                        )}
                      </div>
                      {isShared && (
                        <button className="mini-btn" aria-label={`Invitar amigos a ${l.name}`} onClick={() => { haptic(); setInviteList(l); }}>
                          <Icon name="userplus" size={14} />
                        </button>
                      )}
                    </div>
                  </SwipeRow>
                );
              })}
              <button className="add-row" onClick={() => { haptic(); setNewList(true); }}><Icon name="plus" size={16} /> Agregar lista</button>
            </div>
          )}
        </div>

        {/* -------- Recurrentes -------- */}
        <div className="disclosure">
          <button className="disc-head" onClick={() => toggle("rec")} aria-expanded={open === "rec"}>
            <GrayIconBubble emoji="🔁" />
            <span className="disc-title">Transacciones recurrentes</span>
            <span className={`chev ${open === "rec" ? "open" : ""}`}><Icon name="chevR" size={16} /></span>
          </button>
          {open === "rec" && (
            <div className="disc-body">
              {data.recurring.length === 0 && (
                <div style={{ padding: "16px 16px 6px", fontSize: 13.5, color: "var(--txt2)", lineHeight: 1.5 }}>
                  Aún no tienes recurrencias. Crea un movimiento y elige una repetición para verlo aquí.
                </div>
              )}
              {data.recurring.map((r) => {
                const isTr = r.type === "transfer";
                const c = isTr
                  ? { emoji: "🔁", color: "#30B0C7", name: "Transferencia" }
                  : catMap.get(r.categoryId) || { emoji: "❓", color: "#5D5D64", name: "—" };
                return (
                  <SwipeRow key={r.id} deleteLabel="Eliminar recurrencia" onDelete={() => {
                    setConfirm({
                      title: "¿Eliminar recurrencia?",
                      message: "Los movimientos ya generados se conservarán, pero no se crearán nuevos.",
                      fn: () => { actions.deleteRecurring(r.id); showToast("🗑️", "Recurrencia eliminada"); },
                    });
                  }}>
                    <button className="f-row" style={{ padding: "11px 14px", width: "100%", textAlign: "left" }}
                      aria-label={`Editar recurrencia ${r.description || c.name}`}
                      onClick={() => {
                        haptic();
                        if (isTr) showToast("⇄", "Para cambiarla, elimínala y créala de nuevo");
                        else setRecEdit(r);
                      }}>
                      <EmojiBubble emoji={c.emoji} color={c.color} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {isTr ? "Transferencia" : (r.description || c.name)} · <span style={{ color: r.type === "income" ? "var(--green)" : isTr ? "#30B0C7" : "var(--red)" }}>{r.type === "income" ? "+" : isTr ? "⇄" : "−"}{fmt(r.amount)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--txt2)", fontWeight: 600, marginTop: 1 }}>
                          {freqLabel(r.frequency)} · {isTr ? `${listName(r.listId)} → ${listName(r.toListId)}` : listName(r.listId)} · próx. {r.nextDate ? fmtDate(r.nextDate) : "—"}
                        </div>
                      </div>
                    </button>
                  </SwipeRow>
                );
              })}
              <button className="add-row" onClick={() => { haptic(); setRecEdit({ __new: true }); }}><Icon name="plus" size={16} /> Agregar recurrencia</button>
            </div>
          )}
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--txt3)", fontWeight: 600, padding: "18px 0 6px" }}>
          {cloud.uid
            ? "Tus datos locales se guardan en este dispositivo; las listas compartidas se sincronizan en tiempo real."
            : "Tus datos se guardan de forma segura en este dispositivo."}
        </div>
      </div>

      {/* hojas secundarias del perfil */}
      <CategoryFormSheet
        open={!!catForm} onClose={() => setCatForm(null)} listName={listName(catListId)} initial={catForm ? catForm.initial : null}
        onSave={(p) => {
          if (catForm && catForm.initial) { actions.updateCategory(catForm.initial.id, p); showToast("✅", "Categoría actualizada"); }
          else { actions.createCategory(catListId, p); showToast("✨", "Categoría creada"); }
        }}
      />
      <ListFormSheet open={newList} onClose={() => setNewList(false)} canShare={!!(cloud.enabled && cloud.uid)}
        onCreate={(v, shared) => {
          if (shared) cloud.api.createSharedList(v);
          else { actions.createList(v); showToast("✨", "Lista creada"); }
        }} />
      <TxFormSheet
        open={!!recEdit} onClose={() => setRecEdit(null)} data={data} defaultListId={data.activeListId} sharedListIds={sharedListIds}
        initial={recEdit && !recEdit.__new ? { id: recEdit.id, type: recEdit.type, amount: recEdit.amount, description: recEdit.description, listId: recEdit.listId, categoryId: recEdit.categoryId, date: recEdit.nextDate || recEdit.startDate, frequency: recEdit.frequency } : null}
        onCreateCategory={(lid, p) => actions.createCategory(lid, p)}
        onSubmit={(p) => {
          if (recEdit && !recEdit.__new) {
            actions.updateRecurring(recEdit.id, p);
            showToast("✅", "Recurrencia actualizada");
          } else {
            if (p.frequency === "none") p.frequency = "mes";
            actions.addTransaction(p);
            showToast("🔁", "Recurrencia creada");
          }
        }}
      />
      <ConfirmSheet open={!!confirm} onClose={() => setConfirm(null)} title={confirm ? confirm.title : ""} message={confirm ? confirm.message : ""}
        confirmLabel={confirm && confirm.label ? confirm.label : "Eliminar"} onConfirm={() => confirm && confirm.fn()} />
      <InviteSheet open={!!inviteList} onClose={() => setInviteList(null)} list={inviteList} cloud={cloud} />
    </>
  );
}

/* ----------------------- App ----------------------- */
export default function App() {
  const [data, setData] = useState(null);
  const [txType, setTxType] = useState("expense");
  const now = new Date();
  const [period, setPeriod] = useState({ mode: "all", year: now.getFullYear(), month: now.getMonth() + 1 });
  const [selectedBar, setSelectedBar] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [actionTx, setActionTx] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [photoView, setPhotoView] = useState(null); // foto de movimiento a pantalla completa
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((emoji, text) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), emoji, text });
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const cloud = useCloud(showToast);

  /* carga inicial + generación de recurrencias */
  useEffect(() => {
    let alive = true;
    loadData().then((d) => {
      if (!alive) return;
      const nd = runRecurring(d);
      setData(nd);
      if (nd !== d) persist(nd);
    });
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setData((d) => {
          if (!d) return d;
          const nd = runRecurring(d);
          if (nd !== d) persist(nd);
          return nd;
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const update = useCallback((fn) => {
    setData((d) => { const nd = fn(d); persist(nd); return nd; });
  }, []);

  /* ----------------- acciones ----------------- */
  const actions = useMemo(() => ({
    setProfile: (patch) => update((d) => ({ ...d, profile: { ...d.profile, ...patch } })),
    setSetting: (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    setActiveList: (id) => update((d) => ({ ...d, activeListId: id })),
    createList: (name) => {
      const l = { id: uid(), name };
      update((d) => ({ ...d, lists: [...d.lists, l], activeListId: l.id }));
      return l;
    },
    renameList: (id, name) => update((d) => ({ ...d, lists: d.lists.map((l) => (l.id === id ? { ...l, name } : l)) })),
    deleteList: (id) => update((d) => {
      const lists = d.lists.filter((l) => l.id !== id);
      return {
        ...d, lists,
        activeListId: d.activeListId === id ? lists[0].id : d.activeListId,
        categories: d.categories.filter((c) => c.listId !== id),
        transactions: d.transactions.filter((t) => t.listId !== id),
        recurring: d.recurring.filter((r) => r.listId !== id),
      };
    }),
    createCategory: (listId, { name, emoji, color }) => {
      const cat = { id: uid(), listId, name, emoji, color };
      update((d) => ({ ...d, categories: [...d.categories, cat] }));
      return cat;
    },
    updateCategory: (id, patch) => update((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    deleteCategory: (id) => update((d) => ({
      ...d,
      categories: d.categories.filter((c) => c.id !== id),
      transactions: d.transactions.filter((t) => t.categoryId !== id),
      recurring: d.recurring.filter((r) => r.categoryId !== id),
    })),
    addTransaction: (p) => update((d) => {
      if (p.frequency && p.frequency !== "none") {
        const rule = {
          id: uid(), listId: p.listId, categoryId: p.categoryId, type: p.type,
          amount: p.amount, description: p.description, frequency: p.frequency,
          startDate: p.date, nextDate: p.date,
        };
        return runRecurring({ ...d, recurring: [...d.recurring, rule] });
      }
      const tx = { id: uid(), listId: p.listId, categoryId: p.categoryId, type: p.type, amount: p.amount, description: p.description, date: p.date, photo: p.photo || null, transferId: p.transferId || null };
      return { ...d, transactions: [...d.transactions, tx] };
    }),
    editTransaction: (id, p) => update((d) => ({
      ...d,
      transactions: d.transactions.map((t) => (t.id === id
        ? { ...t, type: p.type, amount: p.amount, description: p.description, listId: p.listId, categoryId: p.categoryId, date: p.date, photo: p.photo || null }
        : t)),
    })),
    deleteTransaction: (id) => update((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) })),
    updateRecurring: (id, p) => update((d) => runRecurring({
      ...d,
      recurring: d.recurring.map((r) => (r.id === id
        ? { ...r, type: p.type, amount: p.amount, description: p.description, listId: p.listId, categoryId: p.categoryId, frequency: p.frequency === "none" ? r.frequency : p.frequency, nextDate: p.date }
        : r)),
    })),
    deleteRecurring: (id) => update((d) => ({ ...d, recurring: d.recurring.filter((r) => r.id !== id) })),
    addTransferRule: (p) => update((d) => runRecurring({
      ...d,
      recurring: [...d.recurring, {
        id: uid(), type: "transfer", listId: p.listId, toListId: p.toListId,
        amount: p.amount, frequency: p.frequency, startDate: p.date, nextDate: p.date,
      }],
    })),
  }), [update]);

  /* ----------------- fusión con datos compartidos (nube) ----------------- */
  const sharedListIds = useMemo(() => new Set(cloud.social.lists.map((l) => l.id)), [cloud.social.lists]);
  const sharedCatIds = useMemo(() => new Set(cloud.social.categories.map((c) => c.id)), [cloud.social.categories]);
  const sharedTxIds = useMemo(() => new Set(cloud.social.transactions.map((t) => t.id)), [cloud.social.transactions]);

  const viewData = useMemo(() => {
    if (!data) return null;
    if (!cloud.uid || cloud.social.lists.length === 0) return data;
    return {
      ...data,
      lists: [...data.lists, ...cloud.social.lists.map((l) => ({ id: l.id, name: l.name, shared: true, owner: l.owner }))],
      categories: [...data.categories, ...cloud.social.categories],
      transactions: [...data.transactions, ...cloud.social.transactions],
    };
  }, [data, cloud.uid, cloud.social]);

  /* enruta cada acción a lo local o a la nube según la lista/el elemento */
  const routedActions = useMemo(() => ({
    ...actions,
    setProfile: (patch) => { actions.setProfile(patch); if (cloud.uid) cloud.api.syncProfile(patch); },
    createCategory: (listId, p) => (sharedListIds.has(listId) ? cloud.api.addCategory(listId, p) : actions.createCategory(listId, p)),
    updateCategory: (id, patch) => (sharedCatIds.has(id) ? cloud.api.updateCategory(id, patch) : actions.updateCategory(id, patch)),
    deleteCategory: (id) => (sharedCatIds.has(id) ? cloud.api.deleteCategory(id) : actions.deleteCategory(id)),
    renameList: (id, name) => (sharedListIds.has(id) ? cloud.api.renameSharedList(id, name) : actions.renameList(id, name)),
    deleteList: (id) => (sharedListIds.has(id) ? cloud.api.leaveSharedList(id) : actions.deleteList(id)),
    addTransaction: (p) => (sharedListIds.has(p.listId) ? cloud.api.addTransaction(p) : actions.addTransaction(p)),
    editTransaction: (id, p) => {
      const was = sharedTxIds.has(id), now = sharedListIds.has(p.listId);
      if (was && now) return cloud.api.editTransaction(id, p);
      if (!was && !now) return actions.editTransaction(id, p);
      if (was && !now) { cloud.api.deleteTransaction(id); return actions.addTransaction(p); }
      actions.deleteTransaction(id);
      return cloud.api.addTransaction(p);
    },
    deleteTransaction: (id) => {
      /* si es parte de una transferencia, se eliminan ambos movimientos */
      const tx = viewData ? viewData.transactions.find((t) => t.id === id) : null;
      const targets = tx && tx.transferId
        ? viewData.transactions.filter((t) => t.transferId === tx.transferId).map((t) => t.id)
        : [id];
      for (const tid of targets) {
        if (sharedTxIds.has(tid)) cloud.api.deleteTransaction(tid);
        else actions.deleteTransaction(tid);
      }
    },
  }), [actions, cloud.api, cloud.uid, sharedListIds, sharedCatIds, sharedTxIds, viewData]);

  /* al iniciar sesión: reconciliar nombre y foto entre el perfil local y el de la nube */
  const syncedProfileRef = useRef(null);
  useEffect(() => {
    const p = cloud.social.profile;
    if (!p || !data || syncedProfileRef.current === p.id) return;
    syncedProfileRef.current = p.id;
    const patch = {};
    if (!data.profile.name && p.name) patch.name = p.name;
    if (!data.profile.photo && p.photo) patch.photo = p.photo;
    if (Object.keys(patch).length) actions.setProfile(patch);
    const up = {};
    if (!p.name && data.profile.name) up.name = data.profile.name;
    if (!p.photo && data.profile.photo) up.photo = data.profile.photo;
    if (Object.keys(up).length) cloud.api.syncProfile(up);
  }, [cloud.social.profile, data]);

  /* ----------------- datos derivados ----------------- */
  const activeList = viewData ? viewData.lists.find((l) => l.id === viewData.activeListId) || viewData.lists[0] : null;
  const catMap = useMemo(() => (viewData ? new Map(viewData.categories.map((c) => [c.id, c])) : new Map()), [viewData && viewData.categories]);
  const listMap = useMemo(() => (viewData ? new Map(viewData.lists.map((l) => [l.id, l])) : new Map()), [viewData && viewData.lists]);

  const listTxs = useMemo(() => {
    if (!viewData || !activeList) return [];
    return viewData.transactions
      .filter((t) => t.listId === activeList.id)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));
  }, [viewData && viewData.transactions, activeList && activeList.id]);

  const periodTxs = useMemo(() => {
    if (period.mode === "all") return listTxs;
    const y = String(period.year);
    if (period.mode === "year") return listTxs.filter((t) => t.date.slice(0, 4) === y);
    const ym = y + "-" + pad2(period.month);
    return listTxs.filter((t) => t.date.slice(0, 7) === ym);
  }, [listTxs, period]);

  const totals = useMemo(() => {
    let exp = 0, inc = 0;
    for (const t of periodTxs) { if (t.type === "income") inc += t.amount; else exp += t.amount; }
    return { exp, inc, bal: inc - exp };
  }, [periodTxs]);

  /* Acumulado: activado → período "Todo el tiempo"; desactivado → mes actual */
  const accumulate = !data || !data.settings || data.settings.accumulate !== false;
  useEffect(() => {
    if (!data) return;
    const n = new Date();
    setPeriod(accumulate
      ? { mode: "all", year: n.getFullYear(), month: n.getMonth() + 1 }
      : { mode: "month", year: n.getFullYear(), month: n.getMonth() + 1 });
  }, [accumulate, !!data]);

  /* transferencias entre listas: gasto en el origen + ingreso en el destino */
  const ensureTransferCategory = async (lid) => {
    const existing = viewData.categories.find((c) => c.listId === lid && c.name.trim().toLowerCase() === "transferencia");
    if (existing) return existing;
    return await routedActions.createCategory(lid, { name: "Transferencia", emoji: "🔁", color: colorFromEmoji("🔁") });
  };
  const addTransfer = async (p) => {
    const fromList = listMap.get(p.listId), toList = listMap.get(p.toListId);
    if (!fromList || !toList) return;
    const catFrom = await ensureTransferCategory(p.listId);
    const catTo = await ensureTransferCategory(p.toListId);
    if (!catFrom || !catTo) { showToast("⚠️", "No se pudo registrar la transferencia"); return; }
    const transferId = uid(); // enlaza ambos movimientos: al borrar uno se borra el otro
    await routedActions.addTransaction({ type: "expense", amount: p.amount, description: `hacia ${toList.name}`, listId: p.listId, categoryId: catFrom.id, date: p.date, frequency: "none", photo: p.photo, transferId });
    await routedActions.addTransaction({ type: "income", amount: p.amount, description: `desde ${fromList.name}`, listId: p.toListId, categoryId: catTo.id, date: p.date, frequency: "none", photo: p.photo, transferId });
    showToast("⇄", "Transferencia registrada");
  };

  const chartGroups = useMemo(() => {
    const m = new Map();
    for (const t of periodTxs) {
      if (t.type !== txType) continue;
      const g = m.get(t.categoryId) || { total: 0, count: 0 };
      g.total += t.amount; g.count++;
      m.set(t.categoryId, g);
    }
    const fallback = { name: "Sin categoría", emoji: "❓", color: "#5D5D64" };
    return [...m.entries()]
      .map(([cid, g]) => ({ cat: catMap.get(cid) || { ...fallback, id: cid }, ...g }))
      .sort((a, b) => b.total - a.total);
  }, [periodTxs, txType, catMap]);

  const typeTotal = txType === "expense" ? totals.exp : totals.inc;
  const visibleTxs = useMemo(() => {
    let arr = periodTxs.filter((t) => t.type === txType);
    if (selectedBar) arr = arr.filter((t) => t.categoryId === selectedBar);
    return arr;
  }, [periodTxs, txType, selectedBar]);

  useEffect(() => { setSelectedBar(null); }, [txType, period, data && data.activeListId]);

  const periodLabel = period.mode === "all" ? "Todo el tiempo"
    : period.mode === "year" ? String(period.year)
    : (period.year === now.getFullYear() && period.month === now.getMonth() + 1) ? "Mes actual"
    : `${MONTHS[period.month - 1]} ${period.year}`;

  const animKey = data ? `${data.activeListId}|${period.mode}|${period.year}|${period.month}|${txType}|${selectedBar || ""}` : "";
  const chartKey = data ? `${data.activeListId}|${period.mode}|${period.year}|${period.month}|${txType}` : "";
  const selDetail = selectedBar ? chartGroups.find((g) => g.cat.id === selectedBar) : null;

  if (!data) {
    return (
      <div className="fin-app">
        <style>{CSS}</style>
        <div className="spin" role="status" aria-label="Cargando" />
      </div>
    );
  }

  return (
    <div className="fin-app">
      <style>{CSS}</style>
      <div className="fin-scroll">
        {/* ---------- encabezado ---------- */}
        <header className="hdr">
          <button className="chip" onClick={() => { haptic(); setListOpen(true); }} aria-label="Cambiar de lista">
            {activeList.shared ? "👥 " : ""}{activeList.name} <Icon name="chevD" size={14} color="var(--txt2)" />
          </button>
          <div className="hdr-right">
            <button className="icon-btn" onClick={() => { haptic(); setSearchOpen(true); }} aria-label="Buscar"><Icon name="search" size={17} /></button>
            {cloud.uid && (() => {
              const unread = cloud.social.notifications.filter((n) => !n.read).length;
              return (
                <button className="icon-btn bell-wrap" onClick={() => { haptic(); setNotifOpen(true); }} aria-label="Notificaciones">
                  <Icon name="bell" size={17} />
                  {unread > 0 && <span className="badge-dot">{unread > 9 ? "9+" : unread}</span>}
                </button>
              );
            })()}
            <button className="icon-btn" style={{ overflow: "hidden", padding: 0 }} onClick={() => { haptic(); setProfileOpen(true); }} aria-label="Perfil">
              {data.profile.photo ? <img className="avatar-mini" src={data.profile.photo} alt="" /> : <Icon name="user" size={18} />}
            </button>
          </div>
        </header>

        {/* ---------- balance ---------- */}
        <section className="balance-wrap" aria-live="polite">
          <div className="balance-label">Total</div>
          <div className="balance-row">
            <span className={`sign-dot ${totals.bal > 0.004 ? "sign-pos" : totals.bal < -0.004 ? "sign-neg" : "sign-zero"}`}>
              <Icon name={totals.bal > 0.004 ? "plus" : totals.bal < -0.004 ? "minus" : "equal"} size={15} color="#fff" stroke={3.2} />
            </span>
            <AnimatedNumber className="balance-num" value={Math.abs(totals.bal)} format={fmt} />
          </div>

          <Segmented className="mini"
            options={[{ id: "expense", label: "", aria: "Gastos" }, { id: "income", label: "", aria: "Ingresos" }]}
            value={txType} onChange={setTxType}
            renderExtra={(o) => (
              <span className={`seg-sub ${o.id === "expense" ? "exp" : "inc"}`}>
                {o.id === "expense" ? "−" : "+"}
                <AnimatedNumber value={o.id === "expense" ? totals.exp : totals.inc} format={fmtShort} />
              </span>
            )}
          />

          <button className="period-btn" onClick={() => { haptic(); setPeriodOpen(true); }} aria-label="Cambiar período">
            <span className="dot" /> {periodLabel} <Icon name="chevD" size={13} />
          </button>
        </section>

        {/* ---------- gráfico y movimientos (animados al cambiar de lista o de tipo) ---------- */}
        <div key={`${activeList.id}|${txType}`} className="content-swap">
        <section className="chart-section">
          {chartGroups.length === 0 ? (
            <EmptyState emoji={txType === "expense" ? "🧾" : "💸"}
              title={txType === "expense" ? "Sin gastos en este período" : "Sin ingresos en este período"}
              sub="Toca el botón + para registrar tu primer movimiento." />
          ) : (
            <>
              <BarChart groups={chartGroups} type={txType} onSelect={setSelectedBar} selectedId={selectedBar} animKey={chartKey} />
              {selDetail && (
                <div className="bar-detail" key={selDetail.cat.id}>
                  <EmojiBubble emoji={selDetail.cat.emoji} color={selDetail.cat.color} size={44} />
                  <div className="bd-meta">
                    <div className="bd-name">{selDetail.cat.name}</div>
                    <div className="bd-sub">
                      {selDetail.count} movimiento{selDetail.count === 1 ? "" : "s"} · {typeTotal > 0 ? Math.round((selDetail.total / typeTotal) * 100) : 0}% del total
                    </div>
                  </div>
                  <div className="bd-amt" style={{ color: txType === "income" ? "var(--green)" : "var(--txt)" }}>
                    {txType === "income" ? "+" : "−"}{fmt(selDetail.total)}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ---------- movimientos ---------- */}
        {visibleTxs.length > 0 && (
          <section className="tx-section">
            <div className="section-title">Movimientos{selDetail ? ` · ${selDetail.cat.name}` : ""}</div>
            <GroupedTxList txs={visibleTxs} catMap={catMap} onPress={(t) => { haptic(); setActionTx(t); }} animKey={animKey} />
          </section>
        )}
        </div>
      </div>

      {/* ---------- botón flotante ---------- */}
      <button className="fab" onClick={() => { haptic(14); setAddOpen(true); }} aria-label="Agregar movimiento">
        <Icon name="plus" size={26} color="#fff" stroke={2.6} />
      </button>

      {/* ---------- hojas ---------- */}
      <TxFormSheet
        open={addOpen} onClose={() => setAddOpen(false)} data={viewData} defaultListId={viewData.activeListId} sharedListIds={sharedListIds} allowTransfer
        onCreateCategory={(lid, p) => routedActions.createCategory(lid, p)}
        onSubmit={(p) => {
          if (p.type === "transfer") {
            if (p.frequency && p.frequency !== "none") { actions.addTransferRule(p); showToast("🔁", "Transferencia recurrente creada"); }
            else addTransfer(p);
            return;
          }
          routedActions.addTransaction(p);
          showToast(p.type === "income" ? "💚" : "✅", p.frequency !== "none" ? "Recurrencia creada" : "Movimiento agregado");
        }}
      />
      <TxFormSheet
        open={!!editTx} onClose={() => setEditTx(null)} data={viewData} defaultListId={viewData.activeListId} initial={editTx} sharedListIds={sharedListIds}
        onCreateCategory={(lid, p) => routedActions.createCategory(lid, p)}
        onSubmit={(p) => { routedActions.editTransaction(editTx.id, p); showToast("✏️", "Movimiento actualizado"); }}
      />
      <PeriodSheet open={periodOpen} onClose={() => setPeriodOpen(false)} period={period} setPeriod={setPeriod} txs={listTxs} />
      <ListSheet open={listOpen} onClose={() => setListOpen(false)} data={viewData} canShare={!!cloud.uid}
        onSelect={(id) => actions.setActiveList(id)}
        onCreate={async (name, shared) => {
          if (shared) { const id = await cloud.api.createSharedList(name); if (id) actions.setActiveList(id); }
          else { actions.createList(name); showToast("✨", "Lista creada"); }
        }} />
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} cloud={cloud} />

      {/* hoja de acciones del movimiento */}
      <Sheet open={!!actionTx} onClose={() => setActionTx(null)} title={null}>
        {actionTx && (() => {
          const c = catMap.get(actionTx.categoryId) || { emoji: "❓", color: "#5D5D64", name: "Sin categoría" };
          return (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 4px 16px" }}>
                <EmojiBubble emoji={c.emoji} color={c.color} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--txt2)", fontWeight: 600 }}>{c.name} · {fmtDate(actionTx.date)}</div>
                  <div style={{ fontWeight: 800, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actionTx.description || c.name}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 17, color: actionTx.type === "income" ? "var(--green)" : "var(--txt)" }}>
                  {actionTx.type === "income" ? "+" : "−"}{fmt(actionTx.amount)}
                </div>
              </div>
              {actionTx.photo && (
                <button style={{ width: "100%", marginBottom: 14 }} aria-label="Ver foto adjunta"
                  onClick={() => { haptic(); setPhotoView(actionTx.photo); }}>
                  <img src={actionTx.photo} alt="Foto adjunta"
                    style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 16, border: "1px solid var(--line2)", display: "block" }} />
                </button>
              )}
              <div className="action-stack">
                <div className="action-card">
                  <button className="action-btn" onClick={() => { haptic(); const t = actionTx; setActionTx(null); setTimeout(() => setEditTx(t), 220); }}>Editar</button>
                  <button className="action-btn destructive" onClick={() => { haptic(); const t = actionTx; setActionTx(null); setTimeout(() => setConfirmDel(t), 220); }}>Eliminar</button>
                </div>
                <button className="ghost-btn" onClick={() => setActionTx(null)}>Cancelar</button>
              </div>
            </>
          );
        })()}
      </Sheet>

      <ConfirmSheet open={!!confirmDel} onClose={() => setConfirmDel(null)} title="¿Eliminar movimiento?"
        message="Esta acción no se puede deshacer."
        onConfirm={() => { routedActions.deleteTransaction(confirmDel.id); showToast("🗑️", "Movimiento eliminado"); }} />

      {/* buscador y perfil */}
      <Overlay open={searchOpen} onClose={() => setSearchOpen(false)}>
        {({ requestClose }) => (
          <SearchScreen requestClose={requestClose} data={viewData}
            onPressTx={(t) => { haptic(); setSearchOpen(false); setTimeout(() => setActionTx(t), 260); }} />
        )}
      </Overlay>
      <Overlay open={profileOpen} onClose={() => setProfileOpen(false)}>
        {({ requestClose }) => (
          <ProfileScreen requestClose={requestClose} data={viewData} actions={routedActions} showToast={showToast} cloud={cloud} sharedListIds={sharedListIds} />
        )}
      </Overlay>

      {/* visor de foto a pantalla completa */}
      {photoView && (
        <div style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(0,0,0,.94)", display: "grid", placeItems: "center", padding: 16 }}
          onClick={() => setPhotoView(null)} role="dialog" aria-label="Foto adjunta">
          <img src={photoView} alt="Foto adjunta" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12 }} />
          <button className="sheet-close" style={{ position: "absolute", top: "calc(16px + env(safe-area-inset-top))", right: 16 }}
            onClick={() => setPhotoView(null)} aria-label="Cerrar"><Icon name="x" size={15} /></button>
        </div>
      )}

      <Toast msg={toast} />
    </div>
  );
}
