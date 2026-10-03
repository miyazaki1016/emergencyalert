// Offline design proof only. Not imported by application routes or Storage tooling.
import { createHash } from "node:crypto";
import type { AdministrativeArea } from "../lib/weather/rain/administrativeAreas";
import { affectedAdministrativeAreas } from "../lib/weather/rain/administrativeAreas";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";
import { N03_DATASET_DATE } from "../lib/weather/rain/n03Dataset";

type Bounds = [number, number, number, number];
type Part = { id: number; areaOrder: number; polygonOrder: number; geometry: { type: "Polygon"; coordinates: number[][][] } };
export type PartitionIndex = {
  format: "N03_POLYGON_PART_DESIGN_V1"; datasetDate: string; targetBytes: number;
  areas: { code: string; prefecture: string; municipality: string; order: number }[];
  parts: { id: number; areaOrder: number; polygonOrder: number; bbox: Bounds; chunk: string }[];
  chunks: { file: string; bytes: number; sha256: string; partCount: number; oversized: boolean }[];
};
export const sha256 = (body: string | Buffer) => createHash("sha256").update(body).digest("hex");
function bounds(coordinates: number[][][]): Bounds {
  let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;
  for (const ring of coordinates) for (const [x,y] of ring) { w=Math.min(w,x);s=Math.min(s,y);e=Math.max(e,x);n=Math.max(n,y); }
  return [w,s,e,n];
}
function overlaps(a: Bounds,b: Bounds) { return a[0]<=b[2] && a[2]>=b[0] && a[1]<=b[3] && a[3]>=b[1]; }

export function partitionAreas(areas: AdministrativeArea[],targetBytes=1024*1024) {
  if (!Number.isInteger(targetBytes) || targetBytes<2) throw new Error("Invalid target bytes");
  const index: PartitionIndex={format:"N03_POLYGON_PART_DESIGN_V1",datasetDate:N03_DATASET_DATE,targetBytes,
    areas:areas.map(({code,prefecture,municipality},order)=>({code,prefecture,municipality,order})),parts:[],chunks:[]};
  const parts: { part: Part; bbox: Bounds }[]=[];
  areas.forEach((area,areaOrder)=>{
    const polygons=area.geometry.type==="Polygon" ? [area.geometry.coordinates as number[][][]] : area.geometry.coordinates as number[][][][];
    polygons.forEach((coordinates,polygonOrder)=>parts.push({part:{id:parts.length,areaOrder,polygonOrder,geometry:{type:"Polygon",coordinates}},bbox:bounds(coordinates)}));
  });
  // Spatial order affects storage packing only; canonical municipality and
  // polygon ordinals in the index retain the original N03 identity/order.
  parts.sort((a,b)=>Math.floor((a.bbox[1]+a.bbox[3])*4)-Math.floor((b.bbox[1]+b.bbox[3])*4)
    || (a.bbox[0]+a.bbox[2])-(b.bbox[0]+b.bbox[2]) || a.part.id-b.part.id);
  const files=new Map<string,string>();
  let pending: typeof parts=[]; let bodies:string[]=[]; let bytes=2;
  const flush=()=>{
    if (!pending.length) return;
    const file=`chunk-${String(files.size).padStart(4,"0")}.json`;
    const body=`[${bodies.join(",")}]`; const actual=Buffer.byteLength(body);
    index.chunks.push({file,bytes:actual,sha256:sha256(body),partCount:pending.length,oversized:actual>targetBytes});
    pending.forEach(({part,bbox})=>index.parts.push({id:part.id,areaOrder:part.areaOrder,polygonOrder:part.polygonOrder,bbox,chunk:file}));
    files.set(file,body);pending=[];bodies=[];bytes=2;
  };
  for (const item of parts) {
    const body=JSON.stringify(item.part); const size=Buffer.byteLength(body);
    if (pending.length && bytes+size+1>targetBytes) flush();
    bytes+=size+(pending.length ? 1:0);pending.push(item);bodies.push(body);
  }
  flush();index.parts.sort((a,b)=>a.id-b.id);
  return {index,files};
}

export async function resolvePartitionedFootprint(
  rain: HeavyRainPolygon[],index: PartitionIndex,readChunk:(file:string)=>Promise<Buffer>,
) {
  if (index.format!=="N03_POLYGON_PART_DESIGN_V1" || index.datasetDate!==N03_DATASET_DATE) throw new Error("Unexpected partition identity");
  const rainBounds=rain.map(p=>bounds(p.coordinates));
  const selected=index.parts.filter(p=>rainBounds.some(b=>overlaps(p.bbox,b)));
  const chunks=[...new Set(selected.map(p=>p.chunk))];
  const selectedIds=new Set(selected.map(p=>p.id));
  const found=new Set<number>();
  let loadedBytes=0,loadedParts=0,matchedParts=0;
  for (const file of chunks) {
    const expected=index.chunks.find(c=>c.file===file);
    if (!expected) throw new Error("Missing partition chunk identity");
    const body=await readChunk(file);
    if (body.length!==expected.bytes || sha256(body)!==expected.sha256) throw new Error("Partition chunk integrity mismatch");
    const parts=JSON.parse(body.toString("utf8")) as Part[];
    if (!Array.isArray(parts) || parts.length!==expected.partCount) throw new Error("Partition chunk count mismatch");
    loadedBytes+=body.length;loadedParts+=parts.length;
    // Serial chunk evaluation: no complete Hokkaido reconstruction and no
    // persistent geometry cache. Cache policy remains a later experiment.
    for (const part of parts) {
      if (!selectedIds.has(part.id)) continue;
      const area=index.areas[part.areaOrder];
      if (!area || part.geometry.type!=="Polygon") throw new Error("Invalid partition part");
      if (affectedAdministrativeAreas(rain,[{code:area.code,prefecture:area.prefecture,municipality:area.municipality,geometry:part.geometry}]).length) {
        found.add(part.areaOrder);matchedParts++;
      }
    }
  }
  const municipalities=index.areas.filter(a=>found.has(a.order)).map(({code,prefecture,municipality})=>({code,prefecture,municipality}));
  return {municipalities,loadedBytes,loadedParts,matchedParts,chunks:chunks.length,selectedParts:selected.length};
}
