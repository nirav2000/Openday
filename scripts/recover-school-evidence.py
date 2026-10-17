#!/usr/bin/env python3
"""Append official historical EBacc results and resolve missing school postcodes.
Never overwrite historical school results or existing journey estimates.
"""
import csv,io,json,re,urllib.request
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
STAMP=datetime.now(timezone.utc).isoformat(timespec='seconds')
EBACC='https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/5b3d308c-da72-467f-b2ef-ab77d576a455/csv'
GIAS='https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/467bf0c7-a003-44fe-8aa6-b51c49812c7d/csv'
FIELDS={'ebaccEntry':'ebacc_entering_percent','ebaccAPS':'ebacc_aps_average','ebacc4Plus':'ebacc_94_percent','ebacc5Plus':'ebacc_95_percent'}
def read(path,default):
 p=ROOT/path
 return json.loads(p.read_text()) if p.exists() else default
def write(path,obj):
 p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def rows(url):
 req=urllib.request.Request(url,headers={'User-Agent':'OpenDay educational school research'})
 with urllib.request.urlopen(req,timeout=180) as response:
  raw=response.read().decode('utf-8-sig')
 return csv.DictReader(io.StringIO(raw))
def numeric(v):
 try:return float(v)
 except (ValueError,TypeError):return None
def main():
 perf=read('data/performance.json',{'schools':[]})['schools']
 senior=read('data/schools.json',{'schools':[]})['schools']
 primary=read('data/primary-schools.json',{'schools':[]})['schools']
 old=read('data/ebacc-history.json',{'schools':{}})
 out=read('data/ebacc-evidence.json',{'schemaVersion':1,'schools':{}})
 byurn={str(s.get('urn')):s['name'] for s in perf if s.get('urn')}
 byname={s['name']:s for s in perf}
 selected={}
 reader=rows(EBACC)
 assert all(f in reader.fieldnames for f in FIELDS.values()),reader.fieldnames
 for row in reader:
  name=byurn.get(str(row.get('school_urn')))
  year=row.get('time_period')
  if not name or year not in ('202223','202324','202425'):continue
  if not all((row.get(k) or 'Total')=='Total' for k in ('breakdown_topic','breakdown','sex','disadvantage_status','first_language','prior_attainment','mobility')):continue
  key=(name,year)
  assert key not in selected,'Duplicate total '+str(key)
  selected[key]=row
 for name,school in byname.items():
  item=out['schools'].setdefault(name,{'years':{}})
  item.update({'urn':school.get('urn'),'independent':school.get('type')=='independent'})
  for year,legacy in old.get('schools',{}).get(name,{}).items():
   if year not in item['years']:
    item['years'][year]={'year':year,**legacy,'sourceType':'preserved-legacy'}
  for (schoolname,year),row in selected.items():
   if schoolname!=name:continue
   values={k:numeric(row.get(v)) for k,v in FIELDS.items()}
   item['years'][year]={'year':year,**values,'pupils':numeric(row.get('pupil_count')),'sourceType':'official-dfe','sourceUrl':EBACC,'retrievedAt':STAMP}
  item['status']='coverage-caution' if item['independent'] else ('available' if item['years'] else 'not-found')
 counts={y:sum(y in item['years'] for item in out['schools'].values()) for y in ('202223','202324','202425')}
 assert counts['202324']>=35 and counts['202425']>=35,counts
 out.update({'sourceUrl':EBACC,'lastReportingYear':'202425','coverage':counts,'note':'EBacc measures are historical; independent school DfE coverage may exclude IGCSE. Missing is not zero.'})
 write('data/ebacc-evidence.json',out)
 print('EBACC COVERAGE',counts,flush=True)
 # GIAS catalogue: use verified URNs, never infer postcodes from similarly named schools.
 groups={}
 for phase,arr in [('senior',senior),('primary',primary)]:
  for e in arr:
   g=groups.setdefault(e['name'],{'phase':phase,'ids':[],'postcode':e.get('postcode'),'urn':e.get('urn') or byname.get(e['name'],{}).get('urn')})
   g['ids'].append(e['id'])
 loc=read('data/school-locations.json',{'schemaVersion':1,'schools':{}})
 source=rows(GIAS)
 print('GIAS FIELDS',source.fieldnames,flush=True)
 urnkey=next((x for x in ('school_urn','urn','URN') if x in source.fieldnames),None)
 assert urnkey,'No school URN in GIAS'
 addresses={}
 for row in source:
  urn=str(row.get(urnkey) or '')
  if urn:addresses[urn]=row
 for name,g in groups.items():
  if loc['schools'].get(name,{}).get('postcode'):continue
  official=addresses.get(str(g['urn']),{})
  postcode=g['postcode'] or next((v for k,v in official.items() if ('postcode' in k.lower() or k=='full_address') and v and re.search(r'[A-Za-z]{1,2}[0-9][A-Za-z0-9]?[ ]*[0-9][A-Za-z]{2}',v.strip())),None)
  if postcode:
   compact=''.join(postcode.upper().split())
   loc['schools'][name]={'postcode':compact[:-3]+' '+compact[-3:],'urn':g['urn'],'sourceUrl':GIAS if official else 'data/schools.json','retrievedAt':STAMP}
  else:loc['schools'][name]={'status':'postcode-unverified','urn':g['urn']}
 write('data/school-locations.json',loc)
 print('POSTCODES',sum(bool(x.get('postcode')) for x in loc['schools'].values()),'OF',len(groups),flush=True)
if __name__=='__main__':main()
