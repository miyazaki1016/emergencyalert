import { applyEventRevision, isActiveEvent, type EventEnvelope } from "./event-contract";
export type ScenarioStep = { label: string; incoming: EventEnvelope; expectedAccepted: boolean; expectedActiveIds: string[] };
const base: EventEnvelope = {
  eventId:"demo:quake:001", revision:1, category:"earthquake", lifecycle:"issued",
  severity:"emergency", title:"架空の緊急地震速報", description:"表示動作確認用",
  regionCodes:["JP-13"], source:{provider:"demo",sourceId:"quake-001",publishedAt:"2026-10-16T03:40:00Z"},
  effectiveAt:"2026-10-16T03:40:00Z", receivedAt:"2026-10-16T03:40:01Z", mode:"demo"
};
const tsunami: EventEnvelope = {
  ...base, eventId:"demo:tsunami:001", category:"tsunami", title:"架空の津波情報",
  source:{...base.source,sourceId:"tsunami-001"}, regionCodes:["JP-14"]
};
export const lifecycleScenario: ScenarioStep[] = [
  {label:"地震速報を発表",incoming:base,expectedAccepted:true,expectedActiveIds:["demo:quake:001"]},
  {label:"独立した津波情報を発表",incoming:tsunami,expectedAccepted:true,expectedActiveIds:["demo:quake:001","demo:tsunami:001"]},
  {label:"地震速報を訂正",incoming:{...base,revision:2,lifecycle:"corrected",title:"架空の緊急地震速報（訂正）"},expectedAccepted:true,expectedActiveIds:["demo:quake:001","demo:tsunami:001"]},
  {label:"古い地震速報が遅れて到着",incoming:base,expectedAccepted:false,expectedActiveIds:["demo:quake:001","demo:tsunami:001"]},
  {label:"地震速報を取り消し",incoming:{...base,revision:3,lifecycle:"cancelled",title:"架空の緊急地震速報（取消）"},expectedAccepted:true,expectedActiveIds:["demo:tsunami:001"]},
  {label:"同じ取消を重複受信",incoming:{...base,revision:3,lifecycle:"cancelled"},expectedAccepted:false,expectedActiveIds:["demo:tsunami:001"]},
];
export function runLifecycleScenario() {
  let state = new Map<string, EventEnvelope>();
  const at = new Date("2026-10-16T03:50:00Z");
  return lifecycleScenario.map(step => {
    const result = applyEventRevision(state,step.incoming);
    state = result.state;
    const activeIds = [...state.values()].filter(e => isActiveEvent(e,at)).map(e=>e.eventId).sort();
    const passed = result.accepted === step.expectedAccepted &&
      JSON.stringify(activeIds) === JSON.stringify([...step.expectedActiveIds].sort());
    return { label:step.label, passed, accepted:result.accepted, reason:result.reason, activeIds };
  });
}
