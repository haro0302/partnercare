import { useState, useEffect } from "react";

const C = {
  bg:        "#F7F4EF",
  bgCard:    "#FFFFFF",
  bgSub:     "#F0EDE8",
  border:    "#E5E0D8",
  text:      "#2C2820",
  textMid:   "#7A7068",
  textLight: "#B0A898",
  danger:  { main:"#C0392B", soft:"#FBF0EF", calSoft:"#F5C8C4", border:"#EFC8C4" },
  caution: { main:"#B87218", soft:"#FDF6EE", calSoft:"#F5DFA0", border:"#EDD8A8" },
  normal:  { main:"#7A7020", soft:"#F8F5E8", calSoft:"#E2DC9A", border:"#DAD490" },
  safe:    { main:"#2C7A50", soft:"#EDF6F1", calSoft:"#B8E4CC", border:"#A4D8BC" },
};

const DEFAULT_PHASES = [
  {
    id:"danger",  label:"厳重注意", emoji:"🔴", startDay:22, endDay:28,
    color:C.danger.main,  soft:C.danger.soft,  calSoft:C.danger.calSoft,  border:C.danger.border,
    title:"PMS期（黄体期後半）",
    subtitle:"ホルモン変動で感情の起伏が最も激しい時期。被害感・攻撃性・孤独感が強まります。",
    tips:["頼み事はできるだけ断らかたちで返す","一人時間・一人空間を増やす（自然に距離をとること）","外出は静かな場所・短時間","甘いもの・温かい食べ物をそっと用意","あとで話すか、聞くだけで衝突回避"],
  },
  {
    id:"caution", label:"注意", emoji:"🟠", startDay:1, endDay:5,
    color:C.caution.main, soft:C.caution.soft, calSoft:C.caution.calSoft, border:C.caution.border,
    title:"生理期間",
    subtitle:"身体的につらく、感情も貧血・腹痛・倦怠感があります。",
    tips:["家事の比率を多めに肩代わり（買い物・洗濯）","温かい飲み物・湯たんぽでサポート","外出は必要最低限に","会話は短く、否定しない"],
  },
  {
    id:"normal",  label:"普通", emoji:"🟡", startDay:14, endDay:21,
    color:C.normal.main,  soft:C.normal.soft,  calSoft:C.normal.calSoft,  border:C.normal.border,
    title:"排卵後・黄体期前半",
    subtitle:"体温が上がり始め、少し眠くなり、軽いイライラが出始める時期です。",
    tips:["衝突しそうなトークは避ける","感謝とねぎらいを多く","外出前での混雑・騒音は避ける"],
  },
  {
    id:"safe", label:"安全", emoji:"🟢", startDay:6, endDay:13,
    color:C.safe.main, soft:C.safe.soft, calSoft:C.safe.calSoft, border:C.safe.border,
    title:"安定期（卵胞期）",
    subtitle:"気分・体調が比較的安定。社交的になりやすく、絶好のタイミングです。",
    tips:["デートや外食の計画はこの時期がベスト","新しい話題・相談ごとはこの時期に持ち込む","ありがとうを多く伝えると信頼貯金が貯まる"],
  },
];

const CYCLE = 28;
function getTokyo() { return new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Tokyo"})); }
function toDS(d) { const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`; }
function fmtJa(d) { return new Date(d).toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"}); }
function parseDate(s) { const [y,m,d]=s.split("-").map(Number); return Date.UTC(y,m-1,d); }
function cycleDay(lp,tgt) {
  const diff=Math.floor((parseDate(tgt)-parseDate(lp))/86400000);
  if(diff<0) return ((diff%CYCLE)+CYCLE)%CYCLE||CYCLE;
  return (diff%CYCLE)+1;
}
function getPhase(day,phases) { return phases.find(p=>day>=p.startDay&&day<=p.endDay)||phases[2]; }
function daysInMonth(y,m) { return new Date(y,m+1,0).getDate(); }

export default function App() {
  const [lp,     setLp]    = useState(()=>localStorage.getItem("lp")||toDS(getTokyo()));
  const [phases, setPhases]= useState(()=>{try{return JSON.parse(localStorage.getItem("ph"))||DEFAULT_PHASES;}catch{return DEFAULT_PHASES;}});
  const [view,   setView]  = useState("home");
  const [popup,  setPopup] = useState(null);
  const [popIn,  setPopIn] = useState(false);
  const [custD,  setCustD] = useState("");
  const [notif,  setNotif] = useState(()=>localStorage.getItem("notif")==="true");
  const [nTime,  setNTime] = useState(()=>localStorage.getItem("ntime")||"08:00");
  const [editId, setEditId]= useState(null);
  const [cal,    setCal]   = useState(()=>{const t=getTokyo();return{y:t.getFullYear(),m:t.getMonth()};});
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(()=>{localStorage.setItem("lp",lp);},[lp]);
  useEffect(()=>{localStorage.setItem("ph",JSON.stringify(phases));},[phases]);
  useEffect(()=>{localStorage.setItem("notif",notif);},[notif]);
  useEffect(()=>{localStorage.setItem("ntime",nTime);},[nTime]);

  // ホーム画面追加バナー
  useEffect(()=>{
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
    if(!isStandalone && !localStorage.getItem("installDismissed")){
      const t = setTimeout(()=>setShowInstallBanner(true), 1500);
      return ()=>clearTimeout(t);
    }
  },[]);

  // 通知スケジューリング
  useEffect(()=>{
    if(!notif) return;
    let tid;
    const schedule = ()=>{
      if(Notification.permission !== "granted") return;
      const [h,mn] = nTime.split(":").map(Number);
      const now = getTokyo();
      const fire = new Date(now);
      fire.setHours(h,mn,0,0);
      if(fire<=now) fire.setDate(fire.getDate()+1);
      const ms = fire-now;
      tid = setTimeout(()=>{
        const day = cycleDay(lp, toDS(getTokyo()));
        const phase = getPhase(day, phases);
        const title = `パートナーケア ${phase.emoji}`;
        const body = `今日は${phase.label}（Day ${day}）。${phase.tips[0]||""}`;
        if(navigator.serviceWorker?.controller){
          navigator.serviceWorker.controller.postMessage({type:"SHOW_NOTIF",title,body});
        } else if(Notification.permission==="granted"){
          new Notification(title,{body,icon:"/icon.svg"});
        }
        schedule();
      }, ms);
    };
    schedule();
    return ()=>clearTimeout(tid);
  },[notif, nTime, lp, phases]);

  const today    = getTokyo();
  const todayStr = toDS(today);
  const todayDay = cycleDay(lp, todayStr);
  const tp       = getPhase(todayDay, phases);

  const openPopup  = ph=>{setPopup(ph);setTimeout(()=>setPopIn(true),10);};
  const closePopup = ()=>{setPopIn(false);setTimeout(()=>setPopup(null),280);};

  const requestNotif = async()=>{
    if(!("Notification" in window)) return alert("このブラウザは通知に対応していません");
    const perm = await Notification.requestPermission();
    if(perm==="granted") setNotif(true);
    else alert("通知が許可されませんでした。ブラウザの設定から許可してください。");
  };

  // ── ホーム ──────────────────────────────────────────
  const HomeView = ()=>(
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{
        background:tp.soft, border:`1.5px solid ${tp.border}`,
        borderRadius:20, padding:"22px 20px", marginBottom:14,
        position:"relative", overflow:"hidden",
        boxShadow:`0 3px 20px ${tp.color}14`,
      }}>
        <div style={{position:"absolute",right:-8,top:-8,fontSize:90,opacity:.07,pointerEvents:"none",lineHeight:1}}>{tp.emoji}</div>
        <div style={{fontSize:10,color:C.textLight,letterSpacing:2,fontWeight:700,marginBottom:5}}>今日の彼女の体調は？</div>
        <div style={{fontSize:12,color:C.textMid,marginBottom:12}}>{fmtJa(today)}</div>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
          <div style={{
            width:52,height:52,borderRadius:15,
            background:"#fff",border:`1.5px solid ${tp.border}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:26,boxShadow:`0 3px 10px ${tp.color}20`,flexShrink:0,
          }}>{tp.emoji}</div>
          <div>
            <div style={{fontSize:21,fontWeight:700,color:tp.color,letterSpacing:-0.5}}>{tp.label}</div>
            <div style={{fontSize:12,color:C.textMid,marginTop:2}}>
              周期 <span style={{fontWeight:700,color:C.text}}>Day {todayDay}</span>
            </div>
          </div>
        </div>
        <div style={{
          fontSize:13,color:C.textMid,lineHeight:1.8,
          background:"rgba(255,255,255,0.72)",borderRadius:12,
          padding:"10px 14px",borderLeft:`3px solid ${tp.border}`,
        }}>{tp.subtitle}</div>
      </div>

      <UpdateBtn onClick={()=>setLp(todayStr)} label="生理日（Day1）を今日に更新" sub={todayStr}/>

      <div style={{marginTop:18}}>
        <div style={{fontSize:10,color:C.textLight,letterSpacing:2,fontWeight:700,marginBottom:10}}>▸ 各フェーズの対応ガイド</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {phases.map(ph=><PhaseBtn key={ph.id} phase={ph} onClick={()=>openPopup(ph)}/>)}
        </div>
      </div>

      <div style={{textAlign:"center",marginTop:18,fontSize:11,color:C.textLight}}>
        最終生理日：{fmtJa(lp)}
      </div>
    </div>
  );

  // ── カレンダー ──────────────────────────────────────
  const CalView = ()=>{
    const {y,m}=cal;
    const first=new Date(y,m,1).getDay();
    const days=daysInMonth(y,m);
    const cells=[...Array(first).fill(null),...Array.from({length:days},(_,i)=>i+1)];
    const isToday=d=>d===today.getDate()&&m===today.getMonth()&&y===today.getFullYear();
    return(
      <div style={{animation:"fadeUp 0.3s ease"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <button onClick={()=>{let mm=m-1,yy=y;if(mm<0){mm=11;yy--;}setCal({y:yy,m:mm});}} style={navBs}>‹</button>
          <span style={{fontSize:15,fontWeight:700,color:C.text}}>{y}年{m+1}月</span>
          <button onClick={()=>{let mm=m+1,yy=y;if(mm>11){mm=0;yy++;}setCal({y:yy,m:mm});}} style={navBs}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
          {["日","月","火","水","木","金","土"].map((d,i)=>(
            <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,padding:"3px 0",color:i===0?"#C0392B":i===6?"#1E6FA8":C.textLight}}>{d}</div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={i}/>;
            const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const dn=cycleDay(lp,ds);
            const ph=getPhase(dn,phases);
            const it=isToday(d);
            return(
              <div key={i} onClick={()=>openPopup(ph)} style={{
                aspectRatio:"1",borderRadius:10,
                background:it?ph.color:ph.calSoft,
                border:it?`2px solid ${ph.color}`:`1px solid ${ph.border}`,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                cursor:"pointer",transition:"transform 0.15s",
                boxShadow:it?`0 2px 8px ${ph.color}40`:"none",
              }}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.07)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
              >
                <span style={{fontSize:11,fontWeight:it?700:500,color:it?"#fff":C.text}}>{d}</span>
                <span style={{fontSize:9,fontWeight:600,color:it?"rgba(255,255,255,0.85)":ph.color}}>D{dn}</span>
              </div>
            );
          })}
        </div>
        {/* 凡例：カレンダーセルと同じ色の四角で囲む */}
        <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:16,justifyContent:"center"}}>
          {phases.map(ph=>(
            <div key={ph.id} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{
                width:16,height:16,borderRadius:4,
                background:ph.calSoft,border:`1.5px solid ${ph.border}`,
                flexShrink:0,
              }}/>
              <span style={{fontSize:11,color:C.textMid,fontWeight:500}}>{ph.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── 設定 ──────────────────────────────────────────
  const SettingsView = ()=>(
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <Card title="📅 生理日（Day1）を変更">
        <div style={{fontSize:11,color:C.textLight,marginBottom:8}}>現在：{fmtJa(lp)}</div>
        <div style={{display:"flex",gap:8}}>
          <input type="date" value={custD||lp} onChange={e=>setCustD(e.target.value)} style={{...inpS,flex:1}}/>
          <button onClick={()=>{if(custD){setLp(custD);setCustD("");}}} style={aBs(C.safe.main)}>確定</button>
        </div>
        <div style={{fontSize:11,color:C.textLight,marginTop:8,lineHeight:1.6}}>
          ※ ホーム画面アプリ版はブラウザ版と別のデータ領域です。初回のみこちらで設定してください。
        </div>
      </Card>

      <Card title="🔔 通知設定">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:notif?14:0}}>
          <div>
            <div style={{fontSize:13,color:C.text,fontWeight:600}}>毎日の体調通知</div>
            <div style={{fontSize:11,color:C.textLight,marginTop:2}}>指定した時間にバナー通知を送信</div>
          </div>
          <Toggle on={notif} onToggle={()=>{
            if(!notif) requestNotif();
            else setNotif(false);
          }}/>
        </div>
        {notif&&(
          <div>
            <label style={lblS}>通知時間</label>
            <input type="time" value={nTime} onChange={e=>setNTime(e.target.value)} style={{...inpS,width:"100%"}}/>
            <div style={{
              fontSize:11,color:C.textLight,marginTop:10,lineHeight:1.7,
              background:C.bgSub,borderRadius:8,padding:"8px 10px",
            }}>
              ⚠️ 通知はアプリを開いた後にスケジュールされます。iOSでは毎朝アプリを一度開くと翌日以降も通知されます。
            </div>
          </div>
        )}
      </Card>

      <Card title="🎨 フェーズの詳細設定">
        {phases.map(ph=>(
          <div key={ph.id} style={{
            background:ph.soft,border:`1.5px solid ${ph.border}`,
            borderRadius:14,padding:14,marginBottom:10,
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{ph.emoji}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:ph.color}}>{ph.label}</div>
                  <div style={{fontSize:11,color:C.textLight}}>Day {ph.startDay} 〜 {ph.endDay}</div>
                </div>
              </div>
              <button onClick={()=>setEditId(editId===ph.id?null:ph.id)} style={aBs(ph.color)}>
                {editId===ph.id?"閉じる":"編集"}
              </button>
            </div>
            {editId===ph.id&&<PhaseEditor phase={ph} onSave={u=>{setPhases(phases.map(p=>p.id===u.id?u:p));setEditId(null);}}/>}
          </div>
        ))}
        <button onClick={()=>setPhases(DEFAULT_PHASES)} style={{...aBs("#C0392B"),width:"100%",marginTop:4}}>
          デフォルトにリセット
        </button>
      </Card>
    </div>
  );

  // ── レンダー ──────────────────────────────────────
  return(
    <div style={{
      minHeight:"100vh",background:C.bg,
      fontFamily:"'Zen Kaku Gothic New','Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",
      maxWidth:430,margin:"0 auto",
      display:"flex",flexDirection:"column",color:C.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:${C.bgSub};}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px;}
        input,textarea,button{font-family:'Zen Kaku Gothic New','Noto Sans JP',sans-serif;}
        input[type=date],input[type=time],input[type=number]{color-scheme:light;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes popBounce{
          0%{opacity:0;transform:scale(0.72) translateY(20px);}
          65%{transform:scale(1.04) translateY(-4px);}
          100%{opacity:1;transform:scale(1) translateY(0);}
        }
        @keyframes tipIn{from{opacity:0;transform:translateX(-6px);}to{opacity:1;transform:translateX(0);}}
        @keyframes slideUp{from{opacity:0;transform:translateY(40px);}to{opacity:1;transform:translateY(0);}}
      `}</style>

      {/* ヘッダー */}
      <div style={{
        padding:"16px 18px 0",
        background:"rgba(247,244,239,0.96)",
        backdropFilter:"blur(12px)",
        borderBottom:`1px solid ${C.border}`,
        position:"sticky",top:0,zIndex:10,
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontSize:9,color:C.textLight,letterSpacing:3.5,fontWeight:700,marginBottom:2}}>PARTNER CARE</div>
            <div style={{fontSize:18,fontWeight:700,color:C.text,letterSpacing:-0.3}}>パートナーケア 💕</div>
          </div>
          <div style={{
            padding:"5px 13px",borderRadius:20,
            background:tp.soft,border:`1.5px solid ${tp.border}`,
            fontSize:12,color:tp.color,fontWeight:700,
          }}>{tp.emoji} Day {todayDay}</div>
        </div>
        <div style={{display:"flex",gap:0}}>
          {[{key:"home",label:"ホーム",icon:"🏠"},{key:"calendar",label:"カレンダー",icon:"📅"},{key:"settings",label:"設定",icon:"⚙️"}].map(t=>(
            <button key={t.key} onClick={()=>setView(t.key)} style={{
              flex:1,padding:"8px 4px 10px",background:"none",border:"none",
              borderBottom:view===t.key?`2.5px solid ${tp.color}`:"2.5px solid transparent",
              color:view===t.key?C.text:C.textLight,
              fontSize:11,cursor:"pointer",fontWeight:view===t.key?700:500,
              transition:"all 0.18s",display:"flex",flexDirection:"column",alignItems:"center",gap:2,
            }}>
              <span style={{fontSize:14}}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div style={{flex:1,padding:"18px 16px",overflowY:"auto",paddingBottom: showInstallBanner ? 110 : 18}}>
        {view==="home"     &&<HomeView/>}
        {view==="calendar" &&<CalView/>}
        {view==="settings" &&<SettingsView/>}
      </div>

      {/* ポップアップモーダル */}
      {popup&&(
        <div onClick={closePopup} style={{
          position:"fixed",inset:0,
          background:"rgba(160,148,136,0.4)",
          backdropFilter:"blur(5px)",
          display:"flex",alignItems:"center",justifyContent:"center",
          zIndex:100,padding:18,
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#fff",borderRadius:24,padding:"26px 22px",
            maxWidth:370,width:"100%",
            border:`1.5px solid ${popup.border}`,
            boxShadow:`0 16px 60px rgba(0,0,0,0.10)`,
            animation:popIn?"popBounce 0.4s cubic-bezier(0.34,1.2,0.64,1) both":"none",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{
                  width:50,height:50,borderRadius:14,
                  background:popup.soft,border:`1.5px solid ${popup.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:24,flexShrink:0,
                }}>{popup.emoji}</div>
                <div>
                  <div style={{fontSize:19,fontWeight:700,color:popup.color}}>{popup.label}</div>
                  <div style={{fontSize:12,color:C.textMid,marginTop:1}}>{popup.title}</div>
                  <div style={{fontSize:11,color:popup.color,marginTop:3,fontWeight:600,opacity:0.8}}>
                    生理日から Day {popup.startDay} 〜 Day {popup.endDay}
                  </div>
                </div>
              </div>
              <button onClick={closePopup} style={{
                background:C.bgSub,border:`1px solid ${C.border}`,borderRadius:8,
                color:C.textMid,fontSize:16,width:30,height:30,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              }}>×</button>
            </div>
            <div style={{
              fontSize:13,color:C.textMid,lineHeight:1.8,
              background:popup.soft,borderRadius:10,
              padding:"10px 14px",marginBottom:14,
              borderLeft:`3px solid ${popup.border}`,
            }}>{popup.subtitle}</div>
            <div style={{fontSize:10,color:C.textLight,fontWeight:700,letterSpacing:2,marginBottom:10}}>💡 対応ガイド</div>
            {popup.tips.map((tip,i)=>(
              <div key={i} style={{
                display:"flex",gap:10,alignItems:"flex-start",
                padding:"9px 12px",marginBottom:6,
                background:C.bgSub,borderRadius:10,
                fontSize:13,color:C.text,lineHeight:1.65,
                borderLeft:`3px solid ${popup.color}45`,
                animation:`tipIn 0.22s ease ${i*0.055}s both`,
              }}>
                <span style={{color:popup.color,fontWeight:700,flexShrink:0,marginTop:1}}>•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ホーム画面追加バナー */}
      {showInstallBanner&&(
        <InstallBanner onDismiss={()=>{
          setShowInstallBanner(false);
          localStorage.setItem("installDismissed","1");
        }}/>
      )}
    </div>
  );
}

// ── サブコンポーネント ────────────────────────────────────
function InstallBanner({onDismiss}) {
  return(
    <div style={{
      position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
      width:"100%",maxWidth:430,
      background:"rgba(28,18,40,0.93)",
      backdropFilter:"blur(16px)",
      borderRadius:"18px 18px 0 0",
      padding:"14px 16px 20px",
      display:"flex",alignItems:"center",gap:12,
      zIndex:200,
      animation:"slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1) both",
    }}>
      <div style={{
        width:46,height:46,borderRadius:12,
        background:"linear-gradient(135deg,#e91e8c,#7b1fa2)",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:24,flexShrink:0,
      }}>💕</div>
      <div style={{flex:1}}>
        <div style={{color:"#fff",fontWeight:700,fontSize:13,marginBottom:3}}>ホーム画面に追加</div>
        <div style={{color:"rgba(255,255,255,0.65)",fontSize:11,lineHeight:1.6}}>
          Safari の <span style={{fontSize:14}}>⬆️</span> →「ホーム画面に追加」をタップしてください
        </div>
      </div>
      <button onClick={onDismiss} style={{
        width:28,height:28,borderRadius:14,
        background:"rgba(255,255,255,0.15)",
        border:"none",color:"rgba(255,255,255,0.7)",
        fontSize:18,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        flexShrink:0,lineHeight:1,
      }}>×</button>
    </div>
  );
}

function UpdateBtn({onClick,label,sub}) {
  const [h,setH]=useState(false);
  return(
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        width:"100%",padding:"13px 16px",borderRadius:14,
        background:h?C.bgSub:"#fff",
        border:`1.5px solid ${h?"#A4D8BC":C.border}`,
        display:"flex",alignItems:"center",justifyContent:"center",gap:10,
        cursor:"pointer",boxShadow:h?"0 2px 12px rgba(44,122,80,0.12)":"0 1px 5px rgba(0,0,0,0.05)",
        transition:"all 0.18s",color:C.text,fontSize:14,fontWeight:600,
      }}
    >
      <span style={{fontSize:17}}>🫶</span>
      <span>{label}</span>
      <span style={{fontSize:11,color:C.textLight,marginLeft:2}}>{sub}</span>
    </button>
  );
}

function PhaseBtn({phase,onClick}) {
  const [h,setH]=useState(false);
  return(
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        padding:"16px 10px",borderRadius:16,
        background:h?phase.soft:"#fff",
        border:`1.5px solid ${h?phase.border:C.border}`,
        cursor:"pointer",textAlign:"center",
        transition:"all 0.2s",
        boxShadow:h?`0 4px 16px ${phase.color}14`:"0 1px 4px rgba(0,0,0,0.05)",
        transform:h?"translateY(-2px)":"translateY(0)",
      }}
    >
      <div style={{fontSize:26,marginBottom:5}}>{phase.emoji}</div>
      <div style={{fontSize:13,fontWeight:700,color:phase.color}}>{phase.label}</div>
      <div style={{fontSize:10,color:C.textLight,marginTop:2,fontWeight:500}}>Day {phase.startDay}〜{phase.endDay}</div>
    </button>
  );
}

function Card({title,children}) {
  return(
    <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 5px rgba(0,0,0,0.04)"}}>
      <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>{title}</div>
      {children}
    </div>
  );
}

function Toggle({on,onToggle}) {
  return(
    <div onClick={onToggle} style={{
      width:44,height:24,borderRadius:12,
      background:on?C.safe.main:C.border,
      position:"relative",cursor:"pointer",transition:"background 0.25s",flexShrink:0,
    }}>
      <div style={{
        width:18,height:18,borderRadius:9,background:"#fff",
        position:"absolute",top:3,left:on?23:3,
        transition:"left 0.25s",boxShadow:"0 1px 4px rgba(0,0,0,0.15)",
      }}/>
    </div>
  );
}

function PhaseEditor({phase,onSave}) {
  const [f,setF]=useState({...phase,tips:[...phase.tips]});
  const u=(k,v)=>setF({...f,[k]:v});
  return(
    <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${phase.border}`}}>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        {[["startDay","開始日"],["endDay","終了日"]].map(([k,l])=>(
          <div key={k} style={{flex:1}}>
            <label style={lblS}>{l}</label>
            <input type="number" min={1} max={28} value={f[k]}
              onChange={e=>u(k,Number(e.target.value))} style={{...inpS,width:"100%"}}/>
          </div>
        ))}
      </div>
      <label style={lblS}>説明テキスト</label>
      <textarea value={f.subtitle} onChange={e=>u("subtitle",e.target.value)}
        rows={2} style={{...inpS,width:"100%",resize:"vertical",marginBottom:10}}/>
      <label style={lblS}>対応ガイド（1行1項目）</label>
      <textarea value={f.tips.join("\n")} onChange={e=>u("tips",e.target.value.split("\n"))}
        rows={4} style={{...inpS,width:"100%",resize:"vertical",marginBottom:12}}/>
      <button onClick={()=>onSave(f)} style={{...aBs(phase.color),fontWeight:700}}>保存する</button>
    </div>
  );
}

// ── スタイル定数 ──────────────────────────────────────────
const inpS = {
  background:C.bgSub, border:`1px solid ${C.border}`,
  borderRadius:8, padding:"10px 12px",
  color:C.text, fontSize:16, outline:"none", width:"100%",
};
const lblS = {
  display:"block",fontSize:13,color:C.textMid,
  marginBottom:6,fontWeight:600,letterSpacing:0.3,
};
const aBs = color=>({
  padding:"8px 16px",borderRadius:8,
  background:`${color}14`,border:`1.5px solid ${color}45`,
  color:color,fontSize:12,cursor:"pointer",fontWeight:700,
  transition:"all 0.15s",letterSpacing:0.3,
});
const navBs = {
  background:"#fff",border:`1px solid ${C.border}`,
  borderRadius:8,color:C.text,fontSize:18,
  width:34,height:34,cursor:"pointer",
  display:"flex",alignItems:"center",justifyContent:"center",
  boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
};
