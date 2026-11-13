import {describe,it,expect} from "vitest";
import {isolatedMailForNewId} from "./isolated-content-238";
import type {Item} from "../../supabase/functions/_shared/jaspic/collect";

const item:Item={
 kind:"hiroshima-person",
 data:{
   id:"45847",occurrence_dt:"2026/11/12 12:00",latitude:"34.4",longitude:"132.4",
   city_code:"1",address:"試験地点",police_station:"1",case_type:"1",
   crime_cd:"",accident_situation:"試験概要",victim:"",criminal_age:"",
   criminal_feature:"",resolution:"0",resolution_info:""
 },
 context:{cityName:"試験市",stationName:"試験署"}
};
describe("Issue 238 isolated source mail",()=>{
 it("uses existing JASPIC formatter without exposing its production routing",()=>{
  const mail=isolatedMailForNewId("hiroshima-person:45847",[item]);
  expect(mail.subject).toContain("JASPIC-NES");
  expect(mail.body).toContain("45847");
  expect(mail.body).toContain("試験概要");
  expect(JSON.stringify(mail)).not.toContain("getter01@jaspic-nes.net");
 });
 it("rejects missing or duplicated source records",()=>{
  expect(()=>isolatedMailForNewId("hiroshima-person:45846",[item])).toThrow("ISOLATED_SOURCE_NOT_UNIQUE");
  expect(()=>isolatedMailForNewId("hiroshima-person:45847",[item,item])).toThrow("ISOLATED_SOURCE_NOT_UNIQUE");
 });
 it("rejects malformed identifiers",()=>{
  expect(()=>isolatedMailForNewId("shiga-person:../../bad",[item])).toThrow("ISOLATED_SOURCE_ID_INVALID");
 });
});
