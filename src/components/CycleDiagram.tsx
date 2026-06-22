// OD 사이클 치수 다이어그램 (App.tsx에서 이식)
export const CycleDiagram = ({ menu, tab, field, zs = 100, ze = 75, d1v = 0, d2v = 0 }: { menu: string; tab: string; field: string; zs?: number; ze?: number; d1v?: number; d2v?: number }) => {
  const on = (id: string) => field === id;
  const sc = (id: string) => (on(id) ? '#f59e0b' : '#94a3b8');
  const sw2 = (id: string) => (on(id) ? 3 : 1.4);
  const tc = (id: string) => (on(id) ? '#b45309' : '#64748b');
  const tw = (id: string) => (on(id) ? 800 : 600);
  const isInternal = menu === 'id_plunge' || menu === 'id_traverse';
  const isFace = menu === 'face_plunge' || menu === 'face_traverse';
  const isTrav = menu === 'od_traverse' || menu === 'id_traverse' || menu === 'face_traverse';
  const axisY = 196, topStock = 86, topFin = 116, zR = 392;
  // 척=좌측(−Z, 단면), 자유단=우측(+Z). z값이 작을수록 좌측(척에 가까움)
  const bandL = isTrav ? 168 : 196, bandR = isTrav ? 330 : 300;
  const cBand = (bandL + bandR) / 2;
  const startIsLeft = zs <= ze;
  const xStart = startIsLeft ? bandL : bandR;
  const xEnd = startIsLeft ? bandR : bandL;
  const ovSX = xStart + (xStart < cBand ? -42 : 42);
  const ovEX = xEnd + (xEnd < cBand ? -42 : 42);
  const wheelCx = cBand, wheelCy = 48, wheelR = 38;
  const showGeo = tab === 'geometry';
  const showCut = tab === 'cutting';
  const stockL = 104; // 척 오른쪽 끝

  // ===== 단면(FACE) 사이클 전용 도식: 끝면 + Z절입 휠 =====
  if (isFace) {
    const bodyTop = 74;                 // 외경(d_outer) 반경
    const innerY = d2v > 0 && d1v > 0 ? axisY - (axisY - bodyTop) * (d2v / d1v) : axisY; // 내경(d_inner) 반경
    const faceStart = 300, faceFin = 268; // 시작 단면 Z(우) / 목표 단면 Z(좌=깎인면)
    const wCx = 360, wCy = (bodyTop + innerY) / 2, wR = 30;
    return (
      <svg viewBox="0 0 470 250" className="w-full max-w-lg drop-shadow-sm">
        {/* 좌측 척 */}
        <g>
          <rect x={48} y={bodyTop - 10} width={56} height={(axisY + 10) - (bodyTop - 10)} fill="#cbd5e1" stroke="#64748b" strokeWidth={1.5} />
          {[0, 1, 2, 3, 4, 5].map(i => (<line key={i} x1={50} y1={bodyTop - 6 + i * 22} x2={102} y2={bodyTop - 16 + i * 22} stroke="#94a3b8" strokeWidth={1} />))}
          <text x={76} y={axisY + 26} fill="#475569" fontSize="9" fontWeight={700} textAnchor="middle">좌측 스핀들/척</text>
        </g>
        {/* 중심선 */}
        <line x1={104} y1={axisY} x2={440} y2={axisY} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="7 4" />
        <text x={444} y={axisY + 4} fill="#cbd5e1" fontSize="10">CL</text>
        {/* 소재 본체(완성 단면까지) */}
        <rect x={stockL} y={bodyTop} width={faceFin - stockL} height={axisY - bodyTop} fill="#eef2f7" stroke="#94a3b8" strokeWidth={1.2} />
        {/* 제거 슬래브(목표~시작 단면, 반경밴드 d_inner~d_outer) */}
        <rect x={faceFin} y={bodyTop} width={faceStart - faceFin} height={innerY - bodyTop} fill="#dbeafe" stroke={on('zf_target') || on('zf_start') ? '#f59e0b' : '#3b82f6'} strokeWidth={1.6} />
        {/* 보어(내경) 빈공간 표시 */}
        {d2v > 0 && <rect x={stockL} y={innerY} width={faceStart - stockL} height={axisY - innerY} fill="#ffffff" stroke={sc('d_inner')} strokeWidth={sw2('d_inner')} />}
        {/* 휠 (단면을 Z로 절입) */}
        <circle cx={wCx} cy={wCy} r={wR} fill="#fb923c" fillOpacity={0.14} stroke={on('wheel_vc') ? '#f59e0b' : '#fb923c'} strokeWidth={on('wheel_vc') ? 3 : 1.6} />
        <text x={wCx} y={wCy + 4} fill="#ea580c" fontSize="10" fontWeight={700} textAnchor="middle">휠</text>

        {/* 좌표축 */}
        <g>
          <line x1={410} y1={244} x2={410} y2={216} stroke="#0ea5e9" strokeWidth={1.6} />
          <path d="M406,221 L410,214 L414,221" fill="none" stroke="#0ea5e9" strokeWidth={1.6} />
          <text x={410} y={210} fill="#0ea5e9" fontSize="10" fontWeight={700} textAnchor="middle">+X</text>
          <line x1={410} y1={244} x2={438} y2={244} stroke="#10b981" strokeWidth={1.6} />
          <path d="M433,240 L440,244 L433,248" fill="none" stroke="#10b981" strokeWidth={1.6} />
          <text x={444} y={247} fill="#10b981" fontSize="10" fontWeight={700}>+Z</text>
        </g>
        <text x={(stockL + faceStart) / 2} y={bodyTop - 6} fill="#94a3b8" fontSize="8" textAnchor="middle">단면(FACE) 연삭 · 휠이 Z로 절입, 반경(X) 범위 가공</text>

        {showGeo && (
          <g>
            {/* d_outer */}
            <line x1={stockL + 8} y1={bodyTop} x2={faceStart} y2={bodyTop} stroke={sc('d_outer')} strokeWidth={sw2('d_outer')} strokeDasharray="3 3" />
            <text x={stockL + 12} y={bodyTop - 4} fill={tc('d_outer')} fontSize="10" fontWeight={tw('d_outer')}>외경 d{d1v ? ` Ø${d1v}` : ''}</text>
            {/* d_inner */}
            <line x1={stockL + 8} y1={innerY} x2={faceStart} y2={innerY} stroke={sc('d_inner')} strokeWidth={sw2('d_inner')} strokeDasharray="3 3" />
            <text x={stockL + 12} y={innerY - 3} fill={tc('d_inner')} fontSize="10" fontWeight={tw('d_inner')}>내경 d{d2v ? ` Ø${d2v}` : ' Ø0'}</text>
            {/* zf_start / zf_target */}
            <line x1={faceStart} y1={bodyTop - 22} x2={faceStart} y2={axisY} stroke={sc('zf_start')} strokeWidth={sw2('zf_start')} strokeDasharray="4 3" />
            <text x={faceStart} y={bodyTop - 26} fill={tc('zf_start')} fontSize="10" fontWeight={tw('zf_start')} textAnchor="middle">Z시작{` ${zs}`}</text>
            <line x1={faceFin} y1={bodyTop - 8} x2={faceFin} y2={axisY} stroke={sc('zf_target')} strokeWidth={sw2('zf_target')} strokeDasharray="4 3" />
            <text x={faceFin - 2} y={bodyTop - 12} fill={tc('zf_target')} fontSize="10" fontWeight={tw('zf_target')} textAnchor="end">Z목표{` ${ze}`}</text>
            {/* 제거량(Z) 화살표 */}
            <line x1={faceFin} y1={innerY + 12} x2={faceStart} y2={innerY + 12} stroke={sc('zf_target')} strokeWidth={1.4} />
            <text x={(faceFin + faceStart) / 2} y={innerY + 24} fill="#64748b" fontSize="8" textAnchor="middle">제거량(Z)</text>
            {!isTrav && (
              <line x1={faceStart} y1={wCy} x2={wCx - wR} y2={wCy} stroke={sc('clearance')} strokeWidth={sw2('clearance')} />
            )}
            {!isTrav && <text x={(faceStart + wCx - wR) / 2} y={wCy - 4} fill={tc('clearance')} fontSize="9" fontWeight={tw('clearance')} textAnchor="middle">안전</text>}
            {isTrav && (
              <g>
                {/* 반경 오버런(외경/내경측) */}
                <line x1={faceFin - 6} y1={bodyTop} x2={faceFin - 6} y2={bodyTop - 16} stroke={sc('over_outer')} strokeWidth={sw2('over_outer')} />
                <text x={faceFin - 9} y={bodyTop - 18} fill={tc('over_outer')} fontSize="8" fontWeight={tw('over_outer')} textAnchor="end">오버런O</text>
                <line x1={faceFin - 6} y1={innerY} x2={faceFin - 6} y2={innerY + 16} stroke={sc('over_inner')} strokeWidth={sw2('over_inner')} />
                <text x={faceFin - 9} y={innerY + 22} fill={tc('over_inner')} fontSize="8" fontWeight={tw('over_inner')} textAnchor="end">오버런I</text>
                {/* Z 절입(외경/내경단) 화살표 (좌=−Z 절입) */}
                <line x1={faceStart} y1={bodyTop + 6} x2={faceStart - 14} y2={bodyTop + 6} stroke={sc('infeed_o')} strokeWidth={sw2('infeed_o')} />
                <text x={faceStart - 16} y={bodyTop + 9} fill={tc('infeed_o')} fontSize="8" fontWeight={tw('infeed_o')} textAnchor="end">절입O</text>
                <line x1={faceStart} y1={innerY - 6} x2={faceStart - 14} y2={innerY - 6} stroke={sc('infeed_i')} strokeWidth={sw2('infeed_i')} />
                <text x={faceStart - 16} y={innerY - 3} fill={tc('infeed_i')} fontSize="8" fontWeight={tw('infeed_i')} textAnchor="end">절입I</text>
                {/* 번개 각도 */}
                <line x1={faceFin} y1={bodyTop} x2={faceStart} y2={innerY} stroke={sc('zigzag_angle')} strokeWidth={sw2('zigzag_angle')} strokeDasharray="3 3" />
                <text x={(faceFin + faceStart) / 2 + 6} y={(bodyTop + innerY) / 2} fill={tc('zigzag_angle')} fontSize="9" fontWeight={tw('zigzag_angle')}>각도θ</text>
              </g>
            )}
          </g>
        )}
        {showCut && (
          <g>
            <path d={`M ${stockL + 24},${axisY - 16} A 24 24 0 1 1 ${stockL + 25},${axisY - 16}`} fill="none" stroke={sc('work_rpm')} strokeWidth={sw2('work_rpm')} />
            <text x={stockL + 24} y={axisY - 44} fill={tc('work_rpm')} fontSize="10" fontWeight={tw('work_rpm')} textAnchor="middle">워크회전(rpm)</text>
            <path d={`M ${wCx - 14},${wCy} A 14 14 0 1 1 ${wCx - 13},${wCy}`} fill="none" stroke={on('wheel_vc') ? '#f59e0b' : '#fb923c'} strokeWidth={on('wheel_vc') ? 3 : 1.6} />
            {[
              { id: 'rough_offset', fr: 'rough_fr', y: bodyTop + 2, lbl: '황삭' },
              { id: 'finish_fr', fr: 'finish_fr', y: bodyTop + 28, lbl: '정삭' },
            ].map((b, i) => {
              const act = on(b.id) || on(b.fr);
              return (
                <g key={i}>
                  <rect x={392} y={b.y} width={54} height={18} fill={act ? '#fde68a' : '#f1f5f9'} stroke={act ? '#f59e0b' : '#cbd5e1'} strokeWidth={act ? 2.5 : 1} />
                  <text x={419} y={b.y + 13} fill={act ? '#b45309' : '#64748b'} fontSize="10" fontWeight={act ? 800 : 600} textAnchor="middle">{b.lbl}</text>
                </g>
              );
            })}
            {(() => {
              const act = on('spark_out') || on('spark_osc_n') || on('spark_osc_feed');
              return (
                <g>
                  <rect x={392} y={bodyTop + 54} width={54} height={18} fill={act ? '#fde68a' : '#f1f5f9'} stroke={act ? '#f59e0b' : '#cbd5e1'} strokeWidth={act ? 2.5 : 1} />
                  <text x={419} y={bodyTop + 67} fill={act ? '#b45309' : '#64748b'} fontSize="10" fontWeight={act ? 800 : 600} textAnchor="middle">스파크</text>
                </g>
              );
            })()}
            <text x={wCx} y={wCy + wR + 12} fill="#94a3b8" fontSize="9" textAnchor="middle">{isTrav ? '반경(X) 왕복 + Z절입' : 'Z 플런지 절입'}</text>
          </g>
        )}
      </svg>
    );
  }

  // ===== 내경(ID) 사이클 전용 도식: 보어 단면 + 보어 내부 휠 =====
  if (isInternal) {
    const bodyTop = 52;      // 부재 외형 상단
    const boreS = 172;       // 시작 보어 벽(d1, 작음 → CL에 가까움)
    const boreF = 150;       // 목표 보어 벽(d2, 큼 → 더 위)
    const wCx = cBand, wCy = 184, wR = 20; // 보어 안쪽 휠
    return (
      <svg viewBox="0 0 470 250" className="w-full max-w-lg drop-shadow-sm">
        {/* 좌측 스핀들/척 */}
        <g>
          <rect x={48} y={bodyTop - 10} width={56} height={(axisY + 10) - (bodyTop - 10)} fill="#cbd5e1" stroke="#64748b" strokeWidth={1.5} />
          {[0, 1, 2, 3, 4, 5].map(i => (<line key={i} x1={50} y1={bodyTop - 6 + i * 24} x2={102} y2={bodyTop - 16 + i * 24} stroke="#94a3b8" strokeWidth={1} />))}
          <text x={76} y={axisY + 26} fill="#475569" fontSize="9" fontWeight={700} textAnchor="middle">좌측 스핀들/척</text>
          <text x={76} y={axisY + 37} fill="#64748b" fontSize="8" textAnchor="middle">(단면 −Z)</text>
        </g>
        {/* 부재 벽(단면 상반부) */}
        <rect x={stockL} y={bodyTop} width={zR - stockL} height={axisY - bodyTop} fill="#eef2f7" stroke="#94a3b8" strokeWidth={1.2} />
        {/* 시작 보어(구멍) */}
        <rect x={stockL} y={boreS} width={zR - stockL} height={axisY - boreS} fill="#ffffff" stroke={sc('d1')} strokeWidth={sw2('d1')} />
        {/* 확대 가공 밴드 (d1 → d2) */}
        <rect x={bandL} y={boreF} width={bandR - bandL} height={boreS - boreF} fill="#dbeafe" stroke={on('d2') ? '#f59e0b' : '#3b82f6'} strokeWidth={on('d2') ? 3 : 1.6} />
        {/* 중심선 */}
        <line x1={104} y1={axisY} x2={430} y2={axisY} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="7 4" />
        <text x={434} y={axisY + 4} fill="#cbd5e1" fontSize="10">CL</text>
        {/* 보어 내부 휠 (보어 벽을 X+로 확대) */}
        <circle cx={wCx} cy={wCy} r={wR} fill="#fb923c" fillOpacity={0.16} stroke={on('wheel_vc') ? '#f59e0b' : '#fb923c'} strokeWidth={on('wheel_vc') ? 3 : 1.6} />
        <text x={wCx} y={wCy + 4} fill="#ea580c" fontSize="10" fontWeight={700} textAnchor="middle">휠</text>

        {/* 좌표축 (X 반경+ 위 / Z 우측 / Y 대각) */}
        <g>
          <line x1={398} y1={244} x2={398} y2={216} stroke="#0ea5e9" strokeWidth={1.6} />
          <path d="M394,221 L398,214 L402,221" fill="none" stroke="#0ea5e9" strokeWidth={1.6} />
          <text x={398} y={210} fill="#0ea5e9" fontSize="10" fontWeight={700} textAnchor="middle">+X</text>
          <line x1={398} y1={244} x2={426} y2={244} stroke="#10b981" strokeWidth={1.6} />
          <path d="M421,240 L428,244 L421,248" fill="none" stroke="#10b981" strokeWidth={1.6} />
          <text x={432} y={247} fill="#10b981" fontSize="10" fontWeight={700}>+Z</text>
          <line x1={398} y1={244} x2={414} y2={232} stroke="#a78bfa" strokeWidth={1.6} />
          <text x={418} y={230} fill="#a78bfa" fontSize="10" fontWeight={700}>+Y</text>
        </g>
        <text x={118} y={axisY + 16} fill="#10b981" fontSize="9" fontWeight={700}>← −Z (척/단면)</text>
        <text x={zR - 4} y={axisY + 16} fill="#10b981" fontSize="9" fontWeight={700} textAnchor="end">+Z (자유단) →</text>
        <text x={(stockL + zR) / 2} y={bodyTop - 4} fill="#94a3b8" fontSize="8" textAnchor="middle">내경(보어) 확대 가공 · 휠이 보어 내부에서 X+로 절입</text>

        {showGeo && (
          <g>
            {/* d1 (시작 보어) */}
            <line x1={stockL + 10} y1={axisY} x2={stockL + 10} y2={boreS} stroke={sc('d1')} strokeWidth={sw2('d1')} />
            <text x={stockL + 14} y={(axisY + boreS) / 2 + 3} fill={tc('d1')} fontSize="10" fontWeight={tw('d1')}>d1{d1v ? ` Ø${d1v}` : ''}</text>
            {/* d2 (목표 보어) */}
            <line x1={bandR + 16} y1={axisY} x2={bandR + 16} y2={boreF} stroke={sc('d2')} strokeWidth={sw2('d2')} />
            <text x={bandR + 20} y={(axisY + boreF) / 2} fill={tc('d2')} fontSize="10" fontWeight={tw('d2')}>d2{d2v ? ` Ø${d2v}` : ''}</text>
            {/* Z 시작/끝 */}
            <line x1={xStart} y1={bodyTop - 22} x2={xStart} y2={axisY} stroke={sc('z_start')} strokeWidth={sw2('z_start')} strokeDasharray="4 3" />
            <text x={xStart} y={bodyTop - 26} fill={tc('z_start')} fontSize="10" fontWeight={tw('z_start')} textAnchor="middle">Z시작{` ${zs}`}</text>
            <line x1={xEnd} y1={bodyTop - 22} x2={xEnd} y2={axisY} stroke={sc('z_end')} strokeWidth={sw2('z_end')} strokeDasharray="4 3" />
            <text x={xEnd} y={bodyTop - 26} fill={tc('z_end')} fontSize="10" fontWeight={tw('z_end')} textAnchor="middle">Z끝{` ${ze}`}</text>

            {!isTrav && (
              <g>
                <line x1={bandL} y1={boreF - 10} x2={bandR} y2={boreF - 10} stroke={sc('width')} strokeWidth={sw2('width')} />
                <text x={cBand} y={boreF - 14} fill={tc('width')} fontSize="10" fontWeight={tw('width')} textAnchor="middle">가공폭</text>
                {/* 안전(보어 안쪽 접근) */}
                <line x1={wCx - 60} y1={boreS} x2={wCx - 60} y2={axisY - 4} stroke={sc('clearance')} strokeWidth={sw2('clearance')} />
                <text x={wCx - 64} y={(boreS + axisY) / 2} fill={tc('clearance')} fontSize="9" fontWeight={tw('clearance')} textAnchor="end">안전</text>
              </g>
            )}
            {isTrav && (
              <g>
                <line x1={xStart} y1={boreF - 10} x2={ovSX} y2={boreF - 10} stroke={sc('over_start')} strokeWidth={sw2('over_start')} />
                <text x={(xStart + ovSX) / 2} y={boreF - 14} fill={tc('over_start')} fontSize="9" fontWeight={tw('over_start')} textAnchor="middle">오버런S</text>
                <line x1={xEnd} y1={boreF - 10} x2={ovEX} y2={boreF - 10} stroke={sc('over_end')} strokeWidth={sw2('over_end')} />
                <text x={(xEnd + ovEX) / 2} y={boreF - 14} fill={tc('over_end')} fontSize="9" fontWeight={tw('over_end')} textAnchor="middle">오버런E</text>
                {/* 절입(X+ = 위쪽, 보어 확대) */}
                <line x1={xStart + (startIsLeft ? 12 : -12)} y1={boreS} x2={xStart + (startIsLeft ? 12 : -12)} y2={boreS - 16} stroke={sc('infeed_start')} strokeWidth={sw2('infeed_start')} />
                <path d={`M${xStart + (startIsLeft ? 8 : -16)},${boreS - 11} L${xStart + (startIsLeft ? 12 : -12)},${boreS - 18} L${xStart + (startIsLeft ? 16 : -8)},${boreS - 11}`} fill="none" stroke={sc('infeed_start')} strokeWidth={sw2('infeed_start')} />
                <text x={xStart + (startIsLeft ? 16 : -16)} y={boreS + 10} fill={tc('infeed_start')} fontSize="9" fontWeight={tw('infeed_start')} textAnchor={startIsLeft ? 'start' : 'end'}>절입S</text>
                <line x1={xEnd + (startIsLeft ? -12 : 12)} y1={boreS} x2={xEnd + (startIsLeft ? -12 : 12)} y2={boreS - 16} stroke={sc('infeed_end')} strokeWidth={sw2('infeed_end')} />
                <text x={xEnd + (startIsLeft ? -16 : 16)} y={boreS + 10} fill={tc('infeed_end')} fontSize="9" fontWeight={tw('infeed_end')} textAnchor={startIsLeft ? 'end' : 'start'}>절입E</text>
                {/* 번개 각도 */}
                <line x1={bandL} y1={boreS} x2={bandR} y2={boreF} stroke={sc('zigzag_angle')} strokeWidth={sw2('zigzag_angle')} strokeDasharray="3 3" />
                <text x={bandL + 10} y={boreS - 4} fill={tc('zigzag_angle')} fontSize="9" fontWeight={tw('zigzag_angle')}>각도θ</text>
              </g>
            )}
          </g>
        )}

        {showCut && (
          <g>
            {/* 워크 회전 */}
            <path d={`M ${wCx - 24},${axisY - 14} A 24 24 0 1 1 ${wCx - 23},${axisY - 14}`} fill="none" stroke={sc('work_rpm')} strokeWidth={sw2('work_rpm')} />
            <text x={wCx} y={axisY - 40} fill={tc('work_rpm')} fontSize="10" fontWeight={tw('work_rpm')} textAnchor="middle">워크회전(rpm)</text>
            {/* 휠 회전 */}
            <path d={`M ${wCx - 14},${wCy} A 14 14 0 1 1 ${wCx - 13},${wCy}`} fill="none" stroke={on('wheel_vc') ? '#f59e0b' : '#fb923c'} strokeWidth={on('wheel_vc') ? 3 : 1.6} />
            {[
              { id: 'rough_offset', fr: 'rough_fr', y: bodyTop + 6, lbl: '황삭' },
              { id: 'finish_fr', fr: 'finish_fr', y: bodyTop + 34, lbl: '정삭' },
            ].map((b, i) => {
              const act = on(b.id) || on(b.fr);
              return (
                <g key={i}>
                  <rect x={zR - 66} y={b.y} width={58} height={18} fill={act ? '#fde68a' : '#f1f5f9'} stroke={act ? '#f59e0b' : '#cbd5e1'} strokeWidth={act ? 2.5 : 1} />
                  <text x={zR - 37} y={b.y + 13} fill={act ? '#b45309' : '#64748b'} fontSize="10" fontWeight={act ? 800 : 600} textAnchor="middle">{b.lbl}</text>
                </g>
              );
            })}
            {(() => {
              const act = on('spark_out') || on('spark_osc_n') || on('spark_osc_feed');
              return (
                <g>
                  <rect x={zR - 66} y={bodyTop + 62} width={58} height={18} fill={act ? '#fde68a' : '#f1f5f9'} stroke={act ? '#f59e0b' : '#cbd5e1'} strokeWidth={act ? 2.5 : 1} />
                  <text x={zR - 37} y={bodyTop + 75} fill={act ? '#b45309' : '#64748b'} fontSize="10" fontWeight={act ? 800 : 600} textAnchor="middle">스파크</text>
                </g>
              );
            })()}
            <text x={cBand} y={boreF - 12} fill="#94a3b8" fontSize="9" textAnchor="middle">{isTrav ? 'Z왕복 이송' : '플런지 이송(X+)'}</text>
          </g>
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 470 250" className="w-full max-w-lg drop-shadow-sm">
      {/* 좌측 스핀들/척 (−Z, 단면 부착부) */}
      <g>
        <rect x={48} y={topStock - 10} width={56} height={(axisY + 10) - (topStock - 10)} fill="#cbd5e1" stroke="#64748b" strokeWidth={1.5} />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <line key={i} x1={50} y1={topStock - 6 + i * 22} x2={102} y2={topStock - 16 + i * 22} stroke="#94a3b8" strokeWidth={1} />
        ))}
        <text x={76} y={axisY + 26} fill="#475569" fontSize="9" fontWeight={700} textAnchor="middle">좌측 스핀들/척</text>
        <text x={76} y={axisY + 37} fill="#64748b" fontSize="8" textAnchor="middle">(단면 −Z)</text>
      </g>
      {/* 중심선 */}
      <line x1={104} y1={axisY} x2={430} y2={axisY} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="7 4" />
      <text x={434} y={axisY + 4} fill="#cbd5e1" fontSize="10">CL</text>
      {/* 소재 스톡(d1) */}
      <rect x={stockL} y={topStock} width={zR - stockL} height={axisY - topStock} fill="#eef2f7" stroke={sc('d1')} strokeWidth={sw2('d1')} />
      {/* 가공 밴드(d2) */}
      <rect x={bandL} y={topFin} width={bandR - bandL} height={axisY - topFin} fill="#dbeafe" stroke={on('d2') ? '#f59e0b' : '#3b82f6'} strokeWidth={on('d2') ? 3 : 1.6} />
      {/* 휠 */}
      <circle cx={wheelCx} cy={wheelCy} r={wheelR} fill="#fb923c" fillOpacity={0.14} stroke={on('wheel_vc') ? '#f59e0b' : '#fb923c'} strokeWidth={on('wheel_vc') ? 3 : 1.6} />
      <text x={wheelCx} y={wheelCy + 4} fill="#ea580c" fontSize="11" fontWeight={700} textAnchor="middle">WHEEL</text>

      {/* 좌표축 (X 반경+ / Z 축방향+ 우측 / Y 화면바깥+) */}
      <g>
        {/* X+ 위로 */}
        <line x1={398} y1={244} x2={398} y2={216} stroke="#0ea5e9" strokeWidth={1.6} />
        <path d="M394,221 L398,214 L402,221" fill="none" stroke="#0ea5e9" strokeWidth={1.6} />
        <text x={398} y={210} fill="#0ea5e9" fontSize="10" fontWeight={700} textAnchor="middle">+X</text>
        {/* Z+ 오른쪽(자유단) */}
        <line x1={398} y1={244} x2={426} y2={244} stroke="#10b981" strokeWidth={1.6} />
        <path d="M421,240 L428,244 L421,248" fill="none" stroke="#10b981" strokeWidth={1.6} />
        <text x={432} y={247} fill="#10b981" fontSize="10" fontWeight={700}>+Z</text>
        {/* Y+ 화면 바깥(대각) */}
        <line x1={398} y1={244} x2={414} y2={232} stroke="#a78bfa" strokeWidth={1.6} />
        <text x={418} y={230} fill="#a78bfa" fontSize="10" fontWeight={700}>+Y</text>
      </g>
      {/* Z 방향 표시: 우측=+Z(자유단), 좌측=−Z(척) */}
      <text x={118} y={axisY + 16} fill="#10b981" fontSize="9" fontWeight={700}>← −Z (척/단면)</text>
      <text x={zR - 4} y={axisY + 16} fill="#10b981" fontSize="9" fontWeight={700} textAnchor="end">+Z (자유단) →</text>

      {showGeo && (
        <g>
          {/* d1 */}
          <line x1={stockL + 8} y1={topStock} x2={stockL + 8} y2={axisY} stroke={sc('d1')} strokeWidth={sw2('d1')} />
          <text x={stockL + 12} y={topStock + 10} fill={tc('d1')} fontSize="10" fontWeight={tw('d1')}>d1{d1v ? ` Ø${d1v}` : ''}</text>
          {/* d2 */}
          <line x1={bandR + 16} y1={topFin} x2={bandR + 16} y2={axisY} stroke={sc('d2')} strokeWidth={sw2('d2')} />
          <text x={bandR + 20} y={(topFin + axisY) / 2} fill={tc('d2')} fontSize="10" fontWeight={tw('d2')}>d2{d2v ? ` Ø${d2v}` : ''}</text>
          {/* z 위치 (값에 맞춰 좌/우 배치) */}
          <line x1={xStart} y1={topStock - 22} x2={xStart} y2={axisY} stroke={sc('z_start')} strokeWidth={sw2('z_start')} strokeDasharray="4 3" />
          <text x={xStart} y={topStock - 26} fill={tc('z_start')} fontSize="10" fontWeight={tw('z_start')} textAnchor="middle">Z시작{` ${zs}`}</text>
          <line x1={xEnd} y1={topStock - 22} x2={xEnd} y2={axisY} stroke={sc('z_end')} strokeWidth={sw2('z_end')} strokeDasharray="4 3" />
          <text x={xEnd} y={topStock - 26} fill={tc('z_end')} fontSize="10" fontWeight={tw('z_end')} textAnchor="middle">Z끝{` ${ze}`}</text>

          {!isTrav && (
            <g>
              <line x1={bandL} y1={topFin - 10} x2={bandR} y2={topFin - 10} stroke={sc('width')} strokeWidth={sw2('width')} />
              <text x={cBand} y={topFin - 14} fill={tc('width')} fontSize="10" fontWeight={tw('width')} textAnchor="middle">가공폭</text>
              <line x1={wheelCx - 58} y1={wheelCy + wheelR} x2={wheelCx - 58} y2={topStock} stroke={sc('clearance')} strokeWidth={sw2('clearance')} />
              <text x={wheelCx - 62} y={(wheelCy + wheelR + topStock) / 2} fill={tc('clearance')} fontSize="10" fontWeight={tw('clearance')} textAnchor="end">안전</text>
            </g>
          )}
          {isTrav && (
            <g>
              <line x1={xStart} y1={topFin - 10} x2={ovSX} y2={topFin - 10} stroke={sc('over_start')} strokeWidth={sw2('over_start')} />
              <text x={(xStart + ovSX) / 2} y={topFin - 14} fill={tc('over_start')} fontSize="9" fontWeight={tw('over_start')} textAnchor="middle">오버런S</text>
              <line x1={xEnd} y1={topFin - 10} x2={ovEX} y2={topFin - 10} stroke={sc('over_end')} strokeWidth={sw2('over_end')} />
              <text x={(xEnd + ovEX) / 2} y={topFin - 14} fill={tc('over_end')} fontSize="9" fontWeight={tw('over_end')} textAnchor="middle">오버런E</text>
              <line x1={xStart + (startIsLeft ? 12 : -12)} y1={topFin - 2} x2={xStart + (startIsLeft ? 12 : -12)} y2={topFin + 20} stroke={sc('infeed_start')} strokeWidth={sw2('infeed_start')} />
              <text x={xStart + (startIsLeft ? 14 : -14)} y={topFin + 32} fill={tc('infeed_start')} fontSize="9" fontWeight={tw('infeed_start')} textAnchor={startIsLeft ? 'start' : 'end'}>절입S</text>
              <line x1={xEnd + (startIsLeft ? -12 : 12)} y1={topFin - 2} x2={xEnd + (startIsLeft ? -12 : 12)} y2={topFin + 20} stroke={sc('infeed_end')} strokeWidth={sw2('infeed_end')} />
              <text x={xEnd + (startIsLeft ? -14 : 14)} y={topFin + 32} fill={tc('infeed_end')} fontSize="9" fontWeight={tw('infeed_end')} textAnchor={startIsLeft ? 'end' : 'start'}>절입E</text>
              <line x1={bandL} y1={topFin} x2={bandR} y2={topFin - 14} stroke={sc('zigzag_angle')} strokeWidth={sw2('zigzag_angle')} strokeDasharray="3 3" />
              <text x={bandL + 10} y={topFin - 4} fill={tc('zigzag_angle')} fontSize="9" fontWeight={tw('zigzag_angle')}>각도θ</text>
            </g>
          )}
        </g>
      )}

      {showCut && (
        <g>
          <path d={`M ${wheelCx - 24},${axisY - 16} A 24 24 0 1 1 ${wheelCx - 23},${axisY - 16}`} fill="none" stroke={sc('work_rpm')} strokeWidth={sw2('work_rpm')} />
          <text x={wheelCx} y={axisY - 44} fill={tc('work_rpm')} fontSize="10" fontWeight={tw('work_rpm')} textAnchor="middle">워크회전(rpm)</text>
          <path d={`M ${wheelCx - 16},${wheelCy} A 16 16 0 1 1 ${wheelCx - 15},${wheelCy}`} fill="none" stroke={on('wheel_vc') ? '#f59e0b' : '#fb923c'} strokeWidth={on('wheel_vc') ? 3 : 1.6} />
          {[
            { id: 'rough_offset', fr: 'rough_fr', y: topStock + 6, lbl: '황삭' },
            { id: 'finish_fr', fr: 'finish_fr', y: topStock + 34, lbl: '정삭' },
          ].map((b, i) => {
            const act = on(b.id) || on(b.fr);
            return (
              <g key={i}>
                <rect x={zR - 66} y={b.y} width={58} height={18} fill={act ? '#fde68a' : '#f1f5f9'} stroke={act ? '#f59e0b' : '#cbd5e1'} strokeWidth={act ? 2.5 : 1} />
                <text x={zR - 37} y={b.y + 13} fill={act ? '#b45309' : '#64748b'} fontSize="10" fontWeight={act ? 800 : 600} textAnchor="middle">{b.lbl}</text>
              </g>
            );
          })}
          {(() => {
            const act = on('spark_out') || on('spark_osc_n') || on('spark_osc_feed');
            return (
              <g>
                <rect x={zR - 66} y={topStock + 70} width={58} height={18} fill={act ? '#fde68a' : '#f1f5f9'} stroke={act ? '#f59e0b' : '#cbd5e1'} strokeWidth={act ? 2.5 : 1} />
                <text x={zR - 37} y={topStock + 83} fill={act ? '#b45309' : '#64748b'} fontSize="10" fontWeight={act ? 800 : 600} textAnchor="middle">스파크</text>
              </g>
            );
          })()}
          <text x={wheelCx} y={topFin - 12} fill="#94a3b8" fontSize="9" textAnchor="middle">{isTrav ? 'Z왕복 이송' : '플런지 이송'}</text>
        </g>
      )}
    </svg>
  );
};

