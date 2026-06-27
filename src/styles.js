export const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');
:root {
  --pietra:#2C1810; --terracotta:#B85C38; --terracotta-light:#D4845A;
  --sabbia:#F2E8D9; --sabbia-scura:#E8D5BD; --verde:#4A6741;
  --cielo:#7BA7BC; --bianco:#FAF7F2; --grigio:#8B7355;
  --rosso:#C0392B; --oro:#C9A84C;
  --ombra:rgba(44,24,16,0.12); --ombra-f:rgba(44,24,16,0.22);
  --r:12px; --rsm:8px;
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{font-family:'Inter',sans-serif;background:var(--sabbia);color:var(--pietra);min-height:100vh;max-width:430px;margin:0 auto}

/* Header */
.hdr{background:var(--pietra);padding:11px 16px 10px;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px var(--ombra-f)}
.hdr-inner{display:flex;justify-content:space-between;align-items:center}
.hdr-logo{width:40px;height:40px;border-radius:50%;background:var(--sabbia);display:flex;align-items:center;justify-content:center;border:2px solid rgba(242,232,217,.2);flex-shrink:0}
.hdr-logo svg{width:34px;height:34px}
.hdr-title{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--sabbia);line-height:1.15}
.hdr-sub{font-size:9px;color:var(--sabbia-scura);opacity:.7;text-transform:uppercase;letter-spacing:.08em;margin-top:1px}
.hdr-day{font-family:'Cormorant Garamond',serif;font-size:21px;font-weight:600;color:var(--sabbia);line-height:1;text-align:right}
.hdr-lbl{font-size:9px;color:var(--sabbia-scura);opacity:.75;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;text-align:right}

/* Online */
.ob{position:fixed;top:68px;right:8px;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:600;z-index:99;pointer-events:none}
.ob.on{background:rgba(74,103,65,.15);color:var(--verde)}
.ob.off{background:rgba(192,57,43,.15);color:var(--rosso)}

/* Main */
.main{padding:12px 12px calc(76px + env(safe-area-inset-bottom))}

/* Nav */
.nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;
  background:var(--pietra);display:flex;padding:5px 0 calc(5px + env(safe-area-inset-bottom));
  z-index:100;box-shadow:0 -2px 12px var(--ombra-f)}
.nb{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 2px;
  cursor:pointer;background:none;border:none;color:var(--grigio);position:relative}
.nb.active{color:var(--terracotta-light)}
.nb svg{width:19px;height:19px}
.nb-lbl{font-size:8px;font-weight:500;letter-spacing:.04em}
.nb-dot{position:absolute;top:2px;right:calc(50% - 14px);width:6px;height:6px;
  border-radius:50%;background:var(--terracotta);border:1.5px solid var(--pietra)}

/* FAB */
.fab{position:fixed;bottom:calc(68px + env(safe-area-inset-bottom));
  right:max(12px,calc(50% - 215px + 12px));width:48px;height:48px;border-radius:50%;
  background:var(--terracotta);color:white;font-size:22px;display:flex;align-items:center;
  justify-content:center;box-shadow:0 4px 16px rgba(184,92,56,.4);cursor:pointer;border:none;z-index:50}
.fab:active{transform:scale(.93)}

/* Cards */
.card{background:var(--bianco);border-radius:var(--r);padding:13px;margin-bottom:9px;
  box-shadow:0 2px 8px var(--ombra);border:1px solid rgba(44,24,16,.06)}
.card-title{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;
  margin-bottom:10px;display:flex;align-items:center;gap:6px}
.dot{width:6px;height:6px;border-radius:50%;background:var(--terracotta);flex-shrink:0}

/* KPI */
.kpi-strip{display:grid;gap:7px;margin-bottom:9px}
.k3{grid-template-columns:1fr 1fr 1fr}
.k4{grid-template-columns:1fr 1fr 1fr 1fr}
.k2{grid-template-columns:1fr 1fr}
.kpi{background:var(--bianco);border-radius:var(--rsm);padding:10px 8px;text-align:center;
  box-shadow:0 2px 6px var(--ombra);border:1px solid rgba(44,24,16,.06)}
.kpi.v{border-top:3px solid var(--verde)} .kpi.r{border-top:3px solid var(--rosso)}
.kpi.o{border-top:3px solid var(--oro)} .kpi.c{border-top:3px solid var(--cielo)}
.kv{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;line-height:1}
.kl{font-size:8px;color:var(--grigio);margin-top:3px;text-transform:uppercase;letter-spacing:.06em;font-weight:500}

/* Section title */
.stitle{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;
  margin:14px 0 8px;display:flex;justify-content:space-between;align-items:center}

/* Tabs */
.tabs{display:flex;gap:3px;background:var(--sabbia-scura);border-radius:var(--rsm);padding:3px;margin-bottom:9px}
.tab{flex:1;text-align:center;padding:6px 2px;border-radius:6px;font-size:10px;font-weight:500;
  cursor:pointer;color:var(--grigio);border:none;background:none}
.tab.active{background:white;color:var(--pietra);box-shadow:0 1px 4px var(--ombra)}

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:5px;padding:8px 14px;border-radius:var(--rsm);
  font-size:12px;font-weight:500;cursor:pointer;border:none;white-space:nowrap;font-family:'Inter',sans-serif}
.bp{background:var(--terracotta);color:white}
.bp:active{background:#9e4a29}
.bs{background:var(--sabbia-scura);color:var(--pietra);border:1px solid rgba(44,24,16,.14)}
.bd{background:rgba(192,57,43,.08);color:var(--rosso);border:1px solid rgba(192,57,43,.2)}
.bfull{width:100%;justify-content:center}
.bsm{padding:5px 9px;font-size:10px}
.del{width:26px;height:26px;border-radius:7px;border:none;background:rgba(192,57,43,.08);
  color:var(--rosso);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}

/* Item row */
.ir{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--sabbia-scura)}
.ir:last-child{border-bottom:none}
.iico{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.iico.v{background:rgba(74,103,65,.12)} .iico.r{background:rgba(192,57,43,.12)}
.iico.o{background:rgba(201,168,76,.15)} .iico.c{background:rgba(123,167,188,.2)}
.ibody{flex:1;min-width:0}
.iname{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.imeta{font-size:10px;color:var(--grigio);margin-top:1px}
.iamt{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;flex-shrink:0}
.iamt.v{color:var(--verde)} .iamt.r{color:var(--rosso)}

/* Badges */
.badge{display:inline-block;padding:2px 6px;border-radius:20px;font-size:9px;font-weight:600;letter-spacing:.04em}
.b-scaduto{background:rgba(192,57,43,.15);color:var(--rosso)}
.b-oggi{background:rgba(201,168,76,.2);color:#7a5c10}
.b-presto{background:rgba(74,103,65,.12);color:var(--verde)}
.b-ok{background:rgba(74,103,65,.12);color:var(--verde)}
.badge-airbnb{background:#FF5A5F22;color:#C02228}
.badge-booking{background:#003B9522;color:#003B95}
.badge-diretto{background:rgba(201,168,76,.2);color:#7a5c10}

/* Modal */
.overlay{display:none;position:fixed;inset:0;background:rgba(44,24,16,.6);z-index:200;align-items:flex-end;justify-content:center}
.overlay.open{display:flex}
.sheet{background:var(--bianco);border-radius:20px 20px 0 0;
  padding:16px 16px calc(16px + env(safe-area-inset-bottom));
  width:100%;max-width:430px;max-height:90vh;overflow-y:auto;animation:su .22s ease}
@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}
.handle{width:36px;height:4px;background:var(--sabbia-scura);border-radius:2px;margin:0 auto 13px}
.mtitle{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;margin-bottom:13px}

/* Form */
.fg{margin-bottom:11px}
.fl{display:block;font-size:9px;font-weight:600;color:var(--grigio);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.fi,.fs{width:100%;padding:9px 11px;border:1.5px solid var(--sabbia-scura);border-radius:var(--rsm);
  font-family:'Inter',sans-serif;font-size:13px;color:var(--pietra);background:white;outline:none;appearance:none}
.fi:focus,.fs:focus{border-color:var(--terracotta);box-shadow:0 0 0 3px rgba(184,92,56,.1)}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:11px}
.segb{padding:8px;border-radius:var(--rsm);border:1.5px solid var(--sabbia-scura);background:white;font-size:12px;font-weight:500;cursor:pointer;text-align:center;color:var(--grigio)}
.segb.ent{border-color:var(--verde);background:rgba(74,103,65,.1);color:var(--verde)}
.segb.usc{border-color:var(--rosso);background:rgba(192,57,43,.08);color:var(--rosso)}
.segb.dpag{border-color:var(--rosso);background:rgba(192,57,43,.08);color:var(--rosso)}
.segb.pag{border-color:var(--verde);background:rgba(74,103,65,.1);color:var(--verde)}

/* Calendar */
.cal-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.cal-m{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600}
.cal-nav{width:30px;height:30px;border-radius:50%;border:1.5px solid var(--sabbia-scura);
  background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:var(--pietra)}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.cdn{text-align:center;font-size:8px;font-weight:600;color:var(--grigio);padding:3px 0;text-transform:uppercase;letter-spacing:.04em}
.cd{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:10px;
  border-radius:4px;cursor:pointer;position:relative;color:var(--pietra)}
.cd.today{background:var(--terracotta);color:white;font-weight:700}
.cd.booked{background:rgba(74,103,65,.15);color:var(--verde);font-weight:600}
.cd.checkin{background:var(--verde);color:white;font-weight:700;border-radius:4px 0 0 4px}
.cd.checkout{background:rgba(192,57,43,.2);color:var(--rosso);font-weight:600;border-radius:0 4px 4px 0}
.cd.booked-mid{border-radius:0}

/* Booking card */
.bkc{background:white;border-radius:var(--rsm);padding:10px 12px;margin-bottom:7px;
  border-left:4px solid var(--verde);box-shadow:0 1px 4px var(--ombra)}
.bkc.airbnb{border-color:#FF5A5F}
.bkc.booking-com{border-color:#003B95}
.bkc.diretto{border-color:var(--oro)}

/* Urgency bar */
.ub{height:2px;border-radius:2px;margin-top:5px}
.ub.scaduto{background:var(--rosso)} .ub.oggi{background:var(--oro)} .ub.presto{background:var(--verde)}

/* Month switcher */
.msw{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.mlbl{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600}
.mbtn{width:26px;height:26px;border-radius:50%;border:1.5px solid var(--sabbia-scura);
  background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;color:var(--pietra)}

/* Alert */
.alert{background:rgba(192,57,43,.1);border:1px solid rgba(192,57,43,.3);border-radius:var(--rsm);
  padding:9px 12px;margin-bottom:9px;font-size:11px;color:var(--rosso);font-weight:500}
.alert-oro{background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.4);color:#7a5c10}

/* Info box */
.infobox{background:rgba(123,167,188,.12);border:1px solid rgba(123,167,188,.3);border-radius:var(--rsm);
  padding:10px 12px;margin-bottom:9px;font-size:11px;color:#2a5566;line-height:1.6}

/* Toast */
.toast{position:fixed;top:74px;left:50%;transform:translateX(-50%) translateY(-120px);
  background:var(--pietra);color:var(--sabbia);padding:8px 16px;border-radius:20px;
  font-size:11px;font-weight:500;z-index:999;transition:transform .28s;white-space:nowrap;
  box-shadow:0 4px 16px var(--ombra-f)}
.toast.show{transform:translateX(-50%) translateY(0)}

/* Report bar */
.rb{height:6px;background:var(--sabbia-scura);border-radius:4px;overflow:hidden;margin-top:2px}
.rbf{height:100%;border-radius:4px;transition:width .5s ease}

/* Prezzi */
.pz-row{display:grid;gap:7px;margin-bottom:8px}
.pz-cell{background:white;border-radius:var(--rsm);padding:9px 10px;text-align:center;border:1px solid var(--sabbia-scura)}
.pz-val{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600}
.pz-plat{font-size:9px;color:var(--grigio);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}

/* AI bubble */
.ai-bubble{background:linear-gradient(135deg,rgba(44,24,16,.04),rgba(184,92,56,.06));
  border:1px solid rgba(184,92,56,.2);border-radius:var(--r);padding:13px;margin-bottom:9px}
.ai-header{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.ai-icon{width:30px;height:30px;border-radius:50%;background:var(--terracotta);
  display:flex;align-items:center;justify-content:center;color:white;font-size:14px;flex-shrink:0}
.ai-title{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600}
.ai-sub{font-size:10px;color:var(--grigio)}
.ai-body{font-size:12px;line-height:1.7;color:var(--pietra);white-space:pre-wrap}
.ai-loading{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--grigio)}
.ai-dots span{animation:pulse 1.2s infinite; display:inline-block}
.ai-dots span:nth-child(2){animation-delay:.2s}
.ai-dots span:nth-child(3){animation-delay:.4s}
@keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}}

/* Checklist */
.cl-area{font-size:10px;font-weight:700;color:var(--grigio);text-transform:uppercase;
  letter-spacing:.07em;margin:12px 0 5px;padding-bottom:4px;border-bottom:1px solid var(--sabbia-scura)}
.cl-item{display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid rgba(232,213,189,.5)}
.cl-item:last-child{border-bottom:none}
.cl-check{width:20px;height:20px;border-radius:5px;border:2px solid var(--sabbia-scura);
  background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.cl-check.done{background:var(--verde);border-color:var(--verde);color:white}
.cl-text{font-size:12px;font-weight:400}
.cl-text.done{text-decoration:line-through;color:var(--grigio)}

/* Inventory status */
.inv-ok{color:var(--verde)} .inv-sostituire{color:var(--oro)} .inv-mancante{color:var(--rosso)}

/* Progress ring */
.prog{display:flex;align-items:center;gap:6px}
.prog-bar{flex:1;height:5px;background:var(--sabbia-scura);border-radius:3px;overflow:hidden}
.prog-fill{height:100%;border-radius:3px;background:var(--verde);transition:width .4s}

/* Pill */
.pill{display:inline-block;padding:2px 6px;border-radius:10px;font-size:9px;font-weight:600;
  background:var(--sabbia-scura);color:var(--grigio);letter-spacing:.04em}

/* Empty */
.empty{text-align:center;padding:24px 16px;color:var(--grigio)}
.empty .emi{font-size:32px;margin-bottom:9px}
.empty p{font-size:12px;line-height:1.5}

/* Msg */
.msgbox{background:white;border:1.5px solid var(--sabbia-scura);border-radius:var(--rsm);
  padding:10px;font-size:11px;line-height:1.7;white-space:pre-wrap;color:var(--pietra)}

/* Alloggiati */
.allog-box{background:#f0f4ff;border:1px solid #c5cff0;border-radius:var(--rsm);
  padding:11px;font-size:11px;line-height:1.8;font-family:monospace;color:#1a2a5e;white-space:pre-wrap}
`
