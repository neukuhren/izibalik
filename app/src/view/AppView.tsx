// Представление витрины. Правится вручную.
import { Fragment } from 'react';
import type { Vals } from '../logic/useApp';

export default function AppView({ v }: { v: Vals }) {
  return (
    <>
<div style={{height:'100%',display:'flex',flexDirection:'column',background:'#0a0a12',backgroundImage:'radial-gradient(560px 300px at 50% -80px,rgba(123,47,255,.22),transparent 70%)',color:'#e9eaf4',position:'relative',overflow:'hidden',fontFamily:'Inter,system-ui,sans-serif'}}>

{v.scanON && (<>
<div style={{position:'absolute',inset:'0',zIndex:'40',pointerEvents:'none',background:'repeating-linear-gradient(0deg,rgba(0,0,0,.14) 0px,rgba(0,0,0,.14) 1px,transparent 1px,transparent 3px)',mixBlendMode:'overlay'}}></div>
</>)}

{/* BOOT SPLASH */}
{v.booting && (<>
<div onClick={v.skipBoot} style={{position:'absolute',inset:'0',zIndex:'60',background:'#05050c',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'8px',opacity:v.bootOp,transition:'opacity .4s ease',cursor:'pointer',overflow:'hidden'}}>
  <div style={{position:'absolute',inset:'0',backgroundImage:'linear-gradient(rgba(0,240,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,.04) 1px,transparent 1px)',backgroundSize:'36px 36px',pointerEvents:'none'}}></div>
  <div style={{position:'absolute',top:'34%',left:'50%',transform:'translate(-50%,-50%)',width:'280px',height:'150px',background:'radial-gradient(closest-side,rgba(123,47,255,.35),transparent)',filter:'blur(10px)',pointerEvents:'none'}}></div>
  <div style={{position:'relative',fontFamily:'Orbitron,sans-serif',fontSize:'32px',fontWeight:'900',letterSpacing:'5px',background:'linear-gradient(100deg,#00f0ff,#f2f4ff 45%,#ff00aa)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',animation:'iziBootIn .8s ease-out both,iziGlitch 2.2s steps(1) infinite'}}>IZIBALIK</div>
  <div style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'9px',letterSpacing:'4px',color:'#5a5f7d',marginBottom:'28px',position:'relative'}}>TELEGRAM MINI APP</div>
  <div style={{width:'216px',display:'flex',flexDirection:'column',gap:'9px',position:'relative'}}>
    <div style={{height:'4px',borderRadius:'2px',background:'rgba(0,240,255,.08)',overflow:'hidden',border:'1px solid rgba(0,240,255,.16)'}}>
      <div style={{height:'100%',borderRadius:'2px',background:'linear-gradient(90deg,#00f0ff,#7b2fff,#ff00aa)',boxShadow:'0 0 12px rgba(0,240,255,.7)',width:v.bootW,transition:'width .12s linear'}}></div>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
      <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'9px',color:'#5a5f7d'}}>{v.bootLine}</span>
      <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'10px',color:'#00f0ff'}}>{v.bootPct}</span>
    </div>
  </div>
</div>
</>)}

{/* DOC VIEWER — просмотр документов внутри мини-аппа */}
{v.docOpen && (<>
<div style={{position:'absolute',inset:'0',zIndex:'55',background:'#0e0f1a',display:'flex',flexDirection:'column'}}>
  <div style={{flex:'none',display:'flex',alignItems:'center',gap:'10px',padding:'calc(env(safe-area-inset-top,0px) + 12px) 14px 12px',borderBottom:'1px solid rgba(0,240,255,.12)',background:'rgba(10,10,20,.85)',backdropFilter:'blur(14px)'}}>
    <div onClick={v.closeDoc} className="iziA98" style={{cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',width:'34px',height:'34px',borderRadius:'10px',border:'1px solid rgba(0,240,255,.25)',background:'rgba(0,240,255,.06)'}}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </div>
    <span style={{fontSize:'14px',fontWeight:'700',color:'#e9eaf4'}}>{v.docTitle}</span>
  </div>
  <iframe src={v.docUrl} title={v.docTitle} onLoad={(e:any)=>{
    try{
      const doc=e.currentTarget.contentDocument; if(!doc||doc.__iziBound)return; doc.__iziBound=true;
      doc.addEventListener('click',(ev:any)=>{
        const a=ev.target && ev.target.closest && ev.target.closest('a[href]'); if(!a)return;
        const href=a.getAttribute('href'); if(!href||!/^(https?:|tg:)/i.test(href))return;
        ev.preventDefault();
        const tg=(window as any).Telegram && (window as any).Telegram.WebApp;
        if(/(^tg:|t\.me\/|telegram\.me\/)/i.test(href)){ tg&&tg.openTelegramLink?tg.openTelegramLink(href):window.open(href,'_blank'); }
        else { tg&&tg.openLink?tg.openLink(href):window.open(href,'_blank'); }
      });
    }catch(err){}
  }} style={{flex:'1',width:'100%',border:'none',background:'#0e0f1a'}}></iframe>
</div>
</>)}

{/* TOPUP — пополнение баланса поставщика (Fazer crypto) */}
{v.topupOpen && (<>
<div onClick={v.closeTopup} style={{position:'absolute',inset:'0',zIndex:'58',background:'rgba(5,5,12,.78)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
  <div onClick={(e:any)=>e.stopPropagation()} style={{width:'100%',maxWidth:'440px',background:'#12131f',borderTopLeftRadius:'20px',borderTopRightRadius:'20px',border:'1px solid rgba(255,0,170,.25)',padding:'18px 16px calc(env(safe-area-inset-bottom,0px) + 18px)',maxHeight:'88%',overflow:'auto'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
      <span style={{fontSize:'15px',fontWeight:'700',color:'#f2f4ff'}}>Пополнение баланса</span>
      <div onClick={v.closeTopup} style={{cursor:'pointer',color:'#8b90ab',fontSize:'20px',lineHeight:'1'}}>✕</div>
    </div>
    {!v.topupPay && (<>
      <div style={{fontSize:'11px',color:'#8b90ab',marginBottom:'6px'}}>Сумма, USD (мин. $10)</div>
      <input value={v.topupAmount} onChange={v.setTopupAmount} inputMode="decimal" placeholder="10" style={{boxSizing:'border-box',width:'100%',background:'rgba(0,240,255,.05)',border:'1px solid rgba(0,240,255,.16)',borderRadius:'11px',padding:'12px 14px',color:'#f2f4ff',fontSize:'15px',fontFamily:'Orbitron,sans-serif'}} />
      <div style={{fontSize:'11px',color:'#8b90ab',margin:'14px 0 6px'}}>Способ (криптовалюта)</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'7px'}}>
        {[['trc20','USDT TRC20'],['bep20','USDT BEP20'],['ton','TON'],['aptos','Aptos'],['binancepay','Binance Pay']].map(([code,label]) => (
          <div key={code} onClick={()=>v.setTopupMethod(code)} className="iziA98" style={{cursor:'pointer',padding:'9px 12px',borderRadius:'10px',fontSize:'11.5px',fontWeight:'600',background:v.topupMethod===code?'rgba(255,0,170,.16)':'rgba(19,21,40,.6)',border:`1px solid ${v.topupMethod===code?'rgba(255,0,170,.6)':'rgba(139,144,171,.22)'}`,color:v.topupMethod===code?'#ff7ec9':'#8b90ab'}}>{label}</div>
        ))}
      </div>
      {v.topupError && (<div style={{marginTop:'12px',fontSize:'12px',color:'#ff2e7e'}}>{v.topupError}</div>)}
      <div onClick={v.topupLoading?undefined:v.submitTopup} className="iziA98" style={{cursor:'pointer',marginTop:'16px',height:'50px',borderRadius:'13px',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(100deg,#00f0ff,#7b2fff)',color:'#050510',fontFamily:'Orbitron,sans-serif',fontSize:'13px',fontWeight:'700',letterSpacing:'1px',opacity:v.topupLoading?0.6:1}}>{v.topupLoading?'СОЗДАЁМ СЧЁТ…':'СОЗДАТЬ СЧЁТ'}</div>
    </>)}
    {v.topupPay && (<>
      <div style={{fontSize:'12px',color:'#00f0ff',marginBottom:'12px'}}>Счёт создан. Переведите точную сумму на адрес ниже.</div>
      {[['Сеть',v.topupPay.network],['Сумма',(v.topupPay.uniqueAmount||v.topupPay.amount)],['Адрес',v.topupPay.address],['MEMO/TAG',v.topupPay.memo]].filter(r=>r[1]).map((r:any,ri:number)=>(
        <div key={ri} style={{marginBottom:'10px'}}>
          <div style={{fontSize:'10px',color:'#5a5f7d',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'3px'}}>{r[0]}</div>
          <div onClick={()=>{try{navigator.clipboard.writeText(String(r[1]));}catch(e){}}} style={{cursor:'pointer',wordBreak:'break-all',fontFamily:'ui-monospace,Menlo,monospace',fontSize:'12.5px',color:'#e9eaf4',background:'rgba(0,240,255,.05)',border:'1px solid rgba(0,240,255,.14)',borderRadius:'10px',padding:'10px 12px'}}>{r[1]}</div>
        </div>
      ))}
      <div style={{fontSize:'10.5px',color:'#5a5f7d',marginTop:'6px'}}>Баланс обновится после подтверждения сети. Нажмите на поле, чтобы скопировать.</div>
      <div onClick={v.closeTopup} className="iziA98" style={{cursor:'pointer',marginTop:'16px',height:'46px',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(0,240,255,.3)',color:'#00f0ff',fontSize:'13px',fontWeight:'700'}}>Готово</div>
    </>)}
  </div>
</div>
</>)}

{/* ═══════════ CLIENT ═══════════ */}
{v.isClient && (<>

<div style={{padding:'calc(env(safe-area-inset-top,0px) + 12px) 18px 10px',display:'flex',alignItems:'center',justifyContent:'space-between',flex:'none'}}>
  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
    <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#00f0ff',boxShadow:'0 0 8px #00f0ff',animation:'iziBlink 2.6s infinite'}}></div>
    <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'13px',fontWeight:'700',letterSpacing:'3px',color:'#e9eaf4'}}>IZIBALIK</span>
  </div>
  <span style={{fontSize:'10px',letterSpacing:'1px',color:'#5a5f7d',fontFamily:'Orbitron,sans-serif'}}>MINI APP</span>
</div>

<div style={{flex:'1',overflow:'auto',position:'relative'}}>

{/* SHOP */}
{v.isShop && (<>
<div data-screen-label="Витрина" style={{padding:'2px 16px 24px',display:'flex',flexDirection:'column',gap:'15px'}}>

  <div style={{position:'relative',textAlign:'center',padding:'16px 0 0',animation:'iziIn .5s ease-out both'}}>
    <div style={{position:'absolute',top:'-14px',left:'50%',transform:'translateX(-50%)',width:'240px',height:'130px',background:'radial-gradient(closest-side,rgba(123,47,255,.4),transparent)',filter:'blur(8px)',pointerEvents:'none'}}></div>
    <div style={{position:'relative',fontFamily:'Orbitron,sans-serif',fontSize:'36px',fontWeight:'900',letterSpacing:'5px',background:'linear-gradient(100deg,#00f0ff,#f2f4ff 45%,#ff00aa)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',animation:'iziGlitch 4s steps(1) infinite'}}>IZIBALIK</div>
    <div style={{position:'relative',display:'flex',alignItems:'center',gap:'9px',justifyContent:'center',marginTop:'9px'}}>
      <div style={{height:'1px',width:'34px',background:'linear-gradient(90deg,transparent,rgba(0,240,255,.7))'}}></div>
      <div style={{width:'5px',height:'5px',transform:'rotate(45deg)',background:'#00f0ff',boxShadow:'0 0 8px #00f0ff',flex:'none'}}></div>
      <span style={{fontSize:'10px',letterSpacing:'2.5px',color:'#8b90ab',textTransform:'uppercase',whiteSpace:'nowrap'}}>Пополнение UC · PUBG Mobile</span>
      <div style={{width:'5px',height:'5px',transform:'rotate(45deg)',background:'#ff00aa',boxShadow:'0 0 8px #ff00aa',flex:'none'}}></div>
      <div style={{height:'1px',width:'34px',background:'linear-gradient(270deg,transparent,rgba(255,0,170,.7))'}}></div>
    </div>
  </div>

  {v.pausedON && (<>
    <div style={{border:'1px solid rgba(217,255,0,.4)',background:'rgba(217,255,0,.06)',borderRadius:'12px',padding:'11px 14px',fontSize:'12.5px',color:'#d9ff00',display:'flex',gap:'9px',alignItems:'center'}}>
      <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#d9ff00',boxShadow:'0 0 8px #d9ff00',animation:'iziBlink 1.4s infinite',flex:'none'}}></div>
      Магазин на паузе — заказы временно не принимаются
    </div>
  </>)}

  {/* GAMES — фиолетовая зона */}
  <div style={{position:'relative',borderRadius:'16px',border:'1px solid rgba(123,47,255,.3)',background:'linear-gradient(165deg,rgba(123,47,255,.11),rgba(13,13,26,.55) 70%)',padding:'11px 12px 12px',display:'flex',flexDirection:'column',gap:'9px',overflow:'hidden',animation:'iziIn .5s ease-out .08s both'}}>
    <div style={{position:'absolute',top:'-1px',left:'-1px',width:'16px',height:'16px',borderTop:'2px solid rgba(123,47,255,.8)',borderLeft:'2px solid rgba(123,47,255,.8)',borderTopLeftRadius:'16px',pointerEvents:'none'}}></div>
    <div style={{display:'flex',alignItems:'center',gap:'9px'}}>
      <div style={{width:'5px',height:'5px',transform:'rotate(45deg)',background:'#b18cff',boxShadow:'0 0 8px rgba(177,140,255,.8)',flex:'none'}}></div>
      <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'10px',letterSpacing:'2px',color:'#b18cff'}}>// ИГРЫ</span>
      <div style={{flex:'1',height:'1px',background:'linear-gradient(90deg,rgba(123,47,255,.5),transparent)'}}></div>
    </div>
    <div style={{display:'flex',gap:'10px',overflowX:'auto',margin:'0 -12px',padding:'2px 12px 2px'}}>
      {v.games.map((g: any, gi: number) => (
        <div key={gi} onClick={g.pick} className="iziA98" style={{flex:'none',width:'132px',cursor:g.soon?'default':'pointer',borderRadius:'14px',border:'1px solid '+g.bd,background:g.bg,boxShadow:g.glow,padding:'12px 13px 11px',display:'flex',flexDirection:'column',gap:'8px',opacity:g.op}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{width:'30px',height:'30px',borderRadius:'9px',background:g.iconBg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Orbitron,sans-serif',fontSize:'13px',fontWeight:'900',color:g.iconC,boxShadow:g.iconGlow}}>{g.letter}</div>
            {g.soon && <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'7px',fontWeight:'700',letterSpacing:'1.5px',color:'#d9ff00',border:'1px solid rgba(217,255,0,.35)',borderRadius:'5px',padding:'3px 5px'}}>СКОРО</span>}
            {g.on && <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#00f0ff',boxShadow:'0 0 8px #00f0ff',animation:'iziBlink 2.6s infinite'}}></div>}
          </div>
          <div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontSize:'12px',fontWeight:'800',letterSpacing:'1px',color:g.nameC,lineHeight:'1.25'}}>{g.name}</div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontSize:'12px',fontWeight:'800',letterSpacing:'1px',color:g.nameC,lineHeight:'1.25'}}>{g.name2}</div>
          </div>
          <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'8px',letterSpacing:'.5px',color:g.tagC,whiteSpace:'nowrap'}}>{g.tag}</span>
        </div>
      ))}
    </div>
  </div>

  {/* CATALOG — cyan-зона: подразделы + товары */}
  <div style={{position:'relative',borderRadius:'16px',border:'1px solid rgba(0,240,255,.17)',background:'linear-gradient(165deg,rgba(0,240,255,.05),rgba(13,13,26,.5) 60%)',padding:'11px 12px 14px',display:'flex',flexDirection:'column',gap:'12px',animation:'iziIn .5s ease-out .1s both'}}>
    <div style={{position:'absolute',top:'-1px',right:'-1px',width:'16px',height:'16px',borderTop:'2px solid rgba(0,240,255,.7)',borderRight:'2px solid rgba(0,240,255,.7)',borderTopRightRadius:'16px',pointerEvents:'none'}}></div>
    <div style={{display:'flex',gap:'6px'}}>
    {v.subChips.map((f: any, fi: number) => (
      <div key={fi} onClick={f.set} className="iziA98" style={{flex:'1',minWidth:'0',cursor:'pointer',padding:'8px 2px 7px',display:'flex',flexDirection:'column',alignItems:'center',gap:'5px',borderRadius:'12px',background:f.bg,border:`1px solid ${f.bd}`,boxShadow:f.g,transition:'background .2s,box-shadow .2s,border-color .2s'}}>
        <div style={{width:'26px',height:'26px',borderRadius:f.icon.round?'50%':'8px',background:f.icon.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Orbitron,sans-serif',fontSize:'10px',fontWeight:'900',color:f.icon.c}}>{f.icon.t}</div>
        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'7.5px',fontWeight:'700',letterSpacing:'.5px',color:f.c,whiteSpace:'nowrap'}}>{f.l}</span>
      </div>
    ))}
    </div>

  <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'2px',animation:'iziIn .5s ease-out .16s both'}}>
    <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'10px',letterSpacing:'2px',color:'#5a5f7d'}}>// {v.catLabel}</span>
    <div style={{flex:'1',height:'1px',background:'linear-gradient(90deg,rgba(0,240,255,.3),transparent)'}}></div>
  </div>

  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'11px'}}>
    {v.shopRest.map((p: any, pi: number) => (<Fragment key={pi}>
      <div onClick={p.select} style={{gridColumn:p.colSpan,cursor:'pointer',display:'flex',flexDirection:'column',gap:'7px',animation:`iziIn .5s ease-out ${p.delay} both`}} className="iziA97">
        <div style={{position:'relative',aspectRatio:'1 / 1',borderRadius:'14px',background:'linear-gradient(165deg,rgba(25,27,50,.85),rgba(13,13,26,.95))',border:'1px solid rgba(0,240,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
          <div style={{position:'absolute',top:'-1px',left:'-1px',width:'13px',height:'13px',borderTop:'2px solid rgba(0,240,255,.7)',borderLeft:'2px solid rgba(0,240,255,.7)',borderTopLeftRadius:'14px',pointerEvents:'none'}}></div>
          <span style={{position:'absolute',top:'9px',left:'0',right:'0',textAlign:'center',fontSize:'9px',letterSpacing:'1px',color:'#5a5f7d'}}>в наличии</span>
          {p.hasBadge && (<>
            <div style={{position:'absolute',top:'7px',right:'7px',fontFamily:'Orbitron,sans-serif',fontSize:'7.5px',fontWeight:'700',letterSpacing:'1px',padding:'3px 6px',borderRadius:'6px',background:'#0a0a12',border:`1px solid ${p.badgeC}`,color:p.badgeC,textShadow:`0 0 8px ${p.badgeC}`}}>{p.badge}</div>
          </>)}
          {p.imgUrl
            ? <img src={p.imgUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
            : <div style={{width:'76px',height:'76px',borderRadius:p.iconRound?'50%':'18px',background:p.iconBg,boxShadow:p.bigGlow,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Orbitron,sans-serif',fontSize:'20px',fontWeight:'900',color:p.iconC,marginTop:'6px'}}>{p.iconText}</div>}
        </div>
        <div style={{textAlign:'center',fontSize:'12.5px',fontWeight:'700',color:'#e9eaf4',lineHeight:'1.3'}}>{p.name}</div>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'center',gap:'7px',padding:'9px 6px',clipPath:'polygon(7% 0,100% 0,93% 100%,0 100%)',background:'linear-gradient(100deg,rgba(123,47,255,.34),rgba(74,26,153,.46))'}}>
          {p.hasOld && <span style={{fontSize:'10px',color:'#8b90ab',textDecoration:'line-through'}}>{p.oldF}</span>}
          <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'14.5px',fontWeight:'700',color:'#f2f4ff'}}>{p.priceF} ₽</span>
        </div>
      </div>
    </Fragment>))}
  </div>
  </div>

</div>
</>)}

{/* CHECKOUT */}
{v.isCheckout && (<>
<div data-screen-label="Оформление заказа" style={{padding:'4px 16px 24px',display:'flex',flexDirection:'column',gap:'14px'}}>
  <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'6px 0'}}>
    <div onClick={v.goShop} style={{width:'34px',height:'34px',borderRadius:'50%',background:'rgba(19,21,40,.7)',border:'1px solid rgba(0,240,255,.18)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </div>
    <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'15px',fontWeight:'700',letterSpacing:'2px'}}>ОФОРМЛЕНИЕ</span>
  </div>
  <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.13)',borderRadius:'16px',backdropFilter:'blur(10px)',padding:'14px',display:'flex',alignItems:'center',gap:'12px'}}>
    <div style={{width:'36px',height:'36px',flex:'none',borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#ffe98a,#f0b429 55%,#9c6b10)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Orbitron,sans-serif',fontSize:'10px',fontWeight:'900',color:'#3d2b00'}}>UC</div>
    <div style={{flex:'1'}}>
      <div style={{fontFamily:'Orbitron,sans-serif',fontSize:'16px',fontWeight:'700'}}>{v.selName}</div>
      <div style={{fontSize:'11px',color:'#8b90ab',marginTop:'2px'}}>{v.selPriceF} ₽ · зачисление ≈ 2 мин</div>
    </div>
    <div onClick={v.goShop} style={{fontSize:'11.5px',color:'#00f0ff',cursor:'pointer',padding:'6px'}}>Изменить</div>
  </div>

  <div style={{display:'flex',flexDirection:'column',gap:'8px',animation:v.pidAnim}}>
    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
      <label style={{fontSize:'12px',fontWeight:'600',color:'#c7cae0'}}>Player ID</label>
      <span onClick={v.toggleHint} style={{fontSize:'11px',color:'#7b2fff',cursor:'pointer',textDecoration:'underline',textDecorationColor:'rgba(123,47,255,.4)'}}>Где найти ID?</span>
    </div>
    <input value={v.playerId} onChange={v.setPid} inputMode="numeric" placeholder="Например, 5123456789" style={{boxSizing:'border-box',width:'100%',background:'rgba(0,240,255,.05)',border:`1px solid ${v.pidBorder}`,borderRadius:'12px',padding:'14px',color:'#f2f4ff',fontFamily:'ui-monospace,Menlo,monospace',fontSize:'16px',letterSpacing:'1px'}} className="iziFCg" />
    {v.pidHasError && (<>
      <div style={{fontSize:'11.5px',color:'#ff2e7e'}}>{v.pidError}</div>
    </>)}
    {v.showHint && (<>
      <div style={{borderRadius:'12px',overflow:'hidden',border:'1px solid rgba(0,240,255,.22)',animation:'iziPop .25s ease-out'}}>
        <img src="/art/find-id.webp" alt="Где найти Player ID: профиль → UID вверху" onError={(e:any)=>{e.currentTarget.style.display='none';}} style={{display:'block',width:'100%'}} />
        <div style={{padding:'8px 10px',fontSize:'10.5px',color:'#8b90ab',textAlign:'center',background:'rgba(0,240,255,.04)'}}>Player ID (UID) — вверху профиля, рядом с ником</div>
      </div>
    </>)}
  </div>

  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
    <label style={{fontSize:'12px',fontWeight:'600',color:'#c7cae0'}}>Никнейм <span style={{color:'#5a5f7d',fontWeight:'400'}}>· для проверки, опционально</span></label>
    <input value={v.nickname} onChange={v.setNick} placeholder="Ваш ник в игре" style={{boxSizing:'border-box',width:'100%',background:'rgba(0,240,255,.05)',border:'1px solid rgba(0,240,255,.16)',borderRadius:'12px',padding:'14px',color:'#f2f4ff',fontSize:'14px'}} className="iziFCg" />
  </div>

  <div style={{display:'flex',flexDirection:'column',gap:'8px',animation:v.promoAnim}}>
    <label style={{fontSize:'12px',fontWeight:'600',color:'#c7cae0'}}>Промокод</label>
    <div style={{display:'flex',gap:'8px'}}>
      <input value={v.promo} onChange={v.setPromo} placeholder="IZI10" style={{boxSizing:'border-box',flex:'1',minWidth:'0',background:'rgba(0,240,255,.05)',border:'1px solid rgba(0,240,255,.16)',borderRadius:'12px',padding:'14px',color:'#f2f4ff',fontFamily:'ui-monospace,Menlo,monospace',fontSize:'14px',letterSpacing:'2px',textTransform:'uppercase'}} className="iziFC" />
      <div onClick={v.applyPromo} style={{flex:'none',display:'flex',alignItems:'center',padding:'0 18px',borderRadius:'12px',background:'rgba(123,47,255,.18)',border:'1px solid rgba(123,47,255,.5)',color:'#b18cff',fontSize:'13px',fontWeight:'600',cursor:'pointer'}} className="iziA96">Применить</div>
    </div>
    {v.promoOk && (<>
      <div style={{display:'inline-flex',alignSelf:'flex-start',alignItems:'center',gap:'7px',padding:'6px 12px',borderRadius:'8px',background:'rgba(217,255,0,.08)',border:'1px solid rgba(217,255,0,.45)',color:'#d9ff00',fontSize:'12px',fontWeight:'600',animation:'iziPop .3s ease-out'}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d9ff00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        {v.promoOkLabel} применён
      </div>
    </>)}
    {v.promoErrF && (<>
      <div style={{fontSize:'11.5px',color:'#ff2e7e'}}>Промокод не найден или неактивен</div>
    </>)}
  </div>

  <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.13)',borderRadius:'16px',backdropFilter:'blur(10px)',padding:'16px 14px',display:'flex',flexDirection:'column',gap:'10px'}}>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',color:'#8b90ab'}}><span>Тариф</span><span style={{color:'#e9eaf4',fontVariantNumeric:'tabular-nums'}}>{v.selPriceF} ₽</span></div>
    {v.hasDiscount && (<>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',color:'#8b90ab'}}><span>Скидка</span><span style={{color:'#d9ff00',fontVariantNumeric:'tabular-nums'}}>−{v.discountF} ₽</span></div>
    </>)}
    <div style={{height:'1px',background:'linear-gradient(90deg,transparent,rgba(0,240,255,.3),transparent)'}}></div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><span style={{fontSize:'13px',fontWeight:'600'}}>К оплате</span><span style={{fontFamily:'Orbitron,sans-serif',fontSize:'22px',fontWeight:'700',color:'#00f0ff',textShadow:'0 0 12px rgba(0,240,255,.5)'}}>{v.totalF} ₽</span></div>
  </div>
</div>
</>)}

{/* PAYMENT */}
{v.isPayment && (<>
<div data-screen-label="Оплата" style={{padding:'4px 16px 24px',display:'flex',flexDirection:'column',gap:'14px'}}>
  <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'6px 0'}}>
    <div onClick={v.backCheckout} style={{width:'34px',height:'34px',borderRadius:'50%',background:'rgba(19,21,40,.7)',border:'1px solid rgba(0,240,255,.18)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </div>
    <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'15px',fontWeight:'700',letterSpacing:'2px'}}>ОПЛАТА</span>
  </div>
  <div onClick={v.pickSbp} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',padding:'15px 14px',borderRadius:'16px',background:'rgba(19,21,40,.55)',backdropFilter:'blur(10px)',border:`1px solid ${v.mSbpB}`,boxShadow:v.mSbpG}}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#00f0ff"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"></path></svg>
    <div style={{flex:'1'}}><div style={{fontSize:'14px',fontWeight:'600'}}>СБП</div><div style={{fontSize:'11px',color:'#8b90ab'}}>Мгновенно, без комиссии</div></div>
    <div style={{width:'18px',height:'18px',borderRadius:'50%',border:`2px solid ${v.mSbpR}`,background:v.mSbpRF,boxShadow:v.mSbpRG}}></div>
  </div>
  <div onClick={v.pickCard} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',padding:'15px 14px',borderRadius:'16px',background:'rgba(19,21,40,.55)',backdropFilter:'blur(10px)',border:`1px solid ${v.mCardB}`,boxShadow:v.mCardG}}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b18cff" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2.5"></rect><line x1="2" y1="10" x2="22" y2="10" strokeWidth="2.6"></line></svg>
    <div style={{flex:'1'}}><div style={{fontSize:'14px',fontWeight:'600'}}>Банковская карта</div><div style={{fontSize:'11px',color:'#8b90ab'}}>Visa · Mastercard · МИР</div></div>
    <div style={{width:'18px',height:'18px',borderRadius:'50%',border:`2px solid ${v.mCardR}`,background:v.mCardRF,boxShadow:v.mCardRG}}></div>
  </div>
  <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.13)',borderRadius:'16px',padding:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
    <div><div style={{fontSize:'12px',color:'#8b90ab'}}>{v.selName} → ID {v.playerId}</div></div>
    <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'17px',fontWeight:'700',color:'#00f0ff'}}>{v.totalF} ₽</span>
  </div>
  {v.payHasErr && (<div style={{fontSize:'12px',color:'#ff2e7e',textAlign:'center'}}>{v.payErr}</div>)}
  <div style={{fontSize:'10.5px',color:'#5a5f7d',textAlign:'center',lineHeight:'1.5'}}>Оплачивая, вы соглашаетесь с <a href="/terms" target="_blank" rel="noreferrer" style={{color:'#7b2fff'}}>условиями</a>.<br />Платёж обрабатывает провайдер Platega.</div>
</div>
</>)}

{/* PAY WAIT */}
{v.isPaywait && (<>
<div data-screen-label="Ожидание оплаты" style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'22px',padding:'0 32px'}}>
  <div style={{position:'relative',width:'96px',height:'96px'}}>
    <div style={{position:'absolute',inset:'0',borderRadius:'50%',border:'3px solid rgba(0,240,255,.14)',borderTopColor:'#00f0ff',animation:'iziSpin 1s linear infinite',boxShadow:'0 0 18px rgba(0,240,255,.25)'}}></div>
    <div style={{position:'absolute',inset:'0',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
    </div>
  </div>
  <div style={{textAlign:'center'}}>
    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:'15px',fontWeight:'700',letterSpacing:'1.5px'}}>ОЖИДАЕМ ОПЛАТУ</div>
    <div style={{marginTop:'8px',fontSize:'12px',color:'#8b90ab'}}>{v.payMethodLabel} · {v.totalF} ₽</div>
    <div style={{marginTop:'6px',fontSize:'11.5px',color:'#5a5f7d'}}>Оплатите в открывшемся окне. Как подтвердим — заказ выполнится автоматически.</div>
  </div>
  <div onClick={v.reopenPay} className="iziA98" style={{cursor:'pointer',padding:'12px 20px',borderRadius:'12px',border:'1px solid rgba(0,240,255,.35)',color:'#00f0ff',fontSize:'13px',fontWeight:'700'}}>Открыть окно оплаты снова</div>
</div>
</>)}

{/* STATUS */}
{v.isStatus && (<>
<div data-screen-label="Статус заказа" style={{padding:'10px 16px 24px',display:'flex',flexDirection:'column',gap:'16px',position:'relative'}}>
  {v.success && (<>
    <div style={{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'}}>
      <span style={{position:'absolute',left:'12%',top:'52%',width:'8px',height:'8px',background:'#00f0ff',animation:'iziRise 1.3s ease-out forwards'}}></span>
      <span style={{position:'absolute',left:'28%',top:'56%',width:'6px',height:'6px',background:'#ff00aa',animation:'iziRise 1.1s .1s ease-out forwards'}}></span>
      <span style={{position:'absolute',left:'46%',top:'50%',width:'9px',height:'9px',background:'#7b2fff',animation:'iziRise 1.4s .05s ease-out forwards'}}></span>
      <span style={{position:'absolute',left:'63%',top:'55%',width:'6px',height:'6px',background:'#d9ff00',animation:'iziRise 1.2s .15s ease-out forwards'}}></span>
      <span style={{position:'absolute',left:'78%',top:'51%',width:'8px',height:'8px',background:'#00f0ff',animation:'iziRise 1.35s .08s ease-out forwards'}}></span>
      <span style={{position:'absolute',left:'88%',top:'57%',width:'5px',height:'5px',background:'#ff00aa',animation:'iziRise 1s .2s ease-out forwards'}}></span>
    </div>
  </>)}
  <div style={{textAlign:'center',paddingTop:'8px'}}>
    <div style={{fontSize:'11px',letterSpacing:'2px',color:'#8b90ab',textTransform:'uppercase'}}>Заказ {v.curOrderId}</div>
    {v.success && (<>
      <div style={{marginTop:'10px',fontFamily:'Orbitron,sans-serif',fontSize:'30px',fontWeight:'900',letterSpacing:'4px',color:'#f2f4ff',animation:'iziGlitch 2.4s steps(1) infinite'}}>ГОТОВО</div>
      <div style={{marginTop:'8px',fontSize:'13px',color:'#8b90ab'}}><span style={{color:'#00f0ff',fontWeight:'600'}}>{v.selName}</span> — выполнено для ID <span style={{fontFamily:'ui-monospace,Menlo,monospace',color:'#e9eaf4'}}>{v.playerId}</span></div>
    </>)}
    {v.notSuccess && (<>
      <div style={{marginTop:'10px',fontFamily:'Orbitron,sans-serif',fontSize:'19px',fontWeight:'700',letterSpacing:'2px'}}>ВЫПОЛНЯЕМ ЗАКАЗ</div>
    </>)}
  </div>
  <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.13)',borderRadius:'16px',backdropFilter:'blur(10px)',padding:'20px 18px',display:'flex',flexDirection:'column'}}>
    {v.stages.map((st: any, sti: number) => (<Fragment key={sti}>
      <div style={{display:'flex',gap:'14px'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{width:'26px',height:'26px',borderRadius:'50%',flex:'none',display:'flex',alignItems:'center',justifyContent:'center',background:st.dotBg,border:`2px solid ${st.dotB}`,boxShadow:st.dotG,animation:st.dotAnim}}>
            {st.done && (<>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0a0a12" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </>)}
          </div>
          {st.hasLine && (<>
            <div style={{width:'2px',flex:'1',minHeight:'26px',background:st.lineC}}></div>
          </>)}
        </div>
        <div style={{paddingBottom:'20px'}}>
          <div style={{fontSize:'13.5px',fontWeight:'600',color:st.titleC}}>{st.t}</div>
          <div style={{fontSize:'11px',color:'#5a5f7d',marginTop:'3px'}}>{st.d}</div>
        </div>
      </div>
    </Fragment>))}
  </div>
  {v.success && (<>
    <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.13)',borderRadius:'16px',padding:'14px',display:'flex',flexDirection:'column',gap:'8px',animation:'iziPop .35s ease-out'}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'#8b90ab'}}><span>Тариф</span><span style={{color:'#e9eaf4'}}>{v.selName}</span></div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'#8b90ab'}}><span>Player ID</span><span style={{fontFamily:'ui-monospace,Menlo,monospace',color:'#e9eaf4'}}>{v.playerId}</span></div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'#8b90ab'}}><span>Оплачено</span><span style={{fontFamily:'Orbitron,sans-serif',color:'#00f0ff',fontWeight:'700'}}>{v.totalF} ₽</span></div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'#8b90ab'}}><span>Способ</span><span style={{color:'#e9eaf4'}}>{v.payMethodLabel}</span></div>
    </div>
  </>)}
  <div style={{textAlign:'center',fontSize:'12px',color:'#8b90ab'}}>Проблема с заказом? <a href="https://t.me/Bsebtn" target="_blank" rel="noreferrer" style={{color:'#7b2fff',textDecoration:'underline',textDecorationColor:'rgba(123,47,255,.4)',cursor:'pointer'}}>Написать в поддержку</a></div>
</div>
</>)}

{/* ORDERS */}
{v.isOrders && (<>
<div data-screen-label="Мои заказы" style={{padding:'8px 16px 24px',display:'flex',flexDirection:'column',gap:'12px'}}>
  <div style={{fontFamily:'Orbitron,sans-serif',fontSize:'15px',fontWeight:'700',letterSpacing:'2px',padding:'6px 0'}}>МОИ ЗАКАЗЫ</div>
  <div style={{display:'flex',gap:'7px',flexWrap:'wrap'}}>
    {v.ordFilters.map((f: any, fi: number) => (<Fragment key={fi}>
      <div onClick={f.set} style={{cursor:'pointer',padding:'7px 13px',borderRadius:'9px',fontSize:'11.5px',fontWeight:'600',background:f.bg,border:`1px solid ${f.bd}`,color:f.c}}>{f.l}</div>
    </Fragment>))}
  </div>
  {v.ordersEmpty && (<>
    <div style={{border:'1px dashed rgba(0,240,255,.3)',borderRadius:'16px',padding:'36px 20px',textAlign:'center',display:'flex',flexDirection:'column',gap:'12px',alignItems:'center'}}>
      <div style={{fontFamily:'Orbitron,sans-serif',fontSize:'13px',fontWeight:'700',letterSpacing:'1.5px',color:'#8b90ab'}}>ПУСТО</div>
      <div style={{fontSize:'12px',color:'#5a5f7d'}}>Здесь появятся ваши заказы</div>
      <div onClick={v.goShop} style={{cursor:'pointer',padding:'10px 20px',borderRadius:'11px',background:'rgba(0,240,255,.1)',border:'1px solid rgba(0,240,255,.4)',color:'#00f0ff',fontSize:'12.5px',fontWeight:'600'}}>К тарифам</div>
    </div>
  </>)}
  {v.ordList.map((o: any, oi: number) => (<Fragment key={oi}>
    <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.11)',borderRadius:'14px',backdropFilter:'blur(10px)',padding:'13px 14px',display:'flex',flexDirection:'column',gap:'9px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:'9px'}}>
          <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'14px',fontWeight:'700'}}>{o.name}</span>
          <span style={{fontSize:'10px',color:'#5a5f7d',fontFamily:'ui-monospace,Menlo,monospace'}}>{o.idText}</span>
        </div>
        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'13px',fontWeight:'700',color:'#e9eaf4',fontVariantNumeric:'tabular-nums'}}>{o.amountF} ₽</span>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <span style={{width:'6px',height:'6px',borderRadius:'50%',background:o.stC,boxShadow:`0 0 6px ${o.stC}`}}></span>
          <span style={{fontSize:'11px',color:o.stC,fontWeight:'600'}}>{o.stL}</span>
          <span style={{fontSize:'10.5px',color:'#5a5f7d'}}>· {o.timeF}</span>
        </div>
        {o.canRepeat && (<>
          <div onClick={o.repeat} style={{cursor:'pointer',padding:'6px 12px',borderRadius:'8px',background:'rgba(0,240,255,.08)',border:'1px solid rgba(0,240,255,.35)',color:'#00f0ff',fontSize:'11px',fontWeight:'600'}} className="iziA95">Купить снова</div>
        </>)}
      </div>
    </div>
  </Fragment>))}
</div>
</>)}

{/* PROFILE */}
{v.isProfile && (<>
<div data-screen-label="Профиль" style={{padding:'8px 16px 24px',display:'flex',flexDirection:'column',gap:'14px'}}>
  <div style={{display:'flex',alignItems:'center',gap:'14px',padding:'8px 0'}}>
    {v.hasPhoto
      ? <img src={v.tgPhoto} alt="" style={{width:'58px',height:'58px',borderRadius:'50%',objectFit:'cover',boxShadow:'0 0 18px rgba(255,0,170,.35)',border:'1px solid rgba(255,0,170,.35)'}} />
      : <div style={{width:'58px',height:'58px',borderRadius:'50%',background:'linear-gradient(135deg,#7b2fff,#ff00aa)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Orbitron,sans-serif',fontSize:'22px',fontWeight:'900',color:'#fff',boxShadow:'0 0 18px rgba(255,0,170,.35)'}}>{v.avatarLetter}</div>}
    <div>
      <div style={{fontSize:'16px',fontWeight:'700'}}>{v.tgName}</div>
      <div style={{fontSize:'12px',color:'#8b90ab',marginTop:'2px'}}>{v.tgHandle}</div>
    </div>
  </div>
  <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.13)',borderRadius:'16px',backdropFilter:'blur(10px)',padding:'4px 14px'}}>
    <div style={{padding:'11px 0',fontSize:'11px',letterSpacing:'1.5px',color:'#5a5f7d',textTransform:'uppercase',borderBottom:'1px solid rgba(0,240,255,.08)'}}>Сохранённые Player ID</div>
    {v.hasSaved && (<>
      {v.savedRows.map((r: any, ri: number) => (
        <div key={ri} onClick={r.copy} className="iziA98" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',padding:'13px 0',cursor:'pointer',borderBottom:r.isLast?'none':'1px solid rgba(0,240,255,.08)'}}>
          <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'14px',letterSpacing:'1px',color:r.main?'#e9eaf4':'#8b90ab'}}>{r.pid}</span>
          <span style={{display:'flex',alignItems:'center',gap:'8px'}}>
            {r.copied
              ? <span style={{fontSize:'11px',color:'#00f0ff'}}>Скопировано ✓</span>
              : (<>
                {r.main && <span style={{fontSize:'9.5px',fontWeight:'700',letterSpacing:'1px',padding:'4px 8px',borderRadius:'6px',background:'rgba(0,240,255,.1)',border:'1px solid rgba(0,240,255,.35)',color:'#00f0ff'}}>ОСНОВНОЙ</span>}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a5f7d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>
              </>)}
          </span>
        </div>
      ))}
    </>)}
    {!v.hasSaved && (<>
      <div style={{padding:'14px 0',fontSize:'11.5px',color:'#5a5f7d'}}>Player ID сохранится автоматически после первого заказа</div>
    </>)}
  </div>
  {v.canAdmin && (<>
  <div onClick={v.enterAdmin} style={{cursor:'pointer',background:'rgba(19,21,40,.55)',border:'1px solid rgba(255,0,170,.3)',borderRadius:'16px',padding:'14px',display:'flex',alignItems:'center',gap:'12px'}} className="iziA98">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff00aa" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3.2 7.6-7 9-3.8-1.4-7-4.5-7-9V6l7-3z"></path></svg>
    <div style={{flex:'1'}}><div style={{fontSize:'13.5px',fontWeight:'600'}}>Админ-панель</div><div style={{fontSize:'10.5px',color:'#5a5f7d',marginTop:'2px'}}>доступ по whitelist Telegram ID</div></div>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a5f7d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>
  </div>
  </>)}
  <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.13)',borderRadius:'16px',backdropFilter:'blur(10px)',padding:'4px 14px'}}>
    <div style={{padding:'11px 0',fontSize:'11px',letterSpacing:'1.5px',color:'#5a5f7d',textTransform:'uppercase',borderBottom:'1px solid rgba(0,240,255,.08)'}}>Документы</div>
    {[
      {href:'/docs',label:'Документация сервиса'},
      {href:'/privacy',label:'Политика конфиденциальности'},
      {href:'/terms',label:'Пользовательское соглашение'}
    ].map((doc: any, di: number, arr: any[]) => (
      <div key={di} onClick={() => v.openDoc(doc.href, doc.label)} className="iziA98" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',padding:'13px 0',cursor:'pointer',textDecoration:'none',borderBottom:di===arr.length-1?'none':'1px solid rgba(0,240,255,.08)'}}>
        <span style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>
          <span style={{fontSize:'13.5px',color:'#e9eaf4'}}>{doc.label}</span>
        </span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5a5f7d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>
      </div>
    ))}
  </div>
  <div style={{textAlign:'center',fontSize:'10px',color:'#3d4059',fontFamily:'ui-monospace,Menlo,monospace'}}>Izibalik Mini App · v1.0 · mock backend</div>
</div>
</>)}

</div>

{/* FLOATING SUPPORT (структура RefCod) */}
{v.isShop && (<>
<a href="https://t.me/Bsebtn" target="_blank" rel="noreferrer" aria-label="Поддержка" title="Поддержка" className="iziA95" style={{position:'absolute',right:'12px',bottom:'112px',zIndex:'25',width:'46px',height:'46px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'999px',background:'linear-gradient(100deg,#ff2e7e,#ff00aa)',boxShadow:'0 4px 16px rgba(255,0,170,.4)',color:'#fff',textDecoration:'none'}}>
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
</a>
</>)}

{/* MAIN BUTTON */}
{v.mbVisible && (<>
<div style={{flex:'none',padding:'10px 14px calc(env(safe-area-inset-bottom,0px) + 12px)',background:'linear-gradient(transparent,rgba(5,5,12,.9) 40%)'}}>
  <div onClick={v.mbClick} style={{cursor:'pointer',height:'52px',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(90deg,#00f0ff,#7b2fff,#ff00aa,#00f0ff)',backgroundSize:'250% 100%',animation:'iziGrad 4s linear infinite',color:'#050510',fontFamily:'Orbitron,sans-serif',fontSize:'14px',fontWeight:'700',letterSpacing:'1.5px',boxShadow:'0 0 24px rgba(0,240,255,.35)'}} className="iziA98">{v.mbLabel}</div>
</div>
</>)}

{/* CLIENT TAB BAR */}
{v.tabVisible && (<>
<div style={{flex:'none',display:'flex',borderTop:'1px solid rgba(0,240,255,.1)',background:'rgba(10,10,20,.85)',backdropFilter:'blur(14px)',padding:'8px 0 calc(env(safe-area-inset-bottom,0px) + 8px)'}}>
  <div onClick={v.goShop} style={{flex:'1',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',paddingTop:'4px'}}>
    <div style={{width:'22px',height:'3px',borderRadius:'2px',background:v.iShopBar,boxShadow:v.iShopBarG,marginBottom:'2px'}}></div>
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={v.cShop} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7h12l-1.2 13H7.2L6 7z"></path><path d="M9 10V6a3 3 0 0 1 6 0v4"></path></svg>
    <span style={{fontSize:'10px',fontWeight:'600',color:v.cShop}}>Магазин</span>
  </div>
  <div onClick={v.goOrders} style={{flex:'1',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',paddingTop:'4px'}}>
    <div style={{width:'22px',height:'3px',borderRadius:'2px',background:v.iOrdBar,boxShadow:v.iOrdBarG,marginBottom:'2px'}}></div>
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={v.cOrders} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"></path><line x1="9" y1="8" x2="15" y2="8"></line><line x1="9" y1="12" x2="15" y2="12"></line></svg>
    <span style={{fontSize:'10px',fontWeight:'600',color:v.cOrders}}>Заказы</span>
  </div>
  <div onClick={v.goProfile} style={{flex:'1',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',paddingTop:'4px'}}>
    <div style={{width:'22px',height:'3px',borderRadius:'2px',background:v.iProfBar,boxShadow:v.iProfBarG,marginBottom:'2px'}}></div>
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={v.cProfile} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-3.8 3.6-6 8-6s8 2.2 8 6"></path></svg>
    <span style={{fontSize:'10px',fontWeight:'600',color:v.cProfile}}>Профиль</span>
  </div>
</div>
</>)}

</>)}

{/* ═══════════ ADMIN ═══════════ */}
{v.isAdmin && (<>

<div style={{padding:'calc(env(safe-area-inset-top,0px) + 12px) 18px 10px',display:'flex',alignItems:'center',justifyContent:'space-between',flex:'none'}}>
  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff00aa" strokeWidth="2" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3.2 7.6-7 9-3.8-1.4-7-4.5-7-9V6l7-3z"></path></svg>
    <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'13px',fontWeight:'700',letterSpacing:'3px',color:'#e9eaf4'}}>IZIBALIK</span>
    <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'9px',fontWeight:'700',letterSpacing:'2px',padding:'3px 7px',borderRadius:'5px',background:'rgba(255,0,170,.12)',border:'1px solid rgba(255,0,170,.5)',color:'#ff00aa'}}>ADMIN</span>
  </div>
  <div onClick={v.exitAdmin} style={{cursor:'pointer',fontSize:'11px',color:'#8b90ab',padding:'6px 10px',border:'1px solid rgba(139,144,171,.3)',borderRadius:'8px'}}>Выйти</div>
</div>

<div style={{flex:'1',overflow:'auto',position:'relative'}}>

{/* DASHBOARD */}
{v.admDash && (<>
<div data-screen-label="Админ · Дашборд" style={{padding:'8px 16px 24px',display:'flex',flexDirection:'column',gap:'12px'}}>
  <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(255,0,170,.2)',borderRadius:'16px',backdropFilter:'blur(10px)',padding:'14px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:'11px',letterSpacing:'1.5px',color:'#8b90ab',textTransform:'uppercase'}}>Выручка</span>
      <div style={{display:'flex',gap:'4px'}}>
        {v.perChips.map((pc: any, pci: number) => (<Fragment key={pci}>
          <div onClick={pc.set} style={{cursor:'pointer',fontSize:'10.5px',fontWeight:'700',padding:'5px 10px',borderRadius:'7px',background:pc.bg,border:`1px solid ${pc.bd}`,color:pc.c}}>{pc.l}</div>
        </Fragment>))}
      </div>
    </div>
    <div style={{marginTop:'10px',fontFamily:'Orbitron,sans-serif',fontSize:'30px',fontWeight:'700',color:'#ff00aa',textShadow:'0 0 16px rgba(255,0,170,.45)',fontVariantNumeric:'tabular-nums'}}>{v.revF} ₽</div>
  </div>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
    <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.12)',borderRadius:'13px',padding:'11px 10px'}}>
      <div style={{fontSize:'9.5px',color:'#5a5f7d',textTransform:'uppercase',letterSpacing:'1px'}}>Заказы</div>
      <div style={{marginTop:'5px',fontFamily:'Orbitron,sans-serif',fontSize:'17px',fontWeight:'700',color:'#00f0ff'}}>{v.ordCount}</div>
    </div>
    <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.12)',borderRadius:'13px',padding:'11px 10px'}}>
      <div style={{fontSize:'9.5px',color:'#5a5f7d',textTransform:'uppercase',letterSpacing:'1px'}}>Ср. чек</div>
      <div style={{marginTop:'5px',fontFamily:'Orbitron,sans-serif',fontSize:'17px',fontWeight:'700',color:'#00f0ff'}}>{v.avgF} ₽</div>
    </div>
    <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.12)',borderRadius:'13px',padding:'11px 10px'}}>
      <div style={{fontSize:'9.5px',color:'#5a5f7d',textTransform:'uppercase',letterSpacing:'1px'}}>Маржа</div>
      <div style={{marginTop:'5px',fontFamily:'Orbitron,sans-serif',fontSize:'17px',fontWeight:'700',color:'#d9ff00'}}>{v.marginF}%</div>
    </div>
  </div>
  <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.12)',borderRadius:'16px',backdropFilter:'blur(10px)',padding:'14px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
      <span style={{fontSize:'11px',letterSpacing:'1.5px',color:'#8b90ab',textTransform:'uppercase'}}>Выручка · 14 дней</span>
      <span style={{fontSize:'10px',color:'#5a5f7d',fontFamily:'ui-monospace,Menlo,monospace'}}>max {v.chartMaxF} ₽</span>
    </div>
    <div style={{position:'relative',marginTop:'12px'}}>
      <div style={{position:'absolute',inset:'0',display:'flex',alignItems:'flex-end',justifyContent:'space-between',padding:'0 2px'}}>
        {v.chartBars.map((b: any, bi: number) => (<Fragment key={bi}>
          <div style={{width:'9px',borderRadius:'2px 2px 0 0',background:'rgba(123,47,255,.28)',height:`${b.barH}px`}}></div>
        </Fragment>))}
      </div>
      <svg width="100%" height="96" viewBox="0 0 300 96" preserveAspectRatio="none" style={{position:'relative',display:'block'}}>
        <defs>
          <linearGradient id="iziRevA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.35"></stop>
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0"></stop>
          </linearGradient>
        </defs>
        <polygon points={v.chartArea} fill="url(#iziRevA)"></polygon>
        <polyline points={v.chartPts} fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinejoin="round" style={{filter:'drop-shadow(0 0 4px rgba(0,240,255,.8))'}}></polyline>
      </svg>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',marginTop:'8px',fontSize:'9.5px',color:'#5a5f7d',fontFamily:'ui-monospace,Menlo,monospace'}}><span>{v.chartFrom}</span><span>{v.chartTo}</span></div>
  </div>
  <div style={{background:'rgba(19,21,40,.55)',border:`1px solid ${v.balBorder}`,borderRadius:'16px',padding:'14px',display:'flex',alignItems:'center',gap:'12px'}}>
    <div style={{flex:'1'}}>
      <div style={{fontSize:'11px',letterSpacing:'1.5px',color:'#8b90ab',textTransform:'uppercase'}}>Баланс поставщика</div>
      <div style={{marginTop:'6px',fontFamily:'Orbitron,sans-serif',fontSize:'20px',fontWeight:'700',color:'#f2f4ff',fontVariantNumeric:'tabular-nums'}}>{v.supHas ? v.supBalF + ' ₽' : '—'}</div>
      {!v.supHas && (<>
        <div style={{marginTop:'6px',fontSize:'11px',color:'#5a5f7d'}}>Нет данных о балансе</div>
      </>)}
      {v.supLow && (<>
        <div style={{marginTop:'6px',display:'flex',alignItems:'center',gap:'6px'}}>
          <span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#ff2e7e',boxShadow:'0 0 8px #ff2e7e',animation:'iziBlink 1.2s infinite'}}></span>
          <span style={{fontSize:'11px',color:'#ff2e7e',fontWeight:'600'}}>Мало средств</span>
        </div>
      </>)}
    </div>
    <div onClick={v.openTopup} className="iziA98" style={{cursor:'pointer',flex:'none',padding:'10px 14px',borderRadius:'10px',background:'rgba(255,0,170,.14)',border:'1px solid rgba(255,0,170,.5)',color:'#ff7ec9',fontSize:'11.5px',fontWeight:'600'}}>Пополнить</div>
  </div>
  <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.12)',borderRadius:'16px',padding:'6px 14px'}}>
    <div style={{padding:'10px 0',fontSize:'11px',letterSpacing:'1.5px',color:'#8b90ab',textTransform:'uppercase',display:'flex',justifyContent:'space-between',alignItems:'center'}}>Последние заказы <span onClick={v.aOrd} style={{cursor:'pointer',fontSize:'10.5px',color:'#00f0ff',textTransform:'none',letterSpacing:'0'}}>Все →</span></div>
    {v.recent.map((r: any, ri: number) => (<Fragment key={ri}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderTop:'1px solid rgba(0,240,255,.07)'}}>
        <span style={{width:'6px',height:'6px',borderRadius:'50%',background:r.stC,boxShadow:`0 0 6px ${r.stC}`,flex:'none'}}></span>
        <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'11px',color:'#8b90ab',flex:'none'}}>{r.idText}</span>
        <span style={{fontSize:'11.5px',color:'#e9eaf4',flex:'1',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.user}</span>
        <span style={{fontSize:'11px',color:'#8b90ab',flex:'none'}}>{r.name}</span>
        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'12px',fontWeight:'700',color:'#f2f4ff',flex:'none',fontVariantNumeric:'tabular-nums'}}>{r.amountF} ₽</span>
      </div>
    </Fragment>))}
    {!v.hasRecent && (<>
      <div style={{padding:'18px 0 20px',textAlign:'center',fontSize:'11.5px',color:'#5a5f7d',borderTop:'1px solid rgba(0,240,255,.07)'}}>Заказов пока нет</div>
    </>)}
  </div>
</div>
</>)}

{/* ADMIN ORDERS */}
{v.admOrd && (<>
<div data-screen-label="Админ · Заказы" style={{padding:'8px 16px 24px',display:'flex',flexDirection:'column',gap:'11px'}}>
  <input value={v.admSearch} onChange={v.setSearch} placeholder="Поиск: ID заказа, @клиент, Player ID" style={{boxSizing:'border-box',width:'100%',background:'rgba(0,240,255,.05)',border:'1px solid rgba(0,240,255,.16)',borderRadius:'11px',padding:'12px 14px',color:'#f2f4ff',fontSize:'13px'}} className="iziFMg" />
  <div style={{display:'flex',gap:'7px',flexWrap:'wrap'}}>
    {v.admChips.map((f: any, fi: number) => (<Fragment key={fi}>
      <div onClick={f.set} style={{cursor:'pointer',padding:'7px 12px',borderRadius:'9px',fontSize:'11px',fontWeight:'600',background:f.bg,border:`1px solid ${f.bd}`,color:f.c}}>{f.l}</div>
    </Fragment>))}
  </div>
  {v.admRows.map((o: any, oi: number) => (<Fragment key={oi}>
    <div onClick={o.open} style={{cursor:'pointer',background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.1)',borderRadius:'13px',padding:'11px 13px',display:'flex',flexDirection:'column',gap:'7px'}} className="iziA99">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'11px',color:'#8b90ab'}}>{o.idText}</span>
          <span style={{fontSize:'12px',fontWeight:'600',color:'#e9eaf4'}}>{o.user}</span>
        </div>
        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'13px',fontWeight:'700',fontVariantNumeric:'tabular-nums'}}>{o.amountF} ₽</span>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:'10.5px',color:'#5a5f7d',fontFamily:'ui-monospace,Menlo,monospace'}}>{o.name} → {o.pid}</span>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <span style={{width:'6px',height:'6px',borderRadius:'50%',background:o.stC,boxShadow:`0 0 6px ${o.stC}`}}></span>
          <span style={{fontSize:'10.5px',color:o.stC,fontWeight:'600'}}>{o.stL}</span>
          <span style={{fontSize:'10px',color:'#5a5f7d'}}>{o.timeF}</span>
        </div>
      </div>
    </div>
  </Fragment>))}
  {v.admEmpty && (<>
    <div style={{border:'1px dashed rgba(0,240,255,.3)',borderRadius:'14px',padding:'28px',textAlign:'center',fontSize:'12px',color:'#5a5f7d'}}>Ничего не найдено</div>
  </>)}
</div>
</>)}

{/* ADMIN PRODUCTS */}
{v.admProd && (<>
<div data-screen-label="Админ · Тарифы" style={{padding:'8px 16px 24px',display:'flex',flexDirection:'column',gap:'10px'}}>
  <div style={{fontSize:'11px',color:'#5a5f7d',lineHeight:'1.5'}}>Наценка меняется степпером — итоговая цена пересчитывается сразу и обновляет витрину</div>

  {/* общая наценка на все товары */}
  <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(255,0,170,.3)',borderRadius:'14px',padding:'12px 13px',display:'flex',alignItems:'center',gap:'10px'}}>
    <div style={{flex:'1',minWidth:'0'}}>
      <div style={{fontFamily:'Orbitron,sans-serif',fontSize:'11px',fontWeight:'700',letterSpacing:'1px',color:'#ff9ad1'}}>ОБЩАЯ НАЦЕНКА</div>
      <div style={{fontSize:'10px',color:'#5a5f7d',marginTop:'3px'}}>применится ко всем товарам</div>
    </div>
    <div style={{display:'flex',alignItems:'center',gap:'7px',flex:'none'}}>
      <div onClick={v.bulkDec} className="iziA95" style={{cursor:'pointer',width:'28px',height:'28px',borderRadius:'8px',border:'1px solid rgba(139,144,171,.3)',display:'flex',alignItems:'center',justifyContent:'center',color:'#8b90ab',fontSize:'15px'}}>−</div>
      <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'13px',fontWeight:'700',color:'#f2f4ff',minWidth:'38px',textAlign:'center'}}>{v.bulkM}%</span>
      <div onClick={v.bulkInc} className="iziA95" style={{cursor:'pointer',width:'28px',height:'28px',borderRadius:'8px',border:'1px solid rgba(139,144,171,.3)',display:'flex',alignItems:'center',justifyContent:'center',color:'#8b90ab',fontSize:'15px'}}>+</div>
    </div>
    <div onClick={v.bulkApply} className="iziA95" style={{flex:'none',cursor:'pointer',padding:'9px 13px',borderRadius:'9px',background:'linear-gradient(90deg,rgba(255,0,170,.3),rgba(123,47,255,.3))',border:'1px solid rgba(255,0,170,.55)',color:'#ff9ad1',fontSize:'11px',fontWeight:'700'}}>Применить</div>
  </div>

  {v.prodRows.map((p: any, pi: number) => (<Fragment key={pi}>
    <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.1)',borderRadius:'14px',padding:'12px 13px',display:'flex',flexDirection:'column',gap:'10px',opacity:p.rowOp}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <span style={{color:'#3d4059',fontSize:'14px',cursor:'grab'}}>≡</span>
        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'14px',fontWeight:'700',flex:'1',minWidth:'0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
        <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'8px',letterSpacing:'1px',color:'#5a5f7d',border:'1px solid rgba(139,144,171,.3)',borderRadius:'4px',padding:'2px 5px',flex:'none'}}>{p.catL}</span>
        {p.hasBadge && (<>
          <span style={{fontSize:'8.5px',fontWeight:'700',letterSpacing:'1px',padding:'3px 7px',borderRadius:'5px',border:`1px solid ${p.badgeC}`,color:p.badgeC}}>{p.badge}</span>
        </>)}
        <div onClick={p.tgl} style={{cursor:'pointer',width:'40px',height:'22px',borderRadius:'12px',background:p.tglBg,border:`1px solid ${p.tglBd}`,position:'relative',transition:'background .2s'}}>
          <div style={{position:'absolute',top:'2px',left:p.knobL,width:'16px',height:'16px',borderRadius:'50%',background:'#e9eaf4',transition:'left .2s',boxShadow:p.knobG}}></div>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'11px',color:'#8b90ab'}}>
        <span style={{fontVariantNumeric:'tabular-nums'}}>закуп {p.buyF} ₽</span>
        <div style={{display:'flex',alignItems:'center',gap:'6px',background:'rgba(123,47,255,.1)',border:'1px solid rgba(123,47,255,.35)',borderRadius:'8px',padding:'3px 4px'}}>
          <div onClick={p.dec} style={{cursor:'pointer',width:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',color:'#b18cff',fontSize:'15px',fontWeight:'700'}}>−</div>
          <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'11.5px',color:'#d4c2ff',minWidth:'32px',textAlign:'center'}}>{p.markup}%</span>
          <div onClick={p.inc} style={{cursor:'pointer',width:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',color:'#b18cff',fontSize:'15px',fontWeight:'700'}}>+</div>
        </div>
        <span style={{flex:'1',textAlign:'right',fontFamily:'Orbitron,sans-serif',fontSize:'14px',fontWeight:'700',color:'#00f0ff',fontVariantNumeric:'tabular-nums'}}>→ {p.priceF} ₽</span>
      </div>
    </div>
  </Fragment>))}
</div>
</>)}

{/* ADMIN PROMOS */}
{v.admPromo && (<>
<div data-screen-label="Админ · Промокоды" style={{padding:'8px 16px 24px',display:'flex',flexDirection:'column',gap:'11px'}}>
  <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(255,0,170,.22)',borderRadius:'16px',padding:'14px',display:'flex',flexDirection:'column',gap:'10px'}}>
    <div style={{fontSize:'11px',letterSpacing:'1.5px',color:'#8b90ab',textTransform:'uppercase'}}>Новый промокод</div>
    <div style={{display:'flex',gap:'8px'}}>
      <input value={v.npCode} onChange={v.setNpCode} placeholder="КОД" style={{boxSizing:'border-box',flex:'1',minWidth:'0',background:'rgba(0,240,255,.05)',border:`1px solid ${v.npBorder}`,borderRadius:'10px',padding:'11px 12px',color:'#f2f4ff',fontFamily:'ui-monospace,Menlo,monospace',fontSize:'13px',letterSpacing:'2px',textTransform:'uppercase'}} className="iziFM" />
      <div style={{flex:'none',display:'flex',gap:'4px'}}>
        <div onClick={v.setPct} style={{cursor:'pointer',padding:'11px 13px',borderRadius:'10px',fontSize:'12px',fontWeight:'700',background:v.npPctBg,border:`1px solid ${v.npPctBd}`,color:v.npPctC}}>%</div>
        <div onClick={v.setFix} style={{cursor:'pointer',padding:'11px 13px',borderRadius:'10px',fontSize:'12px',fontWeight:'700',background:v.npFixBg,border:`1px solid ${v.npFixBd}`,color:v.npFixC}}>₽</div>
      </div>
    </div>
    <div style={{display:'flex',gap:'8px'}}>
      <input value={v.npVal} onChange={v.setNpVal} inputMode="numeric" placeholder="Скидка" style={{boxSizing:'border-box',flex:'1',minWidth:'0',background:'rgba(0,240,255,.05)',border:'1px solid rgba(0,240,255,.16)',borderRadius:'10px',padding:'11px 12px',color:'#f2f4ff',fontSize:'13px'}} className="iziFM" />
      <input value={v.npLimit} onChange={v.setNpLimit} inputMode="numeric" placeholder="Лимит" style={{boxSizing:'border-box',flex:'1',minWidth:'0',background:'rgba(0,240,255,.05)',border:'1px solid rgba(0,240,255,.16)',borderRadius:'10px',padding:'11px 12px',color:'#f2f4ff',fontSize:'13px'}} className="iziFM" />
      <div onClick={v.createPromo} style={{cursor:'pointer',flex:'none',display:'flex',alignItems:'center',padding:'0 16px',borderRadius:'10px',background:'rgba(255,0,170,.16)',border:'1px solid rgba(255,0,170,.55)',color:'#ff7ec9',fontSize:'12.5px',fontWeight:'700'}} className="iziA96">Создать</div>
    </div>
  </div>
  {v.promoRows.map((pm: any, pmi: number) => (<Fragment key={pmi}>
    <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.1)',borderRadius:'13px',padding:'12px 13px',display:'flex',flexDirection:'column',gap:'9px',opacity:pm.rowOp}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'13px',fontWeight:'700',letterSpacing:'2px',color:'#f2f4ff',flex:'1'}}>{pm.code}</span>
        <span style={{fontSize:'11px',fontWeight:'700',color:'#d9ff00'}}>{pm.label}</span>
        <div onClick={pm.tgl} style={{cursor:'pointer',width:'40px',height:'22px',borderRadius:'12px',background:pm.tglBg,border:`1px solid ${pm.tglBd}`,position:'relative'}}>
          <div style={{position:'absolute',top:'2px',left:pm.knobL,width:'16px',height:'16px',borderRadius:'50%',background:'#e9eaf4',transition:'left .2s'}}></div>
        </div>
        <div onClick={pm.del} style={{cursor:'pointer',width:'26px',height:'26px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'8px',border:'1px solid rgba(255,46,126,.35)',color:'#ff2e7e'}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff2e7e" strokeWidth="2.4" strokeLinecap="round"><line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line></svg>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <div style={{flex:'1',height:'4px',borderRadius:'2px',background:'rgba(0,240,255,.08)',overflow:'hidden'}}>
          <div style={{height:'100%',borderRadius:'2px',background:'linear-gradient(90deg,#7b2fff,#ff00aa)',width:pm.useW}}></div>
        </div>
        <span style={{fontSize:'10px',color:'#5a5f7d',fontFamily:'ui-monospace,Menlo,monospace'}}>{pm.usage}</span>
      </div>
    </div>
  </Fragment>))}
</div>
</>)}

{/* ADMIN BROADCAST */}
{v.admBcast && (<>
<div data-screen-label="Админ · Рассылка" style={{padding:'8px 16px 24px',display:'flex',flexDirection:'column',gap:'12px'}}>
  <div style={{fontSize:'11px',color:'#5a5f7d',lineHeight:'1.5'}}>Сообщение придёт всем выбранным пользователям от имени бота</div>
  <div>
    <div style={{fontSize:'11px',letterSpacing:'1px',color:'#8b90ab',textTransform:'uppercase',marginBottom:'7px'}}>Аудитория</div>
    <div style={{display:'flex',gap:'7px',flexWrap:'wrap'}}>
      {v.bcAudChips.map((a: any, ai: number) => (<Fragment key={ai}>
        <div onClick={a.set} style={{cursor:'pointer',padding:'8px 13px',borderRadius:'10px',fontSize:'12px',fontWeight:'600',background:a.bg,border:`1px solid ${a.bd}`,color:a.c}}>{a.l}{a.n!=null && <span style={{opacity:0.7}}> · {a.n}</span>}</div>
      </Fragment>))}
    </div>
  </div>
  <textarea value={v.bcText} onChange={v.setBcText} placeholder="Текст рассылки…" rows={5} style={{boxSizing:'border-box',width:'100%',background:'rgba(0,240,255,.05)',border:'1px solid rgba(0,240,255,.16)',borderRadius:'12px',padding:'12px 14px',color:'#f2f4ff',fontSize:'14px',resize:'vertical',fontFamily:'inherit'}} />
  <div style={{display:'flex',gap:'8px'}}>
    <input value={v.bcBtnText} onChange={v.setBcBtnText} placeholder="Кнопка (текст, опц.)" style={{boxSizing:'border-box',flex:'1',minWidth:'0',background:'rgba(19,21,40,.55)',border:'1px solid rgba(139,144,171,.25)',borderRadius:'10px',padding:'10px 12px',color:'#f2f4ff',fontSize:'12.5px'}} />
    <input value={v.bcBtnUrl} onChange={v.setBcBtnUrl} placeholder="ссылка кнопки" style={{boxSizing:'border-box',flex:'1',minWidth:'0',background:'rgba(19,21,40,.55)',border:'1px solid rgba(139,144,171,.25)',borderRadius:'10px',padding:'10px 12px',color:'#f2f4ff',fontSize:'12.5px'}} />
  </div>
  {v.bcHasErr && (<div style={{fontSize:'12px',color:'#ff2e7e'}}>{v.bcErr}</div>)}
  {v.bcHasStatus && (<>
    <div style={{background:'rgba(19,21,40,.55)',border:'1px solid rgba(0,240,255,.13)',borderRadius:'12px',padding:'12px 14px',fontSize:'12.5px',color:'#c7cae0'}}>
      {v.bcRunning ? 'Отправка…' : 'Готово'} · доставлено {v.bcSentF}{v.bcFailed>0 && <span style={{color:'#ff2e7e'}}> · ошибок {v.bcFailed}</span>}
    </div>
  </>)}
  <div onClick={v.bcRunning ? undefined : v.sendBroadcast} className="iziA98" style={{cursor:'pointer',height:'50px',borderRadius:'13px',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(100deg,#ff2e7e,#7b2fff)',color:'#fff',fontFamily:'Orbitron,sans-serif',fontSize:'13px',fontWeight:'700',letterSpacing:'1px',opacity:v.bcRunning?0.6:1}}>{v.bcRunning?'ОТПРАВКА…':'ОТПРАВИТЬ РАССЫЛКУ'}</div>
</div>
</>)}

{/* ORDER DETAIL SHEET */}
{v.dOpen && (<>
<div style={{position:'absolute',inset:'0',zIndex:'30',background:'rgba(5,5,12,.75)',backdropFilter:'blur(4px)',display:'flex',flexDirection:'column',justifyContent:'flex-end'}} onClick={v.closeAdm}>
  <div style={{background:'#0e0e1c',borderTop:'1px solid rgba(255,0,170,.35)',borderRadius:'22px 22px 0 0',padding:'18px 18px 28px',display:'flex',flexDirection:'column',gap:'14px',animation:'iziUp .28s ease-out',maxHeight:'85%',overflow:'auto'}} onClick={v.stopProp}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'15px',fontWeight:'700'}}>{v.dIdText}</span>
        <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'4px 10px',borderRadius:'7px',background:'rgba(0,0,0,.3)',border:`1px solid ${v.dStC}`}}>
          <span style={{width:'6px',height:'6px',borderRadius:'50%',background:v.dStC,boxShadow:`0 0 6px ${v.dStC}`}}></span>
          <span style={{fontSize:'10.5px',fontWeight:'700',color:v.dStC}}>{v.dStL}</span>
        </div>
      </div>
      <div onClick={v.closeAdm} style={{cursor:'pointer',width:'30px',height:'30px',borderRadius:'50%',background:'rgba(139,144,171,.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b90ab" strokeWidth="2.4" strokeLinecap="round"><line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line></svg>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
      <div style={{background:'rgba(19,21,40,.6)',borderRadius:'11px',padding:'10px 12px'}}><div style={{fontSize:'9.5px',color:'#5a5f7d',textTransform:'uppercase',letterSpacing:'1px'}}>Клиент</div><div style={{marginTop:'4px',fontSize:'12.5px',fontWeight:'600'}}>{v.dUser}</div></div>
      <div style={{background:'rgba(19,21,40,.6)',borderRadius:'11px',padding:'10px 12px'}}><div style={{fontSize:'9.5px',color:'#5a5f7d',textTransform:'uppercase',letterSpacing:'1px'}}>Сумма</div><div style={{marginTop:'4px',fontFamily:'Orbitron,sans-serif',fontSize:'13px',fontWeight:'700',color:'#00f0ff'}}>{v.dAmountF} ₽</div></div>
      <div style={{background:'rgba(19,21,40,.6)',borderRadius:'11px',padding:'10px 12px'}}><div style={{fontSize:'9.5px',color:'#5a5f7d',textTransform:'uppercase',letterSpacing:'1px'}}>Тариф</div><div style={{marginTop:'4px',fontSize:'12.5px',fontWeight:'600'}}>{v.dName}</div></div>
      <div style={{background:'rgba(19,21,40,.6)',borderRadius:'11px',padding:'10px 12px'}}><div style={{fontSize:'9.5px',color:'#5a5f7d',textTransform:'uppercase',letterSpacing:'1px'}}>Player ID</div><div style={{marginTop:'4px',fontFamily:'ui-monospace,Menlo,monospace',fontSize:'12px'}}>{v.dPid}</div></div>
    </div>
    <div>
      <div style={{fontSize:'11px',letterSpacing:'1.5px',color:'#8b90ab',textTransform:'uppercase',marginBottom:'10px'}}>Лог событий</div>
      <div style={{display:'flex',flexDirection:'column'}}>
        {v.dEvents.map((ev: any, evi: number) => (<Fragment key={evi}>
          <div style={{display:'flex',gap:'11px'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
              <span style={{width:'8px',height:'8px',borderRadius:'50%',flex:'none',marginTop:'4px',background:ev.dotC,boxShadow:`0 0 6px ${ev.dotC}`}}></span>
              {ev.hasLine && (<>
                <div style={{width:'1.5px',flex:'1',minHeight:'14px',background:'rgba(0,240,255,.15)'}}></div>
              </>)}
            </div>
            <div style={{paddingBottom:'13px'}}>
              <div style={{fontSize:'12px',color:ev.tC}}>{ev.t}</div>
              <div style={{fontSize:'10px',color:'#5a5f7d',marginTop:'2px',fontFamily:'ui-monospace,Menlo,monospace'}}>{ev.timeF}</div>
            </div>
          </div>
        </Fragment>))}
      </div>
    </div>
    <div style={{display:'flex',gap:'8px'}}>
      <div onClick={v.actResend} style={{cursor:'pointer',flex:'1',textAlign:'center',padding:'12px 6px',borderRadius:'11px',background:'rgba(123,47,255,.18)',border:'1px solid rgba(123,47,255,.55)',color:'#d4c2ff',fontSize:'11.5px',fontWeight:'600'}} className="iziA97">Отправить снова</div>
      <div onClick={v.actRefund} style={{cursor:'pointer',flex:'1',textAlign:'center',padding:'12px 6px',borderRadius:'11px',background:'rgba(255,46,126,.1)',border:'1px solid rgba(255,46,126,.5)',color:'#ff7ea9',fontSize:'11.5px',fontWeight:'600'}} className="iziA97">Возврат</div>
      <div onClick={v.actResolve} style={{cursor:'pointer',flex:'1',textAlign:'center',padding:'12px 6px',borderRadius:'11px',background:'rgba(0,240,255,.08)',border:'1px solid rgba(0,240,255,.45)',color:'#00f0ff',fontSize:'11.5px',fontWeight:'600'}} className="iziA97">Решено</div>
    </div>
  </div>
</div>
</>)}

</div>

{/* ADMIN — панель сохранения изменений конфига */}
{v.cfgDirty && (<>
<div style={{flex:'none',display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',borderTop:'1px solid rgba(255,0,170,.25)',background:'rgba(14,15,26,.96)',backdropFilter:'blur(14px)'}}>
  <span style={{flex:'1',fontSize:'11.5px',color:'#d9ff00'}}>Есть несохранённые изменения</span>
  <div onClick={v.cancelConfig} className="iziA98" style={{cursor:'pointer',padding:'9px 14px',borderRadius:'10px',border:'1px solid rgba(139,144,171,.35)',color:'#c7cae0',fontSize:'12px',fontWeight:'600'}}>Отменить</div>
  <div onClick={v.cfgSaving ? undefined : v.saveConfig} className="iziA98" style={{cursor:'pointer',padding:'9px 16px',borderRadius:'10px',background:'linear-gradient(100deg,#00f0ff,#7b2fff)',color:'#050510',fontSize:'12px',fontWeight:'700',opacity:v.cfgSaving?0.6:1}}>{v.cfgSaving?'Сохранение…':'Сохранить'}</div>
</div>
</>)}

{/* ADMIN NAV */}
<div style={{flex:'none',display:'flex',borderTop:'1px solid rgba(255,0,170,.12)',background:'rgba(10,10,20,.85)',backdropFilter:'blur(14px)',padding:'8px 0 calc(env(safe-area-inset-bottom,0px) + 8px)'}}>
  <div onClick={v.aDash} style={{flex:'1',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',paddingTop:'4px'}}>
    <div style={{width:'22px',height:'3px',borderRadius:'2px',background:v.iDashBar,marginBottom:'2px'}}></div>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={v.cDash} strokeWidth="1.9"><rect x="3" y="3" width="8" height="8" rx="1.5"></rect><rect x="13" y="3" width="8" height="8" rx="1.5"></rect><rect x="3" y="13" width="8" height="8" rx="1.5"></rect><rect x="13" y="13" width="8" height="8" rx="1.5"></rect></svg>
    <span style={{fontSize:'10px',fontWeight:'600',color:v.cDash}}>Дашборд</span>
  </div>
  <div onClick={v.aOrd} style={{flex:'1',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',paddingTop:'4px'}}>
    <div style={{width:'22px',height:'3px',borderRadius:'2px',background:v.iAOrdBar,marginBottom:'2px'}}></div>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={v.cAOrd} strokeWidth="1.9" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="14" y2="18"></line></svg>
    <span style={{fontSize:'10px',fontWeight:'600',color:v.cAOrd}}>Заказы</span>
  </div>
  <div onClick={v.aProd} style={{flex:'1',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',paddingTop:'4px'}}>
    <div style={{width:'22px',height:'3px',borderRadius:'2px',background:v.iProdBar,marginBottom:'2px'}}></div>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={v.cProd} strokeWidth="1.9"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3.4"></circle></svg>
    <span style={{fontSize:'10px',fontWeight:'600',color:v.cProd}}>Тарифы</span>
  </div>
  <div onClick={v.aPromo} style={{flex:'1',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',paddingTop:'4px'}}>
    <div style={{width:'22px',height:'3px',borderRadius:'2px',background:v.iPromoBar,marginBottom:'2px'}}></div>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={v.cPromo} strokeWidth="1.9" strokeLinecap="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="7" cy="7" r="2.6"></circle><circle cx="17" cy="17" r="2.6"></circle></svg>
    <span style={{fontSize:'10px',fontWeight:'600',color:v.cPromo}}>Промо</span>
  </div>
  <div onClick={v.aBcast} style={{flex:'1',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',paddingTop:'4px'}}>
    <div style={{width:'22px',height:'3px',borderRadius:'2px',background:v.iBcastBar,marginBottom:'2px'}}></div>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={v.cBcast} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
    <span style={{fontSize:'10px',fontWeight:'600',color:v.cBcast}}>Рассылка</span>
  </div>
</div>

</>)}

</div>
    </>
  );
}
