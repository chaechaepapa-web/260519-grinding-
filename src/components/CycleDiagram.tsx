// OD 사이클 치수 다이어그램 (App.tsx에서 이식)
export const CycleDiagram = ({ menu, tab, field, zs = 100, ze = 75, d1v = 0, d2v = 0 }: { menu: string; tab: string; field: string; zs?: number; ze?: number; d1v?: number; d2v?: number }) => {
  const on = (id: string) => field === id;
  const sc = (id: string) => (on(id) ? '#f59e0b' : '#94a3b8');
  const sw2 = (id: string) => (on(id) ? 3 : 1.4);
  const tc = (id: string) => (on(id) ? '#b45309' : '#64748b');
  const tw = (id: string) => (on(id) ? 800 : 600);
  const isTrav = menu === 'od_traverse';
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

