import { describe, expect, test } from "vitest";
import type { AdministrativeArea } from "../lib/weather/rain/administrativeAreas";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";
import { municipalitiesForNationalRainFootprint } from "../lib/weather/rain/nationalRainMunicipalities";
import { partitionAreas,resolvePartitionedFootprint } from "./n03-partition-design-core";
const square=(x:number,y:number,size=1):number[][]=>[[x,y],[x+size,y],[x+size,y+size],[x,y+size],[x,y]];
const rain=(x:number,y:number):HeavyRainPolygon[]=>[{type:"Polygon",coordinates:[square(x,y,0.1) as [number,number][]]}];
const areas:AdministrativeArea[]=[
 {code:"01202",prefecture:"北海道",municipality:"first",geometry:{type:"MultiPolygon",coordinates:[[square(10,10),square(10.3,10.3,0.4)],[square(30,30)]]}},
 {code:"01101",prefecture:"北海道",municipality:"second",geometry:{type:"Polygon",coordinates:[square(0,0)]}},
];
describe("offline N03 polygon-part design",()=>{
 test("retains exact coordinates, holes and original multipart ordinals",()=>{
  const {index,files}=partitionAreas(areas,250);
  const parts=[...files.values()].flatMap(s=>JSON.parse(s)).sort((a,b)=>a.id-b.id);
  expect(parts.map(p=>p.geometry.coordinates)).toEqual([areas[0].geometry.coordinates[0],areas[0].geometry.coordinates[1],areas[1].geometry.coordinates]);
  expect(index.parts.map(p=>[p.areaOrder,p.polygonOrder])).toEqual([[0,0],[0,1],[1,0]]);
 });
 test("matches full geometry including dry holes and distant islands without loading every chunk",async()=>{
  const {index,files}=partitionAreas(areas,250);
  const reader=async(file:string)=>Buffer.from(files.get(file)!);
  for(const footprint of [rain(10.1,10.1),rain(10.4,10.4),rain(30.1,30.1),rain(0.1,0.1),rain(20,20)]) {
   const result=await resolvePartitionedFootprint(footprint,index,reader);
   expect(result.municipalities).toEqual(municipalitiesForNationalRainFootprint(footprint,areas));
   expect(result.chunks).toBeLessThan(index.chunks.length);
  }
 });
 test("deduplicates a municipality and keeps original N03 order across spatially reordered chunks",async()=>{
  const {index,files}=partitionAreas(areas,250);
  const result=await resolvePartitionedFootprint([...rain(0.1,0.1),...rain(10.1,10.1),...rain(30.1,30.1)],index,async(file)=>Buffer.from(files.get(file)!));
  expect(result.municipalities.map(m=>m.code)).toEqual(["01202","01101"]);
 });
 test("fails closed for missing or corrupt selected chunks",async()=>{
  const {index}=partitionAreas(areas,250);
  await expect(resolvePartitionedFootprint(rain(0.1,0.1),index,async()=>{throw new Error("missing chunk");})).rejects.toThrow("missing chunk");
  await expect(resolvePartitionedFootprint(rain(0.1,0.1),index,async()=>Buffer.from("[]"))).rejects.toThrow("integrity mismatch");
 });
 test("marks an indivisible oversized polygon instead of truncating it",()=>{
  const {index}=partitionAreas(areas,10);
  expect(index.chunks.every(c=>c.oversized)).toBe(true);
  expect(index.parts).toHaveLength(3);
 });
});
