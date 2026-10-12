"""Rebuild a conservative daily rainfall index from the unmodified OpenCity CSV.
Exact station/date/value duplicates collapse. Conflicting values become null;
absent dates remain absent and are never interpreted as dry days.
"""
import csv, json, datetime, hashlib
from collections import defaultdict
from pathlib import Path
root=Path(__file__).resolve().parent.parent
raw=root/'dist/data/chennai-daily-rainfall.csv'
buckets=defaultdict(lambda:defaultdict(set));count=0;invalid=0
with raw.open(newline='') as f:
 for r in csv.DictReader(f):
  count+=1
  try:
   date=datetime.datetime.strptime(r['Date'],'%d-%m-%Y').date().isoformat()
   value=float(r['Rainfall'])
   if not (0 <= value <= 3000): raise ValueError('range')
  except (ValueError,KeyError):invalid+=1;continue
  buckets[r['Station'].strip()][date].add(value)
index={st:{d:(next(iter(v)) if len(v)==1 else None) for d,v in sorted(days.items())} for st,days in sorted(buckets.items())}
unique=sum(len(days) for days in buckets.values());conflicts=sum(len(v)>1 for days in buckets.values() for v in days.values())
latest=[]
for st,days in index.items():
 for date in days:
  d=datetime.date.fromisoformat(date)
  values=[days.get((d-datetime.timedelta(days=i)).isoformat()) for i in range(7)]
  if all(v is not None for v in values):latest.append(((d+datetime.timedelta(days=1)).isoformat(),st))
default_date,default_station=max(latest)
meta={'title':'Chennai Daily Rainfall Data from 1991–2023','publisher':'OpenCity; source attributed to TNDMA in resource metadata','source_url':'https://data.opencity.in/dataset/chennai-rainfall-data/resource/3086f865-a04c-431e-815d-105ae658871f','raw_url':'https://data.opencity.in/dataset/256d1a20-adf5-4e3a-ae18-27664339117a/resource/3086f865-a04c-431e-815d-105ae658871f/download/e5c275eb-a4f2-4412-9677-73654e8f5f4d.csv','license':'Other (Public Domain), per resource metadata','retrieved':'2026-10-06','raw_sha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'raw_rows':count,'station_count':len(index),'unique_station_days':unique,'conflicting_station_days':conflicts,'duplicate_extra_rows':count-invalid-unique,'invalid_rows':invalid,'min_date':min(d for days in index.values() for d in days),'max_date':max(d for days in index.values() for d in days),'default_date':default_date,'default_station':default_station,'note':'Sparse historical snapshot. Missing dates are not zero. Distinct conflicting values are excluded. Station names are preserved without fuzzy merging.'}
(root/'dist/data/chennai-rainfall-index.json').write_text(json.dumps({'meta':meta,'stations':index},separators=(',',':')))
print(json.dumps(meta,indent=2))
