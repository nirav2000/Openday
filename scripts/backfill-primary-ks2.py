#!/usr/bin/env python3
import csv,io,json,re,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
catalog=json.loads((root/'data/primary-schools.json').read_text())['schools']
known={str(s['urn']):s for s in catalog if s.get('urn')}
path=root/'data/primary-performance.json'
doc=json.loads(path.read_text())
url='https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/f6cb50e9-0eca-4b1e-ac1a-6f6bb9d21a07/csv'
req=urllib.request.Request(url,headers={'User-Agent':'OpenDay-KS2/1.0'})
matched=0
with urllib.request.urlopen(req,timeout=180) as response:
 reader=csv.DictReader(io.TextIOWrapper(response,encoding='utf-8-sig'))
 assert {'school_urn','time_period','subject','expected_standard_pupil_percent'}.issubset(reader.fieldnames),reader.fieldnames
 for row in reader:
  urn=str(row.get('school_urn') or '')
  if urn not in known or row.get('breakdown_topic')!='All pupils' or row.get('breakdown')!='Total':continue
  y=re.sub('[^0-9]','',str(row['time_period']))
  if len(y)!=6:continue
  subject={'Reading, writing and maths':'combined','Reading':'reading','Writing':'writing','Maths':'maths','Grammar, punctuation and spelling':'gps','Science':'science'}.get(row['subject'])
  if not subject:continue
  record=doc['schools'].setdefault(urn,{'name':known[urn]['name'],'years':{}})['years'].setdefault(y[:4]+'/'+y[4:],{})
  for field,suffix in [('expected_standard_pupil_percent','Expected'),('higher_standard_pupil_percent','Higher')]:
   raw=str(row.get(field) or '').strip()
   if re.fullmatch(r'\d+(\.\d+)?',raw):
    value=float(raw)
    assert 0<=value<=100
    record[subject+suffix]=int(value) if value.is_integer() else value
   elif raw:record.setdefault('codes',{})[subject+suffix]=raw
  record['sourceUrl']=url
  record['sourceId']='DfE-KS2-final'
  matched+=1
print('Matched rows',matched)
assert matched>=100,'Unexpectedly low official coverage'
path.write_text(json.dumps(doc,indent=2,ensure_ascii=False)+'\n')
