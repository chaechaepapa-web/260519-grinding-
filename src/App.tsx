import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Settings, Play, Save, ChevronRight, Info, AlertCircle, 
  Maximize2, FileText, Search, Plus, Trash2, Calendar, 
  ChevronLeft, MoreVertical, HardDrive, Clock, HelpCircle,
  Disc, MoveDiagonal, ArrowDownToLine, Wrench, Crosshair, PenTool, Focus, ArrowLeftRight, Activity, RefreshCw,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { NcSimulator } from './components/Simulator';
import { CycleDiagram } from './components/CycleDiagram';

const INITIAL_PROJECTS = [
  { id: 1, name: 'OP_10_SHAFT', date: '2026-04-28 13:37:27', size: '1' },
  { id: 2, name: 'OP_20_GEAR', date: '2026-04-28 13:45:57', size: '2' },
  { id: 3, name: 'BEARING_INNER', date: '2026-04-16 18:58:29', size: '1' },
];

const SETUP_TYPES = [
  { id: 'tool_setup', label: '공구 설정', desc: 'Wheel & Dresser Setup', icon: PenTool, isSetup: true },
  { id: 'work_coord', label: '워크좌표계 설정', desc: 'Work Coordinate (G54~G59)', icon: Crosshair, isSetup: true }
];

const CYCLE_TYPES = [
  { id: 'od_plunge', label: '외경 연삭 (Plunge)', desc: 'Outer Diameter Plunge Cycle', icon: MoveDiagonal },
  { id: 'od_traverse', label: '외경 연삭 (Traverse)', desc: 'Outer Diameter Traverse Cycle', icon: ArrowLeftRight },
];

const ALL_MENUS = [...SETUP_TYPES, ...CYCLE_TYPES];

const App = () => {
  const [view, setView] = useState('editor');
  const [selectedProjectId, setSelectedProjectId] = useState(1);
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  
  const [selectedMenu, setSelectedMenu] = useState('od_plunge');
  const [activeTab, setActiveTab] = useState('geometry'); 
  
  // 라디오 그룹용 상태 변수들
  const [offsetMode, setOffsetMode] = useState('x_plus');
  const [dressDirection, setDressDirection] = useState('horizontal'); 
  const [gapSensor, setGapSensor] = useState('off'); // 갭검출 기능 미개발 → 기본 OFF
  const [measureMode, setMeasureMode] = useState('in_process'); 

  // 개발 미정 기능 ON/OFF 토글 상태
  const [useGauge, setUseGauge] = useState(false);
  const [useRotary, setUseRotary] = useState(false);
  const [useRotaryOrigin, setUseRotaryOrigin] = useState(false);

  // 싱글 드레서 활성화 상태 (D1, D2)
  const [activeSingleDressers, setActiveSingleDressers] = useState({ d1: true, d2: true });

  const [workCoordData, setWorkCoordData] = useState({ z: '0.000', c: '0.000' });
  const [dresserCoordData, setDresserCoordData] = useState({ x1: '-250.000', z1: '15.000', x2: '-260.000', z2: '25.000' });
  const [dresserRotaryCoordData, setDresserRotaryCoordData] = useState({ x: '-300.000', z: '50.000' });
  const [bAngle, setBAngle] = useState('0.000');
  const [showMeasureEffect, setShowMeasureEffect] = useState(false);

  // --- 신규: 계산기 모달 상태 ---
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcTargetField, setCalcTargetField] = useState<any>(null); // 어떤 필드에 결과값을 넣을지
  const [calcMode, setCalcMode] = useState('N'); // N, Vs, D 중 무엇을 구할지
  const [calcVals, setCalcVals] = useState({ N: '', Vs: '', D: '' });

  // --- 신규: NC 생성 (사용자 입력 캡처 + 출력) ---
  const [paramValues, setParamValues] = useState<any>({}); // `${selectedMenu}:${field.id}` -> 값
  const [ncCode, setNcCode] = useState('');
  const [showNc, setShowNc] = useState(false);
  const [ncSim, setNcSim] = useState<any>(null);   // 시뮬레이션 경로 모델
  const [showSim, setShowSim] = useState(false);
  const [activeField, setActiveField] = useState(''); // 다이어그램 하이라이트용 (포커스/호버 필드)
  const [showSetupPanel, setShowSetupPanel] = useState(false); // 셋업 요약칩 인라인 편집 패널
  const [travUseMacro, setTravUseMacro] = useState(true); // 트래버스 출력: WHILE 매크로(true) / 명시적 전개(false)
  const [plungePaths, setPlungePaths] = useState<number[]>([]); // 플런지 툴패스별 가공폭(Z−) 목록 (비어있으면 단일 플런지)

  const handleFieldChange = (id, newValue) => {
    if (activeTab === 'coord_work') {
      if(id === 'z_offset') setWorkCoordData({...workCoordData, z: newValue});
      if(id === 'c_offset') setWorkCoordData({...workCoordData, c: newValue});
    } else if (activeTab === 'coord_dresser' || activeTab === 'coord_dresser_single') {
      if(id === 'x1_offset') setDresserCoordData({...dresserCoordData, x1: newValue});
      if(id === 'z1_offset') setDresserCoordData({...dresserCoordData, z1: newValue});
      if(id === 'x2_offset') setDresserCoordData({...dresserCoordData, x2: newValue});
      if(id === 'z2_offset') setDresserCoordData({...dresserCoordData, z2: newValue});
    } else if (activeTab === 'coord_dresser_rotary') {
      if(id === 'x_offset') setDresserRotaryCoordData({...dresserRotaryCoordData, x: newValue});
      if(id === 'z_offset') setDresserRotaryCoordData({...dresserRotaryCoordData, z: newValue});
    } else if (activeTab === 'spindle_angle') {
      if(id === 'b_angle') setBAngle(newValue);
    }
  };

  // --- 신규: 계산기 처리 로직 ---
  const calculateResult = () => {
    const { N, Vs, D } = calcVals;
    const n = parseFloat(N);
    const vs = parseFloat(Vs);
    const d = parseFloat(D);

    if (calcMode === 'N') {
      if (!isNaN(vs) && !isNaN(d) && d !== 0) {
        return ((vs * 1000) / (Math.PI * d)).toFixed(0);
      }
    } else if (calcMode === 'Vs') {
      if (!isNaN(n) && !isNaN(d)) {
        return ((Math.PI * d * n) / 1000).toFixed(0);
      }
    } else if (calcMode === 'D') {
      if (!isNaN(vs) && !isNaN(n) && n !== 0) {
        return ((vs * 1000) / (Math.PI * n)).toFixed(2);
      }
    }
    return '0';
  };

  const handleApplyCalculation = () => {
    const result = calculateResult();
    if (calcTargetField) {
      // 결과값이 m/min일 경우, m/s로 변환이 필요한지 확인 (wheel_vc의 경우 m/s 단위임)
      let finalValue = result;
      if (calcTargetField.id === 'wheel_vc' && calcMode === 'Vs') {
         // Vs(m/min) -> Vc(m/s)
         finalValue = (parseFloat(result) / 60).toFixed(1);
      }
      
      handleFieldChange(calcTargetField.id, finalValue);
      setParamValues((prev: any) => ({ ...prev, [`${selectedMenu}:${calcTargetField.id}`]: finalValue }));
    }
    setShowCalculator(false);
  };

  const openCalculator = (field) => {
    setCalcTargetField(field);
    // 초기값 설정
    let initialD = '350'; // 기본 휠 직경 또는 d1
    if (field.id === 'work_rpm') {
      initialD = '50'; // 대략적인 소재 직경
    }
    
    setCalcVals({
      N: field.unit === 'rpm' ? field.value : '',
      Vs: field.unit === 'm/s' ? (parseFloat(field.value) * 60).toString() : '', // m/s -> m/min
      D: initialD
    });
    
    setCalcMode(field.unit === 'rpm' ? 'N' : 'Vs');
    setShowCalculator(true);
  };

  // 단계별 활성화 토글 상태 관리
  const [activeStages, setActiveStages] = useState({
    rough: true,
    finish: true,
    spark: true
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId) || { name: 'NEW PROJECT', date: 'NOW' };
  const currentMenuInfo = ALL_MENUS.find(c => c.id === selectedMenu);

  const goToEditor = (id) => {
    setSelectedProjectId(id);
    setSelectedMenu('od_plunge');   // 사이클 우선: 바로 가공 사이클로 진입
    setActiveTab('geometry');
    setView('editor');
  };

  const goToList = () => {
    setView('list');
  };

  const toggleStage = (stageKey) => {
    setActiveStages(prev => ({ ...prev, [stageKey]: !prev[stageKey] }));
  };

  const handleMeasureWorkCoord = () => {
    setWorkCoordData({ z: '152.485', c: '0.000' });
    setParamValues((prev: any) => ({ ...prev, 'work_coord:z_offset': '152.485', 'work_coord:c_offset': '0.000' }));
    triggerMeasureEffect();
  };

  const handleMeasureDresserCoord = () => {
    if (activeTab === 'coord_dresser_rotary') {
      setDresserRotaryCoordData({ x: '-298.115', z: '49.820' });
      setParamValues((prev: any) => ({ ...prev, 'work_coord:x_offset': '-298.115', 'work_coord:z_offset': '49.820' }));
    } else {
      setDresserCoordData({
        x1: '-250.485', z1: '15.220',
        x2: '-250.485', z2: '25.220' // 예시값
      });
      setParamValues((prev: any) => ({ ...prev, 'work_coord:x1_offset': '-250.485', 'work_coord:z1_offset': '15.220', 'work_coord:x2_offset': '-250.485', 'work_coord:z2_offset': '25.220' }));
    }
    triggerMeasureEffect();
  };

  const triggerMeasureEffect = () => {
    setShowMeasureEffect(true);
    setTimeout(() => setShowMeasureEffect(false), 1500);
  };

  const ProjectListPage = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center">
          <HardDrive className="mr-2 text-blue-600" size={24} />
          PROJECT LIST
        </h1>
        <div className="relative w-96">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input type="text" placeholder="SEARCH" className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden p-4 space-x-4">
        <div className="flex-[1.5] flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            <button className="flex items-center px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-colors">
              All Dates <ChevronRight size={14} className="ml-1 rotate-90" />
            </button>
            <div className="flex space-x-2">
              <button onClick={() => goToEditor(null)} className="flex items-center px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700">
                <Plus size={16} className="mr-1" /> New
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="px-4 py-3 w-12 border-b border-slate-200">#</th>
                  <th className="px-4 py-3 border-b border-slate-200">Project Name</th>
                  <th className="px-4 py-3 border-b border-slate-200">Date</th>
                  <th className="px-4 py-3 border-b border-slate-200">Size(KB)</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {projects.map((proj, idx) => (
                  <tr key={proj.id} onClick={() => setSelectedProjectId(proj.id)} onDoubleClick={() => goToEditor(proj.id)} className={`cursor-pointer transition-colors ${selectedProjectId === proj.id ? 'bg-blue-50/80' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{proj.name}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{proj.date}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{proj.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const CycleEditorPage = () => {

    // --- 사전 설정 파라미터 ---
    const coordWorkFields = [
      { id: 'g_code', label: '소재 좌표계 (G-Code)', unit: 'G', value: '54', desc: '소재 가공에 사용할 워크좌표계 (G54~G59)' },
      { id: 'z_offset', label: 'Z축 원점 (Z Offset)', unit: 'mm', value: workCoordData.z, desc: '기계 원점에서 소재 단면(원점)까지의 거리' },
      { id: 'c_offset', label: 'C축 원점 (C Offset)', unit: 'deg', value: workCoordData.c, desc: '회전축(C축)의 영점 오프셋' }
    ];

    const coordDresserSingleFields = [
      { id: 'g_code', label: '드레서 좌표계 (G-Code)', unit: 'G', value: '59', desc: '싱글 드레싱 전용으로 사용할 워크좌표계 (예: G59)' },
      ...(activeSingleDressers.d1 ? [
        { id: 'x1_offset', label: '드레서 1번 X 위치', unit: 'mm', value: dresserCoordData.x1, desc: '기계 원점에서 1번 드레서 팁까지의 X축 거리' },
        { id: 'z1_offset', label: '드레서 1번 Z 위치', unit: 'mm', value: dresserCoordData.z1, desc: '기계 원점에서 1번 드레서 팁까지의 Z축 거리' }
      ] : []),
      ...(activeSingleDressers.d2 ? [
        { id: 'x2_offset', label: '드레서 2번 X 위치', unit: 'mm', value: dresserCoordData.x2, desc: '기계 원점에서 2번 드레서 팁까지의 X축 거리' },
        { id: 'z2_offset', label: '드레서 2번 Z 위치', unit: 'mm', value: dresserCoordData.z2, desc: '기계 원점에서 2번 드레서 팁까지의 Z축 거리' }
      ] : [])
    ];

    const coordDresserRotaryFields = useRotaryOrigin ? [
      { id: 'g_code', label: '로터리 드레서 좌표 (G-Code)', unit: 'G', value: '58', desc: '로터리 드레싱 전용으로 사용할 워크좌표계 (예: G58)' },
      { id: 'x_offset', label: '드레서 X 위치 (X Offset)', unit: 'mm', value: dresserRotaryCoordData.x, desc: '기계 원점에서 로터리 드레서 중심까지의 X축 거리' },
      { id: 'z_offset', label: '드레서 Z 위치 (Z Offset)', unit: 'mm', value: dresserRotaryCoordData.z, desc: '기계 원점에서 로터리 드레서 중심까지의 Z축 거리' }
    ] : [];

    const wheelSetupFields = [
      { id: 't_code', label: '공구 번호 (T-Code)', unit: 'T', value: '0101', desc: '연삭 휠의 툴 번호 및 보정 번호' },
      { id: 'wheel_od', label: '휠 외경 (Wheel OD)', unit: 'mm', value: '350.000', desc: '현재 장착된 휠의 실측 직경' },
      { id: 'wheel_width', label: '휠 폭 (Wheel Width)', unit: 'mm', value: '20.000', desc: '연삭 휠의 유효 폭. 플런지 가공폭이 이 값을 넘으면 시프트 플런지로 분할됩니다.' },
      { id: 'offset_mode', label: '옵셋 기준 위치 (Offset Ref.)', type: 'radioGroup', options: [{val: 'x_plus', label: '외경 (X+)'}, {val: 'x_minus', label: '내경 (X-)'}, {val: 'center', label: '센터'}], desc: '가공 부위(외경/내경/센터)에 따른 공구 보정 기준점 설정' },
      { id: 'x_offset', label: 'X축 옵셋 (X Offset)', unit: 'mm', value: '0.000', desc: '선택된 기준점 기준 X축 보정량' },
      { id: 'z_offset', label: 'Z축 옵셋 (Z Offset)', unit: 'mm', value: '120.000', desc: '선택된 기준점 기준 Z축 보정량' }
    ];

    const dresserSetupFields = [
      ...(activeSingleDressers.d1 ? [{ id: 'dresser_1_width', label: '싱글 포인트 드레서 1번 폭', unit: 'mm', value: '2.000', desc: '1번 드레서 팁의 유효 폭(넓이) 설정' }] : []),
      ...(activeSingleDressers.d2 ? [{ id: 'dresser_2_width', label: '싱글 포인트 드레서 2번 폭', unit: 'mm', value: '2.000', desc: '2번 드레서 팁의 유효 폭(넓이) 설정' }] : [])
    ];

    const dresserRotarySetupFields = [
      { id: 'rotary_od', label: '로터리 휠 외경 (Rotary OD)', unit: 'mm', value: '150.000', desc: '로터리 드레서 휠의 직경' },
      { id: 'rotary_width', label: '로터리 휠 폭 (Rotary Width)', unit: 'mm', value: '20.000', desc: '로터리 드레서 휠의 폭' }
    ];

    const spindleAngleFields = [
      { id: 'b_angle', label: 'B축 밀링 헤드 각도', unit: 'deg', value: bAngle, desc: '밀링 헤드(B축)의 가공 경사각 설정 (범위: -240° ~ 240°)' }
    ];

    // --- 공통: 어프로치 및 갭 검지 ---
    const gapCuttingFields = [
      { id: 'gap_sensor', label: '갭 검출/리턴 (Gap, 개발예정)', type: 'radioGroup', options: [{val: 'on', label: '사용 (ON)'}, {val: 'off', label: '미사용 (OFF)'}], desc: '접촉 자동검지 + 검지 후 후퇴를 하나로 묶은 기능. 개발 예정 → 기본 OFF.' },
      ...(gapSensor === 'on' ? [
        { id: 'gap_feed', label: '어프로치 이송 속도 (Approach Speed)', unit: 'mm/min', value: '50.0', desc: '센서 검출 전까지 휠이 다가가는 접근 속도' },
        { id: 'gap_return', label: '검지 후 후퇴 거리 (Return Dist.)', unit: 'mm', value: '0.050', desc: '접촉 감지 직후 휠이 뒤로 물러나는 거리' },
      ] : [])
    ];


    // --- 외경 연삭 (플런지) ---
    const odPlungeGeometryFields = [
      { id: 'd1', label: '시작 직경 (Start Dia.)', unit: 'mm', value: '50.000', desc: '가공 전 소재의 직경 (도피/접근 기준점)' },
      { id: 'd2', label: '목표 직경 (Finish Dia.)', unit: 'mm', value: '48.500', desc: '가공 완료 후의 최종 목표 직경' },
      { id: 'z_start', label: '가공 시작 위치 (Start Z)', unit: 'mm', value: '100.000', desc: '가공 시작 Z. 여기서 Z− 방향으로 가공길이만큼 진입.' },
      { id: 'width', label: '가공 길이 (Grind Length, 부호=방향)', unit: 'mm', value: '-25.000', desc: '가공 시작점에서 진입하는 길이. 음수=Z−, 양수=Z+. 길이는 절대값으로 계산.' },
      { id: 'clearance', label: '안전 거리 (Clearance)', unit: 'mm', value: '0.300', desc: '급속이송이 끝나고 가공이송이 시작되는 접근 도피량(반경). 휠이 소재 위 이 거리에서 가공이송 시작.' }
    ];

    const odPlungeCuttingFields = [
      ...gapCuttingFields,
      { id: 'work_rpm', label: '작업 회전 속도 (Work RPM)', unit: 'rpm', value: '250', desc: '공작물의 회전 속도' },
      { id: 'wheel_vc', label: '휠 주속 (Wheel Vc)', unit: 'm/s', value: '35', desc: '연마 휠의 표면 속도' },
      
      { id: 'toggle_rough', type: 'stageToggle', stageKey: 'rough', label: '황삭 가공 (Roughing)' },
      { id: 'rough_offset', stage: 'rough', label: '황삭 옵셋 (목표직경 기준)', unit: 'mm', value: '0.400', desc: '목표직경 위로 남길 양(직경). 황삭은 d2+이 값까지, 나머지는 정삭이 목표직경까지.' },
      { id: 'rough_fr', stage: 'rough', label: '황삭 이송 속도 (Rough Feed)', unit: 'mm/min', value: '0.500', desc: '황삭 구간 휠 진입 속도' },

      { id: 'toggle_finish', type: 'stageToggle', stageKey: 'finish', label: '정삭 가공 (Finishing)' },
      { id: 'finish_fr', stage: 'finish', label: '정삭 이송 속도 (Finish Feed)', unit: 'mm/min', value: '0.100', desc: '정삭 구간 휠 진입 속도 (목표직경까지)' },

      { id: 'toggle_spark', type: 'stageToggle', stageKey: 'spark', label: '스파크 아웃 (Spark-out)' },
      { id: 'spark_out', stage: 'spark', label: '스파크 아웃 시간 (Dwell)', unit: 's', value: '3', desc: '목표 치수 도달 후 절입 없이 머무는 휴지 시간(초). G4 X로 출력.' },
      { id: 'spark_osc_n', stage: 'spark', label: '스파크 왕복 횟수 (Oscillation)', unit: 'Times', value: '0', desc: '0=휴지만, 1이상=모든 정삭 완료 후 목표경에서 가공부 전구간(시작~끝)을 왕복. 미가공부 침범 없이 가공된 구간만 왕복합니다.' },
      { id: 'spark_osc_overrun', stage: 'spark', label: '스파크 왕복 오버런 (편측)', unit: 'mm', value: '0.000', desc: '가공부 양 끝을 지나치는 추가 거리. 0=가공부 끝까지만 커버, 값↑=양 끝을 더 지나쳐 비빔(끝단 도피/단차 있을 때만 사용).' },
      { id: 'spark_osc_feed', stage: 'spark', label: '스파크 왕복 이송 (Feed)', unit: 'mm/min', value: '200', desc: 'Z축 전구간 왕복 비비기 이송 속도.' }
    ];

    // --- 외경 연삭 (트래버스) ---
    const odTraverseGeometryFields = [
      { id: 'd1', label: '시작 직경 (Start Dia.)', unit: 'mm', value: '50.000', desc: '가공 전 소재의 초기 직경' },
      { id: 'd2', label: '목표 직경 (Finish Dia.)', unit: 'mm', value: '49.000', desc: '가공 완료 후의 최종 목표 직경' },
      { id: 'z_start', label: '가공 시작 위치 (Start Pos.)', unit: 'mm', value: '100.000', desc: '왕복(Traverse) 운동이 시작되는 Z축 지점' },
      { id: 'z_end', label: '가공 종료 위치 (End Pos.)', unit: 'mm', value: '50.000', desc: '왕복(Traverse) 운동이 끝나는 Z축 지점' },
      { id: 'zigzag_angle', label: '지그재그(번개) 모드 ON (>0)', unit: 'deg', value: '0.000', desc: '0=직선 트래버스. >0=번개모드 ON. 번개에서는 한 레그가 전체 Z를 사선으로 트래버스하며 X-로 절입하므로, 실제 사선 기울기는 (절입량/2)/Z스팬으로 결정됩니다(이 값은 ON/OFF 용도).' },
      { id: 'zigzag_infeed', label: '번개 X 1회 절입량 (직경)', unit: 'mm', value: '0.020', desc: '[번개모드 전용 · 각도>0일 때] 한 레그(전체 Z 사선 트래버스)마다 X-로 절입하는 직경량. Z 이동 중에 절입이 일어남. (직선모드의 시작/종료단 절입량을 대체)' },
      { id: 'clearance', label: '안전 거리 (Clearance)', unit: 'mm', value: '2.000', desc: '가공 전 휠이 접근할 때의 도피량' },
      { id: 'over_start', label: '트래버스 오버런 (Start)', unit: 'mm', value: '15.000', desc: '시작 위치(Start Pos.)를 벗어나 휠이 더 나가는 거리' },
      { id: 'over_end', label: '트래버스 오버런 (End)', unit: 'mm', value: '15.000', desc: '종료 위치(End Pos.)를 벗어나 휠이 더 나가는 거리' },
      { id: 'infeed_start', label: '시작단 절입량 (Infeed Start)', unit: 'mm', value: '0.005', desc: '[직선 트래버스 전용 · 각도=0일 때] 시작 위치에서 방향을 바꿀 때 1회 절입되는 양. (번개모드에서는 미사용)' },
      { id: 'infeed_end', label: '종료단 절입량 (Infeed End)', unit: 'mm', value: '0.000', desc: '[직선 트래버스 전용 · 각도=0일 때] 종료 위치에서 방향을 바꿀 때 1회 절입되는 양. (번개모드에서는 미사용)' }
    ];

    const odTraverseCuttingFields = [
      ...gapCuttingFields,
      { id: 'work_rpm', label: '작업 회전 속도 (Work RPM)', unit: 'rpm', value: '250', desc: '공작물의 회전 속도' },
      { id: 'wheel_vc', label: '휠 주속 (Wheel Vc)', unit: 'm/s', value: '35', desc: '연마 휠의 표면 속도' },

      { id: 'toggle_rough', type: 'stageToggle', stageKey: 'rough', label: '황삭 가공 (Roughing)' },
      { id: 'rough_offset', stage: 'rough', label: '황삭 옵셋 (목표직경 기준)', unit: 'mm', value: '0.300', desc: '목표직경 위로 남길 양(직경). 황삭은 d2+이 값까지, 나머지는 정삭이 목표직경까지.' },
      { id: 'rough_fr', stage: 'rough', label: '황삭 이송 속도 (Rough Feed)', unit: 'mm/min', value: '300', desc: 'Z축 좌우 왕복 이송 속도 (황삭)' },

      { id: 'toggle_finish', type: 'stageToggle', stageKey: 'finish', label: '정삭 가공 (Finishing)' },
      { id: 'finish_fr', stage: 'finish', label: '정삭 이송 속도 (Finish Feed)', unit: 'mm/min', value: '100', desc: 'Z축 좌우 왕복 이송 속도 (정삭, 목표직경까지)' },

      { id: 'toggle_spark', type: 'stageToggle', stageKey: 'spark', label: '스파크 아웃 (Spark-out)' },
      { id: 'spark_out', stage: 'spark', label: '스파크 아웃 횟수 (Spark-out)', unit: 'Times', value: '2', desc: '목표 치수 도달 후 절입 없이 Z축 왕복을 반복하는 횟수' },
      { id: 'spark_dwell', stage: 'spark', label: '스파크 대기 시간 (번개모드)', unit: 's', value: '0', desc: '번개(지그재그)모드 전용. 스파크 왕복 후 절입 없이 머무는 휴지(G4). 0=생략.' },
      { id: 'spark_rub_n', stage: 'spark', label: '스파크 비비기 횟수 (번개모드)', unit: 'Times', value: '0', desc: '번개모드 전용. 대기 후 목표경에서 가공부 전구간 직선 왕복(비비기) 횟수. 0=생략.' },
      { id: 'spark_rub_feed', stage: 'spark', label: '스파크 비비기 이송 (번개모드)', unit: 'mm/min', value: '200', desc: '번개모드 비비기 왕복 이송 속도.' }
    ];


    const isSetupMode = (currentMenuInfo as any)?.isSetup;
    const isDressingMode = (currentMenuInfo as any)?.isDress;

    const getTabs = () => {
      if (selectedMenu === 'work_coord') return [{ id: 'coord_work', label: '소재 워크좌표계' }];
      if (selectedMenu === 'tool_setup') return [
        { id: 'wheel', label: '연삭 휠 및 보정' },
        { id: 'spindle_angle', label: '밀링 스핀들 각도 (B축)' }
      ];
      return [{ id: 'geometry', label: '공작물 형상' }, { id: 'cutting', label: '가공 조건' }];
    };

    const getActiveFields = () => {
      if (activeTab === 'coord_work') return coordWorkFields;
      if (activeTab === 'wheel') return wheelSetupFields;
      if (activeTab === 'spindle_angle') return spindleAngleFields;
      if (activeTab === 'geometry') {
        if (selectedMenu === 'od_plunge') return odPlungeGeometryFields;
        if (selectedMenu === 'od_traverse') return odTraverseGeometryFields;
        return [];
      }
      if (activeTab === 'cutting') {
        if (selectedMenu === 'od_plunge') return odPlungeCuttingFields;
        if (selectedMenu === 'od_traverse') return odTraverseCuttingFields;
        return [];
      }
      return [];
    };

    const handleMenuChange = (id) => {
      setSelectedMenu(id);
      if (id === 'work_coord') setActiveTab('coord_work');
      else if (id === 'tool_setup') setActiveTab('wheel');
      else setActiveTab('geometry');
    };

    // =========================================================
    // NC 생성 엔진 (SMX / FANUC / 직경지령 / 위치제어)
    //  - 현재 지원: OD 플런지
    //  - 미확정 항목은 (***확인필요***) 마커로 출력
    // =========================================================
    const gv = (f: any) => paramValues[`${selectedMenu}:${f.id}`] ?? f.value; // 현재 화면 편집값 우선
    const toMap = (arr: any[]) => {
      const m: any = {};
      arr.forEach(f => { if (f && f.id && f.value !== undefined) m[f.id] = gv(f); });
      return m;
    };
    // 다른 화면(공구설정/워크좌표)에서 편집한 값을 해당 화면 키로 읽기
    const gvAt = (menuKey: string, f: any) => paramValues[`${menuKey}:${f.id}`] ?? f.value;
    const toMapAt = (menuKey: string, arr: any[]) => {
      const m: any = {};
      arr.forEach(f => { if (f && f.id && f.value !== undefined) m[f.id] = gvAt(menuKey, f); });
      return m;
    };

    const generateODPlunge = () => {
      const geo = toMap(odPlungeGeometryFields);
      const cut = toMap(odPlungeCuttingFields);
      const wheel = toMapAt('tool_setup', wheelSetupFields); // 공구설정 화면 입력 반영

      const N = (v: any) => parseFloat(v);
      const f3 = (v: number) => v.toFixed(3);

      const d1 = N(geo.d1), d2 = N(geo.d2);
      const zs = N(geo.z_start);
      const clr = N(geo.clearance);
      const gwIn = N(geo.width);            // 가공 길이 (부호=방향: 음수=Z−, 양수=Z+)
      const gw = Math.abs(gwIn);            // 길이 절대값 (총 가공 길이)
      const dir = gwIn < 0 ? -1 : 1;        // 이송 방향
      const ze = zs + dir * gw;             // 끝위치 = 시작 + 방향×길이
      const zSafe = zs - dir * clr;         // Z 안전위치: 가공시작 경계 바깥(이송 반대쪽)으로 안전거리
      const workRpm = N(cut.work_rpm);
      const vc = N(cut.wheel_vc);
      const wheelOd = N(wheel.wheel_od);
      const wheelW = N(wheel.wheel_width);  // 휠 폭
      const tCode = wheel.t_code || '0101';
      const bAng = parseFloat(bAngle);
      const gCode = paramValues['work_coord:g_code'] ?? '54'; // 소재 워크좌표계 (편집값 반영)

      // --- 현실성 검증 ---
      const warn: string[] = [];
      if (!(d2 < d1)) warn.push('목표직경(d2)이 시작직경(d1)보다 작아야 합니다 - OD는 제거가공.');
      const total = d1 - d2;
      const roughOffset = activeStages.rough ? N(cut.rough_offset) : 0; // 황삭 옵셋(목표직경 위로 남기는 양)
      if (activeStages.rough && roughOffset >= total) warn.push(`황삭 옵셋(${roughOffset})이 총제거량(${total.toFixed(3)}) 이상 → 황삭이 목표에 못 미침.`);
      if (!(workRpm > 0)) warn.push('워크 회전수가 0 이하입니다.');
      if (!(wheelOd > 0)) warn.push('휠 외경이 0 이하입니다.');
      if (offsetMode !== 'x_plus') warn.push(`OD는 공구 옵셋 기준이 외경(X+)이어야 합니다. (현재: ${offsetMode})`);
      if (!(wheelW > 0)) warn.push('휠 폭이 입력되지 않았습니다 (공구설정에서 입력).');
      const passWv = plungePaths.length > 0 ? plungePaths.map(Number) : [Math.min(wheelW > 0 ? wheelW : gw, gw)];
      const sumWv = passWv.reduce((a, b) => a + (Number(b) || 0), 0);
      if (gw - sumWv > 0.001) warn.push(`남은 가공길이 ${(gw - sumWv).toFixed(3)}mm → 툴패스 추가/길이 조정 필요.`);
      passWv.forEach((w, i) => { if (Number(w) > wheelW + 1e-6) warn.push(`툴패스 ${i + 1} 폭(${w}) > 휠폭(${wheelW}) → 1회 플런지 불가.`); });

      // --- 산출 ---
      const sw = wheelOd > 0 ? Math.round((vc * 60000) / (Math.PI * wheelOd)) : 0; // 휠 rpm
      const zc = f3((zs + ze) / 2);          // 가공폭 중앙 Z
      // 옵셋 보정(직경): 접촉점이 목표경에 닿도록 제어점 X를 자동 보정.
      //  x+ =접촉면 자체(0) / 센터=휠 중심까지(+휠반경=휠경/2) / x-(내경)=휠 반대편까지(+휠경)
      //  예) 휠Ø100, 접촉 X100 → x+:X100, 센터:X150, x-:X200
      const xOff = offsetMode === 'center' ? wheelOd / 2 : offsetMode === 'x_minus' ? wheelOd : 0;
      const xc = (d: number) => f3(d + xOff);  // NC 출력 X(=제어점 직경)
      const xApproach = d1 + 2 * clr;        // 접근 에어갭(접촉 직경 기준)
      const xRetract = d1 + 2 * clr + 1;     // 안전 후퇴경(접촉 직경 기준)

      // 단계 시퀀스 산출 (황삭=목표경+황삭옵셋까지, 정삭=목표경 그대로)
      const seqRaw: { lbl: string; t: number; f: any }[] = [];
      if (activeStages.rough) seqRaw.push({ lbl: 'ROUGH', t: d2 + roughOffset, f: cut.rough_fr });
      if (activeStages.finish) seqRaw.push({ lbl: 'FINISH', t: d2, f: cut.finish_fr });
      if (seqRaw.length) seqRaw[seqRaw.length - 1].t = d2; // 최종 단계는 목표경(d2)에 정확히 도달
      let prevT = d1;
      for (const s of seqRaw) { s.t = Math.min(Math.max(s.t, d2), prevT); prevT = s.t; } // 단조감소 + d2 클램프
      const seq = seqRaw.map(s => ({ lbl: s.lbl, t: s.t, f: s.f }));
      let cur = seqRaw.length ? seqRaw[seqRaw.length - 1].t : d1; // 스파크아웃용 최종 직경(접촉)

      const L: string[] = [];
      const moves: any[] = []; // 시뮬레이션용 경로 (x=직경, z, rapid, dwell)
      L.push('%');
      L.push(`O0010 (OD PLUNGE GRIND / ${selectedProject.name})`);
      L.push('(WORK:P11-C1  WHEEL:P12  X=DIA  FEED:G98)');
      L.push(`(OFFSET:${offsetMode}  X-COMP=+${xOff.toFixed(3)} DIA  [x+:0 / center:+R / x-:+D]  ***기계검증***)`);
      warn.forEach(w => L.push(`(***확인필요*** ${w})`));
      L.push(`G0 G98 G80 G40 G${gCode}`);
      L.push('G18');
      L.push('G28 U0 W0');
      L.push(`T${tCode}`);
      L.push(`G400 B${bAng} J1 (***확인필요*** J=인선방향, 실제 휠 등록값 확인)`);
      L.push('(***확인필요*** 워크회전 P11 + 휠회전 P12 동시운용 계통/C1 비클램프 - 실제 연삭 NC 확인)');
      L.push('M8');
      L.push(`G97 M3 S${sw} P12 (WHEEL Vc${vc}M/S @OD${wheelOd}=${sw}RPM)`);
      L.push(`G97 M3 S${workRpm} P11 (WORK ${workRpm}RPM)`);
      const doPlungeAt = (zPos: string) => {
        const zN = parseFloat(zPos);
        L.push(`G0 X${xc(xApproach)} Z${f3(zSafe)}`); // 안전 X·Z(가공시작 바깥)로 급속 접근
        moves.push({ x: xApproach, z: zSafe, rapid: true, line: L.length - 1 });
        L.push(`G0 Z${zPos}`);                        // 그라인드 Z(선단)로 이동
        moves.push({ x: xApproach, z: zN, rapid: true, line: L.length - 1 });
        seq.forEach(s => { L.push(`(--- ${s.lbl} ---)`); L.push(`G1 X${xc(s.t)} F${s.f}`); moves.push({ x: s.t, z: zN, rapid: false, line: L.length - 1 }); });
        if (activeStages.spark) {
          const dw = N(cut.spark_out);
          if (dw > 0) { L.push('(--- SPARK OUT : DWELL ---)'); L.push(`G4 X${dw.toFixed(1)} (휴지 ${cut.spark_out}s)`); moves.push({ x: cur, z: zN, dwell: dw, rapid: false, line: L.length - 1 }); }
        }
        L.push(`G0 X${xc(xApproach)}`); // X 도피
        moves.push({ x: xApproach, z: zN, rapid: true, line: L.length - 1 });
        L.push(`G0 Z${f3(zSafe)}`); // Z 도피 (가공시작 바깥, 안전거리)
        moves.push({ x: xApproach, z: zSafe, rapid: true, line: L.length - 1 });
      };

      moves.push({ x: xRetract, z: parseFloat(zc), rapid: true, line: L.length - 1 }); // 시작(후퇴) 위치

      // 플런지: 가공시작(z_start)에서 dir로 진입. 선단(제어점)=첫 접촉면=이송방향 앞단(끝쪽).
      // 자동분할 없음: 기본 1패스 + '툴패스 추가'(plungePaths)만큼 휠폭씩 순차. (길이는 절대값)
      const wW = wheelW > 0 ? wheelW : gw;
      const passW = plungePaths.length > 0 ? plungePaths.map(Number) : [Math.min(wW, gw)]; // 패스별 길이(편집값)
      let cum = 0; // 가공시작에서 이미 진입한 길이(절대값)
      for (let i = 0; i < passW.length && cum < gw - 1e-6; i++) {
        const cover = Math.min(Math.max(passW[i] || 0, 0), wW, gw - cum); // 패스 길이(휠폭·남은길이 이내)
        if (cover <= 1e-6) continue;
        const leadZ = zs + dir * (cum + cover); // 선단(제어점)=이송방향 앞단(첫 접촉면)
        L.push(`(TOOLPATH ${i + 1}/${passW.length} 선단@Z${f3(leadZ)} 폭 ${cover.toFixed(3)})`);
        doPlungeAt(f3(leadZ));
        cum += cover;
      }

      // 스파크아웃 왕복: 모든 정삭 완료 후, 목표경(d2)에서 가공부 전구간을 왕복.
      // 선단(제어점) 기준으로 스윕 → 휠 몸체(폭 wW)가 [zs..ze] 전체 + 오버런을 커버. (플런지와 동일한 선단 모델)
      if (activeStages.spark) {
        const oscN = Math.round(N(cut.spark_osc_n) || 0), oscF = cut.spark_osc_feed, over = Math.max(N(cut.spark_osc_overrun) || 0, 0);
        const leadA = zs + dir * (wW - over); // 시작측 선단(몸체가 zs까지 덮음; over면 더 지나침)
        const leadB = ze + dir * over;        // 끝측 선단(가공 끝 + 오버런)
        const sweep = dir * (leadB - leadA);  // 양수면 유효 스윕(휠이 가공부보다 좁음)
        if (oscN > 0 && sweep > 1e-6) {
          L.push(`(=== SPARK OUT : FULL-ZONE OSCILLATION x${oscN} (전구간 왕복, 오버런 ${over.toFixed(3)}) ===)`);
          L.push(`G0 X${xc(xApproach)} Z${f3(leadA)}`); moves.push({ x: xApproach, z: leadA, rapid: true, line: L.length - 1 });
          L.push(`G1 X${xc(d2)} F${oscF}`); moves.push({ x: d2, z: leadA, rapid: false, line: L.length - 1 });
          for (let k = 0; k < oscN; k++) {
            L.push(`G1 Z${f3(leadB)} F${oscF}`); moves.push({ x: d2, z: leadB, rapid: false, line: L.length - 1 });
            L.push(`G1 Z${f3(leadA)} F${oscF}`); moves.push({ x: d2, z: leadA, rapid: false, line: L.length - 1 });
          }
          L.push(`G0 X${xc(xApproach)}`); moves.push({ x: xApproach, z: leadA, rapid: true, line: L.length - 1 });
          L.push(`G0 Z${f3(zSafe)}`); moves.push({ x: xApproach, z: zSafe, rapid: true, line: L.length - 1 });
        }
      }

      L.push(`G0 X${xc(xRetract)}`);
      moves.push({ x: xRetract, z: parseFloat(zc), rapid: true, line: L.length - 1 });
      L.push('M5 P12');
      L.push('M5 P11');
      L.push('M9');
      L.push('G28 U0 W0');
      L.push('M30');
      L.push('%');
      const sim = {
        moves, wheelOd, wheelW: wheelW > 0 ? wheelW : Math.max(gw, 5), wheelWReal: wheelW,
        d1, d2, zMin: Math.min(zs, zs + dir * gw), zMax: Math.max(zs, zs + dir * gw), grindWidth: gw, offset: offsetMode, bAngle: bAng, bodyDir: dir,
      };
      return { code: L.join('\n'), sim };
    };

    // =========================================================
    // OD 트래버스 (매크로 WHILE 루프 / 직경지령 / 위치제어)
    // =========================================================
    const generateODTraverse = () => {
      const geo = toMap(odTraverseGeometryFields);
      const cut = toMap(odTraverseCuttingFields);
      const wheel = toMapAt('tool_setup', wheelSetupFields);
      const N = (v: any) => parseFloat(v);
      const f3 = (v: number) => v.toFixed(3);

      const d1 = N(geo.d1), d2 = N(geo.d2);
      const zs = N(geo.z_start), ze = N(geo.z_end);
      const clr = N(geo.clearance);
      const ovS = N(geo.over_start), ovE = N(geo.over_end);
      const inS = N(geo.infeed_start), inE = N(geo.infeed_end);
      const zig = N(geo.zigzag_angle) || 0;
      const zigOn = Math.abs(zig) > 1e-6; // 번개(지그재그) 모드: 각도>0 (ON/OFF)
      const workRpm = N(cut.work_rpm), vc = N(cut.wheel_vc);
      const wheelOd = N(wheel.wheel_od);
      const tCode = wheel.t_code || '0101';
      const bAng = parseFloat(bAngle);
      const gCode = paramValues['work_coord:g_code'] ?? '54';
      const sw = wheelOd > 0 ? Math.round((vc * 60000) / (Math.PI * wheelOd)) : 0;

      const sgn = (zs >= ze) ? 1 : -1;
      const zStartLim = zs + sgn * ovS;   // 시작단 + 오버런
      const zEndLim = ze - sgn * ovE;     // 종료단 + 오버런
      const span = zEndLim - zStartLim;   // 시작→종료 Z(부호)
      const sgnExpr = (v: number) => (v >= 0 ? `+${f3(v)}` : `-${f3(-v)}`); // U/W 상대지령 부호
      const useMacro = travUseMacro && !zigOn; // 번개모드는 U/W 상대좌표 전개(매크로 비적용)
      const xApproach = f3(d1 + 0.4);
      const xRetract = f3(d1 + 2 * clr);

      const warn: string[] = [];
      if (!(d2 < d1)) warn.push('목표직경(d2)이 시작직경(d1)보다 작아야 합니다.');
      const total = d1 - d2;
      const roughOffset = activeStages.rough ? N(cut.rough_offset) : 0; // 황삭 옵셋(목표직경 위로 남기는 양)
      if (activeStages.rough && roughOffset >= total) warn.push(`황삭 옵셋(${roughOffset})이 총제거량(${total.toFixed(3)}) 이상 → 황삭이 목표에 못 미침.`);
      const noInfeed = (inS + inE) <= 0;
      if (noInfeed) warn.push('시작단/종료단 절입이 모두 0 → 단계당 1패스로 처리.');
      if (offsetMode !== 'x_plus') warn.push(`OD는 옵셋 기준이 외경(X+)이어야 합니다. (현재: ${offsetMode})`);
      if (zigOn) {
        const infZ = N(geo.zigzag_infeed) || 0;
        warn.push(`번개(지그재그) 모드 ON: 한 레그=전체 Z 사선 트래버스(W±${Math.abs(span).toFixed(1)}) 중 X-로 ${infZ}/레그 절입. 레그마다 Z방향 교대 → X-로 강하. U/W 상대좌표, 매크로 미적용.`);
        if (infZ <= 0) warn.push('번개 X 1회 절입량이 0 → 단계당 1패스 사선으로 처리됩니다. 값 입력 권장.');
      }

      const L: string[] = [];
      const moves: any[] = [];
      L.push('%');
      L.push(`O0011 (OD TRAVERSE GRIND / ${selectedProject.name})`);
      L.push(`(WORK:P11-C1  WHEEL:P12  X=DIA  FEED:G98  ${useMacro ? 'MACRO-B' : zigOn ? 'ZIGZAG U/W' : 'EXPANDED'})`);
      warn.forEach(w => L.push(`(***확인필요*** ${w})`));
      if (useMacro) L.push('(***확인필요*** 커스텀매크로B(#변수/WHILE/IF) 지원 - 실제 SMX 확인)');
      L.push(`G0 G98 G80 G40 G${gCode}`);
      L.push('G18');
      L.push('G28 U0 W0');
      L.push(`T${tCode}`);
      L.push(`G400 B${bAng} J1 (***확인필요*** J=인선방향)`);
      L.push('(***확인필요*** 워크회전 P11 + 휠회전 P12 동시운용 계통/C1 비클램프)');
      L.push('M8');
      L.push(`G97 M3 S${sw} P12 (WHEEL Vc${vc}M/S @OD${wheelOd}=${sw}RPM)`);
      L.push(`G97 M3 S${workRpm} P11 (WORK ${workRpm}RPM)`);
      if (useMacro) L.push(`#100 = ${f3(d1)} (CURRENT DIA)`);
      L.push(`G0 X${xApproach} Z${f3(zStartLim)}`);
      moves.push({ x: parseFloat(xRetract), z: zStartLim, rapid: true, line: L.length - 1 });
      moves.push({ x: parseFloat(xApproach), z: zStartLim, rapid: true, line: L.length - 1 });

      let curDia = d1;
      const emitStage = (lbl: string, target: number, fr: any) => {
        if (target >= curDia - 1e-6) return;
        L.push(`(--- ${lbl} TRAVERSE -> DIA ${f3(target)}${zigOn ? ' (ZIGZAG U/W, X- 진행)' : ''} ---)`);
        if (zigOn) {
          // 번개(지그재그) 트래버스 — 한 레그 = 전체 Z를 사선으로 트래버스하며 X-로 1회 절입(절입량).
          //  · Z 이동(전체 스팬) 중에 절입이 일어남(=사선 1줄)  · 레그마다 Z 방향 교대 → X-로 내려가는 번개.
          const infD = Math.max(N(geo.zigzag_infeed) || 0, 0); // X 1회 절입량(직경, 레그당)
          L.push(`G1 X${f3(curDia)} F${fr}`); moves.push({ x: curDia, z: zStartLim, rapid: false, line: L.length - 1 }); // 시작단 표면 접촉
          let atStart = true, guard = 0;
          while (curDia > target + 1e-6 && guard < 100000) {
            guard++;
            const dropD = Math.min(infD > 1e-9 ? infD : (curDia - target), curDia - target);   // 이번 레그 X- 절입(직경)
            const w = atStart ? span : -span;                                                  // 전체 Z 트래버스(부호 교대)
            curDia -= dropD;
            L.push(`G1 U${sgnExpr(-dropD)} W${sgnExpr(w)} F${fr}`);                             // 사선: Z 이동하며 X- 절입
            moves.push({ x: curDia, z: atStart ? zEndLim : zStartLim, rapid: false, line: L.length - 1 });
            atStart = !atStart;
          }
          // 평탄화: 목표경 직선으로 잔류 사선(테이퍼) 정리 + 시작단 정렬
          L.push(`(--- LEVEL @DIA ${f3(target)} ---)`);
          if (!atStart) { L.push(`G1 W${sgnExpr(-span)} F${fr}`); moves.push({ x: target, z: zStartLim, rapid: false, line: L.length - 1 }); }
          else { L.push(`G1 W${sgnExpr(span)} F${fr}`); moves.push({ x: target, z: zEndLim, rapid: false, line: L.length - 1 }); L.push(`G1 W${sgnExpr(-span)} F${fr}`); moves.push({ x: target, z: zStartLim, rapid: false, line: L.length - 1 }); }
          curDia = target;
          return;
        }
        if (noInfeed) {
          L.push(`G1 X${f3(target)} F${fr}`); curDia = target; moves.push({ x: curDia, z: zStartLim, rapid: false, line: L.length - 1 });
          L.push(`G1 Z${f3(zEndLim)} F${fr}`); moves.push({ x: target, z: zEndLim, rapid: false, line: L.length - 1 });
          L.push(`G1 Z${f3(zStartLim)} F${fr}`); moves.push({ x: target, z: zStartLim, rapid: false, line: L.length - 1 });
          return;
        }
        if (useMacro) {
          // WHILE 매크로 방식 (직선 트래버스)
          L.push(`#101 = ${f3(target)}`);
          L.push(`WHILE [#100 GT #101] DO1`);
          L.push(`  #100 = #100 - ${f3(inS)}`);
          L.push(`  IF [#100 LT #101] THEN #100 = #101`);
          L.push(`  G1 X#100 F${fr}`); const lnInS = L.length - 1;
          L.push(`  G1 Z${f3(zEndLim)} F${fr}`); const lnTE = L.length - 1;
          L.push(`  #100 = #100 - ${f3(inE)}`);
          L.push(`  IF [#100 LT #101] THEN #100 = #101`);
          L.push(`  G1 X#100 F${fr}`); const lnInE = L.length - 1;
          L.push(`  G1 Z${f3(zStartLim)} F${fr}`); const lnTS = L.length - 1;
          L.push(`END1`);
          let guard = 0;
          while (curDia > target + 1e-6 && guard < 100000) {
            guard++;
            curDia = Math.max(curDia - inS, target);
            moves.push({ x: curDia, z: zStartLim, rapid: false, line: lnInS });
            moves.push({ x: curDia, z: zEndLim, rapid: false, line: lnTE });
            curDia = Math.max(curDia - inE, target);
            moves.push({ x: curDia, z: zEndLim, rapid: false, line: lnInE });
            moves.push({ x: curDia, z: zStartLim, rapid: false, line: lnTS });
          }
        } else {
          // 명시적 전개 (직선 트래버스)
          let guard = 0;
          while (curDia > target + 1e-6 && guard < 100000) {
            guard++;
            curDia = Math.max(curDia - inS, target);
            L.push(`G1 X${f3(curDia)} F${fr}`); moves.push({ x: curDia, z: zStartLim, rapid: false, line: L.length - 1 });
            L.push(`G1 Z${f3(zEndLim)} F${fr}`); moves.push({ x: curDia, z: zEndLim, rapid: false, line: L.length - 1 });
            curDia = Math.max(curDia - inE, target);
            L.push(`G1 X${f3(curDia)} F${fr}`); moves.push({ x: curDia, z: zEndLim, rapid: false, line: L.length - 1 });
            L.push(`G1 Z${f3(zStartLim)} F${fr}`); moves.push({ x: curDia, z: zStartLim, rapid: false, line: L.length - 1 });
          }
        }
      };

      const tgts: { lbl: string; t: number; f: any }[] = [];
      if (activeStages.rough) tgts.push({ lbl: 'ROUGH', t: d2 + roughOffset, f: cut.rough_fr });   // 황삭=목표경+황삭옵셋까지
      if (activeStages.finish) tgts.push({ lbl: 'FINISH', t: d2, f: cut.finish_fr });
      if (tgts.length) tgts[tgts.length - 1].t = d2; // 최종 단계는 목표경(d2)에 정확히 도달
      let prevT = d1;
      for (const s of tgts) { s.t = Math.min(Math.max(s.t, d2), prevT); prevT = s.t; } // 단조감소 + d2 클램프
      tgts.forEach(s => emitStage(s.lbl, s.t, s.f));

      const spk = Math.round(N(cut.spark_out) || 0);
      const spF = cut.finish_fr || cut.rough_fr;
      if (activeStages.spark && spk > 0) {
        L.push(`(--- SPARK OUT TRAVERSE x${spk}${zigOn ? ' (목표경 직선)' : ''} ---)`);
        if (zigOn) {
          for (let k = 0; k < spk; k++) {
            L.push(`G1 W${sgnExpr(span)} F${spF}`); moves.push({ x: curDia, z: zEndLim, rapid: false, line: L.length - 1 });
            L.push(`G1 W${sgnExpr(-span)} F${spF}`); moves.push({ x: curDia, z: zStartLim, rapid: false, line: L.length - 1 });
          }
        } else if (useMacro) {
          L.push(`#102 = 0`);
          L.push(`WHILE [#102 LT ${spk}] DO2`);
          L.push(`  G1 Z${f3(zEndLim)} F${spF}`); const lse = L.length - 1;
          L.push(`  G1 Z${f3(zStartLim)} F${spF}`); const lss = L.length - 1;
          L.push(`  #102 = #102 + 1`);
          L.push(`END2`);
          for (let k = 0; k < spk; k++) {
            moves.push({ x: curDia, z: zEndLim, rapid: false, line: lse });
            moves.push({ x: curDia, z: zStartLim, rapid: false, line: lss });
          }
        } else {
          for (let k = 0; k < spk; k++) {
            L.push(`G1 Z${f3(zEndLim)} F${spF}`); moves.push({ x: curDia, z: zEndLim, rapid: false, line: L.length - 1 });
            L.push(`G1 Z${f3(zStartLim)} F${spF}`); moves.push({ x: curDia, z: zStartLim, rapid: false, line: L.length - 1 });
          }
        }
      }
      // 번개(지그재그)모드 전용 마무리: 플런지식 대기(G4) + 비비기(전구간 직선 왕복)
      if (activeStages.spark && zigOn) {
        const dw = N(cut.spark_dwell) || 0;
        const rubN = Math.round(N(cut.spark_rub_n) || 0);
        const rubF = cut.spark_rub_feed || spF;
        if (dw > 0) { L.push(`(--- SPARK DWELL ${dw}s ---)`); L.push(`G4 X${dw.toFixed(1)}`); moves.push({ x: curDia, z: zStartLim, dwell: dw, rapid: false, line: L.length - 1 }); }
        if (rubN > 0) {
          L.push(`(--- SPARK RUB 전구간 비비기 x${rubN} ---)`);
          for (let k = 0; k < rubN; k++) {
            L.push(`G1 Z${f3(zEndLim)} F${rubF}`); moves.push({ x: curDia, z: zEndLim, rapid: false, line: L.length - 1 });
            L.push(`G1 Z${f3(zStartLim)} F${rubF}`); moves.push({ x: curDia, z: zStartLim, rapid: false, line: L.length - 1 });
          }
        }
      }

      L.push(`G0 X${xRetract}`);
      moves.push({ x: parseFloat(xRetract), z: zStartLim, rapid: true, line: L.length - 1 });
      L.push('M5 P12'); L.push('M5 P11'); L.push('M9'); L.push('G28 U0 W0'); L.push('M30'); L.push('%');

      const sim = { moves, wheelOd, wheelW: N(wheel.wheel_width) > 0 ? N(wheel.wheel_width) : 5, wheelWReal: N(wheel.wheel_width), d1, d2, zMin: Math.min(zStartLim, zEndLim), zMax: Math.max(zStartLim, zEndLim), grindWidth: Math.abs(ze - zs), offset: offsetMode, bAngle: bAng, bodyDir: (ze >= zs ? 1 : -1) };
      return { code: L.join('\n'), sim };
    };

    const handleGenerateNc = () => {
      if (selectedMenu === 'od_plunge') {
        const r = generateODPlunge();
        setNcCode(r.code); setNcSim(r.sim);
      } else if (selectedMenu === 'od_traverse') {
        const r = generateODTraverse();
        setNcCode(r.code); setNcSim(r.sim);
      } else {
        setNcCode(`(${currentMenuInfo?.label ?? ''} 사이클은 아직 NC 생성 미구현)\n(현재 OD 플런지 / OD 트래버스 지원)`);
        setNcSim(null);
      }
      setShowNc(true);
    };

    // 기능 ON/OFF 토글 노출 판단 로직
    const isRotaryTabOrMenu = activeTab === 'dresser_rotary' || selectedMenu === 'dress_rotary';
    const showHeaderToggle = activeTab === 'gauge' || isRotaryTabOrMenu;
    const toggleValue = isRotaryTabOrMenu ? useRotary : useGauge;
    const toggleSetter = isRotaryTabOrMenu ? setUseRotary : setUseGauge;
    const isOffStateBanner = (activeTab === 'gauge' && !useGauge) || (isRotaryTabOrMenu && !useRotary);

    // 현재 사이클 입력값 상황판 데이터 (형상+가공조건 전체, 활성 단계만)
    const geoMap: any = {
      od_plunge: odPlungeGeometryFields, od_traverse: odTraverseGeometryFields,
    };
    const cutMap: any = {
      od_plunge: odPlungeCuttingFields, od_traverse: odTraverseCuttingFields,
    };
    const boardFields = [...(geoMap[selectedMenu] || []), ...(cutMap[selectedMenu] || [])]
      .filter((f: any) => f && f.value !== undefined && f.type !== 'stageToggle' && f.type !== 'radioGroup' && (!f.stage || (activeStages as any)[f.stage]));
    const shortLabel = (s: string) => (s || '').split(' (')[0];

    return (
      <div className="flex flex-col h-full bg-slate-100">
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm z-10">
          <div className="flex items-center space-x-6">
            <button onClick={goToList} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 px-3 py-1 rounded text-[10px] font-black tracking-widest text-white italic uppercase">SMX SERIES</div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-slate-800 leading-tight">{selectedProject.name}</h1>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-72 bg-white border-r border-slate-200 p-5 space-y-4 z-0 overflow-y-auto">
            <div>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Grinding Cycles</div>
              <div className="space-y-2">
                {CYCLE_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleMenuChange(type.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all border-2 flex items-center ${
                        selectedMenu === type.id ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Icon size={20} className={`mr-3 ${selectedMenu === type.id ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-bold text-sm">{type.label}</div>
                        <div className={`text-[10px] ${selectedMenu === type.id ? 'text-blue-500/80' : 'text-slate-400'}`}>{type.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          <main className="flex-1 flex flex-col bg-slate-50">
            {/* 셋업 요약칩 (사이클 우선 운영: 공유 셋업을 사이클 안에서 한눈에 + 인라인 편집) */}
            {!isSetupMode && (
              <div className="px-8 pt-4">
                <div className="flex items-center gap-2 flex-wrap bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">셋업</span>
                  {([
                    { label: '휠Ø', val: paramValues['tool_setup:wheel_od'] ?? '350.000', def: !('tool_setup:wheel_od' in paramValues) },
                    { label: '휠폭', val: paramValues['tool_setup:wheel_width'] ?? '20.000', def: !('tool_setup:wheel_width' in paramValues) },
                    { label: 'T', val: paramValues['tool_setup:t_code'] ?? '0101', def: !('tool_setup:t_code' in paramValues) },
                    { label: '옵셋', val: offsetMode === 'x_plus' ? '외경X+' : offsetMode === 'x_minus' ? '내경X-' : '센터', def: offsetMode === 'x_plus' },
                    { label: 'B각', val: bAngle, def: parseFloat(bAngle) === 0 },
                    { label: 'G', val: paramValues['work_coord:g_code'] ?? '54', def: !('work_coord:g_code' in paramValues) },
                  ]).map((c, i) => (
                    <button key={i} onClick={() => setShowSetupPanel(true)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${c.def ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`} title={c.def ? '기본값 (확인/수정 권장)' : '설정됨'}>
                      <span className="text-[10px] text-slate-400">{c.label}</span>{c.val}
                    </button>
                  ))}
                  <button onClick={() => setShowSetupPanel(s => !s)} className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
                    <Settings size={13} /> 셋업 편집 {showSetupPanel ? '▴' : '▾'}
                  </button>
                </div>
                {showSetupPanel && (
                  <div className="mt-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-3 gap-3">
                    {([
                      { k: 'tool_setup:wheel_od', lbl: '휠 외경 (mm)', def: '350.000' },
                      { k: 'tool_setup:wheel_width', lbl: '휠 폭 (mm)', def: '20.000' },
                      { k: 'tool_setup:t_code', lbl: '공구번호 (T)', def: '0101' },
                      { k: 'work_coord:g_code', lbl: '워크좌표 (G)', def: '54' },
                    ]).map((f, i) => (
                      <label key={i} className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-500">{f.lbl}</span>
                        <input value={paramValues[f.k] ?? f.def} onChange={(e) => setParamValues((p: any) => ({ ...p, [f.k]: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500" />
                      </label>
                    ))}
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500">B축 각도 (deg)</span>
                      <input value={bAngle} onChange={(e) => setBAngle(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500" />
                    </label>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500">옵셋 기준</span>
                      <div className="flex gap-1">
                        {[{ v: 'x_plus', l: '외경X+' }, { v: 'x_minus', l: '내경X-' }, { v: 'center', l: '센터' }].map(o => (
                          <button key={o.v} onClick={() => setOffsetMode(o.v)} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${offsetMode === o.v ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{o.l}</button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 md:col-span-3 flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 mt-1">
                      <span className="text-[11px] font-bold text-slate-500">상세 설정:</span>
                      <button onClick={() => handleMenuChange('tool_setup')} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-1"><PenTool size={13} /> 공구 설정 (드레서·옵셋) →</button>
                      <button onClick={() => handleMenuChange('work_coord')} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-1"><Crosshair size={13} /> 워크좌표 (원점·측정) →</button>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1"><Info size={12} /> 셋업은 모든 사이클 공유</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* 현재 사이클 입력값 상황판 */}
            {!isSetupMode && boardFields.length > 0 && (
              <div className="px-8 pt-2">
                <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">현재 사이클</span>
                  {boardFields.map((f: any, i: number) => {
                    const v = paramValues[`${selectedMenu}:${f.id}`] ?? f.value;
                    const edited = `${selectedMenu}:${f.id}` in paramValues;
                    return (
                      <span key={i} onMouseEnter={() => setActiveField(f.id)} className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold cursor-default ${edited ? 'bg-white border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`} title={f.desc}>
                        <span className="text-[9px] text-slate-400">{shortLabel(f.label)}</span>{v}<span className="text-[9px] text-slate-400">{f.unit}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <nav className="flex px-8 pt-6 space-x-2">
              {getTabs().map((tab) => {
                let activeColorClass = 'bg-white border-blue-100 border-t-blue-500 text-blue-600 shadow-sm';
                if (isSetupMode) activeColorClass = 'bg-white border-emerald-100 border-t-emerald-500 text-emerald-700 shadow-sm';
                else if (isDressingMode) activeColorClass = 'bg-white border-amber-200 border-t-amber-500 text-amber-700 shadow-sm';
                
                if (tab.id === 'gauge') activeColorClass = 'bg-white border-indigo-200 border-t-indigo-500 text-indigo-700 shadow-sm'; 

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 rounded-t-xl text-sm font-bold transition-all border-t-2 border-x-2 ${
                      activeTab === tab.id 
                      ? `${activeColorClass} -mb-[2px] z-10` 
                      : 'bg-slate-200/50 border-transparent text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </nav>

            <div className="flex-1 m-6 mt-0 p-8 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm flex space-x-10 overflow-hidden">
              
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-200 relative overflow-hidden">
                <div className="absolute top-5 left-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center z-10">
                  <Maximize2 size={14} className="mr-2" /> 
                  {activeTab === 'gauge' ? 'IN-PROCESS GAUGE' : activeTab === 'dresser_rotary' || selectedMenu === 'dress_rotary' ? 'ROTARY DRESSER' : currentMenuInfo?.label}
                </div>
                
                {/* 0. 실시간 측정 (Gauge) 전용 다이어그램 */}
                {activeTab === 'gauge' && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    <rect x="100" y="60" width="200" height="80" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                    <text x="200" y="105" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">Workpiece</text>
                    
                    <path d="M 200,60 L 200,20 L 280,20 L 280,0" stroke="#4f46e5" strokeWidth="3" fill="none" />
                    <path d="M 200,140 L 200,180 L 280,180 L 280,200" stroke="#4f46e5" strokeWidth="3" fill="none" />
                    <polygon points="195,60 205,60 200,65" fill="#4f46e5" />
                    <polygon points="195,140 205,140 200,135" fill="#4f46e5" />

                    <rect x="250" y="90" width="60" height="20" fill="#4f46e5" rx="4" />
                    <text x="280" y="104" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">GAUGE</text>
                    
                    <path d="M 280,20 L 280,90" stroke="#4f46e5" strokeWidth="2" strokeDasharray="4" />
                    <path d="M 280,180 L 280,110" stroke="#4f46e5" strokeWidth="2" strokeDasharray="4" />
                  </svg>
                )}

                {/* 1. 워크좌표계 (소재) */}
                {selectedMenu === 'work_coord' && activeTab === 'coord_work' && (
                  <div className="w-full h-full relative flex items-center justify-center">
                    <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                      <rect x="50" y="50" width="60" height="100" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="110" y1="50" x2="110" y2="150" stroke="#94a3b8" strokeWidth="2" />
                      <rect x="110" y="70" width="140" height="60" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="40" y1="100" x2="330" y2="100" stroke="#10b981" strokeWidth="2" strokeDasharray="5,5" />
                      <polygon points="330,95 340,100 330,105" fill="#10b981" />
                      <text x="345" y="104" fill="#10b981" fontSize="14" fontWeight="bold">+Z</text>
                      <line x1="250" y1="140" x2="250" y2="30" stroke="#10b981" strokeWidth="2" />
                      <polygon points="245,30 250,20 255,30" fill="#10b981" />
                      <text x="242" y="15" fill="#10b981" fontSize="14" fontWeight="bold">+X</text>
                      
                      <circle cx="250" cy="100" r="16" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2,2" />
                      <circle cx="250" cy="100" r="4" fill="#f59e0b" />
                    </svg>
                    <button onClick={handleMeasureWorkCoord} className="absolute flex flex-col items-center justify-center top-[55%] left-[58%] transform translate-x-4 translate-y-4 bg-white/90 hover:bg-emerald-50 border-2 border-emerald-500 text-emerald-700 rounded-xl p-2 shadow-lg transition-all z-20 group">
                      <div className="flex items-center space-x-1 font-black text-xs"><Focus size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" /><span>위치 측정</span></div>
                      <span className="text-[9px] text-emerald-600/80 font-bold mt-0.5">현재 핸들 좌표 입력</span>
                    </button>
                  </div>
                )}

                {/* 1-2. 워크좌표계 (드레서 - 싱글) */}
                {selectedMenu === 'work_coord' && activeTab === 'coord_dresser_single' && (
                  <div className="w-full h-full relative flex flex-col items-center justify-center">
                    <div className="relative mb-4">
                      <svg viewBox="0 0 400 240" className="w-full max-w-md drop-shadow-sm">
                        {/* L-shaped Dresser body */}
                        <path d="M 120,60 L 180,60 L 180,160 L 280,160 L 280,220 L 120,220 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
                        
                        {/* Tip 1 (Top) */}
                        <path d="M 120,60 L 150,20 L 180,60 Z" fill={activeSingleDressers.d1 ? "#d97706" : "#e2e8f0"} stroke={activeSingleDressers.d1 ? "#b45309" : "#cbd5e1"} strokeWidth="1" />
                        <text x="100" y="45" fill={activeSingleDressers.d1 ? "#64748b" : "#94a3b8"} fillOpacity={activeSingleDressers.d1 ? 1 : 0.3} fontSize="28" fontWeight="black" className="font-mono">1</text>
                        
                        {/* Tip 2 (Right) */}
                        <path d="M 280,160 L 320,190 L 280,220 Z" fill={activeSingleDressers.d2 ? "#d97706" : "#e2e8f0"} stroke={activeSingleDressers.d2 ? "#b45309" : "#cbd5e1"} strokeWidth="1" />
                        <text x="330" y="185" fill={activeSingleDressers.d2 ? "#64748b" : "#94a3b8"} fillOpacity={activeSingleDressers.d2 ? 1 : 0.3} fontSize="28" fontWeight="black" className="font-mono">2</text>

                        {/* Labels */}
                        <text x="200" y="240" textAnchor="middle" fill="#64748b" fontSize="14" fontWeight="bold">Single Point Dresser</text>
                      </svg>
                    </div>
                    {(activeSingleDressers.d1 || activeSingleDressers.d2) && (
                      <button onClick={handleMeasureDresserCoord} className="flex flex-col items-center justify-center bg-white/90 hover:bg-emerald-50 border-2 border-emerald-500 text-emerald-700 rounded-xl p-3 shadow-lg transition-all z-20 group">
                        <div className="flex items-center space-x-2 font-black text-sm">
                          <Focus size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                          <span>{activeSingleDressers.d1 && activeSingleDressers.d2 ? '전체 위치 측정' : activeSingleDressers.d1 ? '1번 위치 측정' : '2번 위치 측정'}</span>
                        </div>
                        <span className="text-[10px] text-emerald-600/80 font-bold mt-1">
                          {activeSingleDressers.d1 && activeSingleDressers.d2 ? '1번/2번 좌표 일괄 입력' : activeSingleDressers.d1 ? '1번 좌표 현재 핸들값 입력' : '2번 좌표 현재 핸들값 입력'}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* 1-3. 워크좌표계 (드레서 - 로터리) */}
                {selectedMenu === 'work_coord' && activeTab === 'coord_dresser_rotary' && (
                  <div className="w-full h-full relative flex items-center justify-center">
                    <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                      <path d="M 50,20 L 350,20 L 350,160 L 260,160 L 260,70 L 50,70 Z" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
                      
                      <circle cx="210" cy="110" r="30" fill={useRotaryOrigin ? "#cbd5e1" : "#f1f5f9"} stroke={useRotaryOrigin ? "#94a3b8" : "#e2e8f0"} strokeWidth="2" />
                      <circle cx="210" cy="110" r="8" fill={useRotaryOrigin ? "#94a3b8" : "#e2e8f0"} />
                      <path d="M 210,90 A 20 20 0 0 1 230 110" stroke={useRotaryOrigin ? "#f59e0b" : "#cbd5e1"} strokeWidth="2" fill="none" strokeLinecap="round" />

                      <line x1="100" y1="110" x2="300" y2="110" stroke={useRotaryOrigin ? "#10b981" : "#cbd5e1"} strokeWidth="2" strokeDasharray="5,5" />
                      <polygon points="300,105 310,110 300,115" fill={useRotaryOrigin ? "#10b981" : "#cbd5e1"} />
                      <text x="315" y="114" fill={useRotaryOrigin ? "#10b981" : "#cbd5e1"} fillOpacity={useRotaryOrigin ? 1 : 0.3} fontSize="14" fontWeight="bold">+Z</text>
                      <line x1="210" y1="160" x2="210" y2="30" stroke={useRotaryOrigin ? "#10b981" : "#cbd5e1"} strokeWidth="2" />
                      <polygon points="205,30 210,20 215,30" fill={useRotaryOrigin ? "#10b981" : "#cbd5e1"} />
                      <text x="202" y="15" fill={useRotaryOrigin ? "#10b981" : "#cbd5e1"} fillOpacity={useRotaryOrigin ? 1 : 0.3} fontSize="14" fontWeight="bold">+X</text>
                      <circle cx="210" cy="110" r="16" fill="none" stroke={useRotaryOrigin ? "#f59e0b" : "#cbd5e1"} strokeWidth="2" strokeDasharray="2,2"/>
                      <circle cx="210" cy="110" r="4" fill={useRotaryOrigin ? "#f59e0b" : "#cbd5e1"} />
                    </svg>
                    {useRotaryOrigin && (
                      <button onClick={handleMeasureDresserCoord} className="absolute flex flex-col items-center justify-center top-[55%] left-[52.5%] transform -translate-x-12 translate-y-6 bg-white/90 hover:bg-emerald-50 border-2 border-emerald-500 text-emerald-700 rounded-xl p-2 shadow-lg transition-all z-20 group">
                        <div className="flex items-center space-x-1 font-black text-xs"><Focus size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" /><span>위치 측정</span></div>
                        <span className="text-[9px] text-emerald-600/80 font-bold mt-0.5">현재 핸들 좌표 입력</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 2. 공구 설정 (휠) */}
                {selectedMenu === 'tool_setup' && activeTab === 'wheel' && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    {offsetMode === 'x_plus' && (
                      <g>
                        <rect x="50" y="100" width="150" height="60" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                        <circle cx="250" cy="50" r="50" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" />
                        <circle cx="250" cy="100" r="6" fill="#f43f5e" />
                        <line x1="250" y1="100" x2="280" y2="100" stroke="#f43f5e" strokeWidth="2" />
                        <text x="285" y="105" fill="#f43f5e" fontSize="12" fontWeight="bold">옵셋 (X+)</text>
                      </g>
                    )}
                    {offsetMode === 'x_minus' && (
                      <g>
                        <path d="M50,50 L350,50 L350,150 L50,150 L50,120 L280,120 L280,80 L50,80 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                        <circle cx="150" cy="100" r="20" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" />
                        <circle cx="150" cy="80" r="6" fill="#f43f5e" />
                        <line x1="150" y1="80" x2="180" y2="80" stroke="#f43f5e" strokeWidth="2" />
                        <text x="185" y="85" fill="#f43f5e" fontSize="12" fontWeight="bold">옵셋 (X-)</text>
                      </g>
                    )}
                    {offsetMode === 'center' && (
                      <g>
                        <rect x="250" y="80" width="100" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                        <polygon points="100,80 200,80 220,100 200,120 100,120" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" />
                        <circle cx="220" cy="100" r="6" fill="#f43f5e" />
                        <line x1="220" y1="100" x2="250" y2="100" stroke="#f43f5e" strokeWidth="2" />
                        <text x="200" y="140" fill="#f43f5e" fontSize="12" fontWeight="bold">옵셋 (Center)</text>
                      </g>
                    )}
                  </svg>
                )}

                {/* 2-2. 공구 설정 (싱글포인트 드레서) */}
                {selectedMenu === 'tool_setup' && activeTab === 'dresser' && (
                  <div className="w-full h-full relative flex flex-col items-center justify-center">
                    <svg viewBox="0 0 400 240" className="w-full max-w-md drop-shadow-sm">
                      {/* L-shaped Dresser body */}
                      <path d="M 120,60 L 180,60 L 180,160 L 280,160 L 280,220 L 120,220 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
                      
                      {/* Tip 1 (Top) */}
                      <path d="M 120,60 L 150,20 L 180,60 Z" fill={activeSingleDressers.d1 ? "#d97706" : "#e2e8f0"} stroke={activeSingleDressers.d1 ? "#b45309" : "#cbd5e1"} strokeWidth="1" />
                      <text x="100" y="45" fill={activeSingleDressers.d1 ? "#64748b" : "#94a3b8"} fillOpacity={activeSingleDressers.d1 ? 1 : 0.3} fontSize="28" fontWeight="black" className="font-mono">1</text>
                      
                      {/* Tip 2 (Right) */}
                      <path d="M 280,160 L 320,190 L 280,220 Z" fill={activeSingleDressers.d2 ? "#d97706" : "#e2e8f0"} stroke={activeSingleDressers.d2 ? "#b45309" : "#cbd5e1"} strokeWidth="1" />
                      <text x="330" y="185" fill={activeSingleDressers.d2 ? "#64748b" : "#94a3b8"} fillOpacity={activeSingleDressers.d2 ? 1 : 0.3} fontSize="28" fontWeight="black" className="font-mono">2</text>

                      {/* Labels */}
                      <text x="200" y="240" textAnchor="middle" fill="#64748b" fontSize="14" fontWeight="bold">Single Point Dresser Spec</text>
                    </svg>
                  </div>
                )}

                {/* 2-3. 공구 설정 (로터리 드레서 신규 추가) */}
                {selectedMenu === 'tool_setup' && activeTab === 'dresser_rotary' && useRotary && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    <circle cx="200" cy="100" r="45" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
                    <circle cx="200" cy="100" r="10" fill="#94a3b8" />
                    <path d="M 200,75 A 25 25 0 0 1 225 100" stroke="#f59e0b" strokeWidth="3" fill="none" markerEnd="url(#arrow)" strokeLinecap="round" />
                    <text x="200" y="170" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">Rotary Dresser Tool</text>
                  </svg>
                )}

                {/* 2-4. 밀링 스핀들 각도 (B축) 다이어그램 신규 추가 */}
                {selectedMenu === 'tool_setup' && activeTab === 'spindle_angle' && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    <circle cx="200" cy="180" r="100" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="5,5" />
                    <g style={{ transform: `rotate(${parseFloat(bAngle) || 0}deg)`, transformOrigin: '200px 180px', transition: 'transform 0.5s ease-out' }}>
                      <rect x="175" y="60" width="50" height="120" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
                      <rect x="185" y="20" width="30" height="40" fill="#94a3b8" stroke="#64748b" strokeWidth="2" />
                      <circle cx="200" cy="180" r="8" fill="#f43f5e" />
                      <line x1="200" y1="180" x2="200" y2="40" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4,2" />
                    </g>
                    <line x1="200" y1="180" x2="200" y2="50" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                    <text x="200" y="40" fill="#94a3b8" fontSize="10" textAnchor="middle">0° (Vertical)</text>
                    <text x="200" y="195" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">B-Axis Milling Spindle</text>
                  </svg>
                )}


                {/* 외경 연삭 (Plunge/Traverse) 치수 다이어그램 - 입력 포커스/호버 시 해당 부위 하이라이트 */}
                {(selectedMenu === 'od_plunge' || selectedMenu === 'od_traverse') && activeTab !== 'gauge' && (() => {
                  const dgf: any[] = selectedMenu === 'od_traverse' ? odTraverseGeometryFields : odPlungeGeometryFields;
                  const dgn = (id: string) => { const f: any = dgf.find((x: any) => x.id === id); return f ? parseFloat(gv(f)) : 0; };
                  return <CycleDiagram menu={selectedMenu} tab={activeTab} field={activeField} zs={dgn('z_start')} ze={dgn('z_end')} d1v={dgn('d1')} d2v={dgn('d2')} />;
                })()}
                
              </div>

              {/* 입력 폼 영역 */}
              <div className="w-[460px] flex flex-col h-full bg-white relative">
                
                {showMeasureEffect && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-xs flex items-center z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <Focus size={14} className="mr-2" /> 핸들 위치 좌표가 적용되었습니다!
                  </div>
                )}

                {/* 탭 헤더 영역 */}
                <div className="flex items-center justify-between mb-4 px-1 pb-3 border-b border-slate-100">
                  <div className="flex items-center">
                    {activeTab === 'gauge' ? <Activity size={18} className="text-indigo-500 mr-2" /> :
                     isSetupMode ? <Settings size={18} className="text-emerald-500 mr-2" /> : 
                     isDressingMode ? <Wrench size={18} className="text-amber-500 mr-2" /> : 
                     <Settings size={18} className="text-blue-500 mr-2" />}
                    <span className="text-sm font-black text-slate-700 uppercase tracking-widest">
                      {activeTab === 'gauge' ? 'In-Process Gauge' : activeTab === 'dresser_rotary' || selectedMenu === 'dress_rotary' ? 'Rotary Dresser Params' : `${currentMenuInfo?.label} Params`}
                    </span>
                  </div>
                  
                  {/* 개발 미정 기능 TBD 토글 스위치 렌더링 로직 */}
                  {(activeTab === 'gauge' || activeTab === 'dresser_rotary' || selectedMenu === 'dress_rotary' || activeTab === 'coord_dresser_single' || activeTab === 'dresser' || activeTab === 'coord_dresser_rotary' || activeTab === 'cutting') && (
                    <div className="flex items-center space-x-4">
                      {(activeTab === 'coord_dresser_single' || activeTab === 'dresser') ? (
                        <>
                          <label className="relative inline-flex items-center cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={activeSingleDressers.d1} 
                              onChange={() => setActiveSingleDressers({...activeSingleDressers, d1: !activeSingleDressers.d1})} 
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all shadow-inner peer-checked:bg-amber-500"></div>
                            <span className={`ml-2 text-[10px] font-black uppercase ${activeSingleDressers.d1 ? 'text-amber-600' : 'text-slate-400'}`}>D1 {activeSingleDressers.d1 ? 'ON' : 'OFF'}</span>
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={activeSingleDressers.d2} 
                              onChange={() => setActiveSingleDressers({...activeSingleDressers, d2: !activeSingleDressers.d2})} 
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all shadow-inner peer-checked:bg-amber-500"></div>
                            <span className={`ml-2 text-[10px] font-black uppercase ${activeSingleDressers.d2 ? 'text-amber-600' : 'text-slate-400'}`}>D2 {activeSingleDressers.d2 ? 'ON' : 'OFF'}</span>
                          </label>
                        </>
                      ) : activeTab === 'coord_dresser_rotary' ? (
                        <label className="relative inline-flex items-center cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={useRotaryOrigin} 
                            onChange={() => setUseRotaryOrigin(!useRotaryOrigin)} 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner peer-checked:bg-amber-500"></div>
                          <span className={`ml-2 text-xs font-black uppercase ${useRotaryOrigin ? 'text-amber-600' : 'text-slate-400'}`}>
                            {useRotaryOrigin ? 'ON' : 'OFF'}
                          </span>
                        </label>
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={activeTab === 'gauge' ? useGauge : useRotary} 
                            onChange={() => activeTab === 'gauge' ? setUseGauge(!useGauge) : setUseRotary(!useRotary)} 
                          />
                          <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner ${activeTab === 'gauge' ? 'peer-checked:bg-indigo-500' : 'peer-checked:bg-amber-500'}`}></div>
                          <span className={`ml-2 text-xs font-black uppercase ${
                            (activeTab === 'gauge' && useGauge) ? 'text-indigo-600' : 
                            ((activeTab === 'dresser_rotary' || selectedMenu === 'dress_rotary') && useRotary) ? 'text-amber-600' : 'text-slate-400'
                          }`}>
                            {(activeTab === 'gauge' ? useGauge : useRotary) ? 'ON' : 'OFF'}
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6">
                  
                  {/* 개발 미정 기능이 꺼져있을 경우 안내 메시지 표시 */}
                  {((activeTab === 'gauge' && !useGauge) || ((activeTab === 'dresser_rotary' || selectedMenu === 'dress_rotary') && !useRotary)) ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 mt-4">
                       {activeTab === 'gauge' ? <Activity size={48} className="mb-4 text-slate-300" /> : <RefreshCw size={48} className="mb-4 text-slate-300" />}
                       <span className="text-sm font-bold text-slate-500">
                         {activeTab === 'gauge' ? '실시간 측정 게이지 기능이 비활성화 상태입니다.' : '로터리 드레서 기능이 비활성화 상태입니다.'}
                       </span>
                       <span className="text-xs mt-2 text-slate-400 max-w-[250px] text-center leading-relaxed">이 기능은 향후 지원 예정(TBD)입니다.<br/>상단의 스위치를 켜면 UI를 미리 확인할 수 있습니다.</span>
                    </div>
                  ) : (
                    // 기존 동적 폼 렌더링
                    <div className={selectedMenu === 'tool_setup' && activeTab === 'dresser' ? "border-2 border-white p-3 rounded-xl space-y-4" : "space-y-4"}>
                      {getActiveFields().map((field, idx) => {
                      let focusColor = 'focus:border-blue-500';
                      let helpColor = 'text-blue-400';
                      let activeBg = 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm';

                      if (activeTab === 'gauge') {
                        focusColor = 'focus:border-indigo-500'; 
                        helpColor = 'text-indigo-500'; 
                        activeBg = 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm';
                      } else if (isSetupMode) { 
                        focusColor = 'focus:border-emerald-500'; 
                        helpColor = 'text-emerald-500'; 
                        activeBg = 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm';
                      } else if (isDressingMode) { 
                        focusColor = 'focus:border-amber-500'; 
                        helpColor = 'text-amber-500'; 
                        activeBg = 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm';
                      }

                      // 단계별 토글(Stage Toggle) 커스텀 필드
                      if (field.type === 'stageToggle') {
                        const isActive = activeStages[field.stageKey];
                        
                        let toggleActiveBg = 'bg-blue-50 border-blue-200';
                        let toggleActiveText = 'text-blue-800';
                        let toggleActiveIcon = 'text-blue-600';
                        let toggleSwitchBg = 'peer-checked:bg-blue-600';

                        if (isDressingMode) {
                            toggleActiveBg = 'bg-amber-50 border-amber-200';
                            toggleActiveText = 'text-amber-800';
                            toggleActiveIcon = 'text-amber-600';
                            toggleSwitchBg = 'peer-checked:bg-amber-600';
                        }

                        return (
                          <div key={idx} className={`flex items-center justify-between mt-8 mb-3 p-3 rounded-xl border transition-all ${isActive ? toggleActiveBg : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                            <div className="flex items-center">
                              {isActive ? <Play size={16} className={`${toggleActiveIcon} mr-2`} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-3 ml-1" />}
                              <span className={`text-sm font-black uppercase tracking-wide ${isActive ? toggleActiveText : 'text-slate-500'}`}>{field.label}</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" checked={isActive} onChange={() => toggleStage(field.stageKey)} />
                              <div className={`w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${toggleSwitchBg}`}></div>
                            </label>
                          </div>
                        );
                      }

                      // 해당 단계(stage)가 꺼져있으면 내부 필드를 렌더링하지 않음
                      if (field.stage && !activeStages[field.stage]) {
                        return null;
                      }

                      // Radio Group 커스텀 필드
                      if (field.type === 'radioGroup') {
                        const currentValue = field.id === 'offset_mode' ? offsetMode : 
                                             field.id === 'dress_direction' ? dressDirection : 
                                             field.id === 'gap_sensor' ? gapSensor : measureMode;
                                             
                        const setter = field.id === 'offset_mode' ? setOffsetMode : 
                                       field.id === 'dress_direction' ? setDressDirection : 
                                       field.id === 'gap_sensor' ? setGapSensor : setMeasureMode;

                        return (
                          <div key={idx} onMouseEnter={() => setActiveField(field.id)} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-bold text-slate-700">{field.label}</label>
                            </div>
                            <div className="flex space-x-2 mb-2">
                              {field.options.map(opt => (
                                <button
                                  key={opt.val}
                                  onClick={() => setter(opt.val)}
                                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                                    currentValue === opt.val 
                                    ? activeBg 
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            {field.desc && (
                                <div className="flex items-start text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg mt-2">
                                  <HelpCircle size={12} className={`mr-1.5 mt-0.5 shrink-0 ${helpColor}`} />
                                  <span className="leading-tight">{field.desc}</span>
                                </div>
                            )}
                          </div>
                        );
                      }

                      // 기본 텍스트 입력 필드
                      const fieldKey = `${selectedMenu}:${field.id}`;
                      const curStr = (paramValues[fieldKey] ?? field.value) as string;
                      const hasCalc = (field.id === 'work_rpm' || field.id === 'wheel_vc' || field.id === 'wheel_rpm' || field.id === 'rotary_rpm');
                      const numVal = parseFloat(curStr);
                      const isNumeric = !isNaN(numVal) && field.unit !== 'G' && field.unit !== 'T';
                      const decs = (String(field.value).split('.')[1] || '').length;
                      const stepSize = field.unit === 'rpm' ? 10 : field.unit === 'mm/min' ? (numVal >= 10 ? 10 : 0.1) : field.unit === 'mm' ? 0.1 : field.unit === '%' ? 0.1 : 1;
                      const noNeg = (field.unit === 'rpm' || field.unit === 'mm/min' || field.unit === 'm/s' || field.unit === '%');
                      const setTyped = (v: string) => { handleFieldChange(field.id, v); setParamValues((prev: any) => ({ ...prev, [fieldKey]: v })); };
                      const applyStep = (dir: number) => {
                        let nv = (isNaN(numVal) ? 0 : numVal) + dir * stepSize;
                        if (noNeg && nv < 0) nv = 0;
                        setTyped(nv.toFixed(decs));
                      };
                      return (
                        <div key={idx} className={`bg-white rounded-xl border p-4 shadow-sm transition-all duration-300 ${showMeasureEffect && (field.id === 'z_offset' || field.id === 'x_offset') ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-700">{field.label}</label>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">{field.unit}</span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={curStr}
                              onFocus={() => setActiveField(field.id)}
                              onMouseEnter={() => setActiveField(field.id)}
                              onChange={(e) => setTyped(e.target.value)}
                              className={`w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 text-lg font-mono focus:outline-none focus:bg-white transition-colors ${showMeasureEffect && (field.id === 'z_offset' || field.id === 'x_offset') ? 'text-emerald-700 font-black' : 'text-slate-800'} ${focusColor} ${(hasCalc && isNumeric) ? 'pr-28' : (hasCalc || isNumeric) ? 'pr-16' : ''}`}
                            />
                            <div className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center gap-1">
                              {hasCalc && (
                                <button
                                  onClick={() => openCalculator(field)}
                                  className={`px-2 h-full rounded-lg transition-all border shadow-sm flex items-center justify-center ${
                                    activeTab === 'gauge' ? 'text-indigo-600 hover:bg-indigo-50 border-indigo-100' :
                                    isSetupMode ? 'text-emerald-600 hover:bg-emerald-50 border-emerald-100' :
                                    isDressingMode ? 'text-amber-600 hover:bg-amber-50 border-amber-100' :
                                    'text-blue-600 hover:bg-blue-50 border-blue-100'
                                  }`}
                                >
                                  <Activity size={18} />
                                </button>
                              )}
                              {isNumeric && (
                                <div className="flex flex-col h-full justify-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                  <button type="button" aria-label="증가" onClick={() => applyStep(1)} className="flex-1 px-1.5 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100"><ChevronUp size={14} /></button>
                                  <button type="button" aria-label="감소" onClick={() => applyStep(-1)} className="flex-1 px-1.5 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100 border-t border-slate-200"><ChevronDown size={14} /></button>
                                </div>
                              )}
                            </div>
                          </div>
                          {field.desc && (
                              <div className="flex items-start text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg mt-2">
                                <HelpCircle size={12} className={`mr-1.5 mt-0.5 shrink-0 ${helpColor}`} />
                                <span className="leading-tight">{field.desc}</span>
                              </div>
                          )}
                        </div>
                      )
                      })}
                      
                      {/* 플런지 툴패스 (자동분할 없음 · 가공시작부터 휠폭씩, 남으면 추가) */}
                      {selectedMenu === 'od_plunge' && activeTab === 'geometry' && (() => {
                        const gwv = Math.abs(parseFloat(paramValues['od_plunge:width'] ?? '25.000') || 0);
                        const wwv = parseFloat(paramValues['tool_setup:wheel_width'] ?? '20.000') || 0;
                        const eff = plungePaths.length > 0 ? plungePaths : [Math.min(wwv || gwv, gwv)]; // 표시용 패스 목록
                        const sumW = eff.reduce((a, b) => a + (Number(b) || 0), 0);
                        const remain = gwv - sumW;
                        const commit = (arr: number[]) => setPlungePaths(arr);
                        return (
                          <div className="mt-2 p-4 bg-blue-50/40 border border-blue-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-blue-700">플런지 툴패스 (가공길이 {gwv} / 휠폭 {wwv})</span>
                              <span className="text-[10px] font-mono text-slate-500">{eff.length}패스 · 남은 {remain.toFixed(2)}mm</span>
                            </div>
                            <div className="space-y-1">
                              {eff.map((w, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-500 w-12">패스{i + 1}</span>
                                  <input type="number" value={w} onChange={(e) => { const a = [...eff]; a[i] = parseFloat(e.target.value) || 0; commit(a); }} className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-mono text-slate-800 focus:outline-none focus:border-blue-500" />
                                  <span className={`text-[10px] ${Number(w) > wwv + 1e-6 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>mm {Number(w) > wwv + 1e-6 ? '(휠폭 초과!)' : ''}</span>
                                  {eff.length > 1 && <button onClick={() => commit(eff.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500"><Trash2 size={12} /></button>}
                                </div>
                              ))}
                            </div>
                            <button onClick={() => commit([...eff, Math.min(wwv || gwv, Math.max(0.001, remain))])} disabled={remain <= 0.001} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${remain > 0.001 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}><Plus size={12} /> 툴패스 추가</button>
                            <div className="text-[10px] text-slate-500">각 패스 = 가공시작에서 이어서 해당 길이만큼 황삭+정삭 플런지. 길이는 휠폭 이하로 입력하세요.</div>
                          </div>
                        );
                      })()}

                      {/* 가공 좌표 계산 결과 요약 (Plunge 전용) */}
                      {(selectedMenu === 'od_plunge' || selectedMenu === 'id_plunge' || selectedMenu === 'face_plunge') && activeTab === 'geometry' && (() => {
                        let startX = '50.000';
                        let startZ = '100.000';
                        let endX = '48.500';
                        let endZ = '75.000';

                        if (selectedMenu === 'id_plunge') {
                          startX = '48.500';
                          startZ = '100.000';
                          endX = '50.000';
                          endZ = '125.000';
                        } else if (selectedMenu === 'face_plunge') {
                          startX = '50.000';
                          startZ = '100.000';
                          endX = '50.000';
                          endZ = '98.500';
                        }

                        return (
                          <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-sm border-l-4 border-l-blue-500">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                              <div className="flex items-center text-blue-600">
                                <Activity size={14} className="mr-1.5" /> 
                                가공 점 좌표 요약 (Point Coordinates)
                              </div>
                              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">Calculated</span>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-1 mb-1">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">시작 좌표 (P1)</span>
                                </div>
                                <div className="flex flex-col pl-3 border-l border-slate-200">
                                  <span className="text-xs font-mono font-bold text-slate-700"><span className="text-slate-400 mr-1">X:</span>{startX}</span>
                                  <span className="text-xs font-mono font-bold text-slate-700"><span className="text-slate-400 mr-1">Z:</span>{startZ}</span>
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-1 mb-1">
                                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">종료 좌표 (P2)</span>
                                </div>
                                <div className="flex flex-col pl-3 border-l border-slate-200">
                                  <span className="text-xs font-mono font-bold text-slate-700"><span className="text-slate-400 mr-1">X:</span>{endX}</span>
                                  <span className="text-xs font-mono font-bold text-slate-700"><span className="text-slate-400 mr-1">Z:</span>{endZ}</span>
                                </div>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-slate-100 text-[9px] text-slate-400 italic">
                              * 입력된 직경(D) 및 Z축 시작/종료 위치를 기반으로 산출된 좌표입니다.
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>

        <footer className="h-20 bg-white border-t border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex space-x-3">
            <button onClick={handleGenerateNc} className="flex items-center px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
              <FileText size={16} className="mr-2" /> NC 코드
            </button>
            {selectedMenu === 'od_traverse' && (
              <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold overflow-hidden">
                <span className="px-2.5 text-slate-400">출력</span>
                <button onClick={() => setTravUseMacro(true)} className={`px-3 py-2.5 transition-colors ${travUseMacro ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>WHILE</button>
                <button onClick={() => setTravUseMacro(false)} className={`px-3 py-2.5 transition-colors ${!travUseMacro ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>전개</button>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <button className={`px-10 py-3 text-white rounded-xl font-black text-sm transition-all flex items-center 
              ${isSetupMode ? 'bg-emerald-600 hover:bg-emerald-700' : isDressingMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              <Play size={18} className="mr-2 fill-current" /> {isSetupMode ? '설정 저장' : isDressingMode ? '드레싱 적용' : '사이클 적용'}
            </button>
          </div>
        </footer>
      </div>
    );
  };

  return (
    <div className="h-screen w-full overflow-hidden select-none font-sans">
      {/* 컴포넌트를 함수로 호출(<X/> 아님): App 리렌더 시 입력창 리마운트/포커스 해제 방지 */}
      {view === 'list' ? ProjectListPage() : CycleEditorPage()}

      {/* --- 계산기 모달 --- */}
      {showCalculator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 flex items-center tracking-tight">
                <Activity size={18} className="mr-2 text-blue-600" />
                가공 파라미터 계산기 (Calculator)
              </h3>
              <button 
                onClick={() => setShowCalculator(false)}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <Trash2 size={18} className="text-slate-400" />
              </button>
            </header>
            
            <div className="p-6 space-y-6">
              {/* 모드 선택 */}
              <div className="space-y-3">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">계산 모드 선택</div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setCalcMode('N')}
                    className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-2 ${
                      calcMode === 'N' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <RefreshCw size={16} />
                    <span>회전수 구하기 (N)</span>
                  </button>
                  <button 
                    onClick={() => setCalcMode('Vs')}
                    className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-2 ${
                      calcMode === 'Vs' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <Activity size={16} />
                    <span>원주속도 구하기 (Vs)</span>
                  </button>
                  <button 
                    onClick={() => setCalcMode('D')}
                    className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-2 ${
                      calcMode === 'D' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <Disc size={16} />
                    <span>직경 구하기 (D)</span>
                  </button>
                </div>
              </div>

              {/* 입력값 테이블 */}
              <div className="grid grid-cols-2 gap-4">
                {calcMode !== 'Vs' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">원주속도 Vs (m/min)</label>
                    <input 
                      type="number" 
                      value={calcVals.Vs} 
                      onChange={(e) => setCalcVals({...calcVals, Vs: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-lg font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                      placeholder="예: 1600"
                    />
                  </div>
                )}
                {calcMode !== 'N' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">회전수 N (RPM)</label>
                    <input 
                      type="number" 
                      value={calcVals.N} 
                      onChange={(e) => setCalcVals({...calcVals, N: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-lg font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                      placeholder="예: 3000"
                    />
                  </div>
                )}
                {calcMode !== 'D' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">직경 D (mm)</label>
                    <input 
                      type="number" 
                      value={calcVals.D} 
                      onChange={(e) => setCalcVals({...calcVals, D: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-lg font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                      placeholder="예: 170"
                    />
                  </div>
                )}
              </div>

              {/* 계산 결과 */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">계산 결과 (Calculation Result)</div>
                
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-4 mb-4 font-mono text-xs text-blue-600 flex justify-between items-center group">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 mb-1">적용된 공식</span>
                    <span className="font-bold">
                      {calcMode === 'N' ? 'N = (Vs × 1000) / (π × D)' : 
                       calcMode === 'Vs' ? 'Vs = (π × D × N) / 1000' : 
                       'D = (Vs × 1000) / (π × N)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 mb-1">연산 값</div>
                    <div className="text-lg font-black text-blue-700">
                      ≈ {calculateResult()} {calcMode === 'N' ? 'RPM' : calcMode === 'Vs' ? 'm/min' : 'mm'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-xl border transition-all ${calcMode === 'N' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}>
                    <div className={`text-[9px] font-bold uppercase mb-1 ${calcMode === 'N' ? 'text-blue-100' : 'text-slate-400'}`}>회전수 N</div>
                    <div className="text-sm font-black">{calcMode === 'N' ? calculateResult() : (calcVals.N || '0')}</div>
                    <div className={`text-[9px] font-mono ${calcMode === 'N' ? 'text-blue-200' : 'text-slate-400'}`}>RPM</div>
                  </div>
                  <div className={`p-3 rounded-xl border transition-all ${calcMode === 'Vs' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}>
                    <div className={`text-[9px] font-bold uppercase mb-1 ${calcMode === 'Vs' ? 'text-indigo-100' : 'text-slate-400'}`}>원주속도 Vs</div>
                    <div className="text-sm font-black">{calcMode === 'Vs' ? calculateResult() : (calcVals.Vs || '0')}</div>
                    <div className={`text-[9px] font-mono ${calcMode === 'Vs' ? 'text-indigo-200' : 'text-slate-400'}`}>m/min</div>
                  </div>
                  <div className={`p-3 rounded-xl border transition-all ${calcMode === 'D' ? 'bg-slate-700 border-slate-700 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}>
                    <div className={`text-[9px] font-bold uppercase mb-1 ${calcMode === 'D' ? 'text-slate-400' : 'text-slate-400'}`}>직경 D</div>
                    <div className="text-sm font-black">{calcMode === 'D' ? calculateResult() : (calcVals.D || '0')}</div>
                    <div className={`text-[9px] font-mono ${calcMode === 'D' ? 'text-slate-400' : 'text-slate-400'}`}>mm</div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowCalculator(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[11px]"
                >
                  취소(Cancel)
                </button>
                <button 
                  onClick={handleApplyCalculation}
                  className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-2"
                >
                  <Play size={16} fill="white" className="mr-1" />
                  계산값 적용 (Apply Result)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- NC 코드 출력 모달 --- */}
      {showNc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 flex items-center tracking-tight">
                <FileText size={18} className="mr-2 text-blue-600" />
                NC 코드 (FANUC / SMX)
              </h3>
              <button onClick={() => setShowNc(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <Trash2 size={18} className="text-slate-400" />
              </button>
            </header>
            <div className="p-6 overflow-auto">
              <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono leading-relaxed whitespace-pre overflow-auto">{ncCode}</pre>
              {ncCode.includes('확인필요') && (
                <div className="flex items-start text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg mt-4">
                  <AlertCircle size={14} className="mr-2 mt-0.5 shrink-0 text-amber-500" />
                  <span className="leading-tight">(***확인필요***) 표시 항목은 실제 설비/매크로 사양 확인 후 확정이 필요합니다.</span>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex space-x-3 bg-slate-50/50">
              <button onClick={() => setShowNc(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[11px]">
                닫기
              </button>
              {ncSim && (
                <button
                  onClick={() => setShowSim(true)}
                  className="flex-[2] py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl shadow-lg shadow-amber-200 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-2"
                >
                  <Activity size={16} className="mr-1" /> 시뮬레이션
                </button>
              )}
              <button
                onClick={() => { navigator.clipboard?.writeText(ncCode); }}
                className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-2"
              >
                <FileText size={16} className="mr-1" /> 복사
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 3D 공구경로 시뮬레이터 --- */}
      {showSim && ncSim && (
        <NcSimulator sim={ncSim} code={ncCode} onClose={() => setShowSim(false)} />
      )}
    </div>
  );
};

export default App;