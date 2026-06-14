import { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Activity, ChevronUp, ChevronDown } from 'lucide-react';
import { buildSegs, posOnSegs } from '../nc/simModel';

export const NcSimulator = ({ sim, code, onClose }: { sim: any; code: string; onClose: () => void }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const wheelRef = useRef<any>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const view2d = useRef<any>({ zoom: 1, panx: 0, pany: 0, drag: false, lx: 0, ly: 0 });
  const ctrl = useRef<any>({ playing: true, t: 0, speed: 1, lastSet: -1, lastLine: -2 });
  const model = useMemo(() => buildSegs(sim), [sim]);
  const total = model.total;
  const ncLines = useMemo(() => (code || '').split('\n'), [code]);

  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showWheel, setShowWheel] = useState(true);
  const [aspectLock, setAspectLock] = useState(false);
  const [activeLine, setActiveLine] = useState(-1);
  const [showWidth, setShowWidth] = useState(true); // 폭 상황 표기 on/off

  // 폭 상황 계산 (휠폭 vs 가공폭)
  const wheelW = Number(sim?.wheelWReal) || Number(sim?.wheelW) || 0;
  const grindW = Number(sim?.grindWidth) || 0;
  const wheelOd = Number(sim?.wheelOd) || 0;
  const bodyDir = Number(sim?.bodyDir) || 1; // 휠 몸체가 뻗는 Z 방향(가공 진행 방향), 선단=제어점
  const offset = sim?.offset || 'x_plus';   // x_plus=외경접촉, x_minus=내경접촉, center=툴중심
  const offsetLabel = offset === 'x_minus' ? '내경접촉(X-)' : offset === 'center' ? '센터' : '외경접촉(X+)';
  const bAngleSim = Number(sim?.bAngle) || 0; // B축 각도(deg): 0=하향(지면), -90=소재방향, +90=서브스핀들
  const bFace = Math.abs(bAngleSim + 90) < 1 ? '소재방향' : Math.abs(bAngleSim) < 1 ? '지면(하향)' : Math.abs(bAngleSim - 90) < 1 ? '서브스핀들' : `${bAngleSim}°`;
  const widthCover = grindW > 0 ? (wheelW / grindW) * 100 : 0;
  const widthRemain = grindW - wheelW;                       // +면 휠이 좁음(분할/트래버스 필요)
  const widthPasses = wheelW > 0 ? Math.ceil(grindW / wheelW) : 0;

  const segIndexAt = (t: number) => { const se = model.segEnds; for (let i = 0; i < se.length; i++) { if (t <= se[i] + 1e-9) return i; } return se.length - 1; };

  // 타임라인(항상 동작): 시간 진행 + 진행률
  useEffect(() => {
    let raf = 0; let last = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now(); const dt = Math.min((now - last) / 1000, 0.1); last = now;
      if (ctrl.current.playing) {
        ctrl.current.t += dt * ctrl.current.speed;
        if (ctrl.current.t >= total) { ctrl.current.t = total; ctrl.current.playing = false; setPlaying(false); }
      }
      const pr = ctrl.current.t / total;
      if (Math.abs(pr - ctrl.current.lastSet) > 0.004) { ctrl.current.lastSet = pr; setProgress(pr); }
      const ln = model.segs[segIndexAt(ctrl.current.t)]?.line ?? -1;
      if (ln !== ctrl.current.lastLine) { ctrl.current.lastLine = ln; setActiveLine(ln); }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [total, model]);

  // 블록 단위 스텝 (키보드 ↑↓ / 버튼)
  const stepBlock = (dir: number) => {
    let idx = segIndexAt(ctrl.current.t);
    idx = Math.min(Math.max(idx + dir, 0), model.segs.length - 1);
    ctrl.current.t = Math.min(model.segEnds[idx], total);
    ctrl.current.playing = false; setPlaying(false);
    setProgress(ctrl.current.t / total);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); stepBlock(1); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); stepBlock(-1); }
      else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total, model]);

  // 활성 라인 자동 스크롤
  useEffect(() => { activeLineRef.current?.scrollIntoView({ block: 'nearest' }); }, [activeLine]);

  // ---------- 3D ----------
  useEffect(() => {
    if (mode !== '3d') return;
    const mount = mountRef.current;
    if (!mount || !sim) return;
    let W = mount.clientWidth || 800, H = mount.clientHeight || 480;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 50000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio); renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(1, 2, 2); scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xffffff, 0.35); dl2.position.set(-1, -1, -1); scene.add(dl2);

    const d1 = sim.d1, d2 = sim.d2, wOd = sim.wheelOd, wW = sim.wheelW;
    const r1 = d1 / 2, r2 = d2 / 2, wR = wOd / 2;
    const zMin = sim.zMin, zMax = sim.zMax, zc = (zMin + zMax) / 2;
    const workLen = Math.max(zMax - zMin, 1) + Math.max(wW, 4) + 8;

    const root = new THREE.Group(); root.position.z = -zc; scene.add(root);
    const stock = new THREE.Mesh(new THREE.CylinderGeometry(r1, r1, workLen, 48), new THREE.MeshPhongMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.22 }));
    stock.rotation.x = Math.PI / 2; stock.position.z = zc; root.add(stock);
    const fin = new THREE.Mesh(new THREE.CylinderGeometry(r2, r2, workLen + 0.2, 48), new THREE.MeshPhongMaterial({ color: 0x3b82f6 }));
    fin.rotation.x = Math.PI / 2; fin.position.z = zc; root.add(fin);
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, zc - workLen / 2), new THREE.Vector3(0, 0, zc + workLen / 2)]), new THREE.LineBasicMaterial({ color: 0x475569 })));
    const bRad = (Number(sim.bAngle) || 0) * Math.PI / 180; // B=0 하향, -90 소재방향(-Z), +90 서브(+Z)
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wR, wR, Math.max(wW, 2), 56), new THREE.MeshPhongMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 }));
    wheel.rotation.x = Math.PI - bRad; // 휠 축 = toolAxis(B): B0→하향, B±90→±Z
    wheel.visible = showWheel; root.add(wheel); wheelRef.current = wheel;
    const traceGeo = new THREE.BufferGeometry();
    root.add(new THREE.Line(traceGeo, new THREE.LineBasicMaterial({ color: 0xef4444 })));

    const { P, segs } = model;
    const S = Math.max(workLen, d1 * 1.5); // 소재 기준 프레이밍(휠 크기 무시)
    camera.position.set(S * 0.6, S * 0.5, S * 0.95);
    controls.target.set(0, 0, 0); controls.update();

    const updateTrace = (tt: number) => {
      const pts: THREE.Vector3[] = []; let acc = 0;
      for (const s of segs) {
        if (!s.dwell) {
          pts.push(new THREE.Vector3(0, s.a.y, s.a.z));
          if (tt < acc + s.dur) { const f = s.dur > 0 ? (tt - acc) / s.dur : 1; pts.push(new THREE.Vector3(0, s.a.y + (s.b.y - s.a.y) * f, s.a.z + (s.b.z - s.a.z) * f)); break; }
          pts.push(new THREE.Vector3(0, s.b.y, s.b.z));
        }
        acc += s.dur; if (tt < acc) break;
      }
      traceGeo.setFromPoints(pts);
    };

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const p = posOnSegs(segs, P, ctrl.current.t);
      // 옵셋 기준: x_plus=휠 하단이 접촉(중심=+wR), x_minus=휠 상단 접촉(중심=-wR), center=툴 중심
      const wOff = offset === 'x_minus' ? -wR : offset === 'center' ? 0 : wR;
      // 선단(p.z)=첫 접촉면(이송방향 앞단). 휠 몸체는 선단 뒤(이송 반대)로 폭만큼 → 중심 z = 선단 − bodyDir*폭/2
      const bDir = Number(sim.bodyDir) || 1;
      wheel.position.set(0, p.y + wOff, p.z - bDir * wW / 2);
      updateTrace(ctrl.current.t);
      controls.update(); renderer.render(scene, camera);
    };
    loop();
    const onResize = () => { W = mount.clientWidth; H = mount.clientHeight; if (!W || !H) return; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); };
    const ro = new ResizeObserver(onResize); ro.observe(mount);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); wheelRef.current = null; };
  }, [sim, mode, model, showWheel]);

  // ---------- 2D (CIMCO 스타일 백플롯) ----------
  useEffect(() => {
    if (mode !== '2d') return;
    const canvas = canvas2dRef.current; const wrap = canvas?.parentElement;
    if (!canvas || !wrap || !sim) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const { P, segs } = model;
    const d1 = sim.d1, d2 = sim.d2;

    let zMinB = Infinity, zMaxB = -Infinity, rMinB = Infinity, rMaxB = -Infinity;
    P.forEach((p: any) => { zMinB = Math.min(zMinB, p.z); zMaxB = Math.max(zMaxB, p.z); rMinB = Math.min(rMinB, p.y); rMaxB = Math.max(rMaxB, p.y); });
    rMinB = Math.min(rMinB, d2 / 2); rMaxB = Math.max(rMaxB, d1 / 2);
    const zSpan = Math.max(zMaxB - zMinB, 1), rSpan = Math.max(rMaxB - rMinB, 0.05);
    const cx = (zMinB + zMaxB) / 2, cy = (rMinB + rMaxB) / 2;

    let DW = 0, DH = 0;
    const resize = () => { DW = wrap.clientWidth; DH = wrap.clientHeight; const dpr = window.devicePixelRatio || 1; canvas.width = DW * dpr; canvas.height = DH * dpr; canvas.style.width = DW + 'px'; canvas.style.height = DH + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();

    const w2s = (z: number, r: number) => {
      let sx = (DW * 0.82) / zSpan, sy = (DH * 0.82) / rSpan;
      if (aspectLock) { const s = Math.min(sx, sy); sx = s; sy = s; }
      sx *= view2d.current.zoom; sy *= view2d.current.zoom;
      return [DW / 2 + (z - cx) * sx + view2d.current.panx, DH / 2 - (r - cy) * sy + view2d.current.pany];
    };
    const drawLine = (z1: number, r1v: number, z2: number, r2v: number, color: string, dash: number[], wd: number) => {
      const [x1, y1] = w2s(z1, r1v), [x2, y2] = w2s(z2, r2v);
      ctx.strokeStyle = color; ctx.lineWidth = wd; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
    };

    const draw = () => {
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, DW, DH);
      drawLine(zMinB, d1 / 2, zMaxB, d1 / 2, '#475569', [4, 4], 1);      // 소재경 d1
      drawLine(zMinB, d2 / 2, zMaxB, d2 / 2, '#1d4ed8', [6, 3], 1.4);    // 완성경 d2
      const tt = ctrl.current.t; let acc = 0;
      for (const s of segs) {
        if (!s.dwell) {
          const full = tt >= acc + s.dur;
          const f = full ? 1 : (s.dur > 0 ? Math.max((tt - acc) / s.dur, 0) : 1);
          if (f > 0) {
            const ez = s.a.z + (s.b.z - s.a.z) * f, ey = s.a.y + (s.b.y - s.a.y) * f;
            drawLine(s.a.z, s.a.y, ez, ey, s.rapid ? '#f87171' : '#34d399', s.rapid ? [5, 4] : [], s.rapid ? 1 : 2.2);
          }
        }
        acc += s.dur; if (tt < acc) break;
      }
      const p = posOnSegs(segs, P, tt);
      const [mx, my] = w2s(p.z, p.y);
      // 휠 단면(폭×직경) - 폭 제어점=선단(p.z, 첫 접촉/이송앞단), 몸체는 선단 뒤(이송 반대)로 폭만큼
      if (showWidth && wheelW > 0) {
        const [bx1] = w2s(p.z, p.y);                       // 선단(제어점)=첫 접촉면(이송 앞단)
        const [bx2] = w2s(p.z - bodyDir * wheelW, p.y);    // 휠 몸체는 선단 뒤(이송 반대)로 폭만큼
        // 반경 방향 범위 (옵셋에 따라)
        let rTop: number, rBot: number;
        if (offset === 'x_minus') { rTop = p.y; rBot = p.y - wheelOd; }            // 휠 상단이 접촉
        else if (offset === 'center') { rTop = p.y + wheelOd / 2; rBot = p.y - wheelOd / 2; } // 툴 중심
        else { rTop = p.y + wheelOd; rBot = p.y; }                                  // x_plus: 휠 하단이 접촉
        const [, syTop] = w2s(p.z, rTop);
        const [, syBot] = w2s(p.z, rBot);
        const xL = Math.min(bx1, bx2), wPx = Math.abs(bx2 - bx1);
        const yT = Math.min(syTop, syBot), hPx = Math.abs(syBot - syTop);
        ctx.fillStyle = 'rgba(245,158,11,0.13)';
        ctx.fillRect(xL, yT, wPx, hPx);
        ctx.strokeStyle = 'rgba(245,158,11,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
        ctx.strokeRect(xL, yT, wPx, hPx);
        // 선단(폭 제어점)=p.z 강조: 세로선
        ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bx1, yT); ctx.lineTo(bx1, yT + hPx); ctx.stroke();
        // 접촉점 (선단 X=p.y, Z=p.z) = 첫 접촉부
        const [, syC] = w2s(p.z, p.y);
        ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(bx1, syC, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#22d3ee'; ctx.font = '10px monospace'; ctx.fillText('선단(제어점)', bx1 + 5, syC + 14);
        ctx.fillStyle = '#f59e0b'; ctx.fillText(`휠 Ø${wheelOd}×${wheelW} ${offsetLabel}`, xL + 4, Math.min(Math.max(syC, 16), DH - 6) - 6);
      }
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(mx, my, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px monospace';
      ctx.fillText(`Z span ${zSpan.toFixed(1)}mm`, 10, DH - 10);
      ctx.fillText(`R span ${rSpan.toFixed(2)}mm  ${aspectLock ? '[1:1]' : '[자동맞춤·비율가변]'}`, 10, 18);
      ctx.fillStyle = '#fde047'; ctx.fillText(`현재  X(dia) ${(p.y * 2).toFixed(3)}   Z ${p.z.toFixed(3)}`, 10, 34);
    };

    let raf = 0;
    const loop = () => { raf = requestAnimationFrame(loop); draw(); };
    loop();

    const onWheel = (e: WheelEvent) => { e.preventDefault(); const f = e.deltaY < 0 ? 1.1 : 0.9; view2d.current.zoom = Math.min(Math.max(view2d.current.zoom * f, 0.1), 80); };
    const onDown = (e: MouseEvent) => { view2d.current.drag = true; view2d.current.lx = e.clientX; view2d.current.ly = e.clientY; };
    const onMove = (e: MouseEvent) => { if (!view2d.current.drag) return; view2d.current.panx += e.clientX - view2d.current.lx; view2d.current.pany += e.clientY - view2d.current.ly; view2d.current.lx = e.clientX; view2d.current.ly = e.clientY; };
    const onUp = () => { view2d.current.drag = false; };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onDown); window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    const ro = new ResizeObserver(resize); ro.observe(wrap);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener('wheel', onWheel); canvas.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [sim, mode, model, aspectLock, showWidth, wheelW]);

  const togglePlay = () => { if (!ctrl.current.playing && ctrl.current.t >= total) ctrl.current.t = 0; ctrl.current.playing = !ctrl.current.playing; setPlaying(ctrl.current.playing); };
  const restart = () => { ctrl.current.t = 0; ctrl.current.playing = true; setPlaying(true); };
  const scrub = (v: number) => { ctrl.current.t = (v / 1000) * total; ctrl.current.playing = false; setPlaying(false); setProgress(v / 1000); };
  const changeSpeed = (s: number) => { ctrl.current.speed = s; setSpeed(s); };
  const resetView = () => { view2d.current.zoom = 1; view2d.current.panx = 0; view2d.current.pany = 0; };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-slate-900/95 backdrop-blur-sm">
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-700 text-slate-100">
        <div className="font-black tracking-tight flex items-center gap-3">
          <span className="flex items-center"><Activity size={18} className="mr-2 text-amber-400" /> 공구경로 시뮬레이션</span>
          <div className="flex bg-slate-800 rounded-lg overflow-hidden border border-slate-700 text-xs font-bold">
            <button onClick={() => setMode('2d')} className={`px-3 py-1.5 ${mode === '2d' ? 'bg-amber-500 text-slate-900' : 'text-slate-300'}`}>2D</button>
            <button onClick={() => setMode('3d')} className={`px-3 py-1.5 ${mode === '3d' ? 'bg-amber-500 text-slate-900' : 'text-slate-300'}`}>3D</button>
          </div>
        </div>
        <button onClick={onClose} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold">닫기</button>
      </header>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-h-0 relative">
          <div ref={mountRef} className={`absolute inset-0 ${mode === '3d' ? '' : 'hidden'}`} />
          <div className={`absolute inset-0 ${mode === '2d' ? '' : 'hidden'}`}>
            <canvas ref={canvas2dRef} className="w-full h-full block cursor-move" />
          </div>
          {/* 폭 상황 표기 (필터로 on/off) */}
          {showWidth && (
            <div className="absolute top-3 left-3 bg-slate-900/85 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-slate-200 leading-relaxed pointer-events-none">
              <div className="font-black text-amber-300 mb-1">휠/폭 상황</div>
              <div>휠 Ø: <span className="font-mono text-amber-200">{wheelOd || '-'}</span> × 폭 <span className="font-mono text-amber-200">{wheelW || '-'}</span> mm</div>
              <div>옵셋 기준: <span className="font-mono text-amber-200">{offsetLabel}</span></div>
              <div>B축: <span className="font-mono text-amber-200">{bAngleSim}°</span> → <span className="text-emerald-300">{bFace}</span></div>
              <div>폭 제어점: <span className="font-mono text-cyan-300">선단(첫 접촉)</span></div>
              <div>가공 폭: <span className="font-mono text-blue-200">{grindW || '-'}</span> mm</div>
              <div>커버율: <span className="font-mono">{grindW > 0 ? widthCover.toFixed(0) : '-'}</span> %</div>
              {widthRemain > 0.001 ? (
                <div className="text-rose-300">남은 폭: <span className="font-mono">{widthRemain.toFixed(2)}</span> mm (휠보다 넓음 → {widthPasses}분할/트래버스 필요)</div>
              ) : (
                <div className="text-emerald-300">휠이 가공폭 이상 (오버행 {Math.abs(widthRemain).toFixed(2)}mm, 1패스 커버)</div>
              )}
            </div>
          )}
        </div>
        <div className="w-72 shrink-0 border-l border-slate-700 bg-slate-950/60 overflow-auto font-mono text-[11px] leading-relaxed py-2">
          {ncLines.map((ln, i) => (
            <div key={i} ref={i === activeLine ? activeLineRef : null}
              className={`px-3 whitespace-pre ${i === activeLine ? 'bg-amber-500/30 text-amber-200 font-bold' : ln.includes('확인필요') ? 'text-amber-400/70' : ln.startsWith('(') ? 'text-slate-500' : 'text-slate-300'}`}>
              <span className="inline-block w-7 text-slate-600 select-none">{i + 1}</span>{ln || ' '}
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 py-3 border-t border-slate-700 flex items-center gap-3 text-slate-100 flex-wrap">
        <button onClick={togglePlay} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-black text-sm w-20">{playing ? '일시정지' : '재생'}</button>
        <button onClick={restart} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm">처음</button>
        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700">
          <button onClick={() => stepBlock(-1)} className="px-2 py-2 hover:bg-slate-700 rounded-l-lg" title="이전 블록 (↑)"><ChevronUp size={16} /></button>
          <button onClick={() => stepBlock(1)} className="px-2 py-2 hover:bg-slate-700 rounded-r-lg border-l border-slate-700" title="다음 블록 (↓)"><ChevronDown size={16} /></button>
        </div>
        <input type="range" min={0} max={1000} value={Math.round(progress * 1000)} onChange={(e) => scrub(parseInt(e.target.value))} className="flex-1 min-w-[120px] accent-amber-400" />
        <span className="font-mono text-xs w-12 text-right">{Math.round(progress * 100)}%</span>
        <select value={speed} onChange={(e) => changeSpeed(parseFloat(e.target.value))} className="bg-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold">
          <option value={0.5}>0.5x</option><option value={1}>1x</option><option value={2}>2x</option><option value={4}>4x</option>
        </select>
        {mode === '2d' ? (
          <>
            <button onClick={resetView} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm">뷰 리셋</button>
            <label className="flex items-center gap-1.5 text-xs font-bold"><input type="checkbox" checked={aspectLock} onChange={(e) => setAspectLock(e.target.checked)} /> 1:1 비율</label>
          </>
        ) : (
          <label className="flex items-center gap-1.5 text-xs font-bold"><input type="checkbox" checked={showWheel} onChange={(e) => setShowWheel(e.target.checked)} /> 휠 표시</label>
        )}
        <label className="flex items-center gap-1.5 text-xs font-bold"><input type="checkbox" checked={showWidth} onChange={(e) => setShowWidth(e.target.checked)} /> 폭 표시</label>
      </div>
      <div className="px-6 pb-3 text-[11px] text-slate-400">
        {mode === '2d'
          ? 'CIMCO 스타일 백플롯 · 자동맞춤으로 미세 절입도 크게 표시 · 드래그=이동, 휠=줌 · 초록=가공이송, 빨강점선=급속, 파랑=완성경'
          : '좌드래그=회전 · 휠=줌 · 우드래그=이동 · 소재기준 프레이밍 · 휠이 크면 「휠 표시」 해제'}
        &nbsp;|&nbsp; <span className="text-amber-300">↑↓(또는 ▲▼ 버튼)=NC 블록 스텝</span> · 우측 코드가 실시간 하이라이트 · Space=재생/정지
      </div>
    </div>
  );
};
