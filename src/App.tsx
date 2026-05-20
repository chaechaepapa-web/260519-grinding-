import React, { useState } from 'react';
import { 
  Settings, Play, Save, ChevronRight, Info, AlertCircle, 
  Maximize2, FileText, Search, Plus, Trash2, Calendar, 
  ChevronLeft, MoreVertical, HardDrive, Clock, HelpCircle,
  Disc, MoveDiagonal, ArrowDownToLine, Wrench, Crosshair, PenTool, Focus, ArrowLeftRight, Activity, RefreshCw
} from 'lucide-react';

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
  { id: 'id_plunge', label: '내경 연삭 (Plunge)', desc: 'Inner Diameter Plunge Cycle', icon: Disc },
  { id: 'id_traverse', label: '내경 연삭 (Traverse)', desc: 'Inner Diameter Traverse Cycle', icon: ArrowLeftRight },
  { id: 'face_plunge', label: '단면 연삭 (Plunge)', desc: 'Face / Shoulder Plunge Cycle', icon: ArrowDownToLine },
  { id: 'face_traverse', label: '단면 연삭 (Traverse)', desc: 'Face / Shoulder Traverse Cycle', icon: ArrowLeftRight },
  { id: 'dress_single', label: '드레싱 (싱글포인트)', desc: 'Fixed Single Point Dressing', icon: Wrench, isDress: true },
  { id: 'dress_rotary', label: '드레싱 (로터리)', desc: 'Rotary Dresser Cycle', icon: RefreshCw, isDress: true }
];

const ALL_MENUS = [...SETUP_TYPES, ...CYCLE_TYPES];

const App = () => {
  const [view, setView] = useState('editor');
  const [selectedProjectId, setSelectedProjectId] = useState(1);
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  
  const [selectedMenu, setSelectedMenu] = useState('dress_rotary'); 
  const [activeTab, setActiveTab] = useState('geometry'); 
  
  // 라디오 그룹용 상태 변수들
  const [offsetMode, setOffsetMode] = useState('x_plus');
  const [dressDirection, setDressDirection] = useState('horizontal'); 
  const [gapSensor, setGapSensor] = useState('on'); 
  const [measureMode, setMeasureMode] = useState('in_process'); 

  // 개발 미정 기능 ON/OFF 토글 상태
  const [useGauge, setUseGauge] = useState(false);
  const [useRotary, setUseRotary] = useState(false);
  const [useRotaryOrigin, setUseRotaryOrigin] = useState(false);
  const [useGapReturn, setUseGapReturn] = useState(true);

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
    fine: true,
    spark: true
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId) || { name: 'NEW PROJECT', date: 'NOW' };
  const currentMenuInfo = ALL_MENUS.find(c => c.id === selectedMenu);

  const goToEditor = (id) => {
    setSelectedProjectId(id);
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
    triggerMeasureEffect();
  };

  const handleMeasureDresserCoord = () => {
    if (activeTab === 'coord_dresser_rotary') {
      setDresserRotaryCoordData({ x: '-298.115', z: '49.820' });
    } else {
      setDresserCoordData({ 
        x1: '-250.485', z1: '15.220',
        x2: '-250.485', z2: '25.220' // 예시값
      });
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
      { id: 'gap_sensor', label: '갭 검출 센서 (Gap Sensor)', type: 'radioGroup', options: [{val: 'on', label: '사용 (ON)'}, {val: 'off', label: '미사용 (OFF)'}], desc: '진동 센서를 이용한 접촉(Gap) 자동 검지 기능 활성화' },
      { id: 'gap_feed', label: '어프로치 이송 속도 (Approach Speed)', unit: 'mm/min', value: '50.0', desc: '센서 검출 전까지 휠이 다가가는 빠른 접근 속도' },
      ...(useGapReturn ? [{ id: 'gap_return', label: '검지 후 후퇴 거리 (Return Dist.)', unit: 'mm', value: '0.050', desc: '공작물 접촉 감지 직후 휠이 안전하게 뒤로 물러나는 거리' }] : [])
    ];

    // --- 실시간 측정 게이지 (In-Process Gauge) 파라미터 ---
    const gaugeFields = [
      { id: 'measure_mode', label: '측정 모드 (Measure Mode)', type: 'radioGroup', options: [{val: 'in_process', label: '실시간 (In-Process)'}, {val: 'post_process', label: '가공 후 (Post-Process)'}], desc: '가공 중에 실시간으로 치수를 제어할지, 끝난 후 검사만 할지 선택합니다.' },
      { id: 'shift_1', label: '1단 시프트 (Rough -> Finish)', unit: 'mm', value: '0.100', desc: '황삭에서 정삭으로 전환되는 게이지 잔여 치수' },
      { id: 'shift_2', label: '2단 시프트 (Finish -> Fine)', unit: 'mm', value: '0.020', desc: '정삭에서 미세정삭으로 전환되는 게이지 잔여 치수' },
      { id: 'target_size', label: '최종 목표 치수 (Target Size)', unit: 'mm', value: '50.000', desc: '게이지가 이 치수에 도달하면 스파크아웃을 시작합니다.' },
      { id: 'gauge_retract', label: '게이지 후퇴 위치 (Retract Pos.)', unit: 'mm', value: '150.000', desc: '가공 완료 후 게이지 헤드가 대피하는 X축 위치' }
    ];

    // --- 외경 연삭 (플런지) ---
    const odPlungeGeometryFields = [
      { id: 'd1', label: '시작 직경 (Start Dia.)', unit: 'mm', value: '50.000', desc: '가공 전 소재의 직경 (도피/접근 기준점)' },
      { id: 'd2', label: '목표 직경 (Finish Dia.)', unit: 'mm', value: '48.500', desc: '가공 완료 후의 최종 목표 직경' },
      { id: 'z_start', label: '가공 시작 위치 (Start Z)', unit: 'mm', value: '100.000', desc: 'Z축 방향 가공 시작 지점' },
      { id: 'z_end', label: '가공 끝 위치 (End Z)', unit: 'mm', value: '75.000', desc: 'Z축 방향 가공 종료 지점' },
      { id: 'width', label: '가공 폭 (Grind Width)', unit: 'mm', value: '25.000', desc: '플런지 연삭이 들어갈 폭 (Start - End)' },
      { id: 'clearance', label: '안전 거리 (Clearance)', unit: 'mm', value: '2.000', desc: '급속 이송이 끝나고 가공 이송이 시작되는 안전 도피량' }
    ];

    const odPlungeCuttingFields = [
      ...gapCuttingFields,
      { id: 'work_rpm', label: '작업 회전 속도 (Work RPM)', unit: 'rpm', value: '250', desc: '공작물의 회전 속도' },
      { id: 'wheel_vc', label: '휠 주속 (Wheel Vc)', unit: 'm/s', value: '35', desc: '연마 휠의 표면 속도' },
      
      { id: 'toggle_rough', type: 'stageToggle', stageKey: 'rough', label: '황삭 가공 (Roughing)' },
      { id: 'rough_stk', stage: 'rough', label: '황삭 절입량 (Rough Stock)', unit: 'mm', value: '1.000', desc: '황삭 구간의 총 가공량' },
      { id: 'rough_fr', stage: 'rough', label: '황삭 이송 속도 (Rough Feed)', unit: 'mm/min', value: '0.500', desc: '황삭 구간 휠 진입 속도' },

      { id: 'toggle_finish', type: 'stageToggle', stageKey: 'finish', label: '정삭 가공 (Finishing)' },
      { id: 'finish_stk', stage: 'finish', label: '정삭 절입량 (Finish Stock)', unit: 'mm', value: '0.400', desc: '정삭 구간의 총 가공량' },
      { id: 'finish_fr', stage: 'finish', label: '정삭 이송 속도 (Finish Feed)', unit: 'mm/min', value: '0.100', desc: '정삭 구간 휠 진입 속도' },

      { id: 'toggle_fine', type: 'stageToggle', stageKey: 'fine', label: '미세정삭 가공 (Fine Finishing)' },
      { id: 'fine_stk', stage: 'fine', label: '미세정삭 절입량 (Fine Stock)', unit: 'mm', value: '0.100', desc: '최종 치수 확보를 위한 미세 절입량' },
      { id: 'fine_fr', stage: 'fine', label: '미세정삭 이송 (Fine Feed)', unit: 'mm/min', value: '0.020', desc: '미세정삭 구간 휠 진입 속도' },

      { id: 'toggle_spark', type: 'stageToggle', stageKey: 'spark', label: '스파크 아웃 (Spark-out)' },
      { id: 'spark_out', stage: 'spark', label: '스파크 아웃 횟수 (Spark-out)', unit: 'Times', value: '3', desc: '목표 치수 도달 후 절입 없이 회전하는 횟수 (표면 조도 향상)' }
    ];

    // --- 외경 연삭 (트래버스) ---
    const odTraverseGeometryFields = [
      { id: 'd1', label: '시작 직경 (Start Dia.)', unit: 'mm', value: '50.000', desc: '가공 전 소재의 초기 직경' },
      { id: 'd2', label: '목표 직경 (Finish Dia.)', unit: 'mm', value: '49.000', desc: '가공 완료 후의 최종 목표 직경' },
      { id: 'z_start', label: '가공 시작 위치 (Start Pos.)', unit: 'mm', value: '100.000', desc: '왕복(Traverse) 운동이 시작되는 Z축 지점' },
      { id: 'z_end', label: '가공 종료 위치 (End Pos.)', unit: 'mm', value: '50.000', desc: '왕복(Traverse) 운동이 끝나는 Z축 지점' },
      { id: 'zigzag_angle', label: '지그재그 가공 각도 (Zigzag Angle)', unit: 'deg', value: '0.000', desc: '지그재그 왕복 가공 시 Z축 대비 기울기 각도 지정' },
      { id: 'clearance', label: '안전 거리 (Clearance)', unit: 'mm', value: '2.000', desc: '가공 전 휠이 접근할 때의 도피량' },
      { id: 'over_start', label: '트래버스 오버런 (Start)', unit: 'mm', value: '15.000', desc: '시작 위치(Start Pos.)를 벗어나 휠이 더 나가는 거리' },
      { id: 'over_end', label: '트래버스 오버런 (End)', unit: 'mm', value: '15.000', desc: '종료 위치(End Pos.)를 벗어나 휠이 더 나가는 거리' },
      { id: 'infeed_start', label: '시작단 절입량 (Infeed Start)', unit: 'mm', value: '0.005', desc: '시작 위치에서 방향을 바꿀 때 1회 절입되는 양' },
      { id: 'infeed_end', label: '종료단 절입량 (Infeed End)', unit: 'mm', value: '0.000', desc: '종료 위치에서 방향을 바꿀 때 1회 절입되는 양' }
    ];

    const odTraverseCuttingFields = [
      ...gapCuttingFields,
      { id: 'work_rpm', label: '작업 회전 속도 (Work RPM)', unit: 'rpm', value: '250', desc: '공작물의 회전 속도' },
      { id: 'wheel_vc', label: '휠 주속 (Wheel Vc)', unit: 'm/s', value: '35', desc: '연마 휠의 표면 속도' },

      { id: 'toggle_rough', type: 'stageToggle', stageKey: 'rough', label: '황삭 가공 (Roughing)' },
      { id: 'rough_stk', stage: 'rough', label: '황삭 절입량 (Rough Stock)', unit: 'mm', value: '0.500', desc: '트래버스 황삭 구간의 전체 가공량' },
      { id: 'rough_fr', stage: 'rough', label: '황삭 이송 속도 (Rough Feed)', unit: 'mm/min', value: '300', desc: 'Z축 좌우 왕복 이송 속도 (황삭)' },

      { id: 'toggle_finish', type: 'stageToggle', stageKey: 'finish', label: '정삭 가공 (Finishing)' },
      { id: 'finish_stk', stage: 'finish', label: '정삭 절입량 (Finish Stock)', unit: 'mm', value: '0.300', desc: '트래버스 정삭 구간의 전체 가공량' },
      { id: 'finish_fr', stage: 'finish', label: '정삭 이송 속도 (Finish Feed)', unit: 'mm/min', value: '100', desc: 'Z축 좌우 왕복 이송 속도 (정삭)' },

      { id: 'toggle_fine', type: 'stageToggle', stageKey: 'fine', label: '미세정삭 가공 (Fine Finishing)' },
      { id: 'fine_stk', stage: 'fine', label: '미세정삭 절입량 (Fine Stock)', unit: 'mm', value: '0.200', desc: '최종 치수 확보용 절입량' },
      { id: 'fine_fr', stage: 'fine', label: '미세정삭 이송 (Fine Feed)', unit: 'mm/min', value: '50', desc: 'Z축 좌우 왕복 이송 속도 (미세정삭)' },

      { id: 'toggle_spark', type: 'stageToggle', stageKey: 'spark', label: '스파크 아웃 (Spark-out)' },
      { id: 'spark_out', stage: 'spark', label: '스파크 아웃 횟수 (Spark-out)', unit: 'Times', value: '2', desc: '목표 치수 도달 후 절입 없이 Z축 왕복을 반복하는 횟수' }
    ];

    // --- 내경 연삭 (플런지) ---
    const idPlungeGeometryFields = [
      { id: 'd1', label: '시작 내경 (Start Dia.)', unit: 'mm', value: '48.500', desc: '가공 전 소재의 초기 내경 (접근 기준점)' },
      { id: 'd2', label: '목표 내경 (Finish Dia.)', unit: 'mm', value: '50.000', desc: '가공 완료 후의 최종 목표 내경' },
      { id: 'z_start', label: '가공 시작 위치 (Start Z)', unit: 'mm', value: '100.000', desc: 'Z축 방향 가공 시작 지점' },
      { id: 'z_end', label: '가공 끝 위치 (End Z)', unit: 'mm', value: '125.000', desc: 'Z축 방향 가공 종료 지점' },
      { id: 'width', label: '가공 폭 (Grind Width)', unit: 'mm', value: '25.000', desc: '플런지 연삭이 들어갈 폭' },
      { id: 'clearance', label: '안전 거리 (Clearance)', unit: 'mm', value: '2.000', desc: '내경 가공을 위해 휠이 접근할 때의 도피량' }
    ];

    const idPlungeCuttingFields = [
      ...gapCuttingFields,
      { id: 'work_rpm', label: '작업 회전 속도 (Work RPM)', unit: 'rpm', value: '250', desc: '공작물의 회전 속도' },
      { id: 'wheel_vc', label: '휠 주속 (Wheel Vc)', unit: 'm/s', value: '35', desc: '연마 휠의 표면 속도' },

      { id: 'toggle_rough', type: 'stageToggle', stageKey: 'rough', label: '황삭 가공 (Roughing)' },
      { id: 'rough_stk', stage: 'rough', label: '황삭 절입량 (Rough Stock)', unit: 'mm', value: '1.000', desc: '황삭 구간의 총 가공량' },
      { id: 'rough_fr', stage: 'rough', label: '황삭 이송 속도 (Rough Feed)', unit: 'mm/min', value: '0.400', desc: '황삭 구간 휠 진입 속도' },

      { id: 'toggle_finish', type: 'stageToggle', stageKey: 'finish', label: '정삭 가공 (Finishing)' },
      { id: 'finish_stk', stage: 'finish', label: '정삭 절입량 (Finish Stock)', unit: 'mm', value: '0.400', desc: '정삭 구간의 총 가공량' },
      { id: 'finish_fr', stage: 'finish', label: '정삭 이송 속도 (Finish Feed)', unit: 'mm/min', value: '0.100', desc: '정삭 구간 휠 진입 속도' },

      { id: 'toggle_fine', type: 'stageToggle', stageKey: 'fine', label: '미세정삭 가공 (Fine Finishing)' },
      { id: 'fine_stk', stage: 'fine', label: '미세정삭 절입량 (Fine Stock)', unit: 'mm', value: '0.100', desc: '최종 치수 확보를 위한 미세 절입량' },
      { id: 'fine_fr', stage: 'fine', label: '미세정삭 이송 (Fine Feed)', unit: 'mm/min', value: '0.020', desc: '미세정삭 구간 휠 진입 속도' },

      { id: 'toggle_spark', type: 'stageToggle', stageKey: 'spark', label: '스파크 아웃 (Spark-out)' },
      { id: 'spark_out', stage: 'spark', label: '스파크 아웃 횟수 (Spark-out)', unit: 'Times', value: '3', desc: '목표 치수 도달 후 절입 없이 회전하는 횟수 (표면 조도 향상)' }
    ];

    // --- 내경 연삭 (트래버스) ---
    const idTraverseGeometryFields = [
      { id: 'd1', label: '시작 내경 (Start Dia.)', unit: 'mm', value: '48.500', desc: '가공 전 소재의 초기 내경' },
      { id: 'd2', label: '목표 내경 (Finish Dia.)', unit: 'mm', value: '50.000', desc: '가공 완료 후의 최종 목표 내경' },
      { id: 'z_start', label: '가공 시작 위치 (Start Pos.)', unit: 'mm', value: '100.000', desc: '왕복(Traverse) 운동이 시작되는 Z축 지점' },
      { id: 'z_end', label: '가공 종료 위치 (End Pos.)', unit: 'mm', value: '50.000', desc: '왕복(Traverse) 운동이 끝나는 Z축 지점' },
      { id: 'zigzag_angle', label: '지그재그 가공 각도 (Zigzag Angle)', unit: 'deg', value: '0.000', desc: '지그재그 왕복 가공 시 Z축 대비 기울기 각도 지정' },
      { id: 'clearance', label: '안전 거리 (Clearance)', unit: 'mm', value: '2.000', desc: '가공 전 휠이 접근할 때의 도피량' },
      { id: 'over_start', label: '트래버스 오버런 (Start)', unit: 'mm', value: '15.000', desc: '시작 위치(Start Pos.)를 벗어나 휠이 더 나가는 거리' },
      { id: 'over_end', label: '트래버스 오버런 (End)', unit: 'mm', value: '15.000', desc: '종료 위치(End Pos.)를 벗어나 휠이 더 나가는 거리' },
      { id: 'infeed_start', label: '시작단 절입량 (Infeed Start)', unit: 'mm', value: '0.005', desc: '시작 위치에서 방향을 바꿀 때 1회 절입되는 양' },
      { id: 'infeed_end', label: '종료단 절입량 (Infeed End)', unit: 'mm', value: '0.000', desc: '종료 위치에서 방향을 바꿀 때 1회 절입되는 양' }
    ];

    const idTraverseCuttingFields = [
      ...gapCuttingFields,
      { id: 'work_rpm', label: '작업 회전 속도 (Work RPM)', unit: 'rpm', value: '250', desc: '공작물의 회전 속도' },
      { id: 'wheel_vc', label: '휠 주속 (Wheel Vc)', unit: 'm/s', value: '35', desc: '연마 휠의 표면 속도' },

      { id: 'toggle_rough', type: 'stageToggle', stageKey: 'rough', label: '황삭 가공 (Roughing)' },
      { id: 'rough_stk', stage: 'rough', label: '황삭 절입량 (Rough Stock)', unit: 'mm', value: '0.500', desc: '트래버스 황삭 구간의 전체 가공량' },
      { id: 'rough_fr', stage: 'rough', label: '황삭 이송 속도 (Rough Feed)', unit: 'mm/min', value: '300', desc: 'Z축 좌우 왕복 이송 속도 (황삭)' },

      { id: 'toggle_finish', type: 'stageToggle', stageKey: 'finish', label: '정삭 가공 (Finishing)' },
      { id: 'finish_stk', stage: 'finish', label: '정삭 절입량 (Finish Stock)', unit: 'mm', value: '0.300', desc: '트래버스 정삭 구간의 전체 가공량' },
      { id: 'finish_fr', stage: 'finish', label: '정삭 이송 속도 (Finish Feed)', unit: 'mm/min', value: '100', desc: 'Z축 좌우 왕복 이송 속도 (정삭)' },

      { id: 'toggle_fine', type: 'stageToggle', stageKey: 'fine', label: '미세정삭 가공 (Fine Finishing)' },
      { id: 'fine_stk', stage: 'fine', label: '미세정삭 절입량 (Fine Stock)', unit: 'mm', value: '0.200', desc: '최종 치수 확보용 절입량' },
      { id: 'fine_fr', stage: 'fine', label: '미세정삭 이송 (Fine Feed)', unit: 'mm/min', value: '50', desc: 'Z축 좌우 왕복 이송 속도 (미세정삭)' },

      { id: 'toggle_spark', type: 'stageToggle', stageKey: 'spark', label: '스파크 아웃 (Spark-out)' },
      { id: 'spark_out', stage: 'spark', label: '스파크 아웃 횟수 (Spark-out)', unit: 'Times', value: '2', desc: '목표 치수 도달 후 절입 없이 Z축 왕복을 반복하는 횟수' }
    ];

    // --- 단면 연삭 (플런지) ---
    const facePlungeGeometryFields = [
      { id: 'z1', label: '시작 단면 위치 (Start Z)', unit: 'mm', value: '100.000', desc: '가공 전 소재 상단면의 Z축 기준점' },
      { id: 'z2', label: '목표 단면 위치 (Finish Z)', unit: 'mm', value: '98.500', desc: '가공 완료 후의 최종 목표 단면 Z 위치' },
      { id: 'x_pos', label: '가공 위치 X (Grind Pos. X)', unit: 'mm', value: '50.000', desc: '단면 플런지 연삭이 들어가는 X축 위치' },
      { id: 'clearance', label: '안전 거리 (Clearance)', unit: 'mm', value: '2.000', desc: '하강 시 급속 이송이 끝나는 안전 도피량' }
    ];

    const facePlungeCuttingFields = [
      ...gapCuttingFields,
      { id: 'work_rpm', label: '작업 회전 속도 (Work RPM)', unit: 'rpm', value: '250', desc: '공작물의 회전 속도' },
      { id: 'wheel_vc', label: '휠 주속 (Wheel Vc)', unit: 'm/s', value: '35', desc: '연마 휠의 표면 속도' },

      { id: 'toggle_rough', type: 'stageToggle', stageKey: 'rough', label: '황삭 가공 (Roughing)' },
      { id: 'rough_stk', stage: 'rough', label: '황삭 절입량 (Rough Stock)', unit: 'mm', value: '1.000', desc: '황삭 하강 구간의 총 가공량' },
      { id: 'rough_fr', stage: 'rough', label: '황삭 이송 속도 (Rough Feed)', unit: 'mm/min', value: '0.500', desc: '황삭 구간 Z축 진입 속도' },

      { id: 'toggle_finish', type: 'stageToggle', stageKey: 'finish', label: '정삭 가공 (Finishing)' },
      { id: 'finish_stk', stage: 'finish', label: '정삭 절입량 (Finish Stock)', unit: 'mm', value: '0.400', desc: '정삭 하강 구간의 총 가공량' },
      { id: 'finish_fr', stage: 'finish', label: '정삭 이송 속도 (Finish Feed)', unit: 'mm/min', value: '0.100', desc: '정삭 구간 Z축 진입 속도' },

      { id: 'toggle_fine', type: 'stageToggle', stageKey: 'fine', label: '미세정삭 가공 (Fine Finishing)' },
      { id: 'fine_stk', stage: 'fine', label: '미세정삭 절입량 (Fine Stock)', unit: 'mm', value: '0.100', desc: '최종 치수 확보를 위한 미세 절입량' },
      { id: 'fine_fr', stage: 'fine', label: '미세정삭 이송 (Fine Feed)', unit: 'mm/min', value: '0.020', desc: '미세정삭 구간 Z축 진입 속도' },

      { id: 'toggle_spark', type: 'stageToggle', stageKey: 'spark', label: '스파크 아웃 (Spark-out)' },
      { id: 'spark_out', stage: 'spark', label: '스파크 아웃 횟수 (Spark-out)', unit: 'Times', value: '3', desc: '목표 위치 도달 후 회전하는 횟수' }
    ];

    // --- 단면 연삭 (트래버스) ---
    const faceTraverseGeometryFields = [
      { id: 'z1', label: '시작 단면 위치 (Start Z)', unit: 'mm', value: '100.000', desc: '가공 전 소재 상단면의 Z축 기준점' },
      { id: 'z2', label: '목표 단면 위치 (Finish Z)', unit: 'mm', value: '99.000', desc: '가공 완료 후의 최종 목표 단면 Z 위치' },
      { id: 'x_start', label: '가공 시작 위치 X (Start Pos.)', unit: 'mm', value: '60.000', desc: 'X축 트래버스가 시작되는 위치' },
      { id: 'x_end', label: '가공 종료 위치 X (End Pos.)', unit: 'mm', value: '20.000', desc: 'X축 트래버스가 끝나는 위치' },
      { id: 'clearance', label: '안전 거리 (Clearance)', unit: 'mm', value: '2.000', desc: '하강 시 급속 이송이 끝나는 안전 도피량' },
      { id: 'over_start', label: '트래버스 오버런 (Start)', unit: 'mm', value: '10.000', desc: '시작 위치(Start Pos. X)를 벗어나 휠이 더 나가는 거리' },
      { id: 'over_end', label: '트래버스 오버런 (End)', unit: 'mm', value: '10.000', desc: '종료 위치(End Pos. X)를 벗어나 휠이 더 나가는 거리' },
      { id: 'infeed_start', label: '시작단 절입량 (Infeed Start)', unit: 'mm', value: '0.005', desc: '시작 위치에서 방향을 바꿀 때 Z축으로 1회 절입되는 양' },
      { id: 'infeed_end', label: '종료단 절입량 (Infeed End)', unit: 'mm', value: '0.000', desc: '종료 위치에서 방향을 바꿀 때 Z축으로 1회 절입되는 양' }
    ];

    const faceTraverseCuttingFields = [
      ...gapCuttingFields,
      { id: 'work_rpm', label: '작업 회전 속도 (Work RPM)', unit: 'rpm', value: '250', desc: '공작물의 회전 속도' },
      { id: 'wheel_vc', label: '휠 주속 (Wheel Vc)', unit: 'm/s', value: '35', desc: '연마 휠의 표면 속도' },

      { id: 'toggle_rough', type: 'stageToggle', stageKey: 'rough', label: '황삭 가공 (Roughing)' },
      { id: 'rough_stk', stage: 'rough', label: '황삭 절입량 (Rough Stock)', unit: 'mm', value: '0.500', desc: '트래버스 황삭 구간의 전체 가공량' },
      { id: 'rough_fr', stage: 'rough', label: '황삭 이송 속도 (Rough Feed)', unit: 'mm/min', value: '300', desc: 'X축 좌우 왕복 이송 속도 (황삭)' },

      { id: 'toggle_finish', type: 'stageToggle', stageKey: 'finish', label: '정삭 가공 (Finishing)' },
      { id: 'finish_stk', stage: 'finish', label: '정삭 절입량 (Finish Stock)', unit: 'mm', value: '0.300', desc: '트래버스 정삭 구간의 전체 가공량' },
      { id: 'finish_fr', stage: 'finish', label: '정삭 이송 속도 (Finish Feed)', unit: 'mm/min', value: '100', desc: 'X축 좌우 왕복 이송 속도 (정삭)' },

      { id: 'toggle_fine', type: 'stageToggle', stageKey: 'fine', label: '미세정삭 가공 (Fine Finishing)' },
      { id: 'fine_stk', stage: 'fine', label: '미세정삭 절입량 (Fine Stock)', unit: 'mm', value: '0.200', desc: '최종 치수 확보용 절입량' },
      { id: 'fine_fr', stage: 'fine', label: '미세정삭 이송 (Fine Feed)', unit: 'mm/min', value: '50', desc: 'X축 좌우 왕복 이송 속도 (미세정삭)' },

      { id: 'toggle_spark', type: 'stageToggle', stageKey: 'spark', label: '스파크 아웃 (Spark-out)' },
      { id: 'spark_out', stage: 'spark', label: '스파크 아웃 횟수 (Spark-out)', unit: 'Times', value: '2', desc: '절입 없이 X축 왕복을 반복하는 횟수' }
    ];
    
    // --- 드레싱 (싱글포인트) 파라미터 ---
    const dressGeometryFields = [
      { id: 'dress_direction', label: '드레싱 방향 (Direction)', type: 'radioGroup', options: [{val: 'horizontal', label: '가로 방향 (Traverse)'}, {val: 'vertical', label: '세로 방향 (Plunge)'}], desc: '드레싱 공구의 이송 방향 선택' },
      { id: 'total_dress_amt', label: '총 드레싱 량 (Total Amount)', unit: 'mm', value: '0.020', desc: '드레싱 할 총 절입량' },
      { id: 'dress_interval', label: '가공 인터벌 (Interval)', unit: 'Times', value: '1', desc: '몇 개의 공작물 가공 후 드레싱을 실행할지 빈도 설정' },
      { id: 'zigzag_angle', label: '지그재그 각도 (Zigzag Angle)', unit: 'deg', value: '0.000', desc: '가로 방향(Traverse) 드레싱 시 사선(지그재그) 이송 각도 지정' },
      { id: 'dress_start_offset', label: '시작 위치 오프셋 (Start Offset)', unit: 'mm', value: '0.000', desc: '드레싱 시작 위치 여유값' },
      { id: 'dress_end_offset', label: '종료 위치 오프셋 (End Offset)', unit: 'mm', value: '0.000', desc: '드레싱 종료 위치 여유값' }
    ];

    const dressCuttingFields = [
      { id: 'wheel_rpm', label: '휠 회전 속도 (Wheel RPM)', unit: 'rpm', value: '1500', desc: '드레싱 시 휠 회전수' },
      
      { id: 'toggle_rough', type: 'stageToggle', stageKey: 'rough', label: '황삭 드레싱 (Roughing)' },
      { id: 'rough_infeed', stage: 'rough', label: '황삭 절입량 (Rough Infeed)', unit: 'mm', value: '0.010', desc: '황삭 드레싱 1회 절입량' },
      { id: 'rough_feed', stage: 'rough', label: '황삭 이송 속도 (Rough Feed)', unit: 'mm/min', value: '100', desc: '황삭 드레싱 이송 속도' },

      { id: 'toggle_finish', type: 'stageToggle', stageKey: 'finish', label: '정삭 드레싱 (Finishing)' },
      { id: 'finish_infeed', stage: 'finish', label: '정삭 절입량 (Finish Infeed)', unit: 'mm', value: '0.005', desc: '정삭 드레싱 1회 절입량' },
      { id: 'finish_feed', stage: 'finish', label: '정삭 이송 속도 (Finish Feed)', unit: 'mm/min', value: '50', desc: '정삭 드레싱 이송 속도' },

      { id: 'toggle_fine', type: 'stageToggle', stageKey: 'fine', label: '미세정삭 드레싱 (Fine Finishing)' },
      { id: 'fine_infeed', stage: 'fine', label: '미세정삭 절입량 (Fine Infeed)', unit: 'mm', value: '0.002', desc: '미세정삭 드레싱 1회 절입량' },
      { id: 'fine_feed', stage: 'fine', label: '미세정삭 이송 속도 (Fine Feed)', unit: 'mm/min', value: '20', desc: '미세정삭 드레싱 이송 속도' },

      { id: 'toggle_spark', type: 'stageToggle', stageKey: 'spark', label: '스파크 아웃 (Spark-out)' },
      { id: 'spark_out', stage: 'spark', label: '스파크 아웃 횟수 (Spark-out)', unit: 'Times', value: '1', desc: '절입 없이 왕복하는 횟수 (논-컷 패스)' }
    ];

    // --- 신규: 드레싱 (로터리) 파라미터 ---
    const dressRotaryGeometryFields = [
      { id: 'dress_direction', label: '드레싱 방향 (Direction)', type: 'radioGroup', options: [{val: 'horizontal', label: '가로 방향 (Traverse)'}, {val: 'vertical', label: '세로 방향 (Plunge)'}], desc: '로터리 드레서의 이송 방향 선택' },
      { id: 'speed_ratio', label: '속도 비 (Speed Ratio)', unit: '%', value: '0.8', desc: '연삭 휠 대비 로터리 휠의 상대 회전 속도 비율' },
      { id: 'total_dress_amt', label: '총 드레싱 량 (Total Amount)', unit: 'mm', value: '0.020', desc: '드레싱 할 총 절입량' },
      { id: 'dress_interval', label: '가공 인터벌 (Interval)', unit: 'Times', value: '1', desc: '몇 개의 공작물 가공 후 드레싱을 실행할지 빈도 설정' },
      { id: 'zigzag_angle', label: '지그재그 각도 (Zigzag Angle)', unit: 'deg', value: '0.000', desc: '가로 방향(Traverse) 드레싱 시 사선(지그재그) 이송 각도 지정' }
    ];

    const dressRotaryCuttingFields = [
      { id: 'wheel_rpm', label: '연삭 휠 속도 (Wheel RPM)', unit: 'rpm', value: '1500', desc: '드레싱 시 연삭 휠 회전수' },
      { id: 'rotary_rpm', label: '로터리 휠 속도 (Rotary RPM)', unit: 'rpm', value: '1200', desc: '로터리 드레서의 회전수' },
      
      { id: 'toggle_rough', type: 'stageToggle', stageKey: 'rough', label: '황삭 드레싱 (Roughing)' },
      { id: 'rough_infeed', stage: 'rough', label: '황삭 절입량 (Rough Infeed)', unit: 'mm', value: '0.010', desc: '황삭 드레싱 1회 절입량' },
      { id: 'rough_feed', stage: 'rough', label: '황삭 이송 속도 (Rough Feed)', unit: 'mm/min', value: '100', desc: '황삭 드레싱 이송 속도' },

      { id: 'toggle_finish', type: 'stageToggle', stageKey: 'finish', label: '정삭 드레싱 (Finishing)' },
      { id: 'finish_infeed', stage: 'finish', label: '정삭 절입량 (Finish Infeed)', unit: 'mm', value: '0.005', desc: '정삭 드레싱 1회 절입량' },
      { id: 'finish_feed', stage: 'finish', label: '정삭 이송 속도 (Finish Feed)', unit: 'mm/min', value: '50', desc: '정삭 드레싱 이송 속도' },

      { id: 'toggle_fine', type: 'stageToggle', stageKey: 'fine', label: '미세정삭 드레싱 (Fine Finishing)' },
      { id: 'fine_infeed', stage: 'fine', label: '미세정삭 절입량 (Fine Infeed)', unit: 'mm', value: '0.002', desc: '미세정삭 드레싱 1회 절입량' },
      { id: 'fine_feed', stage: 'fine', label: '미세정삭 이송 속도 (Fine Feed)', unit: 'mm/min', value: '20', desc: '미세정삭 드레싱 이송 속도' },

      { id: 'toggle_spark', type: 'stageToggle', stageKey: 'spark', label: '스파크 아웃 (Spark-out)' },
      { id: 'spark_out', stage: 'spark', label: '스파크 아웃 횟수 (Spark-out)', unit: 'Times', value: '1', desc: '절입 없이 왕복하는 횟수 (논-컷 패스)' }
    ];

    const isSetupMode = (currentMenuInfo as any)?.isSetup;
    const isDressingMode = (currentMenuInfo as any)?.isDress;

    const getTabs = () => {
      if (selectedMenu === 'work_coord') return [
        { id: 'coord_work', label: '소재 워크좌표계' }, 
        { id: 'coord_dresser_single', label: '드레싱 원점 (싱글)' },
        { id: 'coord_dresser_rotary', label: '드레싱 원점 (로터리)' }
      ];
      if (selectedMenu === 'tool_setup') return [
        { id: 'wheel', label: '연삭 휠 및 보정' }, 
        { id: 'dresser', label: '싱글포인트 제원' }, 
        { id: 'dresser_rotary', label: '로터리 드레서 제원' },
        { id: 'spindle_angle', label: '밀링 스핀들 각도 (B축)' }
      ];
      
      if (selectedMenu === 'dress_rotary') return [{ id: 'geometry', label: '로터리 드레싱 설정' }, { id: 'cutting', label: '로터리 드레싱 조건' }];
      if (isDressingMode) return [{ id: 'geometry', label: '드레싱 설정' }, { id: 'cutting', label: '드레싱 조건' }];
      
      if (selectedMenu !== 'face_traverse') {
        return [
          { id: 'geometry', label: '공작물 형상' }, 
          { id: 'cutting', label: '가공 조건' },
          { id: 'gauge', label: '실시간 측정' }
        ];
      }

      return [{ id: 'geometry', label: '공작물 형상' }, { id: 'cutting', label: '가공 조건' }];
    };

    const getActiveFields = () => {
      if (activeTab === 'coord_work') return coordWorkFields;
      if (activeTab === 'coord_dresser_single') return coordDresserSingleFields;
      if (activeTab === 'coord_dresser_rotary') return coordDresserRotaryFields;
      if (activeTab === 'wheel') return wheelSetupFields;
      if (activeTab === 'dresser') return dresserSetupFields;
      if (activeTab === 'dresser_rotary') return dresserRotarySetupFields;
      if (activeTab === 'spindle_angle') return spindleAngleFields;
      if (activeTab === 'gauge') return gaugeFields; 
      
      if (activeTab === 'geometry') {
        if (selectedMenu === 'dress_single') return dressGeometryFields;
        if (selectedMenu === 'dress_rotary') return dressRotaryGeometryFields;
        if (selectedMenu === 'od_plunge') return odPlungeGeometryFields;
        if (selectedMenu === 'od_traverse') return odTraverseGeometryFields;
        if (selectedMenu === 'id_plunge') return idPlungeGeometryFields;
        if (selectedMenu === 'id_traverse') return idTraverseGeometryFields;
        if (selectedMenu === 'face_plunge') return facePlungeGeometryFields;
        if (selectedMenu === 'face_traverse') return faceTraverseGeometryFields;
        return [];
      }
      if (activeTab === 'cutting') {
        if (selectedMenu === 'dress_single') return dressCuttingFields;
        if (selectedMenu === 'dress_rotary') return dressRotaryCuttingFields;
        if (selectedMenu === 'od_plunge') return odPlungeCuttingFields;
        if (selectedMenu === 'od_traverse') return odTraverseCuttingFields;
        if (selectedMenu === 'id_plunge') return idPlungeCuttingFields;
        if (selectedMenu === 'id_traverse') return idTraverseCuttingFields;
        if (selectedMenu === 'face_plunge') return facePlungeCuttingFields;
        if (selectedMenu === 'face_traverse') return faceTraverseCuttingFields;
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

    // 기능 ON/OFF 토글 노출 판단 로직
    const isRotaryTabOrMenu = activeTab === 'dresser_rotary' || selectedMenu === 'dress_rotary';
    const showHeaderToggle = activeTab === 'gauge' || isRotaryTabOrMenu;
    const toggleValue = isRotaryTabOrMenu ? useRotary : useGauge;
    const toggleSetter = isRotaryTabOrMenu ? setUseRotary : setUseGauge;
    const isOffStateBanner = (activeTab === 'gauge' && !useGauge) || (isRotaryTabOrMenu && !useRotary);

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
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-2 px-1">Preparation</div>
            <div className="space-y-2">
              {SETUP_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleMenuChange(type.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border-2 flex items-center ${
                      selectedMenu === type.id ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={20} className={`mr-3 ${selectedMenu === type.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-sm">{type.label}</div>
                      <div className={`text-[10px] ${selectedMenu === type.id ? 'text-emerald-600/80' : 'text-slate-400'}`}>{type.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Grinding Cycles</div>
              <div className="space-y-2">
                {CYCLE_TYPES.filter(c => !c.isDress).map((type) => {
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

            <div className="pt-4 mt-4 border-t border-slate-100">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Dressing Cycles</div>
              {CYCLE_TYPES.filter(c => c.isDress).map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleMenuChange(type.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border-2 flex items-center ${
                      selectedMenu === type.id ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={20} className={`mr-3 ${selectedMenu === type.id ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-sm">{type.label}</div>
                      <div className={`text-[10px] ${selectedMenu === type.id ? 'text-amber-600/80' : 'text-slate-400'}`}>{type.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <main className="flex-1 flex flex-col bg-slate-50">
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

                {/* 3. 드레싱 싱글포인트 다이어그램 */}
                {selectedMenu === 'dress_single' && activeTab !== 'gauge' && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    <path d="M 50,20 L 350,20 L 350,160 L 260,160 L 260,70 L 50,70 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
                    <text x="150" y="45" fill="#94a3b8" fontSize="12" fontWeight="bold" textAnchor="middle">Grinding Wheel</text>
                    <path d="M 180,85 L 200,85 L 200,140 L 245,140 L 245,160 L 180,160 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
                    <polygon points="180,85 200,85 190,70" fill={dressDirection === 'horizontal' ? '#d97706' : '#94a3b8'} />
                    <polygon points="245,140 245,160 260,150" fill={dressDirection === 'vertical' ? '#d97706' : '#94a3b8'} />

                    {dressDirection === 'horizontal' && (
                      <g>
                        <path d="M 130,95 L 240,95" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                        <path d="M 130,95 L 240,80" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M 230,78 L 240,80 L 235,88" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <text x="155" y="88" fill="#f59e0b" fontSize="10" fontWeight="bold">Angle(θ)</text>
                        <text x="185" y="115" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">사선 방향 (Traverse)</text>
                      </g>
                    )}
                    {dressDirection === 'vertical' && (
                      <g>
                        <path d="M 275,100 L 275,180 M 270,105 L 275,100 L 280,105 M 270,175 L 275,180 L 280,175" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <text x="330" y="145" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">세로 방향 (Plunge)</text>
                      </g>
                    )}
                  </svg>
                )}

                {/* 3-2. 드레싱 로터리 다이어그램 신규 추가 */}
                {selectedMenu === 'dress_rotary' && activeTab !== 'gauge' && useRotary && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    <path d="M 50,20 L 350,20 L 350,160 L 260,160 L 260,70 L 50,70 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
                    <text x="150" y="45" fill="#94a3b8" fontSize="12" fontWeight="bold" textAnchor="middle">Grinding Wheel</text>
                    
                    {/* 로터리 드레서 */}
                    <circle cx="230" cy="130" r="30" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
                    <circle cx="230" cy="130" r="8" fill="#94a3b8" />
                    <path d="M 230,110 A 20 20 0 0 1 250 130" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
                    
                    {dressDirection === 'horizontal' && (
                      <g>
                        <path d="M 170,145 L 280,145" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                        <path d="M 170,145 L 280,130" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M 270,128 L 280,130 L 275,138" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <text x="195" y="138" fill="#f59e0b" fontSize="10" fontWeight="bold">Angle(θ)</text>
                        <text x="225" y="180" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">사선 방향 (Traverse)</text>
                      </g>
                    )}
                    {dressDirection === 'vertical' && (
                      <g>
                        <path d="M 285,100 L 285,160 M 280,105 L 285,100 L 290,105 M 280,155 L 285,160 L 290,155" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <text x="335" y="135" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">세로 방향 (Plunge)</text>
                      </g>
                    )}
                  </svg>
                )}

                {/* 4. 외경 연삭 플런지 (OD Plunge) 다이어그램 */}
                {selectedMenu === 'od_plunge' && activeTab !== 'gauge' && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    <rect x="50" y="100" width="200" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                    <text x="150" y="125" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">Workpiece</text>
                    <circle cx="250" cy="50" r="40" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" />
                    <text x="250" y="55" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">Wheel</text>
                    <path d="M 250,95 L 250,110 M 245,105 L 250,110 L 255,105" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="305" y="100" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">Plunge Feed</text>
                  </svg>
                )}

                {/* 4-2. 외경 연삭 트래버스 (OD Traverse) 다이어그램 */}
                {selectedMenu === 'od_traverse' && activeTab !== 'gauge' && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    <rect x="40" y="100" width="280" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                    <text x="180" y="125" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">Workpiece (Traverse)</text>
                    <circle cx="180" cy="50" r="40" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" />
                    <path d="M 120,70 L 240,70 M 125,65 L 120,70 L 125,75 M 235,65 L 240,70 L 235,75" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    
                    <path d="M 120,70 L 240,55" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                    <text x="145" y="55" fill="#f59e0b" fontSize="10" fontWeight="bold">Angle(θ)</text>
                    
                    <path d="M 120,80 L 120,95 M 115,90 L 120,95 L 125,90" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M 240,80 L 240,95 M 235,90 L 240,95 L 245,90" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <text x="180" y="45" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">Z-Axis Traverse</text>
                    <text x="120" y="105" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">Infeed</text>
                  </svg>
                )}
                
                {/* 5. 내경 연삭 플런지 (ID Plunge) 다이어그램 */}
                {selectedMenu === 'id_plunge' && activeTab !== 'gauge' && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    <rect x="50" y="30" width="200" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                    <rect x="50" y="130" width="200" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                    <text x="150" y="20" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">Workpiece (ID Plunge)</text>
                    <circle cx="150" cy="100" r="28" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" />
                    <text x="150" y="105" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">Wheel</text>
                    <path d="M 150,128 L 150,145 M 145,140 L 150,145 L 155,140" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="215" y="145" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">Plunge Feed</text>
                  </svg>
                )}

                {/* 5-2. 내경 연삭 트래버스 (ID Traverse) 다이어그램 */}
                {selectedMenu === 'id_traverse' && activeTab !== 'gauge' && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    <rect x="40" y="30" width="280" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                    <rect x="40" y="130" width="280" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                    <text x="180" y="20" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">Workpiece (ID Traverse)</text>
                    <circle cx="180" cy="100" r="28" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" />
                    <path d="M 120,100 L 240,100 M 125,95 L 120,100 L 125,105 M 235,95 L 240,100 L 235,105" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    
                    <path d="M 120,100 L 240,115" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                    <text x="145" y="120" fill="#f59e0b" fontSize="10" fontWeight="bold">Angle(θ)</text>

                    <path d="M 120,115 L 120,130 M 115,125 L 120,130 L 125,125" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M 240,115 L 240,130 M 235,125 L 240,130 L 245,125" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <text x="180" y="90" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">Z-Axis Traverse</text>
                    <text x="120" y="145" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">Infeed</text>
                  </svg>
                )}

                {/* 6. 단면 연삭 플런지 (Face Plunge) 다이어그램 */}
                {selectedMenu === 'face_plunge' && activeTab !== 'gauge' && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    <rect x="50" y="140" width="200" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                    <text x="150" y="165" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">Workpiece (Face Plunge)</text>
                    <rect x="130" y="40" width="40" height="90" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" />
                    <text x="150" y="85" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">Wheel</text>
                    <path d="M 190,90 L 190,130 M 185,125 L 190,130 L 195,125" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="240" y="115" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">Plunge Feed (Z)</text>
                  </svg>
                )}

                {/* 6-2. 단면 연삭 트래버스 (Face Traverse) 다이어그램 */}
                {selectedMenu === 'face_traverse' && activeTab !== 'gauge' && (
                  <svg viewBox="0 0 400 200" className="w-full max-w-md drop-shadow-sm">
                    <rect x="50" y="140" width="300" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                    <text x="200" y="165" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">Workpiece (Face Traverse)</text>
                    <rect x="180" y="40" width="40" height="90" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" />
                    
                    <path d="M 120,80 L 280,80 M 125,75 L 120,80 L 125,85 M 275,75 L 280,80 L 275,85" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="200" y="70" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">X-Axis Traverse</text>
                    
                    <path d="M 100,120 L 100,135 M 95,130 L 100,135 L 105,130" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M 300,120 L 300,135 M 295,130 L 300,135 L 305,130" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <text x="100" y="110" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">Infeed (Z)</text>
                  </svg>
                )}
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
                      ) : activeTab === 'cutting' && !isDressingMode ? (
                        <label className="relative inline-flex items-center cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={useGapReturn} 
                            onChange={() => setUseGapReturn(!useGapReturn)} 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner peer-checked:bg-blue-500"></div>
                          <span className={`ml-2 text-xs font-black uppercase ${useGapReturn ? 'text-blue-600' : 'text-slate-400'}`}>
                            Gap Return {useGapReturn ? 'ON' : 'OFF'}
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
                          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
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
                      return (
                        <div key={idx} className={`bg-white rounded-xl border p-4 shadow-sm transition-all duration-300 ${showMeasureEffect && (field.id === 'z_offset' || field.id === 'x_offset') ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-700">{field.label}</label>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">{field.unit}</span>
                          </div>
                          <div className="relative">
                            <input 
                              type="text" 
                              defaultValue={field.value} 
                              onChange={(e) => handleFieldChange(field.id, e.target.value)}
                              className={`w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 text-lg font-mono focus:outline-none focus:bg-white transition-colors ${showMeasureEffect && (field.id === 'z_offset' || field.id === 'x_offset') ? 'text-emerald-700 font-black' : 'text-slate-800'} ${focusColor} ${(field.id === 'work_rpm' || field.id === 'wheel_vc' || field.id === 'wheel_rpm' || field.id === 'rotary_rpm') ? 'pr-14' : ''}`}
                            />
                            {(field.id === 'work_rpm' || field.id === 'wheel_vc' || field.id === 'wheel_rpm' || field.id === 'rotary_rpm') && (
                              <button 
                                onClick={() => openCalculator(field)}
                                className={`absolute right-2 top-1.5 bottom-1.5 px-2 rounded-lg transition-all border shadow-sm flex items-center justify-center ${
                                  activeTab === 'gauge' ? 'text-indigo-600 hover:bg-indigo-50 border-indigo-100' :
                                  isSetupMode ? 'text-emerald-600 hover:bg-emerald-50 border-emerald-100' :
                                  isDressingMode ? 'text-amber-600 hover:bg-amber-50 border-amber-100' :
                                  'text-blue-600 hover:bg-blue-50 border-blue-100'
                                }`}
                              >
                                <Activity size={18} />
                              </button>
                            )}
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
            <button className="flex items-center px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
              <FileText size={16} className="mr-2" /> NC 코드
            </button>
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
      {view === 'list' ? <ProjectListPage /> : <CycleEditorPage />}

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
    </div>
  );
};

export default App;