// 시뮬레이션 경로 모델 (App.tsx에서 이식, 로직 무변경)
export const buildSegs = (sim: any) => {
  const P = (sim.moves || []).map((m: any) => ({ y: m.x / 2, z: m.z, dwell: m.dwell || 0, rapid: !!m.rapid, line: m.line ?? -1 }));
  const segs: any[] = []; let total = 0;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i];
    const dist = Math.hypot(b.y - a.y, b.z - a.z);
    let dur = dist / (b.rapid ? 300 : 6);
    dur = Math.min(Math.max(dur, 0.03), 4);
    segs.push({ a, b, dur, dwell: false, rapid: b.rapid, line: b.line }); total += dur;
    if (b.dwell > 0) { const dd = Math.min(b.dwell, 2.5); segs.push({ a: b, b, dur: dd, dwell: true, rapid: false, line: b.line }); total += dd; }
  }
  if (total <= 0) total = 1;
  const segEnds: number[] = []; let c = 0; for (const s of segs) { c += s.dur; segEnds.push(c); }
  return { P, segs, total, segEnds };
};
export const posOnSegs = (segs: any[], P: any[], tt: number) => {
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (tt <= acc + s.dur || i === segs.length - 1) {
      const f = s.dur > 0 ? Math.min((tt - acc) / s.dur, 1) : 1;
      return { y: s.a.y + (s.b.y - s.a.y) * f, z: s.a.z + (s.b.z - s.a.z) * f };
    }
    acc += s.dur;
  }
  const last = P[P.length - 1] || { y: 0, z: 0 }; return { y: last.y, z: last.z };
};
