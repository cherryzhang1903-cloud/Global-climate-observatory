"""Convert pinned Eurostat Marnet GeoPackage to an undirected JS graph (stdlib only).

Input source and converted graph remain under EUPL-1.2. This conversion preserves
every polyline vertex (rounded to six decimal degrees), deduplicates coincident
nodes and undirected links, and measures each link with haversine distance.
"""
from pathlib import Path
import collections
import hashlib
import json
import math
import sqlite3
import struct

ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'marnet_plus_20km.gpkg'
COMMIT='88a2e568a8e0144d1f5a81c3931a7bc2bcce6901'
URL=f'https://raw.githubusercontent.com/eurostat/searoute/{COMMIT}/modules/core/src/main/resources/marnet/marnet_plus_20km.gpkg'

def coordinates(blob):
    assert blob[:2]==b'GP', 'Expected GeoPackage geometry'
    envelope=(blob[3]>>1)&7
    offset=8+{0:0,1:32,2:48,3:48,4:64}[envelope]
    order='<' if blob[offset] else '>'
    geometry_type,count=struct.unpack_from(order+'II',blob,offset+1)
    assert geometry_type==2, f'Expected 2D LineString, received {geometry_type}'
    return [struct.unpack_from(order+'dd',blob,offset+9+16*i) for i in range(count)]

def km(a,b):
    lon1,lat1=map(math.radians,a);lon2,lat2=map(math.radians,b)
    h=math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 2*6371.0088*math.asin(math.sqrt(min(1,max(0,h))))

def main():
    nodes=[];node_index={};edges={};duplicates=0;collapsed=0;feature_count=0;pass_conflicts=[]
    def node_id(coord):
        lon,lat=coord
        assert math.isfinite(lon) and math.isfinite(lat) and -90<=lat<=90
        lon=round((lon+180)%360-180,6);lat=round(lat,6)
        if lon==180:lon=-180
        key=(0 if lon==0 else lon,0 if lat==0 else lat)
        if key not in node_index:node_index[key]=len(nodes);nodes.append(list(key))
        return node_index[key]
    with sqlite3.connect(SOURCE) as connection:
        for geometry,passage in connection.execute('SELECT geometry, pass FROM type ORDER BY fid'):
            feature_count+=1
            ids=[node_id(point) for point in coordinates(geometry)]
            for a,b in zip(ids,ids[1:]):
                if a==b:collapsed+=1;continue
                a,b=sorted((a,b));key=(a,b)
                if key in edges:
                    duplicates+=1
                    old_passage=edges[key][3]
                    if old_passage and passage and old_passage!=passage:pass_conflicts.append([a,b,old_passage,passage])
                    if passage and not old_passage:edges[key][3]=passage
                    continue
                distance=round(km(nodes[a],nodes[b]),6)
                assert distance>0
                edges[key]=[a,b,distance,passage or None]
    assert not pass_conflicts, pass_conflicts
    links=list(edges.values())
    adjacency=[[] for _ in nodes]
    for a,b,_,_ in links:adjacency[a].append(b);adjacency[b].append(a)
    visited=set();components=[]
    for node in range(len(nodes)):
        if node in visited:continue
        queue=[node];visited.add(node);size=0
        while queue:
            item=queue.pop();size+=1
            for child in adjacency[item]:
                if child not in visited:visited.add(child);queue.append(child)
        components.append(size)
    metadata={
        'name':'Eurostat SeaRoute Marnet 20 km simplified network',
        'sourceURL':URL,'sourceRepository':'https://github.com/eurostat/searoute',
        'sourceCommit':COMMIT,'license':'EUPL-1.2',
        'sourceSHA256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'earthRadiusKm':6371.0088,'coordinateDecimals':6,'undirected':True,
        'featureCount':feature_count,'nodeCount':len(nodes),'edgeCount':len(links),
        'duplicateEdgesRemoved':duplicates,'roundingCollapsedSegments':collapsed,
        'componentSizes':sorted(components,reverse=True),
        'passageEdgeCounts':dict(collections.Counter(edge[3] or 'none' for edge in links)),
        'description':'Reference maritime routing network; not AIS tracks, timetables or current navigational permission. Base ORNL 2000 shipping network with Eurostat European AIS enrichment and subsequent repository edits.'
    }
    result={'nodes':nodes,'edges':links,'metadata':metadata}
    output=ROOT/'network.json'
    output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (ROOT/'network-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'output':str(output),'bytes':output.stat().st_size,**metadata},ensure_ascii=False))

if __name__=='__main__':main()
