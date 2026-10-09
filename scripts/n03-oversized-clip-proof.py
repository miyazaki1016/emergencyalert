#!/usr/bin/env python3
"""Offline N03 oversized-polygon geometric clipping proof. Requires shapely>=2,<3.
No Storage calls; produces aggregate diagnostics only, never geometry output.
"""
import json, math, sys
from pathlib import Path
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

LIMIT=1572864
def polygon_parts(area):
    g=area["geometry"]
    return [g["coordinates"]] if g["type"]=="Polygon" else g["coordinates"]

def encoded_bytes(coords):
    return len(json.dumps({"type":"Polygon","coordinates":coords},separators=(",",":"),ensure_ascii=False).encode())

def components(geom):
    if geom.is_empty: return []
    if geom.geom_type=="Polygon": return [geom]
    if hasattr(geom,"geoms"):
        return [p for sub in geom.geoms for p in components(sub)]
    return []

def main(root):
    oversized=[]
    for pref in range(1,48):
        for area in json.loads((root/f"{pref:02}.areas.json").read_text()):
            for idx,rings in enumerate(polygon_parts(area)):
                if encoded_bytes(rings)>LIMIT:
                    oversized.append((f"{pref:02}",area["code"],idx,rings))
    results=[]
    for pref,code,idx,rings in oversized:
        poly=Polygon(rings[0],rings[1:])
        if not poly.is_valid:
            results.append({"pref":pref,"code":code,"polygonOrder":idx,"status":"INVALID_ORIGINAL","reason":"cannot claim equivalence without repair"})
            continue
        minx,miny,maxx,maxy=poly.bounds
        best=None
        for divisions in (2,4,8,16,32):
            dx=(maxx-minx)/divisions;dy=(maxy-miny)/divisions
            fragments=[]
            for ix in range(divisions):
                for iy in range(divisions):
                    cut=poly.intersection(box(minx+ix*dx,miny+iy*dy,minx+(ix+1)*dx,miny+(iy+1)*dy))
                    fragments.extend(components(cut))
            sizes=[encoded_bytes([list(p.exterior.coords)]+[list(r.coords) for r in p.interiors]) for p in fragments]
            if not sizes: raise RuntimeError(f"Clipping removed polygon {code}")
            union=unary_union(fragments)
            symmetric=poly.symmetric_difference(union).area
            tolerance=max(poly.area*1e-9,1e-13)
            if symmetric>tolerance: raise RuntimeError(f"Area mismatch {code} {symmetric}")
            best={"divisions":divisions,"fragments":len(fragments),"maxFragmentBytes":max(sizes),"totalFragmentBytes":sum(sizes),"symmetricDifferenceArea":symmetric}
            if max(sizes)<LIMIT: break
        results.append({"pref":pref,"code":code,"polygonOrder":idx,"status":"CLIPPED" if best["maxFragmentBytes"]<LIMIT else "STILL_OVERSIZED",**best})
    print(json.dumps({"mode":"N03_OVERSIZED_SHAPELY_RECTANGLE_CLIP_PROOF","thresholdBytes":LIMIT,"oversizedCount":len(oversized),"results":results,"limitations":["Polygon area equivalence is not proof of JS rain-boundary predicate equivalence","Polygon boundaries may acquire tile edges and change touching-only matches","Offline proof only: no production data format or Storage writes"],"decision":"EXPERIMENT_ONLY_NOT_ADOPTED"}))
    if any(x["status"]!="CLIPPED" for x in results): sys.exit(1)
if __name__=="__main__":
    if len(sys.argv)!=2: sys.exit("Usage: python scripts/n03-oversized-clip-proof.py <prepared-dir>")
    main(Path(sys.argv[1]))
