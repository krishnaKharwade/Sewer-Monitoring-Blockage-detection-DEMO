"""Extract a bounded reproducible subset: first two decoded features per depot.
Keeps original identifiers and codes, never fills maintenance history or age.
"""
import xml.etree.ElementTree as ET,zipfile,json,hashlib,re
from collections import Counter
from pathlib import Path
root=Path(__file__).resolve().parent.parent
kmz=root/'source-data/chennai-sewer-main.kmz'
codes=(root/'dist/data/chennai-sewer-codes.txt').read_text()
section=codes.split('Code for Size (mm)')[0]
material={m.group(1):m.group(2).strip() for m in re.finditer(r'^(\d+)\s*-\s*(.+)$',section,re.M)}
size={m.group(1):int(m.group(2)) for m in re.finditer(r'^(\d+)\s*-\s*(\d+)\s*$',codes.split('Code for Size (mm)')[1],re.M)}
map_model={'Brick Arch':'Brick','RCC Pipe':'Concrete','CI Pipe':'Cast iron','PVC Pipe':'PVC','PVC':'PVC'}
ns='{http://www.opengis.net/kml/2.2}';selected=[];depots=Counter();features=0;unmapped=0
with zipfile.ZipFile(kmz) as z:
 with z.open(next(n for n in z.namelist() if n.endswith('.kml'))) as f:
  for event,node in ET.iterparse(f,events=('end',)):
   if node.tag!=ns+'Placemark':continue
   features+=1
   a={n.attrib['name']:(n.text or '').strip() for n in node.findall('.//'+ns+'SimpleData')}
   rawmat=material.get(a.get('material_of_sewer'))
   diameter=size.get(a.get('size_of_pipe_mm'))
   if not rawmat or not diameter:unmapped+=1
   if depots[a.get('depot')]<2 and rawmat and diameter and a.get('road_name') and a.get('sm_id'):
    depots[a.get('depot')]+=1
    c=node.find('.//'+ns+'coordinates');xy=(c.text or '').split()[0].split(',') if c is not None and c.text else []
    selected.append({'source_objectid':a['objectid'],'asset_id':a['sm_id'],'road_name':a['road_name'],'depot':a['depot'],'area':a['area_field'],'pumping_station':a.get('name_of_the_sps',''),'material_code':a['material_of_sewer'],'source_material':rawmat,'model_material':map_model.get(rawmat,rawmat),'size_code':a['size_of_pipe_mm'],'diameter_mm':diameter,'length_source_value':a.get('st_length(shape)',''),'longitude':float(xy[0]) if xy else None,'latitude':float(xy[1]) if xy else None})
   node.clear()
meta={'title':'Chennai Sewer Main Network — selected public features','source_url':'https://data.opencity.in/dataset/chennai-sewerage-collection-system','raw_url':'https://data.opencity.in/dataset/c9844771-3129-4bc8-99d7-398dd93db1fa/resource/a819c121-0d4a-4f6e-943d-2bcc610f6954/download/673f4683-9987-4101-b25c-8df48b448378.kmz','publisher':'OpenCity; original source CMWSSB GIS (cmwssbgis.tn.gov.in)','license':'Other (Public Domain), per dataset metadata','retrieved':'2026-10-06','source_features':features,'subset_count':len(selected),'depots_in_subset':len(depots),'unmapped_source_features':unmapped,'sampling':'First two source features per depot with an asset ID, road name and decoded diameter/material. A convenience subset, not a representative statistical sample.','raw_sha256':hashlib.sha256(kmz.read_bytes()).hexdigest(),'missing_inputs':['pipe_age_years','previous_blockages_12m','cleanings_12m','days_since_cleaning','flooding_events_12m','population_per_km2','commercial_sites_per_km2'],'note':'Source snapshot is not verified current condition. Codes are decoded using the companion TXT dictionary; source material names are mapped explicitly to the model categories documented in the app. No observed blockage outcomes are supplied.'}
(root/'dist/data/chennai-sewer-subset.json').write_text(json.dumps({'meta':meta,'assets':selected},separators=(',',':')))
print(json.dumps(meta,indent=2))
