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
 byurn.update({'137914':'St Joan of Arc Catholic School','100065':'University College School (UCS)'})
 byname.setdefault('St Joan of Arc Catholic School',{'name':'St Joan of Arc Catholic School','urn':'137914','type':'state'})
 byname.setdefault('University College School (UCS)',{'name':'University College School (UCS)','urn':'100065','type':'independent'})
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
 assert counts['202425']>=35,counts
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
 pins={'St Joan of Arc Catholic School':('WD3 1HG','137914'),'Krishna Avanti Primary School':('HA8 6ES','138688'),"St Teresa's Catholic Primary & Nursery School":('HA3 6LE','102231')}
 postcode_re=re.compile(r'[A-Z]{1,2}[0-9][A-Z0-9]?[ ]*[0-9][A-Z]{2}')
 for name,g in groups.items():
  existing=loc['schools'].get(name,{})
  if existing.get('postcode') and postcode_re.fullmatch(existing['postcode']):continue
  if name in pins:
   postcode,urn=pins[name]
   sourceurl='https://get-information-schools.service.gov.uk/Establishments/Establishment/Details/'+urn
  else:
   official=addresses.get(str(g['urn']),{})
   raw=g['postcode'] or official.get('full_address','')
   matches=postcode_re.findall(raw.upper())
   postcode=matches[-1] if matches else None
   urn=g['urn']
   sourceurl=GIAS if official else 'data/primary-schools.json'
  if postcode:
   compact=''.join(postcode.upper().split())
   loc['schools'][name]={'postcode':compact[:-3]+' '+compact[-3:],'urn':urn,'sourceUrl':sourceurl,'retrievedAt':STAMP}
  else:loc['schools'][name]={'status':'postcode-unverified','urn':urn}
 assert all(postcode_re.fullmatch(x['postcode']) for x in loc['schools'].values() if x.get('postcode'))
 write('data/school-locations.json',loc)
 print('POSTCODES',sum(bool(x.get('postcode')) for x in loc['schools'].values()),'OF',len(groups),flush=True)
if __name__=='__main__':main()
